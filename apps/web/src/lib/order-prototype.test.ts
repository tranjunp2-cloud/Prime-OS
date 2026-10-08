// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { orderDisplayStatus, ordersApi, type OrderRecord } from './orders-api';
import { restartOrderPrototype, restoreOrderPrototype, runOrderPrototype } from './order-prototype';
import { completionBlocker, orderNextAction } from './order-processing';
import { getShipmentHistory, prototypeTrackingOptions } from './order-shipment-history';
import { orderQueue } from './order-work-queues';

vi.mock('./prime/backend-auth', () => ({createPrimeAuthHeaders: () => new Headers(), resolvePrimeBackendBase: () => 'http://localhost'}));
const sample: OrderRecord = {
  id: 'prototype-test', orderKey: 'DEMO-TEST', requestKey: 'test', source: 'demo', version: 1,
  canonicalStatus: 'created', orderedAt: '2026-10-08T00:00:00Z', currencyCode: 'VND',
  buyerSnapshot: {name: 'Demo buyer', phone: '0900000000', email: ''},
  shippingAddressSnapshot: {address: 'Demo address', city: 'HCM', country: 'VN', postalCode: ''},
  lines: [{id: 'a', sku: 'DEMO-A', name: 'Notebook', quantity: 2, unitPrice: 50000}],
  totals: {subtotal: 100000, grandTotal: 100000}, payment: {method: 'Bank transfer', state: 'Unpaid', reference: ''},
  metadata: {store: 'PrimeWeb', warehouse: 'Demo warehouse', assignee: 'Demo seller', notes: '', tags: []},
  transitions: [], activity: [], shipments: [], exceptions: [], returnRequests: [],
};
beforeEach(() => {sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn());});
afterEach(() => vi.unstubAllGlobals());

