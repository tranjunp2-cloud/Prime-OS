// Response templates for the Global ECH Orchestration Copilot
// Provides domain-specific responses for the UI shell (Phase 1)

import { CopilotDomain, GlobalCopilotMessage, GlobalCopilotAction } from './types';

interface TemplateResponse {
  content: string;
  actions?: GlobalCopilotAction[];
}

export function getWelcomeMessage(): Omit<GlobalCopilotMessage, 'id' | 'timestamp'> {
  return {
    role: 'assistant',
    content: `👋 **Xin chào! Tôi là ECH Global Copilot.**

Tôi có thể hỗ trợ bạn với:

• **Product Master**: Tạo/chuẩn hóa sản phẩm, generate listing content
• **Listings**: Quản lý listings trên Amazon, Shopee, Rakuten
• **Warehouses**: Xem thông tin kho, cấu hình routing
• **Orders**: Theo dõi đơn hàng, troubleshoot vấn đề
• **QC & Support**: Tra cứu policy, tạo dữ liệu test

⚠️ **Lưu ý**: Để tra cứu tồn kho, vui lòng sử dụng **Inventory Copilot** tại trang Inventory Summary.

Bạn cần hỗ trợ gì?`,
    actions: [
      { type: 'navigate', label: 'Mở Products', url: '/products' },
      { type: 'navigate', label: 'Mở Orders', url: '/orders' },
      { type: 'navigate', label: 'Mở Inventory Copilot', url: '/inventory/summary' },
    ],
  };
}

export function getHelpResponse(): TemplateResponse {
  return {
    content: `📚 **Tôi có thể giúp gì cho bạn?**

**1. Product Master AI**
- "Tạo sản phẩm mới cho NISSIN Raoh"
- "Chuẩn hóa attributes cho Amazon JP"
- "Generate listing content cho SKU XYZ"

**2. Listings**
- "Trạng thái listing của sản phẩm ABC"
- "Tại sao listing bị error?"
- "Sync listings với Amazon"

**3. Warehouses & Routing**
- "Xem routing config của Tokyo Warehouse"
- "Thay đổi priority ranking"
- "Tại sao không sửa được kho marketplace?"

**4. Orders**
- "Tại sao đơn hàng #123 bị stuck?"
- "Hướng dẫn cancel order"
- "Troubleshoot shipping delay"

**5. QC & Policy**
- "Giải thích quy trình đồng bộ kho"
- "Tạo test data cho QA"

⚠️ Tra cứu tồn kho → Dùng **Inventory Copilot** tại Inventory Summary.`,
    actions: [
      { type: 'navigate', label: 'Inventory Copilot', url: '/inventory/summary' },
    ],
  };
}

export function getDomainResponse(domain: CopilotDomain): TemplateResponse {
  switch (domain) {
    case 'product':
      return getProductDomainResponse();
    case 'listing':
      return getListingDomainResponse();
    case 'warehouse':
    case 'routing_config':
      return getWarehouseDomainResponse();
    case 'orders':
      return getOrdersDomainResponse();
    case 'qc_support':
      return getQcSupportResponse();
    case 'admin_integration':
      return getAdminIntegrationResponse();
    default:
      return getUnknownDomainResponse();
  }
}

function getProductDomainResponse(): TemplateResponse {
  return {
    content: `📦 **Product Master AI**

Tôi có thể hỗ trợ:
- **Xem sản phẩm**: Tra cứu thông tin product/SKU hiện có
- **Tạo sản phẩm mới**: Draft product master record
- **Generate content**: Tạo title, bullets, description cho platform
- **Validate attributes**: Kiểm tra thuộc tính theo schema platform

**Ví dụ câu hỏi:**
- "Show product ICHIRAN-RAMEN-SET-5"
- "Tạo listing content cho Amazon JP"
- "Validate attributes cho Shopee"

Bạn muốn làm gì?`,
    actions: [
      { type: 'navigate', label: 'Mở Products', url: '/products' },
      { type: 'navigate', label: 'Tạo Product mới', url: '/products/new' },
    ],
  };
}

function getListingDomainResponse(): TemplateResponse {
  return {
    content: `📋 **Listings Management**

Tôi có thể hỗ trợ:
- **Xem listings**: Tra cứu trạng thái listings trên các platform
- **Draft listing**: Tạo listing từ product/SKU
- **Diagnose errors**: Phân tích lỗi listing dựa trên validation rules
- **Sync status**: Kiểm tra trạng thái đồng bộ

**Trạng thái listing:**
- Draft → Pending → Active
- Error: có vấn đề cần fix

Bạn cần tra cứu listing nào?`,
    actions: [
      { type: 'navigate', label: 'Mở Listings', url: '/listings' },
    ],
  };
}

