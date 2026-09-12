import { legacyOrderExamples } from './orders-seed.js';

// Synthetic examples only. Never merge these fields into operator-created orders.
export function demoOrders() {
  const stages = ['created', 'closed', 'created', 'fulfillment_in_progress', 'shipped', 'closed', 'acknowledged', 'created', 'draft', 'allocated', 'partially_shipped', 'delivered', 'canceled'];
  return stages.map((status, i) => {
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
    return { id, orderKey: id, requestKey: `demo-${id}`, source: 'demo', demoVersion: 4, version: 1, canonicalStatus: status, orderedAt: at, currencyCode: 'VND',
      buyerSnapshot: { name: old.customer, phone: `090000${String(i + 1).padStart(4, '0')}`, email: `customer${i + 1}@example.com` },
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
      shipments: shipped || status === 'fulfillment_in_progress' ? [{carrier: old.store === 'PrimePOS' ? 'Store pickup' : 'GHN', tracking: `DEMO-GHN-${i + 1}`, status: ['closed','delivered'].includes(status) ? 'Delivered' : status === 'fulfillment_in_progress' ? 'Awaiting pickup' : 'In transit'}] : [],
      returnRequests: returned ? [{id:`DEMO-RET-${i + 1}`,status:'closed',reason:'Damaged on arrival · Sample',items:[{orderLineId:lines[0].id,sku:lines[0].sku,quantity:2}]}] : [],
      exceptions: [], transitions, activity: [{id:`${id}-created`,at,message:'Sample order created',actor:'Demo operator'}],
    };
  });
}
