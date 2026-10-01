// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

let id: string;
let product: Product;
async function mount() {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=distribution`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  // Let the editor establish its saved baseline before interacting.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
beforeEach(() => {
  id = `publish-without-listing-${crypto.randomUUID()}`;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.removeItem('prime-product-catalog-settings-v2');
  const settings = getProductCatalogSettings();
  const category = { ...settings.categories[0], id: 'publish-fixture', name: 'Publish fixture', parentId: null, status: 'Active' as const, attributes: [] };
  saveProductCatalogSettings({ ...settings, categories: [...settings.categories, category] });
  product = { ...getProducts()[0], id, name: 'Ready standalone Master', sku_code: 'STANDALONE-MASTER',
    category: category.name, categoryId: category.id, status: 'draft', has_variants: false, product_type: 'single',
    images: ['/one.jpg', '/two.jpg', '/three.jpg'], description: 'Complete canonical product description. '.repeat(5),
    retail_price: 1000, inventory: { wh_crjp: 5 }, skus: [], variant_options: [], channels: [], channel_overrides: {},
    pkg_length: 0, pkg_width: 0, pkg_height: 0, pkg_weight: 0,
    import_result: undefined, import_source: undefined, import_sources: [], import_issues: [], revisions: [], record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); localStorage.removeItem('prime-product-catalog-settings-v2'); vi.restoreAllMocks(); });

describe('Publishing Product Master without channel listings', () => {
  it('is ready without a listing, stays Draft until confirmed, then publishes only Master', async () => {
    await mount();
    expect(screen.getByRole('progressbar', { name: '100% of product requirements complete' })).toBeVisible();
    expect(screen.queryByText('Prepare at least one channel for publishing')).not.toBeInTheDocument();
    expect(getProductById(id)?.status).toBe('draft');
    fireEvent.click(screen.getByRole('button', { name: 'Publish product' }));
    let dialog = within(screen.getByRole('dialog', { name: 'Publish this Product revision?' }));
    expect(dialog.getByText(/You can link channels later/)).toBeVisible();
    expect(dialog.queryByRole('radiogroup')).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)?.status).toBe('draft');
    fireEvent.click(screen.getByRole('button', { name: 'Publish product' }));
    dialog = within(screen.getByRole('dialog', { name: 'Publish this Product revision?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Publish revision' }));
    await waitFor(() => expect(getProductById(id)?.status).toBe('published'), { timeout: 4000 });
    expect(getProductById(id)?.channels).toEqual([]);
    expect(Object.values(getProductById(id)?.channel_overrides ?? {}).some(listing => listing.enabled)).toBe(false);
    expect(getProductById(id)?.revisions).toHaveLength(1);
    cleanup(); await mount();
    expect(screen.getByRole('button', { name: 'Published' })).toBeDisabled();
    expect(screen.getByText('No channel listings configured')).toBeVisible();
  });

  it('still blocks missing Master fields and lists only actual requirements', async () => {
    updateProduct(id, { id, images: [] });
    await mount();
    expect(screen.queryByRole('button', { name: 'Publish product' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete product' }));
    const checklist = within(screen.getByRole('dialog', { name: 'Complete this product' }));
    expect(checklist.getByText('Add at least 3 product images')).toBeVisible();
    expect(checklist.queryByText(/channel for publishing/)).not.toBeInTheDocument();
    expect(getProductById(id)?.status).toBe('draft');
  });

  it('saves complete edits and opens publish directly without a manual readiness step', async () => {
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Edited standalone Master' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish product' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Publish this Product revision?' }));
    expect(getProductById(id)).toMatchObject({ name: 'Edited standalone Master', status: 'draft', channels: [] });
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)?.status).toBe('draft');
  });

  it('keeps listing review options and channel-specific validation when a listing exists', async () => {
    updateProduct(id, { id, pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100,
      channel_overrides: { shopee: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'SHO-STANDALONE', category: '', shipping_option: '' } } });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    const listing = within(screen.getByRole('dialog', { name: 'Shopee listing' }));
    expect(listing.getByRole('button', { name: 'Complete next item' })).toBeEnabled();
    expect(listing.getByRole('button', { name: /Channel requirements.*missing/ })).toBeVisible();
    expect(listing.queryByRole('button', { name: 'Publish update' })).not.toBeInTheDocument();
    fireEvent.click(listing.getAllByRole('button', { name: 'Close' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Publish product' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Publish this Product revision?' }));
    expect(dialog.getByRole('radio', { name: /Publish Product Master only/ })).toHaveAttribute('aria-checked', 'true');
    expect(dialog.getByRole('radio', { name: /Publish & apply to listings/ })).toBeEnabled();
    expect(getProductById(id)?.channel_overrides?.shopee).toMatchObject({ title: '', category: '', shipping_option: '' });
  });
});
