import type { OrderRecord } from './orders-api';

export function printPackingSlips(orders: OrderRecord[]) {
  if (orders.some(order=>order.hold?.active)) throw new Error('Release held orders before printing packing slips.');
  const popup = window.open('', '_blank'); if (!popup) throw new Error('Allow pop-ups to print packing slips.');
  popup.document.title = 'Packing slips';
  for (const order of orders) {
    const section = popup.document.createElement('section'); section.style.breakAfter = 'page';
    const title = popup.document.createElement('h1'); title.textContent = `Packing slip — ${order.orderKey}`; section.append(title);
    const body = popup.document.createElement('pre'); body.style.whiteSpace = 'pre-wrap';
    body.textContent = [order.buyerSnapshot.name, order.buyerSnapshot.phone, ...Object.values(order.shippingAddressSnapshot), '', ...order.lines.map((l) => `${l.sku} — ${l.name} × ${l.quantity}`), '', order.metadata.notes].join('\n'); section.append(body); popup.document.body.append(section);
  }
  popup.document.close(); popup.focus(); popup.print();
}
