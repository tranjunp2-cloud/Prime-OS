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
  { label: 'Pending Orders', prompt: 'Show the pending order queue' },
  { label: 'Shipping Orders', prompt: 'Summarize the current shipping queue' },
  { label: 'Create Product', prompt: 'Create a new product named "Travel Organizer" with brand "PrimeOS" and SKU PRIME-TRAVEL-ORG-01' },
  { label: 'Open Inventory', prompt: 'Why is Inventory Copilot a separate module?' },
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
    { label: 'Explain This Page', prompt: 'What is this page used for?' },
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
      'I understand part of the request, but I do not have enough context to make a reliable assumption.',
      'Which direction should I take?',
      '- explain the current screen or data',
      '- open the relevant module or queue',
      '- prepare a safe draft action',
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
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
      ...takePrompts(context.quickPrompts, 2),
    ],
    content: [
      `I can assist directly in **${context.title}** with four types of work:`,
      '- explain the current screen, data, or entity',
      '- find related orders, products, or warehouses',
      '- open the relevant module, queue, or filter',
      '- prepare a safe draft before you confirm an action',
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
    description: 'Manage master products, SKU structure, pricing, and channel readiness.',
    insight: `${products.length} products · ${publishedCount} published · ${draftCount} draft`,
    citations: ['Current route: /products', 'Source: product-store'],
    quickPrompts: [
      { label: 'Product Summary', prompt: 'Summarize the current master product catalog' },
      { label: 'Create Product', prompt: 'Create a new product named "Compact Desk Lamp" with brand "PrimeOS" and SKU PRIME-LAMP-001' },
      { label: 'Draft Products', prompt: 'How many products are in draft status?' },
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
    ],
  };
}

