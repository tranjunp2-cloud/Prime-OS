# 調査：マーケットプレイスAPI比較 — Amazon SP-API vs 楽天RMS

**バージョン：** 1.0.0
**最終更新日：** 2026-04-07
**作成者：** Minh Pham、Claude（AI支援）
**ステータス：** ドラフト
**ソース：** Amazon SP-API v2026-01-01、楽天RMS SyncHub機能仕様 (v0.5)、GitHub OSSライブラリ

---

## 1. エグゼクティブサマリー

この文書は、19項目の調査チェックリストをAmazon SP-APIと楽天RMSの機能にマッピングし、ECH-Kenshinの現在実装におけるギャップを特定し、統合SaaSのためのクロスプラットフォームステータスマッピングを提案する。

### 現在の状態

| プラットフォーム | 読取API | 書込API | 注文 | 在庫 | コネクタ |
|----------|----------|-----------|--------|-----------|-----------|
| **Amazon** | ✅ カタログ + リスト + 商品タイプ | ✅ putListing、patchListing、submitMedia | ⚠️ スキーマのみ | ⚠️ スキーマのみ | ✅ 本番環境 |
| **楽天** | ⚠️ 公開カタログのみ | ❌ なし | ❌ なし | ❌ なし | ⚠️ MVP識別 |

---

## 2. MVPにおけるプラットフォームスコープ（調査項目 #1）

### Amazon SP-API — 確認されたスコープ

| 機能 | API | ECHでのステータス |
|------------|-----|---------------|
| カタログ検索 | Catalog Items API v2022-04-01 | ✅ 実装済み |
| リスト取得 | Listings Items API v2021-08-01 | ✅ 実装済み |
| リスト送信 | Listings Items API (PUT/PATCH) | ✅ 実装済み |
| 商品タイプスキーマ | Product Type Definitions API v2020-09-01 | ✅ 実装済み |
| 注文取得 | Orders API v2026-01-01 | ❌ 未開始 |
| 在庫同期 | — (Listings API在庫フィールド経由) | ❌ 未開始 |
| 制限チェック | Listings Restrictions API | ✅ 実装済み |

### 楽天RMS — 必要なスコープ

| 機能 | API | ECHでのステータス |
|------------|-----|---------------|
| カタログ検索（公開） | 楽天市場商品検索API | ✅ MVP実装済み |
| 商品CRUD（セラー） | ItemAPI 2.0 (get、upsert、patch、delete、search) | ❌ 未開始 |
| 在庫同期 | InventoryAPI 2.1 (bulk-get、bulk-upsert) | ❌ 未開始 |
| 注文取得 | RakutenPayOrderAPI (searchOrder、getOrder) | ❌ 未開始 |
| 注文確定/キャンセル | RakutenPayOrderAPI (confirmOrder、cancelOrder) | ❌ 未開始 |
| 配送更新 | RakutenPayOrderAPI (updateOrderShipping) | ❌ 未開始 |
| 画像アップロード | CabinetAPI（R-Cabinet） | ❌ 未開始 |
| カテゴリ/ジャンル | NavigationAPI 2.0 / CategoryAPI 2.0 | ❌ 未開始 |
| ショップ情報 | ShopAPI | ❌ 未開始 |
| ライセンス管理 | LicenseManagementAPI | ❌ 未開始 |

### 認証比較

| 側面 | Amazon SP-API | 楽天RMS |
|--------|---------------|-------------|
| **認証モデル** | OAuth 2.0（LWA refresh token） | ライセンスキー + サービスシークレット |
| **トークン有効期間** | 約1時間（自動更新） | 90日（手動更新） |
| **スコープ** | セラー別（マーケットプレイス固有） | ショップ別（ストアごとのライセンスキー） |
| **認証情報形式** | client_id + client_secret + refresh_token | serviceSecret + licenseKey（Base64 → `ESA`ヘッダー） |
| **レート制限** | エンドポイント別トークンバケット（2-5 req/s） | 全体で1 req/s |
| **サンドボックス** | SP-APIサンドボックスエンドポイント | 専用テストショップアカウント |

---

## 3. 読取API（調査項目 #2）

### Amazon — 取得可能なデータ

| データセット | API | 主要フィールド | 実装済み |
|---------|-----|------------|-------------|
| 商品サマリー | Catalog Items `?includedData=summaries` | title、brand、color、size、manufacturer | ✅ |
| 完全属性 | Catalog Items `?includedData=attributes` | すべての構造化属性（material、dimensions、bullet_pointなど） | ✅ |
| 分類 | Catalog Items `?includedData=classifications` | ブラウズノード、カテゴリパス | ✅ |
| 寸法 | Catalog Items `?includedData=dimensions` | パッケージ/アイテム寸法 | ✅ |
| 画像 | Catalog Items `?includedData=images` | バリエーション別画像URL | ✅ |
| 識別子 | Catalog Items `?includedData=identifiers` | ASIN、EAN/JAN、UPC | ✅ |
| 関係性 | Catalog Items `?includedData=relationships` | 親ASIN | ✅ |
| セラー リスティング | Listings Items `?includedData=summaries,issues` | SKU、status、price、fulfillment、親/子 | ✅ |
| 商品タイプスキーマ | Product Type Definitions | 商品タイプ別のJSONスキーマ | ✅ |
| **注文** | Orders API `searchOrders` / `getOrder` | §6参照 | ❌ |

