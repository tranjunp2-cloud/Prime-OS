// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoOrders } from '../../../../packages/order-workflow/demo-orders.js';
import type { OrderRecord } from './orders-api';
import { buildOrderCustomers, separateCustomerOrders } from './order-customers';
import { customerRank, defaultRankConfig, rankConfigErrors, rankPosition, rankSettingsKey, readRankSettings, saveRankSettings, withDemoRankDefaults } from './customer-ranks';

const sample = demoOrders()[0] as OrderRecord;
function order(amount: number, changes: Partial<OrderRecord> = {}): OrderRecord {
  return { ...sample, id: `rank-${amount}`, canonicalStatus: 'closed', payment: { ...sample.payment, state: 'Paid' }, totals: { subtotal: amount + 10000, discount: 10000, shipping: 20000, tax: 5000, grandTotal: amount + 25000 }, ...changes };
}
const rank = (orders: OrderRecord[]) => customerRank({ orders }, defaultRankConfig);
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('automatic customer ranks', () => {
  it('uses exact lower boundaries and highest eligible tier, not alphabetical order', () => {
    for (const [amount, key] of [[0, 'unranked'], [1, 'bronze'], [999999, 'bronze'], [1000000, 'silver'], [4999999, 'silver'], [5000000, 'gold'], [9999999, 'gold'], [10000000, 'vip']] as const) {
      expect(rank([order(amount)]).key).toBe(key);
    }
    expect(rankPosition('vip')).toBeGreaterThan(rankPosition('gold'));
    expect(rank([order(1000000)]).next).toEqual({ key: 'gold', remaining: 4000000 });
  });
  it('counts only completed paid merchandise, without shipping, tax or duplicates', () => {
    const paid = order(300000);
    const orders = [paid, paid, order(1000000, { canonicalStatus: 'delivered' }), order(2000000, { canonicalStatus: 'canceled' }), order(4000000, { payment: { ...sample.payment, state: 'Unpaid' } })];
    const before = JSON.stringify(orders);
    expect(rank(orders).amount).toBe(300000);
    expect(rank(orders).qualifyingOrders).toBe(1);
    expect(JSON.stringify(orders)).toBe(before);
  });
  it('subtracts explicit partial merchandise refunds and excludes full refunds', () => {
    expect(rank([order(2000000, { payment: { ...sample.payment, state: 'Partially refunded', refundedMerchandiseAmount: 1500000 } })]).amount).toBe(500000);
    expect(rank([order(2000000, { payment: { ...sample.payment, state: 'Refunded' } })]).key).toBe('unranked');
  });
  it('flags missing refunds, invalid totals and foreign currencies rather than inventing values', () => {
    const result = rank([
      order(1000000, { payment: { ...sample.payment, state: 'Partially refunded' } }),
      order(2000000, { currencyCode: 'USD' }),
      order(3000000, { totals: { grandTotal: 3000000 } }),
      order(4000000, { payment: { ...sample.payment, state: 'Paid', refundedMerchandiseAmount: -1 } }),
    ]);
    expect(result.amount).toBe(0);
    expect(result.excluded).toHaveLength(4);
    expect(result.excluded.map(item => item.reason).join(' ')).toContain('conversion');
  });
  it('distinguishes unconfigured rules from a customer with no qualifying spend', () => {
    expect(customerRank({ orders: [order(10000000)] }, null).key).toBe('not_configured');
    expect(customerRank({ orders: [order(10000000)] }, { ...defaultRankConfig, enabled: false }).key).toBe('not_configured');
    expect(rank([]).key).toBe('unranked');
  });
  it('recalculates from separated order membership', () => {
    const orders = [order(600000), order(700000)];
    const customer = buildOrderCustomers(orders)[0];
    expect(customerRank(customer, defaultRankConfig).key).toBe('silver');
    const groups = separateCustomerOrders(customer, [orders[0].id], {});
    expect(buildOrderCustomers(orders, groups).map(item => customerRank(item, defaultRankConfig).key)).toEqual(['bronze', 'bronze']);
  });
  it('gives every demo customer a genuine purchase rank while preserving original profiles and order cases', () => {
    const orders = demoOrders() as OrderRecord[];
    const customers = buildOrderCustomers(orders);
    const originals = orders.filter(item => !item.id.startsWith('DEMO-PURCHASE-'));
    const originalCustomers = buildOrderCustomers(originals);
    expect(customers).toHaveLength(44);
    expect(new Set(customers.map(item => item.id))).toEqual(new Set(originalCustomers.map(item => item.id)));
    expect(new Set(customers.map(item => customerRank(item, defaultRankConfig).key))).toEqual(new Set(['bronze', 'silver', 'gold', 'vip']));
    for (const customer of customers) {
      const result = customerRank(customer, defaultRankConfig);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.qualifyingOrders).toBeGreaterThan(0);
      expect(result.excluded).toEqual([]);
      const original = originalCustomers.find(item => item.id === customer.id)!;
      expect(customer.name).toBe(original.name);
      expect(customer.phone).toBe(original.phone);
      expect(customer.email).toBe(original.email);
      expect(new Set(customer.channels)).toEqual(new Set(original.channels));
    }
    for (const order of orders.filter(item => item.id.startsWith('DEMO-PURCHASE-'))) {
      expect(order).toMatchObject({source: 'demo', canonicalStatus: 'closed', payment: {state: 'Paid'}});
      expect(order.totals.subtotal).toBe(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
      expect(order.totals.grandTotal).toBe(order.totals.subtotal! - order.totals.discount! + order.totals.shipping! + order.totals.tax!);
    }
    expect(orders.find(order => order.id === 'DEMO-CANCEL-UNPAID')?.canonicalStatus).toBe('canceled');
    expect(orders.find(order => order.id === 'DEMO-CONFIRM-COD')?.payment.state).toBe('Unpaid');
    expect(orders.filter(item => item.id.startsWith('DEMO-RANK-'))).toHaveLength(4);
    expect(demoOrders()).toEqual(orders);
  });
  it('rejects overlapping, negative, fractional and non-finite thresholds', () => {
    for (const value of [-1, 0, 1.5, NaN, Infinity, 1e13]) expect(rankConfigErrors({ ...defaultRankConfig, silver: value }).silver).toBeTruthy();
    expect(rankConfigErrors({ ...defaultRankConfig, gold: 1000000 }).gold).toBeTruthy();
    expect(rankConfigErrors({ ...defaultRankConfig, vip: 5000000 }).vip).toBeTruthy();
  });
});

