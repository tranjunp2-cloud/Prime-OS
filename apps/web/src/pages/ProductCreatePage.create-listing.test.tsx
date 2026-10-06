// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
let master: Product;
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); Element.prototype.scrollIntoView = vi.fn();
  master = { ...getProducts().find(product => !product.has_variants)!, id: 'create-integration-' + crypto.randomUUID(),
    name: 'Creation test product', sku_code: 'CREATE-TEST', status: 'draft', category: 'Books', categoryId: 'books',
    description: 'Complete product information for testing a new shop listing. '.repeat(4), images: ['/image.jpg'],
    price_currency: 'VND', retail_price: 100, inventory: { wh_crjp: 20 },
    has_variants: false, product_type: 'single', skus: [], variant_options: [], specifications: [],
    pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100, record_version: 1,
    import_result: undefined, import_sources: [], import_issues: [], revisions: [],
    channels: [{ channel: 'amazon', store_name: 'Prime Beauty US', external_id: 'US-LISTING', shop_sku: 'US-SKU',
      status: 'active', listing_url: null, last_synced_at: null, publication_unconfirmed: true,
      master_data_sync: { enabled: false, fields: [], updated_at: '2026-10-01T00:00:00Z' } }],
    channel_overrides: { webstore: { enabled: true, title: 'Existing storefront', description: 'Keep me', price_markup: 0, listing_sku: 'WEB-OLD' } },
  };
  addProduct(master);
});
afterEach(() => { cleanup(); deleteProduct(master.id); vi.restoreAllMocks(); });
async function mount() {
  const result = render(<MemoryRouter initialEntries={[`/products/${master.id}/edit?section=distribution`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
  return result;
}
describe('Create listing from Product Master', () => {
  it('excludes existing shops, permits another shop on the same channel and cancels without writes', async () => {
    await mount();
    const before = JSON.stringify(getProductById(master.id));
    fireEvent.click(screen.getByRole('button', { name: 'Create listing' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Create channel listings' }));
    expect(dialog.queryByRole('button', { name: /Select primebeauty.vn · PrimeWeb/ })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Select Prime Beauty Japan · Amazon' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(dialog.getByRole('button', { name: 'Select District 1 Flagship · PrimePOS' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(JSON.stringify(getProductById(master.id))).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Create listing' }));
    expect(screen.getByRole('button', { name: 'Set up 0 shops' })).toBeDisabled();
  });
  it('adds only a selected draft with full data, and keeps it separate after remount and Master save', async () => {
    const view = await mount();
    const before = getProductById(master.id)!;
    fireEvent.click(screen.getByRole('button', { name: 'Create listing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select District 1 Flagship · PrimePOS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 shop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm listing price' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review new listings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create 1 draft' }));
    expect(screen.getByText('Listing drafts created')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    const after = getProductById(master.id)!;
    expect(after.channels).toHaveLength(before.channels.length + 1);
    expect(after.channel_overrides).toEqual(before.channel_overrides);
    expect(after.channels[0]).toEqual(before.channels[0]);
    const created = after.channels.find(listing => listing.channel === 'pos')!;
    expect(created.local_draft?.values).toMatchObject({ title: master.name, images: master.images, stock: 20, price: { amount: 100, currency: 'VND' } });
    const table = within(screen.getByRole('table', { name: 'Channel listings' }));
    const row = table.getAllByRole('row').find(item => item.textContent?.includes('District 1 Flagship'))!;
    expect(within(row).getByRole('button', { name: 'Manage listing' })).toBeEnabled();
    expect(within(row).getByRole('button', { name: /Master sync settings.*off/ })).toBeEnabled();
    view.unmount(); await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Create listing' }));
    expect(screen.queryByRole('button', { name: 'Select District 1 Flagship · PrimePOS' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Product data' }));
    fireEvent.change(screen.getByDisplayValue(master.name), { target: { value: 'Updated Master name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(master.id)!.channels.find(listing => listing.channel === 'pos')).toEqual(created);
    expect(getProductById(master.id)!.channels[0]).toEqual(before.channels[0]);
  });
});
