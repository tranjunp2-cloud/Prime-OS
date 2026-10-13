// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoOrders } from '../../../../../packages/order-workflow/demo-orders.js';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { OrderShippingLabelsDialog } from './OrderShippingLabelsDialog';

vi.mock('@/lib/orders-api', async load => ({...await load<typeof import('@/lib/orders-api')>(), ordersApi: {list: vi.fn()}}));
const order = (demoOrders() as OrderRecord[]).find(record => record.id === 'DEMO-PREPARE-PAID')!;
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Shipping labels awaiting printing', () => {
  it('freezes the chosen orders and skips old orders rather than offering their labels', async () => {
    const old = {...order, id: 'old', orderKey: 'OLD', canonicalStatus: 'shipped' as const};
    const incoming = {...order, id: 'incoming', orderKey: 'NEW'};
    vi.mocked(ordersApi.list).mockResolvedValue({data: [order, old, incoming], canWrite: true});
    render(<OrderShippingLabelsDialog orders={[order, old]} onClose={vi.fn()}/>);
    expect(await screen.findByRole('button', {name: /Open sample label/})).toBeEnabled();
    expect(screen.getAllByRole('button', {name: /Open sample label/})).toHaveLength(1);
    expect(screen.getByText(/Skipped.*not preparing/)).toBeInTheDocument();
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it.each(['handover', 'printed', 'ready'] as const)('rechecks and blocks a label after %s', async change => {
    const updated = change === 'handover' ? {...order, canonicalStatus: 'shipped' as const} : change === 'ready' ? {...order, readyForPickup: true} : {...order, operations: {...order.operations, printStatus: {shippingLabel: 'Printed · Seller'}}};
    vi.mocked(ordersApi.list).mockResolvedValueOnce({data: [order], canWrite: true}).mockResolvedValue({data: [updated], canWrite: true});
    const close = vi.fn(); const replace = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({close, location: {replace}} as unknown as Window);
    render(<OrderShippingLabelsDialog orders={[order]} onClose={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', {name: /Open sample label/}));
    await screen.findByRole('alert');
    expect(replace).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', {name: /Open sample label/})).not.toBeInTheDocument();
  });

  it('opens the current eligible label without inventing a printed status', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({data: [order], canWrite: true});
    const popup = {close: vi.fn(), opener: 'parent', location: {replace: vi.fn()}};
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    render(<OrderShippingLabelsDialog orders={[order]} onClose={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', {name: /Open sample label/}));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith(order.shipments[0].labelUrl));
    expect(popup.opener).toBeNull();
    expect(order.operations?.printStatus?.shippingLabel).toBe('Not printed');
  });
});
