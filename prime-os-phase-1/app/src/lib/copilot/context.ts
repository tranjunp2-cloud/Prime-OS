import type {
  CopilotConfidenceBucket,
  CopilotContextSummary,
  CopilotDebugMeta,
  CopilotDomain,
  CopilotEntityRef,
  CopilotIntent,
  CopilotQuickPrompt,
  CopilotResponse,
  GlobalCopilotAction,
} from '@/components/copilot/types';
import { getFulfillmentJobs, getJobById } from '@/lib/fulfillment-store';
import type { Order } from '@/lib/oms-types';
import { getOrderById, getOrders } from '@/lib/order-store';
import { type Product, getProductById, getProducts } from '@/lib/product-store';
import { getReturnById, getReturns } from '@/lib/return-store';
import { type Warehouse, getWarehouses } from '@/lib/warehouse-store';
import { getListings } from '@/lib/listing-store';
import { getKnowledgeResponse } from '@/lib/copilot/knowledge';
import { buildResponseGrounding, readContextSnapshot } from '@/lib/copilot/context-gateway';
import { deterministicCopilotComposer } from '@/lib/copilot/response-composer';
import { prepareProductCreateDraftCommand } from '@/lib/copilot/command-gateway';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  ready_to_ship: 'Ready to Ship',
  shipping: 'Shipping',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const ORDER_STATUS_PROMPTS = [
  { label: 'Đơn pending', prompt: 'Cho mình danh sách order đang pending' },
  { label: 'Đang giao', prompt: 'Tóm tắt queue shipping hiện tại' },
  { label: 'Tạo product', prompt: 'Tạo product mới tên "Travel Organizer" brand "PrimeOS" sku PRIME-TRAVEL-ORG-01' },
  { label: 'Sang Inventory', prompt: 'Tại sao inventory copilot tách riêng?' },
];

const NAVIGATION_VERBS = [
  'mo',
  'mở',
  'open',
  'go to',
  'vao',
  'vào',
  'sang',
  'toi',
  'tới',
  'đi tới',
  'dua minh',
  'đưa mình',
  've',
  'về',
];

export interface CopilotConversationState {
  lastDomain?: CopilotDomain;
  lastIntent?: CopilotIntent;
  lastEntityRef?: CopilotEntityRef | null;
}

interface CandidateResponse {
  key: string;
  score: number;
  response: CopilotResponse;
}

function createDebugMeta(overrides: Partial<CopilotDebugMeta> & Pick<CopilotDebugMeta, 'selectedStrategy' | 'confidenceBucket'>): CopilotDebugMeta {
  return {
    promptedClarify: false,
    fellBack: false,
    usedConversationMemory: false,
    ...overrides,
  };
}

