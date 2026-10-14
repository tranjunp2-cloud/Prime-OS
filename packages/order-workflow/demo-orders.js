import { legacyOrderExamples } from './demo-order-examples.js';
import { demoOrderScenarios } from './demo-order-scenarios.js';
import { hydrateDemoStock } from './demo-stock.js';
import { demoCustomerPurchases } from './demo-customer-purchases.js';

function sampleShipment({id, status, store, warehouse, number, returned, transitions}) {
  const storePickup = store === 'PrimePOS';
  const completed = ['closed', 'delivered'].includes(status);
  const time = stage => transitions.find(event => event.toStatus === stage)?.transitionedAt;
  const packedAt = time('fulfillment_in_progress');
  const pickedUpAt = time('shipped') || time('partially_shipped');
  const deliveredAt = time('delivered');
  const after = (at, minutes) => new Date(Date.parse(at) + minutes * 60000).toISOString();
  const events = [];
  const add = (stage, at, location, description) => {
    if (at) events.push({id: `${id}-${stage}`, status: stage, occurredAt: at, location, description, source: 'prototype'});
  };
  add('created', time('allocated'), warehouse, storePickup ? 'Store pickup arranged.' : 'Shipment information created.');
  if (storePickup) {
    add('ready_for_collection', packedAt, warehouse, 'Order packed and ready for the customer.');
    if (completed) add('collected', deliveredAt, warehouse, 'Customer collected the order at the store.');
  } else {
    add('ready_for_pickup', packedAt, warehouse, 'Parcel packed and ready for carrier pickup.');
    add('picked_up', pickedUpAt, warehouse, 'Carrier accepted the parcel.');
    if (pickedUpAt) add('in_transit', after(pickedUpAt, 15), 'Sorting hub', 'Parcel arrived at the sorting hub.');
    if (completed) {
      add('out_for_delivery', after(deliveredAt, -15), 'Delivery area', 'Courier is delivering the parcel to the recipient.');
      add('delivered', deliveredAt, 'Recipient address', 'Parcel delivered to the recipient.');
    }
    if (returned) {
      add('returning', after(deliveredAt, 1440), 'Return sorting hub', 'Customer return collected for transport to the warehouse.');
      add('returned', after(deliveredAt, 2880), warehouse, 'Returned parcel received at the warehouse.');
    }
  }
  return {carrier: storePickup ? 'Store pickup' : 'GHN', tracking: `DEMO-GHN-${number}`, status: completed ? 'Delivered' : status === 'fulfillment_in_progress' ? 'Awaiting pickup' : 'In transit',
    deliveryMethod: storePickup ? 'store_pickup' : 'carrier',
    ...(!storePickup && pickedUpAt ? {pickedUpAt} : {}),
    ...(deliveredAt ? {deliveredAt} : {}),
    ...(returned ? {deliveryOutcome: 'returned'} : completed ? {deliveryOutcome: 'delivered'} : pickedUpAt ? {deliveryOutcome: 'in_transit'} : {}),
    trackingEvents: events};
}

// Upgrade only untouched legacy sample shipments; never replace seller progress or real tracking.
export function hydrateDemoShipmentHistory(order, sample) {
  if (order.source !== 'demo' || sample?.source !== 'demo' || order.id !== sample.id || order.orderedAt !== sample.orderedAt || order.canonicalStatus !== sample.canonicalStatus) return order;
  return {...order, shipments: order.shipments.map(shipment => {
    if (shipment.trackingEvents?.length || shipment.pickedUpAt || shipment.deliveredAt || shipment.id || shipment.source) return shipment;
    const example = sample.shipments.find(item => item.tracking === shipment.tracking && item.carrier === shipment.carrier && item.status === shipment.status);
    return example ? {...shipment, deliveryMethod: example.deliveryMethod, pickedUpAt: example.pickedUpAt, deliveredAt: example.deliveredAt, deliveryOutcome: example.deliveryOutcome, trackingEvents: example.trackingEvents} : shipment;
  })};
}