### 楽天RMS — 取得可能なデータ

| データセット | API | 主要フィールド | 実装済み |
|---------|-----|------------|-------------|
| 公開カタログ | 市場商品検索 | itemName、itemPrice、JAN、genreId、サムネイル | ✅（公開） |
| セラー商品リスト | ItemAPI 2.0 `items.search` | manageNumber、itemName、itemPrice、SKU、status、画像 | ❌ |
| 商品詳細 | ItemAPI 2.0 `items.get` | 完全な商品フィールド（§5の構造を参照） | ❌ |
| ジャンル/カテゴリ | NavigationAPI 2.0 | ジャンルツリー、ジャンル属性 | ❌ |
| 在庫 | InventoryAPI 2.1 `bulk-get` | SKUレベルの在庫数量 | ❌ |
| 注文 | RakutenPayOrderAPI `searchOrder` / `getOrder` | §6参照 | ❌ |
| ショップ情報 | ShopAPI | ショップ名、URL、設定 | ❌ |

**主な違い：** Amazon Catalog Items APIは`includedData`パラメータで単一呼び出しで豊富な構造化データを返す。楽天は商品情報、在庫、画像のために別々のAPI呼び出しが必要。楽天の公開APIはフラットなサマリーデータのみ返し、完全なデータにはセラー認証付きのItemAPI 2.0が必要。

---

## 4. 書込API（調査項目 #3）

### Amazon — 送信可能な操作

| 操作 | APIメソッド | 主要フィールド | 実装済み |
|-----------|-----------|------------|-------------|
| リスティング作成 | `putListingsItem` | 商品タイプスキーマ別完全商品データ | ✅ |
| リスティング更新 | `patchListingsItem` | 部分更新（price、quantity、attributes） | ✅ |
| メディア送信 | Listings API経由メディアアップロード | 商品画像 | ✅ |
| バルク操作 | JSON_LISTINGS_FEED | バッチ作成/更新 | ⚠️ スキーマのみ |

### 楽天RMS — 送信可能な操作

| 操作 | APIメソッド | 主要フィールド | ステータス |
|-----------|-----------|------------|--------|
| 商品作成 | ItemAPI 2.0 `items.insert` | 完全な商品データ（§5参照） | ❌ |
| 商品更新 | ItemAPI 2.0 `items.update` | 商品フィールド（URL/SKU/ジャンルは不変） | ❌ |
| 商品削除 | ItemAPI 2.0 `items.delete` | manageNumber別 | ❌ |
| 有効/無効化 | ItemAPI 2.0 (hideItemsフラグ) | 販売ステータス切り替え | ❌ |
| 画像アップロード | CabinetAPI | PNG/TIFF/BMP → JPEG自動変換、合計最大4MB | ❌ |
| 在庫更新 | InventoryAPI 2.1 `inventories.bulk.upsert` | SKUレベル数量 | ❌ |
| 注文確定 | RakutenPayOrderAPI `confirmOrder` | 荷物番号、税率、変更メモ | ❌ |
| 注文キャンセル | RakutenPayOrderAPI `cancelOrder` | 理由コード | ❌ |
| 配送後キャンセル | RakutenPayOrderAPI `cancelAfterShipping` | 戻りフラグ | ❌ |
| 配送更新 | RakutenPayOrderAPI `updateOrderShipping` | キャリア追跡番号、配送日 | ❌ |

**主な違い：** AmazonはJSONスキーマ検証によりすべての商品書き込み操作に統合Listings APIを使用。楽天は商品（ItemAPI）、在庫（InventoryAPI）、画像（CabinetAPI）、注文（RakutenPayOrderAPI）に別々のAPIを使用。

**重要な楽天の制約：** セラーはAPI作成/編集/削除を使用する前にCSV バルク商品編集（¥11,000/月）に登録する必要がある。

---

## 5. 商品データ構造（調査項目 #4、#10、#11）

### Amazon商品構造

```
商品 (ASIN)
├── productType: "SHIRT" (Product Type Definitionsより)
├── summaries: { itemName、brand、color、size、manufacturer }
├── attributes: { 商品タイプスキーマ別のJSONB }
│   ├── bullet_point[]、product_description
│   ├── material、item_package_dimensions
│   ├── purchasable_offer (price)、item_weight
│   └── ... (20以上の属性グループ)
├── identifiers: { ASIN、EAN/JAN、UPC }
├── classifications: { browseNode階層 }
├── images: { MAIN、PT01-PT08、SWATCH }
├── relationships: { parentAsins[] }
└── セラーリスティング (SKU)
    ├── sku、status、price、fulfillmentChannel
    ├── parentSku、variationChildSkus[]
    ├── variationType: "parent" | "child" | "standalone"
    └── variationTheme: ["Size"、 "Color"]
```

