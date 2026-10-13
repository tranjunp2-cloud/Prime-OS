// Per-order sample stock only. These snapshots are not a shared warehouse ledger.
const activeStages = ['created', 'acknowledged', 'allocated', 'fulfillment_in_progress'];
const count = value => Number.isSafeInteger(value) && value >= 0;
const clone = value => JSON.parse(JSON.stringify(value));

function stockGroups(order) {
  const groups = new Map();
  if (!order.lines.length || !order.metadata.warehouse || order.metadata.warehouse === 'Unassigned') return null;
  for (const line of order.lines) {
    const stock = line.inventory;
    if (!line.sku || !count(line.quantity) || !line.quantity || !stock || stock.warehouse !== order.metadata.warehouse
      || !count(stock.onHand) || !count(stock.committed) || !count(stock.reservedForOrder)) return null;
    const key = `${stock.warehouse}:${line.sku}`;
    const group = groups.get(key) || {lines: [], stock, quantity: 0, reserved: 0};
    if (group.stock.onHand !== stock.onHand || group.stock.committed !== stock.committed) return null;
    group.lines.push(line);
    group.quantity += line.quantity;
    group.reserved += stock.reservedForOrder;
    groups.set(key, group);
  }
  const values = [...groups.values()];
  return values.some(group => group.reserved > group.stock.committed || group.reserved > group.quantity) ? null : values;
}

function record(order, at, message) {
  order.activity.unshift({id: `${order.id}-stock-${order.activity.length}`, at, actor: 'Inventory simulator', message});
}

/** Reserve the whole order atomically; committed already includes this order's hold. */
export function reserveDemoStock(order, at) {
  if (order.source !== 'demo' || !activeStages.includes(order.canonicalStatus)) return order;
  // Missing inventory remains unknown; never fabricate a successful reservation.
  if (!order.lines.some(line => line.inventory) && !order.reservation) return order;
  const result = clone(order);
  result.prototypeStockVersion = 1;
  const groups = stockGroups(result);
  if (!groups || result.syncError) {
    result.reservation = 'Not reported';
    return result;
  }
  if (groups.some(group => group.stock.onHand - group.stock.committed + group.reserved < group.quantity)) {
    result.reservation = 'Allocation failed';
    return result;
  }
  let added = 0;
  for (const group of groups) {
    const extra = group.quantity - group.reserved;
    added += extra;
    const committed = group.stock.committed + extra;
    for (const line of group.lines) line.inventory = {...line.inventory, committed, reservedForOrder: line.quantity, ...(extra ? {checkedAt: at} : {})};
  }
  result.reservation = 'Reserved';
  if (added) record(result, at, `Stock reserved for this order · ${added} units`);
  return result;
}

/** Release a hold without changing on-hand; dispatch consumes both on-hand and the hold. */
export function settleDemoStock(order, at, dispatch = false) {
  if (order.source !== 'demo') return order;
  if (order.reservation === (dispatch ? 'Dispatched' : 'Released') && order.lines.every(line => line.inventory?.reservedForOrder === 0)) return order;
  if (!order.lines.some(line => line.inventory) && !order.reservation) return order;
  const result = clone(order);
  const groups = stockGroups(result);
  if (!groups || (dispatch && groups.some(group => group.reserved !== group.quantity || group.stock.onHand < group.reserved))) {
    result.reservation = 'Not reported';
    return result;
  }
  let changed = 0;
  for (const group of groups) {
    changed += group.reserved;
    const committed = group.stock.committed - group.reserved;
    const onHand = group.stock.onHand - (dispatch ? group.reserved : 0);
    for (const line of group.lines) line.inventory = {...line.inventory, onHand, committed, reservedForOrder: 0, checkedAt: at};
  }
  result.prototypeStockVersion = 1;
  result.reservation = dispatch ? 'Dispatched' : 'Released';
  if (changed) record(result, at, `${dispatch ? 'Stock dispatched' : 'Stock reservation released'} · ${changed} units`);
  return result;
}

/** Preserve saved progress while upgrading old demo stock once. */
export function hydrateDemoStock(order, at = new Date().toISOString()) {
  if (order.source !== 'demo') return order;
  let result = order;
  if (!order.prototypeStockVersion) {
    if (activeStages.includes(order.canonicalStatus)) result = reserveDemoStock(order, at);
    else if (order.canonicalStatus === 'canceled') result = settleDemoStock(order, at);
    else if (['shipped', 'delivered', 'closed'].includes(order.canonicalStatus) && order.lines.some(line => line.inventory?.reservedForOrder > 0)) result = settleDemoStock(order, at, true);
  }
  if (activeStages.includes(result.canonicalStatus) && result.reservation === 'Reserved'
    && result.reservationExpiresAt && Date.parse(result.reservationExpiresAt) <= Date.parse(at)) {
    result = settleDemoStock(result, at);
    // Only report release when the reservation quantities were known.
    if (result.reservation === 'Released') {
      result.reservation = 'Reservation expired';
      record(result, at, 'Stock hold expired. Review stock before confirming or preparing.');
    }
  }
  return result;
}

export function moveDemoStockWarehouse(order, warehouse, at) {
  if (order.source !== 'demo') return order;
  if (order.metadata.warehouse === warehouse) return order;
  const result = settleDemoStock(order, at);
  if (result.reservation !== 'Released' && order.lines.some(line => line.inventory?.reservedForOrder > 0)) {
    throw new Error('Review the existing stock reservation before changing warehouse.');
  }
  // The previous warehouse's snapshot cannot be used to promise stock at the new one.
  return {...result, prototypeStockVersion: 1, metadata: {...result.metadata, warehouse}, reservation: 'Not reported',
    lines: result.lines.map(line => ({...line, inventory: undefined}))};
}
