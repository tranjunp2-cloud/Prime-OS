# 統合仕様：Amazon SP-API → ECH-Kenshin PIM インポート

**バージョン：** 1.0.0
**最終更新日：** 2026-04-04
**作成者：** Minh Pham、Claude（AI支援）
**ステータス：** ドラフト

---

## 1. 概要

### 1.1 目的

Amazon Seller CentralからECH-KenshinのPIMシステムへの包括的な商品データインポートを可能にする。統合は、**完全な構造化属性**、**完全な親子バリエーションツリー**、**ブラウズノード分類**、**パッケージ寸法**を抽出する必要がある — 集約レベルのフィールドだけでは不十分。

### 1.2 問題提起

現在の実装では、Catalog Items APIから`summaries,identifiers,images,productTypes,relationships`のみをリクエストしている。これは4つの集約レベルフィールド（itemName、brand、color、size）を返す一方、MappingEngineは20以上の属性パス（`product_description`、`bullet_point`、`material`、`purchasable_offer`など）を定義しており、`attributes`データセットが必要。結果：ほとんどのPIMフィールドが空でインポートされる。

加えて、`searchListingsItems`は`summaries`のみをリクエストするため、親子関係はセラーのリストデータから抽出されない。`normalizeListingItem`メソッドは`parentExternalId: undefined`をハードコードしている。

### 1.3 範囲

**対象範囲：**
- Catalog Items API v2022-04-01 — 完全な`includedData`付き商品検索
- Listings Items API v2021-08-01 — 関係性を含むセラーリストの取得
- Product Type Definitions API v2020-09-01 — スキーマ取得（すでに正しい）
- 3つのAPIすべてに対するレート制限戦略
- 親子バリエーションツリーの解決
- Amazon属性形式からPIM EAV値へのデータマッピング

**対象範囲外：**
- リスト送信（PUT/PATCH）— 既存のフローで十分
- Feeds API 一括操作
- リアルタイム同期用の通知/ウェブフック
- Pricing APIとProduct Fees API

### 1.4 アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ECH-Kenshin Server                           │
│                                                                     │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────────┐  │
│  │ CatalogBrowse│───>│ AmazonConnector│───>│  AmazonAuthClient   │  │
│  │   Service    │    │                │    │  (token mgmt)       │  │
│  └──────┬───────┘    │  ┌────────────┐│    └──────────┬──────────┘  │
│         │            │  │BatchCatalog ││               │            │
│  ┌──────▼───────┐    │  │  Items     ││    ┌──────────▼──────────┐  │
│  │ Listings     │    │  └────────────┘│    │  Token Bucket Rate  │  │
│  │ Import       │───>│  ┌────────────┐│    │  Limiter (NEW)      │  │
│  │ Service      │    │  │SearchList- ││    └──────────┬──────────┘  │
│  └──────┬───────┘    │  │ingsItems  ││               │            │
│         │            │  └────────────┘│    ┌──────────▼──────────┐  │
│  ┌──────▼───────┐    │  ┌────────────┐│    │   Amazon SP-API     │  │
│  │ Mapping      │    │  │GetProdType ││    │   (external)        │  │
│  │ Engine       │    │  │Definitions ││    └─────────────────────┘  │
│  └──────┬───────┘    │  └────────────┘│                             │
│         │            └────────────────┘                             │
│  ┌──────▼───────┐                                                   │
│  │ PIM DB       │  products.values (JSONB)                          │
│  │ (PostgreSQL) │  channel_listings.channel_values (JSONB)          │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 認証と認可

### 2.1 認証方法

**Login with Amazon（LWA）OAuth 2.0** — refresh_tokenグラントフロー。

### 2.2 トークン交換

```yaml
endpoint:
  url: "https://api.amazon.com/auth/o2/token"
  method: POST
  content_type: "application/x-www-form-urlencoded"

request:
  grant_type: "refresh_token"
  refresh_token: "{REFRESH_TOKEN}"
  client_id: "{CLIENT_ID}"
  client_secret: "{CLIENT_SECRET}"

response:
  access_token: "string"
  token_type: "bearer"
  expires_in: 3600

usage:
  header: "x-amz-access-token: {access_token}"
```

### 2.3 現在の実装（amazon-auth.client.ts）

- メモリ内トークンキャッシュ（60秒の事前期限更新バッファ付き）
- リージョンベースURL: `na`、`eu`、`fe`（デフォルト：日本市場向けの`fe`）

### 2.4 必要な修正：トークン更新の競合状態

