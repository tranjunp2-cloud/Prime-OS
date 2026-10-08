// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {OrderWorkspaceDetail} from './OrderWorkspaceDetail';
import {getOrderDetailFlow, getOrderDetailStatus, getOrderDetailSteps, getOrderDetailPermissions} from '@/lib/order-detail-flow';
import {ordersApi, type OrderRecord, type CanonicalStatus} from '@/lib/orders-api';
vi.mock('@/lib/orders-api', async (load) => ({...await load<typeof import('@/lib/orders-api')>(), ordersApi:{command:vi.fn()}}));
const order: OrderRecord = { id: 'order-test', orderKey: 'MAN-TEST', requestKey: 'req-1', version: 1, source: 'manual', canonicalStatus: 'created', orderedAt: '2026-09-10T10:00:00Z', currencyCode: 'VND', buyerSnapshot: { name: 'Lan', phone: '0900123456', email: '' }, shippingAddressSnapshot: { address: '123 Le Loi', city: 'HCM', country: 'VN', postalCode: '' }, lines: [{ sku: 'SKU-A', name: 'Product A', quantity: 2, unitPrice: 50000, lineTotal: 100000 }], totals: { subtotal: 100000, grandTotal: 100000 }, payment: { state: 'Unpaid', method: 'COD', reference: '' }, metadata: { store: 'Manual', warehouse: 'HCM', assignee: 'Unassigned', notes: '', tags: [] }, transitions: [], shipments: [], returnRequests: [], exceptions: [], activity: [] };
afterEach(()=>{cleanup(); vi.clearAllMocks();});
function mount(record=order) {return render(<OrderWorkspaceDetail order={record} canWrite onClose={()=>{}} onUpdated={()=>{}} onEditDraft={()=>{}}/>);}
describe('Order detail workflows',()=>{
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
    expect(screen.getByText('Estimated net settlement')).not.toBeVisible();
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
    expect(screen.getByText(/No real payments, shipments or stock changes/)).toBeVisible();
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
    expect(screen.getByRole('button',{name:'Confirm Order'})).toBeEnabled();
    expect(screen.getByText(/Payment is required before preparation/)).toBeVisible();
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
});
