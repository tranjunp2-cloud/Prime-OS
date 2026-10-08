import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createOrderStore } from '../src/orders.js';
import { workflowBlocker, completionBlocker } from '../../../packages/order-workflow/rules.js';

function fixture(t, overrides={}) {
  const dir=mkdtempSync(path.join(tmpdir(),'order-flow-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'orders.json');writeFileSync(file,JSON.stringify({orders:[]}));
  const store=createOrderStore(file);
  let order=store.create({orderKey:'MAN-FLOW',requestKey:'create-1',canonicalStatus:'created',currencyCode:'VND',buyerSnapshot:{name:'Test',phone:'0900000000'},shippingAddressSnapshot:{address:'Test street',city:'HCM',country:'VN'},lines:[{sku:'SKU-A',name:'Product A',quantity:2,unitPrice:50000},{sku:'SKU-B',name:'Product B',quantity:1,unitPrice:25000}],totals:{},payment:{state:'Unpaid',method:'COD'},metadata:{warehouse:'HCM',handlingType:'self',shippingMode:'seller'},...overrides},'operator');
  const run=(body)=>{order=store.command(order.id,{version:order.version,...body},'operator');return order;};
  return {store,file,run,get order(){return order;}};
}
const shipment={action:'record-shipment',carrier:'Carrier test',service:'Standard',tracking:'TEST-TRACK',labelUrl:'https://example.com/label.pdf',collectionMethod:'pickup'};
const packing=order=>({action:'pack',items:order.lines.map(line=>({lineId:line.id,quantity:line.quantity})),package:{weightKg:1,lengthCm:20,widthCm:15,heightCm:10},labelAttached:true});
function ready(f) {
  f.run({action:'transition',toStatus:'acknowledged'});f.run({action:'prepare'});f.run(shipment);f.run(packing(f.order));
}
test('manual COD order completes the full evidenced workflow without inventing stock reservations',t=>{
  const f=fixture(t);ready(f);
  assert.equal(f.order.readyForPickup,true);assert.equal(f.order.canonicalStatus,'fulfillment_in_progress');
  assert.equal(f.order.operations.work.verifiedItems.length,2);assert.equal(f.order.reservation,undefined);
  f.run({action:'handover',reference:'Pickup receipt 1',carrierAccepted:true});
  assert.equal(f.order.canonicalStatus,'shipped');assert.equal(f.order.shipments[0].deliveryOutcome,'in_transit');
  assert.throws(()=>f.run({action:'transition',toStatus:'closed'}),/must be delivered/);
  f.run({action:'delivery',reference:'Delivery proof 1'});
  assert.throws(()=>f.run({action:'transition',toStatus:'closed'}),/payment received/);
  f.run({action:'payment',reference:'COD remittance 1'});f.run({action:'transition',toStatus:'closed'});
  assert.equal(f.order.canonicalStatus,'closed');assert.equal(f.order.payment.state,'Paid');
  const persisted=createOrderStore(f.file).list()[0];
  assert.equal(persisted.shipments[0].pickupReference,'Pickup receipt 1');assert.equal(persisted.shipments[0].deliveryReference,'Delivery proof 1');
  assert.equal(persisted.operations.work.packedBy,'operator');assert.ok(persisted.activity.some(item=>item.message.includes('Inventory was not reserved')));
});
test('prepaid, held, unresolved and marketplace orders cannot bypass preparation guards',t=>{
  const f=fixture(t,{payment:{state:'Unpaid',method:'Bank transfer'}});f.run({action:'transition',toStatus:'acknowledged'});
  assert.match(workflowBlocker(f.order,'prepare'),/Record payment/);
  assert.throws(()=>f.run({action:'prepare'}),/Record payment/);
  f.run({action:'payment',reference:'Bank reference'});f.run({action:'hold',reason:'Check address'});
  assert.throws(()=>f.run({action:'prepare'}),/Release the order hold/);
  f.run({action:'release-hold',reason:'Checked'});f.run({action:'exception',summary:'Stock unavailable'});
  assert.throws(()=>f.run({action:'prepare'}),/Resolve the open issues/);
  assert.match(workflowBlocker({...f.order,source:'shopee'},'prepare'),/Seller Center/);
  assert.match(workflowBlocker({...f.order,metadata:{...f.order.metadata,handlingType:'marketplace'}},'prepare'),/marketplace warehouse/);
});
test('packing verifies all quantities, measurements and the label before carrier acceptance',t=>{
  const f=fixture(t);f.run({action:'transition',toStatus:'acknowledged'});f.run({action:'prepare'});
  assert.throws(()=>f.run(packing(f.order)),/carrier shipment/);
  assert.throws(()=>f.run({...shipment,labelUrl:'javascript:alert(1)'}),/HTTPS/);
  f.run(shipment);
  assert.throws(()=>f.run({...packing(f.order),items:[{lineId:f.order.lines[0].id,quantity:1}]}),/every order line/);
  assert.throws(()=>f.run({...packing(f.order),items:f.order.lines.map(line=>({lineId:line.id,quantity:0}))}),/Verify all/);
  assert.throws(()=>f.run({...packing(f.order),package:{weightKg:0,lengthCm:20,widthCm:15,heightCm:10}}),/Weight/);
  assert.throws(()=>f.run({...packing(f.order),labelAttached:false}),/label is attached/);
  assert.throws(()=>f.run({action:'handover',reference:'Pickup',carrierAccepted:true}),/Verify all items/);
  f.run(packing(f.order));
  assert.throws(()=>f.run({action:'handover',carrierAccepted:false,reference:'Pickup'}),/carrier has accepted/);
  assert.throws(()=>f.run({action:'handover',carrierAccepted:true}),/evidence/);
  assert.throws(()=>f.run({action:'handover',carrierAccepted:true,reference:'Pickup',occurredAt:'2099-01-01T00:00:00Z'}),/event time/);
});
test('replaying an uncertain command is idempotent but a reused key cannot change its payload',t=>{
  const f=fixture(t);f.run({action:'transition',toStatus:'acknowledged'});
  const version=f.order.version;const body={action:'prepare',requestId:'prepare-1'};f.run(body);
  const result=f.store.command(f.order.id,{version,...body},'operator');
  assert.equal(result.version,f.order.version);assert.equal(result.transitions.length,f.order.transitions.length);
  assert.throws(()=>f.store.command(f.order.id,{version,...body,warehouse:'Another'},'operator'),/another command/);
  assert.throws(()=>f.store.command(f.order.id,{version,action:'prepare'},'operator'),/Order changed/);
});
test('completion refuses active returns, open exceptions and undelivered shipments in both UI rules and API',t=>{
  const f=fixture(t);ready(f);f.run({action:'handover',reference:'Pickup',carrierAccepted:true});f.run({action:'delivery',reference:'Delivered'});f.run({action:'payment',reference:'Paid'});
  for(const patch of [{returnRequests:[{id:'r',status:'requested',items:[]}]},{exceptions:[{id:'e',summary:'Issue',status:'open'}]},{shipments:[{carrier:'Test',tracking:'A',deliveryOutcome:'failed'}]}]) {
    const bad={...f.order,...patch};writeFileSync(f.file,JSON.stringify({orders:[bad]}));
    const blocker=completionBlocker(bad);assert.ok(blocker);
    assert.throws(()=>f.store.command(bad.id,{action:'transition',toStatus:'closed',version:bad.version},'operator'),{message:blocker});
  }
});
test('platform shipping cannot pretend to book shipments and fulfillment transitions cannot be forced',t=>{
  const f=fixture(t,{metadata:{warehouse:'HCM',handlingType:'self',shippingMode:'platform'}});
  f.run({action:'transition',toStatus:'acknowledged'});f.run({action:'prepare'});
  assert.throws(()=>f.run(shipment),/Seller Center/);
  assert.throws(()=>f.run({action:'transition',toStatus:'shipped'}),/fulfillment service/);
  assert.equal(f.store.list()[0].shipments.length,0);
});