### 楽天商品構造

```
商品 (manageNumber = 商品URL識別子)
├── itemName: 商品名（最大255文字）
├── itemPrice: 販売価格
├── genreId: ジャンルID（作成後不変）
├── catalogId: JAN/EANコード（省略の場合理由が必要）
├── productType:
│   ├── Normal（通常商品） — 定期購入可能
│   ├── Distribution（頒布会商品） — 2〜12回配送
│   └── Pre-order（予約商品） — 発売日付き
├── description: 商品説明（最大5120文字）
├── images: CabinetAPI経由（最初 = メイン画像）
│   └── URL: image.rakuten.co.jp/_shop_{id}/cabinet/image
├── status: Active（販売）/ Inactive（非販売）— hideItemsフラグ経由
├── genreAttributes: ジャンル別必須/任意フィールド
└── SKU構造:
    ├── 単一SKU: 1 manageNumber = 1 SKU
    └── 複数SKU: 1 manageNumber = N SKU
        ├── SKU分類: 軸名（例："Color"、"Size"）
        ├── SKU値: 分類別の軸値
        ├── SKU別: price、quantity（InventoryAPI経由）
        └── バリエーション表示は親 + 子行
```

### SKU / バリエーション比較（調査項目 #10）

| 側面 | Amazon | 楽天 |
|--------|--------|---------|
| **親コンセプト** | 親ASIN（productType=configurable） | manageNumber（商品URL） |
| **子コンセプト** | 固有SKUを持つ子ASIN | 同一manageNumber下のSKU |
| **バリエーション軸** | variationTheme[]（例：["Size","Color"]） | SKU分類（横軸：Color、縦軸：Size） |
| **リンク** | parentSku ↔ variationChildSkus[] | 同一manageNumber下で暗黙的 |
| **独立価格** | 各子ASINは固有価格 | 各SKUは固有価格 |
| **独立在庫** | 各SKUは固有数量 | 各SKUは固有数量（InventoryAPI経由） |
| **最大バリエーション数** | 商品タイプによる（通常2軸） | 2軸（横軸/縦軸） |
| **スタンドアロン** | productType=simple、親なし | 単一SKU商品 |

### ECH-Kenshinマッピング

```
Amazon親ASIN ──┐
                      ├──→ 商品（parentId=null、productType=configurable）
楽天manageNumber─┘        ├── familyVariantId → 軸定義
                               ├── 子商品（parentId=parent.id）
                               │   ├── sku（組織ごとに一意）
                               │   └── values: JSONB（EAV属性）
                               └── channel_listings（チャネルごと）
                                   ├── externalId（ASINまたはmanageNumber）
                                   └── channel_values: JSONB
```

### 必須 vs 任意フィールド（調査項目 #11）

| フィールド | Amazon | 楽天 | 共通モデル |
|-------|--------|---------|-------------|
| 商品名/タイトル | 必須 | 必須（itemName） | ✅ 必須 |
| SKU | 必須 | 必須（manageNumber） | ✅ 必須 |
| 価格 | 必須 | 必須（itemPrice） | ✅ 必須 |
| 説明 | タイプによる必須 | 必須（説明文） | ✅ 必須 |
| 画像 | 必須（1以上メイン） | 任意（推奨） | ⚠️ 推奨 |
| JAN/EAN | 任意 | 任意（catalogId、省略の場合理由） | 任意 |
| カテゴリ | 必須（productType） | 必須（genreId） | ✅ 必須 |
| ブランド | タイプによる必須 | 任意（ジャンル属性経由） | ⚠️ タイプ依存 |
| 寸法 | 任意 | 標準フィールドなし | 任意 |
| 重量 | 任意 | 標準フィールドなし | 任意 |
| bullet points | タイプによる必須 | 該当なし | プラットフォーム固有 |
| ジャンル属性 | N/A | genreIdごとに必須 | プラットフォーム固有 |
| 商品タイプタグ | N/A | 必須（Normal/Distribution/Pre-order） | プラットフォーム固有 |

---

## 6. 注文データ（調査項目 #7、#8、#9）

### Amazon Orders API v2026-01-01

**エンドポイント：**

| エンドポイント | メソッド | パス |
|----------|--------|------|
| 注文検索 | GET | `/orders/2026-01-01/orders` |
| 注文取得 | GET | `/orders/2026-01-01/orders/{orderId}` |

