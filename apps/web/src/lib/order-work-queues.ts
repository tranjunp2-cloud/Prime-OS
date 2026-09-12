import type { OrderRecord } from './orders-api';
export type OrderQueue = 'all' | 'draft' | 'pending' | 'ready' | 'shipping' | 'completed' | 'returns' | 'cancelled';
export const workQueues: {key:OrderQueue;label:string}[] = [{key:'all',label:'All'},{key:'pending',label:'To Confirm'},{key:'ready',label:'To Ship'},{key:'shipping',label:'In Transit'},{key:'completed',label:'Completed'},{key:'returns',label:'Returns'},{key:'cancelled',label:'Cancelled'}];
export function orderQueue(order:OrderRecord):OrderQueue {
  if(order.canonicalStatus==='draft') return 'draft';
  if(order.returnRequests.length || order.payment.state==='Refunded' || order.shipments.some(s=>s.deliveryOutcome==='returning'||s.deliveryOutcome==='returned')) return 'returns';
  if(order.canonicalStatus==='canceled') return 'cancelled';
  if(order.canonicalStatus==='created') return 'pending';
  if(['acknowledged','allocated','fulfillment_in_progress'].includes(order.canonicalStatus)) return 'ready';
  if(['partially_shipped','shipped'].includes(order.canonicalStatus)) return 'shipping';
  return 'completed';
}
export const queueFilters:Partial<Record<OrderQueue,{key:string;label:string}[]>>={
  pending:[{key:'awaiting-payment',label:'Awaiting payment'},{key:'review',label:'Needs review'}],
  ready:[{key:'preparing',label:'Processing'},{key:'pickup',label:'Ready to Ship'}],
  shipping:[{key:'transit',label:'In transit'},{key:'failed',label:'Failed delivery / Retry'}],
  completed:[{key:'delivered',label:'Delivered · Awaiting completion'},{key:'settled',label:'Settlement received'},{key:'closed',label:'Order closed'}],
  returns:[{key:'requested',label:'Return requested'},{key:'returning',label:'Returning to warehouse'},{key:'received',label:'Return received'},{key:'refunded',label:'Refunded'}],
};
export function matchesQueueFilter(order:OrderRecord,filter:string) {
  switch(filter){
    case 'awaiting-payment':return order.payment.state==='Unpaid';
    case 'review':return Boolean(order.hold?.active||order.exceptions.some(e=>e.status==='open')||order.needsPaymentVerification);
    case 'preparing':return !order.readyForPickup;
    case 'pickup':return Boolean(order.readyForPickup);
    case 'failed':return order.shipments.some(s=>s.deliveryOutcome==='failed');
    case 'transit':return !order.shipments.some(s=>s.deliveryOutcome==='failed');
    case 'delivered':return order.canonicalStatus==='delivered';
    case 'settled':return order.operations?.settlement?.status==='settled';
    case 'closed':return order.canonicalStatus==='closed';
    case 'requested':return order.returnRequests.some(r=>['requested','authorized'].includes(r.status));
    case 'returning':return order.shipments.some(s=>s.deliveryOutcome==='returning');
    case 'received':return order.returnRequests.some(r=>['received','inspected','disposed','closed'].includes(r.status))||order.shipments.some(s=>s.deliveryOutcome==='returned');
    case 'refunded':return order.payment.state==='Refunded';
    default:return true;
  }
}
