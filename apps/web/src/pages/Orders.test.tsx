// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Orders from './Orders';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';

vi.mock('@/lib/orders-api', async (load) => ({ ...await load<typeof import('@/lib/orders-api')>(), ordersApi: { list: vi.fn(), create: vi.fn(), command: vi.fn() } }));
const order: OrderRecord = { id: 'order-test', orderKey: 'MAN-TEST', requestKey: 'req-1', version: 1, source: 'manual', canonicalStatus: 'created', orderedAt: '2026-09-10T10:00:00Z', currencyCode: 'VND', buyerSnapshot: { name: 'Lan', phone: '0900123456', email: '' }, shippingAddressSnapshot: { address: '123 Le Loi', city: 'HCM', country: 'VN', postalCode: '' }, lines: [{ sku: 'SKU-A', name: 'Product A', quantity: 2, unitPrice: 50000, lineTotal: 100000 }], totals: { subtotal: 100000, grandTotal: 100000 }, payment: { state: 'Unpaid', method: 'COD', reference: '' }, metadata: { store: 'Manual', warehouse: 'HCM', assignee: 'Unassigned', notes: '', tags: [] }, transitions: [], shipments: [], returnRequests: [], exceptions: [], activity: [] };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount() { return render(<MemoryRouter><Orders /></MemoryRouter>); }
describe('Orders workspace', () => {
  it('does not report empty results or urgent issues while loading or when the endpoint is missing', async () => {
    let rejectRequest!: (error: Error) => void;
    vi.mocked(ordersApi.list).mockReturnValue(new Promise((_, reject) => { rejectRequest = reject; }));
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Loading orders');
    expect(screen.queryByText('No matching orders')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Urgent actions')).not.toBeInTheDocument();
    rejectRequest(new Error('Unknown resource: v1'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Orders could not be loaded');
    expect(screen.queryByText('No matching orders')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Urgent actions')).not.toBeInTheDocument();
  });
  it('shows the actual empty state without four zero-count urgent queues', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [], canWrite: true }); mount();
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.queryByLabelText('Urgent actions')).not.toBeInTheDocument();
  });
  it('retains loaded orders when refresh fails', async () => {
    vi.mocked(ordersApi.list).mockResolvedValueOnce({ data: [order], canWrite: true }).mockRejectedValue(new Error('Unavailable'));
    mount(); await screen.findByRole('button', { name: 'MAN-TEST' });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Showing the last loaded data');
    expect(screen.getByRole('button', { name: 'MAN-TEST' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create order' })).toBeDisabled();
  });
  it('loads server records, filters by phone, and opens real item details', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [order], canWrite: true }); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'MAN-TEST' }));
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.queryByText('HydraGlow Essence 30ml')).not.toBeInTheDocument();
  });
  it('separates lifecycle groups, exact statuses, payments and return labels', async () => {
    const returned = {...order,id:'returned',orderKey:'RETURN-TEST',canonicalStatus:'closed' as const,payment:{...order.payment,state:'Refunded'},returnRequests:[{id:'ret',status:'closed',reason:'Sample',items:[]}]};
    const delivered = {...order,id:'delivered',orderKey:'DELIVERED-TEST',canonicalStatus:'delivered' as const};
    vi.mocked(ordersApi.list).mockResolvedValue({data:[order,returned,delivered],canWrite:true}); mount();
    await screen.findByRole('button',{name:'MAN-TEST'});
    expect(screen.getByText('Return · closed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/^Completed/}));
    expect(screen.getByRole('button',{name:'DELIVERED-TEST'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'RETURN-TEST'})).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Exact order status'),{target:{value:'closed'}});
    expect(screen.getByRole('button',{name:'RETURN-TEST'})).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Payment status'),{target:{value:'Paid'}});
    expect(screen.queryByRole('button',{name:'RETURN-TEST'})).not.toBeInTheDocument();
    expect(screen.getByLabelText('Exact order status').querySelectorAll('option')).toHaveLength(11);
  });
  it('counts affected orders once and excludes routine unpaid orders from attention', async () => {
    const routine={...order,payment:{...order.payment,method:'Bank transfer'}};
    const flagged={...order,id:'flagged',orderKey:'FLAGGED',syncError:true,pickupOverdue:true,needsPaymentVerification:true};
    const overdue={...order,id:'overdue',orderKey:'OVERDUE',sla:'Breached by 30m'};
    vi.mocked(ordersApi.list).mockResolvedValue({data:[routine,flagged,overdue],canWrite:true});mount();
    const attention=await screen.findByRole('button',{name:'Needs attention (2)'});
    expect(screen.queryByLabelText('Order summary')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Urgent actions')).not.toBeInTheDocument();
    fireEvent.click(attention);
    expect(screen.queryByRole('button',{name:'MAN-TEST'})).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'FLAGGED'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'OVERDUE'})).toBeInTheDocument();
    expect(attention).toHaveAttribute('aria-pressed','true');
    fireEvent.click(attention);
    expect(screen.getByRole('button',{name:'MAN-TEST'})).toBeInTheDocument();
  });
  it('creates an order, updates the list, and displays the saved detail', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [], canWrite: true });
    vi.mocked(ordersApi.create).mockResolvedValue({ data: order }); mount();
    const create = screen.getByRole('button', { name: 'Create order' }); await waitFor(() => expect(create).toBeEnabled()); fireEvent.click(create);
    const values = { 'Customer name': 'Lan', 'Phone number': '0900123456', 'Street address': '123 Le Loi', 'City / Province': 'HCM', 'Item 1 SKU': 'SKU-A', 'Item 1 name': 'Product A', 'Item 1 quantity': '2', 'Item 1 unit price': '50000' };
    Object.entries(values).forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
    const submit = screen.getAllByRole('button', { name: 'Create order' }).find((b) => b.getAttribute('type') === 'submit')!;
    fireEvent.click(submit);
    await waitFor(() => expect(ordersApi.create).toHaveBeenCalledOnce());
    expect(vi.mocked(ordersApi.create).mock.calls[0][0]).toMatchObject({ canonicalStatus: 'created', buyerSnapshot: { name: 'Lan' }, lines: [{ quantity: 2, unitPrice: 50000 }] });
    expect(await screen.findByRole('heading', { name: 'MAN-TEST' })).toBeInTheDocument();
  });
  it('keeps the entered form after a server failure and shows its error', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [], canWrite: true });
    vi.mocked(ordersApi.create).mockRejectedValue(new Error('Order reference already exists.')); mount();
    const create = screen.getByRole('button', { name: 'Create order' }); await waitFor(() => expect(create).toBeEnabled()); fireEvent.click(create);
    fireEvent.submit(screen.getByLabelText('Order reference').closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Order reference already exists.');
    expect((screen.getByLabelText('Order reference') as HTMLInputElement).value).toContain('MAN-');
  });
  it('shows load failures and keeps create disabled for read-only access', async () => {
    vi.mocked(ordersApi.list).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue({ data: [order], canWrite: false }); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('button', { name: 'MAN-TEST' }); expect(screen.getByRole('button', { name: 'Create order' })).toBeDisabled();
  });
});
