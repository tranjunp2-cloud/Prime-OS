import {expect,it} from 'vitest';
import {orderQueue,matchesQueueFilter,matchesOrderQueue,hasReturnHistory} from './order-work-queues';
import {getOrderAttention, type OrderRecord} from './orders-api';
const record=(extra:Partial<OrderRecord>)=>({canonicalStatus:'created',payment:{state:'Unpaid'},shipments:[],returnRequests:[],exceptions:[],...extra} as OrderRecord);
it('separates failed delivery, returns, refunds and pre-dispatch cancellation',()=>{
 const failed=record({canonicalStatus:'shipped',shipments:[{carrier:'GHN',tracking:'TEST',status:'Failed',deliveryOutcome:'failed'}]});
 expect(orderQueue(failed)).toBe('shipping');expect(matchesQueueFilter(failed,'failed')).toBe(true);
 expect(orderQueue({...failed,shipments:[{...failed.shipments[0],deliveryOutcome:'returning'}]})).toBe('returns');
 expect(orderQueue(record({canonicalStatus:'canceled'}))).toBe('cancelled');
 expect(orderQueue(record({canonicalStatus:'closed',returnRequests:[{id:'ret',status:'requested',reason:'Damaged',items:[]}]}))).toBe('returns');
});
it('keeps holds orthogonal to lifecycle and settlement independent of delivery',()=>{
 const held=record({canonicalStatus:'allocated',hold:{active:true,reason:'Check address',at:'2026-09-10',actor:'Admin'}});
 expect(orderQueue(held)).toBe('preparing');
 const delivered=record({canonicalStatus:'delivered'});
 expect(orderQueue(delivered)).toBe('delivered');
 expect(orderQueue({...delivered,operations:{settlement:{status:'settled',netAmount:1,platformFees:0,sellerShipping:0,adjustments:0}}})).toBe('delivered');
 expect(orderQueue(record({canonicalStatus:'draft'}))).toBe('draft');
});

it('keeps rejected and closed return history in its lifecycle group',()=>{
 for(const status of ['rejected','closed','canceled','cancelled']) {
  const order=record({canonicalStatus:'delivered',returnRequests:[{id:'r',status,reason:'Test',items:[]}]});
  expect(orderQueue(order)).toBe('delivered');
  expect(hasReturnHistory(order)).toBe(true);
 }
 expect(orderQueue(record({canonicalStatus:'canceled',payment:{state:'Refunded',method:'Card',reference:''}}))).toBe('cancelled');
 expect(orderQueue(record({canonicalStatus:'closed',payment:{state:'Refunded',method:'Card',reference:''}}))).toBe('returns');
});
it('excludes drafts from All and only considers packed orders ready for handoff',()=>{
 expect(matchesOrderQueue(record({canonicalStatus:'draft'}),'all')).toBe(false);
 expect(matchesOrderQueue(record({canonicalStatus:'draft'}),'draft')).toBe(true);
 const allocated=record({canonicalStatus:'allocated',readyForPickup:true});
 expect(matchesQueueFilter(allocated,'pickup')).toBe(false);
 expect(matchesQueueFilter(allocated,'preparing')).toBe(true);
 expect(matchesQueueFilter({...allocated,canonicalStatus:'fulfillment_in_progress'},'pickup')).toBe(true);
});
it('does not treat an unpaid COD order as waiting for prepayment',()=>{
 expect(matchesQueueFilter(record({payment:{state:'Unpaid',method:'COD',reference:''}}),'awaiting-payment')).toBe(false);
 expect(matchesQueueFilter(record({payment:{state:'Unpaid',method:'Bank transfer',reference:''}}),'awaiting-payment')).toBe(true);
});