function scoreToConfidenceBucket(score: number): CopilotConfidenceBucket {
  if (score >= 92) {
    return 'high';
  }

  if (score >= 80) {
    return 'medium';
  }

  return 'low';
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function hasAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function formatCurrency(amount: number | null | undefined, currency = 'JPY') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'N/A';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatStatusCount(label: string, count: number) {
  return `${label}: ${count}`;
}

function buildActions(actions: GlobalCopilotAction[]) {
  return actions.map((action) => ({ emphasis: 'secondary', ...action }));
}

function finalizeCopilotResponse(response: CopilotResponse, context: CopilotContextSummary) {
  const snapshot = readContextSnapshot(context);
  const grounding = response.grounding ?? buildResponseGrounding(response, snapshot);

  return {
    ...response,
    citations: response.citations?.length ? response.citations : snapshot.citations,
    grounding,
    content: deterministicCopilotComposer.compose({ response, context }),
  };
}

function takePrompts(prompts: CopilotQuickPrompt[], count = 3) {
  return prompts.slice(0, count);
}

function wantsExplicitNavigation(normalized: string) {
  return hasAnyKeyword(normalized, NAVIGATION_VERBS);
}

function wantsListNavigation(normalized: string) {
  return hasAnyKeyword(normalized, ['danh sach', 'queue', 'list', 'xem nhanh', 'lọc', 'filter']);
}

function attachFollowUps(response: CopilotResponse, prompts: CopilotQuickPrompt[]) {
  if (response.followUpPrompts?.length) {
    return response;
  }

  return {
    ...response,
    followUpPrompts: takePrompts(prompts),
  };
}

function buildClarifyResponse(context: CopilotContextSummary, prompts?: CopilotQuickPrompt[]): CopilotResponse {
  const followUps = prompts?.length ? prompts : [
    { label: 'Giải thích trang', prompt: 'Trang này dùng để làm gì?' },
    ...takePrompts(context.quickPrompts, 2),
  ];

  return {
    domain: context.domain,
    intent: 'clarify',
    citations: ['Clarification flow: confidence below action threshold'],
    debug: createDebugMeta({
      selectedStrategy: 'clarify',
      confidenceBucket: 'low',
      promptedClarify: true,
    }),
    followUpPrompts: followUps,
    content: [
      'Mình hiểu được một phần, nhưng chưa đủ chắc để đoán thay bạn.',
      'Bạn muốn mình đi theo hướng nào hơn:',
      '- giải thích màn hình hoặc dữ liệu đang thấy',
      '- mở đúng module / queue',
      '- chuẩn bị một draft action an toàn',
    ].join('\n'),
  };
}

function buildCapabilitiesResponse(context: CopilotContextSummary): CopilotResponse {
  return {
    domain: 'saas',
    intent: 'read',
    citations: [
      'Capability model: contextual help -> entity lookup -> navigation -> safe draft',
      'Safety mode: read-first, draft-before-write',
    ],
    debug: createDebugMeta({
      selectedStrategy: 'capabilities',
      confidenceBucket: 'high',
    }),
    followUpPrompts: [
      { label: 'Trang này làm gì?', prompt: 'Trang này dùng để làm gì?' },
      ...takePrompts(context.quickPrompts, 2),
    ],
    content: [
      `Mình đang hỗ trợ trực tiếp trên **${context.title}** với 4 kiểu việc chính:`,
      '- giải thích màn hình, dữ liệu hoặc entity bạn đang mở',
      '- tìm nhanh order / product / warehouse liên quan',
      '- mở đúng module, queue hoặc filter phù hợp',
      '- chuẩn bị draft an toàn trước khi bạn xác nhận thao tác',
    ].join('\n'),
  };
}

function createProductsSummary(): CopilotContextSummary {
  const products = getProducts();
  const publishedCount = products.filter((item) => item.status === 'published').length;
  const draftCount = products.filter((item) => item.status === 'draft').length;

  return {
    domain: 'product',
    title: 'Products',
    description: 'Quản lý product master, SKU structure, pricing và channel readiness.',
    insight: `${products.length} products · ${publishedCount} published · ${draftCount} draft`,
    citations: ['Current route: /products', 'Source: product-store'],
    quickPrompts: [
      { label: 'Tóm tắt product', prompt: 'Tóm tắt product master hiện tại' },
      { label: 'Tạo mới', prompt: 'Tạo product mới tên "Compact Desk Lamp" brand "PrimeOS" sku PRIME-LAMP-001' },
      { label: 'Đang draft', prompt: 'Có bao nhiêu product đang ở draft?' },
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
    ],
  };
}

function createProductDetailSummary(productId: string): CopilotContextSummary {
  const product = getProductById(productId);

  if (!product) {
    return {
      domain: 'product',
      title: 'Product Detail',
      description: 'Không tìm thấy product từ route hiện tại.',
      citations: ['Current route: product detail'],
      quickPrompts: [
        { label: 'Về Products', prompt: 'Mở lại danh sách products' },
        { label: 'Tạo draft', prompt: 'Mở form tạo product mới' },
      ],
    };
  }

  return {
    domain: 'product',
    title: product.name,
    description: `${product.brand} · ${product.sku_code} · ${product.status}`,
    insight: `${product.channels.length} channels · ${product.skus.length} sku lines`,
    citations: [`Current entity: ${product.id}`, 'Source: product-store'],
    quickPrompts: [
      { label: 'Bán ở đâu?', prompt: 'Product này đang publish ở channel nào?' },
      { label: 'Tóm tắt SKU', prompt: 'Tóm tắt SKU của product này' },
      { label: 'Về Products', prompt: 'Mở lại danh sách products' },
      { label: 'Tạo tương tự', prompt: `Tạo product mới tên "${product.name}" brand "${product.brand}"` },
    ],
  };
}

function createOrdersSummary(): CopilotContextSummary {
  const orders = getOrders();
  const counts = {
    pending: orders.filter((item) => item.status === 'pending').length,
    readyToShip: orders.filter((item) => item.status === 'ready_to_ship').length,
    shipping: orders.filter((item) => item.status === 'shipping').length,
    completed: orders.filter((item) => item.status === 'completed').length,
  };

  return {
    domain: 'orders',
    title: 'Orders',
    description: 'Theo dõi intake, allocation, reservation, shipping và exception của order flow.',
    insight: [
      formatStatusCount('Pending', counts.pending),
      formatStatusCount('Ready', counts.readyToShip),
      formatStatusCount('Shipping', counts.shipping),
      formatStatusCount('Completed', counts.completed),
    ].join(' · '),
    citations: ['Current route: /orders', 'Source: order-store'],
    quickPrompts: ORDER_STATUS_PROMPTS,
  };
}

function createOrderDetailSummary(orderId: string): CopilotContextSummary {
  const order = getOrderById(orderId);

  if (!order) {
    return {
      domain: 'orders',
      title: 'Order Detail',
      description: 'Không tìm thấy order từ route hiện tại.',
      citations: ['Current route: order detail'],
      quickPrompts: ORDER_STATUS_PROMPTS,
    };
  }

  return {
    domain: 'orders',
    title: order.order_id,
    description: `${order.customer_name} · ${ORDER_STATUS_LABELS[order.status] ?? order.status}`,
    insight: `${formatCurrency(order.total_amount, order.currency)} · Lifecycle ${order.lifecycle_stage}`,
    citations: [`Current entity: ${order.id}`, 'Source: order-store'],
    quickPrompts: [
      { label: 'Đơn này ra sao?', prompt: 'Đơn này đang stuck ở đâu?' },
      { label: 'Kho xử lý', prompt: 'Order này đang allocate vào warehouse nào?' },
      { label: 'Về Orders', prompt: 'Mở lại danh sách orders' },
      { label: 'Đơn pending', prompt: 'Cho mình danh sách order đang pending' },
    ],
  };
}

function createWarehousesSummary(): CopilotContextSummary {
  const warehouses = getWarehouses();
  const activeCount = warehouses.filter((item) => item.status === 'active').length;
  const virtualCount = warehouses.filter((item) => item.is_virtual).length;
  const thirdPartyCount = warehouses.filter((item) => item.type === '3pl').length;

  return {
    domain: 'warehouse',
    title: 'Warehouses',
    description: 'Xem topology kho, capability, trạng thái sync và loại kho vận hành.',
    insight: `${warehouses.length} warehouses · ${activeCount} active · ${virtualCount} virtual · ${thirdPartyCount} 3PL`,
    citations: ['Current route: /warehouses', 'Source: warehouse-store'],
    quickPrompts: [
      { label: 'Tóm tắt kho', prompt: 'Tóm tắt network warehouse hiện tại' },
      { label: 'Kho virtual', prompt: 'Có bao nhiêu virtual warehouse?' },
      { label: 'Sang Inventory', prompt: 'Tại sao inventory copilot tách riêng?' },
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
    ],
  };
}

function createListingsSummary(): CopilotContextSummary {
  const listings = getListings();
  const amazonCount = listings.filter((item) => item.channel === 'amazon').length;
  const shopeeCount = listings.filter((item) => item.channel === 'shopee').length;
  const rakutenCount = listings.filter((item) => item.channel === 'rakuten').length;

  return {
    domain: 'listing',
    title: 'Listings',
    description: 'Điều phối channel listing state tách khỏi product master.',
    insight: `${listings.length} listings · Amazon ${amazonCount} · Shopee ${shopeeCount} · Rakuten ${rakutenCount}`,
    citations: ['Current route: /listings', 'Source: listing-store'],
    quickPrompts: [
      { label: 'Theo kênh', prompt: 'Tóm tắt listing theo channel hiện tại' },
      { label: 'Về Products', prompt: 'Mở lại product master' },
      { label: 'Listings để làm gì?', prompt: 'Channel layer trong PrimeOS dùng để làm gì?' },
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
    ],
  };
}

function createFulfillmentSummary(): CopilotContextSummary {
  const jobs = getFulfillmentJobs();
  const openCount = jobs.filter((item) => item.status !== 'done' && item.status !== 'cancelled').length;

  return {
    domain: 'fulfillment',
    title: 'Fulfillment',
    description: 'Theo dõi pick-pack-ship flow và partner execution.',
    insight: `${jobs.length} jobs · ${openCount} active jobs`,
    citations: ['Current route: /fulfillment', 'Source: fulfillment-store'],
    quickPrompts: [
      { label: 'Tóm tắt queue', prompt: 'Tóm tắt fulfillment queue hiện tại' },
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
      { label: 'Về Orders', prompt: 'Mở lại orders' },
      { label: 'Về Returns', prompt: 'Mở lại returns' },
    ],
  };
}

function createFulfillmentDetailSummary(jobId: string): CopilotContextSummary {
  const job = getJobById(jobId);

  if (!job) {
    return {
      domain: 'fulfillment',
      title: 'Fulfillment Detail',
      description: 'Không tìm thấy fulfillment job từ route hiện tại.',
      citations: ['Current route: fulfillment detail'],
      quickPrompts: [
        { label: 'Tóm tắt queue', prompt: 'Tóm tắt fulfillment queue hiện tại' },
        { label: 'Về Fulfillment', prompt: 'Mở lại fulfillment' },
      ],
    };
  }

  return {
    domain: 'fulfillment',
    title: job.job_code ?? job.id,
    description: `${job.status} · ${job.flow_type} · ${job.priority}`,
    insight: `${job.order?.customer_name ?? 'Unknown customer'} · ${job.warehouse?.code ?? 'No warehouse'}`,
    citations: [`Current entity: ${job.id}`, 'Source: fulfillment-store'],
    quickPrompts: [
      { label: 'Job này ra sao?', prompt: 'Job này đang ở bước nào?' },
      { label: 'Về queue', prompt: 'Mở lại fulfillment queue' },
      { label: 'Về Orders', prompt: 'Mở lại orders' },
    ],
  };
}

function createReturnsSummary(): CopilotContextSummary {
  const returns = getReturns();
  const qcCount = returns.filter((item) => item.status === 'qc').length;
  const completedCount = returns.filter((item) => item.status === 'completed').length;

  return {
    domain: 'returns',
    title: 'Returns',
    description: 'Quản lý return intake, QC, disposition và refund signals.',
    insight: `${returns.length} returns · ${qcCount} in QC · ${completedCount} completed`,
    citations: ['Current route: /returns', 'Source: return-store'],
    quickPrompts: [
      { label: 'Tóm tắt returns', prompt: 'Tóm tắt returns hiện tại' },
      { label: 'Đang QC', prompt: 'Bao nhiêu return đang ở bước QC?' },
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
      { label: 'Về Fulfillment', prompt: 'Mở lại fulfillment' },
    ],
  };
}

function createReturnDetailSummary(returnId: string): CopilotContextSummary {
  const item = getReturnById(returnId);

  if (!item) {
    return {
      domain: 'returns',
      title: 'Return Detail',
      description: 'Không tìm thấy return record từ route hiện tại.',
      citations: ['Current route: return detail'],
      quickPrompts: [
        { label: 'Tóm tắt returns', prompt: 'Tóm tắt returns hiện tại' },
        { label: 'Về Returns', prompt: 'Mở lại returns' },
      ],
    };
  }

  return {
    domain: 'returns',
    title: item.rma_number ?? item.id,
    description: `${item.status} · ${item.reason ?? 'No reason'} · ${formatCurrency(item.refund_amount)}`,
    insight: `QC ${item.qc_grade ?? '-'} · Disposition ${item.disposition ?? '-'}`,
    citations: [`Current entity: ${item.id}`, 'Source: return-store'],
    quickPrompts: [
      { label: 'Return này ra sao?', prompt: 'Return này đang ở bước nào?' },
      { label: 'Tóm tắt QC', prompt: 'Return này có QC outcome gì?' },
      { label: 'Về Returns', prompt: 'Mở lại returns' },
    ],
  };
}

function createInventorySummary(): CopilotContextSummary {
  return {
    domain: 'inventory',
    title: 'Inventory',
    description: 'Inventory-specific diagnostics vẫn nên đi qua copilot chuyên dụng.',
    insight: 'Global assistant sẽ redirect khi câu hỏi đi sâu vào ATS hoặc stock diagnostics.',
    citations: ['Current route: /inventory', 'Boundary: dedicated inventory copilot'],
    quickPrompts: [
      { label: 'Vì sao tách riêng?', prompt: 'Tại sao inventory copilot tách riêng?' },
      { label: 'Về Warehouses', prompt: 'Mở lại warehouses' },
      { label: 'Về Orders', prompt: 'Mở lại orders' },
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
    ],
  };
}

function createSettingsSummary(): CopilotContextSummary {
  return {
    domain: 'settings',
    title: 'Settings',
    description: 'Điểm cấu hình app, policy, routing và preferences.',
    citations: ['Current route: /settings'],
    quickPrompts: [
      { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
      { label: 'Bạn xử lý sao?', prompt: 'Assistant đang chạy safety model nào?' },
      { label: 'Về Orders', prompt: 'Mở lại orders' },
      { label: 'Về Products', prompt: 'Mở lại products' },
    ],
  };
}

export function normalizeCopilotInput(value: string) {
  return normalizeText(value);
}

export function resolveCopilotContext(pathname: string): CopilotContextSummary {
  if (pathname === '/products/new') {
    return {
      domain: 'product',
      title: 'Create Product',
      description: 'Tạo product draft mới, prefill low-risk fields và review trước khi submit.',
      insight: 'Assistant có thể chuẩn bị query-prefill cho form create này.',
      citations: ['Current route: /products/new'],
      quickPrompts: [
        { label: 'Tạo product', prompt: 'Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001' },
        { label: 'Trang này', prompt: 'Trang này dùng để làm gì?' },
        { label: 'Về Products', prompt: 'Mở lại products' },
        { label: 'Bạn xử lý sao?', prompt: 'Assistant đang chạy safety model nào?' },
      ],
    };
  }

  if (pathname.startsWith('/products/')) {
    return createProductDetailSummary(pathname.split('/')[2] ?? '');
  }

  if (pathname === '/products') {
    return createProductsSummary();
  }

  if (pathname.startsWith('/orders/')) {
    return createOrderDetailSummary(pathname.split('/')[2] ?? '');
  }

  if (pathname === '/orders') {
    return createOrdersSummary();
  }

  if (pathname === '/warehouses') {
    return createWarehousesSummary();
  }

  if (pathname === '/listings') {
    return createListingsSummary();
  }

  if (pathname.startsWith('/fulfillment/')) {
    return createFulfillmentDetailSummary(pathname.split('/')[2] ?? '');
  }

  if (pathname === '/fulfillment') {
    return createFulfillmentSummary();
  }

  if (pathname.startsWith('/returns/')) {
    return createReturnDetailSummary(pathname.split('/')[2] ?? '');
  }

  if (pathname === '/returns') {
    return createReturnsSummary();
  }

  if (pathname === '/inventory') {
    return createInventorySummary();
  }

  if (pathname === '/settings' || pathname === '/sla-policies' || pathname === '/routing-plans') {
    return createSettingsSummary();
  }

  return {
    domain: 'dashboard',
    title: 'Seller Growth',
    description: 'Tư vấn nhóm khách hàng, sản phẩm, KOL/livestream và kênh tiếp thị phù hợp để tăng bán hàng.',
    insight: 'Prime AI có thể gợi ý khách hàng mục tiêu, thông điệp, kênh triển khai và next best campaign.',
    citations: ['Current route: dashboard'],
    quickPrompts: [
      { label: 'Tìm khách phù hợp', prompt: 'Nhóm khách hàng nào phù hợp nhất với sản phẩm của seller hiện tại?' },
      { label: 'Gợi ý chiến dịch', prompt: 'Hãy gợi ý chiến dịch tiếp thị tốt nhất để seller tăng bán hàng.' },
      { label: 'Kênh nên chạy', prompt: 'Nên triển khai qua các kênh nào để bán tốt hơn?' },
      { label: 'KOL / livestream', prompt: 'Nếu dùng KOL hoặc livestream thì nên đi theo hướng nào để kích cầu?' },
    ],
  };
}

function buildRouteOverview(context: CopilotContextSummary): CopilotResponse {
  return {
    domain: context.domain,
    intent: 'read',
    citations: context.citations,
    actions: buildActions(
      takePrompts(context.quickPrompts, 2).map((prompt) => ({
        type: 'copy',
        label: prompt.label,
        description: 'Copy prompt để hỏi tiếp',
        value: prompt.prompt,
      })),
    ),
    followUpPrompts: takePrompts(context.quickPrompts),
    content: [
      `Đây là màn hình **${context.title}**.`,
      context.description,
      context.insight ? `Snapshot nhanh: ${context.insight}` : null,
    ].filter(Boolean).join('\n'),
  };
}

function summarizeOrder(order: Order): CopilotResponse {
  const actionUrl = `/orders/${order.id}`;

  return {
    domain: 'orders',
    intent: 'read',
    citations: [`Matched order: ${order.order_id}`, 'Source: order-store'],
    entityRef: {
      entityType: 'order',
      entityId: order.id,
      label: order.order_id,
    },
    followUpPrompts: [
      { label: 'Đơn này stuck?', prompt: 'Đơn này đang stuck ở đâu?' },
      { label: 'Kho xử lý', prompt: 'Đơn này đang allocate vào warehouse nào?' },
      { label: 'Mở Orders', prompt: 'Mở lại orders' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở order detail',
        description: 'Đi thẳng tới order này',
        url: actionUrl,
        emphasis: 'primary',
      },
      {
        type: 'navigate',
        label: 'Mở Orders',
        description: 'Quay lại toàn bộ orders',
        url: '/orders',
      },
    ],
    content: [
      `Mình tìm thấy order **${order.order_id}**.`,
      `- Customer: ${order.customer_name}`,
      `- Status: ${ORDER_STATUS_LABELS[order.status] ?? order.status}`,
      `- Lifecycle: ${order.lifecycle_stage}`,
      `- Total: ${formatCurrency(order.total_amount, order.currency)}`,
      `- Warehouse: ${order.allocated_warehouse?.code ?? order.warehouse_id ?? 'Chưa allocate'}`,
    ].join('\n'),
  };
}

function summarizeProduct(product: Product): CopilotResponse {
  return {
    domain: 'product',
    intent: 'read',
    citations: [`Matched product: ${product.id}`, 'Source: product-store'],
    entityRef: {
      entityType: 'product',
      entityId: product.id,
      label: product.name,
    },
    followUpPrompts: [
      { label: 'SKU của product', prompt: 'Tóm tắt SKU của product này' },
      { label: 'Publish ở đâu?', prompt: 'Product này đang publish ở channel nào?' },
      { label: 'Về Products', prompt: 'Mở lại danh sách products' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở product detail',
        description: 'Đi thẳng tới product này',
        url: `/products/${product.id}`,
        emphasis: 'primary',
      },
      {
        type: 'copy',
        label: 'Copy SKU',
        description: 'Copy parent SKU để dán sang flow khác',
        value: product.sku_code,
      },
    ],
    content: [
      `Mình tìm thấy product **${product.name}**.`,
      `- SKU: ${product.sku_code}`,
      `- Brand: ${product.brand}`,
      `- Status: ${product.status}`,
      `- Channels: ${product.channels.map((item) => item.channel).join(', ') || 'Chưa có'}`,
      `- Base retail: ${formatCurrency(product.retail_price, product.price_currency)}`,
    ].join('\n'),
  };
}

function findOrderFromMessage(message: string) {
  const exactRef = message.match(/(?:ech|prime)-[a-z]{2,4}-\d{4}/i)?.[0];

  if (exactRef) {
    return getOrders().find((order) => order.order_id.toLowerCase() === exactRef.toLowerCase());
  }

  return undefined;
}

function findProductFromMessage(message: string) {
  const normalized = normalizeText(message);

  return getProducts().find((product) => {
    const productText = normalizeText(`${product.name} ${product.sku_code} ${product.brand}`);
    return productText.includes(normalized) || normalized.includes(normalizeText(product.sku_code));
  });
}

function findWarehouseFromMessage(message: string) {
  const normalized = normalizeText(message);

  return getWarehouses().find((warehouse) => {
    const warehouseText = normalizeText(`${warehouse.name} ${warehouse.code} ${warehouse.country}`);
    return warehouseText.includes(normalized) || normalized.includes(normalizeText(warehouse.code));
  });
}

export function resolveEntityLookupResponse(message: string): CopilotResponse | null {
  const matchedOrder = findOrderFromMessage(message);
  if (matchedOrder) {
    return summarizeOrder(matchedOrder);
  }

  if (message.trim().length >= 6) {
    const matchedProduct = findProductFromMessage(message);
    if (matchedProduct) {
      return summarizeProduct(matchedProduct);
    }

    const matchedWarehouse = findWarehouseFromMessage(message);
    if (matchedWarehouse) {
      return buildWarehouseDetailAnswer(matchedWarehouse);
    }
  }

  return null;
}

function resolveConversationEntityResponse(
  message: string,
  conversationState: CopilotConversationState | undefined,
): CopilotResponse | null {
  const normalized = normalizeText(message);
  const entityRef = conversationState?.lastEntityRef;

  if (!entityRef) {
    return null;
  }

  const hasCarrySignal = hasAnyKeyword(normalized, [
    'don nay',
    'order nay',
    'product nay',
    'san pham nay',
    'warehouse nay',
    'kho nay',
    'job nay',
    'return nay',
    'cai nay',
    'cai do',
  ]);

  if (!hasCarrySignal) {
    return null;
  }

  switch (entityRef.entityType) {
    case 'order': {
      const order = getOrderById(entityRef.entityId);
      return order ? buildOrderDetailAnswer(order) : null;
    }
    case 'product': {
      const product = getProductById(entityRef.entityId);
      return product ? buildProductDetailAnswer(product) : null;
    }
    case 'warehouse': {
      const warehouse = getWarehouses().find((item) => item.id === entityRef.entityId);
      return warehouse ? buildWarehouseDetailAnswer(warehouse) : null;
    }
    case 'fulfillment_job': {
      const job = getJobById(entityRef.entityId);
      if (!job) return null;

      return attachFollowUps({
        domain: 'fulfillment',
        intent: 'read',
        citations: [`Conversation entity: ${job.id}`, 'Source: fulfillment-store'],
        entityRef,
        content: [
          `Job **${job.job_code ?? job.id}** hiện đang ở đây:`,
          `- Status: ${job.status}`,
          `- Flow: ${job.flow_type}`,
          `- Priority: ${job.priority}`,
          `- Warehouse: ${job.warehouse?.code ?? 'Chưa có'}`,
        ].join('\n'),
      }, [
        { label: 'Job này ra sao?', prompt: 'Job này đang ở bước nào?' },
        { label: 'Về Fulfillment', prompt: 'Mở lại fulfillment' },
      ]);
    }
    case 'return': {
      const item = getReturnById(entityRef.entityId);
      if (!item) return null;

      return attachFollowUps({
        domain: 'returns',
        intent: 'read',
        citations: [`Conversation entity: ${item.id}`, 'Source: return-store'],
        entityRef,
        content: [
          `Return **${item.rma_number ?? item.id}** hiện có trạng thái này:`,
          `- Status: ${item.status}`,
          `- QC Grade: ${item.qc_grade ?? 'N/A'}`,
          `- Disposition: ${item.disposition ?? 'N/A'}`,
          `- Refund: ${formatCurrency(item.refund_amount)}`,
        ].join('\n'),
      }, [
        { label: 'Return này ra sao?', prompt: 'Return này đang ở bước nào?' },
        { label: 'Về Returns', prompt: 'Mở lại returns' },
      ]);
    }
    default:
      return null;
  }
}

export function resolveNavigationResponse(message: string): CopilotResponse | null {
  const normalized = normalizeText(message);
  const explicitNavigation = wantsExplicitNavigation(normalized);
  const listNavigation = wantsListNavigation(normalized);

  if (hasAnyKeyword(normalized, ['inventory', 'ton kho', 'ats']) && (explicitNavigation || listNavigation)) {
    return {
      domain: 'inventory_module_2',
      intent: 'navigate',
      citations: ['Inventory-specific help routes to dedicated inventory workflow'],
      followUpPrompts: [
        { label: 'Mở Inventory', prompt: 'Mở inventory' },
        { label: 'Mở Warehouses', prompt: 'Mở warehouses' },
        { label: 'Vì sao tách riêng?', prompt: 'Tại sao inventory copilot tách riêng?' },
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Mở Inventory',
          description: 'Đi tới workspace tồn kho',
          url: '/inventory',
          emphasis: 'primary',
        },
        {
          type: 'navigate',
          label: 'Mở Warehouses',
          description: 'Xem topology kho',
          url: '/warehouses',
        },
      ],
      content:
        'Nếu bạn đang hỏi về ATS, tồn kho khả dụng, reservation hay warehouse availability thì mình khuyên mở thẳng Inventory module để có đúng context chuyên sâu.',
    };
  }

  const orderStatusMap: Array<{ keywords: string[]; status: string; label: string }> = [
    { keywords: ['pending'], status: 'pending', label: 'Pending Orders' },
    { keywords: ['ready to ship', 'ready', 'san sang giao'], status: 'ready_to_ship', label: 'Ready to Ship' },
    { keywords: ['shipping', 'dang giao'], status: 'shipping', label: 'Shipping Orders' },
    { keywords: ['completed', 'hoan thanh'], status: 'completed', label: 'Completed Orders' },
    { keywords: ['cancelled', 'huy'], status: 'cancelled', label: 'Cancelled Orders' },
    { keywords: ['returned', 'tra hang'], status: 'returned', label: 'Returned Orders' },
  ];

  if (hasAnyKeyword(normalized, ['order', 'don hang', 'orders']) && (explicitNavigation || listNavigation || hasAnyKeyword(normalized, ['pending', 'shipping', 'ready', 'completed', 'cancelled', 'returned']))) {
    const matchedStatus = orderStatusMap.find((item) => hasAnyKeyword(normalized, item.keywords));
    if (matchedStatus) {
      return {
        domain: 'orders',
        intent: 'navigate',
        citations: ['Orders page supports q + status URL filters'],
        followUpPrompts: [
          { label: 'Pending Orders', prompt: 'Cho mình danh sách order đang pending' },
          { label: 'Shipping Orders', prompt: 'Mở order đang shipping' },
          { label: 'Trang Orders', prompt: 'Trang này dùng để làm gì?' },
        ],
        actions: [
          {
            type: 'navigate',
            label: `Mở ${matchedStatus.label}`,
            description: 'Đi tới danh sách đã filter sẵn',
            url: `/orders?status=${matchedStatus.status}`,
            emphasis: 'primary',
          },
        ],
        content: `Mình có thể đưa bạn thẳng tới danh sách orders đã lọc theo trạng thái **${matchedStatus.label}**.`,
      };
    }

    return {
      domain: 'orders',
      intent: 'navigate',
      citations: ['Navigation helper'],
      followUpPrompts: ORDER_STATUS_PROMPTS.slice(0, 3),
      actions: [
        {
          type: 'navigate',
          label: 'Mở Orders',
          description: 'Đi tới OMS index',
          url: '/orders',
          emphasis: 'primary',
        },
      ],
      content: 'Mình sẽ mở lại workspace Orders để bạn thao tác nhanh hơn.',
    };
  }

  const routeMatchers: Array<{ keywords: string[]; domain: CopilotDomain; label: string; url: string }> = [
    { keywords: ['product', 'san pham', 'products'], domain: 'product', label: 'Products', url: '/products' },
    { keywords: ['listing', 'listings'], domain: 'listing', label: 'Listings', url: '/listings' },
    { keywords: ['warehouse', 'kho', 'warehouses'], domain: 'warehouse', label: 'Warehouses', url: '/warehouses' },
    { keywords: ['fulfillment', 'giao hang'], domain: 'fulfillment', label: 'Fulfillment', url: '/fulfillment' },
    { keywords: ['return', 'doi tra', 'returns'], domain: 'returns', label: 'Returns', url: '/returns' },
    { keywords: ['setting', 'cai dat', 'settings'], domain: 'settings', label: 'Settings', url: '/settings' },
  ];

  const routeMatch = routeMatchers.find((item) => hasAnyKeyword(normalized, item.keywords));
  if (!routeMatch || (!explicitNavigation && !listNavigation && normalized !== routeMatch.label.toLowerCase())) {
    return null;
  }

  return {
    domain: routeMatch.domain,
    intent: 'navigate',
    citations: ['Navigation helper'],
    followUpPrompts: [
      { label: `Mở ${routeMatch.label}`, prompt: `Mở ${routeMatch.label}` },
      { label: 'Giải thích trang', prompt: 'Trang này dùng để làm gì?' },
    ],
    actions: [
      {
        type: 'navigate',
        label: `Mở ${routeMatch.label}`,
        description: 'Đi tới đúng module tương ứng',
        url: routeMatch.url,
        emphasis: 'primary',
      },
    ],
    content: `Mình có thể mở nhanh module **${routeMatch.label}** cho bạn.`,
  };
}

function slugToSku(title: string) {
  const tokens = title
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((token) => token.toUpperCase());

  return `PRIME-${tokens.join('-') || 'DRAFT'}`;
}

function extractField(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
}

export function resolveProductDraftResponse(message: string): CopilotResponse | null {
  const normalized = normalizeText(message);
  const wantsDraft = hasAnyKeyword(normalized, [
    'tao product',
    'tao san pham',
    'product moi',
    'create product',
    'new product',
    'draft product',
  ]);

  if (!wantsDraft) {
    return null;
  }

  const title = extractField(message, [
    /(?:ten|title|name)\s*[:=]?\s*["“]?([^"\n,]+)["”]?/i,
  ]);
  const brand = extractField(message, [
    /(?:brand|thuong hieu)\s*[:=]?\s*["“]?([^"\n,]+)["”]?/i,
  ]);
  const sku = extractField(message, [
    /(?:sku)\s*[:=]?\s*([A-Z0-9-_]+)/i,
  ]);
  const asin = extractField(message, [
    /(?:asin)\s*[:=]?\s*([A-Z0-9]+)/i,
  ]);
  const family = extractField(message, [
    /(?:family|category|danh muc)\s*[:=]?\s*["“]?([^"\n,]+)["”]?/i,
  ]);
  const msrp = extractField(message, [
    /(?:msrp|gia|price)\s*[:=]?\s*([0-9][0-9.,]*)/i,
  ]).replace(/,/g, '');

  if (!title && !sku && !brand) {
    return {
      domain: 'product',
      intent: 'write_draft',
      citations: ['Product create page supports URL-based prefill'],
      followUpPrompts: [
        { label: 'Mở form create', prompt: 'Mở form tạo product mới' },
        { label: 'Ví dụ tạo product', prompt: 'Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001' },
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Mở form tạo product',
          description: 'Mở form trống để nhập tay',
          url: '/products/new',
          emphasis: 'primary',
        },
      ],
      content:
        'Mình có thể chuẩn bị draft product cho bạn. Nếu muốn prefill mạnh hơn, hãy cho mình ít nhất `title`, `brand` hoặc `sku`; còn nếu chưa có thì mình mở form create trống ngay cũng được.',
    };
  }

  const resolvedSku = sku || slugToSku(title || brand || 'Draft Product');
  const draftPayload: Record<string, string> = { sku: resolvedSku };

  if (title) draftPayload.title = title;
  if (brand) draftPayload.brand = brand;
  if (asin) draftPayload.asin = asin;
  if (family) draftPayload.family = family;
  if (msrp) draftPayload.msrp = msrp;

  const preparedCommand = prepareProductCreateDraftCommand(draftPayload);

  return {
    domain: 'product',
    intent: 'write_draft',
    citations: [
      'Draft action is safe: prefill only, no silent save',
      'Target flow: /products/new query-prefill',
    ],
    followUpPrompts: [
      { label: 'Mở draft product', prompt: `Tạo product mới tên "${title || 'Compact Lamp'}" brand "${brand || 'PrimeOS'}" sku ${resolvedSku}` },
      { label: 'Về Products', prompt: 'Mở lại products' },
    ],
    actions: [
      preparedCommand.confirmAction,
      preparedCommand.cancelAction,
      {
        type: 'copy',
        label: 'Copy SKU',
        description: 'Copy SKU để dùng tiếp ở luồng khác',
        value: resolvedSku,
      },
    ],
    content: [
      'Mình đã chuẩn bị một **product draft** an toàn để bạn review trong form create.',
      `- Title: ${title || 'Chưa set'}`,
      `- Brand: ${brand || 'Chưa set'}`,
      `- SKU: ${resolvedSku}`,
      asin ? `- ASIN: ${asin}` : null,
      family ? `- Category: ${family}` : null,
      msrp ? `- MSRP: ${msrp}` : null,
      '',
      `Command prepared: ${preparedCommand.request.commandName} · risk ${preparedCommand.request.risk}.`,
      'Assistant mới chỉ prefill low-risk fields; chưa có dữ liệu nào được save hay publish cho tới khi bạn xác nhận trong form.',
    ].filter(Boolean).join('\n'),
  };
}

