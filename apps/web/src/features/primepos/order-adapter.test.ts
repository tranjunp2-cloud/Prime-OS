// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { posDemoOrders } from './order-adapter';
import { addCustomer, checkout, currentCart, getPos, openShift, refundSale, resetPosCache, savePos, seedPos, setCartLine } from './store';
import { listPrototypeOrders } from '@/lib/order-prototype-data';
beforeEach(()=>{localStorage.clear();resetPosCache();savePos(seedPos());});
it('projects the same sale and refund into Main Orders without copying its ledger',()=>{
  openShift(100);addCustomer('Demo Buyer','0901234568');setCartLine('tote',2);
  const sale=checkout('cash',50,currentCart(getPos()).id);
  expect(listPrototypeOrders().find(o=>o.id===sale.id)).toMatchObject({source:'pos-demo',canonicalStatus:'closed',orderKey:sale.number,buyerSnapshot:{name:'Demo Buyer'},metadata:{store:'Prime POS'},payment:{state:'paid'}});
  refundSale(sale.id,{tote:1},'Changed mind',true);
  expect(posDemoOrders()[0].payment.refundedMerchandiseAmount).toBe(24);
  expect(posDemoOrders()[0].returnRequests).toHaveLength(1);
  refundSale(sale.id,{tote:1},'Changed mind',true);
  expect(posDemoOrders()[0].payment.state).toBe('refunded');
});
