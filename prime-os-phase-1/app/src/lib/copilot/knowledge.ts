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
        'Mình đang hỗ trợ 4 lớp việc chính ngay trong app:',
        '- trả lời câu hỏi về workflow SaaS và các module ECH',
        '- giải thích ngữ cảnh của page hoặc entity bạn đang mở',
        '- mở đúng màn hình / bộ lọc phù hợp cho user',
        '- chuẩn bị low-risk draft như prefill Create Product để user chỉ cần review rồi submit',
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
          label: 'Mở Inventory',
          description: 'Đi tới inventory workspace hiện tại',
          url: '/inventory',
          emphasis: 'primary',
        },
        {
          type: 'navigate',
          label: 'Mở Warehouses',
          description: 'Xem warehouse topology và capability',
          url: '/warehouses',
        },
      ],
      content:
        'Inventory copilot được tách riêng để xử lý các câu hỏi đụng tới ATS, reservation, availability và inventory analytics sâu hơn. Global assistant vẫn giúp định hướng, nhưng khi cần mổ xẻ tồn kho thật kỹ thì mình sẽ đẩy bạn sang luồng inventory chuyên dụng.',
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
        'Trong ECH, Product Master là nơi giữ identity của hàng hóa: SKU, brand, media, pricing, compliance, và variant structure. Nó không phải nơi tính ATS hay điều phối order execution; các phần đó đi qua Inventory và OMS/Fulfillment.',
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
        'ECH hiện đang xoay quanh vài nhóm warehouse chính:',
        '- internal: kho vận hành trực tiếp',
        '- fba / fbs: kho marketplace-managed',
        '- 3pl: đối tác fulfillment ngoài',
        '- virtual: warehouse logic cho orchestration hoặc marketplace abstraction',
        '',
        'Khi assistant đề xuất route hoặc action, mình sẽ ưu tiên loại kho phù hợp với capability thay vì chỉ nhìn country.',
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
        'OMS đang tách 2 lớp rõ ràng: `status` để nhìn trạng thái vận hành ở mức business, và `lifecycle_stage` để biết order đang ở bước nào trong pipeline nội bộ. Điều này giúp assistant giải thích được một order “đang shipping” nhưng thực tế đã reserved hay chưa.',
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
        'Channel state được giữ riêng ở listing layer để product master không bị trộn với dữ liệu marketplace. Hiện app đang bám các luồng Amazon, Shopee, Rakuten và manual/website để làm control tower cho seller đa kênh.',
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
        'Assistant đang bám đúng safety model của plan: đọc trước, gợi ý sau, và chỉ chuẩn bị draft cho các thao tác có ảnh hưởng business. Bất kỳ mutation đáng kể nào cũng nên đi qua preview/confirm thay vì tự chạy âm thầm.',
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
          'Phần pricing / package commercial chưa được nạp vào runtime local này, nên mình không muốn bịa. Nếu bạn cần, mình có thể vẫn giải thích capability theo module hiện có trong app, hoặc mình sẽ cần bộ pricing docs để trả lời chính xác hơn.',
      };
    }

    return null;
  }

  scoredEntries.sort((left, right) => right.score - left.score);
  return scoredEntries[0].entry.response;
}