**問題：** 同時リクエストが複数の`refreshAuth()`呼び出しをトリガーし、トークンが上書きされる可能性がある。

**解決策：** promiseベースのミューテックスを追加し、同時に1つの更新のみを実行:

```typescript
private refreshPromise: Promise<void> | null = null;

async refreshAuth(): Promise<void> {
  if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return;
  if (this.refreshPromise) return this.refreshPromise;
  this.refreshPromise = this.doRefresh().finally(() => {
    this.refreshPromise = null;
  });
  return this.refreshPromise;
}
```

---

## 3. エンドポイント

### 3.1 Catalog Items API — 検索（商品検索）

**目的：** PIMへの商品インポートのための包括的なAmazonカタログデータを取得。

```yaml
endpoint:
  method: GET
  path: "/catalog/2022-04-01/items"
  description: "識別子（ASIN、UPC、EAN）またはキーワードでカタログアイテムを検索"

rate_limit:
  requests_per_second: 2
  burst: 2
  scope: "per selling partner app"
  header: "x-amzn-RateLimit-Limit"

headers:
  required:
    x-amz-access-token: "{access_token}"
    Accept: "application/json"

query_parameters:
  required:
    marketplaceIds:
      type: "string"
      description: "対象マーケットプレイス（例：A1VC38T7YXB528 for JP）"
      max_values: 1
  conditional:
    identifiers:
      type: "string (CSV)"
      description: "最大20個の製品識別子"
      max_values: 20
      mutually_exclusive_with: "keywords"
    identifiersType:
      type: "string"
      description: "identifiers使用時に必須"
      enum: ["ASIN", "EAN", "GTIN", "ISBN", "JAN", "MINSAN", "SKU", "UPC"]
    keywords:
      type: "string (CSV)"
      description: "検索語、最大20"
      mutually_exclusive_with: "identifiers"
    sellerId:
      type: "string"
      description: "identifiersTypeがSKUの場合に必須"
  optional:
    includedData:
      type: "string (CSV)"
      description: "レスポンスに含めるデータセット"
      default: "summaries"
    pageSize:
      type: "integer"
      default: 10
      max: 20
    pageToken:
      type: "string"
      description: "ページネーショントークン"
```

#### 3.1.1 `includedData` — 現状と必要比較

| データセット | 現在リクエスト | 必要リクエスト | PIMへの影響 |
|---|---|---|---|
| `summaries` | 〇 | 〇 | itemName、brand、color、size、status、productType |
| `identifiers` | 〇 | 〇 | UPC、EAN、JAN、ISBNバーコード |
| `images` | 〇 | 〇 | バリエーションタイプ付き商品画像（MAIN、PT01-PT08） |
| `productTypes` | 〇 | 〇 | Amazon商品タイプ分類 |
| `relationships` | 〇 | 〇 | 親子ASINリンク、バリエーションテーマ軸 |
| **`attributes`** | **✕** | **〇** | **完全な構造化商品データ — Product Type Definitions JSONスキーマに準拠した100以上のフィールド。説明、bullet_point、材質、寸法、重量、条件、、価格など、すべての商品属性の主要なソース。** |
| **`classifications`** | **✕** | **〇** | ** ブラウズノード階層 — PIMカテゴリにマッピング** |
| **`dimensions`** | **✕** | **〇** | **アイテムとパッケージの測定値（長さ、幅、高さ、重量）と単位** |
| `salesRanks` | 不要 | 不要（オプション） | BSRデータ — PIMコアには不要 |
| `vendorDetails` | 不要 | 不要 | ベンダー専用、セラーには該当なし |

**必要な`includedData`値:**
```
summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions
```

#### 3.1.2 レスポンススキーマ（主要フィールド）

