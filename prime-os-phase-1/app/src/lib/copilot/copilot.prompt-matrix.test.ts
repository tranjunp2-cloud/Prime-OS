import { beforeAll, describe, expect, it } from 'vitest';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { getOrders } from '@/lib/order-store';
import { resolveCopilotResponse } from './context';

beforeAll(async () => {
  await seedDemoData('assistant_prompt_matrix');
});

describe('copilot prompt matrix smoke', () => {
  const order = () => {
    const candidate = getOrders().find((item) => /ech-[a-z]{2}-\d{4}/i.test(item.order_id));
    if (!candidate) {
      throw new Error('Missing seeded order for prompt matrix');
    }

    return candidate;
  };

  it.each([
    {
      label: 'dashboard page help',
      pathname: '/dashboard',
      prompt: 'Trang này dùng để làm gì?',
      expectedIntent: 'read',
      expectedDomain: 'dashboard',
    },
    {
      label: 'orders pending queue',
      pathname: '/orders',
      prompt: 'Cho mình danh sách order đang pending',
      expectedIntent: 'navigate',
      expectedDomain: 'orders',
      expectedActionUrl: '/orders?status=pending',
    },
    {
      label: 'products draft request',
      pathname: '/products',
      prompt: 'Tạo product mới tên "Compact Lamp" brand "ECH" sku ECH-LAMP-001',
      expectedIntent: 'write_draft',
      expectedDomain: 'product',
      expectedActionIncludes: '/products/new?',
    },
    {
      label: 'product page help',
      pathname: '/products',
      prompt: 'Có bao nhiêu product đang ở draft?',
      expectedIntent: 'read',
      expectedDomain: 'product',
    },
    {
      label: 'warehouse network summary',
      pathname: '/warehouses',
      prompt: 'Có bao nhiêu virtual warehouse?',
      expectedIntent: 'read',
      expectedDomain: 'warehouse',
    },
    {
      label: 'inventory boundary',
      pathname: '/inventory',
      prompt: 'ATS và tồn kho khả dụng đang như nào?',
      expectedIntent: 'policy_qa',
      expectedDomain: 'inventory_module_2',
      expectedActionUrl: '/inventory',
    },
    {
      label: 'returns queue',
      pathname: '/returns',
      prompt: 'Bao nhiêu return đang ở bước QC?',
      expectedIntent: 'read',
      expectedDomain: 'returns',
    },
    {
      label: 'fulfillment queue',
      pathname: '/fulfillment',
      prompt: 'Tóm tắt fulfillment queue hiện tại',
      expectedIntent: 'read',
      expectedDomain: 'fulfillment',
    },
    {
      label: 'capabilities question',
      pathname: '/orders',
      prompt: 'Bạn giúp gì?',
      expectedIntent: 'read',
      expectedDomain: 'saas',
    },
    {
      label: 'clarify short request',
      pathname: '/orders',
      prompt: 'check ho',
      expectedIntent: 'clarify',
      expectedDomain: 'orders',
    },
  ])('handles $label', ({ pathname, prompt, expectedIntent, expectedDomain, expectedActionUrl, expectedActionIncludes }) => {
    const response = resolveCopilotResponse(prompt, pathname);

    expect(response.intent).toBe(expectedIntent);
    expect(response.domain).toBe(expectedDomain);

    if (expectedActionUrl) {
      expect(response.actions?.[0]?.url).toBe(expectedActionUrl);
    }

    if (expectedActionIncludes) {
      expect(response.actions?.[0]?.url).toContain(expectedActionIncludes);
    }
  });

  it('keeps follow-up continuity after an order lookup', () => {
    const currentOrder = order();

    const response = resolveCopilotResponse('Đơn này đang stuck ở đâu?', '/orders', {
      lastDomain: 'orders',
      lastIntent: 'read',
      lastEntityRef: {
        entityType: 'order',
        entityId: currentOrder.id,
        label: currentOrder.order_id,
      },
    });

    expect(response.intent).toBe('read');
    expect(response.content).toContain(currentOrder.order_id);
    expect(response.debug?.usedConversationMemory).toBe(true);
  });
});