**検索パラメータ：**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `createdAfter` / `createdBefore` | datetime | 作成時間でフィルタ（lastUpdatedと相互排他） |
| `lastUpdatedAfter` / `lastUpdatedBefore` | datetime | 更新時間でフィルタ |
| `fulfillmentStatuses` | array | ステータスでフィルタ |
| `marketplaceIds` | array | 最大50マーケットプレイス |
| `fulfilledBy` | array | MERCHANTまたはAMAZON |
| `maxResultsPerPage` | int | 1-100（デフォルト100） |
| `paginationToken` | string | カーソル（24時間後に期限切れ） |
| `includedData` | array | BUYER、RECIPIENT、PROCEEDS、EXPENSE、PROMOTION、CANCELLATION、FULFILLMENT、PACKAGES |

**Amazon注文モデル：**

```typescript
interface AmazonOrder {
  orderId: string;                    // Amazon定義
  orderAliases?: Alias[];             // aliasType: SELLER_ORDER_ID
  createdTime: datetime;
  lastUpdatedTime: datetime;
  programs?: OrderProgram[];          // PRIME、PREORDER、AMAZON_BUSINESSなど
  associatedOrders?: AssociatedOrder[]; // REPLACEMENT_ORIGINAL_ID、EXCHANGE_ORIGINAL_ID
  salesChannel: {
    channelName: 'AMAZON' | 'NON_AMAZON';
    marketplaceId: string;
    marketplaceName: string;
  };
  buyer?: {
    buyerName: string;
    buyerEmail: string;               // 匿名化、FBMのみ
    buyerCompanyName?: string;
    buyerPurchaseOrderNumber?: string;
  };
  recipient?: {
    deliveryAddress: CustomerAddress;
    deliveryPreference?: DeliveryPreference;
  };
  proceeds?: { grandTotal: Money };
  fulfillment: {
    fulfillmentStatus: FulfillmentStatus;
    fulfilledBy: 'AMAZON' | 'MERCHANT';
    fulfillmentServiceLevel: ServiceLevel;
    shipByWindow?: DateTimeRange;
    deliverByWindow?: DateTimeRange;
  };
  orderItems: AmazonOrderItem[];
  packages?: OrderPackage[];          // FBMのみ
}

interface AmazonOrderItem {
  orderItemId: string;
  quantityOrdered: number;
  product: {
    asin: string;
    title: string;
    sellerSku: string;
    condition: { conditionType: 'NEW'|'USED', conditionSubtype: string };
    price: { unitPrice: Money, priceDesignation?: 'BUSINESS_PRICE' };
    serialNumbers?: string[];
  };
  proceeds?: { proceedsTotal: Money, breakdowns: ProceedsBreakdown[] };
  expense?: { pointsCost: PointsCost };
  promotion?: { breakdowns: PromotionBreakdown[] };
  cancellation?: { cancellationRequest: { requester: 'BUYER'|'SELLER', cancelReason: string } };
  fulfillment?: {
    quantityFulfilled: number;
    quantityUnfulfilled: number;
    packing?: { giftOption: { giftMessage, giftWrapLevel } };
    shipping?: { scheduledDeliveryWindow, shippingConstraints, internationalShipping };
  };
}

interface OrderPackage {  // FBMのみ
  packageReferenceId: string;
  createdTime: datetime;
  packageStatus: {
    status: 'PENDING'|'SHIPPED'|'IN_TRANSIT'|'DELIVERED'|'CANCELLED'|'UNDELIVERABLE'|'RETURNED'|'EXCEPTION';
    detailedStatus?: string;  // 例: OUT_FOR_DELIVERY
  };
  carrier: string;
  shipTime: datetime;
  shippingService: string;
  trackingNumber: string;
  shipFromAddress: MerchantAddress;
  packageItems: { orderItemId: string, quantity: number, transparencyCodes?: string[] }[];
}
```

### 楽天RMS 注文API（RakutenPayOrderAPI）

**エンドポイント：**

| エンドポイント | メソッド | 説明 |
|----------|--------|-------------|
| searchOrder | POST | 日付範囲 + ステータスフィルタで注文検索 |
| getOrder | POST | 注文番号リストで注文詳細取得 |
| confirmOrder | POST | 保留中注文を確定 |
| cancelOrder | POST | 配送前注文をキャンセル |
| cancelAfterShipping | POST | 配送後キャンセル/戻り（returnFlag設定） |
| updateOrderShipping | POST | キャリア追跡番号、配送日更新 |
| getSubStatusList | GET | カスタムサブステータスオプション取得 |
| updateOrderSubStatus | POST | 注文にカスタムサブステータス設定 |

**検索パラメータ：**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `dateType` | int | 期間検索タイプ（1=注文日など） |
| `startDatetime` / `endDatetime` | datetime | +0900タイムゾーンのISO 8601 |
| `orderProgressList` | int[] | ステータスコード：[100,200,300,400,500,600,700,800,900] |
| `PaginationRequestModel` | object | { requestRecordsAmount: 最大1000、requestPage: 1ベース } |