```typescript
interface CatalogItemsResponse {
  numberOfResults: number;
  pagination?: { nextToken?: string };
  items: Array<{
    asin: string;

    // summaries — マーケットプレイスごとの基本情報
    summaries?: Array<{
      marketplaceId: string;
      brand?: string;
      itemName?: string;
      color?: string;
      size?: string;
      manufacturer?: string;
      modelNumber?: string;
      status?: string[];          // ["Buyable"]
      productType?: string;       // "SPORT_BAT"
      itemClassification?: string; // "BASE_PRODUCT" | "VARIATION_PARENT"
    }>;

    // attributes — 完全な構造化商品データ（JSONスキーマ準拠）
    // これは欠落している重要なデータセット。
    // キーはAmazon属性名、値はAmazonのラップされた形式に従う:
    //   [{ value: "actual_value", marketplace_id: "...", language_tag: "en_US" }]
    attributes?: Record<string, Array<{
      value: unknown;
      marketplace_id?: string;
      language_tag?: string;
      unit?: string;  // 測定属性用
    }>>;

    // identifiers — マーケットプレイスごとのバーコード
    identifiers?: Array<{
      marketplaceId: string;
      identifiers: Array<{
        identifierType: string;  // "EAN", "UPC", "GTIN"
        identifier: string;
      }>;
    }>;

    // images — バリエーション情報を含む商品写真
    images?: Array<{
      marketplaceId: string;
      images: Array<{
        variant: string;  // "MAIN", "PT01", "PT02"...
        link: string;
        height: number;
        width: number;
      }>;
    }>;

    // relationships — 親子バリエーションツリー
    relationships?: Array<{
      marketplaceId: string;
      relationships: Array<{
        childAsins?: string[];
        parentAsins?: string[];
        variationTheme?: {
          attributes: string[];  // ["color", "size"]
          theme: string;         // "SIZE_NAME/COLOR_NAME"
        };
        type: string;  // "VARIATION"
      }>;
    }>;

    // classifications — ブラウズノード階層（新規）
    classifications?: Array<{
      marketplaceId: string;
      classifications: Array<{
        classificationId: string;   // ブラウズノード ID
        displayName: string;
        parent?: {
          classificationId: string;
          displayName: string;
        };
      }>;
    }>;

    // dimensions — アイテムとパッケージの測定値（新規）
    dimensions?: Array<{
      marketplaceId: string;
      item?: {
        height?: { value: number; unit: string };
        length?: { value: number; unit: string };
        weight?: { value: number; unit: string };
        width?: { value: number; unit: string };
      };
      package?: {
        height?: { value: number; unit: string };
        length?: { value: number; unit: string };
        weight?: { value: number; unit: string };
        width?: { value: number; unit: string };
      };
    }>;

    // productTypes — マケットプレイスごとの分類
    productTypes?: Array<{
      marketplaceId: string;
      productType: string;
    }>;
  }>;
}
```

#### 3.1.3 `attributes`が欠落データを解決する方法

`attributes`データセットは、Amazonが保存しているすべての商品属性を返す。使用されるキーはProduct Type Definitions JSONスキーマと同じ。 利用可能になるデータの例:

| Amazon属性キー | MappingEngineパス | PIMフィールド | 以前は利用可能? |
|---|---|---|---|
| `item_name` | `item_name` | `item_name` | `summaries.0.itemName`フォールバックからのみ |
| `product_description` | `product_description` | `description` | **✕** |
| `bullet_point` | `bullet_point` | `bullet_point` | **✕** |
| `brand` | `brand` | `brand` | `summaries.0.brand`フォールバックからのみ |
| `color` | `color` | `color` | `summaries.0.color`フォールバックからのみ |
| `size` | `size` | `size` | `summaries.0.size`フォールバックからのみ |
| `material` | `material` | `material` | **✕** |
| `manufacturer` | `manufacturer` | `manufacturer` | **✕** |
| `model_number` | `model_number` | `model_number` | **✕** |
| `condition_type` | `condition_type` | `condition` | **✕** |
| `country_of_origin` | `country_of_origin` | `country_of_origin` | **✕** |
| `number_of_items` | `number_of_items` | `number_of_items` | **✕** |
| `main_product_image_locator` | `main_product_image_locator` | `main_image` | **✕**（画像は`images`データセットからのみ） |
| `item_package_weight` | `item_package_weight` | `product_weight` | **✕** |
| `item_package_dimensions.*` | `item_package_dimensions.length/width/height` | `product_length/width/height` | **✕** |
| `purchasable_offer.0.our_price...` | `purchasable_offer.0.our_price.0.schedule.0.value_with_tax` | `base_price` | **✕** |
| `externally_assigned_product_identifier` | `externally_assigned_product_identifier` | `gtin` | **✕** |

**影響：** `includedData`に`attributes`を追加することで、4つのサマリーフォールバックから、定義されたすべての20以上のデフォルトマッピングが解放される。

---

### 3.2 Listings Items API — 検索（セラーリストの取得）

**目的：** 親子関係とセラー固有の属性値を持つ、セラーのリストを取得。