function createProductDetailSummary(productId: string): CopilotContextSummary {
  const product = getProductById(productId);

  if (!product) {
    return {
      domain: 'product',
      title: 'Product Detail',
      description: 'No product was found for the current route.',
      citations: ['Current route: product detail'],
      quickPrompts: [
        { label: 'Open Products', prompt: 'Open the product catalog' },
        { label: 'Create Draft', prompt: 'Open the new product form' },
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
      { label: 'Published Channels', prompt: 'Which channels publish this product?' },
      { label: 'SKU Summary', prompt: 'Summarize this product’s SKUs' },
      { label: 'Open Products', prompt: 'Open the product catalog' },
      { label: 'Create Similar', prompt: `Create a product named "${product.name}" with brand "${product.brand}"` },
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
    description: 'Monitor intake, allocation, reservation, shipping, and exceptions across the order flow.',
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
      description: 'No order was found for the current route.',
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
      { label: 'Order Status', prompt: 'Where is this order blocked?' },
      { label: 'Allocated Warehouse', prompt: 'Which warehouse is allocated to this order?' },
      { label: 'Open Orders', prompt: 'Open the order list' },
      { label: 'Pending Orders', prompt: 'Show the pending order queue' },
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
    description: 'Review warehouse topology, capabilities, synchronization status, and operating type.',
    insight: `${warehouses.length} warehouses · ${activeCount} active · ${virtualCount} virtual · ${thirdPartyCount} 3PL`,
    citations: ['Current route: /warehouses', 'Source: warehouse-store'],
    quickPrompts: [
      { label: 'Warehouse Summary', prompt: 'Summarize the current warehouse network' },
      { label: 'Virtual Warehouses', prompt: 'How many virtual warehouses are configured?' },
      { label: 'Open Inventory', prompt: 'Why is Inventory Copilot a separate module?' },
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
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
    description: 'Manage channel listing state separately from the master product record.',
    insight: `${listings.length} listings · Amazon ${amazonCount} · Shopee ${shopeeCount} · Rakuten ${rakutenCount}`,
    citations: ['Current route: /listings', 'Source: listing-store'],
    quickPrompts: [
      { label: 'By Channel', prompt: 'Summarize listings by channel' },
      { label: 'Open Products', prompt: 'Open the master product catalog' },
      { label: 'Explain Listings', prompt: 'What is the channel layer used for in PrimeOS?' },
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
    ],
  };
}

function createFulfillmentSummary(): CopilotContextSummary {
  const jobs = getFulfillmentJobs();
  const openCount = jobs.filter((item) => item.status !== 'done' && item.status !== 'cancelled').length;

  return {
    domain: 'fulfillment',
    title: 'Fulfillment',
    description: 'Monitor pick, pack, ship flows and fulfillment partner execution.',
    insight: `${jobs.length} jobs · ${openCount} active jobs`,
    citations: ['Current route: /fulfillment', 'Source: fulfillment-store'],
    quickPrompts: [
      { label: 'Queue Summary', prompt: 'Summarize the current fulfillment queue' },
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
      { label: 'Open Orders', prompt: 'Open Orders' },
      { label: 'Open Returns', prompt: 'Open Returns' },
    ],
  };
}

function createFulfillmentDetailSummary(jobId: string): CopilotContextSummary {
  const job = getJobById(jobId);

  if (!job) {
    return {
      domain: 'fulfillment',
      title: 'Fulfillment Detail',
      description: 'No fulfillment job was found for the current route.',
      citations: ['Current route: fulfillment detail'],
      quickPrompts: [
        { label: 'Queue Summary', prompt: 'Summarize the current fulfillment queue' },
        { label: 'Open Fulfillment', prompt: 'Open Fulfillment' },
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
      { label: 'Job Status', prompt: 'Which step is this job currently in?' },
      { label: 'Open Queue', prompt: 'Open the fulfillment queue' },
      { label: 'Open Orders', prompt: 'Open Orders' },
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
    description: 'Manage return intake, quality control, disposition, and refund signals.',
    insight: `${returns.length} returns · ${qcCount} in QC · ${completedCount} completed`,
    citations: ['Current route: /returns', 'Source: return-store'],
    quickPrompts: [
      { label: 'Returns Summary', prompt: 'Summarize the current returns queue' },
      { label: 'In Quality Control', prompt: 'How many returns are in quality control?' },
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
      { label: 'Open Fulfillment', prompt: 'Open Fulfillment' },
    ],
  };
}

function createReturnDetailSummary(returnId: string): CopilotContextSummary {
  const item = getReturnById(returnId);

  if (!item) {
    return {
      domain: 'returns',
      title: 'Return Detail',
      description: 'No return record was found for the current route.',
      citations: ['Current route: return detail'],
      quickPrompts: [
        { label: 'Returns Summary', prompt: 'Summarize the current returns queue' },
        { label: 'Open Returns', prompt: 'Open Returns' },
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
      { label: 'Return Status', prompt: 'Which step is this return currently in?' },
      { label: 'Quality Control Summary', prompt: 'What is the quality control outcome for this return?' },
      { label: 'Open Returns', prompt: 'Open Returns' },
    ],
  };
}

function createInventorySummary(): CopilotContextSummary {
  return {
    domain: 'inventory',
    title: 'Inventory',
    description: 'Inventory-specific diagnostics should use the dedicated Inventory Copilot.',
    insight: 'The global assistant redirects detailed ATP and stock diagnostics to the specialized inventory workflow.',
    citations: ['Current route: /inventory', 'Boundary: dedicated inventory copilot'],
    quickPrompts: [
      { label: 'Why Is It Separate?', prompt: 'Why is Inventory Copilot a separate module?' },
      { label: 'Open Warehouses', prompt: 'Open Warehouses' },
      { label: 'Open Orders', prompt: 'Open Orders' },
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
    ],
  };
}

function createSettingsSummary(): CopilotContextSummary {
  return {
    domain: 'settings',
    title: 'Settings',
    description: 'Configure application policies, routing rules, and preferences.',
    citations: ['Current route: /settings'],
    quickPrompts: [
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
      { label: 'Safety Model', prompt: 'What safety model does the assistant use?' },
      { label: 'Open Orders', prompt: 'Open Orders' },
      { label: 'Open Products', prompt: 'Open Products' },
    ],
  };
}

function createAccountSummary(): CopilotContextSummary {
  return {
    domain: 'settings',
    title: 'Account Center',
    description: 'Identity, members, roles, security posture and IAM audit trail.',
    insight: 'Admin AI can explain risky access and draft safer IAM changes, but identity/security actions still require confirmation.',
    citations: ['Current route: /account', 'Guardrail: IAM actions require user confirmation'],
    quickPrompts: [
      { label: 'Full admin access', prompt: 'Who has full admin access?' },
      { label: 'Recent role changes', prompt: 'Show recent role changes.' },
      { label: 'Risky permissions', prompt: 'Find risky permissions.' },
      { label: 'Safer operator role', prompt: 'Draft a safer role for Inventory operators.' },
    ],
  };
}

export function normalizeCopilotInput(value: string) {
  return normalizeText(value);
}

export function resolveCopilotContext(pathname: string): CopilotContextSummary {
  if (pathname === '/account') {
    return createAccountSummary();
  }

  if (pathname === '/overview') {
    return {
      domain: 'dashboard',
      title: 'Operating Home',
      description: "Mission Control for today's operations: action queue, risk radar, area readiness, and evidence stack.",
      insight: 'Prime AI explains why an action is prioritized, which owner should respond, and which risk needs investigation.',
      citations: ['Current route: /overview', 'Source: Prime operating snapshot'],
      quickPrompts: [
        { label: "Today's priority", prompt: 'Which action should be handled first on Operating Home?' },
        { label: 'Explain risk', prompt: 'Why does the risk radar need attention?' },
        { label: 'Open decisions', prompt: 'Open Launch Decisions' },
        { label: 'Explain this page', prompt: 'What is this page used for?' },
      ],
    };
  }

  if (pathname === '/products/new') {
    return {
      domain: 'product',
      title: 'Create Product',
      description: 'Create a new product draft, prefill low-risk fields, and review before submission.',
      insight: 'The assistant can prepare query-prefill values for this creation form.',
      citations: ['Current route: /products/new'],
      quickPrompts: [
        { label: 'Create Product', prompt: 'Create a new product named "Compact Lamp" with brand "PrimeOS" and SKU PRIME-LAMP-001' },
        { label: 'Explain This Page', prompt: 'What is this page used for?' },
        { label: 'Open Products', prompt: 'Open Products' },
        { label: 'Safety Model', prompt: 'What safety model does the assistant use?' },
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
    description: 'Recommend customer segments, products, creators, live commerce tactics, and marketing channels to increase sales.',
    insight: 'Prime AI can recommend target customers, messaging, activation channels, and the next best campaign.',
    citations: ['Current route: dashboard'],
    quickPrompts: [
      { label: 'Find Best Customers', prompt: 'Which customer segments best fit the seller’s current products?' },
      { label: 'Recommend Campaign', prompt: 'Recommend the best marketing campaign to increase sales.' },
      { label: 'Channel Mix', prompt: 'Which channels should the seller use to improve sales?' },
      { label: 'Creator / Live Commerce', prompt: 'How should creators or live commerce be used to generate demand?' },
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
        description: 'Copy this prompt to continue',
        value: prompt.prompt,
      })),
    ),
    followUpPrompts: takePrompts(context.quickPrompts),
    content: [
      `This is the **${context.title}** screen.`,
      context.description,
      context.insight ? `Quick snapshot: ${context.insight}` : null,
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
      { label: 'Why Is It Blocked?', prompt: 'Where is this order blocked?' },
      { label: 'Allocated Warehouse', prompt: 'Which warehouse is allocated to this order?' },
      { label: 'Open Orders', prompt: 'Open Orders' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Order Details',
        description: 'Open this order directly',
        url: actionUrl,
        emphasis: 'primary',
      },
      {
        type: 'navigate',
        label: 'Open Orders',
        description: 'Return to all orders',
        url: '/orders',
      },
    ],
    content: [
      `I found order **${order.order_id}**.`,
      `- Customer: ${order.customer_name}`,
      `- Status: ${ORDER_STATUS_LABELS[order.status] ?? order.status}`,
      `- Lifecycle: ${order.lifecycle_stage}`,
      `- Total: ${formatCurrency(order.total_amount, order.currency)}`,
      `- Warehouse: ${order.allocated_warehouse?.code ?? order.warehouse_id ?? 'Not allocated'}`,
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
      { label: 'Product SKUs', prompt: 'Summarize the SKUs for this product' },
      { label: 'Published Channels', prompt: 'Which channels publish this product?' },
      { label: 'Open Products', prompt: 'Open the product catalog' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Product Details',
        description: 'Open this product directly',
        url: `/products/${product.id}`,
        emphasis: 'primary',
      },
      {
        type: 'copy',
        label: 'Copy SKU',
        description: 'Copy the parent SKU for another workflow',
        value: product.sku_code,
      },
    ],
    content: [
      `I found product **${product.name}**.`,
      `- SKU: ${product.sku_code}`,
      `- Brand: ${product.brand}`,
      `- Status: ${product.status}`,
      `- Channels: ${product.channels.map((item) => item.channel).join(', ') || 'None'}`,
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
          `Job **${job.job_code ?? job.id}** is currently at this stage:`,
          `- Status: ${job.status}`,
          `- Flow: ${job.flow_type}`,
          `- Priority: ${job.priority}`,
          `- Warehouse: ${job.warehouse?.code ?? 'Not assigned'}`,
        ].join('\n'),
      }, [
        { label: 'Job status', prompt: 'What stage is this job in?' },
        { label: 'Back to Fulfillment', prompt: 'Open Fulfillment' },
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
          `Return **${item.rma_number ?? item.id}** currently has this status:`,
          `- Status: ${item.status}`,
          `- QC Grade: ${item.qc_grade ?? 'N/A'}`,
          `- Disposition: ${item.disposition ?? 'N/A'}`,
          `- Refund: ${formatCurrency(item.refund_amount)}`,
        ].join('\n'),
      }, [
        { label: 'Return status', prompt: 'What stage is this return in?' },
        { label: 'Back to Returns', prompt: 'Open Returns' },
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
        { label: 'Open Inventory', prompt: 'Open Inventory' },
        { label: 'Open Warehouses', prompt: 'Open Warehouses' },
        { label: 'Why separate?', prompt: 'Why is the Inventory Copilot separate?' },
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Open Inventory',
          description: 'Go to the inventory workspace',
          url: '/inventory',
          emphasis: 'primary',
        },
        {
          type: 'navigate',
          label: 'Open Warehouses',
          description: 'View the warehouse topology',
          url: '/warehouses',
        },
      ],
      content:
        'For ATS, available stock, reservations, or warehouse availability, open the Inventory module for the complete operational context.',
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
          { label: 'Pending Orders', prompt: 'Show pending orders' },
          { label: 'Shipping Orders', prompt: 'Open shipping orders' },
          { label: 'About Orders', prompt: 'What is this page used for?' },
        ],
        actions: [
          {
            type: 'navigate',
            label: `Open ${matchedStatus.label}`,
            description: 'Go to the pre-filtered order list',
            url: `/orders?status=${matchedStatus.status}`,
            emphasis: 'primary',
          },
        ],
        content: `Open the order list filtered by **${matchedStatus.label}**.`,
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
          label: 'Open Orders',
          description: 'Go to Order Management',
          url: '/orders',
          emphasis: 'primary',
        },
      ],
      content: 'Open the Orders workspace to continue.',
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
      { label: `Open ${routeMatch.label}`, prompt: `Open ${routeMatch.label}` },
      { label: 'About this page', prompt: 'What is this page used for?' },
    ],
    actions: [
      {
        type: 'navigate',
        label: `Open ${routeMatch.label}`,
        description: 'Go to the corresponding module',
        url: routeMatch.url,
        emphasis: 'primary',
      },
    ],
    content: `Open the **${routeMatch.label}** module.`,
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
        { label: 'Open create form', prompt: 'Open the new product form' },
        { label: 'Product example', prompt: 'Create a product named "Compact Lamp" with brand "PrimeOS" and SKU PRIME-LAMP-001' },
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Open product form',
          description: 'Open a blank form for manual entry',
          url: '/products/new',
          emphasis: 'primary',
        },
      ],
      content:
        'I can prepare a product draft. Provide at least a `title`, `brand`, or `sku` to prefill the form, or open a blank create form.',
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
      { label: 'Open product draft', prompt: `Create a product named "${title || 'Compact Lamp'}" with brand "${brand || 'PrimeOS'}" and SKU ${resolvedSku}` },
      { label: 'Back to Products', prompt: 'Open Products' },
    ],
    actions: [
      preparedCommand.confirmAction,
      preparedCommand.cancelAction,
      {
        type: 'copy',
        label: 'Copy SKU',
        description: 'Copy the SKU for another workflow',
        value: resolvedSku,
      },
    ],
    content: [
      'A safe **product draft** is ready for review in the create form.',
      `- Title: ${title || 'Not set'}`,
      `- Brand: ${brand || 'Not set'}`,
      `- SKU: ${resolvedSku}`,
      asin ? `- ASIN: ${asin}` : null,
      family ? `- Category: ${family}` : null,
      msrp ? `- MSRP: ${msrp}` : null,
      '',
      `Command prepared: ${preparedCommand.request.commandName} · risk ${preparedCommand.request.risk}.`,
      'Only low-risk fields have been prefilled. Nothing is saved or published until you confirm the form.',
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
      { label: 'Virtual warehouses', prompt: 'How many virtual warehouses are there?' },
      { label: 'Open Warehouses', prompt: 'Open Warehouses' },
      { label: 'Go to Inventory', prompt: 'Why is the Inventory Copilot separate?' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Warehouses',
        description: 'Go to the warehouse directory',
        url: '/warehouses',
        emphasis: 'primary',
      },
    ],
    content: [
      'Current warehouse network snapshot:',
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
        label: 'Open Pending Orders',
        description: 'Go to the pending queue',
        url: '/orders?status=pending',
        emphasis: 'primary',
      },
      {
        type: 'navigate',
        label: 'Open Shipping Orders',
        description: 'Go to the shipping queue',
        url: '/orders?status=shipping',
      },
    ],
    content: [
      'Current order snapshot:',
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
      { label: 'Create product', prompt: 'Create a product named "Compact Lamp" with brand "PrimeOS" and SKU PRIME-LAMP-001' },
      { label: 'Draft products', prompt: 'How many products are in draft?' },
      { label: 'Open Products', prompt: 'Open Products' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Product Master',
        description: 'Go to the product catalog',
        url: '/products',
        emphasis: 'primary',
      },
      {
        type: 'navigate',
        label: 'Create Product',
        description: 'Open the product creation form',
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
      { label: 'By channel', prompt: 'Summarize current listings by channel' },
      { label: 'Open Listings', prompt: 'Open Listings' },
      { label: 'Back to Products', prompt: 'Open Product Master' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Listings',
        description: 'Go to channel listings',
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
      { label: 'Queue summary', prompt: 'Summarize the current fulfillment queue' },
      { label: 'Open Fulfillment', prompt: 'Open Fulfillment' },
      { label: 'Back to Orders', prompt: 'Open Orders' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Fulfillment',
        description: 'Go to the fulfillment queue',
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
      { label: 'In QC', prompt: 'How many returns are in QC?' },
      { label: 'Open Returns', prompt: 'Open Returns' },
      { label: 'Back to Fulfillment', prompt: 'Open Fulfillment' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Open Returns',
        description: 'Go to the returns queue',
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
      { label: 'Fulfillment warehouse', prompt: 'Which warehouse is this order allocated to?' },
      { label: 'Order blocker', prompt: 'Where is this order blocked?' },
      { label: 'Back to Orders', prompt: 'Open the order list' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Back to Orders',
        description: 'Return to the order list',
        url: '/orders',
      },
    ],
    content: [
      `Order **${order.order_id}** is currently at this stage:`,
      `- Status: ${ORDER_STATUS_LABELS[order.status] ?? order.status}`,
      `- Lifecycle: ${order.lifecycle_stage}`,
      `- Customer: ${order.customer_name}`,
      `- Total: ${formatCurrency(order.total_amount, order.currency)}`,
      `- Warehouse: ${order.allocated_warehouse?.name ?? order.warehouse_id ?? 'Not allocated'}`,
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
      { label: 'Product SKUs', prompt: 'Summarize the SKUs for this product' },
      { label: 'Published channels', prompt: 'Which channels is this product published to?' },
      { label: 'Back to Products', prompt: 'Open the product list' },
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
        label: 'Back to Products',
        description: 'Return to Product Master',
        url: '/products',
      },
    ],
    content: [
      `Current snapshot for **${product.name}**:`,
      `- Parent SKU: ${product.sku_code}`,
      `- Brand: ${product.brand}`,
      `- Status: ${product.status}`,
      `- Channels: ${product.channels.map((item) => item.channel).join(', ') || 'None'}`,
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
      { label: 'Warehouse capabilities', prompt: 'What capabilities does this warehouse have?' },
      { label: 'Back to Warehouses', prompt: 'Open Warehouses' },
      { label: 'Go to Inventory', prompt: 'Why is the Inventory Copilot separate?' },
    ],
    actions: [
      {
        type: 'navigate',
        label: 'Back to Warehouses',
        description: 'Return to the warehouse list',
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
      { label: 'Campaign idea', prompt: 'Suggest the best marketing campaign to increase sales.' },
      { label: 'Channel strategy', prompt: 'Which channels should we use to improve sales?' },
      { label: 'Creator commerce', prompt: 'How should we use creators or livestreams to generate demand?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy audience brief', description: 'Share with the seller team', value: 'Segment A: Creator commerce buyers 24-32 / Segment B: Repeat refill buyers 28-40 / Segment C: B2B office replenishment managers 30-45' },
      { type: 'copy', label: 'Copy key message', description: 'Use as messaging direction', value: 'Bundle convenience, refill value, trust proof, MOQ clarity, service follow-up' },
    ]),
    content: [
      'Prime AI recommends prioritizing three customer segments.',
      '',
      '**1. Creator Commerce Buyers**',
      '- Profile: ages 24-32, discovery-led buyers who need strong trust signals.',
      '- Touchpoints: TikTok livestreams, creator clips, and social saves or shares.',
      '- Purchase triggers: quick demos, clear bundle value, and creator proof.',
      '- Sample KPI: 2.8% CTR, 9.4% add-to-cart rate, 24-48 hour conversion window.',
      '',
      '**2. Repeat / Refill Buyers**',
      '- Profile: previous buyers or shoppers with repeated engagement in the category.',
      '- Touchpoints: email reopen, chat follow-up, and refill or bundle page revisits.',
      '- Purchase triggers: timely reminders, savings, and clear refill value.',
      '- Sample KPI: 31% reopen rate, 12.6% repeat conversion, 27% lower CAC than broad audiences.',
      '',
      '**3. B2B Replenishment Accounts**',
      '- Profile: business buyers, office procurement teams, or recurring partners.',
      '- Touchpoints: quote pages, RFQ intent, matched audiences, and sales chat.',
      '- Purchase triggers: clear MOQ, volume value, reliable SLA, and fulfillment.',
      '- Sample KPI: 8.7% RFQ submission, 21% quote-to-order, and 3.2x retail AOV.',
      '',
      'The strongest signals currently come from livestream comments, creator-content saves and shares, refill-page revisits, and repeated quote intent.',
    ].join('\n'),
  };
}

function buildSellerGrowthCampaignResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock campaign planning: social demand + CRM segment + conversion path'],
    followUpPrompts: [
      { label: 'Find customers', prompt: 'Which customer segments are the best fit for the current products?' },
      { label: 'Channel strategy', prompt: 'Which channels should we use to improve sales?' },
      { label: 'Creator commerce', prompt: 'How should we use creators or livestreams to generate demand?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy campaign brief', description: 'Use as an internal brief', value: '72h refill bundle sprint / creator-led demo / retarget engaged viewers / chat follow-up for high intent users' },
      { type: 'copy', label: 'Copy offer idea', description: 'Use as promotional messaging', value: 'Buy smarter with bundle value, refill convenience, and limited-time incentive' },
    ]),
    content: [
      'The recommended sample campaign is a **72-hour Bundle & Refill Sprint**.',
      '',
      '**Objectives**',
      '- Increase short-term orders from high-intent customers.',
      '- Reduce media waste on cold audiences without trust signals.',
      '',
      '**Campaign structure**',
      '- Stage 1: Creator clips or livestream hooks to generate demand.',
      '- Stage 2: Retarget users who watched over 50%, saved, or clicked without buying.',
      '- Stage 3: Email and chat follow-up for refill or quote intent.',
      '',
      '**Core message**',
      '- Bundles provide better value than individual purchases.',
      '- Refills make repeat purchasing easier.',
      '- Support claims with creator proof or real customer use cases.',
      '',
      '**Sample budget allocation**',
      '- 40% creator/livestream traffic.',
      '- 35% retargeting conversion.',
      '- 15% CRM/email/chat activation.',
      '- 10% new-angle or lookalike audience tests.',
      '',
      '**Sample expected KPIs**',
      '- 18% order lift within seven days.',
      '- 22% add-to-cart lift among creator-content viewers.',
      '- 19% less wasted spend by excluding low-fit audiences.',
    ].join('\n'),
  };
}

function buildSellerGrowthChannelResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock channel orchestration: paid + owned + chat-assisted commerce'],
    followUpPrompts: [
      { label: 'Find customers', prompt: 'Which customer segments are the best fit for the current products?' },
      { label: 'Campaign idea', prompt: 'Suggest the best marketing campaign to increase sales.' },
      { label: 'Creator commerce', prompt: 'How should we use creators or livestreams to generate demand?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy channel mix', description: 'Use as media direction', value: 'TikTok livestream / creator clips -> Meta or platform retargeting -> Email / LINE / Zalo -> Sales chat for high intent users' },
      { type: 'copy', label: 'Copy rollout', description: 'Use as the sequencing plan', value: 'Awareness proof -> engagement retargeting -> CRM push -> chat conversion assist' },
    ]),
    content: [
      'Prime AI recommends a **channel sequence** rather than relying on one channel.',
      '',
      '**Channel 1. Demand trigger**',
      '- TikTok livestream / creator short-form content.',
      '- Purpose: build trust and initial demand.',
      '- Sample KPI: 34% video completion, 6.2% comment rate, and 2.8% click-out.',
      '',
      '**Channel 2. Conversion retargeting**',
      '- Retarget social, marketplace, and website audiences.',
      '- Purpose: re-engage shoppers who interacted but did not purchase.',
      '- Sample KPI: 24% lower CPA than broad targeting and 17% higher ROAS.',
      '',
      '**Channel 3. CRM / owned channels**',
      '- Email, LINE, Zalo, WhatsApp, or chat platforms.',
      '- Purpose: activate high-intent, refill, or recently abandoned-cart customers.',
      '- Sample KPI: 38% open rate, 14% reply rate, and 9% assisted conversion.',
      '',
      '**Channel 4. Sales / quote assist**',
      '- Sales chat, quote follow-up, and targeted B2B outreach.',
      '- Purpose: convert high-AOV accounts.',
      '- Sample KPI: 21% quote-to-order and 3.2x retail average basket.',
    ].join('\n'),
  };
}