**認証ヘッダー：** `Authorization: ESA {base64(serviceSecret:licenseKey)}`

**楽天注文モデル（SyncHub仕様 + OSSライブラリから派生）：**

```typescript
interface RakutenOrder {
  orderNumber: string;                // 楽天注文ID
  orderDatetime: datetime;
  orderProgress: number;              // ステータスコード（100-900）
  // 購入者情報
  ordererModel: {
    familyName: string;               // 姓
    firstName: string;                // 名
    zipCode: string;
    prefecture: string;               // 都道府県
    city: string;
    subAddress: string;
    phoneNumber: string;
    emailAddress: string;
  };
  // 配送情報
  deliveryModel: {
    deliveryName: string;
    deliveryZipCode: string;
    deliveryPrefecture: string;
    deliveryCity: string;
    deliverySubAddress: string;
    deliveryPhoneNumber: string;
  };
  // 荷物/バスケット情報
  basketModelList: {
    basketId: number;                  // 荷物識別子
    shippingModelList: {
      shippingDetailId: number;
      deliveryCompany: string;        // キャリアコード
      shippingNumber: string;         // 追跡番号
      shippingDate: string;           // YYYY-MM-DD
    }[];
    itemModelList: {
      itemName: string;
      manageNumber: string;           // 商品URL識別子
      itemNumber: string;             // SKU
      price: number;
      units: number;                  // 数量
    }[];
  };
  // 決済
  paymentModel: {
    totalPrice: number;
    shippingCost: number;
    taxAmount: number;
    pointAmount: number;              // 使用された楽天ポイント
    couponAmount: number;
  };
  // ステータス固有
  subStatusId?: number;               // カスタムサブステータス
  returnFlag?: boolean;               // cancelAfterShippingで設定
}
```

**通知：** 楽天は新しい注文時にwebhook `受注情報通知（SKU移行後）`を送信 → SyncHubが`getOrder`をトリガー

---

## 7. クロスプラットフォーム注文ステータスマッピング（調査項目 #9）

### 楽天注文ステータスコード

| コード | 日本語 | 英語 | 説明 |
|------|----------|---------|-------------|
| 100 | 注文確認待ち | Awaiting Confirmation | 新規注文、ショップ未確定 |
| 200 | 楽天処理中 | Rakuten Processing | ショップ確定後、決済監査中 |
| 300 | 発送待ち | Awaiting Shipment | 決済確認済み、配送準備完了 |
| 400 | 変更確定待ち | Awaiting Change Confirmation | 注文変更保留中 |
| 500 | 発送済み | Shipped | 全アイテム発送済 |
| 600 | 支払手続き中 | Payment Processing | 決済進行中 |
| 700 | 支払手続き済み | Payment Completed | 決済完了 |
| 800 | キャンセル確定待ち | Awaiting Cancellation | キャンセルリクエスト済、保留中 |
| 900 | キャンセル確定 | Cancelled | 注文キャンセル済 |

### Amazon注文フルフィルメントステータス

| ステータス | 説明 |
|--------|-------------|
| PENDING_AVAILABILITY | 予約商品、発売日待ち |
| PENDING | 注文済、発送準備未完了 |
| UNSHIPPED | 発送準備完了、未発送 |
| PARTIALLY_SHIPPED | 一部発送済 |
| SHIPPED | 全アイテム発送済 |
| CANCELLED | 注文キャンセル済 |
| UNFULFILLABLE | フルフィルメント不可能（FBAのみ） |

### Amazon荷物ステータス（FBMのみ）

| ステータス | 説明 |
|--------|-------------|
| PENDING | 荷物未発送 |
| SHIPPED | キャリアに引き渡し済 |
| IN_TRANSIT | キャリアネットワーク内 |
| DELIVERED | 顧客に配達済 |
| CANCELLED | 荷物キャンセル済 |
| UNDELIVERABLE | 配達不可能 |
| RETURNED | 差出人に返却 |
| EXCEPTION | 配達例外 |

### 統合ECH-Kenshin注文ステータスモデル

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECH統合ステータス                              │
│                                                                  │
│  ┌──────────┐   ┌────────────┐   ┌───────────┐   ┌──────────┐  │
│  │  PENDING  │──→│ PROCESSING │──→│  SHIPPED  │──→│DELIVERED │  │
│  └────┬─────┘   └─────┬──────┘   └─────┬─────┘   └──────────┘  │
│       │               │               │                         │
│       ▼               ▼               ▼                         │
│  ┌──────────┐   ┌────────────┐   ┌───────────┐                 │
│  │CANCELLED │   │ CANCELLED  │   │ RETURNED  │                 │
│  └──────────┘   └────────────┘   └───────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