function summarizeWarehouseNetwork() {
  const warehouses = getWarehouses();
  const typeCounts = warehouses.reduce<Record<string, number>>((accumulator, warehouse) => {
    accumulator[warehouse.type] = (accumulator[warehouse.type] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    domain: 'warehouse' as const,
    intent: 'read' as const,
    citations: ['Source: warehouse-store'],
    followUpPrompts: [
      { label: 'Kho virtual', prompt: 'Có bao nhiêu virtual warehouse?' },
      { label: 'Mở Warehouses', prompt: 'Mở lại warehouses' },
      { label: 'Sang Inventory', prompt: 'Tại sao inventory copilot tách riêng?' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở Warehouses',
        description: 'Đi tới warehouse index',
        url: '/warehouses',
        emphasis: 'primary',
      },
    ],
    content: [
      'Đây là snapshot warehouse network hiện tại:',
      `- Total: ${warehouses.length}`,
      `- Active: ${warehouses.filter((item) => item.status === 'active').length}`,
      `- Virtual: ${warehouses.filter((item) => item.is_virtual).length}`,
      ...Object.entries(typeCounts).map(([type, count]) => `- ${type}: ${count}`),
    ].join('\n'),
  };
}

function summarizeOrdersIndex() {
  const orders = getOrders();
  const counts = Object.keys(ORDER_STATUS_LABELS).map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));

  return {
    domain: 'orders' as const,
    intent: 'read' as const,
    citations: ['Source: order-store'],
    followUpPrompts: ORDER_STATUS_PROMPTS.slice(0, 3),
    actions: [
      {
        type: 'navigate',
        label: 'Mở Pending Orders',
        description: 'Đi tới queue pending',
        url: '/orders?status=pending',
        emphasis: 'primary',
      },
      {
        type: 'navigate',
        label: 'Mở Shipping Orders',
        description: 'Đi tới queue shipping',
        url: '/orders?status=shipping',
      },
    ],
    content: [
      'Snapshot orders hiện tại:',
      ...counts.map((item) => `- ${ORDER_STATUS_LABELS[item.status]}: ${item.count}`),
    ].join('\n'),
  };
}

