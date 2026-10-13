// Stable, additive fixtures: IDs and timestamps must not change on refresh.
const scenarios = [
  {key: 'DRAFT-WEB', stage: 'draft', title: 'Web order draft', payment: 'Unpaid'},
  {key: 'DRAFT-POS', stage: 'draft', title: 'Store pickup draft', store: 'PrimePOS', pickup: true, payment: 'Unpaid'},
  {key: 'CONFIRM-COD', stage: 'created', title: 'COD ready to confirm', method: 'COD', payment: 'Unpaid'},
  {key: 'CONFIRM-PAID', stage: 'created', title: 'Prepaid order ready to confirm'},
  {key: 'CONFIRM-BANK', stage: 'created', title: 'Bank transfer not yet received', method: 'Bank transfer', payment: 'Unpaid'},
  {key: 'CONFIRM-EVIDENCE', stage: 'created', title: 'Bank transfer evidence needs review', method: 'Bank transfer', payment: 'Unpaid', evidence: true},
  {key: 'CONFIRM-HOLD', stage: 'created', title: 'Customer requested a size change', hold: 'Customer requested a size change before confirmation.'},
  {key: 'CONFIRM-ADDRESS', stage: 'created', title: 'Delivery address needs review', issue: 'Missing apartment number. Contact the customer before confirming.'},
  {key: 'CONFIRM-STOCK', stage: 'created', title: 'Insufficient stock', stockFailure: true},
  {key: 'CONFIRM-SYNC', stage: 'created', title: 'Channel synchronization failed', sync: true, store: 'Shopee'},
  {key: 'PREPARE-PAID', stage: 'fulfillment_in_progress', title: 'Paid order awaiting label printing and packing', label: true, packingPending: true},
  {key: 'PREPARE-COD', stage: 'fulfillment_in_progress', title: 'COD order awaiting label printing and packing', method: 'COD', payment: 'Unpaid', label: true, packingPending: true},
  {key: 'PREPARE-UNPAID', stage: 'acknowledged', title: 'Payment required before packing', method: 'Bank transfer', payment: 'Unpaid'},
  {key: 'PREPARE-STOCK', stage: 'acknowledged', title: 'Stock allocation failed', stockFailure: true},
  {key: 'PREPARE-HOLD', stage: 'allocated', title: 'Packing paused for customer review', hold: 'Customer asked to change the delivery date.'},
  {key: 'READY-LABEL', stage: 'fulfillment_in_progress', title: 'Ready for pickup with label available', label: true},
  {key: 'READY-PRINTED', stage: 'fulfillment_in_progress', title: 'Documents already printed', label: true, printed: true, dropoff: true},
  {key: 'READY-EXTERNAL', stage: 'fulfillment_in_progress', title: 'Label attached outside Prime; download unavailable'},
  {key: 'READY-OVERDUE', stage: 'fulfillment_in_progress', title: 'Carrier pickup overdue', label: true, overdue: true},
  {key: 'PLATFORM-PREPARE', stage: 'acknowledged', title: 'Marketplace warehouse preparing', marketplace: true, store: 'TikTok Shop'},
  {key: 'PLATFORM-READY', stage: 'fulfillment_in_progress', title: 'Marketplace parcel ready for handover', marketplace: true, store: 'Shopee', label: true},
  {key: 'SHIP-TRANSIT', stage: 'shipped', title: 'Parcel at sorting hub', label: true},
  {key: 'SHIP-OUT', stage: 'shipped', title: 'Courier out for delivery', outcome: 'out_for_delivery', method: 'COD', payment: 'Unpaid', label: true},
  {key: 'SHIP-FAILED', stage: 'shipped', title: 'Delivery failed; awaiting retry', outcome: 'failed', label: true},
  {key: 'DELIVERED-PAID', stage: 'delivered', title: 'Delivered and ready to complete', label: true},
  {key: 'DELIVERED-COD', stage: 'delivered', title: 'Delivered; COD payment not recorded', method: 'COD', payment: 'Unpaid', label: true},
  {key: 'COMPLETED-SETTLED', stage: 'closed', title: 'Completed with settlement recorded', settled: true, label: true, printed: true},
  {key: 'RETURN-REQUESTED', stage: 'delivered', title: 'Customer return requested', returnStatus: 'requested', label: true},
  {key: 'RETURN-TRANSIT', stage: 'shipped', title: 'Failed delivery returning to warehouse', outcome: 'returning', returnStatus: 'in_transit', label: true},
  {key: 'RETURN-RECEIVED', stage: 'shipped', title: 'Return received; awaiting inspection', outcome: 'returned', returnStatus: 'received', label: true},
  {key: 'REFUND-PARTIAL', stage: 'closed', title: 'Partial refund after delivery', payment: 'Partially refunded', returnStatus: 'refunded', label: true},
  {key: 'CANCEL-UNPAID', stage: 'canceled', title: 'Unpaid order cancelled', payment: 'Unpaid'},
  {key: 'CANCEL-PAID', stage: 'canceled', title: 'Cancelled order awaiting refund'},
];