| ECHステータス | Amazonフルフィルメント | Amazon荷物 | 楽天コード | 説明 |
|------------|-------------------|----------------|--------------|-------------|
| `new` | PENDING_AVAILABILITY、PENDING | — | 100 | 注文受信、確定待ち |
| `processing` | UNSHIPPED | PENDING | 200、300、400 | 確定、決済確認済み、配送準備完了 |
| `shipped` | PARTIALLY_SHIPPED、SHIPPED | SHIPPED、IN_TRANSIT | 500 | アイテムはキャリアに渡済 |
| `delivered` | — | DELIVERED | 600、700 | 配達 + 決済済 |
| `cancelled` | CANCELLED、UNFULFILLABLE | CANCELLED | 800、900 | 注文キャンセル済 |
| `returned` | — | RETURNED | 500+returnFlag | 配送後キャンセル/戻り |

### チャネルステータス保存

`orders`テーブルは統合ステータスと元のステータスの両方を保存：

```sql
-- ordersテーブル
status          TEXT    // ECH統合: new、processing、shipped、delivered、cancelled、returned
channel_status  TEXT    // 元: "UNSHIPPED"、"300"など

-- order_status_historyテーブル
status          TEXT    // この時点のECH統合ステータス
channel_status  TEXT    // 元プラットフォームステータス
source          TEXT    // 'channel' | 'system' | 'user'
```

---

## 8. 在庫データ（調査項目 #6）

### Amazon在庫

Amazonには従来の意味でのセラーの別個在庫APIは**ない**。在庫は以下で管理：

1. **Listings API** — リスティングデータの`quantity`フィールド（FBM）
2. **FBA在庫** — Amazonで管理、FBA在庫API経由で読取
3. **Feeds API** — `POST_INVENTORY_AVAILABILITY_DATA`でバルク在庫更新

### 楽天在庫

| エンドポイント | メソッド | 説明 |
|----------|--------|-------------|
| `GET /es/2.1/inventories/bulk-get` | POST | 複数SKUの在庫取得 |
| `POST /es/2.1/inventories/bulk-upsert` | POST | 複数SKUの在庫更新 |

**SKUごとの主要フィールド：**
- `manageNumber` — 商品識別子
- `itemNumber` — SKU識別子
- `quantity` — 在庫可能数量

**SyncHub仕様からの同期パターン：**
- 商品作成後 → `inventories.bulk.upsert`を呼び出して初期数量設定
- ポーリング: 5分ごとにAPIを再呼び出しして在庫レベル更新
- Product Master在庫編集時 → 連携された全ECモールにプッシュ

### ECH-Kenshin在庫アーキテクチャ

現在のスキーマ（5テーブル）は両プラットフォームに 適切にマッピング：

```
inventory_items (sku、warehouseId、quantityOnHand、quantityReserved、version)
     │
     ├── inventory_ledger (append-only: received、sold、reserved、released、adjusted、transferred、returned)
     │
     ├── channel_stock_rules (channelId、warehouseId、bufferStock、maxStock)
     │
     └── stock_sync_queue (sku、channelId、status: pending/syncing/synced/error)
```

**ギャップ：** プラットフォーム固有実装を持つ`InventoryConnector`インターフェースが必要：
- `AmazonInventoryConnector` — Listings API quantityフィールドまたはFeeds API経由でプッシュ
- `RakutenInventoryConnector` — InventoryAPI 2.1 bulk-upsert経由でプッシュ

---

## 9. マッピング：共通 vs 固有フィールド（調査項目 #12、#13）

### 共通フィールド（標準化可能）

| 共通フィールド | Amazonソース | 楽天ソース |
|-------------|-------------|---------------|
| `title` | `summaries.itemName` | `itemName` |
| `price` | `purchasable_offer.our_price` | `itemPrice` |
| `sku` | Listing SKU | `itemNumber`（manageNumber下のSKU） |
| `externalId` | ASIN | `manageNumber` |
| `janCode` | `identifiers[type=EAN]` | `catalogId` |
| `description` | `product_description` | `description`（最大5120） |
| `mainImage` | `images[variant=MAIN]` | CabinetAPIからの最初の画像 |
| `category` | `classifications.browseNodeId` | `genreId` |
| `status` | Listingステータス | hideItemsフラグ |
| `quantity` | Listing数量 | InventoryAPI数量 |
| `parentId` | `parentSku` | 同一`manageNumber`（暗黙的） |
| `variationAxes` | `variationTheme[]` | SKU分類名 |

### Amazon固有フィールド

| フィールド | 説明 | 処理方法 |
|-------|-------------|----------|
| `bullet_point[]` | 最大5つのbullet points | `channel_values`に保存 |
| `item_package_dimensions` | L×W×H×weight | `channel_values`に保存 |
| `browse_node`階層 | カテゴリツリーパス | `channel_values`に保存 |
| `fulfillmentChannel` | FBA/FBM | `channel_values`に保存 |
| `condition` | NEW/USED + サブタイプ | `channel_values`に保存 |
| `brand` | タイプによる必須 | 可能な場合共通にマッピング |
| `material`、`color`、`size` | 構造化属性 | 可能な場合共通にマッピング |
| Product Type JSONスキーマ | 動的検証 | `marketplace_product_types` |