function summarizeProductsIndex() {
  const products = getProducts();
  const draftCount = products.filter((item) => item.status === 'draft').length;
  const publishedCount = products.filter((item) => item.status === 'published').length;
  const multiChannelCount = products.filter((item) => item.channels.length > 1).length;

  return {
    domain: 'product' as const,
    intent: 'read' as const,
    citations: ['Source: product-store'],
    followUpPrompts: [
      { label: 'Tạo product', prompt: 'Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001' },
      { label: 'Đang draft', prompt: 'Có bao nhiêu product đang ở draft?' },
      { label: 'Mở Products', prompt: 'Mở lại products' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở Product Master',
        description: 'Đi tới products index',
        url: '/products',
        emphasis: 'primary',
      },
      {
        type: 'navigate',
        label: 'Tạo Product Mới',
        description: 'Mở form create product',
        url: '/products/new',
      },
    ],
    content: [
      'Snapshot product master:',
      `- Total products: ${products.length}`,
      `- Published: ${publishedCount}`,
      `- Draft: ${draftCount}`,
      `- Multi-channel products: ${multiChannelCount}`,
    ].join('\n'),
  };
}

function summarizeListingsIndex() {
  const listings = getListings();
  const byChannel = ['amazon', 'shopee', 'rakuten', 'website', 'tiktok']
    .map((channel) => ({ channel, count: listings.filter((item) => item.channel === channel).length }))
    .filter((item) => item.count > 0);

  return {
    domain: 'listing' as const,
    intent: 'read' as const,
    citations: ['Source: listing-store'],
    followUpPrompts: [
      { label: 'Theo kênh', prompt: 'Tóm tắt listing theo channel hiện tại' },
      { label: 'Mở Listings', prompt: 'Mở lại listings' },
      { label: 'Về Products', prompt: 'Mở lại product master' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở Listings',
        description: 'Đi tới channel listings',
        url: '/listings',
        emphasis: 'primary',
      },
    ],
    content: [
      'Snapshot listing layer:',
      `- Total listings: ${listings.length}`,
      ...byChannel.map((item) => `- ${item.channel}: ${item.count}`),
    ].join('\n'),
  };
}

