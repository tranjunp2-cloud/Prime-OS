// Domain router for the Global ECH Orchestration Copilot
// Classifies user messages into domains and intents
// Redirects Inventory Module 2 queries to dedicated Inventory Copilot

import { ClassifiedIntent, CopilotDomain, CopilotIntent, RiskLevel } from './types';

// Inventory Module 2 keywords (MUST redirect)
const INVENTORY_MODULE_2_KEYWORDS = [
  // Vietnamese
  'kho', 'tồn kho', 'hàng tồn', 'stock', 'low stock', 'sắp hết', 'hết hàng',
  'còn bao nhiêu', 'available', 'inventory', 'stockout', 'velocity',
  'replenishment', 'chuyển kho', 'nhập kho', 'xuất kho',
  // English
  'how many', 'in stock', 'out of stock', 'warehouse stock', 'sku stock',
  'inventory summary', 'stock level', 'reorder', 'days of cover',
  // Japanese
  '在庫', '倉庫在庫', '残数'
];

// Product domain keywords
const PRODUCT_KEYWORDS = [
  'product', 'sản phẩm', 'tạo sản phẩm', 'create product', 'product master',
  'sku', 'variation', 'biến thể', 'attribute', 'thuộc tính', '商品'
];

// Listing domain keywords
const LISTING_KEYWORDS = [
  'listing', 'danh mục', 'đăng bán', 'list', 'amazon listing', 'shopee listing',
  'rakuten listing', 'title', 'tiêu đề', 'bullet', 'description', 'mô tả',
  'content', 'nội dung', 'SEO', 'listing draft', 'sync', 'đồng bộ',
  '出品', 'リスティング'
];

// Warehouse/Fulfillment domain keywords (config, not inventory)
const WAREHOUSE_KEYWORDS = [
  'warehouse', 'kho hàng', 'fulfillment', 'thực hiện', 'routing', 'định tuyến',
  'ranking', 'xếp hạng', 'priority', 'ưu tiên', 'config', 'cấu hình',
  'capability', 'năng lực', 'constraint', 'ràng buộc', 'virtual', 'marketplace',
  '倉庫', 'フルフィルメント'
];

// Orders domain keywords
const ORDER_KEYWORDS = [
  'order', 'đơn hàng', 'đơn', 'tracking', 'vận chuyển', 'shipping',
  'cancel', 'hủy', 'refund', 'hoàn tiền', 'stuck', 'bị kẹt', 'pending',
  'chờ xử lý', 'status', 'trạng thái', '注文', 'オーダー'
];

// QC/Support keywords
const QC_SUPPORT_KEYWORDS = [
  'policy', 'chính sách', 'sop', 'quy trình', 'test', 'kiểm tra',
  'demo', 'seed', 'tạo dữ liệu', 'help', 'trợ giúp', 'guide', 'hướng dẫn',
  'why', 'tại sao', 'explain', 'giải thích', 'ヘルプ', 'ガイド'
];

// Admin/Integration keywords
const ADMIN_KEYWORDS = [
  'connection', 'kết nối', 'integration', 'tích hợp', 'amazon', 'shopee',
  'rakuten', 'sync status', 'trạng thái đồng bộ', 'api', 'credential',
  '接続', '統合'
];

// Write intent indicators
const WRITE_INDICATORS = [
  'create', 'tạo', 'add', 'thêm', 'update', 'cập nhật', 'edit', 'sửa',
  'delete', 'xóa', 'remove', 'bỏ', 'change', 'thay đổi', 'draft', 'nháp'
];

// Troubleshooting indicators
const TROUBLESHOOT_INDICATORS = [
  'why', 'tại sao', 'stuck', 'bị kẹt', 'error', 'lỗi', 'issue', 'vấn đề',
  'problem', 'không được', 'failed', 'thất bại', 'help', 'fix', 'sửa lỗi'
];

