// Browser-safe validation shared by real orders and the local prototype.
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function text(value, label, required = false) {
  if (typeof value !== 'string' || value.length > 1000 || (required && !value.trim())) fail(`${label} is required or invalid.`);
  return value.trim();
}
function amount(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12) fail(`${label} must be a non-negative number.`);
  return value;
}
export function validateManualOrder(input) {
  if (!input || typeof input !== 'object') fail('Invalid order payload.');
  const currencyCode = input.currencyCode || 'VND';
  if (!['VND', 'USD', 'JPY', 'SGD', 'MYR'].includes(currencyCode)) fail('Unsupported currency.');
  if (!['draft', 'created'].includes(input.canonicalStatus)) fail('New orders must be draft or created.');
  const buyer = input.buyerSnapshot || {};
  const address = input.shippingAddressSnapshot || {};
  const customer = text(buyer.name, 'Customer name', true);
  const phone = text(buyer.phone || '', 'Phone', true);
  const email = text(buyer.email || '', 'Email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Invalid email address.');
  const shippingAddressSnapshot = { address: text(address.address, 'Delivery address', true), city: text(address.city, 'City', true), country: text(address.country, 'Country', true), postalCode: text(address.postalCode || '', 'Postal code') };
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 100) fail('Add 1–100 order items.');
  const precision = ['VND', 'JPY'].includes(currencyCode) ? 0 : 2;
  const round = (n) => Math.round(n * 10 ** precision) / 10 ** precision;
  const lines = input.lines.map((line, index) => {
    if (!line || typeof line !== 'object') fail(`Item ${index + 1} is invalid.`);
    const quantity = line.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) fail(`Item ${index + 1}: quantity must be a positive integer.`);
    const unitPrice = round(amount(line.unitPrice, 'Unit price'));
    return { id: `ol_${crypto.randomUUID()}`, lineKey: `line-${index + 1}`, sku: text(line.sku, 'SKU', true), name: text(line.name, 'Product name', true), quantity, unitPrice, lineTotal: round(quantity * unitPrice), status: 'open' };
  });
  const subtotal = round(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const discount = round(amount(input.totals?.discount ?? 0, 'Discount'));
  const shipping = round(amount(input.totals?.shipping ?? 0, 'Shipping'));
  const tax = round(amount(input.totals?.tax ?? 0, 'Tax'));
  if (discount > subtotal) fail('Discount cannot exceed subtotal.');
  if (!['Unpaid', 'Paid'].includes(input.payment?.state)) fail('Invalid payment state.');
  if (!['COD', 'Bank transfer', 'Cash', 'Card'].includes(input.payment?.method)) fail('Invalid payment method.');
  if (input.payment.state === 'Paid' && !input.payment.reference?.trim()) fail('Payment reference is required for a paid order.');
  const handlingType = input.metadata?.handlingType ?? 'self';
  if (!['self', 'marketplace'].includes(handlingType)) fail('Invalid handling type.');
  const shippingMode = input.metadata?.shippingMode || 'seller';
  if (!['seller', 'platform'].includes(shippingMode)) fail('Invalid shipping mode.');
  return { orderKey: text(input.orderKey, 'Order reference', true), canonicalStatus: input.canonicalStatus, currencyCode, buyerSnapshot: { name: customer, phone, email }, shippingAddressSnapshot, lines, totals: { subtotal, discount, shipping, tax, grandTotal: round(subtotal - discount + shipping + tax) }, payment: { state: input.payment.state, method: input.payment.method, reference: text(input.payment.reference || '', 'Payment reference') }, metadata: { handlingType, shippingMode, store: text(input.metadata?.store || 'Manual', 'Store'), warehouse: text(input.metadata?.warehouse || 'Unassigned', 'Warehouse'), assignee: text(input.metadata?.assignee || 'Unassigned', 'Assignee'), notes: text(input.metadata?.notes || '', 'Notes'), tags: text(input.metadata?.tags || '', 'Tags').split(',').map((t) => t.trim()).filter(Boolean) } };
}