```yaml
endpoint:
  method: GET
  path: "/listings/2021-08-01/items/{sellerId}"
  description: "フィルタリングとページネーション付きでセラーのリストを検索"

rate_limit:
  requests_per_second: 5
  burst: 5

query_parameters:
  required:
    marketplaceIds:
      type: "string"
  optional:
    includedData:
      type: "string (CSV)"
      default: "summaries"
    identifiers:
      type: "string (CSV)"
      max_values: 20
    identifiersType:
      type: "string"
      enum: ["ASIN", "EAN", "FNSKU", "GTIN", "ISBN", "JAN", "MINSAN", "SKU", "UPC"]
    variationParentSku:
      type: "string"
      description: "親SKUで子をフィルタリング — ツリー解決に便利"
    createdAfter:
      type: "string (ISO 8601)"
    lastUpdatedAfter:
      type: "string (ISO 8601)"
    withStatus:
      type: "string"
      enum: ["BUYABLE", "DISCOVERABLE"]
    sortBy:
      type: "string"
      enum: ["sku", "createdDate", "lastUpdatedDate"]
    pageSize:
      type: "integer"
      max: 20
    pageToken:
      type: "string"
```

#### 3.2.1 `includedData` — 現状と必要比較

| データセット | 現在リクエスト | 必要リクエスト | 影響 |
|---|---|---|---|
| `summaries` | 〇 | 〇 | SKU、ASIN、itemName、status、productType |
| **`attributes`** | **✕** | **〇** | **セラーが送信した属性値 — カタログとは異なる場合あり。価格、フルフィルメント、セラー固有フィールドに便利。** |
| **`relationships`** | **✕** | **〇** | **親子SKUリンクとバリエーションテーマ。セラーデータからバリエーションツリーを構築するために重要。** |
| `issues` | 不要 | オプション | 検証問題 — 品質監視に便利 |
| `offers` | 不要 | オプション | 価格と条件データ |
| `fulfillmentAvailability` | 不要 | オプション | FBA/FBM在庫 |
| `productTypes` | ✕ | 〇 | リストごとの商品タイプ |

**必要な`includedData`値:**
```
summaries,attributes,relationships,productTypes
```

#### 3.2.2 リレーションシップデータ構造（Listings APIから）

```typescript
interface ListingsItemRelationships {
  relationships?: Array<{
    parentSkus?: string[];     // 親SKU
    childSkus?: string[];      // 親アイテムの子SKU
    variationTheme?: {
      attributes: string[];    // ["color_name", "size_name"]
    };
    type: string;              // "VARIATION"
  }>;
}
```

**Catalog APIとの主な違い：** Listings APIはSKUベースの関係（セラー固有）を返すのに対し、Catalog APIはASINベース（グローバル）を返す。両方が必要:
- **Catalog API relationships:** 相互参照用のASIN間親子
- **Listings API relationships:** PIM product.parent_id直接リンク用のSKU間SKU

---

### 3.3 Listings Items API — 単一アイテム取得

**目的：** 特定のセラーリストの詳細情報を取得（送信監視とエンリッチメントに使用）。

```yaml
endpoint:
  method: GET
  path: "/listings/2021-08-01/items/{sellerId}/{sku}"

rate_limit:
  requests_per_second: 5
  burst: 10

query_parameters:
  required:
    marketplaceIds: "string"
  optional:
    includedData: "string (CSV)"
    issueLocale: "string (default: en_US)"
```

#### 3.3.1 現状と必要な`includedData`

**現状：** `"summaries,attributes,offers,fulfillmentAvailability,images"`
**必要：** `"summaries,attributes,offers,fulfillmentAvailability,images,issues,relationships,productTypes"`

`issues`の欠落は、明示的な問題チェック呼び出しまで送信問題が見えないことを意味する。`relationships`の欠落は、個々のアイテム取得時にバリエーションコンテキストが失われることを意味する。

---

### 3.4 Product Type Definitions API — 定義取得

**目的：** 商品タイプのJSONスキーマを取得。すでに正しく実装済み。

```yaml
endpoint:
  method: GET
  path: "/definitions/2020-09-01/productTypes/{productType}"

rate_limit:
  requests_per_second: 5
  burst: 10

query_parameters:
  required:
    marketplaceIds: "string"
  optional:
    sellerId: "string"
    productTypeVersion: "string (default: LATEST)"
    requirements: "string (LISTING | LISTING_PRODUCT_ONLY | LISTING_OFFER_ONLY)"
    requirementsEnforced: "string (ENFORCED | NOT_ENFORCED)"
    locale: "string"

caching:
  strategy: "Cache by checksum field (MD5)"
  ttl: "24 hours (現在のschema-sync実装)"
  invalidation: "チェックサムが変更時に再取得"
```

