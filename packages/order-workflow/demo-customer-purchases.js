// Presentation fixtures only: give existing demo buyers a completed purchase
// without changing their pending/cancelled/returned order scenarios.
export function demoCustomerPurchases(orders) {
  const template = orders.find(order => order.id === 'DEMO-RANK-BRONZE');
  const buyers = new Map();
  for (const order of orders) {
    if (order.source !== 'demo' || order.canonicalStatus === 'draft') continue;
    // The seed uses explicit VN sample phones, including one +84 variant.
    const phone = order.buyerSnapshot.phone.replace(/\D/g, '').replace(/^84/, '0');
    const group = buyers.get(phone) || [];
    group.push(order);
    buyers.set(phone, group);
  }
  return [...buyers.entries()].flatMap(([phone, group]) => {
    const hasPurchase = group.some(order => order.canonicalStatus === 'closed'
      && ['Paid', 'Partially refunded'].includes(order.payment.state)
      && (order.payment.state !== 'Partially refunded' || Number.isFinite(order.payment.refundedMerchandiseAmount))
      && order.totals.subtotal - order.totals.discount - (order.payment.refundedMerchandiseAmount || 0) > 0);
    if (hasPurchase) return [];
    const chronological = [...group].sort((a, b) => Date.parse(a.orderedAt) - Date.parse(b.orderedAt) || a.id.localeCompare(b.id));
    const first = chronological[0];
    const latest = chronological.at(-1);
    const suffix = `PURCHASE-${first.id.replace(/^DEMO-/, '')}`;
    // Keep the original order as the oldest record so existing customer URLs,
    // saved notes and names retain their identity. Dates stay deterministic.
    const at = Date.parse(latest.orderedAt) + 60000;
    const offset = at - Date.parse(template.orderedAt);
    const purchase = JSON.parse(JSON.stringify(template, (_key, value) => {
      if (typeof value !== 'string') return value;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return new Date(Date.parse(value) + offset).toISOString();
      return value.replaceAll('RANK-BRONZE', suffix);
    }));
    const tier = [...phone].reduce((sum, digit) => sum + Number(digit), 0) % 4;
    purchase.lines[0].unitPrice = [150000, 1250000, 6250000, 12500000][tier];
    purchase.lines[0].lineTotal = purchase.lines[0].unitPrice * purchase.lines[0].quantity;
    const subtotal = purchase.lines.reduce((sum, line) => sum + line.lineTotal, 0);
    purchase.totals = {subtotal, discount: 10000, shipping: 20000, tax: 0, grandTotal: subtotal + 10000};
    purchase.buyerSnapshot = structuredClone(latest.buyerSnapshot);
    purchase.shippingAddressSnapshot = structuredClone(latest.shippingAddressSnapshot);
    purchase.metadata.store = latest.metadata.store;
    purchase.metadata.tags = ['Demo cases', 'Customer purchase history'];
    purchase.metadata.notes = 'Synthetic completed purchase for the customer ranking demonstration.';
    purchase.activity[0].message = 'Completed customer purchase · Demo';
    purchase.operations.settlement = {platformFees: Math.round(subtotal * 0.08), sellerShipping: 20000, adjustments: 0, netAmount: subtotal - 10000 - Math.round(subtotal * 0.08) - 20000, status: 'settled'};
    return [purchase];
  });
}
