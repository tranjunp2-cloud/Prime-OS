// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManualOrderInput, OrderRecord } from './orders-api';
import { demoOrders } from '../../../../packages/order-workflow/demo-orders.js';

const input: ManualOrderInput = {
  orderKey: 'MAN-PROTOTYPE', requestKey: 'request-prototype', canonicalStatus: 'draft', currencyCode: 'VND',
  buyerSnapshot: {name: 'Demo customer', phone: '0900000000', email: ''},
  shippingAddressSnapshot: {address: 'Sample address', city: 'HCM', country: 'VN', postalCode: ''},
  lines: [{sku: 'DEMO-A', name: 'Demo item', quantity: 2, unitPrice: 50000}],
  totals: {discount: 5000, shipping: 20000, tax: 0}, payment: {state: 'Unpaid', method: 'COD', reference: ''},
  metadata: {store: 'Manual', warehouse: 'HCM', assignee: 'Unassigned', notes: '', tags: '', handlingType: 'self'},
};

beforeEach(() => {
  vi.resetModules(); sessionStorage.clear();
  vi.stubEnv('VITE_PRIME_PROTOTYPE', 'true');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Orders API environment routing', () => {
  it('loads the complete sample set without a backend or login in standalone prototype mode', async () => {
    const {ordersApi} = await import('./orders-api');
    const result = await ordersApi.list();
    expect(result.data).toHaveLength(demoOrders().length);
    expect(result.data.filter(order => order.canonicalStatus === 'draft')).toHaveLength(3);
    expect(result.data.every(order => order.source === 'demo')).toBe(true);
    expect(result.canWrite).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('restores previous per-order prototype progress instead of overwriting it with seed data', async () => {
    const {ordersApi} = await import('./orders-api');
    const initial = (await ordersApi.list()).data[0];
    const current = {...initial, version: initial.version + 2, canonicalStatus: 'shipped', metadata: {...initial.metadata, notes: 'Keep my work'}};
    sessionStorage.setItem('prime.order-prototype.v1', JSON.stringify({[initial.id]: {initial, current}}));
    vi.resetModules();
    const refreshed = (await (await import('./orders-api')).ordersApi.list()).data.find(order => order.id === initial.id);
    expect(refreshed).toEqual(current);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates and reloads a local draft, validates totals, and advances it without API writes', async () => {
    const {ordersApi} = await import('./orders-api');
    const {data: draft} = await ordersApi.create(input);
    expect(draft).toMatchObject({source: 'demo', canonicalStatus: 'draft', totals: {subtotal: 100000, grandTotal: 115000}});
    expect((await ordersApi.create(input)).data.id).toBe(draft.id);
    await expect(ordersApi.create({...input, requestKey: 'different-request'})).rejects.toThrow('already exists');
    await expect(ordersApi.create({...input, orderKey: 'BAD', lines: []})).rejects.toThrow('order items');
    const created = await ordersApi.command(draft, {action: 'transition', toStatus: 'created'});
    const confirmed = await ordersApi.command(created.data, {action: 'transition', toStatus: 'acknowledged'});
    vi.resetModules();
    const {ordersApi: reloaded} = await import('./orders-api');
    const result = await reloaded.list();
    expect(result.data).toHaveLength(demoOrders().length + 1);
    expect(result.data.find(order => order.id === draft.id)).toEqual(confirmed.data);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('adds missing seed history to old sessions without replacing custom notes or recorded shipment progress', async () => {
    const {ordersApi} = await import('./orders-api');
    const initial = (await ordersApi.list()).data.find(order => order.orderKey === 'POS-240812-0931')!;
    const old = {...initial, shipments: initial.shipments.map(({carrier, tracking, status}) => ({carrier, tracking, status}))};
    const current = {...old, version: 2, metadata: {...old.metadata, notes: 'Preserve my notes'}};
    sessionStorage.setItem('prime.order-prototype.v1', JSON.stringify({[old.id]: {initial: old, current}}));
    const refreshed = (await ordersApi.list()).data.find(order => order.id === old.id)!;
    expect(refreshed.version).toBe(2);
    expect(refreshed.metadata.notes).toBe('Preserve my notes');
    expect(refreshed.shipments[0].trackingEvents).toEqual(initial.shipments[0].trackingEvents);
    const worked = {...current, shipments: [{...current.shipments[0], id: 'my-shipment', trackingEvents: [{id:'my-event', status:'delivered', occurredAt: '2026-10-12T10:00:00Z', source:'prototype'}]}]};
    sessionStorage.setItem('prime.order-prototype.v1', JSON.stringify({[old.id]: {initial: old, current: worked}}));
    expect((await ordersApi.list()).data.find(order => order.id === old.id)).toEqual(worked);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('hydrates the exact old refund fixture in saved prototype sessions without losing notes', async () => {
    const {ordersApi} = await import('./orders-api');
    const sample = (await ordersApi.list()).data.find(order => order.id === 'DEMO-REFUND-PARTIAL')!;
    const old = structuredClone(sample);
    delete old.payment.refundedMerchandiseAmount;
    const current = {...old, version: 5, metadata: {...old.metadata, notes: 'Saved customer demo note'}};
    sessionStorage.setItem('prime.order-prototype.v1', JSON.stringify({[old.id]: {initial: old, current}}));
    const restored = (await ordersApi.list()).data.find(order => order.id === old.id)!;
    expect(restored.payment.refundedMerchandiseAmount).toBe(sample.payment.refundedMerchandiseAmount);
    expect(restored.metadata.notes).toBe(current.metadata.notes);
    expect(restored.version).toBe(5);
    const explicit = {...current, payment: {...current.payment, refundedMerchandiseAmount: 100}};
    sessionStorage.setItem('prime.order-prototype.v1', JSON.stringify({[old.id]: {initial: old, current: explicit}}));
    expect((await ordersApi.list()).data.find(order => order.id === old.id)?.payment.refundedMerchandiseAmount).toBe(100);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not send real-order commands from the standalone prototype', async () => {
    const {ordersApi} = await import('./orders-api');
    const real = {...(await ordersApi.list()).data[0], source: 'manual'} as OrderRecord;
    await expect(ordersApi.command(real, {action: 'transition', toStatus: 'acknowledged'})).rejects.toThrow('Only sample orders');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps API errors visible in connected mode and never substitutes sample orders', async () => {
    vi.stubEnv('VITE_PRIME_PROTOTYPE', 'false');
    const {ordersApi} = await import('./orders-api');
    await expect(ordersApi.list()).rejects.toThrow('Failed to fetch');
    expect(fetch).toHaveBeenCalledOnce();
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({data: [], canWrite: false}), {status: 200}));
    expect(await ordersApi.list()).toEqual({data: [], canWrite: false});
  });
});