このエンドポイントには**変更不要**。

---

## 4. データモデル

### 4.1 エンリッチされたNormalizedListing（修正後）

```typescript
interface NormalizedListing {
  sku: string;
  externalId: string;                      // ASIN
  title: string;
  status: string;
  mainImage?: string;
  productType?: string;
  parentExternalId?: string;               // 関係性から今度は入力済み
  parentSku?: string;                      // 新規: Listings API relationshipsから
  childSkus?: string[];                    // 新規: 親アイテム用
  variationTheme?: string[];               // 関係性から今度は入力済み
  classifications?: Array<{               // 新規: ブラウズノード階層
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
  }>;
  dimensions?: {                           // 新規: アイテム/パッケージ測定値
    item?: DimensionSet;
    package?: DimensionSet;
  };
  values: Record<string, unknown>;         // 完全な属性で今度は入力済み
  raw: Record<string, unknown>;            // MappingEngine用の完全APIレスポンス
}

interface DimensionSet {
  height?: { value: number; unit: string };
  length?: { value: number; unit: string };
  width?: { value: number; unit: string };
  weight?: { value: number; unit: string };
}
```

### 4.2 Amazon属性値形式

Amazonは属性値を一貫した形式でラップ:

```typescript
// 標準テキスト属性
"item_name": [
  { "value": "Professional Baseball Bat", "marketplace_id": "A1VC38T7YXB528", "language_tag": "ja_JP" }
]

// 複数値属性（bullet points）
"bullet_point": [
  { "value": "Lightweight carbon fiber construction", "language_tag": "ja_JP" },
  { "value": "Professional grade 34-inch length", "language_tag": "ja_JP" },
  { "value": "Approved for official tournament use", "language_tag": "ja_JP" }
]

// 単位付き属性
"item_package_weight": [
  { "value": 0.85, "unit": "kilograms" }
]

// 言語なし属性（リージョン固有）
"country_of_origin": [
  { "value": "JP", "marketplace_id": "A1VC38T7YXB528" }
]
```

既存の`resolveAmazonValue()`（mapping-engine.ts内）は4つの形式すべてを正しく処理。アンラップロジックへの変更不要。

### 4.3 バリエーションツリーモデル

```
┌─────────────────────────────────┐
│  Parent Product (configurable)  │
│  ASIN: B0PARENT123              │
│  SKU: BAT-PARENT                │
│  variationTheme: [color, size]  │
├─────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  │
│  │ Child 1   │  │ Child 2   │  │
│  │ B0CHILD01 │  │ B0CHILD02 │  │
│  │ BAT-BLK-M │  │ BAT-RED-L │  │
│  │ color:blk │  │ color:red │  │
│  │ size:M    │  │ size:L    │  │
│  └───────────┘  └───────────┘  │
└─────────────────────────────────┘

PIM Mapping:
  products.product_type = "configurable" (親)
  products.product_type = "simple" (子)
  products.parent_id = parent.id (子)
  products.family_variant_id → family_variant_axes [color_attr, size_attr]
```

---

## 5. エラー処理

### 5.1 SP-APIエラーコード

| HTTPステータス | エラーコード | 再試行戦略 | 現在の処理 | 必要な処理 |
|---|---|---|---|---|
| **400** | `InvalidInput` | 再試行しない — リクエストを修正 | 一般的なエラーをスロー | フィールドレベルの詳細をログ、インポート結果に表示 |
| **401** | `Unauthorized` | トークン更新、1回再試行 | 一般的なエラーをスロー | 自動更新+単一再試行 |
| **403** | `Forbidden` | 再試行しない | 一般的なエラーをスロー | スコープ/権限をチェック、ユーザーに表示 |
| **404** | `NotFound` | 再試行しない | 一般的なエラーをスロー | ログを記録してアイテムをスキップ（バッチでは致命的でない） |
| **429** | `QuotaExceeded` | **`Retry-After`ヘッダーを待つ** | **インポートがクラッシュ** | **トークンバケット+指数バックオフ** |
| **500** | `InternalFailure` | バックオフ付きで再試行（最大3回） | 一般的なエラーをスロー | 指数バックオフ付きで再試行 |
| **503** | `ServiceUnavailable` | バックオフ付きで再試行 | 一般的なエラーをスロー | 指数バックオフ付きで再試行 |

### 5.2 必要：アイテム単位のエラー隔離

バッチインポート中、単一のアイテム失敗がバッチ全体を中止してはならない。現在の実装は`listings-import.service.ts`で正しく処理（アイテム単位のtry-catch）が、`batchGetCatalogItems`はチャンク全体の失敗を黙って飲み込む。

