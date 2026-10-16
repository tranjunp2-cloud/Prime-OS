// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest';
import {demoOrders} from '../../../../packages/order-workflow/demo-orders.js';
import {batchBlocker, matchesActionFilter} from './order-bulk';
import {matchesOrderQueue, orderQueue, workQueues} from './order-work-queues';
import {runOrderPrototype} from './order-prototype';
import {shippingLabelUrl} from './order-shipping-label';
import type {OrderRecord} from './orders-api';

const examples = () => demoOrders() as OrderRecord[];
const scenario = (key: string) => examples().find(order => order.id === `DEMO-${key}`)!;
beforeEach(() => sessionStorage.clear());

describe('Order demo scenarios', () => {
  it('covers every queue with stable identities, consistent totals and enough records to paginate', () => {
    const orders = examples();
    expect(orders.length).toBeGreaterThan(40);
    expect(new Set(orders.map(order => order.id)).size).toBe(orders.length);
    expect(orders.map(order => [order.id, order.orderedAt])).toEqual(examples().map(order => [order.id, order.orderedAt]));
    const submitted=orders.filter(order=>matchesOrderQueue(order,'all'));
    expect(submitted).toHaveLength(orders.length-3);
    expect(orders.filter(order => matchesOrderQueue(order, 'draft'))).toHaveLength(3);
    for (const queue of workQueues) expect(orders.some(order => matchesOrderQueue(order, queue.key))).toBe(true);
    const stageTotal=workQueues.filter(queue=>queue.key!=='all').reduce((total,queue)=>total+orders.filter(order=>matchesOrderQueue(order,queue.key)).length,0);
    expect(stageTotal).toBe(submitted.length);
    for (const order of orders) {
      expect(order.source).toBe('demo');
      expect(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)).toBe(order.totals.subtotal);
      expect(order.totals.grandTotal).toBe(order.totals.subtotal! - order.totals.discount! + order.totals.shipping! + order.totals.tax!);
    }
  });

  it('includes positive and blocked confirmation, packing and label cases', () => {
    expect(matchesActionFilter(scenario('CONFIRM-COD'), 'confirm', true)).toBe(true);
    expect(matchesActionFilter(scenario('CONFIRM-PAID'), 'confirm', true)).toBe(true);
    for (const key of ['CONFIRM-EVIDENCE', 'CONFIRM-HOLD', 'CONFIRM-ADDRESS', 'CONFIRM-STOCK', 'CONFIRM-SYNC']) expect(matchesActionFilter(scenario(key), 'confirm', true)).toBe(false);
    for (const key of ['PREPARE-PAID', 'PREPARE-COD']) expect(matchesActionFilter(scenario(key), 'print', true)).toBe(true);
    for (const key of ['PREPARE-HOLD', 'PREPARE-STOCK', 'PLATFORM-PREPARE', 'PLATFORM-READY', 'READY-LABEL', 'READY-PRINTED', 'READY-EXTERNAL']) expect(matchesActionFilter(scenario(key), 'print', true)).toBe(false);
    const prepared = scenario('PREPARE-PAID');
    const printed = {...prepared, operations: {...prepared.operations, printStatus: {packingSlip: 'Printed · Demo operator'}}};
    expect(matchesActionFilter(printed, 'print', true)).toBe(false);
    // Leaving the work queue does not remove explicit printing/reprinting actions.
    for (const order of [printed, scenario('READY-LABEL'), scenario('READY-PRINTED')]) expect(batchBlocker(order, 'print', true)).toBeNull();
    for (const key of ['PREPARE-PAID', 'PREPARE-COD']) expect(matchesActionFilter(scenario(key), 'label', true)).toBe(true);
    for (const key of ['READY-LABEL', 'READY-PRINTED', 'READY-OVERDUE', 'PLATFORM-READY', 'SHIP-TRANSIT', 'SHIP-FAILED', 'DELIVERED-PAID', 'COMPLETED-SETTLED', 'RETURN-TRANSIT']) expect(matchesActionFilter(scenario(key), 'label', true)).toBe(false);
    expect(matchesActionFilter(scenario('READY-EXTERNAL'), 'label', true)).toBe(false);
    expect(matchesActionFilter(scenario('PREPARE-UNPAID'), 'label', true)).toBe(false);
  });

  it('lets sellers advance seeded confirmation, handover and completion cases', () => {
    const confirmed=runOrderPrototype(scenario('CONFIRM-COD'), {action: 'transition', toStatus: 'acknowledged'});
    expect(confirmed.canonicalStatus).toBe('acknowledged');
    expect(orderQueue(confirmed)).toBe('preparing');
    expect(orderQueue(scenario('READY-LABEL'))).toBe('pickup');
    const handedOver=runOrderPrototype(scenario('READY-LABEL'), {action: 'handover', reference: 'TEST-PICKUP', carrierAccepted: true});
    expect(handedOver.canonicalStatus).toBe('shipped');
    expect(orderQueue(handedOver)).toBe('shipping');
    expect(runOrderPrototype(scenario('DELIVERED-PAID'), {action: 'transition', toStatus: 'closed'}).canonicalStatus).toBe('closed');
    expect(() => runOrderPrototype(scenario('DELIVERED-COD'), {action: 'transition', toStatus: 'closed'})).toThrow(/payment/i);
  });

  it('accepts local sample labels only for demo orders and keeps genuine carrier URLs', () => {
    const order = scenario('READY-LABEL');
    const shipment = order.shipments[0];
    expect(shippingLabelUrl(order, shipment)).toBe(shipment.labelUrl);
    expect(shippingLabelUrl({...order, source: 'manual'}, shipment)).toBeUndefined();
    expect(shippingLabelUrl({...order, source: 'channel'}, {...shipment, labelUrl: 'https://carrier.example/label.pdf'})).toBe('https://carrier.example/label.pdf');
    for (const labelUrl of ['javascript:alert(1)', '//external.example/label', '/other-file.html', '/samples/orders/shipping-label.html/other']) expect(shippingLabelUrl(order, {...shipment, labelUrl})).toBeUndefined();
  });
});
