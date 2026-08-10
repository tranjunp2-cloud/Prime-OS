import { describe, expect, it } from 'vitest';
import type { Order, OrderEvent, OrderItem } from '@/lib/oms-types';
import { buildMyInvoisEvidenceSummary, buildMyInvoisOrderReadiness } from './myinvois';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_my_001',
    user_id: 'user_demo',
    order_id: 'PRIME-MY-0001',
    channel: 'shopee',
    channel_order_ref: 'SHO-20260001',
    customer_name: 'Ahmad Razali',
    customer_email: 'ahmad.r@example.my',
    customer_phone: '+60-12-345-6789',
    shipping_address: '78 Jalan Bukit Bintang, Kuala Lumpur 50000, MY',
    shipping_method: null,
    tracking_number: 'TRKMY0001',
    ship_to: {
      name: 'Ahmad Razali',
      phone: '+60-12-345-6789',
      address1: '78 Jalan Bukit Bintang',
      city: 'Kuala Lumpur',
      prefecture: 'Kuala Lumpur',
      postal_code: '50000',
      country: 'MY',
    },
    currency: 'MYR',
    subtotal_amount: 1000,
    shipping_amount: 20,
    discount_amount: 0,
    total_amount: 1020,
    status: 'completed',
    lifecycle_stage: 'delivered',
    risk_flags: [],
    allocated_warehouse_id: 'wh_fbsmy',
    allocation_policy_snapshot: null,
    sla_target_days: 3,
    order_date: '2026-06-01T09:00:00.000Z',
    created_at: '2026-06-01T09:00:00.000Z',
    updated_at: '2026-06-02T09:00:00.000Z',
    warehouse_id: 'wh_fbsmy',
    ...overrides,
  };
}

const item: OrderItem = {
  id: 'item_my_001',
  order_id: 'ord_my_001',
  sku: 'SKU-MY-001',
  product_name: 'Malaysia pilot item',
  quantity: 1,
  price_per_unit: 1000,
  created_at: '2026-06-01T09:00:00.000Z',
};

const deliveredEvent: OrderEvent = {
  id: 'evt_my_001',
  order_id: 'ord_my_001',
  event_type: 'delivered',
  message: 'Delivered to buyer.',
  actor_type: 'integration',
  actor_id: null,
  payload: null,
  created_at: '2026-06-02T10:00:00.000Z',
};

describe('MyInvois local readiness model', () => {
  it('marks a completed Malaysia-scope order as valid invoice evidence', () => {
    const readiness = buildMyInvoisOrderReadiness(makeOrder(), [item], [deliveredEvent]);

    expect(readiness.state).toBe('valid');
    expect(readiness.reference.submissionUid).toMatch(/^SUB-/);
    expect(readiness.reference.documentUuid).toMatch(/^UUID-/);
    expect(readiness.reference.validatedAt).toBe('2026-06-02T11:00:00.000Z');
    expect(readiness.blockingFields).toEqual([]);
  });

  it('keeps non-Malaysia orders outside the MyInvois compliance scope', () => {
    const readiness = buildMyInvoisOrderReadiness(makeOrder({
      id: 'ord_jp_001',
      order_id: 'PRIME-JP-0001',
      channel: 'rakuten',
      customer_email: 'yuki@example.jp',
      shipping_address: 'Shibuya, Tokyo, JP',
      ship_to: {
        name: 'Yuki Tanaka',
        address1: '2-3-4 Shibuya',
        city: 'Tokyo',
        prefecture: 'Tokyo',
        postal_code: '150-0001',
        country: 'JP',
      },
      allocated_warehouse_id: 'wh_crjp',
      warehouse_id: 'wh_crjp',
      currency: 'JPY',
    }), [item], []);

    expect(readiness.state).toBe('not_required');
    expect(readiness.notRequired).toBe(true);
    expect(readiness.blockingFields).toEqual([]);
  });

  it('summarizes MyInvois evidence across mixed order scope', () => {
    const malaysiaOrder = makeOrder();
    const japanOrder = makeOrder({
      id: 'ord_jp_001',
      order_id: 'PRIME-JP-0001',
      channel: 'rakuten',
      customer_email: 'yuki@example.jp',
      shipping_address: 'Shibuya, Tokyo, JP',
      ship_to: {
        name: 'Yuki Tanaka',
        address1: '2-3-4 Shibuya',
        city: 'Tokyo',
        prefecture: 'Tokyo',
        postal_code: '150-0001',
        country: 'JP',
      },
      allocated_warehouse_id: 'wh_crjp',
      warehouse_id: 'wh_crjp',
      currency: 'JPY',
    });

    const summary = buildMyInvoisEvidenceSummary([malaysiaOrder, japanOrder], [item], [deliveredEvent]);

    expect(summary.evidenceStatus).toBe('verified');
    expect(summary.candidateCount).toBe(1);
    expect(summary.validCount).toBe(1);
    expect(summary.notRequiredCount).toBe(1);
    expect(summary.coverageLabel).toBe('1/1 MyInvois-valid invoice(s)');
  });
});
