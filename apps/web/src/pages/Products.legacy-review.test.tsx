// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import Products from './Products';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { pendingListingReviews, pendingMappingReviews } from '@/lib/product-listing-intake';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-product-channel-setup', () => ({ useProductChannelSetup: () => ({ snapshot: { status: 'loaded', channels: [] }, retry: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
let product: Product;
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  product = { ...getProducts()[0], ...readyMasterFields(), id: `legacy-ui-${crypto.randomUUID()}`, name: 'Legacy UI Master', sku_code: `LEGACY-UI-${crypto.randomUUID()}`, status: 'review', import_result: 'needs_review', import_issues: ['Variant structure conflict: verify the source pack'], import_sources: [], has_variants: false, product_type: 'single', skus: [], description: '', inventory: { wh_crjp: 23 }, channels: [{ channel: 'amazon', external_id: 'legacy-ui-shop-listing', store_name: 'Legacy UI shop', shop_sku: 'LEGACY-UI-SHOP', reported_stock: 8, status: 'active', listing_url: null, last_synced_at: null }], channel_overrides: { amazon: { title: 'Legacy UI source listing', enabled: true, description: '', price_markup: 0 } } };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(product.id); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const current = () => getProductById(product.id)!;
async function mount(path = `/products/${product.id}/edit?section=distribution`) {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/products/master-catalog" element={<Products />} /><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
}
function openCurrentLink() {
  fireEvent.click(screen.getByRole('button', { name: 'Review mapping for Legacy UI shop' }));
}
describe('Existing mapping review is separate from the unmapped listing inbox', () => {
  it('reviews an existing link from its Master without automatic writes', async () => {
    const before = JSON.stringify(current());
    const pending = pendingListingReviews().length;
    await mount();
    const row = screen.getByRole('button', { name: 'Review mapping for Legacy UI shop' }).closest('tr')!;
    expect(row).toHaveTextContent('Mapping needs review');
    expect(within(row).getByRole('button', { name: 'Manage listing' })).toBeEnabled();
    openCurrentLink();
    expect(screen.getByText('Current Product Master')).toBeVisible();
    expect(screen.getByRole('note')).toHaveTextContent('Variant structure conflict');
    expect(screen.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Source listing' })).toHaveTextContent('SKU structure not recorded');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Channel listings' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review mapping for Legacy UI shop' })).toHaveFocus());
    expect(JSON.stringify(current())).toBe(before);
    expect(pendingListingReviews()).toHaveLength(pending);
    openCurrentLink();
    fireEvent.click(screen.getByRole('checkbox', { name: /Source structure is not recorded. I checked the shop listing:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(current().status).toBe(product.status);
    expect(current().inventory).toEqual(product.inventory);
    expect(current().channels[0]).toMatchObject(product.channels[0]);
    expect(pendingMappingReviews([current()])).toHaveLength(0);
    expect(screen.queryByText('Mapping needs review')).not.toBeInTheDocument();
    expect(pendingListingReviews()).toHaveLength(pending);
  });
  it('opens mapping review in place and preserves the link on cancel', async () => {
    const before = JSON.stringify(current());
    await mount(`/products/${product.id}/edit`);
    expect(screen.queryByText('Confirm how this pack should be managed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create separate Product Master' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Channel listings' }));
    openCurrentLink();
    expect(screen.getByRole('dialog', { name: 'Review mapping' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Create new Master' }));
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByText('Check the source SKU structure and confirm the product type before activating.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Use existing Master' }));
    expect(screen.getByRole('region', { name: 'Find a Product Master' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Channel listings' }));
    expect(JSON.stringify(current())).toBe(before);
  });
  it('routes old review bookmarks to Channel listings in the same Master', async () => {
    await mount(`/products/${product.id}/edit?focus=import-review&section=overview`);
    expect(screen.getByRole('button', { name: 'Channel listings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Review mapping for Legacy UI shop' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Review shop listings' })).not.toBeInTheDocument();
  });
  it('excludes existing links from the import queue and its counters', async () => {
    const before = JSON.stringify(current());
    const pending = pendingListingReviews();
    expect(pending.every(item => !item.existingLinkReview)).toBe(true);
    expect(pendingMappingReviews([current()])).toHaveLength(1);
    await mount('/products/master-catalog?review=links');
    const dialog = await screen.findByRole('dialog', { name: 'Review shop listings' });
    expect(within(dialog).getByText(`${pending.length} listings to review`)).toBeVisible();
    expect(within(dialog).getAllByRole('button', { name: 'Review suggestion' }).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByRole('button', { name: 'Choose Master' }).length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole('button', { name: 'Review current link' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Legacy UI source listing')).not.toBeInTheDocument();
    expect(JSON.stringify(current())).toBe(before);
  });
  it('keeps another shop’s warning when just one mapping is confirmed', async () => {
    updateProduct(product.id, { id: product.id, channels: [...product.channels, { ...product.channels[0], external_id: 'second-listing', store_name: 'Second shop' }], channel_overrides: {} });
    await mount();
    openCurrentLink();
    fireEvent.click(screen.getByRole('checkbox', { name: /Source structure is not recorded. I checked the shop listing:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(screen.queryByRole('button', { name: 'Review mapping for Legacy UI shop' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review mapping for Second shop' })).toBeVisible();
    expect(current().channels).toHaveLength(2);
    expect(pendingMappingReviews([current()])).toHaveLength(1);
  });
  it.each(['archived', 'viewer'])('does not expose mapping writes for %s access', async mode => {
    if (mode === 'archived') updateProduct(product.id, { id: product.id, status: 'archived' });
    const before = JSON.stringify(current());
    await mount(`/products/${product.id}/edit?section=distribution${mode === 'viewer' ? '&mode=viewer' : ''}`);
    expect(screen.getByText('Mapping needs review')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Review mapping for Legacy UI shop' })).not.toBeInTheDocument();
    expect(JSON.stringify(current())).toBe(before);
  });
  it('preserves unsaved Master edits after moving a listing and does not recreate the old link on save', async () => {
    const target: Product = { ...product, id: `mapping-target-${crypto.randomUUID()}`, name: 'Mapping destination', sku_code: 'MAPPING-TARGET', channels: [], channel_overrides: {}, import_result: undefined, import_issues: [] };
    addProduct(target);
    try {
      await mount();
      fireEvent.click(screen.getByRole('button', { name: 'Product data' }));
      fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved Master name' } });
      fireEvent.click(screen.getByRole('button', { name: 'Channel listings' }));
      openCurrentLink();
      expect(screen.getByText(/Using saved Master data/)).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Choose another Master' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Search by product name, SKU or brand' }), { target: { value: target.name } });
      fireEvent.click(screen.getByRole('button', { name: `Compare with ${target.name}` }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Source structure is not recorded. I checked the shop listing:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Move to this Master' }));
      expect(current().channels).toHaveLength(0);
      expect(getProductById(target.id)?.channels[0]).toMatchObject(product.channels[0]);
      expect(screen.queryByRole('button', { name: 'Continue setup' })).not.toBeInTheDocument();
      expect(current().name).toBe(product.name);
      fireEvent.click(screen.getByRole('button', { name: 'Product data' }));
      expect(screen.getByDisplayValue('Unsaved Master name')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      expect(screen.queryByRole('dialog', { name: 'This product was updated elsewhere' })).not.toBeInTheDocument();
      expect(current().channels).toHaveLength(0);
      expect(current().name).toBe('Unsaved Master name');
      expect(current().inventory).toEqual(product.inventory);
      expect(getProductById(target.id)?.inventory).toEqual(target.inventory);
    } finally { deleteProduct(target.id); }
  });
});
