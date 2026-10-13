// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {demoOrders} from '../../../../packages/order-workflow/demo-orders.js';
import {hydrateDemoStock, moveDemoStockWarehouse, reserveDemoStock, settleDemoStock} from '../../../../packages/order-workflow/demo-stock.js';
import {restartOrderPrototype, restoreOrderPrototype, runOrderPrototype} from './order-prototype';
import {getOrderAttentionReasons, orderStockStatusLabel, type OrderRecord} from './orders-api';
import {confirmationBlocker} from './order-bulk';
import {prototypePreparation} from './order-preparation';

const now = '2026-10-13T06:00:00.000Z';
function incoming(): OrderRecord {
  const order = (demoOrders() as OrderRecord[]).find(item => item.id === 'DEMO-CONFIRM-COD')!;
  delete order.prototypeStockVersion;
  order.reservation = 'Not reserved';
  order.activity = [];
  order.lines = order.lines.map(line => ({...line, quantity: 2, inventory: {
    onHand: 10, committed: 3, reservedForOrder: 0, warehouse: order.metadata.warehouse, checkedAt: now,
  }}));
  return order;
}
beforeEach(() => sessionStorage.clear());

describe('Sample order stock lifecycle', () => {
  it('reserves when a valid order arrives, retaining on-hand and reducing free stock', () => {
    const original = incoming();
    const received = hydrateDemoStock(original, now);
    expect(received.canonicalStatus).toBe('created');
    expect(received.reservation).toBe('Reserved');
    expect(received.lines[0].inventory).toMatchObject({onHand: 10, committed: 5, reservedForOrder: 2});
    expect(original.lines[0].inventory!.committed).toBe(3);
    expect(hydrateDemoStock(received, now)).toEqual(received);
    expect(reserveDemoStock(received, now)).toEqual(received);
  });

  it('keeps the hold unchanged through confirmation, packing and refresh', () => {
    const received = hydrateDemoStock(incoming(), now);
    const confirmed = runOrderPrototype(received, {action: 'transition', toStatus: 'acknowledged'});
    expect(confirmed.lines).toEqual(received.lines);
    const ready = runOrderPrototype(confirmed, {action: 'prepare-shipment', warehouse: confirmed.metadata.warehouse,
      carrier: 'GHN', service: 'Standard', tracking: 'DEMO-STOCK', labelAttached: true,
      items: confirmed.lines.map(line => ({lineId: line.id, quantity: line.quantity})),
    });
    expect(ready.reservation).toBe('Reserved');
    expect(ready.lines).toEqual(received.lines);
    expect(restoreOrderPrototype(received)).toEqual(ready);
    const shipped = runOrderPrototype(ready, {action: 'handover', carrierAccepted: true, reference: 'PICKUP'});
    expect(shipped.lines[0].inventory).toMatchObject({onHand: 8, committed: 3, reservedForOrder: 0});
    expect(shipped.reservation).toBe('Dispatched');
    expect(settleDemoStock(shipped, now, true)).toEqual(shipped);
    expect(restoreOrderPrototype(received)).toEqual(shipped);
  });

  it('does not create another hold when recording payment and confirming together', () => {
    const received = hydrateDemoStock(incoming(), now);
    received.payment = {method: 'Bank transfer', state: 'Unpaid', reference: 'BANK'};
    const confirmed = runOrderPrototype(received, {action: 'confirm-payment-order', paymentReceived: true, reference: 'BANK'});
    expect(confirmed.lines).toEqual(received.lines);
    expect(confirmed.reservation).toBe('Reserved');
  });

  it('releases canceled orders without deducting physical stock and survives restart', () => {
    const received = hydrateDemoStock(incoming(), now);
    const canceled = runOrderPrototype(received, {action: 'transition', toStatus: 'canceled', reason: 'Customer canceled'});
    expect(canceled.reservation).toBe('Released');
    expect(canceled.lines[0].inventory).toMatchObject({onHand: 10, committed: 3, reservedForOrder: 0});
    const restarted = restartOrderPrototype(canceled);
    expect(restarted.reservation).toBe('Reserved');
    expect(restarted.lines[0].inventory).toMatchObject({onHand: 10, committed: 5, reservedForOrder: 2});
  });

  it('does not partially reserve an order with insufficient stock; flags and blocks processing', () => {
    const original = incoming();
    original.lines[1].inventory!.onHand = 3;
    const received = hydrateDemoStock(original, now);
    expect(received.lines).toEqual(original.lines);
    expect(received.reservation).toBe('Allocation failed');
    expect(getOrderAttentionReasons(received)).toContain('Allocation failed');
    expect(confirmationBlocker(received, true)).toMatch(/stock allocation/);
    expect(prototypePreparation({...received, canonicalStatus: 'acknowledged'})?.blocker).toMatch(/stock reservation/);
  });

  it('evaluates duplicate SKU lines together instead of over-reserving the same stock', () => {
    const original = incoming();
    original.lines[1] = {...original.lines[0], id: 'another-line', inventory: {...original.lines[0].inventory!}};
    original.lines.forEach(line => {line.quantity = 4;});
    expect(hydrateDemoStock(original, now).reservation).toBe('Allocation failed');
    original.lines.forEach(line => {line.quantity = 2;});
    const received = hydrateDemoStock(original, now);
    expect(received.lines.map(line => line.inventory!.committed)).toEqual([7, 7]);
    expect(settleDemoStock(received, now, true).lines.map(line => line.inventory!.onHand)).toEqual([6, 6]);
  });

  it.each(['missing inventory', 'missing reserved quantity', 'wrong warehouse', 'unassigned warehouse', 'sync error'])('keeps missing or unreliable data unknown: %s', kind => {
    const order = incoming();
    if (kind === 'missing inventory') delete order.lines[1].inventory;
    if (kind === 'missing reserved quantity') delete order.lines[1].inventory!.reservedForOrder;
    if (kind === 'wrong warehouse') order.lines[1].inventory!.warehouse = 'Elsewhere';
    if (kind === 'unassigned warehouse') order.metadata.warehouse = 'Unassigned';
    if (kind === 'sync error') order.syncError = true;
    const received = hydrateDemoStock(order, now);
    expect(received.reservation).toBe('Not reported');
    expect(received.lines).toEqual(order.lines);
    expect(orderStockStatusLabel(received)).toBe('Reservation not reported');
  });

  it('does not reuse the old warehouse snapshot when changing dispatch warehouse', () => {
    const order = hydrateDemoStock(incoming(), now);
    expect(moveDemoStockWarehouse(order, order.metadata.warehouse, now)).toEqual(order);
    const moved = runOrderPrototype(order, {action: 'warehouse', warehouse: 'New warehouse'});
    expect(moved.reservation).toBe('Not reported');
    expect(moved.lines.every(line => line.inventory === undefined)).toBe(true);
    expect(moved.activity.some(item => item.message.includes('reservation released'))).toBe(true);
  });

  it('upgrades previous sessions without losing seller progress or reserving repeatedly', () => {
    const original = incoming();
    const current = {...original, version: 7, canonicalStatus: 'acknowledged', metadata: {...original.metadata, notes: 'Keep this note'}};
    sessionStorage.setItem('prime.order-prototype.v1', JSON.stringify({[original.id]: {initial: original, current}}));
    const upgraded = restoreOrderPrototype(original);
    expect(upgraded).toMatchObject({version: 7, canonicalStatus: 'acknowledged', reservation: 'Reserved', metadata: {notes: 'Keep this note'}});
    expect(upgraded.lines[0].inventory!.committed).toBe(5);
    expect(restoreOrderPrototype(original)).toEqual(upgraded);
  });

  it('releases only explicitly expired holds, keeps them released on reload and blocks stale confirmation', () => {
    const received = hydrateDemoStock(incoming(), now);
    received.reservationExpiresAt = '2026-10-13T05:00:00.000Z';
    const expired = hydrateDemoStock(received, now);
    expect(expired.reservation).toBe('Reservation expired');
    expect(expired.lines[0].inventory).toMatchObject({onHand: 10, committed: 3, reservedForOrder: 0});
    expect(hydrateDemoStock(expired, now)).toEqual(expired);
    expect(getOrderAttentionReasons(expired)).toContain('Stock reservation expired');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    try { expect(() => runOrderPrototype(received, {action: 'transition', toStatus: 'acknowledged'})).toThrow(/expired/); }
    finally { vi.useRealTimers(); }
    expect(hydrateDemoStock({...received, reservationExpiresAt: undefined}, now).reservation).toBe('Reserved');
  });

  it('never reserves a draft or writes to real order inventory', () => {
    const draft = {...incoming(), canonicalStatus: 'draft' as const};
    expect(hydrateDemoStock(draft, now)).toEqual(draft);
    const real = {...incoming(), source: 'channel'};
    expect(hydrateDemoStock(real, now)).toEqual(real);
    expect(settleDemoStock(real, now)).toEqual(real);
    expect(moveDemoStockWarehouse(real, 'Other', now)).toEqual(real);
    expect(orderStockStatusLabel({...real, reservation: undefined})).toBe('Reservation not reported');
  });
});
