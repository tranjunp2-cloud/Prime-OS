// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderProcessingDialog } from './OrderProcessingDialog';
import { OrderBatchDialog } from './OrderBatchDialog';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';

vi.mock('@/lib/orders-api', async load => ({
  ...await load<typeof import('@/lib/orders-api')>(),
  ordersApi: { command: vi.fn(), list: vi.fn() },
}));
const order: OrderRecord = {
  id: 'first', orderKey: 'MAN-FIRST', requestKey: 'request', version: 1,
  source: 'manual', canonicalStatus: 'fulfillment_in_progress', currencyCode: 'VND',
  orderedAt: '2026-09-10T10:00:00Z',
  buyerSnapshot: { name: 'Lan', phone: '0900000000', email: '' },
  shippingAddressSnapshot: { address: '12 Test street', city: 'HCM', country: 'VN', postalCode: '' },
  lines: [{ id: 'line-1', sku: 'SKU-A', name: 'Notebook', quantity: 2, unitPrice: 50, lineTotal: 100 }],
  totals: { subtotal: 100, grandTotal: 100 }, payment: { state: 'Unpaid', method: 'COD', reference: '' },
  metadata: { store: 'Manual', warehouse: 'HCM', assignee: 'Operator', notes: '', tags: [], handlingType: 'self' },
  operations: { work: { preparedAt: '2026-09-10T10:10:00Z', preparedBy: 'Operator', stockMode: 'physical-check' } },
  shipments: [{ carrier: 'GHN', tracking: 'GHN-123', status: 'Awaiting packing' }],
  transitions: [], activity: [], exceptions: [], returnRequests: [],
};
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Seller order processing', () => {
  it('shows known details as summaries and only reveals prefilled fields when editing', () => {
    const prototype = {...order, source: 'demo', canonicalStatus: 'acknowledged' as const, shipments: [], operations: {carrier: 'GHN', service: 'Standard', shipBy: '2026-10-09T09:00:00Z', package: {weightKg: 1.2, lengthCm: 25, widthCm: 18, heightCm: 10}}};
    render(<OrderProcessingDialog order={prototype} action="prepare-shipment" onClose={vi.fn()} onUpdated={vi.fn()}/>);
    expect(screen.queryByLabelText('Dispatch warehouse')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Carrier')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument();
    expect(screen.getByText('1.2 kg · 25 × 18 × 10 cm')).toBeVisible();
    const tracking = screen.getByLabelText('Carrier-issued tracking number');
    fireEvent.change(tracking, {target: {value: 'G'}});
    expect(tracking).toBeVisible();
    fireEvent.change(tracking, {target: {value: 'GHN-5678'}});
    expect(tracking).toHaveValue('GHN-5678');
    fireEvent.click(screen.getByRole('button', {name: 'Edit dispatch warehouse'}));
    expect(screen.getByLabelText('Dispatch warehouse')).toHaveValue('HCM');
    expect(screen.getByLabelText('Ship-by deadline (optional)')).not.toHaveValue('');
    fireEvent.click(screen.getByRole('button', {name: 'Edit shipping details'}));
    expect(screen.getByLabelText('Carrier')).toHaveValue('GHN');
    fireEvent.click(screen.getByRole('button', {name: 'Edit parcel measurements'}));
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(1.2);
  });
  it('uses a simulated gateway update for cards, without manual evidence or mandatory measurements', async () => {
    const prototype = {...order, source: 'demo', payment: {...order.payment, method: 'Card'}};
    vi.mocked(ordersApi.command).mockResolvedValue({data: {...prototype, readyForPickup: true}});
    const close = vi.fn();
    render(<OrderProcessingDialog order={prototype} action="prepare-shipment" onClose={close} onUpdated={vi.fn()}/>);
    expect(screen.queryByLabelText('Payment reference / Evidence')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Verified quantity for SKU-A, line 1'), {target: {value: '2'}});
    fireEvent.click(screen.getByRole('checkbox', {name: 'Parcel packed and shipping label attached.'}));
    expect(screen.getByRole('button', {name: 'Mark ready to ship'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: 'Simulate payment update'}));
    expect(screen.getByText('Card · Paid (simulated)')).toBeVisible();
    expect(ordersApi.command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Mark ready to ship'}));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    const payload = vi.mocked(ordersApi.command).mock.calls[0][1];
    expect(payload.paymentUpdate).toBe('gateway-paid');
    expect(payload).not.toHaveProperty('paymentReference');
    expect(payload.package).toBeUndefined();
  });
  it('requires evidence only for manual payment and keeps invalid measurements recoverable', () => {
    render(<OrderProcessingDialog order={{...order, source:'demo', payment:{...order.payment, method:'Bank transfer', reference:'BANK-123'}}} action="prepare-shipment" onClose={vi.fn()} onUpdated={vi.fn()}/>);
    expect(screen.getByLabelText('Payment reference / Evidence')).toHaveValue('BANK-123');
    expect(screen.queryByRole('button', {name:'Simulate payment update'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Use sample values'}));
    expect(screen.getByRole('button', {name:'Mark ready to ship'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button', {name:'Edit parcel measurements'}));
    fireEvent.change(screen.getByLabelText('Weight (kg)'), {target:{value:'2'}});
    expect(screen.getByRole('button', {name:'Mark ready to ship'})).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('leave all measurements empty');
    fireEvent.change(screen.getByLabelText('Weight (kg)'), {target:{value:''}});
    expect(screen.getByRole('button', {name:'Mark ready to ship'})).toBeEnabled();
  });
  it('keeps platform shipping and deadlines read-only and submits only seller checks', async () => {
    const prototype = {...order, source:'demo', metadata:{...order.metadata, shippingMode:'platform' as const}, operations:{shipBy:'2026-10-10T09:00:00Z'}, shipments:[]};
    vi.mocked(ordersApi.command).mockResolvedValue({data:prototype});
    const close=vi.fn();
    render(<OrderProcessingDialog order={prototype} action="prepare-shipment" onClose={close} onUpdated={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name:'Edit dispatch warehouse'}));
    expect(screen.queryByLabelText('Ship-by deadline (optional)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Carrier-issued tracking number')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name:'Edit shipping details'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Use sample values'}));
    fireEvent.click(screen.getByRole('button', {name:'Mark ready to ship'}));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(vi.mocked(ordersApi.command).mock.calls[0][1].shipBy).toBeUndefined();
  });
  it('submits a prototype preparation as one action with no separate payment step for paid orders', async () => {
    const prototype={...order,source:'demo',payment:{...order.payment,state:'Paid'}};
    vi.mocked(ordersApi.command).mockResolvedValue({data:{...prototype,readyForPickup:true}});
    const close=vi.fn();
    render(<OrderProcessingDialog order={prototype} action="prepare-shipment" onClose={close} onUpdated={vi.fn()} />);
    expect(screen.queryByLabelText('Payment reference / Evidence')).not.toBeInTheDocument();
    expect(screen.getByText(/Shipment assigned/)).toBeVisible();
    expect(screen.queryByLabelText('Carrier-issued tracking number')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Use sample values'}));
    fireEvent.click(screen.getByRole('button',{name:'Mark ready to ship'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
    expect(ordersApi.command).toHaveBeenCalledOnce();
    expect(vi.mocked(ordersApi.command).mock.calls[0][1]).toMatchObject({action:'prepare-shipment',labelAttached:true,items:[{lineId:'line-1',quantity:2}]});
  });
  it('verifies exact SKU quantities and keeps the same request key after an uncertain save', async () => {
    vi.mocked(ordersApi.command).mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({ data: order });
    const updated = vi.fn(); const close = vi.fn();
    render(<OrderProcessingDialog order={order} action="pack" onClose={close} onUpdated={updated} />);
    const submit = screen.getByRole('button', { name: 'Finish packing' });
    const scan = screen.getByLabelText('Scan or enter SKU');
    function scanSku(value: string) {
      fireEvent.change(scan, { target: { value } });
      fireEvent.keyDown(scan, { key: 'Enter' });
    }
    scanSku('WRONG-SKU');
    expect(screen.getByRole('status')).toHaveTextContent('SKU not found');
    expect(submit).toBeDisabled();
    scanSku('SKU-A'); scanSku('SKU-A'); scanSku('SKU-A');
    expect(screen.getByRole('status')).toHaveTextContent('already verified');
    expect(screen.getByLabelText('Verified quantity for SKU-A, line 1')).toHaveValue(2);
    for (const label of ['Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)']) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: '1' } });
    }
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(1);
    const firstPayload = vi.mocked(ordersApi.command).mock.calls[0][1];
    expect(firstPayload).toMatchObject({ action: 'pack', labelAttached: true, items: [{ lineId: 'line-1', quantity: 2 }], requestId: expect.any(String) });
    fireEvent.click(submit);
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(vi.mocked(ordersApi.command).mock.calls[1][1]).toEqual(firstPayload);
    expect(updated).toHaveBeenCalledWith(order);
  });

  it('reloads a stale order without submitting another mutation', async () => {
    const latest = { ...order, version: 4, hold: { active: true, reason: 'Customer request', actor: 'CS', at: order.orderedAt } };
    vi.mocked(ordersApi.command).mockRejectedValue(new Error('Order changed. Refresh and try again.'));
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [latest], canWrite: true });
    const updated = vi.fn();
    render(<OrderProcessingDialog order={{ ...order, canonicalStatus: 'acknowledged', shipments: [] }} action="prepare" onClose={vi.fn()} onUpdated={updated} />);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare order' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reload latest order' }));
    await waitFor(() => expect(updated).toHaveBeenCalledWith(latest));
    expect(ordersApi.command).toHaveBeenCalledOnce();
  });
});

describe('Batch processing', () => {
  const first = { ...order, canonicalStatus: 'created' as const, shipments: [] };
  const second = { ...first, id: 'second', orderKey: 'MAN-SECOND' };

  it('reports partial failure and retries only the failed order with the same request ID', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [first, second], canWrite: true });
    vi.mocked(ordersApi.command).mockResolvedValueOnce({ data: { ...first, canonicalStatus: 'acknowledged' } })
      .mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ data: { ...second, canonicalStatus: 'acknowledged' } });
    render(<OrderBatchDialog canWrite={true} orders={[first, second]} onClose={vi.fn()} onUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm 2 orders' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 succeeded · 1 failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry 1 failed orders' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 succeeded · 0 failed'));
    const calls = vi.mocked(ordersApi.command).mock.calls;
    expect(calls.map(([record]) => record.id)).toEqual(['first', 'second', 'second']);
    expect(calls[2][1]).toEqual(calls[1][1]);
  });

  it('rechecks holds before writing and requires one carrier per pickup batch', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [{ ...first, hold: { active: true, reason: 'Changed', at: first.orderedAt, actor: 'CS' } }], canWrite: true });
    const { unmount } = render(<OrderBatchDialog canWrite={true} orders={[first]} onClose={vi.fn()} onUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm 1 orders' }));
    expect(await screen.findByText('Release the order hold before confirming.')).toBeInTheDocument();
    expect(ordersApi.command).not.toHaveBeenCalled();
    unmount();
    const packed = { ...order, readyForPickup: true, operations: { work: { ...order.operations!.work!, packedAt: order.orderedAt } } };
    render(<OrderBatchDialog canWrite={true} orders={[packed, { ...packed, id: 'other-carrier', shipments: [{ carrier: 'SPX', tracking: 'SPX-1', status: 'Awaiting pickup' }] }]} onClose={vi.fn()} onUpdated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Process 0 eligible orders' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Pickup carrier'), { target: { value: 'GHN' } });
    expect(screen.getByText('1 eligible · 1 will be skipped')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Process 1 eligible orders' })).toBeDisabled();
  });
  it('allows local prototypes without write access while skipping real orders', async () => {
    const demo = {...first, id: 'demo', orderKey: 'DEMO', source: 'demo'};
    vi.mocked(ordersApi.list).mockResolvedValue({data: [first, demo], canWrite: false});
    vi.mocked(ordersApi.command).mockResolvedValue({data: {...demo, canonicalStatus: 'acknowledged'}});
    render(<OrderBatchDialog canWrite={false} orders={[first, demo]} onClose={vi.fn()} onUpdated={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Confirm 1 orders'}));
    await screen.findByText('1 succeeded · 0 failed · 1 skipped');
    expect(ordersApi.command).toHaveBeenCalledOnce();
    expect(vi.mocked(ordersApi.command).mock.calls[0][0].id).toBe('demo');
  });

  it('prints only confirmed orders still eligible after revalidation and never confirms again to retry printing', async () => {
    const confirmed = {...first, canonicalStatus: 'acknowledged' as const};
    const other = {...second, canonicalStatus: 'acknowledged' as const};
    vi.mocked(ordersApi.list).mockResolvedValueOnce({data: [first, second], canWrite: true})
      .mockResolvedValue({data: [confirmed, {...other, hold: {active: true, reason: 'Changed', at: first.orderedAt, actor: 'CS'}}], canWrite: true});
    vi.mocked(ordersApi.command).mockResolvedValueOnce({data: confirmed}).mockResolvedValueOnce({data: other});
    const print = vi.fn();
    const document = window.document.implementation.createHTMLDocument();
    vi.spyOn(window, 'open').mockReturnValue({document, print, focus: vi.fn(), close: vi.fn()} as unknown as Window);
    render(<OrderBatchDialog canWrite orders={[first, second]} onClose={vi.fn()} onUpdated={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Confirm 2 orders'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Print packing slips (2)'}));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(document.body.textContent).toContain('MAN-FIRST');
    expect(document.body.textContent).not.toContain('MAN-SECOND');
    expect(await screen.findByText(/1 packing slips sent to the print dialog · 1 skipped/)).toHaveTextContent('MAN-SECOND: Release the order hold');
    expect(ordersApi.command).toHaveBeenCalledTimes(2);
    vi.mocked(window.open).mockReturnValue(null);
    fireEvent.click(screen.getByRole('button', {name: 'Print packing slips (2)'}));
    expect(screen.getByRole('alert')).toHaveTextContent('Allow pop-ups');
    expect(ordersApi.command).toHaveBeenCalledTimes(2);
  });

  it('does not print waiting, marketplace or held orders in the packing queue', async () => {
    const held = {...order, id: 'held', hold: {active: true, reason: 'Review', actor: 'CS', at: order.orderedAt}};
    const marketplace = {...order, id: 'marketplace', metadata: {...order.metadata, handlingType: 'marketplace' as const}};
    const data = [order, {...first, id: 'waiting'}, held, marketplace];
    vi.mocked(ordersApi.list).mockResolvedValue({data, canWrite: false});
    const print = vi.fn();
    const document = window.document.implementation.createHTMLDocument();
    vi.spyOn(window, 'open').mockReturnValue({document, print, focus: vi.fn(), close: vi.fn()} as unknown as Window);
    render(<OrderBatchDialog canWrite={false} initialAction="print" orders={data} onClose={vi.fn()} onUpdated={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Print 1 packing slips'}));
    await screen.findByText('1 sent to print dialog · 0 failed · 3 skipped');
    expect(print).toHaveBeenCalledOnce();
    expect(document.querySelectorAll('section')).toHaveLength(1);
    expect(ordersApi.command).not.toHaveBeenCalled();
  });

  it('preserves print exclusions on retry and never adds newly eligible or synced orders', async () => {
    const other = {...order, id: 'second', orderKey: 'MAN-SECOND'};
    const waiting = {...first, id: 'waiting', orderKey: 'WAITING'};
    const newOrder = {...order, id: 'new', orderKey: 'NEW-SYNC'};
    // The waiting order becomes printable after opening the review; it was never selected.
    vi.mocked(ordersApi.list).mockResolvedValue({data: [order, other, {...waiting, canonicalStatus: 'acknowledged'}, newOrder], canWrite: false});
    const print = vi.fn();
    const documents: Document[] = [];
    vi.spyOn(window, 'open').mockImplementation(() => {
      const document = window.document.implementation.createHTMLDocument(); documents.push(document);
      return {document, print, focus: vi.fn(), close: vi.fn()} as unknown as Window;
    });
    render(<OrderBatchDialog canWrite={false} initialAction="print" orders={[order, other, waiting]} onClose={vi.fn()} onUpdated={vi.fn()}/>);
    expect(screen.getByRole('checkbox', {name: 'Include WAITING'})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', {name: 'Select all eligible orders in this batch'}));
    expect(screen.getByRole('button', {name: 'Print 0 packing slips'})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', {name: 'Select all eligible orders in this batch'}));
    fireEvent.click(screen.getByRole('checkbox', {name: 'Include MAN-SECOND'}));
    expect(screen.getByRole('checkbox', {name: 'Select all eligible orders in this batch'})).toHaveAttribute('data-state', 'indeterminate');
    expect(window.open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Print 1 packing slips'}));
    await screen.findByText('1 sent to print dialog · 0 failed · 1 skipped');
    fireEvent.click(screen.getByRole('button', {name: 'Open print dialog again'}));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
    for (const document of documents) {
      expect(document.querySelectorAll('section')).toHaveLength(1);
      expect(document.body.textContent).toContain('MAN-FIRST');
      for (const excluded of ['MAN-SECOND', 'WAITING', 'NEW-SYNC']) expect(document.body.textContent).not.toContain(excluded);
    }
    expect(ordersApi.command).not.toHaveBeenCalled();
  });

});
