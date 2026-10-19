// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {OrderWorkspaceDetail} from './OrderWorkspaceDetail';
import {getOrderDetailFlow, getOrderDetailStatus, getOrderDetailSteps, getOrderDetailPermissions} from '@/lib/order-detail-flow';
import {ordersApi, type OrderRecord, type CanonicalStatus} from '@/lib/orders-api';
import {listPrototypeOrders} from '@/lib/order-prototype-data';
vi.mock('@/lib/orders-api', async (load) => ({...await load<typeof import('@/lib/orders-api')>(), ordersApi:{command:vi.fn()}}));
const order: OrderRecord = { id: 'order-test', orderKey: 'MAN-TEST', requestKey: 'req-1', version: 1, source: 'manual', canonicalStatus: 'created', orderedAt: '2026-09-10T10:00:00Z', currencyCode: 'VND', buyerSnapshot: { name: 'Lan', phone: '0900123456', email: '' }, shippingAddressSnapshot: { address: '123 Le Loi', city: 'HCM', country: 'VN', postalCode: '' }, lines: [{ sku: 'SKU-A', name: 'Product A', quantity: 2, unitPrice: 50000, lineTotal: 100000 }], totals: { subtotal: 100000, grandTotal: 100000 }, payment: { state: 'Unpaid', method: 'COD', reference: '' }, metadata: { store: 'Manual', warehouse: 'HCM', assignee: 'Unassigned', notes: '', tags: [] }, transitions: [], shipments: [], returnRequests: [], exceptions: [], activity: [] };
beforeEach(() => {vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });});
afterEach(()=>{cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals();});
function mount(record=order) {return render(<OrderWorkspaceDetail order={record} canWrite onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}}/>);}
describe('Order detail workflows',()=>{
  it('keeps only hold and cancel in More, with edits and history in their own sections', () => {
    mount();
    expect(screen.getByRole('button', {name:'Assign',exact:true})).toBeVisible();
    expect(screen.getByRole('button', {name:'Edit note'})).toBeVisible();
    expect(screen.getByRole('button', {name:'Change warehouse'})).toBeVisible();
    expect(screen.getByRole('button', {name:'View activity'})).toBeVisible();
    fireEvent.pointerDown(screen.getByRole('button', {name:'More',exact:true}), {button:0,ctrlKey:false});
    const menu = within(screen.getByRole('menu'));
    expect(menu.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Hold order', 'Cancel order']);
    fireEvent.click(menu.getByRole('menuitem', {name:'Hold order'}));
    expect(screen.getByRole('dialog', {name:'Hold order'})).toBeVisible();
    expect(ordersApi.command).not.toHaveBeenCalled();
  });
  it.each(['acknowledged', 'allocated', 'fulfillment_in_progress'] as const)('shows packing slips directly during %s, without duplicating them in More', status => {
    mount({...order, canonicalStatus:status, metadata:{...order.metadata,handlingType:'self'}});
    expect(screen.getByRole('button', {name:'Print packing slip',exact:true})).toBeVisible();
    fireEvent.pointerDown(screen.getByRole('button', {name:'More',exact:true}), {button:0,ctrlKey:false});
    const menu = within(screen.getByRole('menu'));
    expect(menu.getByRole('menuitem', {name:'Hold order'})).toBeVisible();
    expect(menu.queryByRole('menuitem', {name:/packing slip/})).not.toBeInTheDocument();
  });
  it.each(['partially_shipped', 'shipped', 'delivered', 'closed'] as const)('retains only the historical reprint in More for %s seller orders', status => {
    mount({...order, canonicalStatus:status, metadata:{...order.metadata,handlingType:'self'}});
    fireEvent.pointerDown(screen.getByRole('button', {name:'More',exact:true}), {button:0,ctrlKey:false});
    expect(within(screen.getByRole('menu')).getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Reprint packing slip']);
  });
  it('does not offer packing slips before confirmation, and still confirms cancellation explicitly', () => {
    mount({...order, canonicalStatus:'draft', metadata:{...order.metadata,handlingType:'self'}});
    expect(screen.queryByRole('button', {name:/^(Print|Reprint) packing slip$/})).not.toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', {name:'More',exact:true}), {button:0,ctrlKey:false});
    const menu = within(screen.getByRole('menu'));
    expect(menu.getAllByRole('menuitem')).toHaveLength(1);
    fireEvent.click(menu.getByRole('menuitem', {name:'Cancel order'}));
    expect(screen.getByRole('dialog', {name:'Cancel order'})).toBeVisible();
    expect(screen.getByLabelText('Cancellation reason')).toBeRequired();
    expect(ordersApi.command).not.toHaveBeenCalled();
  });
  it.each([
    {...order, canonicalStatus:'canceled' as const, metadata:{...order.metadata,handlingType:'self' as const}},
    {...order, canonicalStatus:'closed' as const, metadata:{...order.metadata,handlingType:'marketplace' as const}},
    {...order, canonicalStatus:'closed' as const, lines:[], metadata:{...order.metadata,handlingType:'self' as const}},
    {...order, hold:{active:true,reason:'Check address',at:order.orderedAt,actor:'Seller'}},
  ])('hides More when no relevant actions remain ($canonicalStatus)', record => {
    mount(record);
    expect(screen.queryByRole('button', {name:'More',exact:true})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'View activity'})).toBeVisible();
  });
  it('does not expose lifecycle actions to a read-only viewer', () => {
    render(<OrderWorkspaceDetail order={order} canWrite={false} onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    expect(screen.queryByRole('button', {name:'More',exact:true})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'View activity'})).toBeVisible();
  });
  it('confirms an unpaid bank transfer and the order in one dialog, then shows Preparing', async () => {
    const bankOrder = {...order, needsPaymentVerification: true, payment: {state: 'Unpaid', method: 'Bank transfer', reference: 'BANK-123'}};
    const updated = {...bankOrder, canonicalStatus: 'acknowledged' as const, version: 2, needsPaymentVerification: false, payment: {...bankOrder.payment, state: 'Paid'}};
    const onUpdated = vi.fn();
    vi.mocked(ordersApi.command).mockResolvedValue({data: updated});
    const view = render(<OrderWorkspaceDetail order={bankOrder} canWrite onClose={()=>{}} onUpdated={onUpdated} onEditDraft={()=>{}} />);
    fireEvent.click(screen.getByRole('button', {name: 'Confirm payment & order'}));
    const dialog = within(screen.getByRole('dialog', {name: 'Confirm payment & order'}));
    expect(dialog.getByText('₫100,000')).toBeVisible();
    const submit = dialog.getByRole('button', {name: 'Confirm payment & order'});
    const checkbox = dialog.getByRole('checkbox', {name: /I have verified/});
    const reference = dialog.getByLabelText('Payment reference / Evidence');
    expect(checkbox).not.toBeChecked();
    expect(submit).toBeDisabled();
    fireEvent.click(checkbox);
    fireEvent.change(reference, {target: {value: '  '}});
    expect(submit).toBeDisabled();
    fireEvent.change(reference, {target: {value: ' BANK-123 '}});
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(ordersApi.command).toHaveBeenCalledTimes(1);
    expect(ordersApi.command).toHaveBeenCalledWith(bankOrder, {action: 'confirm-payment-order', reference: 'BANK-123', paymentReceived: true, requestId: expect.any(String)});
    expect(screen.queryByRole('dialog', {name: 'Confirm Order'})).not.toBeInTheDocument();
    view.rerender(<OrderWorkspaceDetail order={updated} canWrite onClose={()=>{}} onUpdated={onUpdated} onEditDraft={()=>{}} />);
    expect(screen.getByRole('list', {name: 'Order lifecycle'}).querySelector('[aria-current="step"]')).toHaveTextContent('Preparing');
    expect(within(screen.getByRole('region', {name: 'Order summary'})).getByText('Bank transfer · Paid')).toBeVisible();
    expect(screen.getByText('Payment recorded and order confirmed. Ready to prepare.')).toBeVisible();
  });
  it('preserves the form and request ID when combined confirmation must be retried', async () => {
    vi.mocked(ordersApi.command).mockRejectedValue(new Error('Connection lost. Please retry.'));
    mount({...order, payment: {state: 'Unpaid', method: 'Bank transfer', reference: 'BANK-123'}});
    fireEvent.click(screen.getByRole('button', {name: 'Confirm payment & order'}));
    const dialog = within(screen.getByRole('dialog', {name: 'Confirm payment & order'}));
    fireEvent.click(dialog.getByRole('checkbox'));
    const submit = dialog.getByRole('button', {name: 'Confirm payment & order'});
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
    expect(dialog.getByRole('checkbox')).toBeChecked();
    fireEvent.click(submit);
    await waitFor(() => expect(ordersApi.command).toHaveBeenCalledTimes(2));
    expect(vi.mocked(ordersApi.command).mock.calls[1][1]).toEqual(vi.mocked(ordersApi.command).mock.calls[0][1]);
    await waitFor(() => expect(submit).toBeEnabled());
  });
  it.each([
    {state: 'Unpaid', method: 'COD', reference: ''},
    {state: 'Paid', method: 'Bank transfer', reference: 'BANK-123'},
  ])('keeps ordinary confirmation for $method / $state without recording payment', async payment => {
    const record = {...order, payment};
    vi.mocked(ordersApi.command).mockResolvedValue({data: {...record, canonicalStatus: 'acknowledged'}});
    mount(record);
    expect(screen.queryByRole('button', {name: 'Confirm payment & order'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Confirm Order'}));
    const dialog = within(screen.getByRole('dialog', {name: 'Confirm Order'}));
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', {name: 'Confirm Order'}));
    await screen.findByText('Order updated.');
    expect(ordersApi.command).toHaveBeenCalledWith(record, {action: 'transition', toStatus: 'acknowledged', reason: undefined});
  });
  it('does not enable combined confirmation for read-only orders or unresolved exceptions', () => {
    const bankOrder = {...order, payment: {state: 'Unpaid', method: 'Bank transfer', reference: ''}};
    render(<OrderWorkspaceDetail order={bankOrder} canWrite={false} onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    expect(screen.getByRole('button', {name: 'Confirm payment & order'})).toBeDisabled();
    expect(getOrderDetailPermissions(bankOrder, false).confirmPaymentAndOrder).toBe(false);
    expect(getOrderDetailPermissions({...bankOrder, exceptions: [{id: 'issue', summary: 'Invalid address', status: 'open'}]}, true).confirmPaymentAndOrder).toBe(false);
  });
  it('shows one preparation action for seller prototypes and a platform update for marketplace fulfillment',()=>{
    const prototype={...order,source:'demo',canonicalStatus:'fulfillment_in_progress' as const,operations:{work:{preparedAt:order.orderedAt}},payment:{...order.payment,state:'Paid'}};
    const view=mount(prototype);
    expect(screen.getByRole('button',{name:'Prepare shipment'})).toBeEnabled();
    expect(screen.queryByRole('button',{name:'Add carrier shipment'})).not.toBeInTheDocument();
    view.rerender(<OrderWorkspaceDetail order={{...prototype,metadata:{...prototype.metadata,handlingType:'marketplace'}}} canWrite onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    expect(screen.getByRole('button',{name:'Simulate marketplace update'})).toBeEnabled();
    expect(screen.queryByRole('button',{name:'Prepare shipment'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Add carrier shipment'})).not.toBeInTheDocument();
  });
  it.each([['draft','Draft'],['created','Order needs confirmation'],['acknowledged','Preparing'],['allocated','Preparing'],['fulfillment_in_progress','Preparing'],['partially_shipped','Shipping'],['shipped','Shipping'],['delivered','Delivered'],['closed','Completed'],['canceled','Cancelled']])('explains the %s stage', (status,title)=>{
    mount({...order,canonicalStatus:status as CanonicalStatus});
    expect(within(screen.getByRole('region',{name:'Current order step'})).getByRole('heading',{name:title})).toBeInTheDocument();
  });
  it('shows operational data in one view and opens the complete audit log separately', () => {
    const record={...order,lines:[{...order.lines[0],imageUrl:'/images/orders/sample-notebook.svg',inventory:{onHand:3,committed:3,reservedForOrder:2,warehouse:'HCM',checkedAt:'2026-09-10T09:00:00Z'}}],operations:{shipBy:'2026-09-11T11:00:00Z',carrier:'GHN',service:'Standard',package:{weightKg:1.2,lengthCm:25,widthCm:18,heightCm:10},settlement:{platformFees:8000,sellerShipping:20000,adjustments:0,netAmount:72000,status:'estimated' as const},invoice:{requested:true,company:'Sample Company',taxId:'DEMO-TAX',address:'Sample address'}},activity:Array.from({length:4},(_,i)=>({id:String(i),at:`2026-09-10T0${i}:00:00Z`,message:`Event ${i}`,actor:'Operator'}))};
    mount(record);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Returns / RMA')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Inventory details for SKU-A'})).toHaveTextContent('Available · 2');
    expect(screen.getByText('Ship-by deadline')).toBeInTheDocument();
    expect(screen.getByText('1.2 kg')).toBeInTheDocument();
    expect(screen.getByText('Estimated net settlement')).toBeVisible();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole('button',{name:'Payment details'}));
    expect(screen.getByText('Estimated net settlement')).toBeVisible();
    expect(screen.getByText('DEMO-TAX')).toBeInTheDocument();
    expect(screen.queryByText('Event 0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'View activity'}));
    expect(within(screen.getByRole('dialog',{name:'Order activity'})).getByText('Event 0')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog',{name:'Order activity'})).queryByRole('list',{name:'Order lifecycle'})).not.toBeInTheDocument();
  });
  it('only labels packed orders ready to ship when pickup readiness is reported', () => {
    expect(getOrderDetailStatus({...order,canonicalStatus:'allocated',readyForPickup:true})).toBe('Preparing');
    expect(getOrderDetailStatus({...order,canonicalStatus:'fulfillment_in_progress',readyForPickup:false})).toBe('Preparing');
    const ready={...order,canonicalStatus:'fulfillment_in_progress' as const,readyForPickup:true};
    expect(getOrderDetailStatus(ready)).toBe('Ready to ship');
    expect(getOrderDetailSteps(ready).find(step=>step.current)?.label).toBe('Ready to ship');
  });
  it('does not interpret a missing reservation quantity as zero or sufficient stock', () => {
    mount({...order, lines: [{...order.lines[0], inventory: {onHand: 45, committed: 10, warehouse: 'HCM', checkedAt: '2026-09-10T09:00:00Z'}}]});
    expect(screen.getByText('Reservation not reported')).toBeVisible();
    const stock = screen.getByRole('button', {name: 'Inventory details for SKU-A'});
    expect(stock).toHaveTextContent('Availability not reported');
    fireEvent.click(stock);
    expect(screen.getByText('Reserved for this order at last check')).toBeVisible();
    expect(screen.getByText('Reservation data is missing for this check.')).toBeVisible();
    expect(screen.queryByText('Sufficient at last check')).not.toBeInTheDocument();
  });
  it('requires explicit confirmation and preserves server errors in the dialog',async()=>{
    vi.mocked(ordersApi.command).mockRejectedValue(new Error('Order changed. Refresh and try again.'));
    mount(); fireEvent.click(screen.getByRole('button',{name:'Confirm Order'}));
    expect(ordersApi.command).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog',{name:'Confirm Order'})).getByRole('button',{name:'Confirm Order'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Order changed');
    expect(ordersApi.command).toHaveBeenCalledWith(order,{action:'transition',toStatus:'acknowledged',reason:undefined});
  });
  it('prioritizes an active return over payment and completion',()=>{
    const returned={...order,canonicalStatus:'delivered' as const, payment:{...order.payment,method:'Bank transfer'},returnRequests:[{id:'ret-1',status:'received',reason:'Damaged',items:[]}]};
    mount(returned);
    expect(screen.getByRole('button',{name:'Review return'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Complete order'})).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Damaged')).toBeInTheDocument();
    expect(getOrderDetailFlow({...returned,returnRequests:[{...returned.returnRequests[0],status:'closed'}]}).title).toBe('Delivered');
  });
  it('blocks lifecycle commands for read-only real orders and terminal records',()=>{
    for(const record of [{...order,canonicalStatus:'closed' as const},{...order,canonicalStatus:'canceled' as const}]) {
      const allowed=getOrderDetailPermissions(record,true);
      expect([allowed.editDraft,allowed.submit,allowed.confirm,allowed.cancel,allowed.warehouse,allowed.payment,allowed.close]).not.toContain(true);
    }
    expect(Object.values(getOrderDetailPermissions(order,false))).not.toContain(true);
    expect(getOrderDetailPermissions({...order,source:'demo'},false).confirm).toBe(true);
    expect(getOrderDetailPermissions({...order,canonicalStatus:'delivered',payment:{...order.payment,state:'Paid'}},true).close).toBe(true);
  });
  it('shows the total, payment and current progress upfront without empty optional cards',()=>{
    mount();
    const summary=within(screen.getByRole('region',{name:'Order summary'}));
    expect(summary.getByText('₫100,000')).toBeVisible();
    expect(summary.getByText('COD · Collect on delivery')).toBeVisible();
    expect(within(screen.getByRole('list',{name:'Order lifecycle'})).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('list',{name:'Order lifecycle'}).querySelector('[aria-current="step"]')).toHaveTextContent('Awaiting confirmation');
    expect(screen.queryByText(/Marketplace ID:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'VAT invoice'})).not.toBeInTheDocument();
    expect(screen.queryByText('Email not reported')).not.toBeInTheDocument();
  });
  it('enables sample confirmation as a prototype and keeps note editing',async()=>{
    const sample={...order,source:'demo',operations:{shipBy:'2020-01-01T00:00:00Z'}};
    const updated={...sample,metadata:{...sample.metadata,notes:'Handle with care'}};
    vi.mocked(ordersApi.command).mockResolvedValue({data:updated});
    mount(sample);
    expect(screen.getByRole('button',{name:'Confirm Order'})).toBeEnabled();
    expect(screen.getByRole('button',{name:'Restart prototype'})).toBeEnabled();
    expect(screen.getByRole('list',{name:'Order lifecycle'})).toBeVisible();
    expect(screen.getByText('Sample deadline · No live SLA')).toBeVisible();
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Edit note'}));
    fireEvent.change(screen.getByLabelText('Order notes'),{target:{value:'Handle with care'}});
    fireEvent.click(screen.getByRole('button',{name:'Save notes'}));
    expect(await screen.findByText('Order updated.')).toBeInTheDocument();
    expect(ordersApi.command).toHaveBeenCalledWith(sample,{action:'note',note:'Handle with care'});
  });
  it('keeps real overdue deadlines visible and distinguishes missing channel integration from read-only access',()=>{
    mount({...order,source:'channel',operations:{shipBy:'2020-01-01T00:00:00Z'}});
    expect(screen.getByText(/Channel actions are not connected/)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Confirm Order'})).not.toBeInTheDocument();
    expect(screen.getByText(/Overdue ·/)).toBeVisible();
    cleanup();
    render(<OrderWorkspaceDetail order={order} canWrite={false} onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    expect(screen.getByText(/Read-only access/)).toBeVisible();
    expect(screen.getByRole('button',{name:'Confirm Order'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Confirm Order'})).toHaveAccessibleDescription(/Read-only access/);
    expect(screen.queryByRole('button',{name:'Edit note'})).not.toBeInTheDocument();
  });
  it('keeps progress visible and guides prepaid orders through payment before preparation',()=>{
    const prepaid={...order,payment:{...order.payment,method:'Bank transfer'}};
    const view=mount(prepaid);
    expect(screen.getByRole('button',{name:'Confirm payment & order'})).toBeEnabled();
    expect(screen.getByText(/Verify the bank transfer was received/)).toBeVisible();
    const confirmed={...prepaid,canonicalStatus:'acknowledged' as const};
    view.rerender(<OrderWorkspaceDetail order={confirmed} canWrite onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    const workflow=within(screen.getByRole('region',{name:'Current order step'}));
    expect(workflow.getByRole('button',{name:'Confirm payment'})).toBeEnabled();
    expect(workflow.queryByRole('button',{name:'Prepare order'})).not.toBeInTheDocument();
    expect(workflow.getByRole('list',{name:'Order lifecycle'}).querySelector('[aria-current="step"]')).toHaveTextContent('Preparing');
    view.rerender(<OrderWorkspaceDetail order={{...confirmed,payment:{...confirmed.payment,state:'Paid'}}} canWrite onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    expect(workflow.getByRole('button',{name:'Prepare order'})).toBeEnabled();
  });
  it('allows unpaid COD preparation but keeps held orders at their existing stage',()=>{
    const confirmed={...order,canonicalStatus:'acknowledged' as const};
    const view=mount(confirmed);
    expect(screen.getByRole('button',{name:'Prepare order'})).toBeEnabled();
    view.rerender(<OrderWorkspaceDetail order={{...confirmed,hold:{active:true,reason:'Check address',at:'2026-10-08T00:00:00Z',actor:'Operator'}}} canWrite onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}} />);
    expect(screen.getByRole('button',{name:'Release hold'})).toBeEnabled();
    expect(screen.queryByRole('button',{name:'Prepare order'})).not.toBeInTheDocument();
    expect(screen.getByRole('list',{name:'Order lifecycle'}).querySelector('[aria-current="step"]')).toHaveTextContent('Preparing');
  });
  it('keeps a paid cancellation warning visible without implying fulfillment was completed',()=>{
    mount({...order,canonicalStatus:'canceled',payment:{...order.payment,state:'Paid'}});
    expect(screen.getByRole('alert')).toHaveTextContent('Review the refund separately from cancellation');
    expect(screen.queryByRole('button',{name:'Complete order'})).not.toBeInTheDocument();
    expect(screen.queryByText('Dispatch complete')).not.toBeInTheDocument();
    expect(screen.getByText('Cancelled — fulfillment stopped.')).toBeVisible();
    expect(screen.queryByRole('list',{name:'Order lifecycle'})).not.toBeInTheDocument();
  });
  it('holds an order with an unlinked listing and opens the listing review from the item', () => {
    const record = listPrototypeOrders().find(item => item.id === 'DEMO-MAP-UNLINKED')!;
    mount(record);
    expect(screen.getByRole('alert', {name:'Order review details'})).toHaveTextContent('The whole order waits until every item is resolved.');
    const items = within(screen.getByRole('table', {name:'Order items'}));
    expect(items.getAllByRole('note')).toHaveLength(1);
    expect(items.getByRole('note')).toHaveTextContent('Needs product mapping · Listing SHP-CER-PAL-12 is not linked to a Product Master.');
    fireEvent.click(items.getByRole('button', {name:'Map product'}));
    expect(screen.getByRole('dialog', {name:'Review mapping'})).toHaveTextContent('Link this listing to a Product Master.');
    expect(screen.getByRole('button', {name:'Back to order'})).toBeVisible();
  });
  it('matches the dispatch warehouse to the stock source and shows live inventory for a listing order', () => {
    const record = listPrototypeOrders().find(item => item.id === 'DEMO-MAP-STOCK')!;
    mount(record);
    // Bug 1: Dispatch warehouse echoes the resolved shop warehouse, the same one the shortage warning names.
    expect(screen.getByText('Dispatch warehouse').parentElement).toHaveTextContent('Vietnam 3PL Partner');
    const items = within(screen.getByRole('table', {name:'Order items'}));
    // Bug 2: the Inventory column reflects live stock instead of a permanent "Not checked".
    expect(items.queryByText('Not checked')).not.toBeInTheDocument();
    expect(items.getAllByText('Not enough stock')).toHaveLength(2);
  });
});
