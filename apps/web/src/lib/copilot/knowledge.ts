import type { CopilotResponse } from '@/components/copilot/types';

interface KnowledgeEntry {
  id: string;
  keywords: string[];
  response: CopilotResponse;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

export function getKnowledgeResponse(message: string): CopilotResponse | null {
  const normalized = normalizeText(message);

  const scoredEntries = KNOWLEDGE_ENTRIES.map((entry) => ({
    entry,
    score: entry.keywords.reduce((total, keyword) => (
      normalized.includes(keyword) ? total + 1 : total
    ), 0),
  })).filter((item) => item.score > 0);

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
