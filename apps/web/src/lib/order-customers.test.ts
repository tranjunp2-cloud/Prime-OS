import { describe, expect, it } from 'vitest';
import { demoOrders } from '../../../../packages/order-workflow/demo-orders.js';
import type { OrderRecord } from './orders-api';
import { buildOrderCustomers, customerMatchesSearch, normalizeBuyerPhone, separateCustomerOrders, undoCustomerSeparation } from './order-customers';

const sample = demoOrders()[0] as OrderRecord;
function order(id: string, changes: Partial<OrderRecord> = {}): OrderRecord {
  return { ...sample, id, orderKey: id, orderedAt: '2026-10-01T04:00:00Z', canonicalStatus: 'closed', buyerSnapshot: { name: 'Nguyễn Minh Anh', email: 'anh@example.com', phone: '0901234567', phoneCountry: 'VN' }, payment: { ...sample.payment, state: 'Paid' }, totals: { grandTotal: 100000 }, ...changes };
}

describe('order-based customers', () => {
  it('groups buyer phones across channels despite different emails, and keeps an opaque deep link', () => {
    const first = order('old');
    const latest = order('new', { orderedAt: '2026-10-12T04:00:00Z', buyerSnapshot: { name: 'Minh Anh', email: 'another@example.com', phone: '+84 901 234 567' }, metadata: { ...sample.metadata, store: 'Shopee' } });
    const [customer] = buildOrderCustomers([latest, first, first]);
    expect(customer.id).toBe(buildOrderCustomers([first])[0].id);
    expect(customer.name).toBe('Minh Anh');
    expect(customer.phone).toBe('+84901234567');
    expect(customer.email).toBe('another@example.com');
    expect(customer.buyerNames).toEqual(['Minh Anh', 'Nguyễn Minh Anh']);
    expect(customer.orders.map(item => item.id)).toEqual(['new', 'old']);
    expect(customer.spent).toEqual([{ currency: 'VND', amount: 200000 }]);
    expect(customer.channels).toContain('Shopee');
    expect(customer.id).not.toContain('@');
  });

  it('does not create profiles from drafts or count unpaid, refunded, and cancelled orders as spend', () => {
    const [customer] = buildOrderCustomers([
      order('paid'),
      order('draft', { canonicalStatus: 'draft' }),
      order('cancelled', { canonicalStatus: 'canceled' }),
      order('unpaid', { payment: { ...sample.payment, state: 'Unpaid' } }),
      order('refunded', { payment: { ...sample.payment, state: 'Refunded' } }),
    ]);
    expect(customer.orders).toHaveLength(4);
    expect(customer.spent).toEqual([{ currency: 'VND', amount: 100000 }]);
    expect(buildOrderCustomers([order('draft', { canonicalStatus: 'draft' })])).toEqual([]);
  });

  it('never combines currencies into an incorrect total', () => {
    const [customer] = buildOrderCustomers([order('vnd'), order('usd', { currencyCode: 'USD', totals: { grandTotal: 20 } })]);
    expect(customer.spent).toEqual(expect.arrayContaining([{ currency: 'VND', amount: 100000 }, { currency: 'USD', amount: 20 }]));
  });

  it('never uses email or name to bridge different, missing, masked, or ambiguous phones', () => {
    const buyer = { name: 'Same name', email: '', phone: '090 123 4567', phoneCountry: 'VN' };
    expect(buildOrderCustomers([order('a', { buyerSnapshot: buyer }), order('b', { buyerSnapshot: { ...buyer, phone: '(090)123-4567' } })])).toHaveLength(1);
    const masked = { name: 'Same name', email: 'a***@example.com', phone: '090***4567' };
    expect(buildOrderCustomers([order('a', { buyerSnapshot: masked }), order('b', { buyerSnapshot: masked })])).toHaveLength(2);
    expect(buildOrderCustomers([order('a'), order('b', { buyerSnapshot: { ...order('a').buyerSnapshot, phone: '0907654321' } })])).toHaveLength(2);
    for (const phone of ['', '090xxxx567', '123', '0901234567']) {
      const unknown = { name: 'Same', email: 'same@example.com', phone };
      const customers = buildOrderCustomers([order('a', { buyerSnapshot: unknown }), order('b', { buyerSnapshot: unknown })]);
      expect(customers).toHaveLength(2);
      expect(customers[0].phoneIssue).toBeTruthy();
    }
  });

  it('does not present a previous delivery address as the latest one when it is missing', () => {
    const [customer] = buildOrderCustomers([order('old'), order('new', { orderedAt: '2026-10-12T04:00:00Z', shippingAddressSnapshot: { address: '', city: '', country: '', postalCode: '' } })]);
    expect(customer.address).toBeUndefined();
  });

  it('supports names without accents, email, formatted phone, and order reference searches', () => {
    const [customer] = buildOrderCustomers([order('ORDER-123')]);
    for (const search of ['nguyen minh', 'ANH@', '090 123 4567', 'ORDER-123']) expect(customerMatchesSearch(customer, search)).toBe(true);
    expect(customerMatchesSearch(customer, 'not a customer')).toBe(false);
  });

  it('validates international numbers and never infers buyer country from shipping address', () => {
    expect(normalizeBuyerPhone('090 123 4567', 'vn').number).toBe('+84901234567');
    expect(normalizeBuyerPhone('+84 901234567', 'US').number).toBe('+84901234567');
    expect(normalizeBuyerPhone('0901234567').issue).toBe('country_unknown');
    expect(normalizeBuyerPhone('0901234567', 'ZZ').issue).toBe('country_unknown');
    for (const phone of ['+999901234567', '+84000000000', 'Support: 0901234567', '0901234567 ext 5', '0000000000']) expect(normalizeBuyerPhone(phone, 'VN').issue).toBe('invalid');
    const buyer = { ...order('a').buyerSnapshot, phoneCountry: undefined };
    const records = [order('a', { buyerSnapshot: buyer }), order('b', { buyerSnapshot: buyer })];
    expect(buildOrderCustomers(records)).toHaveLength(2);
    expect(buildOrderCustomers([order('vn'), order('jp', { buyerSnapshot: { ...buyer, phone: '+819012345678' } })])).toHaveLength(2);
  });

  it('searches all original contact snapshots without warning for accent/case-only name differences', () => {
    const [customer] = buildOrderCustomers([order('a'), order('b', { buyerSnapshot: { name: 'NGUYEN MINH ANH', email: 'old@example.com', phone: '+84901234567' } })]);
    expect(customer.buyerNames).toHaveLength(1);
    expect(customerMatchesSearch(customer, 'old@example.com')).toBe(true);
    expect(customerMatchesSearch(customer, '+84 901 234 567')).toBe(true);
  });

  it('splits selected orders, preserves snapshots and spend, blocks ambiguous future merges, and can undo', () => {
    const records = [order('a'), order('b'), order('c')];
    const before = JSON.stringify(records);
    const customer = buildOrderCustomers(records)[0];
    const groups = separateCustomerOrders(customer, ['b'], {});
    const split = buildOrderCustomers(records, groups);
    expect(split.map(item => item.orders.length).sort()).toEqual([1, 2]);
    expect(split.every(item => item.separated)).toBe(true);
    expect(split.reduce((sum, item) => sum + item.spent[0].amount, 0)).toBe(300000);
    expect(buildOrderCustomers([...records, order('new')], groups)).toHaveLength(3);
    expect(JSON.stringify(records)).toBe(before);
    const undo = undoCustomerSeparation(split[0], records, groups);
    expect(buildOrderCustomers([...records, order('new')], undo)).toHaveLength(1);
    for (const ids of [[], ['a', 'b', 'c'], ['foreign']]) expect(() => separateCustomerOrders(customer, ids, {})).toThrow();
  });

  it('does not use a separation token to merge different phones', () => {
    const records = [order('a'), order('b', { buyerSnapshot: { ...order('b').buyerSnapshot, phone: '0907654321' } })];
    expect(buildOrderCustomers(records, { a: 'same', b: 'same' })).toHaveLength(2);
  });
});
