import {expect,it} from 'vitest';
import {orderQueue,matchesQueueFilter} from './order-work-queues';
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
 expect(orderQueue(delivered)).toBe('completed');expect(matchesQueueFilter(delivered,'settled')).toBe(false);
 expect(orderQueue(record({canonicalStatus:'draft'}))).toBe('draft');
});