function summarizeFulfillmentIndex() {
  const jobs = getFulfillmentJobs();

  return {
    domain: 'fulfillment' as const,
    intent: 'read' as const,
    citations: ['Source: fulfillment-store'],
    followUpPrompts: [
      { label: 'Tóm tắt queue', prompt: 'Tóm tắt fulfillment queue hiện tại' },
      { label: 'Mở Fulfillment', prompt: 'Mở lại fulfillment' },
      { label: 'Về Orders', prompt: 'Mở lại orders' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở Fulfillment',
        description: 'Đi tới fulfillment queue',
        url: '/fulfillment',
        emphasis: 'primary',
      },
    ],
    content: [
      'Snapshot fulfillment queue:',
      `- Total jobs: ${jobs.length}`,
      `- Active jobs: ${jobs.filter((item) => item.status !== 'done' && item.status !== 'cancelled').length}`,
      `- Done jobs: ${jobs.filter((item) => item.status === 'done').length}`,
    ].join('\n'),
  };
}

function summarizeReturnsIndex() {
  const returns = getReturns();

  return {
    domain: 'returns' as const,
    intent: 'read' as const,
    citations: ['Source: return-store'],
    followUpPrompts: [
      { label: 'Đang QC', prompt: 'Bao nhiêu return đang ở bước QC?' },
      { label: 'Mở Returns', prompt: 'Mở lại returns' },
      { label: 'Về Fulfillment', prompt: 'Mở lại fulfillment' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở Returns',
        description: 'Đi tới returns queue',
        url: '/returns',
        emphasis: 'primary',
      },
    ],
    content: [
      'Snapshot returns queue:',
      `- Total returns: ${returns.length}`,
      `- In QC: ${returns.filter((item) => item.status === 'qc').length}`,
      `- Completed: ${returns.filter((item) => item.status === 'completed').length}`,
    ].join('\n'),
  };
}