**修正：** チャンク失敗をログし、スキップする前に1回再試行:

```typescript
} catch (err) {
  this.logger.warn(`Catalog batch failed for ${chunk.length} ASINs, retrying: ${err.message}`);
  await delay(1000);
  try {
    // retry once
  } catch {
    this.logger.error(`Catalog batch permanently failed for ASINs: ${chunk.join(',')}`);
  }
}
```

---

## 6. レート制限

### 6.1 Amazon SP-APIレート制限

| エンドポイント | レート(req/s) | Burst | 最大アイテム/リクエスト |
|---|---|---|---|
| `searchCatalogItems` | 2 | 2 | 20識別子 |
| `getCatalogItem` | 2 | 2 | 1 |
| `searchListingsItems` | 5 | 5 | 20/ページ |
| `getListingsItem` | 5 | 10 | 1 |
| `putListingsItem` | 5 | 10 | 1 |
| `patchListingsItem` | 5 | 5 | 1 |
| `getDefinitionsProductType` | 5 | 10 | 1 |
| `searchDefinitionsProductTypes` | 5 | 10 | N/A |

### 6.2 インポートのスループット計算

500商品のセラーの場合:

| フェーズ | API呼び出し | レート制限時 | 所要時間 |
|---|---|---|---|
| リスト取得（20件ページ） | 25ページ | 5 req/s | 約5秒 |
| カタログエンリッチメント（20件バッチ） | 25バッチ | 2 req/s | 約13秒 |
| スキーマ同期（一意の商品タイプ、キャッシュ） | 約5-10 | 5 req/s | 約2秒 |
| **合計** | **約55-60呼び出し** | | **約20秒** |

現在の250ms遅延で1000+商品の場合: **4分以上**（N+1の子取得がより悪化）。
バッチアプローチの場合: **約40秒**。

### 6.3 必要：トークンバケットレートリミッター

```typescript
interface RateLimiterConfig {
  endpoints: {
    catalog: { tokensPerSecond: 2; burstCapacity: 2 };
    listings: { tokensPerSecond: 5; burstCapacity: 5 };
    definitions: { tokensPerSecond: 5; burstCapacity: 10 };
  };
  backoff: {
    initialDelayMs: 500;
    maxDelayMs: 30_000;
    multiplier: 2;
    jitter: true;  // +/- 20% ランダム化
  };
  maxRetries: 3;
}
```

レートリミッターは以下を行うべき:
1. 各SP-APIパスをエンドポイントバケットに分類
2. 各リクエスト前にトークンを消費（空の場合はawait）
3. 429レスポンス時、`x-amzn-RateLimit-Limit`ヘッダーを読んでバケット補充率を調整
4. 再試行時にジッター付き指数バックオフを適用

---

## 7. シーケンス図

### 7.1 完全なインポートフロー（修正付き）

```
sequenceDiagram
    participant UI as Client Portal
    participant API as ECH Server
    participant CBS as CatalogBrowseService
    participant AC as AmazonConnector
    participant RL as RateLimiter
    participant SP as Amazon SP-API
    participant LIS as ListingsImportService
    participant ME as MappingEngine
    participant DB as PostgreSQL

    UI->>API: POST /api/pm/channels/{id}/pull-listings
    API->>CBS: pullSellerListings(channelId)

    Note over CBS,SP: Phase 1: Pull Seller Listings (with relationships)

    loop Paginate (pageSize=20)
        CBS->>AC: searchListingsItems({includedData: "summaries,attributes,relationships,productTypes"})
        AC->>RL: acquire("listings")
        RL->>SP: GET /listings/2021-08-01/items/{sellerId}
        SP-->>AC: {items[], nextToken}
        AC-->>CBS: normalized items with parentSku + variationTheme
    end

    Note over CBS,SP: Phase 2: Catalog Enrichment (batched, with full attributes)

    CBS->>AC: batchGetCatalogItems(asins[])
    loop Chunks of 20 ASINs
        AC->>RL: acquire("catalog")
        RL->>SP: GET /catalog/2022-04-01/items?identifiers=...&includedData=summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions
        SP-->>AC: {items[] with FULL attributes}
    end
    AC-->>CBS: Map<ASIN, enriched catalog data>

    CBS-->>CBS: Merge listings + catalog data into NormalizedListing[]
    CBS-->>API: {listings, totalCount}

    UI->>API: POST /api/pm/channels/{id}/import-listings
    API->>LIS: importSellerListings(channelId, items[])

    Note over LIS,DB: Phase 3: Map & Import to PIM

    LIS->>LIS: prefetchFamilies, prefetchSchemas, prefetchListings, prefetchProducts
    loop Each item
        LIS->>ME: apply(rawData, mappings)
        ME-->>LIS: {pimValues (NOW 20+ fields), channelValues}
        LIS->>DB: INSERT products (values = full pimValues)
        LIS->>DB: INSERT channel_listings
    end

    Note over LIS,DB: Phase 4: Link Parent-Child Tree

    LIS->>DB: Batch UPDATE products SET parent_id (using ASIN + SKU relationships)
    LIS->>DB: UPDATE parents SET product_type = 'configurable'
    LIS-->>API: {created, linked, skipped, failed, details}
```