export function demoOrderScenarios(templates) {
  return scenarios.map((scenario, index) => {
    const order = structuredClone(templates[0]);
    const example = templates[index % 8];
    const id = `DEMO-${scenario.key}`;
    const at = new Date(Date.parse('2026-10-10T02:00:00Z') + index * 1800000).toISOString();
    const after = minutes => new Date(Date.parse(at) + minutes * 60000).toISOString();
    const stage = scenario.stage;
    const shipped = ['shipped', 'delivered', 'closed'].includes(stage);
    const delivered = ['delivered', 'closed'].includes(stage);
    const prepared = ['allocated', 'fulfillment_in_progress'].includes(stage) || shipped;
    const packed = (stage === 'fulfillment_in_progress' && !scenario.packingPending) || shipped;
    const returned = scenario.outcome === 'returned';
    const store = scenario.store || ['PrimeWeb', 'Shopee', 'TikTok Shop', 'Lazada'][index % 4];
    const carrier = scenario.pickup ? 'Store pickup' : ['GHN', 'SPX Express', 'Viettel Post'][index % 3];
    const warehouse = scenario.pickup ? 'District 1 Branch' : index % 2 ? 'Hanoi Warehouse' : 'HCM Central Warehouse';
    const paymentState = scenario.payment || 'Paid';
    const lines = order.lines.map((line, lineIndex) => {
      const quantity = lineIndex === 0 ? 1 + index % 3 : 1;
      const unitPrice = lineIndex === 0 ? 125000 : 240000;
      return {...line, id: `${id}-line-${lineIndex + 1}`, quantity, unitPrice, lineTotal: quantity * unitPrice,
        inventory: {...line.inventory, warehouse, checkedAt: at, onHand: scenario.stockFailure ? 0 : lineIndex === 0 ? 45 : 12, committed: scenario.stockFailure ? 0 : 3, reservedForOrder: !scenario.stockFailure && prepared && !shipped ? quantity : 0}};
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const route = stage === 'canceled' ? ['draft', 'created', 'canceled'] : ['draft', 'created', 'acknowledged', 'allocated', 'fulfillment_in_progress', 'shipped', 'delivered', 'closed'];
    const progress = route.slice(0, route.indexOf(stage) + 1);
    const transitions = progress.slice(1).map((toStatus, step) => ({fromStatus: progress[step], toStatus, reason: toStatus === 'canceled' ? 'Customer requested cancellation.' : '', transitionedAt: after(step * 60)}));
    Object.assign(order, {
      id, orderKey: id, requestKey: `demo-${id}`, canonicalStatus: stage, orderedAt: at, version: 1, demoVersion: 4,
      buyerSnapshot: {...example.buyerSnapshot, phone: `090001${String(index + 1).padStart(4, '0')}`, email: `ordercase${index + 1}@example.com`},
      lines, totals: {subtotal, discount: 10000, shipping: scenario.pickup ? 0 : 20000, tax: 0, grandTotal: subtotal - 10000 + (scenario.pickup ? 0 : 20000)},
      payment: {state: paymentState, method: scenario.method || 'Card', reference: scenario.evidence ? `BANK-REVIEW-${index + 1}` : paymentState === 'Paid' || /refunded/i.test(paymentState) ? `DEMO-PAY-${scenario.key}` : ''},
      metadata: {...order.metadata, store, warehouse, handlingType: scenario.marketplace ? 'marketplace' : 'self', shippingMode: scenario.marketplace ? 'platform' : 'seller', assignee: index % 3 === 0 ? 'PrimeOS Admin' : example.metadata.assignee, tags: ['Demo cases', scenario.key], notes: `Test case: ${scenario.title}.`},
      reservation: scenario.stockFailure ? 'Allocation failed' : returned || stage === 'canceled' ? 'Released' : shipped ? 'Dispatched' : prepared ? 'Reserved' : 'Not reserved',
      needsPaymentVerification: Boolean(scenario.evidence), readyForPickup: stage === 'fulfillment_in_progress' && packed, pickupOverdue: Boolean(scenario.overdue), syncError: Boolean(scenario.sync),
      hold: scenario.hold ? {active: true, reason: scenario.hold, at, actor: 'Demo operator'} : undefined,
      exceptions: scenario.issue || scenario.stockFailure || scenario.sync ? [{id: `${id}-issue`, at, status: 'open', summary: scenario.issue || (scenario.stockFailure ? 'Insufficient available stock. Recheck inventory before processing.' : 'Order sync failed. Review the channel connection.')}] : [],
      transitions, shipments: [], returnRequests: [],
      activity: [{id: `${id}-created`, at, actor: 'Demo operator', message: scenario.title}],
    });
    order.operations = {
      carrier, service: scenario.pickup ? undefined : scenario.dropoff ? 'Express' : 'Standard',
      shipBy: scenario.overdue ? '2026-10-12T11:00:00Z' : index % 2 ? '2026-10-13T11:00:00Z' : '2026-10-14T11:00:00Z',
      package: prepared && !scenario.pickup ? {weightKg: 0.8, lengthCm: 24, widthCm: 18, heightCm: 10} : undefined,
      work: prepared ? {preparedAt: after(120), preparedBy: 'Demo operator', stockMode: 'physical-check', ...(packed ? {packedAt: after(180), packedBy: 'Demo operator', labelAttachedAt: after(180), verifiedItems: lines.map(line => ({lineId: line.id, quantity: line.quantity}))} : {})} : undefined,
      printStatus: {pickList: scenario.printed ? 'Printed · Demo operator' : 'Not printed', packingSlip: scenario.printed ? 'Printed · Demo operator' : 'Not printed', shippingLabel: scenario.printed ? 'Printed · Demo operator' : packed ? 'Not recorded' : 'Not printed'},
      settlement: {platformFees: Math.round(subtotal * 0.08), sellerShipping: 20000, adjustments: 0, netAmount: subtotal - 10000 - Math.round(subtotal * 0.08) - 20000, status: scenario.settled ? 'settled' : 'estimated'},
      invoice: {requested: false},
    };
    if (packed || scenario.label) {
      const tracking = `DEMO-TRACK-${scenario.key}`;
      const events = [];
      const event = (status, minute, location, description) => events.push({id: `${id}-${status}`, status, occurredAt: after(minute), location, description, source: 'prototype'});
      event('created', 120, warehouse, 'Shipment information created.');
      if (packed) event('ready_for_pickup', 180, warehouse, 'Parcel packed and ready for handover.');
      if (shipped) {
        event('picked_up', 240, warehouse, 'Carrier accepted the parcel.');
        event('in_transit', 255, 'Sorting hub', 'Parcel arrived at the sorting hub.');
      }
      if (delivered || ['out_for_delivery', 'failed', 'returning', 'returned'].includes(scenario.outcome)) event('out_for_delivery', 285, 'Delivery area', 'Courier is delivering the parcel.');
      if (['failed', 'returning', 'returned'].includes(scenario.outcome)) event('delivery_failed', 300, 'Recipient address', 'Customer unavailable. Delivery was not completed.');
      if (['returning', 'returned'].includes(scenario.outcome)) event('returning', 360, 'Return sorting hub', 'Parcel is returning to the warehouse.');
      if (returned) event('returned', 1440, warehouse, 'Returned parcel received; inspection pending.');
      if (delivered) event('delivered', 300, 'Recipient address', 'Customer received the parcel.');
      order.shipments = [{id: `${id}-parcel`, source: 'prototype', deliveryMethod: 'carrier', carrier, service: order.operations.service, tracking,
        status: returned ? 'Returned to sender' : scenario.outcome === 'returning' ? 'Returning to sender' : scenario.outcome === 'failed' ? 'Delivery failed' : delivered ? 'Delivered' : scenario.outcome === 'out_for_delivery' ? 'Out for delivery' : shipped ? 'In transit' : packed ? 'Awaiting pickup' : 'Shipment created',
        collectionMethod: scenario.dropoff ? 'dropoff' : 'pickup',
        ...(shipped ? {pickedUpAt: after(240), pickupReference: `DEMO-PICKUP-${scenario.key}`} : {}),
        ...(delivered ? {deliveredAt: after(300), deliveryReference: `DEMO-DELIVERY-${scenario.key}`} : {}),
        ...(shipped ? {deliveryOutcome: delivered ? 'delivered' : ['failed', 'returning', 'returned'].includes(scenario.outcome) ? scenario.outcome : 'in_transit'} : {}),
        ...(scenario.label ? {labelUrl: `/samples/orders/shipping-label.html?order=${encodeURIComponent(id)}&tracking=${encodeURIComponent(tracking)}`} : {}),
        trackingEvents: events}];
    }
    if (scenario.returnStatus) order.returnRequests = [{id: `${id}-return`, status: scenario.returnStatus, reason: scenario.title, items: [{orderLineId: lines[0].id, sku: lines[0].sku, quantity: 1}]}];
    return order;
  });
}
