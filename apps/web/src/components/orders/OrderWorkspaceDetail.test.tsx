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
  it.each([['draft','Draft'],['created','Order needs confirmation'],['acknowledged','Processing'],['allocated','Processing'],['fulfillment_in_progress','Processing'],['partially_shipped','In Transit'],['shipped','In Transit'],['delivered','Delivered'],['closed','Completed'],['canceled','Cancelled']])('explains the %s stage', (status,title)=>{
    mount({...order,canonicalStatus:status as CanonicalStatus});
    expect(within(screen.getByRole('region',{name:'Current order step'})).getByRole('heading',{name:title})).toBeInTheDocument();
  });
  it('shows operational data in one view and opens the complete audit log separately', () => {
    const record={...order,lines:[{...order.lines[0],imageUrl:'/images/orders/sample-notebook.svg',inventory:{onHand:3,committed:3,reservedForOrder:2,warehouse:'HCM',checkedAt:'2026-09-10T09:00:00Z'}}],operations:{shipBy:'2026-09-11T11:00:00Z',carrier:'GHN',service:'Standard',package:{weightKg:1.2,lengthCm:25,widthCm:18,heightCm:10},settlement:{platformFees:8000,sellerShipping:20000,adjustments:0,netAmount:72000,status:'estimated' as const},invoice:{requested:true,company:'Sample Company',taxId:'DEMO-TAX',address:'Sample address'}},activity:Array.from({length:4},(_,i)=>({id:String(i),at:`2026-09-10T0${i}:00:00Z`,message:`Event ${i}`,actor:'Operator'}))};
    mount(record);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Returns / RMA')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Inventory details for SKU-A'})).toHaveTextContent('Sufficient · 2');
    expect(screen.getByText('Ship-by deadline')).toBeInTheDocument();
    expect(screen.getByText('1.2 kg')).toBeInTheDocument();
    expect(screen.getByText('Estimated net settlement')).toBeInTheDocument();
    expect(screen.getByText('DEMO-TAX')).toBeInTheDocument();
    expect(screen.queryByText('Event 0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'View all',exact:true}));
    expect(within(screen.getByRole('dialog',{name:'Order activity'})).getByText('Event 0')).toBeInTheDocument();
  });
  it('only labels packed orders ready to ship when pickup readiness is reported', () => {
    expect(getOrderDetailStatus({...order,canonicalStatus:'allocated',readyForPickup:true})).toBe('Processing');
    expect(getOrderDetailStatus({...order,canonicalStatus:'fulfillment_in_progress',readyForPickup:false})).toBe('Processing');
    const ready={...order,canonicalStatus:'fulfillment_in_progress' as const,readyForPickup:true};
    expect(getOrderDetailStatus(ready)).toBe('Ready to Ship');
    expect(getOrderDetailSteps(ready).find(step=>step.current)?.label).toBe('Ready to Ship');
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
    expect(screen.queryByRole('button',{name:'Close order'})).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Damaged')).toBeInTheDocument();
    expect(getOrderDetailFlow({...returned,returnRequests:[{...returned.returnRequests[0],status:'closed'}]}).title).toBe('Delivered');
  });
  it('blocks lifecycle commands for sample, read-only and terminal records',()=>{
    for(const record of [{...order,source:'demo' as const},{...order,canonicalStatus:'closed' as const},{...order,canonicalStatus:'canceled' as const}]) {
      const allowed=getOrderDetailPermissions(record,true);
      expect([allowed.editDraft,allowed.submit,allowed.confirm,allowed.cancel,allowed.warehouse,allowed.payment,allowed.close]).not.toContain(true);
    }
    expect(Object.values(getOrderDetailPermissions(order,false))).not.toContain(true);
    expect(getOrderDetailPermissions({...order,canonicalStatus:'delivered',payment:{...order.payment,state:'Paid'}},true).close).toBe(true);
  });
});
