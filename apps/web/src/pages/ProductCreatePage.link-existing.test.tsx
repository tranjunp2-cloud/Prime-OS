// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
let master: Product;
let original: CatalogImportItem[];
let source: CatalogImportItem;
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); Element.prototype.scrollIntoView = vi.fn();
  original = getCatalogImportItems({ requireConfirmation: true });
  master = { ...getProducts()[0], id: `master-link-test-${crypto.randomUUID()}`, name: 'Saved product for linking', sku_code: `LINK-${crypto.randomUUID().slice(0, 8)}`,
    status: 'draft', has_variants: false, product_type: 'single', skus: [], variant_options: [], channels: [], channel_overrides: {}, import_sources: [],
    description: '', images: [], import_result: undefined, import_issues: [], record_version: 1, inventory: {} };
  addProduct(master);
  source = { id: 'source-link-test', channel: 'lazada', storeName: 'Imported test shop', title: 'Imported product title', channelSku: 'IMPORTED-SKU', listingId: 'listing-link-test',
    image: '/source.jpg', variants: 1, channelStock: 0, channelCategory: 'Art', price: 45, currency: 'USD', status: 'unmatched', confidence: 0, resolution: 'later', confirmed: false };
  saveCatalogImportItems([source]);
});
afterEach(() => { cleanup(); deleteProduct(master.id); saveCatalogImportItems(original); vi.restoreAllMocks(); });
async function mount() {
  render(<MemoryRouter initialEntries={[`/products/${master.id}/edit?section=distribution`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
function link() {
  fireEvent.click(screen.getByRole('button', { name: 'Link existing listings' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select IMPORTED-SKU from Imported test shop' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review links (1)' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /I checked that every/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Link 1 listing' }));
}
describe('Product Master existing listing entry point', () => {
  it('links to an incomplete Master and adds the row to the unified table with Sync off and Manage listing', async () => {
    await mount();
    expect(screen.getByRole('button', { name: 'Create listing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Link existing listings' })).toBeEnabled();
    link();
    const row = within(screen.getByRole('table', { name: 'Channel listings' })).getAllByRole('row')[1];
    expect(row).toHaveTextContent('Imported test shop'); expect(row).toHaveTextContent('45 USD'); expect(row).toHaveTextContent('0 units');
    expect(row).toHaveAttribute('data-newly-linked', 'true');
    expect(within(row).getByRole('button', { name: /Master sync settings.*off/ })).toBeEnabled();
    expect(within(row).getByRole('button', { name: 'Manage listing' })).toBeEnabled();
    expect(getProductById(master.id)).toMatchObject({ name: master.name, status: 'draft', images: [], inventory: {} });
  });
  it('preserves unsaved Master edits and retains the new relationship when the Master is saved afterward', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Product data' }));
    fireEvent.change(screen.getByDisplayValue(master.name), { target: { value: 'Unsaved Master name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Channel listings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Link existing listings' }));
    expect(screen.getByText(/Using saved Master data/)).toBeVisible();
    expect(screen.getByRole('dialog')).toHaveTextContent(master.name);
    fireEvent.click(screen.getByRole('checkbox', { name: /Select IMPORTED-SKU/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Review links (1)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked that every/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Link 1 listing' }));
    expect(getProductById(master.id)!.name).toBe(master.name);
    fireEvent.click(screen.getByRole('button', { name: 'Product data' }));
    expect(screen.getByDisplayValue('Unsaved Master name')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.queryByRole('dialog', { name: 'This product was updated elsewhere' })).not.toBeInTheDocument();
    expect(getProductById(master.id)!.name).toBe('Unsaved Master name');
    expect(getProductById(master.id)!.channels[0].external_id).toBe(source.listingId);
  });
  it('still allows adding existing listings when every connected channel is configured', async () => {
    updateProduct(master.id, { id: master.id, channel_overrides: Object.fromEntries(['webstore', 'pos', 'shopee', 'lazada', 'amazon', 'rakuten'].map(key => [key, { enabled: true, title: 'Saved listing', description: '', price_markup: 0, listing_sku: `OLD-${key}` }])) });
    await mount();
    expect(screen.queryByRole('button', { name: 'Create listing' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link existing listings' })).toBeEnabled();
    link(); expect(getProductById(master.id)!.channels.some(listing => listing.external_id === source.listingId)).toBe(true);
  });
  it('does not expose write entry points for archived Masters', async () => {
    updateProduct(master.id, { id: master.id, status: 'archived' }); await mount();
    expect(screen.queryByRole('button', { name: 'Link existing listings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create listing' })).not.toBeInTheDocument();
  });
});