export function classifyIntent(userMessage: string, currentRoute: string): ClassifiedIntent {
  const normalized = userMessage.toLowerCase().trim();

  // Check for Inventory Module 2 (MUST redirect)
  if (isInventoryModule2Query(normalized)) {
    return {
      domain: 'inventory_module_2',
      intent: 'read',
      riskLevel: 'low',
      requiresConfirmation: false,
      redirectToInventoryCopilot: true,
    };
  }

  // Determine domain
  const domain = detectDomain(normalized, currentRoute);

  // Determine intent
  const intent = detectIntent(normalized);

  // Calculate risk level
  const riskLevel = calculateRisk(intent, domain);

  return {
    domain,
    intent,
    riskLevel,
    requiresConfirmation: intent === 'write_draft' || intent === 'write_commit_request',
  };
}

function isInventoryModule2Query(text: string): boolean {
  return INVENTORY_MODULE_2_KEYWORDS.some(keyword => text.includes(keyword));
}

function detectDomain(text: string, currentRoute: string): CopilotDomain {
  // Check keywords in order of specificity
  if (PRODUCT_KEYWORDS.some(kw => text.includes(kw))) return 'product';
  if (LISTING_KEYWORDS.some(kw => text.includes(kw))) return 'listing';
  if (ORDER_KEYWORDS.some(kw => text.includes(kw))) return 'orders';
  if (WAREHOUSE_KEYWORDS.some(kw => text.includes(kw))) return 'warehouse';
  if (ADMIN_KEYWORDS.some(kw => text.includes(kw))) return 'admin_integration';
  if (QC_SUPPORT_KEYWORDS.some(kw => text.includes(kw))) return 'qc_support';

  // Fallback: infer from current route
  if (currentRoute.includes('/products')) return 'product';
  if (currentRoute.includes('/listings')) return 'listing';
  if (currentRoute.includes('/orders')) return 'orders';
  if (currentRoute.includes('/warehouse')) return 'warehouse';

  return 'unknown';
}

function detectIntent(text: string): CopilotIntent {
  if (TROUBLESHOOT_INDICATORS.some(kw => text.includes(kw))) return 'troubleshooting';
  if (WRITE_INDICATORS.some(kw => text.includes(kw))) return 'write_draft';
  
  // Policy/QA detection
  if (text.includes('policy') || text.includes('chính sách') || text.includes('sop')) {
    return 'policy_qa';
  }

  return 'read';
}

function calculateRisk(intent: CopilotIntent, domain: CopilotDomain): RiskLevel {
  if (intent === 'write_commit_request') return 'high';
  if (intent === 'write_draft') return 'medium';
  if (domain === 'orders' && intent === 'troubleshooting') return 'medium';
  return 'low';
}

// Get redirect message for Inventory Module 2
export function getInventoryRedirectMessage(locale: 'vi-VN' | 'ja-JP' | 'en-US' = 'vi-VN'): string {
  const messages = {
    'vi-VN': `Phần này thuộc **Inventory Copilot (Module 2)** và đang tách riêng để đảm bảo độ chính xác & kiểm soát.

Vui lòng mở Inventory Copilot tại **[Inventory → Inventory Summary](/inventory/summary)** để sử dụng các tính năng:
- Tra cứu tồn kho tự nhiên
- Cảnh báo low stock / stockout
- Gợi ý replenishment

Nếu bạn muốn, tôi có thể giúp bạn chuẩn bị câu hỏi đúng format để module đó xử lý.`,

    'ja-JP': `この機能は**Inventory Copilot (Module 2)**に属しており、精度と管理のために分離されています。

**[Inventory → Inventory Summary](/inventory/summary)**でInventory Copilotを開いてください。

ご希望であれば、そのモジュール用の質問フォーマットをご用意いたします。`,

    'en-US': `This query belongs to **Inventory Copilot (Module 2)**, which is separated to ensure accuracy and control.

Please open Inventory Copilot at **[Inventory → Inventory Summary](/inventory/summary)** for features like:
- Natural language inventory lookup
- Low stock / stockout alerts
- Replenishment suggestions

If you'd like, I can help you prepare a properly formatted question for that module.`,
  };

  return messages[locale];
}