describe('Interactive order prototype', () => {
  function pickedUpOrder() {
    let order=runOrderPrototype(sample,{action:'transition',toStatus:'acknowledged'});
    for(const input of [
      {action:'payment',reference:'DEMO'}, {action:'prepare',warehouse:'Demo'},
      {action:'record-shipment',carrier:'Demo',service:'Standard',tracking:'DEMO'},
      {action:'pack',items:[{lineId:'a',quantity:2}],package:{weightKg:1,lengthCm:20,widthCm:15,heightCm:10},labelAttached:true},
      {action:'handover',carrierAccepted:true,reference:'DEMO'},
    ]) order=runOrderPrototype(order,input);
    return order;
  }
  it('tracks carrier scans, failed delivery and redelivery without completing the order or changing money', () => {
    let order=pickedUpOrder();
    expect(getShipmentHistory(order.shipments[0],true).map(event=>event.status)).toEqual(['picked_up','ready_for_pickup','created']);
    for(const status of ['in_transit','out_for_delivery','delivery_failed','out_for_delivery','delivered']) {
      order=runOrderPrototype(order,{action:'carrier-update',shipmentKey:order.shipments[0].id,status});
      expect(getShipmentHistory(order.shipments[0],true)[0].status).toBe(status);
      expect(order.canonicalStatus).toBe(status==='delivered'?'delivered':'shipped');
      expect(orderQueue(order)).toBe(status==='delivered'?'delivered':'shipping');
    }
    expect(order.payment.state).toBe('Paid');
    expect(order.totals).toEqual(sample.totals);
    expect(order.source).toBe('demo');
    expect(prototypeTrackingOptions(order,order.shipments[0])).toEqual([]);
    expect(restoreOrderPrototype(sample).shipments).toEqual(order.shipments);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps a carrier return separate from cancellation, warehouse receipt and refund', () => {
    let order=pickedUpOrder();
    const update=(status:string)=>{order=runOrderPrototype(order,{action:'carrier-update',shipmentKey:order.shipments[0].id,status});};
    expect(()=>update('delivered')).toThrow(/not available/);
    for(const status of ['in_transit','out_for_delivery','delivery_failed','returning','returned'])update(status);
    expect(orderQueue(order)).toBe('returns');
    expect(order.canonicalStatus).toBe('shipped');
    expect(order.returnRequests[0].status).toBe('awaiting_inspection');
    expect(order.payment.state).toBe('Paid');
    expect(order.lines).toEqual(sample.lines);
    expect(()=>update('delivered')).toThrow(/not available/);
    expect(()=>runOrderPrototype(order,{action:'delivery',reference:'DEMO'})).toThrow(/active return/);
  });
  it.each(['Bank transfer', 'COD'])('runs all six stages for %s without any API writes', async method => {
    let order = {...sample, payment: {...sample.payment, method}};
    const statuses = [orderDisplayStatus(order)];
    async function act(action: Record<string, unknown>) { order = (await ordersApi.command(order, action)).data; }
    await act({action: 'transition', toStatus: 'acknowledged'});
    statuses.push(orderDisplayStatus(order));
    if (method === 'Bank transfer') {
      expect(orderNextAction(order)?.key).toBe('prepare-shipment');
      await act({action: 'payment', reference: 'DEMO-PAYMENT'});
    } else expect(orderNextAction(order)?.blocker).toBeNull();
    await act({action: 'prepare', warehouse: 'Demo warehouse'});
    await act({action: 'record-shipment', carrier: 'Demo carrier', service: 'Standard', tracking: 'DEMO-123', collectionMethod: 'pickup'});
    await act({action: 'pack', items: [{lineId: 'a', quantity: 2}], package: {weightKg: 1, lengthCm: 20, widthCm: 15, heightCm: 10}, labelAttached: true});
    statuses.push(orderDisplayStatus(order));
    await act({action: 'handover', carrierAccepted: true, reference: 'DEMO-PICKUP'});
    statuses.push(orderDisplayStatus(order));
    await act({action: 'delivery', reference: 'DEMO-DELIVERY'});
    statuses.push(orderDisplayStatus(order));
    if (method === 'COD') {
      expect(completionBlocker(order)).toMatch(/Record the payment/);
      await act({action: 'payment', reference: 'DEMO-COD'});
    }
    await act({action: 'transition', toStatus: 'closed'});
    statuses.push(orderDisplayStatus(order));
    expect(statuses).toEqual(['Awaiting confirmation', 'Preparing', 'Ready to ship', 'Shipping', 'Delivered', 'Completed']);
    expect(fetch).not.toHaveBeenCalled();
    expect(order.source).toBe('demo');
    expect(order.activity.length).toBeGreaterThan(6);
    expect(sample.canonicalStatus).toBe('created');
    expect(restoreOrderPrototype(sample).canonicalStatus).toBe('closed');
    const reset = restartOrderPrototype(order);
    expect(reset.canonicalStatus).toBe('created');
    expect(reset.shipments).toHaveLength(0);
    expect(reset.payment.state).toBe('Unpaid');
    expect(reset.operations?.work).toBeUndefined();
    expect(restoreOrderPrototype(sample)).toEqual(reset);
  });

  it('restores simulated progress on list refresh without overriding real orders', async () => {
    const confirmed = runOrderPrototype(sample, {action: 'transition', toStatus: 'acknowledged'});
    const real = {...sample, source: 'manual'};
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({data: [sample, real], canWrite: false})));
    const result = await ordersApi.list();
    expect(result.data[0]).toEqual(confirmed);
    expect(result.data[1]).toEqual(real);
    expect(result.canWrite).toBe(false);
  });

  it('keeps real commands on the normal API and rejects real records in the simulator', async () => {
    const real = {...sample, source: 'manual'};
    expect(() => runOrderPrototype(real, {action: 'transition', toStatus: 'acknowledged'})).toThrow(/only for sample/);
    expect(() => restartOrderPrototype(real)).toThrow(/only for sample/);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({data: real})));
    await ordersApi.command(real, {action: 'transition', toStatus: 'acknowledged'});
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/actions'), expect.objectContaining({method: 'POST'}));
  });

  it('does not skip payment, packing or carrier pickup requirements', () => {
    let order = runOrderPrototype(sample, {action: 'transition', toStatus: 'acknowledged'});
    expect(() => runOrderPrototype(order, {action: 'prepare', warehouse: 'Demo'})).toThrow(/Record payment/);
    order = runOrderPrototype(order, {action: 'payment', reference: 'DEMO'});
    order = runOrderPrototype(order, {action: 'prepare', warehouse: 'Demo'});
    expect(() => runOrderPrototype(order, {action: 'pack'})).toThrow(/shipment/);
    order = runOrderPrototype(order, {action: 'record-shipment', carrier: 'Demo', service: 'Standard', tracking: 'DEMO'});
    expect(() => runOrderPrototype(order, {action: 'pack', items: [{lineId: 'a', quantity: 1}]})).toThrow(/Verify all units/);
    expect(() => runOrderPrototype(order, {action: 'handover', carrierAccepted: true, reference: 'DEMO'})).toThrow(/Verify all items/);
    expect(() => runOrderPrototype(order, {action: 'transition', toStatus: 'closed'})).toThrow(/not available/);
    expect(restoreOrderPrototype(sample)).toEqual(order);
  });
  it('prepares payment, shipment and packing with one atomic save', () => {
    const confirmed=runOrderPrototype(sample,{action:'transition',toStatus:'acknowledged'});
    const input={action:'prepare-shipment',warehouse:'Demo',carrier:'Demo carrier',service:'Standard',tracking:'DEMO',package:{weightKg:1,lengthCm:20,widthCm:15,heightCm:10},items:[{lineId:'a',quantity:2}],labelAttached:true,paymentReceived:true,paymentReference:'DEMO-PAYMENT'};
    expect(()=>runOrderPrototype(confirmed,{...input,paymentReceived:false})).toThrow(/Confirm the payment/);
    expect(()=>runOrderPrototype(confirmed,{...input,items:[{lineId:'a',quantity:1}]})).toThrow(/Verify all units/);
    expect(restoreOrderPrototype(sample)).toEqual(confirmed);
    const ready=runOrderPrototype(confirmed,input);
    expect(orderDisplayStatus(ready)).toBe('Ready to ship');
    expect(ready.payment.state).toBe('Paid');
    expect(ready.shipments).toHaveLength(1);
    expect(ready.operations?.work?.verifiedItems).toEqual(input.items);
    expect(restoreOrderPrototype(sample)).toEqual(ready);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires a gateway update for cards and saves it only with valid packing', () => {
    const card = {...sample, payment:{...sample.payment, method:'Card'}};
    const confirmed = runOrderPrototype(card, {action:'transition', toStatus:'acknowledged'});
    const input = {action:'prepare-shipment', warehouse:'Demo', carrier:'GHN', service:'Standard', tracking:'DEMO-CARD', items:[{lineId:'a', quantity:2}], labelAttached:true};
    expect(() => runOrderPrototype(confirmed, {...input, paymentReceived:true, paymentReference:'NOT-GATEWAY'})).toThrow(/gateway payment update/);
    expect(() => runOrderPrototype(confirmed, {...input, paymentUpdate:'gateway-paid', items:[]})).toThrow(/Verify all units/);
    expect(restoreOrderPrototype(card)).toEqual(confirmed);
    const ready = runOrderPrototype(confirmed, {...input, paymentUpdate:'gateway-paid'});
    expect(ready.payment).toMatchObject({state:'Paid', reference:'DEMO-GATEWAY-DEMO-TEST'});
    expect(ready.operations?.package).toBeUndefined();
    expect(orderDisplayStatus(ready)).toBe('Ready to ship');
    expect(ready.activity.some(event => event.message.includes('Payment gateway'))).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves provider payment on restart and the platform deadline during preparation', () => {
    const paidCard = {...sample, payment:{method:'Card', state:'Paid', reference:'GATEWAY-1'}};
    const restarted = restartOrderPrototype(paidCard);
    expect(restarted.payment).toEqual(paidCard.payment);
    sessionStorage.clear();
    const platform = {...sample, metadata:{...sample.metadata, shippingMode:'platform' as const}, payment:{...sample.payment, method:'COD'}, operations:{shipBy:'2026-10-09T09:00:00Z'}};
    const confirmed = runOrderPrototype(platform, {action:'transition', toStatus:'acknowledged'});
    const ready = runOrderPrototype(confirmed, {action:'prepare-shipment', warehouse:'Demo', shipBy:'2026-12-31T09:00:00Z', items:[{lineId:'a', quantity:2}], labelAttached:true});
    expect(ready.operations?.shipBy).toBe(platform.operations.shipBy);
    expect(ready.payment.state).toBe('Unpaid');
    expect(orderDisplayStatus(ready)).toBe('Ready to ship');
  });
  it('resumes an already prepared shipment without creating it again', () => {
    let order=runOrderPrototype({...sample,payment:{...sample.payment,state:'Paid'}},{action:'transition',toStatus:'acknowledged'});
    order=runOrderPrototype(order,{action:'prepare',warehouse:'Demo'});
    order=runOrderPrototype(order,{action:'record-shipment',carrier:'Demo',service:'Standard',tracking:'KEEP-ME'});
    const id=order.shipments[0].id;
    const ready=runOrderPrototype(order,{action:'prepare-shipment',package:{weightKg:1,lengthCm:20,widthCm:15,heightCm:10},items:[{lineId:'a',quantity:2}],labelAttached:true});
    expect(ready.shipments).toHaveLength(1);
    expect(ready.shipments[0]).toMatchObject({id,tracking:'KEEP-ME'});
    expect(orderDisplayStatus(ready)).toBe('Ready to ship');
  });
  it('assigns platform shipping details while the seller still verifies packing', () => {
    const platform={...sample,payment:{...sample.payment,method:'COD'},metadata:{...sample.metadata,handlingType:'self' as const,shippingMode:'platform' as const}};
    const confirmed=runOrderPrototype(platform,{action:'transition',toStatus:'acknowledged'});
    const ready=runOrderPrototype(confirmed,{action:'prepare-shipment',warehouse:'Demo',package:{weightKg:1,lengthCm:20,widthCm:15,heightCm:10},items:[{lineId:'a',quantity:2}],labelAttached:true});
    expect(ready.shipments[0].tracking).toBe('DEMO-PLATFORM-DEMO-TEST');
    expect(ready.payment.state).toBe('Unpaid');
    expect(ready.metadata.shippingMode).toBe('platform');
    expect(orderDisplayStatus(ready)).toBe('Ready to ship');
  });
  it('lets marketplace fulfillment advance without seller preparation or payment changes', () => {
    const marketplace={...sample,metadata:{...sample.metadata,handlingType:'marketplace' as const,warehouse:'Unassigned'}};
    const confirmed=runOrderPrototype(marketplace,{action:'transition',toStatus:'acknowledged'});
    expect(()=>runOrderPrototype(confirmed,{action:'prepare',warehouse:'Demo'})).toThrow(/marketplace warehouse/);
    expect(()=>runOrderPrototype(confirmed,{action:'prepare-shipment'})).toThrow(/not available/);
    const ready=runOrderPrototype(confirmed,{action:'marketplace-ready'});
    expect(orderDisplayStatus(ready)).toBe('Ready to ship');
    expect(ready.payment).toEqual(marketplace.payment);
    expect(ready.metadata.handlingType).toBe('marketplace');
    expect(ready.metadata.warehouse).toBe('Marketplace warehouse');
    const shipped=runOrderPrototype(ready,{action:'marketplace-handover'});
    expect(orderDisplayStatus(shipped)).toBe('Shipping');
    expect(shipped.shipments[0].pickedUpAt).toBeTruthy();
    expect(shipped.payment).toEqual(marketplace.payment);
    expect(fetch).not.toHaveBeenCalled();
  });
});
