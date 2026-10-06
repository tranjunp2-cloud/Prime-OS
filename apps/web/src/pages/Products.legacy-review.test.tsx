// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import Products from './Products';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, type Product } from '@/lib/product-store';
import { pendingListingReviews } from '@/lib/product-listing-intake';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-product-channel-setup', () => ({ useProductChannelSetup: () => ({ snapshot: { status: 'loaded', channels: [] }, retry: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
let product: Product;
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  product = { ...getProducts()[0], ...readyMasterFields(), id: `legacy-ui-${crypto.randomUUID()}`, name: 'Legacy UI Master', sku_code: `LEGACY-UI-${crypto.randomUUID()}`, status: 'review', import_result: 'needs_review', import_issues: ['Variant structure conflict: verify the source pack'], import_sources: [], has_variants: false, product_type: 'single', skus: [], description: '', inventory: { wh_crjp: 23 }, channels: [{ channel: 'amazon', external_id: 'legacy-ui-shop-listing', store_name: 'Legacy UI shop', shop_sku: 'LEGACY-UI-SHOP', reported_stock: 8, status: 'active', listing_url: null, last_synced_at: null }], channel_overrides: { amazon: { title: 'Legacy UI source listing', enabled: true, description: '', price_markup: 0 } } };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(product.id); vi.restoreAllMocks(); });
const current = () => getProductById(product.id)!;
function mount(path = '/products/master-catalog') {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/products/master-catalog" element={<Products />} /><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
}
function openCurrentLink() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Search shop listings' }), { target: { value: 'Legacy UI' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review current link' }));
}
describe('Legacy review moved upstream, not discarded', () => {
  it('keeps Fix data on the Master and reviews an existing link in the same inbox without automatic writes', async () => {
    const before = JSON.stringify(current());
    const pending = pendingListingReviews().length;
    mount();
    const row = (await screen.findByRole('link', { name: 'Open Product Master details for Legacy UI Master' })).closest('tr')!;
    expect(row).not.toHaveTextContent('decision to review');
    expect(within(row).getByRole('button', { name: 'Fix data for Legacy UI Master' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: `Review & link (${pending})` }));
    openCurrentLink();
    expect(screen.getByText('Current Product Master')).toBeVisible();
    expect(screen.getByRole('note')).toHaveTextContent('Variant structure conflict');
    expect(screen.getByRole('button', { name: 'Link to this Master' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Source listing' })).toHaveTextContent('SKU structure not recorded');
    fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
    expect(screen.getByRole('textbox', { name: 'Search shop listings' })).toHaveValue('Legacy UI');
    expect(JSON.stringify(current())).toBe(before);
    expect(pendingListingReviews()).toHaveLength(pending);
    openCurrentLink();
    fireEvent.click(screen.getByRole('checkbox', { name: /Source structure is not recorded. I checked the shop listing:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Link to this Master' }));
    expect(current().status).toBe(product.status);
    expect(current().inventory).toEqual(product.inventory);
    expect(current().channels[0]).toMatchObject(product.channels[0]);
    expect(pendingListingReviews()).toHaveLength(pending - 1);
  });
  it('has no old decision panel in Master detail and its inbox shortcut preserves existing links', async () => {
    const before = JSON.stringify(current());
    mount(`/products/${product.id}/edit`);
    expect(screen.queryByText('Confirm how this pack should be managed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create separate Product Master' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Review shop links in inbox/ }));
    expect(await screen.findByRole('dialog', { name: 'Review shop listings' })).toBeVisible();
    openCurrentLink();
    fireEvent.click(screen.getByRole('button', { name: 'Create new Master' }));
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeDisabled();
    expect(screen.getByText('Shop SKU structure is not recorded. Check the source and choose the correct type.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Use existing Master' }));
    expect(screen.getByRole('dialog', { name: 'Find a Product Master' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
    expect(JSON.stringify(current())).toBe(before);
  });
  it('redirects old import-review bookmarks to the inbox instead of a removed panel', async () => {
    mount(`/products/${product.id}/edit?focus=import-review&section=overview`);
    expect(await screen.findByRole('dialog', { name: 'Review shop listings' })).toBeVisible();
  });
});
