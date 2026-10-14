import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createOrderStore, validateManualOrder } from '../src/orders.js';
import { demoOrders, hydrateDemoShipmentHistory, hydrateDemoBuyerSnapshot, hydrateDemoRefundAmount } from '../../../packages/order-workflow/demo-orders.js';

const input = () => ({ orderKey: 'MAN-TEST', requestKey: 'request-test', canonicalStatus: 'created', currencyCode: 'VND', buyerSnapshot: { name: 'Test customer', phone: '0900123456', email: '' }, shippingAddressSnapshot: { address: '123 Test', city: 'HCM', country: 'VN' }, lines: [{ sku: 'SKU-A', name: 'Test product', quantity: 2, unitPrice: 50000 }], totals: { discount: 10000, shipping: 20000, tax: 0, grandTotal: 1 }, payment: { state: 'Unpaid', method: 'COD' }, metadata: { store: 'Manual' } });
test('customer demo contacts upgrade exact legacy samples without replacing operator edits', () => {
  const sample = demoOrders().find(order => order.buyerSnapshot.email === 'ordercase30@example.com');
  const old = {...sample, version: 7, buyerSnapshot: {...sample.buyerSnapshot, phone: '0900010030', phoneCountry: undefined}, metadata: {...sample.metadata, notes: 'Keep my note'}};
  const upgraded = hydrateDemoBuyerSnapshot(old, sample);
  assert.equal(upgraded.buyerSnapshot.phone, '+84 900 000 001');
  assert.equal(upgraded.buyerSnapshot.phoneCountry, 'VN');
  assert.equal(upgraded.version, 7);
  assert.equal(upgraded.metadata.notes, 'Keep my note');
  for (const changed of [
    {...old, source: 'manual'},
    {...old, buyerSnapshot: {...old.buyerSnapshot, name: 'Changed name'}},
    {...old, buyerSnapshot: {...old.buyerSnapshot, phone: '0908888888'}},
    {...old, buyerSnapshot: {...old.buyerSnapshot, email: 'changed@example.com'}},
    {...old, buyerSnapshot: {...old.buyerSnapshot, phoneCountry: 'JP'}},
  ]) assert.deepEqual(hydrateDemoBuyerSnapshot(changed, sample), changed);
});
test('only the untouched legacy demo refund gains its explicit merchandise amount', () => {
  const sample = demoOrders().find(order => order.id === 'DEMO-REFUND-PARTIAL');
  const old = structuredClone(sample);
  delete old.payment.refundedMerchandiseAmount;
  old.metadata.notes = 'Keep edited note';
  old.version = 7;
  const upgraded = hydrateDemoRefundAmount(old, sample);
  assert.equal(upgraded.payment.refundedMerchandiseAmount, sample.lines[0].unitPrice);
  assert.equal(upgraded.metadata.notes, 'Keep edited note');
  assert.equal(upgraded.version, 7);
  for (const changed of [
    {...old, source: 'manual'}, {...old, canonicalStatus: 'created'},
    {...old, totals: {...old.totals, subtotal: 999999}},
    {...old, currencyCode: 'USD'}, {...old, orderedAt: '2026-10-13T00:00:00Z'},
    {...old, payment: {...old.payment, refundedMerchandiseAmount: 0}},
    {...old, payment: {...old.payment, reference: 'Edited reference'}},
    {...old, lines: old.lines.map(line => ({...line, quantity: line.quantity + 1}))},
  ]) assert.deepEqual(hydrateDemoRefundAmount(changed, sample), changed);
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-demo-ranks-'));
  try {
    const file = path.join(dir, 'orders.json');
    writeFileSync(file, JSON.stringify({orders: [old]}));
    const store = createOrderStore(file);
    const refreshed = store.list();
    assert.deepEqual(refreshed.find(order => order.id === old.id), JSON.parse(JSON.stringify(upgraded)));
    assert.ok(refreshed.some(order => order.id.startsWith('DEMO-PURCHASE-')));
    assert.equal(new Set(refreshed.map(order => order.id)).size, refreshed.length);
    assert.deepEqual(store.list(), refreshed);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('combined confirmation saves payment and status atomically and safely replays a lost response', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-payment-confirm-'));
  try {
    const file = path.join(dir, 'orders.json');
    const store = createOrderStore(file);
    const order = store.create({...input(), payment: {state: 'Unpaid', method: 'Bank transfer', reference: 'BANK-123'}}, 'operator');
    writeFileSync(file, JSON.stringify({orders: [{...order, needsPaymentVerification: true}]}));
    const command = {action: 'confirm-payment-order', reference: ' BANK-123 ', paymentReceived: true, version: order.version, requestId: 'confirm-1'};
    const confirmed = store.command(order.id, command, 'operator');
    assert.equal(confirmed.payment.state, 'Paid');
    assert.equal(confirmed.payment.reference, 'BANK-123');
    assert.equal(confirmed.canonicalStatus, 'acknowledged');
    assert.equal(confirmed.needsPaymentVerification, false);
    assert.equal(confirmed.version, order.version + 1);
    assert.equal(confirmed.transitions.length, 1);
    assert.deepEqual(confirmed.activity.slice(0, 2).map(event => event.message), ['Order confirmed — ready to prepare', 'Payment confirmed with reference']);
    assert.deepEqual(createOrderStore(file).list().find(item => item.id === order.id), confirmed);
    assert.deepEqual(store.command(order.id, command, 'operator'), confirmed);
    assert.throws(() => store.command(order.id, {...command, requestId: 'confirm-2'}, 'operator'), /Order changed/);
    assert.throws(() => store.command(order.id, {...command, reference: 'DIFFERENT'}, 'operator'), /already used/);
    assert.deepEqual(store.list().find(item => item.id === order.id), confirmed);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
test('invalid combined confirmation never saves payment, status or audit entries', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-payment-reject-'));
  try {
    const file = path.join(dir, 'orders.json');
    const store = createOrderStore(file);
    const order = store.create({...input(), payment: {state: 'Unpaid', method: 'Bank transfer'}}, 'operator');
    const command = {action: 'confirm-payment-order', reference: 'BANK-123', paymentReceived: true, version: order.version, requestId: 'confirm-1'};
    for (const fields of [{paymentReceived: false}, {paymentReceived: undefined}, {reference: ''}, {reference: ' '.repeat(5)}, {reference: 'a'.repeat(1001)}]) {
      assert.throws(() => store.command(order.id, {...command, ...fields}, 'operator'));
      assert.deepEqual(store.list().find(item => item.id === order.id), order);
    }
    for (const patch of [
      {source: 'channel'}, {canonicalStatus: 'draft'}, {canonicalStatus: 'acknowledged'},
      {hold: {active: true}}, {lines: []}, {syncError: true}, {reservation: 'Allocation failed'},
      {exceptions: [{status: 'open'}]}, {returnRequests: [{status: 'requested'}]},
      {payment: {state: 'Unpaid', method: 'COD'}}, {payment: {state: 'Unpaid', method: 'Card'}},
      {payment: {...order.payment, state: 'Paid'}},
    ]) {
      const blocked = {...order, ...patch};
      writeFileSync(file, JSON.stringify({orders: [blocked]}));
      assert.throws(() => store.command(order.id, command, 'operator'));
      assert.deepEqual(store.list().find(item => item.id === order.id), blocked);
    }
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
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

test('sample journeys cover carrier delivery, store collection and returns in chronological order', () => {
  const examples = demoOrders();
  for (const order of examples) {
    for (const shipment of order.shipments) {
      assert.ok(shipment.trackingEvents.length > 0);
      assert.ok(shipment.trackingEvents.every(event => event.source === 'prototype'));
      const times = shipment.trackingEvents.map(event => Date.parse(event.occurredAt));
      assert.ok(times.every(Number.isFinite));
      assert.deepEqual(times, [...times].sort((a, b) => a - b));
      assert.ok(times[0] >= Date.parse(order.orderedAt));
    }
  }
  const pickup = examples.find(order => order.orderKey === 'POS-240812-0931').shipments[0];
  assert.deepEqual(pickup.trackingEvents.map(event => event.status), ['created', 'ready_for_collection', 'collected']);
  assert.equal(pickup.pickedUpAt, undefined);
  const delivered = examples.find(order => order.canonicalStatus === 'delivered').shipments[0];
  assert.deepEqual(delivered.trackingEvents.map(event => event.status), ['created', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']);
  const returned = examples.find(order => order.orderKey === 'LZD-240811-1515').shipments[0];
  assert.equal(returned.deliveryOutcome, 'returned');
  assert.equal(returned.trackingEvents.at(-1).status, 'returned');
});

test('legacy sample history is hydrated without replacing edits, real shipments or restarted progress', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-history-'));
  try {
    const file = path.join(dir, 'orders.json');
    const sample = demoOrders().find(order => order.canonicalStatus === 'delivered');
    const legacy = {...sample, version: 3, metadata: {...sample.metadata, notes: 'Keep note'}, shipments: sample.shipments.map(({carrier, tracking, status}) => ({carrier, tracking, status}))};
    writeFileSync(file, JSON.stringify({orders: [legacy]}));
    const refreshed = createOrderStore(file).list().find(order => order.id === sample.id);
    assert.equal(refreshed.version, 3);
    assert.equal(refreshed.metadata.notes, 'Keep note');
    assert.deepEqual(refreshed.shipments[0].trackingEvents, sample.shipments[0].trackingEvents);
    for (const changed of [
      {...legacy, source: 'manual'},
      {...legacy, canonicalStatus: 'created', shipments: []},
      {...legacy, orderedAt: '2026-10-12T12:00:00Z'},
      {...legacy, shipments: [{...legacy.shipments[0], deliveredAt: '2026-10-12T12:00:00Z'}]},
      {...legacy, shipments: [{...legacy.shipments[0], tracking: 'NEW-TRACKING'}]},
    ]) assert.deepEqual(hydrateDemoShipmentHistory(changed, sample), changed);
  } finally { rmSync(dir, {recursive: true, force: true}); }
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

test('confirmation eligibility is enforced by the API without requiring prepaid payment or inventory reservation', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'prime-confirm-'));
  try {
    const file = path.join(dir, 'orders.json');
    const store = createOrderStore(file);
    const created = store.create(input(), 'operator');
    for (const [patch, reason] of [
      [{exceptions: [{id: 'issue', status: 'open', summary: 'Invalid address'}]}, /open issues/],
      [{returnRequests: [{id: 'return', status: 'requested'}]}, /active return/],
      [{reservation: 'Allocation failed'}, /allocation failure/],
      [{syncError: true}, /sync error/],
      [{payment: {state: 'Unpaid', method: 'Bank transfer', reference: 'Needs review'}}, /payment evidence/],
    ]) {
      writeFileSync(file, JSON.stringify({orders: [{...created, ...patch}]}));
      assert.throws(() => store.command(created.id, {action: 'transition', toStatus: 'acknowledged', version: 1}, 'operator'), reason);
      assert.equal(store.list().find(order => order.id === created.id).canonicalStatus, 'created');
    }
    writeFileSync(file, JSON.stringify({orders: [{...created, payment: {state: 'Unpaid', method: 'Card', reference: ''}}]}));
    const confirmed = store.command(created.id, {action: 'transition', toStatus: 'acknowledged', version: 1}, 'operator');
    assert.equal(confirmed.canonicalStatus, 'acknowledged');
    assert.equal(confirmed.payment.state, 'Unpaid');
    assert.notEqual(confirmed.reservation, 'Reserved');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