function buildSellerGrowthKolResponse(): CopilotResponse {
  return {
    domain: 'dashboard',
    intent: 'read',
    citations: ['Mock creator intelligence: host fit + offer timing + social proof'],
    followUpPrompts: [
      { label: 'Find customers', prompt: 'Which customer segments are the best fit for the current products?' },
      { label: 'Campaign idea', prompt: 'Suggest the best marketing campaign to increase sales.' },
      { label: 'Channel strategy', prompt: 'Which channels should we use to improve sales?' },
    ],
    actions: buildActions([
      { type: 'copy', label: 'Copy livestream angle', description: 'Use as the creator brief', value: 'Problem-solution demo + trust proof + short-time bundle close' },
      { type: 'copy', label: 'Copy host script', description: 'Use as the opening hook', value: 'Open with pain point, demo real use, show bundle value, close with urgency' },
    ]),
    content: [
      'For creators or livestreams, Prime AI recommends **problem-solution demo + trust proof + bundle close**.',
      '',
      '**Sample host fit**',
      '- Prioritize micro or mid-tier creators with authentic comment engagement over raw reach.',
      '- Sample thresholds: comment velocity > 4.5%, save/share rate > 3.2%, click-to-cart > 2.1%.',
      '',
      '**Recommended livestream flow**',
      '- 0-30 seconds: introduce the customer problem.',
      '- 30-90 seconds: demonstrate how the product solves it.',
      '- 90-150 seconds: establish trust with reviews, use cases, or social proof.',
      '- After 150 seconds: close with a bundle or refill incentive and time-bound CTA.',
      '',
      '**Sample offer**',
      '- Bundle incentive during the first 90 minutes.',
      '- Refill bonus for previous buyers or engaged shoppers.',
      '- DM or chat follow-up for commenters who did not purchase.',
      '',
      '**Sample expected KPIs**',
      '- 26% add-to-cart lift during the livestream.',
      '- 14% follow-up conversion among commenters.',
      '- 11% repeat-purchase lift with a CRM reminder 24 hours after the livestream.',
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

  if (hasAnyKeyword(normalized, ['trang nay', 'page nay', 'screen nay', 'route nay', 'dung de lam gi', 'lam gi o day', 'what is this page', 'what is this screen', 'explain this page'])) {
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
        { label: 'Open Inventory', prompt: 'Open Inventory' },
        { label: 'Open Warehouses', prompt: 'Open Warehouses' },
        { label: 'Why Is It Separate?', prompt: 'Why is Inventory Copilot a separate module?' },
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Open Inventory',
          description: 'Open the inventory workspace',
          url: '/inventory',
          emphasis: 'primary',
        },
      ],
      content:
        'Inventory keeps a clear module boundary: the global assistant provides navigation and context, while detailed stock diagnostics run through the dedicated Inventory Copilot.',
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
    content: `I am reviewing the context of ${context.title} to recommend the right customers, campaigns, and marketing channels for the seller.`,
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
        description: 'Copy this example prompt',
        value: prompt.prompt,
      })),
    ),
    content: `I do not have enough context to answer confidently in ${context.title}. Choose one of the suggested prompts or provide more detail.`,
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
      { label: 'Explain This Page', prompt: 'What is this page used for?' },
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