### 7.2 カタログツリー解決（バッチ — N+1修正）

```
sequenceDiagram
    participant CBS as CatalogBrowseService
    participant AC as AmazonConnector
    participant SP as Amazon SP-API

    CBS->>AC: searchCatalogItems({ASIN, includedData: full})
    AC->>SP: GET /catalog/items?identifiers={ASIN}
    SP-->>AC: item with parentAsin, childAsins[50]

    alt Item is a child
        CBS->>AC: searchCatalogItems({parentAsin})
        AC->>SP: GET /catalog/items?identifiers={parentAsin}
        SP-->>AC: parent with childAsins[50]
    end

    Note over CBS,SP: Batch children (was: 50 individual calls → now: 3 batch calls)

    loop Chunks of 20 child ASINs
        CBS->>AC: searchCatalogItems({identifiers: chunk.join(","), identifiersType: "ASIN"})
        AC->>SP: GET /catalog/items?identifiers=ASIN1,ASIN2,...ASIN20&identifiersType=ASIN
        SP-->>AC: {items[]: up to 20 children}
    end

    CBS-->>CBS: Assemble tree {parent, children[], totalItems}
```

---

## 8. 実装変更が必要な項目

### 8.1 ファイルごとの変更概要

| ファイル | 変更 | 優先度 |
|---|---|---|
| `amazon.connector.ts` — `searchCatalogItems()` | `attributes,classifications,dimensions`を`includedData`に追加 | P1 |
| `amazon.connector.ts` — `batchGetCatalogItems()` | `attributes,classifications,dimensions`を`includedData`に追加; 失敗時に再試行追加 | P1 |
| `amazon.connector.ts` — `searchListingsItems()` | `includedData`を`summaries,attributes,relationships,productTypes`に変更 | P1 |
| `amazon.connector.ts` — `normalizeListingItem()` | 関係性データから`parentExternalId`を抽出 | P1 |
| `amazon.connector.ts` — `getListingsItem()` | `issues,relationships,productTypes`を`includedData`に追加 | P1 |
| `catalog-browse.service.ts` — `getCatalogTree()` | 子アイテム取得ループをバッチ`searchCatalogItems`呼び出し（20個チャンク）に置換 | P1 |
| `connector.interface.ts` — `NormalizedListing` | オプションフィールド`parentSku`、`childSkus`、`variationTheme`、`classifications`、`dimensions`を追加 | P1 |
| `connector.interface.ts` — `CatalogSearchResult` | アイテムタイプに`attributes`、`classifications`、`dimensions`を追加 | P1 |
| `amazon-auth.client.ts` | promiseベースのトークン更新ミューテックスを追加 | P2 |
| `amazon-auth.client.ts` | `spApiGet/Put/Patch`にレートリミッター統合を追加 | P0 |
| `amazon.types.ts` | `ChannelSettings`から未使用の`rateLimitMs`を削除 | P3 |

### 8.2 変更不要

| コンポーネント | 理由 |
|---|---|
| `mapping-engine.ts` | ネストされたパスの抽出とAmazon値形式のアンラップはすでに正しい |
| `amazon-default-mappings.ts` | 正しい属性パスがすでに定義されている — データが取得できていないだけ |
| `amazon-payload-builder.ts` | 送信ペイロードビルダー、インポートとは無関係 |
| `amazon-schema-validator.ts` | 検証ロジックは正しい |
| `listings-import.service.ts` | インポートロジックは正しい — ただ今 より豊富な`rawData`を受け取る |
| `value-normalizer.ts` | 正規化ロジックは正しい |

---

## 9. テストシナリオ

### 9.1 データ完全性テスト

