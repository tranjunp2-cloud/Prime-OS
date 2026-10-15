import { useSyncExternalStore } from 'react';

// One local demo ledger, shared by Main and POS. No payment or device APIs are called.
export type Product = { id: string; sku: string; name: string; category: string; price: number; cost: number; kind: 'retail' | 'cafe'; color: string };
export type Store = { id: string; name: string; address: string; warehouse: string; mode: 'retail' | 'cafe'; registers: string[]; assortment: string[]; discountLimit: number; returnDays: number };
export type Customer = { id: string; name: string; phone: string };
export type Line = { productId: string; quantity: number };
export type Cart = { id: string; lines: Line[]; customerId: string; discount: number; tableId?: string };
export type Shift = { id: string; storeId: string; register: string; cashier: string; opening: number; openedAt: string; closedAt?: string; counted?: number; expected?: number; note?: string };
export type CashMove = { id: string; shiftId: string; amount: number; reason: string; at: string };
export type SaleLine = Line & { name: string; sku: string; price: number };
export type Refund = { id: string; shiftId: string; at: string; quantities: Record<string, number>; amount: number; reason: string; restock: boolean };
export type Sale = { id: string; number: string; storeId: string; register: string; shiftId: string; at: string; customerId: string; lines: SaleLine[]; discount: number; subtotal: number; total: number; method: 'cash' | 'card'; tendered: number; refunds: Refund[]; table?: string };
export type Receipt = { id: string; storeId: string; supplier: string; productId: string; quantity: number; status: 'in_transit' | 'received'; receivedQuantity?: number; note?: string; at: string };
export type Ticket = { id: string; storeId: string; table: string; lines: Line[]; status: 'queued' | 'preparing' | 'ready' | 'served'; at: string };
export type Activity = { id: string; at: string; storeId: string; message: string };
export type PosState = {
  version: 1; stores: Store[]; products: Product[]; customers: Customer[]; stock: Record<string, number>;
  selectedStore: string; register: string; cashier: string; role: 'manager' | 'cashier';
  carts: Record<string, Cart>; held: Array<Cart & { storeId: string; register: string }>;
  shifts: Shift[]; cashMoves: CashMove[]; sales: Sale[]; receipts: Receipt[]; tickets: Ticket[];
  devices: Record<string, string[]>; activity: Activity[];
};
export const POS_STORAGE_KEY = 'prime.pos-demo.v1';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
export const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const stockKey = (storeId: string, productId: string) => `${storeId}:${productId}`;
export const cartKey = (s: PosState) => `${s.selectedStore}:${s.register}`;
const emptyCart = (): Cart => ({ id: uid(), lines: [], customerId: '', discount: 0 });