function buildOrderDetailAnswer(order: Order) {
  return {
    domain: 'orders' as const,
    intent: 'read' as const,
    citations: [`Current entity: ${order.id}`, 'Source: order-store'],
    entityRef: {
      entityType: 'order' as const,
      entityId: order.id,
      label: order.order_id,
    },
    followUpPrompts: [
      { label: 'Kho xử lý', prompt: 'Order này đang allocate vào warehouse nào?' },
      { label: 'Đơn stuck ở đâu?', prompt: 'Đơn này đang stuck ở đâu?' },
      { label: 'Về Orders', prompt: 'Mở lại danh sách orders' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở lại Orders',
        description: 'Quay về danh sách orders',
        url: '/orders',
      },
    ],
    content: [
      `Đơn **${order.order_id}** hiện đang ở đây:`,
      `- Status: ${ORDER_STATUS_LABELS[order.status] ?? order.status}`,
      `- Lifecycle: ${order.lifecycle_stage}`,
      `- Customer: ${order.customer_name}`,
      `- Total: ${formatCurrency(order.total_amount, order.currency)}`,
      `- Warehouse: ${order.allocated_warehouse?.name ?? order.warehouse_id ?? 'Chưa allocate'}`,
    ].join('\n'),
  };
}

function buildProductDetailAnswer(product: Product) {
  return {
    domain: 'product' as const,
    intent: 'read' as const,
    citations: [`Current entity: ${product.id}`, 'Source: product-store'],
    entityRef: {
      entityType: 'product' as const,
      entityId: product.id,
      label: product.name,
    },
    followUpPrompts: [
      { label: 'SKU của product', prompt: 'Tóm tắt SKU của product này' },
      { label: 'Publish ở đâu?', prompt: 'Product này đang publish ở channel nào?' },
      { label: 'Về Products', prompt: 'Mở lại danh sách products' },
    ],
    actions: [
      {
        type: 'copy',
        label: 'Copy SKU',
        description: 'Copy parent SKU',
        value: product.sku_code,
      },
      {
        type: 'navigate',
        label: 'Mở lại Products',
        description: 'Quay về product master',
        url: '/products',
      },
    ],
    content: [
      `Product **${product.name}** đang có snapshot này:`,
      `- Parent SKU: ${product.sku_code}`,
      `- Brand: ${product.brand}`,
      `- Status: ${product.status}`,
      `- Channels: ${product.channels.map((item) => item.channel).join(', ') || 'Chưa có'}`,
      `- Variants/SKUs: ${product.skus.length}`,
      `- Retail price: ${formatCurrency(product.retail_price, product.price_currency)}`,
    ].join('\n'),
  };
}

function buildWarehouseDetailAnswer(warehouse: Warehouse) {
  return {
    domain: 'warehouse' as const,
    intent: 'read' as const,
    citations: [`Current entity: ${warehouse.id}`, 'Source: warehouse-store'],
    entityRef: {
      entityType: 'warehouse' as const,
      entityId: warehouse.id,
      label: warehouse.code,
    },
    followUpPrompts: [
      { label: 'Capability kho', prompt: 'Kho này có capability gì?' },
      { label: 'Về Warehouses', prompt: 'Mở lại warehouses' },
      { label: 'Sang Inventory', prompt: 'Tại sao inventory copilot tách riêng?' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Mở lại Warehouses',
        description: 'Quay về warehouse list',
        url: '/warehouses',
      },
    ],
    content: [
      `Warehouse **${warehouse.code}**:`,
      `- Name: ${warehouse.name}`,
      `- Country: ${warehouse.country}`,
      `- Type: ${warehouse.type}`,
      `- Virtual: ${warehouse.is_virtual ? 'Yes' : 'No'}`,
      `- Status: ${warehouse.status}`,
      `- Capabilities: ${warehouse.capabilities.join(', ') || 'None'}`,
    ].join('\n'),
  };
}

function buildSellerGrowthAudienceResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock intelligence layer: persona fit from social, CRM, and campaign signals'],
    followUpPrompts: [
      { label: 'Gợi ý chiến dịch', prompt: 'Hãy gợi ý chiến dịch tiếp thị tốt nhất để seller tăng bán hàng.' },
      { label: 'Kênh nên chạy', prompt: 'Nên triển khai qua các kênh nào để bán tốt hơn?' },
      { label: 'KOL / livestream', prompt: 'Nếu dùng KOL hoặc livestream thì nên đi theo hướng nào để kích cầu?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy audience brief', description: 'Dùng brief này cho seller team', value: 'Segment A: Creator commerce buyers 24-32 / Segment B: Repeat refill buyers 28-40 / Segment C: B2B office replenishment managers 30-45' },
      { type: 'copy', label: 'Copy key message', description: 'Dùng làm định hướng thông điệp', value: 'Bundle convenience, refill value, trust proof, MOQ clarity, service follow-up' },
    ]),
    content: [
      'Prime AI đang ưu tiên 3 nhóm khách hàng cho seller này.',
      '',
      '**1. Creator Commerce Buyers**',
      '- Hồ sơ: 24-32 tuổi, mua theo cảm hứng nhưng cần trust signal mạnh.',
      '- Nơi xuất hiện: TikTok livestream, creator clip, social save/share.',
      '- Trigger mua hàng: xem demo nhanh, thấy bundle tiện hơn mua lẻ, có creator proof rõ.',
      '- KPI mock: CTR 2.8%, add-to-cart rate 9.4%, conversion window 24-48h.',
      '',
      '**2. Repeat / Refill Buyers**',
      '- Hồ sơ: đã từng mua hoặc từng tương tác nhiều lần với cùng nhóm sản phẩm.',
      '- Nơi xuất hiện: email reopen, chat follow-up, revisit vào refill/bundle pages.',
      '- Trigger mua hàng: nhắc đúng thời điểm, lợi ích tiết kiệm, combo/refill rõ ràng.',
      '- KPI mock: reopen rate 31%, repeat conversion 12.6%, CAC thấp hơn broad audience 27%.',
      '',
      '**3. B2B Replenishment Accounts**',
      '- Hồ sơ: buyer doanh nghiệp, office/admin procurement hoặc đối tác mua định kỳ.',
      '- Nơi xuất hiện: quote-page dwell, RFQ intent, LinkedIn matched audience, sales chat.',
      '- Trigger mua hàng: MOQ rõ, giá trị gói mua số lượng, SLA và fulfillment đáng tin.',
      '- KPI mock: RFQ submit rate 8.7%, quote-to-order 21%, AOV cao gấp 3.2x nhóm retail.',
      '',
      'Tín hiệu mạnh nhất hiện tại đang đến từ livestream comments, save/share trên creator content, revisit vào refill pages, và các phiên quote intent lặp lại.',
    ].join('\n'),
  };
}

function buildSellerGrowthCampaignResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock campaign planning: social demand + CRM segment + conversion path'],
    followUpPrompts: [
      { label: 'Tìm khách phù hợp', prompt: 'Nhóm khách hàng nào phù hợp nhất với sản phẩm của seller hiện tại?' },
      { label: 'Kênh nên chạy', prompt: 'Nên triển khai qua các kênh nào để bán tốt hơn?' },
      { label: 'KOL / livestream', prompt: 'Nếu dùng KOL hoặc livestream thì nên đi theo hướng nào để kích cầu?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy campaign brief', description: 'Dùng làm brief nội bộ', value: '72h refill bundle sprint / creator-led demo / retarget engaged viewers / chat follow-up for high intent users' },
      { type: 'copy', label: 'Copy offer idea', description: 'Dùng làm thông điệp ưu đãi', value: 'Buy smarter with bundle value, refill convenience, and limited-time incentive' },
    ]),
    content: [
      'Chiến dịch mock phù hợp nhất là **72-hour Bundle & Refill Sprint**.',
      '',
      '**Mục tiêu**',
      '- Tăng đơn hàng ngắn hạn từ nhóm khách đã có ý định mua.',
      '- Giảm lãng phí media vào nhóm lạnh chưa có trust signal.',
      '',
      '**Cấu trúc chiến dịch**',
      '- Giai đoạn 1: Creator clip / livestream hook để tạo lực hút ban đầu.',
      '- Giai đoạn 2: Retarget người đã xem trên 50%, đã save, hoặc đã click nhưng chưa mua.',
      '- Giai đoạn 3: Email + chat follow-up cho nhóm có dấu hiệu refill hoặc quote intent.',
      '',
      '**Thông điệp chính**',
      '- Bundle tiết kiệm hơn mua lẻ.',
      '- Refill tiện hơn cho nhu cầu mua lại.',
      '- Có proof từ creator hoặc customer use-case thật.',
      '',
      '**Phân bổ mock budget**',
      '- 40% creator/livestream traffic.',
      '- 35% retargeting conversion.',
      '- 15% CRM/email/chat activation.',
      '- 10% test angle mới hoặc lookalike audience.',
      '',
      '**KPI mock kỳ vọng**',
      '- +18% lift đơn hàng trong 7 ngày.',
      '- +22% add-to-cart từ nhóm đã xem creator content.',
      '- -19% wasted spend nhờ loại bớt audience không còn phù hợp.',
    ].join('\n'),
  };
}

function buildSellerGrowthChannelResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock channel orchestration: paid + owned + chat-assisted commerce'],
    followUpPrompts: [
      { label: 'Tìm khách phù hợp', prompt: 'Nhóm khách hàng nào phù hợp nhất với sản phẩm của seller hiện tại?' },
      { label: 'Gợi ý chiến dịch', prompt: 'Hãy gợi ý chiến dịch tiếp thị tốt nhất để seller tăng bán hàng.' },
      { label: 'KOL / livestream', prompt: 'Nếu dùng KOL hoặc livestream thì nên đi theo hướng nào để kích cầu?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy channel mix', description: 'Dùng làm media direction', value: 'TikTok livestream / creator clips -> Meta or platform retargeting -> Email / LINE / Zalo -> Sales chat for high intent users' },
      { type: 'copy', label: 'Copy rollout', description: 'Dùng làm sequencing plan', value: 'Awareness proof -> engagement retargeting -> CRM push -> chat conversion assist' },
    ]),
    content: [
      'Prime AI đề xuất chạy theo **channel sequence**, không phải chọn một kênh đơn lẻ.',
      '',
      '**Kênh 1. Demand trigger**',
      '- TikTok livestream / creator short-form content.',
      '- Mục đích: tạo trust và nhu cầu ban đầu.',
      '- KPI mock: video completion 34%, comment rate 6.2%, click-out 2.8%.',
      '',
      '**Kênh 2. Conversion retargeting**',
      '- Retargeting trên social / marketplace / website audiences.',
      '- Mục đích: bám lại người đã tương tác nhưng chưa chốt đơn.',
      '- KPI mock: CPA thấp hơn broad targeting 24%, ROAS tăng 17%.',
      '',
      '**Kênh 3. CRM / owned channels**',
      '- Email, LINE, Zalo, WhatsApp hoặc chat platform.',
      '- Mục đích: kích hoạt nhóm có intent cao, refill buyers, hoặc khách vừa bỏ giỏ.',
      '- KPI mock: open rate 38%, reply rate 14%, assisted conversion 9%.',
      '',
      '**Kênh 4. Sales / quote assist**',
      '- Sales chat, quote follow-up, B2B outbound nhẹ.',
      '- Mục đích: chốt nhóm account có AOV cao.',
      '- KPI mock: quote-to-order 21%, average basket tăng 3.2x retail.',
    ].join('\n'),
  };
}

function buildSellerGrowthKolResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock creator intelligence: host fit + offer timing + social proof'],
    followUpPrompts: [
      { label: 'Tìm khách phù hợp', prompt: 'Nhóm khách hàng nào phù hợp nhất với sản phẩm của seller hiện tại?' },
      { label: 'Gợi ý chiến dịch', prompt: 'Hãy gợi ý chiến dịch tiếp thị tốt nhất để seller tăng bán hàng.' },
      { label: 'Kênh nên chạy', prompt: 'Nên triển khai qua các kênh nào để bán tốt hơn?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy livestream angle', description: 'Dùng làm creator brief', value: 'Problem-solution demo + trust proof + short-time bundle close' },
      { type: 'copy', label: 'Copy host script', description: 'Dùng làm opening hook', value: 'Open with pain point, demo real use, show bundle value, close with urgency' },
    ]),
    content: [
      'Nếu dùng KOL hoặc livestream, Prime AI đang ưu tiên format **problem-solution demo + trust proof + bundle close**.',
      '',
      '**Host fit mock**',
      '- Ưu tiên micro hoặc mid creator có tỷ lệ bình luận thật cao hơn là chỉ nhìn tổng reach.',
      '- Chỉ số mock nên theo: comment velocity > 4.5%, save/share rate > 3.2%, click-to-cart > 2.1%.',
      '',
      '**Flow livestream đề xuất**',
      '- 0-30 giây: nêu vấn đề người mua đang gặp.',
      '- 30-90 giây: demo cách sản phẩm giải quyết vấn đề.',
      '- 90-150 giây: chứng minh trust bằng review, use-case, hoặc social proof.',
      '- 150 giây trở đi: chốt bằng bundle/refill incentive và CTA ngắn hạn.',
      '',
      '**Offer mock phù hợp**',
      '- Bundle ưu đãi trong 90 phút đầu livestream.',
      '- Refill bonus cho khách từng mua hoặc từng tương tác.',
      '- DM/chat follow-up cho người comment nhưng chưa mua.',
      '',
      '**KPI mock kỳ vọng**',
      '- +26% add-to-cart trong khung livestream.',
      '- +14% follow-up conversion từ nhóm đã comment.',
      '- +11% repeat purchase nếu nối thêm CRM reminder sau live 24 giờ.',
    ].join('\n'),
  };
}

