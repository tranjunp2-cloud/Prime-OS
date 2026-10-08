import {expect,it} from 'vitest';
import {orderQueue,matchesQueueFilter,matchesOrderQueue,hasReturnHistory} from './order-work-queues';
import type {OrderRecord} from './orders-api';
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
 expect(orderQueue(held)).toBe('ready');
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