export function seedPos(): PosState {
  const products: Product[] = [
    { id: 'tote', sku: 'ESS-001', name: 'Everyday canvas tote', category: 'Accessories', price: 24, cost: 11, kind: 'retail', color: 'sand' },
    { id: 'tee', sku: 'ESS-002', name: 'Essential cotton tee', category: 'Clothing', price: 32, cost: 14, kind: 'retail', color: 'sage' },
    { id: 'bottle', sku: 'ESS-003', name: 'Insulated water bottle', category: 'Lifestyle', price: 28, cost: 12, kind: 'retail', color: 'blue' },
    { id: 'cap', sku: 'ESS-004', name: 'Weekend cotton cap', category: 'Accessories', price: 22, cost: 9, kind: 'retail', color: 'rose' },
    { id: 'notebook', sku: 'ESS-005', name: 'Daily notes journal', category: 'Lifestyle', price: 16, cost: 6, kind: 'retail', color: 'lavender' },
    { id: 'hoodie', sku: 'ESS-006', name: 'Relaxed everyday hoodie', category: 'Clothing', price: 64, cost: 30, kind: 'retail', color: 'slate' },
    { id: 'mug', sku: 'ESS-007', name: 'Studio ceramic mug', category: 'Home', price: 18, cost: 7, kind: 'retail', color: 'sand' },
    { id: 'candle', sku: 'ESS-008', name: 'Sunday scented candle', category: 'Home', price: 26, cost: 10, kind: 'retail', color: 'rose' },
    { id: 'latte', sku: 'CAF-001', name: 'Oat milk latte', category: 'Coffee', price: 5, cost: 2, kind: 'cafe', color: 'sand' },
    { id: 'espresso', sku: 'CAF-002', name: 'Double espresso', category: 'Coffee', price: 3, cost: 1, kind: 'cafe', color: 'slate' },
    { id: 'matcha', sku: 'CAF-003', name: 'Iced matcha latte', category: 'Tea', price: 6, cost: 2, kind: 'cafe', color: 'sage' },
    { id: 'croissant', sku: 'CAF-004', name: 'Butter croissant', category: 'Bakery', price: 4, cost: 1.5, kind: 'cafe', color: 'rose' },
  ];
  const stores: Store[] = [
    { id: 'central', name: 'Central Flagship', address: '28 Nguyen Hue, District 1', warehouse: 'Central stockroom', mode: 'retail', registers: ['Register 01', 'Register 02'], assortment: products.filter(p => p.kind === 'retail').map(p => p.id), discountLimit: 10, returnDays: 30 },
    { id: 'riverside', name: 'Riverside Café', address: '12 Thao Dien, Thu Duc', warehouse: 'Riverside stockroom', mode: 'cafe', registers: ['Counter 01'], assortment: products.filter(p => p.kind === 'cafe').map(p => p.id), discountLimit: 10, returnDays: 7 },
  ];
  return { version: 1, products, stores, customers: [{ id: 'linh', name: 'Linh Nguyen', phone: '0901234567' }, { id: 'minh', name: 'Minh Tran', phone: '0912345678' }], stock: Object.fromEntries(stores.flatMap(s => s.assortment.map((id, i) => [stockKey(s.id, id), i === 5 ? 0 : 24 + i * 3]))), selectedStore: 'central', register: 'Register 01', cashier: 'Alex Nguyen', role: 'manager', carts: {}, held: [], shifts: [], cashMoves: [], sales: [], receipts: [{ id: 'PO-1001', storeId: 'central', supplier: 'Everyday Supply Co.', productId: 'hoodie', quantity: 12, status: 'in_transit', at: now() }], tickets: [], devices: {}, activity: [] };
}
let snapshot: PosState | undefined;
const listeners = new Set<() => void>();
export function getPos(): PosState {
  if (!snapshot) {
    try { const saved = JSON.parse(localStorage.getItem(POS_STORAGE_KEY) || 'null'); if (saved?.version === 1 && Array.isArray(saved.stores)) snapshot = saved; } catch { /* Start a new demo if no valid snapshot is available. */ }
    snapshot ??= seedPos();
  }
  return snapshot;
}
export function savePos(next: PosState) {
  localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next)); // Fail before publishing if storage is full.
  snapshot = next; listeners.forEach(listener => listener());
}
export function changePos(fn: (draft: PosState) => void) { const draft = structuredClone(getPos()); fn(draft); savePos(draft); }
function subscribe(listener: () => void) { listeners.add(listener); const sync = (e: StorageEvent) => { if (e.key === POS_STORAGE_KEY) { snapshot = undefined; listener(); } }; window.addEventListener('storage', sync); return () => { listeners.delete(listener); window.removeEventListener('storage', sync); }; }
export function usePos() { return useSyncExternalStore(subscribe, getPos, getPos); }
export function resetPosCache() { snapshot = undefined; }
export const currentStore = (s: PosState) => s.stores.find(store => store.id === s.selectedStore)!;
export const activeShift = (s: PosState) => s.shifts.find(shift => shift.storeId === s.selectedStore && shift.register === s.register && !shift.closedAt);
export const currentCart = (s: PosState): Cart => s.carts[cartKey(s)] ?? { id: '', lines: [], customerId: '', discount: 0 };
const ensureCart = (s: PosState) => s.carts[cartKey(s)] ??= emptyCart();
function log(s: PosState, message: string, storeId = s.selectedStore) { s.activity.unshift({ id: uid(), at: now(), storeId, message }); }
function requireManager(s: PosState) { if (s.role !== 'manager') throw new Error('Switch to the store manager demo to change shared settings.'); }
function requireShift(s: PosState) { const shift = activeShift(s); if (!shift) throw new Error('Open a shift before taking payments or recording cash.'); return shift; }
function amount(n: number, allowZero = true) { if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) throw new Error('Enter a valid amount.'); }
export function selectStore(id: string, register?: string) { changePos(s => { const store = s.stores.find(x => x.id === id); if (!store) throw new Error('Store not found.'); s.selectedStore = id; s.register = register && store.registers.includes(register) ? register : store.registers[0]; }); }
export function setCartLine(id: string, quantity: number) { changePos(s => { if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Enter a whole quantity.'); if (!currentStore(s).assortment.includes(id)) throw new Error('This product is not available at this store.'); if (quantity > (s.stock[stockKey(s.selectedStore, id)] ?? 0)) throw new Error('Not enough stock at this store.'); const cart = ensureCart(s); cart.lines = cart.lines.filter(l => l.productId !== id); if (quantity) cart.lines.push({ productId: id, quantity }); }); }
export function editCart(update: Partial<Pick<Cart, 'customerId' | 'discount'>>) { changePos(s => { if (update.discount !== undefined && (!Number.isFinite(update.discount) || update.discount < 0 || update.discount > currentStore(s).discountLimit)) throw new Error(`Discount must be between 0 and ${currentStore(s).discountLimit}%.`); Object.assign(ensureCart(s), update); }); }
export function clearCart() { changePos(s => { s.carts[cartKey(s)] = emptyCart(); }); }
export function holdCart() { changePos(s => { const cart = ensureCart(s); if (!cart.lines.length) throw new Error('Add a product first.'); if (cart.tableId) throw new Error('This table order is already saved.'); s.held.unshift({ ...cart, storeId: s.selectedStore, register: s.register }); s.carts[cartKey(s)] = emptyCart(); }); }
export function resumeCart(id: string) { changePos(s => { const held = s.held.find(c => c.id === id && c.storeId === s.selectedStore); if (!held) throw new Error('Held cart not found.'); const cart = ensureCart(s); if (cart.lines.length) { if (cart.tableId) throw new Error('Finish the table checkout first.'); s.held.push({ ...cart, storeId: s.selectedStore, register: s.register }); } s.carts[cartKey(s)] = { ...held }; s.held = s.held.filter(c => c.id !== id); }); }
export function addCustomer(name: string, phone: string) { let id = ''; changePos(s => { if (!name.trim() || !phone.trim()) throw new Error('Enter the customer name and phone number.'); const existing = s.customers.find(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')); id = existing?.id ?? uid(); if (!existing) s.customers.push({ id, name: name.trim(), phone: phone.trim() }); ensureCart(s).customerId = id; }); return id; }
export function cartTotals(s: PosState, cart = currentCart(s)) { const subtotal = round(cart.lines.reduce((sum, line) => sum + (s.products.find(p => p.id === line.productId)?.price ?? 0) * line.quantity, 0)); const discount = round(subtotal * cart.discount / 100); return { subtotal, discount, total: round(subtotal - discount) }; }
export function openShift(opening: number) { changePos(s => { amount(opening); if (activeShift(s)) throw new Error('This register already has an open shift.'); s.shifts.unshift({ id: uid(), storeId: s.selectedStore, register: s.register, cashier: s.cashier, opening: round(opening), openedAt: now() }); log(s, `Opened ${s.register} with ${money(opening)}`); }); }
export function expectedCash(s: PosState, shift: Shift) { return round(shift.opening + s.sales.filter(sale => sale.shiftId === shift.id && sale.method === 'cash').reduce((sum, sale) => sum + sale.total, 0) - s.sales.filter(sale => sale.method === 'cash').flatMap(sale => sale.refunds).filter(refund => refund.shiftId === shift.id).reduce((sum, refund) => sum + refund.amount, 0) + s.cashMoves.filter(m => m.shiftId === shift.id).reduce((sum, m) => sum + m.amount, 0)); }
export function recordCash(value: number, direction: 'in' | 'out', reason: string) { changePos(s => { const shift = requireShift(s); amount(value, false); if (!reason.trim()) throw new Error('Add a reason for this cash movement.'); if (direction === 'out' && value > expectedCash(s, shift)) throw new Error('Cash out exceeds the expected drawer balance.'); s.cashMoves.unshift({ id: uid(), shiftId: shift.id, amount: direction === 'out' ? -round(value) : round(value), reason: reason.trim(), at: now() }); log(s, `Cash ${direction}: ${money(value)} · ${reason}`); }); }
export function closeShift(counted: number, note: string) { changePos(s => { const shift = requireShift(s); amount(counted); const expected = expectedCash(s, shift); if (round(counted - expected) !== 0 && !note.trim()) throw new Error('Explain the cash difference before closing the shift.'); if (currentCart(s).lines.length) throw new Error('Complete or hold the current cart before closing.'); Object.assign(shift, { counted: round(counted), expected, note: note.trim(), closedAt: now() }); log(s, `Closed ${shift.register} · difference ${money(counted - expected)}`); }); }
export function checkout(method: Sale['method'], tendered: number, requestId: string): Sale {
  const prior = getPos().sales.find(sale => sale.id === requestId); if (prior) return prior;
  let sale!: Sale;
  changePos(s => {
    const shift = requireShift(s), cart = currentCart(s), store = currentStore(s);
    if (!cart.lines.length || cart.id !== requestId) throw new Error('The cart has changed. Review it before payment.');
    if (cart.discount > store.discountLimit) throw new Error('The discount policy changed. Review the discount.');
    if (method !== 'cash' && method !== 'card') throw new Error('Select a payment method.');
    const totals = cartTotals(s); amount(tendered);
    if (method === 'cash' && tendered < totals.total) throw new Error('Cash received must cover the total.');
    for (const line of cart.lines) {
      if (!store.assortment.includes(line.productId)) throw new Error('A product was removed from this store. Review your cart.');
      const key = stockKey(store.id, line.productId); if ((s.stock[key] ?? 0) < line.quantity) throw new Error('Stock changed. Review available quantities.'); s.stock[key] -= line.quantity;
    }
    sale = { id: cart.id, number: `POS-${String(1049 + s.sales.length)}`, storeId: store.id, register: s.register, shiftId: shift.id, at: now(), customerId: cart.customerId, lines: cart.lines.map(line => { const p = s.products.find(p => p.id === line.productId)!; return { ...line, name: p.name, sku: p.sku, price: p.price }; }), ...totals, method, tendered: method === 'cash' ? round(tendered) : totals.total, refunds: [], table: cart.tableId };
    s.sales.unshift(sale); s.carts[cartKey(s)] = emptyCart();
    if (cart.tableId) s.tickets = s.tickets.filter(t => !(t.storeId === store.id && t.table === cart.tableId));
    log(s, `${sale.number} completed · ${money(sale.total)} · ${method}`);
  });
  return sale;
}
export const returnedQty = (sale: Sale, id: string) => sale.refunds.reduce((sum, r) => sum + (r.quantities[id] || 0), 0);
export function refundTotal(sale: Sale, quantities: Record<string, number>) {
  // Cumulative per-line rounding ensures a series of partial refunds never exceeds the paid total.
  const netLines = sale.lines.map((line, index) => index === sale.lines.length - 1 ? 0 : round(line.price * line.quantity * (sale.total / sale.subtotal)));
  if (netLines.length) netLines[netLines.length - 1] = round(sale.total - netLines.reduce((a, b) => a + b, 0));
  return round(sale.lines.reduce((sum, line, index) => { const before = returnedQty(sale, line.productId), after = before + (quantities[line.productId] || 0); return sum + round(netLines[index] * after / line.quantity) - round(netLines[index] * before / line.quantity); }, 0));
}
export function refundSale(id: string, quantities: Record<string, number>, reason: string, restock: boolean) { changePos(s => {
  const shift = requireShift(s), sale = s.sales.find(sale => sale.id === id); if (!sale || sale.storeId !== s.selectedStore) throw new Error('Select a sale from this store.');
  if ((Date.now() - Date.parse(sale.at)) / 86400000 > currentStore(s).returnDays) throw new Error('This sale is outside the return window.');
  if (!reason.trim()) throw new Error('Select a return reason.');
  if (Object.entries(quantities).some(([id, qty]) => !Number.isSafeInteger(qty) || qty < 0 || !sale.lines.some(line => line.productId === id))) throw new Error('Enter valid return quantities.');
  const entries = Object.entries(quantities).filter(([, qty]) => qty > 0); if (!entries.length) throw new Error('Select at least one item to return.');
  for (const [productId, qty] of entries) { const line = sale.lines.find(l => l.productId === productId); if (!line || !Number.isSafeInteger(qty) || qty > line.quantity - returnedQty(sale, productId)) throw new Error('Return quantity exceeds the remaining quantity.'); }
  const value = refundTotal(sale, quantities); if (sale.method === 'cash' && value > expectedCash(s, shift)) throw new Error('Insufficient cash in this drawer. Add a cash float before refunding.');
  sale.refunds.push({ id: uid(), shiftId: shift.id, at: now(), quantities: Object.fromEntries(entries), amount: value, reason, restock });
  if (restock) for (const [productId, qty] of entries) s.stock[stockKey(sale.storeId, productId)] = (s.stock[stockKey(sale.storeId, productId)] ?? 0) + qty;
  log(s, `${sale.number} refunded ${money(value)} · ${restock ? 'Returned to stock' : 'Held for inspection'}`);
}); }
export function saveStore(input: Store) { changePos(s => { requireManager(s); if (!input.name.trim() || !input.warehouse.trim() || !input.registers.length || input.registers.some(r => !r.trim())) throw new Error('Enter a store name, stock location and at least one register.'); if (new Set(input.registers).size !== input.registers.length) throw new Error('Register names must be unique within a store.'); if (input.discountLimit < 0 || input.discountLimit > 100 || !Number.isFinite(input.discountLimit) || !Number.isInteger(input.returnDays) || input.returnDays < 0) throw new Error('Review discount and return policy values.'); const previous = s.stores.find(x => x.id === input.id); if (previous && s.shifts.some(shift => shift.storeId === input.id && !shift.closedAt) && (previous.warehouse !== input.warehouse || previous.mode !== input.mode || previous.registers.join() !== input.registers.join())) throw new Error('Close this store’s shifts before changing its stock location, mode or registers.'); if (previous) Object.assign(previous, input); else s.stores.push(input); if (s.selectedStore === input.id && !input.registers.includes(s.register)) s.register = input.registers[0]; log(s, `Updated ${input.name} settings`, input.id); }); }
export function updateProduct(id: string, price: number) { changePos(s => { requireManager(s); amount(price, false); const product = s.products.find(p => p.id === id); if (!product) throw new Error('Product not found.'); product.price = round(price); log(s, `Updated shared price for ${product.name}`); }); }
export function createReceipt(storeId: string, productId: string, quantity: number, supplier: string) { changePos(s => { requireManager(s); if (!supplier.trim() || !Number.isSafeInteger(quantity) || quantity < 1 || !s.products.some(p => p.id === productId) || !s.stores.some(store => store.id === storeId)) throw new Error('Enter a supplier, product and whole quantity greater than zero.'); s.receipts.unshift({ id: `PO-${1001 + s.receipts.length}`, storeId, productId, quantity, supplier: supplier.trim(), status: 'in_transit', at: now() }); log(s, `Created inbound shipment from ${supplier}`, storeId); }); }
export function receiveStock(id: string, quantity: number, note: string) { changePos(s => { const receipt = s.receipts.find(r => r.id === id); if (!receipt || receipt.status !== 'in_transit' || receipt.storeId !== s.selectedStore) throw new Error('This shipment is not awaiting receipt at this store.'); if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > receipt.quantity) throw new Error('Received quantity must be between zero and the expected quantity.'); if (quantity !== receipt.quantity && !note.trim()) throw new Error('Explain the receiving difference.'); Object.assign(receipt, { status: 'received', receivedQuantity: quantity, note }); const key = stockKey(receipt.storeId, receipt.productId); s.stock[key] = (s.stock[key] ?? 0) + quantity; log(s, `${receipt.id} received · ${quantity} units${note ? ` · ${note}` : ''}`); }); }
function tableAtCheckout(s: PosState, table: string) { return Object.entries(s.carts).some(([key, cart]) => key.startsWith(`${s.selectedStore}:`) && cart.tableId === table); }
export function sendToKitchen(table: string) { changePos(s => { requireShift(s); const cart = ensureCart(s); if (currentStore(s).mode !== 'cafe' || !cart.lines.length || !['01', '02', '03', '04', '05', '06'].includes(table)) throw new Error('Select a table and add items.'); if (cart.tableId) throw new Error('This order has already been sent to the kitchen.'); if (tableAtCheckout(s, table)) throw new Error('This table is being checked out. Finish payment before adding items.'); s.tickets.unshift({ id: uid(), storeId: s.selectedStore, table, lines: cart.lines, status: 'queued', at: now() }); s.carts[cartKey(s)] = emptyCart(); log(s, `Table ${table} sent to kitchen`); }); }
export function advanceTicket(id: string) { changePos(s => { const ticket = s.tickets.find(t => t.id === id && t.storeId === s.selectedStore); if (!ticket) throw new Error('Ticket not found.'); ticket.status = ({ queued: 'preparing', preparing: 'ready', ready: 'served', served: 'served' } as const)[ticket.status]; }); }
export function moveTable(from: string, to: string) { changePos(s => { if (from === to || !['01', '02', '03', '04', '05', '06'].includes(to)) throw new Error('Choose another table.'); if (tableAtCheckout(s, from) || tableAtCheckout(s, to)) throw new Error('Finish the current table checkout before moving tables.'); s.tickets.filter(t => t.storeId === s.selectedStore && t.table === from).forEach(t => { t.table = to; }); log(s, `Moved / merged table ${from} into table ${to}`); }); }
export function checkoutTable(table: string) { changePos(s => { const tickets = s.tickets.filter(t => t.storeId === s.selectedStore && t.table === table); if (!tickets.length) throw new Error('No order on this table.'); if (tableAtCheckout(s, table)) throw new Error('This table is already at checkout.'); if (currentCart(s).lines.length) throw new Error('Complete or hold your current cart first.'); const lines: Line[] = []; for (const ticket of tickets) for (const line of ticket.lines) { const existing = lines.find(l => l.productId === line.productId); if (existing) existing.quantity += line.quantity; else lines.push({ ...line }); } s.carts[cartKey(s)] = { ...emptyCart(), lines, tableId: table }; }); }
