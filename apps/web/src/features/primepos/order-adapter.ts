import type { OrderRecord } from '@/lib/orders-api';
import { getPos, type PosState } from './store';

/** Read-through projection: Main Orders and Customers use the same POS ledger, never a second copy. */
export function posDemoOrders(state: PosState = getPos()): OrderRecord[] {
  return state.sales.map(sale => {
    const store = state.stores.find(store => store.id === sale.storeId)!;
    const customer = state.customers.find(customer => customer.id === sale.customerId);
    const refunded = Math.round(sale.refunds.reduce((n, r) => n + r.amount, 0) * 100) / 100;
    return {
      id: sale.id, orderKey: sale.number, requestKey: sale.id, source: 'pos-demo', version: 1 + sale.refunds.length,
      canonicalStatus: 'closed', currencyCode: sale.currency || 'USD', orderedAt: sale.at,
      buyerSnapshot: { name: customer?.name ?? 'Walk-in customer', phone: customer?.phone ?? '', phoneCountry: 'VN', email: '' },
      shippingAddressSnapshot: { address: store.address, city: 'Ho Chi Minh City', country: 'VN', postalCode: '' },
      lines: sale.lines.map(line => ({id:line.productId,sku:line.sku,name:line.name,quantity:line.quantity,unitPrice:line.price,lineTotal:line.quantity*line.price})),
      totals: { subtotal:sale.subtotal,discount:sale.discount,tax:0,shipping:0,grandTotal:sale.total },
      payment: { state:refunded >= sale.total && sale.refunds.length ? 'refunded' : 'paid', method:sale.method,reference:sale.number,refundedMerchandiseAmount:refunded },
      metadata: { store:'Prime POS',storeName:store.name,platform:'pos',warehouse:store.warehouse,assignee:state.shifts.find(shift=>shift.id===sale.shiftId)?.cashier ?? state.cashier,notes:`In-store sale · ${sale.register}${sale.table ? ` · Table ${sale.table}` : ''}`,tags:['POS','Demo'],handlingType:'self' },
      transitions:[],shipments:[],exceptions:[],
      returnRequests:sale.refunds.map(r=>({id:r.id,status:'refunded',reason:r.reason,items:Object.entries(r.quantities).map(([id,quantity])=>({sku:sale.lines.find(line=>line.productId===id)?.sku,quantity}))})),
      activity:[{id:sale.id,at:sale.at,actor:'Prime POS',message:'Paid and collected at the counter (demo)'},...sale.refunds.map(r=>({id:r.id,at:r.at,actor:'Prime POS',message:`Refund recorded: ${r.reason}`}))],
    };
  });
}