function getWarehouseDomainResponse(): TemplateResponse {
  return {
    content: `🏭 **Warehouses & Fulfillment Network**

Tôi có thể hỗ trợ:
- **Xem thông tin kho**: Profile, capabilities, constraints
- **Routing Config**: Xem và điều chỉnh cấu hình định tuyến
- **Ranking Rules**: Giải thích logic xếp hạng fulfillment

⚠️ **Lưu ý quan trọng:**
- Kho **Marketplace-managed** (virtual) là **read-only**
- Không thể sửa/xóa kho được đồng bộ từ Amazon FBA, Shopee Fulfillment, etc.

**Ví dụ:**
- "Xem routing config của Tokyo Warehouse"
- "Tại sao không edit được kho Amazon FBA?"
- "Thay đổi priority ranking cho sla_speed"

Bạn cần hỗ trợ gì về warehouse?`,
    actions: [
      { type: 'navigate', label: 'Mở Warehouses', url: '/inventory/warehouses' },
    ],
  };
}

function getOrdersDomainResponse(): TemplateResponse {
  return {
    content: `📬 **Orders Management**

Tôi có thể hỗ trợ:
- **Tra cứu đơn hàng**: Xem trạng thái, timeline, thông tin giao hàng
- **Troubleshoot**: Phân tích tại sao đơn bị stuck
- **Triage actions**: Hướng dẫn xử lý cancel, refund, re-ship

**Các trạng thái đơn hàng:**
- Pending → Processing → Shipped → Delivered
- Cancelled / Returned

**Ví dụ câu hỏi:**
- "Tại sao đơn #ABC123 bị stuck?"
- "Hướng dẫn cancel order"
- "Kiểm tra tracking number"

Bạn cần tra cứu đơn hàng nào?`,
    actions: [
      { type: 'navigate', label: 'Mở Orders', url: '/orders' },
    ],
  };
}

function getQcSupportResponse(): TemplateResponse {
  return {
    content: `🔍 **QC & Support**

Tôi có thể hỗ trợ:
- **Policy Q&A**: Tra cứu SOP, quy trình, chính sách
- **Test Data**: Tạo dữ liệu demo cho môi trường QA
- **Troubleshooting Guide**: Hướng dẫn xử lý các tình huống

**Ví dụ:**
- "Giải thích quy trình đồng bộ kho marketplace"
- "Tại sao không cho sửa kho virtual?"
- "Tạo test data cho inventory"

Bạn cần hỗ trợ gì?`,
    actions: [
      { type: 'navigate', label: 'Seed Demo Data', url: '/products' },
    ],
  };
}

function getAdminIntegrationResponse(): TemplateResponse {
  return {
    content: `🔌 **Admin & Integrations**

Tôi có thể hỗ trợ:
- **Connection Status**: Xem trạng thái kết nối các platform
- **Sync Status**: Kiểm tra lần sync cuối, errors
- **Troubleshoot**: Phân tích vấn đề đồng bộ

**Platforms được hỗ trợ:**
- Amazon JP / US
- Shopee (VN, MY, TH, etc.)
- Rakuten

**Lưu ý:**
- Credentials được quản lý bởi Admin
- Một số thay đổi cần permission owner_admin

Bạn cần kiểm tra connection nào?`,
    actions: [],
  };
}

function getUnknownDomainResponse(): TemplateResponse {
  return {
    content: `🤔 Tôi chưa hiểu rõ yêu cầu của bạn.

**Thử hỏi như:**
- "Tạo listing cho sản phẩm XYZ"
- "Tại sao đơn hàng #123 bị stuck?"
- "Xem routing config của Tokyo Warehouse"
- "Giải thích policy đồng bộ kho"

Hoặc chọn một module từ **Quick Actions** bên trên!

⚠️ Nếu bạn muốn **tra cứu tồn kho**, vui lòng dùng **Inventory Copilot** tại Inventory Summary.`,
    actions: [
      { type: 'navigate', label: 'Mở Inventory Copilot', url: '/inventory/summary' },
    ],
  };
}

// Quick prompts by domain
export const QUICK_PROMPTS = [
  { label: 'Hướng dẫn sử dụng', prompt: 'help' },
  { label: 'Tạo product mới', prompt: 'Tạo product mới' },
  { label: 'Xem listings', prompt: 'Xem listings' },
  { label: 'Tra cứu đơn hàng', prompt: 'Tra cứu đơn hàng' },
  { label: 'Routing config', prompt: 'Xem routing config' },
  { label: 'Policy kho virtual', prompt: 'Tại sao không sửa được kho marketplace?' },
];