// Upgrade only the exact old synthetic buyer contact. Operator changes are kept.
export function hydrateDemoBuyerSnapshot(order, sample) {
  if (order.source !== 'demo' || sample?.source !== 'demo' || order.id !== sample.id || order.buyerSnapshot.phoneCountry) return order;
  const buyer = order.buyerSnapshot;
  const match = /^(customer|ordercase)(\d+)@example\.com$/.exec(buyer.email);
  if (!match || buyer.email !== sample.buyerSnapshot.email || buyer.name !== sample.buyerSnapshot.name) return order;
  const oldPhone = `09000${match[1] === 'customer' ? '0' : '1'}${match[2].padStart(4, '0')}`;
  if (buyer.phone !== oldPhone) return order;
  return { ...order, buyerSnapshot: { ...buyer, phone: sample.buyerSnapshot.phone, phoneCountry: sample.buyerSnapshot.phoneCountry } };
}

// Fill the missing refund in the exact legacy partial-refund fixture. Never
// estimate a real refund, overwrite an explicit amount or replace user edits.
export function hydrateDemoRefundAmount(order, sample) {
  if (order.source !== 'demo' || sample?.source !== 'demo' || order.id !== 'DEMO-REFUND-PARTIAL' || order.id !== sample.id || order.payment.refundedMerchandiseAmount !== undefined) return order;
  const refund = sample.payment.refundedMerchandiseAmount;
  if (!Number.isFinite(refund)) return order;
  const financialSnapshot = value => JSON.stringify([
    value.canonicalStatus, value.orderedAt, value.currencyCode, value.totals,
    value.lines.map(({id, sku, quantity, unitPrice, lineTotal}) => ({id, sku, quantity, unitPrice, lineTotal})),
    value.returnRequests, value.payment.state, value.payment.method, value.payment.reference,
  ]);
  if (financialSnapshot(order) !== financialSnapshot(sample)) return order;
  return {...order, payment: {...order.payment, refundedMerchandiseAmount: refund}};
}