describe('prototype rank settings storage', () => {
  it('starts a fresh demo with four populated purchase ranks and no storage write', () => {
    const orders = demoOrders() as OrderRecord[];
    const before = JSON.stringify(orders);
    const settings = withDemoRankDefaults(readRankSettings('Main'), orders);
    expect(settings).toEqual({ config: defaultRankConfig, revision: 0, demoDefaults: true });
    const customers = buildOrderCustomers(orders);
    expect(new Set(customers.map(customer => customerRank(customer, settings.config).key))).toEqual(new Set(['vip', 'gold', 'silver', 'bronze']));
    for (const key of ['vip', 'gold', 'silver', 'bronze']) {
      const customer = customers.find(item => customerRank(item, settings.config).key === key)!;
      expect(customer.orders.length).toBeGreaterThan(0);
      expect(customer.name).toBeTruthy(); expect(customer.phone).toBeTruthy(); expect(customer.email).toBeTruthy(); expect(customer.address).toBeTruthy();
    }
    expect(localStorage.getItem(rankSettingsKey('Main'))).toBeNull();
    expect(JSON.stringify(orders)).toBe(before);
  });
  it('keeps real, mixed and empty data unconfigured and never masks corrupt settings', () => {
    const empty = { config: null, revision: 0 };
    expect(withDemoRankDefaults(empty, [])).toBe(empty);
    expect(withDemoRankDefaults(empty, [{ source: 'manual' }])).toBe(empty);
    expect(withDemoRankDefaults(empty, [{ source: 'demo' }, { source: 'shopee' }])).toBe(empty);
    const corrupt = { ...empty, error: 'Could not read settings' };
    expect(withDemoRankDefaults(corrupt, [{ source: 'demo' }])).toBe(corrupt);
  });
  it('preserves customized thresholds and an explicit disabled choice in the demo', () => {
    for (const config of [{ ...defaultRankConfig, silver: 2000000 }, { ...defaultRankConfig, enabled: false }]) {
      const settings = { config, revision: 2 };
      expect(withDemoRankDefaults(settings, [{ source: 'demo' }])).toBe(settings);
    }
  });
  it('persists by workspace with a revision and no customer data', () => {
    expect(readRankSettings('Main')).toEqual({ config: null, revision: 0 });
    saveRankSettings('Main', defaultRankConfig, 0);
    expect(readRankSettings('Main')).toEqual({ config: defaultRankConfig, revision: 1 });
    expect(readRankSettings('Other').config).toBeNull();
    expect(localStorage.getItem(rankSettingsKey('Main'))).not.toContain('phone');
  });
  it('rejects stale saves without overwriting another tab', () => {
    saveRankSettings('Main', defaultRankConfig, 0);
    expect(() => saveRankSettings('Main', { ...defaultRankConfig, silver: 2000000 }, 0)).toThrow('another tab');
    expect(readRankSettings('Main').config?.silver).toBe(1000000);
  });
  it('reports corrupt/unavailable storage honestly and does not overwrite it', () => {
    localStorage.setItem(rankSettingsKey('Main'), '{broken');
    expect(readRankSettings('Main').error).toBeTruthy();
    expect(() => saveRankSettings('Main', defaultRankConfig, 0)).toThrow('could not be read');
    expect(localStorage.getItem(rankSettingsKey('Main'))).toBe('{broken');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota'); });
    expect(() => saveRankSettings('Other', defaultRankConfig, 0)).toThrow('Quota');
  });
});
