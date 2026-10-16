// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderQueue } from '@/lib/order-work-queues';
import { OrderNavigation } from './OrderNavigation';

const items: { key: OrderQueue; label: string; count: number }[] = [
  { key: 'all', label: 'All', count: 84 },
  { key: 'pending', label: 'Awaiting confirmation', count: 11 },
  { key: 'preparing', label: 'Preparing', count: 8 },
  { key: 'pickup', label: 'Ready to ship', count: 6 },
  { key: 'shipping', label: 'Shipping', count: 5 },
  { key: 'delivered', label: 'Delivered', count: 3 },
  { key: 'completed', label: 'Completed', count: 43 },
  { key: 'returns', label: 'Returns & refunds', count: 5 },
  { key: 'cancelled', label: 'Cancelled', count: 3 },
];
let availableWidth = 1600;
let resize: () => void;
const disconnect = vi.fn();

function Harness({ initial = 'all' }: { initial?: OrderQueue }) {
  const [value, setValue] = useState<OrderQueue>(initial);
  return <OrderNavigation items={items} value={value} loaded onChange={setValue} />;
}

beforeEach(() => {
  availableWidth = 1600;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.tagName === 'NAV' ? availableWidth
      : this.hasAttribute('data-status-width') ? 120
      : this.hasAttribute('data-more-width') ? 90
      : this.hasAttribute('data-selected-width') ? 240 : 0;
    return { width, height: 44, top: 0, bottom: 44, left: 0, right: width, x: 0, y: 0, toJSON() {} };
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: () => void) {}
    observe(element: Element) { if (element.tagName === 'NAV') resize = this.callback; }
    disconnect = disconnect;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('Order status navigation', () => {
  it('shows every status with a decorative icon when there is room', () => {
    render(<Harness />);
    const navigation = within(screen.getByRole('navigation', { name: 'Order lifecycle' }));
    expect(navigation.getAllByRole('button')).toHaveLength(9);
    expect(screen.queryByRole('button', { name: /More order statuses/ })).not.toBeInTheDocument();
    for (const item of items) {
      expect(navigation.getByRole('button', { name: `${item.label} ${item.count}` }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
    fireEvent.click(navigation.getByRole('button', { name: 'Preparing 8' }));
    expect(navigation.getByRole('button', { name: 'Preparing 8' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(navigation.getByRole('button', { name: 'Ready to ship 6' }));
    expect(navigation.getByRole('button', { name: 'Ready to ship 6' })).toHaveAttribute('aria-current', 'page');
  });

  it('moves trailing statuses into More and keeps the selected status and totals visible through resize', async () => {
    availableWidth = 500;
    const { unmount } = render(<Harness />);
    expect(screen.getByRole('button', { name: 'Preparing 8' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shipping 5' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'More order statuses' }), { key: 'ArrowDown' });
    const menu = within(await screen.findByRole('menu'));
    expect(menu.getAllByRole('menuitemradio')).toHaveLength(6);
    expect(menu.getByRole('menuitemradio', { name: 'Ready to ship 6' })).toBeInTheDocument();
    expect(menu.getByRole('menuitemradio', { name: 'Shipping 5' })).toBeInTheDocument();
    fireEvent.click(menu.getByRole('menuitemradio', { name: 'Completed 43' }));
    const trigger = screen.getByRole('button', { name: 'More order statuses, selected: Completed 43' });
    expect(trigger).toHaveAttribute('aria-current', 'page');
    expect(trigger).toHaveTextContent('Completed 43');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(await screen.findByRole('menuitemradio', { name: 'Completed 43' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    act(() => { availableWidth = 1600; resize(); });
    expect(screen.queryByRole('button', { name: /More order statuses/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed 43' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'All 84' })).toBeInTheDocument();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps All plus the active overflow status on a narrow screen, including on direct entry', async () => {
    availableWidth = 240;
    render(<Harness initial="returns" />);
    const nav = within(screen.getByRole('navigation', { name: 'Order lifecycle' }));
    expect(nav.getAllByRole('button')).toHaveLength(2);
    expect(nav.getByRole('button', { name: 'All 84' })).toBeInTheDocument();
    fireEvent.keyDown(nav.getByRole('button', { name: 'More order statuses, selected: Returns & refunds 5' }), { key: 'ArrowDown' });
    expect(await screen.findByRole('menuitemradio', { name: 'Returns & refunds 5' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(8);
  });
});
