import type { CopilotResponse } from '@/components/copilot/types';

interface KnowledgeEntry {
  id: string;
  keywords: string[];
  routes?: string[];
  response: CopilotResponse;
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

const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'assistant-capabilities',
    keywords: ['assistant', 'copilot', 'tro ly', 'bot', 'lam duoc gi', 'co the lam gi'],
    response: {
      domain: 'saas',
      intent: 'read',
      citations: [
        'Capability model: SaaS Q&A -> contextual help -> safe actions -> draft-first mutations',
        'Safety mode: read-only by default, no silent mutations',
      ],
      content: [
        'I support four core workflows in the app:',
        '- answer questions about SaaS workflows and PrimeOS modules',
        '- explain the context of the current page or entity',
        '- open the relevant screen or preconfigured filter',
        '- prepare low-risk drafts, such as prefilling Create Product for review before submission',
      ].join('\n'),
    },
  },
  {
    id: 'inventory-boundary',
    keywords: ['inventory copilot', 'ton kho', 'available to sell', 'ats', 'inventory tach rieng'],
    response: {
      domain: 'inventory_module_2',
      intent: 'policy_qa',
      citations: [
        'Inventory diagnostics stays in the dedicated inventory module',
        'Global assistant can redirect but should not replace ATS-specific investigation flows',
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Open Inventory',
          description: 'Go to the Inventory workspace',
          url: '/inventory',
          emphasis: 'primary',
        },
        {
          type: 'navigate',
          label: 'Open Warehouses',
          description: 'View warehouse topology and capabilities',
          url: '/warehouses',
        },
      ],
      content:
        'The Inventory Copilot is separate so it can handle ATS, reservations, availability, and deeper inventory analytics. The global assistant provides guidance and routes detailed stock investigations to the dedicated Inventory workflow.',
    },
  },
  {
    id: 'product-master',
    keywords: ['product master', 'product la gi', 'san pham la gi', 'master data'],
    response: {
      domain: 'product',
      intent: 'policy_qa',
      citations: [
        'Product store owns identity, pricing, media, and SKU structure',
        'Inventory and order execution live in other towers',
      ],
      content:
        'In PrimeOS, Product Master owns product identity: SKU, brand, media, pricing, compliance, and variant structure. ATS calculations and order execution are handled by Inventory and OMS/Fulfillment.',
    },
  },
  {
    id: 'product-attributes',
    keywords: ['attribute', 'attributes', 'product attribute', 'thuoc tinh', 'truong thong tin san pham'],
    routes: ['/products/categories'],
    response: {
      domain: 'product',
      intent: 'explain_concept',
      citations: ['Knowledge: Prime OS product glossary · Product Attributes'],
      actions: [
        { type: 'navigate', label: 'Open Attributes', description: 'Open the reusable product attribute library', url: '/products/categories?tab=attributes', emphasis: 'primary' },
        { type: 'navigate', label: 'View Categories', description: 'See how attributes are assigned to categories', url: '/products/categories?tab=categories' },
      ],
      followUpPrompts: [
        { label: 'Category Requirements', prompt: 'How do categories use required and optional attributes?' },
        { label: 'Attribute vs Variant', prompt: 'What is the difference between an attribute and a variant?' },
      ],
      content: [
        '**What it is**',
        'Attributes are reusable fields that describe product characteristics, such as Brand, Material, Dimensions, or Country of Origin.',
        '',
        '**How it works in Prime OS**',
        'Create an attribute once, assign it to one or more categories, and decide whether it is required or optional in each category. Products then inherit the appropriate fields from their selected category.',
        '',
        '**Example**',
        'If Material is required for Art Supplies, every product in that category must provide a Material value before it is ready for publishing.',
      ].join('\n'),
    },
  },
  {
    id: 'product-categories',
    keywords: ['category', 'categories', 'product category', 'danh muc', 'danh muc san pham'],
    routes: ['/products/categories'],
    response: {
      domain: 'product',
      intent: 'explain_concept',
      citations: ['Knowledge: Prime OS product glossary · Categories'],
      actions: [
        { type: 'navigate', label: 'Open Categories', description: 'Open the product category hierarchy', url: '/products/categories?tab=categories', emphasis: 'primary' },
      ],
      followUpPrompts: [
        { label: 'Product Attributes', prompt: 'What are product attributes?' },
        { label: 'Channel Mapping', prompt: 'How does marketplace category mapping work?' },
      ],
      content: [
        '**What it is**',
        'Categories organize Product Master records into a shared taxonomy and define which product information belongs to each product type.',
        '',
        '**How it works in Prime OS**',
        'A category controls its parent path, assigned attributes, required fields, and marketplace category mappings. Selecting a category on a product determines which fields must be completed.',
      ].join('\n'),
    },
  },
  {
    id: 'product-variants',
    keywords: ['difference between an attribute and a variant', 'attribute vs variant', 'attribute and a variant', 'variant', 'variants', 'bien the', 'phan loai san pham', 'color size'],
    routes: ['/products/new', '/products/master-catalog', '/products/categories'],
    response: {
      domain: 'product',
      intent: 'explain_concept',
      citations: ['Knowledge: Prime OS product glossary · Variants'],
      actions: [
        { type: 'navigate', label: 'Open Product Master', description: 'Review products and their variants', url: '/products/master-catalog', emphasis: 'primary' },
      ],
      content: [
        '**What it is**',
        'A variant is a sellable version of a product created from option values such as Color and Size. Each variant can have its own SKU, price, image, and stock.',
        '',
        '**Attribute vs variant**',
        'Attributes describe a product. Variants create separate sellable SKU combinations. Material may be descriptive, while Blue / Large can identify a specific variant.',
      ].join('\n'),
    },
  },
  {
    id: 'channel-readiness',
    keywords: ['channel readiness', 'readiness', 'ready for publishing', 'publish readiness', 'do san sang kenh', 'san sang xuat ban'],
    routes: ['/products/new', '/products/master-catalog'],
    response: {
      domain: 'product',
      intent: 'explain_concept',
      citations: ['Knowledge: Prime OS product glossary · Channel Readiness'],
      actions: [
        { type: 'navigate', label: 'Open Product Master', description: 'Review publishing status by channel', url: '/products/master-catalog', emphasis: 'primary' },
      ],
      content: [
        '**What it is**',
        'Channel Readiness checks whether a product has all master, logistics, and channel-specific information required for publishing.',
        '',
        '**Status meaning**',
        '- Ready: all required information is complete\n- Needs attention: channel-specific attributes are missing\n- Blocked: mandatory product or logistics data is missing',
      ].join('\n'),
    },
  },
  {
    id: 'marketplace-category-mapping',
    keywords: ['marketplace category mapping', 'marketplace mapping', 'category mapping', 'channel mapping', 'map category', 'mapping danh muc', 'anh xa danh muc'],
    routes: ['/products/categories'],
    response: {
      domain: 'product',
      intent: 'explain_concept',
      citations: ['Knowledge: Prime OS product glossary · Marketplace Category Mapping'],
      actions: [
        { type: 'navigate', label: 'Open Categories', description: 'Configure marketplace category mappings', url: '/products/categories?tab=categories', emphasis: 'primary' },
      ],
      content: [
        '**What it is**',
        'Marketplace Category Mapping connects one Prime OS category to the corresponding category ID used by each sales channel.',
        '',
        '**Why it matters**',
        'Each marketplace has a different taxonomy and required fields. Mapping lets Prime OS validate and translate product data correctly before publishing.',
      ].join('\n'),
    },
  },
  {
    id: 'warehouse-types',
    keywords: ['warehouse type', 'virtual warehouse', 'fba', '3pl', 'warehouse la gi'],
    response: {
      domain: 'warehouse',
      intent: 'policy_qa',
      citations: [
        'Warehouse store includes internal, fba, fbs, 3pl, and virtual types',
        'Capabilities and status determine operational fit',
      ],
      content: [
        'PrimeOS supports these primary warehouse types:',
        '- internal: directly operated warehouses',
        '- fba / fbs: marketplace-managed warehouses',
        '- 3pl: external fulfillment partners',
        '- virtual: logical warehouses for orchestration or marketplace abstraction',
        '',
        'When recommending a route or action, the assistant prioritizes warehouse capabilities instead of country alone.',
      ].join('\n'),
    },
  },
  {
    id: 'order-lifecycle',
    keywords: ['order lifecycle', 'vong doi don hang', 'captured', 'reserved', 'released to fulfillment', 'shipping'],
    response: {
      domain: 'orders',
      intent: 'policy_qa',
      citations: [
        'OMS lifecycle includes captured -> validated -> allocated -> reserved -> released -> shipped -> delivered',
        'Order status and lifecycle stage are tracked separately',
      ],
      content:
        'OMS separates two layers: `status` shows the business-level operational state, while `lifecycle_stage` identifies the order\'s position in the internal pipeline. This lets the assistant distinguish a shipping order from one that has or has not been reserved.',
    },
  },
  {
    id: 'seller-channels',
    keywords: ['channel', 'amazon', 'shopee', 'rakuten', 'listing channel'],
    response: {
      domain: 'listing',
      intent: 'read',
      citations: [
        'Listing layer manages marketplace-channel state separately from product master',
        'Current mock data is optimized for Amazon, Shopee, Rakuten, and manual flows',
      ],
      content:
        'Channel state is kept in the listing layer so Product Master remains separate from marketplace data. The app currently supports Amazon, Shopee, Rakuten, and manual or website flows for omnichannel control.',
    },
  },
  {
    id: 'safety-model',
    keywords: ['safe', 'an toan', 'xac nhan', 'confirm', 'silent mutation', 'draft truoc commit'],
    response: {
      domain: 'saas',
      intent: 'policy_qa',
      citations: [
        'Read-only by default',
        'Draft before commit for business-impacting writes',
      ],
      content:
        'The assistant follows a read-first safety model: review context, recommend an action, and prepare a draft for business-impacting changes. Material mutations require preview and confirmation.',
    },
  },
];

export function getKnowledgeResponse(message: string, pathname?: string): CopilotResponse | null {
  const normalized = normalizeText(message);

  const scoredEntries = KNOWLEDGE_ENTRIES.map((entry) => {
    const keywordScore = entry.keywords.reduce((total, keyword) => (
      normalized.includes(keyword) ? total + 1 : total
    ), 0);
    const routeBonus = pathname && entry.routes?.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ? 2 : 0;
    return { entry, keywordScore, score: keywordScore + routeBonus };
  }).filter((item) => item.keywordScore > 0);

  if (scoredEntries.length === 0) {
    if (/(pricing|price|goi|growth|enterprise|essential|plan)/.test(normalized)) {
      return {
        domain: 'saas',
        intent: 'policy_qa',
        citations: ['Pricing matrix is not loaded into the local app runtime'],
        content:
          'Pricing and commercial package data is not loaded in this local runtime. I can explain the capabilities of the available modules, but accurate pricing answers require the pricing documentation.',
      };
    }

    return null;
  }

  scoredEntries.sort((left, right) => right.score - left.score);
  return scoredEntries[0].entry.response;
}