// Synthetic examples only. Never merge these fields into operator-created orders.
export function demoOrders() {
  const stages = ['created', 'closed', 'created', 'fulfillment_in_progress', 'shipped', 'closed', 'acknowledged', 'created', 'draft', 'allocated', 'partially_shipped', 'delivered', 'canceled'];
  const legacy = stages.map((status, i) => {
    const old = legacyOrderExamples[i % legacyOrderExamples.length];
    const id = i < 8 ? old.id : `DEMO-260910-${String(i + 1).padStart(4, '0')}`;
    const subtotal = i < 8 ? Number(old.total.replace(/\D/g, '')) : 720000;
    const returned = i === 5;
    const shipped = ['partially_shipped', 'shipped', 'delivered', 'closed'].includes(status);
    const reserved = ['allocated', 'fulfillment_in_progress'].includes(status);
    const at = '2026-09-08T03:00:00.000Z';
    const lines = [{ id: `${id}-line-1`, sku: 'DEMO-NOTE-A5', name: 'A5 hardcover notebook · Sample', quantity: 2, unitPrice: subtotal / 4, lineTotal: subtotal / 2 }, { id: `${id}-line-2`, sku: 'DEMO-DESK-SET', name: 'Desk essentials set · Sample', quantity: 1, unitPrice: subtotal / 2, lineTotal: subtotal / 2 }];
    lines.forEach((line, index) => {
      line.imageUrl = index === 0 ? '/images/orders/sample-notebook.svg' : '/images/orders/sample-desk.svg';
      line.variant = index === 0 ? 'Charcoal / A5' : 'Natural / Standard';
      line.inventory = {onHand:index === 0 ? 45 : 12, committed: index === 0 ? 10 : 3, reservedForOrder:reserved ? line.quantity : 0, warehouse:old.warehouse, checkedAt:'2026-09-10T09:00:00.000Z'};
    });
    const payment = { state: returned ? 'Refunded' : ['draft', 'created', 'canceled'].includes(status) ? 'Unpaid' : 'Paid', method: ['draft', 'created'].includes(status) ? 'Bank transfer' : 'Card', reference: ['draft', 'created', 'canceled'].includes(status) ? '' : `DEMO-PAY-${i + 1}` };
    const route = ['draft', 'created', 'acknowledged', 'allocated', 'fulfillment_in_progress', ...(status === 'partially_shipped' ? ['partially_shipped'] : ['shipped']), 'delivered', 'closed'];
    const progress = status === 'canceled' ? ['draft', 'created', 'canceled'] : route.slice(0, route.indexOf(status) + 1);
    const transitions = progress.slice(1).map((toStatus, n) => ({ fromStatus: progress[n], toStatus, reason: toStatus === 'canceled' ? 'Customer requested cancellation · Sample' : '', transitionedAt: new Date(Date.parse(at) + (n + 1) * 3600000).toISOString() }));
    if (returned) transitions.find(event => event.toStatus === 'closed').transitionedAt = '2026-09-11T10:00:00.000Z';
    return { id, orderKey: id, requestKey: `demo-${id}`, source: 'demo', demoVersion: 4, version: 1, canonicalStatus: status, orderedAt: at, currencyCode: 'VND',
      buyerSnapshot: { name: old.customer, phone: `090000${String(i + 1).padStart(4, '0')}`, phoneCountry: 'VN', email: `customer${i + 1}@example.com` },
      shippingAddressSnapshot: { address: `${i + 10} Nguyen Hue · Sample address`, city: 'Ho Chi Minh City', country: 'VN', postalCode: '700000' },
      lines, totals: { subtotal, discount: 20000, shipping: 20000, tax: 0, grandTotal: subtotal }, payment,
      metadata: { handlingType: [2, 4, 5].includes(i) ? 'marketplace' : 'self', store: old.store, warehouse: old.warehouse, assignee: old.assignee, tags: old.tags, notes: 'Synthetic demonstration order. Please check the items before packing.' },
      operations: {
        shipBy:'2026-09-11T11:00:00.000Z', carrier:old.store === 'PrimePOS' ? 'Store pickup' : 'GHN', service:'Standard',
        package: reserved || shipped ? {weightKg:1.2,lengthCm:25,widthCm:18,heightCm:10} : undefined,
        printStatus:{pickList:reserved || shipped ? 'Printed · Demo operator' : 'Not printed',shippingLabel:shipped ? 'Printed · Demo operator' : 'Not printed',packingSlip:reserved || shipped ? 'Printed · Demo operator' : 'Not printed'},
        settlement:{platformFees:Math.round(subtotal*0.08),sellerShipping:20000,adjustments:0,netAmount:subtotal-Math.round(subtotal*0.08)-20000,status:'estimated'},
        invoice:i === 3 ? {requested:true,company:'An Phat Company · Sample',taxId:'DEMO-TAX-0003',address:'13 Nguyen Hue · Sample billing address'} : {requested:false},
      },
      reservation: shipped ? 'Dispatched' : reserved ? 'Reserved' : status === 'canceled' ? 'Released' : 'Not reserved',
      needsPaymentVerification: status === 'created', readyForPickup: status === 'fulfillment_in_progress', pickupOverdue: false, syncError: false,
      shipments: shipped || status === 'fulfillment_in_progress' ? [sampleShipment({id, status, store: old.store, warehouse: old.warehouse, number: i + 1, returned, transitions})] : [],
      returnRequests: returned ? [{id:`DEMO-RET-${i + 1}`,status:'closed',reason:'Damaged on arrival · Sample',items:[{orderLineId:lines[0].id,sku:lines[0].sku,quantity:2}]}] : [],
      exceptions: [], transitions, activity: [{id:`${id}-created`,at,message:'Sample order created',actor:'Demo operator'}],
    };
  });
  const examples = [...legacy, ...demoOrderScenarios(legacy)];
  return [...examples, ...demoCustomerPurchases(examples)].map(order => hydrateDemoStock(order, order.lines[0]?.inventory?.checkedAt || order.orderedAt));
}
