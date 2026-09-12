import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createOrderStore, validateManualOrder } from '../src/orders.js';

const input = () => ({ orderKey: 'MAN-TEST', requestKey: 'request-test', canonicalStatus: 'created', currencyCode: 'VND', buyerSnapshot: { name: 'Test customer', phone: '0900123456', email: '' }, shippingAddressSnapshot: { address: '123 Test', city: 'HCM', country: 'VN' }, lines: [{ sku: 'SKU-A', name: 'Test product', quantity: 2, unitPrice: 50000 }], totals: { discount: 10000, shipping: 20000, tax: 0, grandTotal: 1 }, payment: { state: 'Unpaid', method: 'COD' }, metadata: { store: 'Manual' } });
test('manual orders persist, recompute totals, deduplicate retry and reject stale commands', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-orders-'));
  try {
    const file = path.join(dir, 'orders.json'); const store = createOrderStore(file);
    const created = store.create(input(), 'operator');
    assert.equal(created.totals.grandTotal, 110000);
    assert.equal(store.create(input(), 'operator').id, created.id);
    assert.equal(createOrderStore(file).list().find((o) => o.id === created.id).buyerSnapshot.phone, '0900123456');
    assert.throws(() => store.create({ ...input(), requestKey: 'another-request' }, 'operator'), /already exists/);
    assert.throws(() => store.command(created.id, { version: 1, action: 'transition', toStatus: 'shipped' }, 'operator'), /not allowed/);
    const confirmed = store.command(created.id, { version: 1, action: 'transition', toStatus: 'acknowledged' }, 'operator');
    assert.equal(confirmed.version, 2);
    assert.equal(confirmed.activity.length, 2);
    assert.throws(() => store.command(created.id, { version: 1, action: 'note', note: 'stale' }, 'operator'), /Order changed/);
    assert.throws(() => store.command(created.id, { version: 2, action: 'transition', toStatus: 'allocated' }, 'operator'), /fulfillment service/);
    assert.throws(() => store.command(created.id, { version: 2, action: 'transition', toStatus: 'canceled' }, 'operator'), /Reason/);
    const canceled = store.command(created.id, { version: 2, action: 'transition', toStatus: 'canceled', reason: 'Customer request' }, 'operator');
    assert.equal(canceled.canonicalStatus, 'canceled');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('rejects invalid quantities, discounts and unverified payments', () => {
  assert.throws(() => validateManualOrder({ ...input(), lines: [{ ...input().lines[0], quantity: 1.2 }] }), /positive integer/);
  assert.throws(() => validateManualOrder({ ...input(), totals: { discount: 100001 } }), /exceed subtotal/);
  assert.throws(() => validateManualOrder({ ...input(), lines: [] }), /order items/);
  assert.throws(() => validateManualOrder({ ...input(), payment: { state: 'Paid', method: 'Cash' } }), /reference is required/);
  assert.throws(() => validateManualOrder({ ...input(), totals: { tax: Infinity } }), /non-negative/);
});

test('sample data covers every lifecycle and remains separate from saved manual orders', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-demo-'));
  try {
    const file = path.join(dir,'orders.json');
    const examples = createOrderStore(file).list();
    assert.equal(new Set(examples.map(o=>o.canonicalStatus)).size,10);
    for (const order of examples) {
      assert.equal(order.lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice,0),order.totals.subtotal);
      assert.equal(order.totals.subtotal-order.totals.discount+order.totals.shipping+order.totals.tax,order.totals.grandTotal);
      if (['draft','created','acknowledged','allocated','canceled'].includes(order.canonicalStatus)) assert.equal(order.shipments.length,0);
    }
    const manual = createOrderStore(file).create(input(),'operator');
    writeFileSync(file,JSON.stringify({orders:[manual,{id:examples[0].id,source:'demo',lines:[]}]}));
    const migrated = createOrderStore(file).list();
    assert.deepEqual(migrated.find(o=>o.id===manual.id),manual);
    assert.equal(migrated.find(o=>o.id===examples[0].id).lines.length,2);
    assert.equal(migrated.length,examples.length+1);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('handling type is explicit and validated independently from channel', () => {
  assert.equal(validateManualOrder(input()).metadata.handlingType, 'self');
  assert.equal(validateManualOrder({...input(),metadata:{store:'Shopee',handlingType:'self'}}).metadata.handlingType,'self');
  assert.equal(validateManualOrder({...input(),metadata:{handlingType:'marketplace'}}).metadata.handlingType,'marketplace');
  assert.throws(()=>validateManualOrder({...input(),metadata:{handlingType:'invalid'}}),/Invalid handling type/);
});

test('sample owner and notes persist with version guards, without enabling lifecycle commands', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'prime-sample-edit-'));
  try {
    const file=path.join(dir,'orders.json');const store=createOrderStore(file);const sample=store.list()[0];
    const assigned=store.command(sample.id,{action:'assign',assignee:'Operations',version:sample.version},'Admin');
    const noted=store.command(sample.id,{action:'note',note:'Verify packaging',version:assigned.version},'Admin');
    const saved=createOrderStore(file).list().find(o=>o.id===sample.id);
    assert.equal(saved.metadata.assignee,'Operations');assert.equal(saved.metadata.notes,'Verify packaging');
    assert.equal(saved.activity[0].actor,'Admin');
    assert.throws(()=>store.command(sample.id,{action:'note',note:'stale',version:sample.version},'Admin'),/Order changed/);
    assert.throws(()=>store.command(sample.id,{action:'transition',toStatus:'acknowledged',version:noted.version},'Admin'),/Only owner/);
    assert.equal(store.command(sample.id,{action:'note',note:'',version:noted.version},'Admin').metadata.notes,'');
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('holds block processing and require a reason before resuming',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'prime-hold-'));
 try {
  const store=createOrderStore(path.join(dir,'orders.json'));const order=store.create(input(),'Admin');
  assert.throws(()=>store.command(order.id,{action:'hold',version:1,reason:''},'Admin'),/Hold reason/);
  const held=store.command(order.id,{action:'hold',version:1,reason:'Validate address'},'Admin');
  assert.equal(held.hold.active,true);
  assert.throws(()=>store.command(order.id,{action:'transition',toStatus:'acknowledged',version:held.version},'Admin'),/Release the order hold/);
  assert.throws(()=>store.command(order.id,{action:'release-hold',version:held.version,reason:''},'Admin'),/Release reason/);
  const released=store.command(order.id,{action:'release-hold',version:held.version,reason:'Address verified'},'Admin');
  assert.equal(released.hold.active,false);assert.equal(released.canonicalStatus,'created');
  assert.equal(store.command(order.id,{action:'transition',toStatus:'acknowledged',version:released.version},'Admin').canonicalStatus,'acknowledged');
 } finally {rmSync(dir,{recursive:true,force:true});}
});