### 楽天固有フィールド

| フィールド | 説明 | 処理方法 |
|-------|-------------|----------|
| `productType`タグ | Normal/Distribution/Pre-order | `channel_values`に保存 |
| `subscription`設定 | 定期購入価格（販売価格から5%以上割引） | `channel_values`に保存 |
| `distribution`配送 | 2〜12回の荷物配送 | `channel_values`に保存 |
| `preOrder`発売日 | 販売開始日 | `channel_values`に保存 |
| `genreAttributes` | ジャンル別必須フィールド | `channel_values`に保存 |
| `hideItems`フラグ | Active/Inactive切り替え | リスティングステータスにマッピング |
| `manageNumber` | 商品URL（不変） | `externalId`として保存 |

---

## 10. Product Master / Listing Master / 在庫関係（調査項目 #14、#15、#16）

### データフロー：プラットフォーム → ECH-Kenshin

```
Amazon SP-API                          ECH-Kenshin                         楽天RMS
────────────                          ───────────                         ───────────
Catalog Items API ──┐                                                ┌── ItemAPI 2.0
Listings Items API ─┤    ┌─────────────────────────┐                 ├── InventoryAPI 2.1
                    ├───→│    imported_listings      │←───────────────┤
                    │    │  (raw marketplace data)   │                │
                    │    └──────────┬────────────────┘                │
                    │               │ MappingEngine                   │
                    │               ▼                                 │
                    │    ┌─────────────────────────┐                 │
                    │    │      products            │                 │
                    │    │  (Product Master - PIM)  │                 │
                    │    │  values: JSONB (EAV)     │                 │
                    │    └──────────┬────────────────┘                │
                    │               │                                 │
                    │               ▼                                 │
                    │    ┌─────────────────────────┐                 │
                    │    │   channel_listings       │                 │
                    │    │  (Listing Master)        │                 │
                    │    │  channel_values: JSONB   │←────────────────┘
                    │    └──────────┬────────────────┘
                    │               │
                    │               ▼
Orders API ─────────┤    ┌─────────────────────────┐    ┌── RakutenPayOrderAPI
                    ├───→│      orders              │←───┤
                    │    │  (Order Management)      │    │
                    │    └──────────────────────────┘    │
                    │                                     │
                    │    ┌─────────────────────────┐    │
                    ├───→│   inventory_items        │←───┤── InventoryAPI 2.1
                    │    │  (Inventory Management)  │    │
                    │    └──────────────────────────┘    │
```

### 楽天固有の統合ポイント

1. **Product Master:** 楽天`manageNumber` → `imported_listings.externalId` → JAN/タイトル/AIマッピングで`products`と照合
2. **Listing Master:** 楽天チャネルを指す`channelId`を持つ`channel_listings`、`channel_values`に楽天固有フィールド（genreAttributes、productTypeタグ、subscription設定）を保存
3. **在庫:** `inventory_items.sku` ↔ 楽天`itemNumber`、`stock_sync_queue`経由で同期 → `RakutenInventoryConnector` → InventoryAPI 2.1

---

## 11. ERD / データベース影響（調査項目 #17）

### 新規テーブル必要数：なし

現在の48テーブルスキーマは新規テーブルなしで楽天に対応可能。楽天データは既存構造を通じたフロー：

| 既存テーブル | 楽天使用法 |
|---------------|---------------|
| `channels` | 新規行: type='rakuten'、credentials=licenseKey+serviceSecret |
| `channel_listings` | channel_values JSONBを持つ楽天リスティング |
| `channel_attribute_mappings` | 楽天フィールド → PIM属性マッピング |
| `marketplace_product_types` | 楽天ベースジャンルスキーマ |
| `imported_listings` | 生楽天商品データ（照合フロー） |
| `listing_submissions` | 楽天API書き込み操作の追跡 |
| `orders` | channel_statusに数値コードを保存する楽天注文 |
| `order_items` | 楽天注文ラインアイテム |
| `order_status_history` | 楽天ステータス遷移（100→200→300→...） |
| `inventory_items` | 楽天商品に連携されたSKUレベル在庫 |
| `stock_sync_queue` | 楽天InventoryAPIへの更新プッシュキュー |

### 必要なスキーマ変更

1. **`channels`テーブル** — 楽天認証モデル用の`{ licenseKey、serviceSecret、shopUrl、expireDate }`サポートをcredential JSONBで確認
2. **`listing_submissions.operation`** — 列挙値を一般化: 現在のAmazon固有値（`putListingsItem`、`patchListingsItem`） → 汎用値追加（`create_listing`、`update_listing`、`delete_listing`、`update_inventory`）
3. **`orders.channel_status`** — すでにTEXT、楽天数値コードを文字列として保存可能（"100"、"200"など）

---