export function resolveContextualResponse(message: string, pathname: string): CopilotResponse | null {
  const normalized = normalizeText(message);
  const context = resolveCopilotContext(pathname);

  if (pathname === '/dashboard' || context.title === 'Seller Growth') {
    if (hasAnyKeyword(normalized, ['nhom khach', 'khach hang phu hop', 'doi tuong phu hop', 'audience', 'customer fit', 'target khach'])) {
      return buildSellerGrowthAudienceResponse();
    }

    if (hasAnyKeyword(normalized, ['chien dich', 'campaign', 'tiep thi tot nhat', 'marketing tot nhat', 'ban hang tot hon'])) {
      return buildSellerGrowthCampaignResponse();
    }

    if (hasAnyKeyword(normalized, ['kenh nao', 'kenh nen chay', 'channel', 'email', 'chat', 'mxh', 'social'])) {
      return buildSellerGrowthChannelResponse();
    }

    if (hasAnyKeyword(normalized, ['kol', 'livestream', 'live stream', 'creator'])) {
      return buildSellerGrowthKolResponse();
    }
  }

  if (hasAnyKeyword(normalized, ['trang nay', 'page nay', 'screen nay', 'route nay', 'dung de lam gi', 'lam gi o day'])) {
    return buildRouteOverview(context);
  }

  if (pathname.startsWith('/orders/')) {
    const order = getOrderById(pathname.split('/')[2] ?? '');
    if (order && hasAnyKeyword(normalized, ['don nay', 'order nay', 'status', 'stuck', 'warehouse', 'khach'])) {
      return buildOrderDetailAnswer(order);
    }
  }

  if (pathname === '/orders' && hasAnyKeyword(normalized, ['bao nhieu', 'count', 'pending', 'shipping', 'ready', 'queue', 'order'])) {
    return summarizeOrdersIndex();
  }

  if (pathname.startsWith('/products/')) {
    const product = getProductById(pathname.split('/')[2] ?? '');
    if (product && hasAnyKeyword(normalized, ['product nay', 'sku', 'channel', 'brand', 'asin', 'gia'])) {
      return buildProductDetailAnswer(product);
    }
  }

  if (pathname === '/products' && hasAnyKeyword(normalized, ['bao nhieu', 'count', 'draft', 'published', 'product'])) {
    return summarizeProductsIndex();
  }

  if (pathname === '/warehouses' && hasAnyKeyword(normalized, ['warehouse', 'kho', 'virtual', '3pl', 'active', 'bao nhieu'])) {
    return summarizeWarehouseNetwork();
  }

  if (pathname === '/listings' && hasAnyKeyword(normalized, ['listing', 'channel', 'amazon', 'shopee', 'rakuten', 'bao nhieu'])) {
    return summarizeListingsIndex();
  }

  if (pathname === '/fulfillment' && hasAnyKeyword(normalized, ['fulfillment', 'queue', 'job', 'bao nhieu'])) {
    return summarizeFulfillmentIndex();
  }

  if (pathname === '/returns' && hasAnyKeyword(normalized, ['return', 'qc', 'bao nhieu', 'refund'])) {
    return summarizeReturnsIndex();
  }

  if (pathname === '/inventory' && hasAnyKeyword(normalized, ['inventory', 'ats', 'ton kho'])) {
    return {
      domain: 'inventory_module_2',
      intent: 'policy_qa',
      citations: ['Boundary: dedicated inventory copilot'],
      followUpPrompts: [
        { label: 'Mở Inventory', prompt: 'Mở inventory' },
        { label: 'Mở Warehouses', prompt: 'Mở warehouses' },
        { label: 'Vì sao tách riêng?', prompt: 'Tại sao inventory copilot tách riêng?' },
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Mở Inventory',
          description: 'Đi tới inventory workspace',
          url: '/inventory',
          emphasis: 'primary',
        },
      ],
      content:
        'Ở route inventory, mình vẫn giữ nguyên boundary: assistant sẽ định hướng và nhắc context, còn inventory diagnostics sâu thì nên chạy ở luồng copilot chuyên dụng để không bị lẫn với orchestration Q&A.',
    };
  }

  return null;
}

export function buildWelcomeMessage(context: CopilotContextSummary): CopilotResponse {
  return finalizeCopilotResponse({
    domain: context.domain,
    intent: 'read',
    citations: [],
    debug: createDebugMeta({
      selectedStrategy: 'welcome',
      confidenceBucket: 'high',
    }),
    followUpPrompts: takePrompts(context.quickPrompts),
    content: `Mình đang đọc context của ${context.title} để tư vấn khách hàng phù hợp, chiến dịch nên chạy và kênh tiếp thị phù hợp cho seller.`,
  }, context);
}

export function buildFallbackResponse(context: CopilotContextSummary): CopilotResponse {
  return finalizeCopilotResponse({
    domain: context.domain,
    intent: 'clarify',
    citations: [],
    debug: createDebugMeta({
      selectedStrategy: 'fallback',
      confidenceBucket: 'low',
      promptedClarify: true,
      fellBack: true,
    }),
    followUpPrompts: takePrompts(context.quickPrompts),
    actions: buildActions(
      takePrompts(context.quickPrompts).map((prompt) => ({
        type: 'copy',
        label: prompt.label,
        description: 'Copy prompt mẫu để dùng tiếp',
        value: prompt.prompt,
      })),
    ),
    content: `Mình chưa đủ chắc để trả lời ngay mà không đoán sai trong ${context.title}.`,
  }, context);
}

export function resolveCopilotResponse(
  message: string,
  pathname: string,
  conversationState?: CopilotConversationState,
): CopilotResponse {
  const normalized = normalizeCopilotInput(message);
  const context = resolveCopilotContext(pathname);
  const candidates: CandidateResponse[] = [];
  const navigationHeavyIntent = wantsExplicitNavigation(normalized) || wantsListNavigation(normalized);
  const summaryLikeIntent = hasAnyKeyword(normalized, ['tom tat', 'bao nhieu', 'snapshot', 'hien tai']);
  const contextualScore = summaryLikeIntent ? 92 : (navigationHeavyIntent ? 80 : 88);
  const navigationScore = summaryLikeIntent ? 80 : (navigationHeavyIntent ? 93 : 84);

  const addCandidate = (key: string, score: number, response: CopilotResponse | null) => {
    if (!response) return;
    candidates.push({
      key,
      score,
      response: attachFollowUps(response, response.domain === context.domain ? context.quickPrompts : response.followUpPrompts ?? context.quickPrompts),
    });
  };

  if (hasAnyKeyword(normalized, ['help', 'tro giup', 'giup gi', 'giup duoc gi', 'ban giup gi', 'lam duoc gi', 'co the lam gi'])) {
    addCandidate('capabilities', 98, buildCapabilitiesResponse(context));
  }

  addCandidate('product-draft', 100, resolveProductDraftResponse(message));
  addCandidate('conversation-entity', 97, resolveConversationEntityResponse(message, conversationState));
  addCandidate('entity-lookup', 95, resolveEntityLookupResponse(message));
  addCandidate('contextual', contextualScore, resolveContextualResponse(message, pathname));
  addCandidate('navigation', navigationScore, resolveNavigationResponse(message));
  addCandidate('knowledge', 72, getKnowledgeResponse(message));

  if (!candidates.length) {
    if (normalized.length <= 16 || hasAnyKeyword(normalized, ['giup minh', 'xem ho', 'check ho'])) {
      return finalizeCopilotResponse(buildClarifyResponse(context), context);
    }

    return buildFallbackResponse(context);
  }

  candidates.sort((left, right) => right.score - left.score);
  const [top, runnerUp] = candidates;

  if (
    runnerUp
    && top.score < 92
    && top.score - runnerUp.score <= 6
    && top.key !== runnerUp.key
  ) {
    return finalizeCopilotResponse(buildClarifyResponse(context, [
      { label: 'Giải thích trang', prompt: 'Trang này dùng để làm gì?' },
      ...takePrompts(top.response.followUpPrompts ?? context.quickPrompts, 2),
    ]), context);
  }

  return finalizeCopilotResponse({
    ...top.response,
    debug: {
      ...(top.response.debug ?? createDebugMeta({
        selectedStrategy: top.key,
        confidenceBucket: scoreToConfidenceBucket(top.score),
      })),
      selectedStrategy: top.key,
      confidenceBucket: scoreToConfidenceBucket(top.score),
      usedConversationMemory: top.key === 'conversation-entity',
    },
  }, context);
}
