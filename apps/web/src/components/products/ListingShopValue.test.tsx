// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListingShopValue } from './ListingShopValue';
import { ListingMasterSyncControl } from './ListingMasterSync';

afterEach(cleanup);
describe('Compact listing cells', () => {
  it('renders values without repeating their provenance', () => {
    const { container } = render(<><ListingShopValue data={{ price: { amount: 4200, currency: 'MYR', origin: 'saved' } }} field="price" /><ListingShopValue data={{ stock: 0 }} field="stock" /></>);
    expect(container.textContent).toBe('4,200 MYR0 units');
  });
  it('keeps unknown data distinct from zero and accessible', () => {
    render(<><ListingShopValue data={{}} field="price" /><ListingShopValue data={{}} field="stock" /></>);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Listing price unavailable')).toHaveClass('sr-only');
    expect(screen.getByText('Shop stock unavailable')).toHaveClass('sr-only');
    expect(screen.queryByText('0 units')).not.toBeInTheDocument();
  });
  it.each([true, false])('shows only the sync button for enabled=%s and preserves its action', enabled => {
    const onOpen = vi.fn();
    const { container } = render(<ListingMasterSyncControl preference={{ enabled, fields: ['content', 'media'] }} shop="Example shop" onOpen={onOpen} />);
    expect(container.textContent).toBe(enabled ? 'Sync on' : 'Sync off');
    fireEvent.click(screen.getByRole('button', { name: `Master sync settings for Example shop: ${enabled ? 'on' : 'off'}` }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it('retains the explanation when a control cannot be used', () => {
    render(<ListingMasterSyncControl preference={{ enabled: false, fields: [] }} shop="Example shop" onOpen={vi.fn()} disabled disabledReason="Archived Master" />);
    expect(screen.getByText('Archived Master')).toBeVisible();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
