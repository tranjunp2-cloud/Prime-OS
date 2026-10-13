import { describe, expect, it } from 'vitest';
import { demoOrders } from '../../../../packages/order-workflow/demo-orders.js';
import type { CanonicalStatus, OrderRecord } from './orders-api';
import { pendingShippingLabels, shippingLabelQueueBlocker } from './order-shipping-label';

const order = (demoOrders() as OrderRecord[]).find(record => record.id === 'DEMO-PREPARE-PAID')!;

describe('Daily shipping label queue', () => {
  it('accepts only Preparing orders while their outbound label still needs printing', () => {
    for (const canonicalStatus of ['acknowledged', 'allocated', 'fulfillment_in_progress'] as CanonicalStatus[]) {
      expect(shippingLabelQueueBlocker({...order, canonicalStatus})).toBeNull();
    }
    expect(shippingLabelQueueBlocker({...order, readyForPickup: true})).toMatch(/already ready to ship/);
    expect(shippingLabelQueueBlocker({...order, payment: {...order.payment, method: 'COD', state: 'Unpaid'}})).toBeNull();
    expect(pendingShippingLabels(order)).toHaveLength(1);
  });

  it('excludes past stages even when an original carrier label remains available', () => {
    for (const canonicalStatus of ['draft', 'created', 'partially_shipped', 'shipped', 'delivered', 'closed', 'canceled'] as CanonicalStatus[]) {
      expect(shippingLabelQueueBlocker({...order, canonicalStatus})).not.toBeNull();
    }
  });

  it('excludes printed, attached, held, marketplace, unpaid and return cases', () => {
    const variants: OrderRecord[] = [
      {...order, operations: {...order.operations, printStatus: {shippingLabel: 'Printed · Seller'}}},
      {...order, operations: {...order.operations, work: {...order.operations?.work, labelAttachedAt: '2026-10-13T01:00:00Z'}}},
      {...order, hold: {active: true, reason: 'Address change', actor: 'Seller', at: order.orderedAt}},
      {...order, metadata: {...order.metadata, handlingType: 'marketplace'}},
      {...order, payment: {...order.payment, state: 'Unpaid'}},
      {...order, payment: {...order.payment, state: 'Refunded'}},
      {...order, returnRequests: [{id: 'return', status: 'requested', reason: 'Return', items: []}]},
      {...order, exceptions: [{id: 'address', status: 'open', summary: 'Invalid address', at: order.orderedAt}]},
      {...order, syncError: true},
      {...order, reservation: 'Allocation failed'},
    ];
    for (const candidate of variants) expect(shippingLabelQueueBlocker(candidate)).not.toBeNull();
  });

  it('excludes pickup and carrier handovers despite a stale Preparing order status', () => {
    const shipment = order.shipments[0];
    const variants: OrderRecord['shipments'][number][] = [
      {...shipment, deliveryMethod: 'store_pickup'},
      {...shipment, labelUrl: undefined},
      {...shipment, pickedUpAt: order.orderedAt},
      {...shipment, deliveredAt: order.orderedAt},
      {...shipment, deliveryOutcome: 'in_transit'},
      {...shipment, status: 'Cancelled'},
      {...shipment, status: 'Delivered'},
      {...shipment, trackingEvents: [{id: 'picked-up', status: 'picked_up', occurredAt: order.orderedAt, source: 'carrier'}]},
    ];
    for (const candidate of variants) expect(shippingLabelQueueBlocker({...order, shipments: [candidate]})).not.toBeNull();
    expect(pendingShippingLabels({...order, shipments: [variants[2], {...shipment, id: 'unshipped'}]}).map(item => item.id)).toEqual(['unshipped']);
  });
});
