import { beforeAll, describe, expect, it } from 'vitest';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { getOrders } from '@/lib/order-store';
import {
  resolveContextualResponse,
  resolveCopilotContext,
  resolveCopilotResponse,
  resolveEntityLookupResponse,
  resolveNavigationResponse,
  resolveProductDraftResponse,
} from './context';

beforeAll(async () => {
  await seedDemoData('assistant_qa');
});

describe('copilot context resolver', () => {
  it('returns create-product route context for the draft form', () => {
    const context = resolveCopilotContext('/products/new');

    expect(context.title).toBe('Create Product');
    expect(context.domain).toBe('product');
    expect(context.quickPrompts.some((prompt) => prompt.label === 'Create Product')).toBe(true);
  });

  it('maps pending-order navigation requests to filtered order routes', () => {
    const response = resolveNavigationResponse('Mở order đang pending');

    expect(response?.domain).toBe('orders');
    expect(response?.actions?.[0]).toMatchObject({
      type: 'navigate',
      url: '/orders?status=pending',
    });
  });

  it('builds a safe product draft response with prefilled create-form params', () => {
    const response = resolveProductDraftResponse('Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001');

    expect(response?.intent).toBe('write_draft');
    expect(response?.actions?.[0]?.url).toContain('/products/new?');
    expect(response?.actions?.[0]?.url).toContain('sku=PRIME-LAMP-001');
    expect(response?.content).toContain('Nothing is saved or published');
  });

  it('answers contextual page-help questions from the active route', () => {
    const response = resolveContextualResponse('Trang này dùng để làm gì?', '/orders');

    expect(response?.domain).toBe('orders');
    expect(response?.content).toContain('This is the **Orders** screen');
    expect(response?.content).toContain('Monitor intake, allocation, reservation');
  });

  it('finds orders from natural language and returns detail-safe summaries', () => {
    const order = getOrders().find((candidate) => /prime-[a-z]{2,4}-\d{4}/i.test(candidate.order_id));
    if (!order) {
      throw new Error('Missing seeded assistant QA order');
    }

    const response = resolveEntityLookupResponse(`Cho mình xem đơn ${order.order_id}`);

    expect(response?.domain).toBe('orders');
    expect(response?.content).toContain(order.order_id);
    expect(response?.actions?.[0]).toMatchObject({
      type: 'navigate',
      url: `/orders/${order.id}`,
    });
  });

  it('uses prior entity context for follow-up questions', () => {
    const order = getOrders().find((candidate) => /prime-[a-z]{2,4}-\d{4}/i.test(candidate.order_id));
    if (!order) {
      throw new Error('Missing seeded assistant QA order');
    }

    const response = resolveCopilotResponse('Đơn này đang ở bước nào?', '/orders', {
      lastDomain: 'orders',
      lastIntent: 'read',
      lastEntityRef: {
        entityType: 'order',
        entityId: order.id,
        label: order.order_id,
      },
    });

    expect(response.domain).toBe('orders');
    expect(response.content).toContain(order.order_id);
    expect(response.followUpPrompts?.some((prompt) => prompt.label === 'Fulfillment warehouse')).toBe(true);
    expect(response.debug?.selectedStrategy).toBe('conversation-entity');
    expect(response.debug?.usedConversationMemory).toBe(true);
  });

  it('asks for clarification when the request is too short to classify safely', () => {
    const response = resolveCopilotResponse('check ho', '/orders');

    expect(response.intent).toBe('clarify');
    expect(response.content).toContain('do not have enough context');
    expect(response.debug?.selectedStrategy).toBe('clarify');
    expect(response.debug?.confidenceBucket).toBe('low');
  });

  it('attaches grounding metadata to route-level answers', () => {
    const response = resolveCopilotResponse('Trang này dùng để làm gì?', '/orders');

    expect(response.grounding?.sources).toContain('route_context');
    expect(response.grounding?.freshness).toBe('live_session');
    expect(response.grounding?.citations.length).toBeGreaterThan(0);
    expect(response.grounding?.policyTags).toContain('no-mutation');
  });

  it('marks draft responses as draft-before-commit grounding', () => {
    const response = resolveCopilotResponse('Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001', '/products');

    expect(response.intent).toBe('write_draft');
    expect(response.grounding?.sources).toContain('draft_prefill');
    expect(response.grounding?.policyTags).toContain('draft-before-commit');
  });

  it('keeps inventory analysis inside the dedicated inventory boundary', () => {
    const response = resolveCopilotResponse('ATS và tồn kho khả dụng đang như nào?', '/inventory');

    expect(response.domain).toBe('inventory_module_2');
    expect(response.intent).toBe('policy_qa');
    expect(response.actions?.[0]?.url).toBe('/inventory');
  });
});
