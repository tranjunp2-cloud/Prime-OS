// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListingMasterSyncDialog } from './ListingMasterSync';
import { getProducts, type ChannelListing, type Product } from '@/lib/product-store';
import { PRICING_STORAGE_KEY } from '@/lib/pricing-rules';

afterEach(() => { cleanup(); localStorage.removeItem(PRICING_STORAGE_KEY); });
const listing: ChannelListing = { channel: 'website', external_id: 'sync-ui', shop_sku: 'SHOP', status: 'active', listing_url: null, last_synced_at: null };
function mount(extra: Partial<Product> = {}) {
  const master = { ...getProducts()[0], product_type: 'single' as const, has_variants: false, skus: [], images: ['/one.jpg'], name: 'Master name', brand: 'Master brand', channels: [listing], channel_overrides: {}, import_sources: [], inventory: { wh_crjp: 20 }, retail_price: 1000, price_currency: 'JPY', pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100, ...extra };
  const onSave = vi.fn(), onClose = vi.fn();
  render(<ListingMasterSyncDialog master={master} listing={listing} preference={{ enabled: true, fields: ['content', 'media'] }} shop="Shop" sku="SHOP" onSave={onSave} onClose={onClose} restoreFocus={vi.fn()} />);
  return { onSave, onClose };
}
describe('Five-group sync dialog', () => {
  it('shows independent values and an explicit replacement warning before re-enabling sync', () => {
    const target = { ...listing, local_draft: { values: { title: 'Independent title', description: 'Independent description', brand: 'Independent brand', images: ['/independent.jpg'] }, updated_at: '' } };
    const master = { ...getProducts()[0], name: 'Canonical title', description: 'Canonical description', images: ['/master.jpg'], channels: [target], channel_overrides: {}, import_sources: [] };
    const onSave = vi.fn(), onClose = vi.fn();
    render(<ListingMasterSyncDialog master={master} listing={target} preference={{ enabled: false, fields: ['content', 'media'] }} shop="Shop" sku="SHOP" onSave={onSave} onClose={onClose} restoreFocus={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /^Sync on/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Review settings' }));
    const review = within(screen.getByRole('region', { name: 'Review sync settings' }));
    expect(review.getByRole('note')).toHaveTextContent('Master values replace the independent values');
    for (const text of ['Independent title', 'Canonical title', 'Independent description', 'Canonical description']) expect(review.getByText(text)).toBeVisible();
    expect(review.getByRole('img', { name: 'Current listing image 1' })).toHaveAttribute('src', '/independent.jpg');
    expect(review.getByRole('img', { name: 'Master image 1' })).toHaveAttribute('src', '/master.jpg');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save sync settings' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, fields: ['content', 'media'] }), expect.any(String));
    expect(target.local_draft.values.title).toBe('Independent title');
  });
  it('shows all groups but does not preselect price, stock or shipping', () => {
    mount();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    for (const name of ['Selling price', 'Stock', 'Shipping & compliance']) expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Save sync settings' })).not.toBeInTheDocument();
  });
  it('configures price and stock, reviews then saves exactly the chosen settings', () => {
    const { onSave } = mount();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selling price' }));
    expect(screen.getByRole('button', { name: 'Review settings' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Listing currency'), { target: { value: 'JPY' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Stock' }));
    fireEvent.change(screen.getByLabelText('Stock source'), { target: { value: 'wh_crjp' } });
    fireEvent.change(screen.getByLabelText('Safety buffer'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Allocation cap (optional)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shipping & compliance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review settings' }));
    expect(onSave).not.toHaveBeenCalled();
    const review = within(screen.getByRole('region', { name: 'Review sync settings' }));
    expect(review.getByText('1,000 JPY')).toBeVisible();
    expect(review.getByText('10 units')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save sync settings' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ fields: ['content', 'media', 'price', 'inventory', 'shipping'], pricing: { currency: 'JPY' }, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 2, allocation_cap: 10 } }), expect.any(String));
  });
  it('can turn everything off despite missing data', () => {
    const { onSave } = mount({ images: [], inventory: {}, retail_price: 0 });
    fireEvent.click(screen.getByRole('radio', { name: /^Sync off/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Review settings' }));
    expect(screen.getAllByText('Keep shop data')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Save sync settings' }));
    expect(onSave.mock.calls[0][0].enabled).toBe(false);
  });
  it('keeps shipping errors scoped to that group and cancel writes nothing', () => {
    const { onSave, onClose } = mount({ pkg_weight: 0 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shipping & compliance' }));
    expect(screen.getByRole('alert')).toHaveTextContent('dimensions and weight');
    expect(screen.getByRole('button', { name: 'Review settings' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shipping & compliance' }));
    expect(screen.getByRole('button', { name: 'Review settings' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
  it('returns from review without losing choices and requires a new review', () => {
    const { onSave } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Review settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }));
    expect(screen.getByRole('checkbox', { name: 'Images' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Save sync settings' })).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