## 12. フェーズ優先度（調査項目 #18、#19）

### フェーズ0 — 調査（本文書）✅

| # | 項目 | Amazon | 楽天 |
|---|------|--------|---------|
| 1 | プラットフォームスコープ | ✅ | ✅ |
| 2 | 読取API | ✅ | ✅ |
| 3 | 書込API | ✅ | ✅ |
| 4 | 商品構造 | ✅ | ✅ |
| 5-6 | Listing + 在庫 | ✅ | ✅ |
| 7-9 | 注文 + ステータス | ✅ | ✅ |
| 10-13 | SKU + マッピング | ✅ | ✅ |
| 14-17 | 関係 + ERD | ✅ | ✅ |

### フェーズ1 — MVP実装優先度

**MVPに必須（市場投入）：**

| 優先度 | 項目 | Amazon | 楽天 |  工数 |
|----------|------|--------|---------|--------|
| P0 | 商品読取（セラー） | ✅ 完了 | ItemAPI 2.0コネクタ | M |
| P0 | 商品書込 | ✅ 完了 | ItemAPI 2.0 insert/update | L |
| P0 | 注文取得 | Orders APIコネクタ | RakutenPayOrderAPIコネクタ | L |
| P0 | クロスプラットフォームステータスマッピング | OMS towerに実装 | OMS towerに実装 | M |
| P1 | 在庫同期 | 既存のスキーマをAPIに接続 | InventoryAPI 2.1コネクタ | M |
| P1 | 注文アクション（確定/キャンセル） | N/A（Amazonは自動処理） | confirmOrder、cancelOrder | M |
| P1 | 配送更新 | Feeds APIまたはOrder API | updateOrderShipping | S |

**延期（フェーズ2+）：**

| 項目 | 理由 |
|------|--------|
| 楽天CabinetAPI（画像アップロード） | 最初は既存の画像URLを使用可能 |
| 楽天NavigationAPI（ジャンルツリー） | 一般的なジャンルはハードコード可能 |
| Amazon Feeds API（バルク操作） | MVPでは単一アイテムAPIで十分 |
| AI Product Masterマッピング | SyncHubスタイルの機能、複雑 |
| 定期購入/頒布会商品タイプ | ニッチな楽天機能 |
| 返品/返金フロー | MVP後 |

---

## 13. 実装推奨

### 新規必要なコネクタ

```typescript
// 1. RakutenSellerConnector（既存のRakutenPublicConnectorパターンを拡張）
interface IRakutenSellerConnector extends
  ICatalogSearchable,      // ItemAPI 2.0 search
  IListingPullable,        // ItemAPI 2.0 get
  IListingSubmittable,     // ItemAPI 2.0 insert/update/delete
  IInventorySyncable {     // InventoryAPI 2.1 bulk-get/bulk-upsert
  // Auth: serviceSecret + licenseKeyのESAヘッダー
  // Rate limit: 1 req/s
}

// 2. AmazonOrderConnector
interface IAmazonOrderConnector extends
  IOrderPullable,          // Orders API searchOrders/getOrder
  IOrderTrackable {        // 荷物ステータス追跡
  // Auth: 既存のLWA OAuth
  // レート制限: 未定（SP-APIレート制限ドキュメント確認）
}

// 3. RakutenOrderConnector
interface IRakutenOrderConnector extends
  IOrderPullable,          // searchOrder/getOrder
  IOrderActionable,        // confirmOrder、cancelOrder、cancelAfterShipping
  IOrderTrackable {        // updateOrderShipping
  // Auth: ESAヘッダー
  // Webhook: 受注情報通知でリアルタイム注文通知
}
```

### OMS Tower実装

OMS towerにはスキーマはあるがサーバコードがない。必要なモジュール：

```
towers/oms/
├── orders/
│   ├── orders.controller.ts       — RESTエンドポイント
│   ├── orders.service.ts          — ビジネスロジック
│   ├── orders-sync.service.ts     — Amazon/楽天からプル
│   └── orders-status.mapper.ts    — クロスプラットフォームステータスマッピング
├── order-items/
│   └── order-items.service.ts
└── oms.module.ts
```

---

## ソース

- Amazon SP-API Orders v2026-01-01: [GitHubモデル](https://github.com/amzn/selling-partner-api-models/blob/main/models/orders-api-model/orders_2026-01-01.json)
- 楽天RMS SyncHub機能仕様 v0.5（PDF、46ページ）
- [Rakuten.RMS.Api .NETライブラリ](https://github.com/JakeJP/Rakuten.RMS.Api)
- [rms_api_ruby — RakutenPayOrderAPIドキュメント](https://github.com/Kaicoh/rms_api_ruby/blob/master/docs/rakuten_pay_order_api.md)
- [rms-api-sample (PHP)](https://github.com/yheihei/rms-api-sample)
- [楽天注文フロー解説](https://www.apro-soken.co.jp/column/order/post-8.html)