it('keeps Preparing and Ready to ship exclusive and respects return and cancellation precedence',()=>{
 for(const canonicalStatus of ['acknowledged','allocated','fulfillment_in_progress'] as const) {
  const preparing=record({canonicalStatus});
  expect(orderQueue(preparing)).toBe('preparing');
  expect(matchesOrderQueue(preparing,'pickup')).toBe(false);
 }
 const ready=record({canonicalStatus:'fulfillment_in_progress',readyForPickup:true});
 expect(orderQueue(ready)).toBe('pickup');
 expect(matchesOrderQueue(ready,'preparing')).toBe(false);
 const returning={...ready,returnRequests:[{id:'return',status:'requested',reason:'Damaged',items:[]}]};
 expect(orderQueue(returning)).toBe('returns');
 expect(matchesQueueFilter(returning,'pickup')).toBe(false);
 expect(orderQueue({...ready,canonicalStatus:'canceled'})).toBe('cancelled');
});

it('finds unpaid non-COD orders across active stages but excludes drafts and closed orders',()=>{
 for(const canonicalStatus of ['created','acknowledged','allocated','fulfillment_in_progress','shipped','delivered'] as const) {
  expect(matchesQueueFilter(record({canonicalStatus,payment:{state:'Unpaid',method:'Bank transfer',reference:''}}),'awaiting-payment')).toBe(true);
 }
 for(const canonicalStatus of ['draft','closed','canceled'] as const) {
  expect(matchesQueueFilter(record({canonicalStatus,payment:{state:'Unpaid',method:'Bank transfer',reference:''}}),'awaiting-payment')).toBe(false);
 }
});

it.each<Partial<OrderRecord>>([
 {hold:{active:true,reason:'Check address',at:'2026-10-08',actor:'Admin'}},
 {needsPaymentVerification:true},
 {payment:{state:'Unpaid',method:'Bank transfer',reference:'TRANSFER-1'}},
 {canonicalStatus:'allocated',reservation:'Allocation failed'},
 {canonicalStatus:'fulfillment_in_progress',pickupOverdue:true},
 {sla:'Breached by 30m'},
 {syncError:true},
 {exceptions:[{id:'issue',summary:'Invalid address',status:'open',at:'2026-10-08'}]},
 {canonicalStatus:'shipped',shipments:[{carrier:'GHN',tracking:'TEST',status:'Failed',deliveryOutcome:'failed'}]},
])('includes operational issues in the unified review filter: %j',extra=>{
 expect(matchesQueueFilter(record(extra),'review')).toBe(true);
});

it('excludes routine unpaid orders and resolved payment checks from review',()=>{
 expect(matchesQueueFilter(record({payment:{state:'Unpaid',method:'COD',reference:''}}),'review')).toBe(false);
 expect(matchesQueueFilter(record({payment:{state:'Unpaid',method:'Bank transfer',reference:''}}),'review')).toBe(false);
 expect(matchesQueueFilter(record({payment:{state:'Paid',method:'Bank transfer',reference:'TRANSFER-1'},needsPaymentVerification:true}),'review')).toBe(false);
});

it.each(['requested','received','awaiting_inspection'])('flags return work awaiting seller review: %s',status=>{
 const returned=record({canonicalStatus:'delivered',returnRequests:[{id:'ret',status,reason:'Test',items:[]}]});
 expect(matchesQueueFilter(returned,'review')).toBe(true);
 expect(getOrderAttention(returned).some(issue=>issue.reviewAction==='Review return')).toBe(true);
});

it.each(['authorized','in_transit','closed','rejected','refunded'])('does not flag routine or resolved returns: %s',status=>{
 expect(matchesQueueFilter(record({canonicalStatus:'delivered',returnRequests:[{id:'ret',status,reason:'Test',items:[]}]}),'review')).toBe(false);
});

it('flags paid cancellations for refund review but leaves urgency-only actions available',()=>{
 const cancelled=record({canonicalStatus:'canceled',payment:{state:'Paid',method:'Bank transfer',reference:''}});
 expect(getOrderAttention(cancelled)).toContainEqual({code:'refund',reason:'Cancelled order with payment received',reviewAction:'Review refund'});
 expect(matchesQueueFilter({...cancelled,payment:{...cancelled.payment,state:'Refunded'}},'review')).toBe(false);
 const overdue=record({canonicalStatus:'fulfillment_in_progress',readyForPickup:true,pickupOverdue:true});
 expect(getOrderAttention(overdue)).toHaveLength(1);
 expect(getOrderAttention(overdue)[0].reviewAction).toBeUndefined();
});