```yaml
test_data_completeness:
  - name: "単一商品の完全な属性インポート"
    setup: "豊富な商品データを持つ既知のASINを検索"
    verify:
      - "pimValuesにitem_name、brand、product_description、bullet_pointが含まれる"
      - "pimValuesにmaterial、color、size、manufacturerが含まれる"
      - "pimValuesにbase_price、currencyが含まれる"
      - "pimValuesにproduct_weight、product_length、product_width、product_heightが含まれる"
      - "20以上のデフォルトマッピングのうち少なくとも15が非null値を生成"

  - name: "Classifications抽出"
    setup: "ブラウズノード階層を持つASINを検索"
    verify:
      - "NormalizedListing.classificationsが非空"
      - "Classificationにid、name、親チェーンがある"

  - name: "Dimensions抽出"
    setup: "dimensionsデータを持つASINを検索"
    verify:
      - "NormalizedListing.dimensions.itemにheight/length/width/weightが含まれる"
      - "各dimensionに数値と単位文字列がある"
```

### 9.2 バリエーションツリーテスト

```yaml
test_variation_tree:
  - name: "Catalog APIで親子ツリー解決"
    setup: "親を持つ子ASINを検索"
    verify:
      - "parentExternalIdが入力済み（undefinedでない）"
      - "variationThemeに軸属性名が含まれる"
      - "getCatalogTreeが親+すべての子を返す"

  - name: "子の一括取得（N+1修正）"
    setup: "30件の子を持つ親を検索"
    verify:
      - "Catalog API呼び出しが2回のみ（ceil(30/20)）"
      - "すべての30子を返す"
      - "合計所要時間 < 5秒"

  - name: "インポート後にPIMで親子リンク"
    setup: "親+3子をインポート"
    verify:
      - "親商品にproduct_type = 'configurable'"
      - "子は親商品を指すparent_idを持つ"
      - "子は正しい軸を持つfamily_variant_idを共有"
```

### 9.3 レート制限テスト

```yaml
test_rate_limiting:
  - name: "429レスポンスがバックオフをトリガー"
    setup: "3番目のリクエストで429を返すようにSP-APIをモック"
    verify:
      - "指数遅延後にリクエストを再試行"
      - "x-amzn-RateLimit-Limitヘッダーを読み取る"
      - "インポートが最終的に成功"

  - name: "一括インポートがレート制限内に収まる"
    setup: "200商品をインポート"
    verify:
      - "429エラーが発生しない"
      - "Catalog API呼び出しが>= 500ms間隔"
      - "Listings API呼び出しが>= 200ms間隔"
```

### 9.4 エラー耐性テスト

```yaml
test_error_resilience:
  - name: "単一バッチ失敗がインポートを中止しない"
    setup: "1つのcatalogバッチを失敗させ、他を成功させる"
    verify:
      - "失敗バッチが警告としてログ"
      - "1回再試行を試行"
      - "他のバッチが正常に処理"
      - "インポート結果に部分エンリッチメントを表示"

  - name: "トークン更新競合状態"
    setup: "トークンを期限切れにし、5つの同時リクエストをトリガー"
    verify:
      - "トークン更新呼び出しが1回のみ"
      - "すべての5リクエストが更新されたトークンで成功"
```

---

## 10. 移行メモ

### 10.1 後方互換性

すべての変更は**追加的** — 既存のデータフローは引き続き動作。追加の`includedData`パラメータは、そのデータを消費しないコードによって安全に無視される余分なフィールドを返す。MappingEngineは`rawData`に存在するものを処理する。

### 10.2 ペイロードサイズへの影響

Catalog APIレスポンスに`attributes`を追加すると、アイテムごとのペイロードが商品複雑性に応じて約2-5 KBから~10-30 KBに増加。20アイテムのバッチでは、リクエストあたり~200-600 KB — HTTPレスポンス制限内に十分収まる。

### 10.3 ロールアウト推奨

1. **フェーズ1（このPR）:** `includedData`パラメータに`attributes,classifications,dimensions`を追加。リスト検索に`relationships`を追加。`normalizeListingItem`を修正して`parentExternalId`を抽出。`getCatalogTree`で子取得をバッチ化。
2. **フェーズ2（フォローアップ）:** トークンバケットレートリミッターを実装。バッチカタログエンリッチメントに再試行ロジックを追加。トークン更新競合状態を修正。
3. **フェーズ3（将来）:** `LISTINGS_ITEM_STATUS_CHANGE`通知をサブスクライブ。一括読み取りにReports APIを検討（1000商品以上）。dry-run送信に`VALIDATION_PREVIEW`モードを追加。