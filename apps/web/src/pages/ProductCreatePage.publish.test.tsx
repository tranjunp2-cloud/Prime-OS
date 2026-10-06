// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';
import { snapshotShopListing } from '@/lib/listing-shop-data';
import type { CatalogImportItem } from '@/lib/catalog-import-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

let id: string;
let product: Product;
async function mount(withScrollContainer = false) {
  const editor = <MemoryRouter initialEntries={[`/products/${id}/edit?section=distribution`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>;
  render(withScrollContainer ? <main id="main-content">{editor}</main> : editor);
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
    images: ['/one.jpg'], description: 'Complete canonical product description. '.repeat(5),
    retail_price: 1000, inventory: { wh_crjp: 5 }, skus: [], variant_options: [], channels: [], channel_overrides: {},
    pkg_length: 0, pkg_width: 0, pkg_height: 0, pkg_weight: 0,
    import_result: undefined, import_source: undefined, import_sources: [], import_issues: [], revisions: [], record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); localStorage.removeItem('prime-product-catalog-settings-v2'); vi.restoreAllMocks(); });

describe('Publishing Product Master without channel listings', () => {
  it('saves an inline independent edit and sync opt-out together, then reopens the listing with the new mode', async () => {
    updateProduct(id, { id, channels: [{ channel: 'website', external_id: 'web', status: 'active', listing_url: null, last_synced_at: null }], channel_overrides: { webstore: { enabled: true, title: 'Shop title', description: 'Shop description', price_markup: 0, listing_sku: 'WEB-EDIT', listing_mode: 'master', media_scope: 'all' } } });
    await mount();
    const before = getProductById(id)!;
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Edit independently' }));
    expect(getProductById(id)).toBe(before);
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Shop-exclusive title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(getProductById(id)).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    const after = getProductById(id)!;
    expect(after.channels[0].local_draft?.values.title).toBe('Shop-exclusive title');
    expect(after.channels[0].master_data_sync).toMatchObject({ enabled: true, fields: ['media'] });
    expect(after.name).toBe(before.name);
    expect(after.activity?.slice(before.activity?.length ?? 0).map(event => event.title)).toEqual(['Listing edits saved locally', 'Master sync preference updated']);
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    expect(screen.getByLabelText('Listing title')).toHaveValue('Shop-exclusive title');
    expect(screen.getByLabelText('Listing title')).not.toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));
    expect(screen.getByRole('radio', { name: 'Follow Master' })).toBeChecked();
    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Follow Master' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(screen.getByRole('region', { name: 'Data source changes' })).toHaveTextContent('Shop-exclusive title');
    expect(screen.getByRole('region', { name: 'Data source changes' })).toHaveTextContent('Master values replace this group');
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(getProductById(id)!.channels[0].master_data_sync?.fields).toEqual(['content', 'media']);
  });
  it('uses the same editor, field tabs and row actions for all five listings regardless of origin or sync', async () => {
    const base = { status: 'active' as const, listing_url: null, last_synced_at: null };
    updateProduct(id, { id, channels: [
      { ...base, channel: 'website', external_id: 'web', shop_sku: 'WEB' },
      { ...base, channel: 'lazada', external_id: 'configured', store_name: 'Same shop', shop_sku: 'CONFIGURED' },
      { ...base, channel: 'rakuten', external_id: null },
      { ...base, channel: 'lazada', external_id: 'imported', store_name: 'Same shop', shop_sku: 'IMPORTED', publication_unconfirmed: true },
      { ...base, channel: 'amazon', external_id: 'amazon', shop_sku: 'AMAZON', publication_unconfirmed: true },
    ], channel_overrides: Object.fromEntries(['webstore', 'lazada', 'rakuten'].map(key => [key, { enabled: true, title: `${key} title`, description: '', price_markup: 0, listing_mode: 'master', media_scope: 'all', listing_sku: key === 'lazada' ? 'CONFIGURED' : key === 'webstore' ? 'WEB' : '' }])) });
    await mount();
    const before = JSON.stringify(getProductById(id));
    for (let index = 0; index < 5; index++) {
      const rows = within(screen.getByRole('table', { name: 'Channel listings' })).getAllByRole('row').slice(1);
      expect(within(rows[index]).getByRole('button', { name: /More actions for/ })).toBeVisible();
      fireEvent.click(within(rows[index]).getByRole('button', { name: 'Manage listing' }));
      const dialog = within(screen.getByRole('dialog', { name: 'Manage listing' }));
      expect(dialog.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Content', 'Images', 'Price & stock', 'Shipping', 'Channel details']);
      expect(dialog.getByRole('button', { name: 'Review changes' })).toBeDisabled();
      expect(dialog.queryByRole('button', { name: /Publish|Complete next item|Save draft/ })).not.toBeInTheDocument();
      if (index < 3) expect(dialog.getByLabelText('Listing title')).toHaveAttribute('readonly');
      else expect(dialog.getByLabelText('Listing title')).toBeEnabled();
      fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    }
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('saves a configured listing through review and keeps its legacy sync when opening settings', async () => {
    updateProduct(id, { id, channels: [{ channel: 'website', external_id: 'web', status: 'active', listing_url: null, last_synced_at: null }], channel_overrides: { webstore: { enabled: true, title: 'Shop title', description: '', price_markup: 0, listing_sku: 'WEB-EDIT', channel_price: 10, channel_currency: 'VND', listing_mode: 'master', media_scope: 'all' } } });
    await mount();
    const before = getProductById(id)!;
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    expect(screen.getByText(/SKU: WEB-EDIT/)).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    fireEvent.change(screen.getByLabelText('Listing price'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(getProductById(id)!.channel_overrides).toEqual(before.channel_overrides);
    expect(getProductById(id)!.channels[0].local_draft?.values.price).toEqual({ amount: 12, currency: 'VND' });
    expect(screen.getByText('12 VND')).toBeVisible();
    expect(screen.getByText('Local draft · Not sent to shop')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    expect(screen.getByRole('status')).toHaveTextContent('Following Master: Content, Images');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: /Master sync settings for/ }));
    const sync = within(screen.getByRole('dialog', { name: 'Master sync settings' }));
    expect(sync.getByRole('radio', { name: /^Sync on/ })).toBeChecked();
    expect(sync.getByRole('checkbox', { name: 'Product content' })).toBeChecked();
    expect(sync.getByRole('checkbox', { name: 'Images' })).toBeChecked();
  });
  it('confirms an exact unlink, preserves other rows and does not resurrect the link on Master save or remount', async () => {
    const managed = { channel: 'lazada' as const, external_id: 'configured', store_name: 'Same shop', shop_sku: 'CONFIGURED', status: 'active' as const, listing_url: null, last_synced_at: null };
    const imported = { ...managed, external_id: 'imported', shop_sku: 'IMPORTED', publication_unconfirmed: true };
    updateProduct(id, { id, channels: [managed, imported], channel_overrides: { lazada: { enabled: true, title: 'Owned title', description: '', price_markup: 0, listing_sku: 'CONFIGURED' } } });
    await mount();
    const before = getProductById(id)!;
    async function openUnlink() {
      fireEvent.keyDown(screen.getByRole('button', { name: 'More actions for Same shop · CONFIGURED' }), { key: 'Enter' });
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Unlink from Master' }));
      return within(await screen.findByRole('alertdialog'));
    }
    const first = await openUnlink();
    expect(first.getByText('Same shop · CONFIGURED')).toBeVisible();
    fireEvent.click(first.getByRole('button', { name: 'Keep listing' }));
    expect(getProductById(id)).toBe(before);
    const dialog = await openUnlink();
    fireEvent.click(dialog.getByRole('button', { name: 'Unlink from Master' }));
    expect(getProductById(id)!.channels).toEqual([imported]);
    expect(screen.getByText('1 listing')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue setup' })).not.toBeInTheDocument();
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    fireEvent.click(navigation.getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Edited Master after unlink' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)!.name).toBe('Edited Master after unlink');
    expect(screen.queryByRole('dialog', { name: 'This product was updated elsewhere' })).not.toBeInTheDocument();
    expect(getProductById(id)!.channels).toEqual([imported]);
    cleanup(); await mount();
    expect(screen.getByText('1 listing')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue setup' })).not.toBeInTheDocument();
  });
  it('fills missing demo cells, labels the table once, and removes repeated helper copy without saving data', async () => {
    const originalId = id;
    const savedDemo = getProductById('prod_005')!;
    id = 'prod_005';
    try {
      updateProduct(id, { ...product, id, sku_code: 'CR-TAI-BSZ', channels: ['website', 'lazada', 'rakuten'].map(channel => ({ channel: channel as 'website' | 'lazada' | 'rakuten', external_id: null, status: 'active', listing_url: null, last_synced_at: null })), channel_overrides: {
        webstore: { enabled: true, title: '', description: '', price_markup: 0, channel_price: 1, channel_currency: 'VND', listing_sku: 'WEB-CR-TAI-BSZ', listing_mode: 'master' },
        lazada: { enabled: true, title: '', description: '', price_markup: 0, channel_price: 4200, channel_currency: 'MYR', listing_sku: 'CR-TAI-BSZ', listing_mode: 'master' },
        rakuten: { enabled: true, title: '', description: '', price_markup: 0, listing_mode: 'master' },
      } });
      await mount();
      const before = JSON.stringify(getProductById(id));
      const section = within(document.getElementById('product-section-channels')!);
      const table = within(section.getByRole('table', { name: 'Channel listings' }));
      expect(section.getAllByText('Demo data')).toHaveLength(1);
      for (const value of ['1 VND', '4,200 MYR', '4,200 JPY', '24 units', '13 units', '9 units']) expect(table.getByText(value)).toBeVisible();
      for (const text of ['Shop data not loaded', 'Not a listing requirement', 'Imported shop data', 'Keeps shop data', 'Product content, Images']) expect(table.queryByText(text)).not.toBeInTheDocument();
      expect(table.queryByText(/Saved listing price/)).not.toBeInTheDocument();
      expect(table.getAllByText('Sync on')).toHaveLength(3);
      fireEvent.click(table.getAllByRole('button', { name: /Master sync settings/ })[0]);
      expect(screen.getByRole('dialog', { name: 'Master sync settings' })).toBeVisible();
      expect(JSON.stringify(getProductById(id))).toBe(before);
    } finally {
      cleanup();
      updateProduct(id, savedDemo);
      id = originalId;
    }
  });
  it('shows mapped and configured listings in one table without merging same-shop SKUs', async () => {
    const imported = { channel: 'lazada' as const, store_name: 'Same shop', external_id: 'imported-1', shop_sku: 'IMPORTED-SKU', status: 'draft' as const, publication_unconfirmed: true, reported_stock: 0, listing_url: null, last_synced_at: null };
    const managed = { ...imported, external_id: 'managed-1', shop_sku: 'MANAGED-SKU', publication_unconfirmed: false, status: 'active' as const };
    updateProduct(id, { id, channels: [imported, managed], channel_overrides: { lazada: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'MANAGED-SKU', category: '', shipping_option: '' } } });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const table = within(screen.getByRole('table', { name: 'Channel listings' }));
    expect(table.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('2 listings')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Imported shop links' })).not.toBeInTheDocument();
    expect(screen.queryByText('Linked shop listings')).not.toBeInTheDocument();
    const linked = within(table.getAllByRole('row').find(row => row.textContent?.includes('IMPORTED-SKU'))!);
    const configured = within(table.getAllByRole('row').find(row => row.textContent?.includes('MANAGED-SKU'))!);
    expect(linked.getByText('Sync off')).toBeVisible();
    expect(linked.getByText('0 units')).toBeVisible();
    expect(linked.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(configured.getByText('Sync off')).toBeVisible();
    expect(table.queryByText('Setup required')).not.toBeInTheDocument();
    expect(configured.getByRole('button', { name: 'Manage listing' })).toBeVisible();
    const view = linked.getByRole('button', { name: 'Manage listing' });
    view.focus();
    fireEvent.click(view);
    const detail = within(screen.getByRole('dialog', { name: 'Manage listing' }));
    expect(detail.getByText(/SKU: IMPORTED-SKU/)).toBeVisible();
    fireEvent.click(detail.getByRole('tab', { name: 'Channel details' }));
    expect(detail.getByText('imported-1')).toBeVisible();
    fireEvent.click(detail.getByRole('tab', { name: 'Content' }));
    expect(detail.queryByText('MANAGED-SKU')).not.toBeInTheDocument();
    expect(detail.getByLabelText('Listing title')).toBeEnabled();
    fireEvent.click(detail.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(view).toHaveFocus());
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('shows an imported-only listing without a publishing empty state or invented values', async () => {
    updateProduct(id, { id, channels: [{ channel: 'amazon', store_name: 'Imported only shop', external_id: 'unknown-source', shop_sku: 'IMPORTED-ONLY', publication_unconfirmed: true, status: 'draft', listing_url: null, last_synced_at: null }] });
    await mount();
    expect(screen.getByText('1 listing')).toBeVisible();
    expect(screen.queryByText('Publishing setup is optional')).not.toBeInTheDocument();
    expect(screen.queryByText('No channel listings configured')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Select all eligible/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync selected channels' })).not.toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Channel listings' }));
    expect(table.getByText('Listing price unavailable')).toBeInTheDocument();
    expect(table.getByText('Shop stock unavailable')).toBeInTheDocument();
    expect(table.queryByText('0 units')).not.toBeInTheDocument();
    expect(table.queryByText('Draft listing')).not.toBeInTheDocument();
    expect(table.getByRole('button', { name: 'Manage listing' })).toBeVisible();
  });
  it('uses only explicit sync preferences, not setup completeness, Active or timestamps', async () => {
    updateProduct(id, { id, pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100, channels: [{ channel: 'amazon', store_name: 'Read-only Amazon', external_id: 'imported-only', shop_sku: 'IMPORT', publication_unconfirmed: true, status: 'draft', listing_url: null, last_synced_at: null }], channel_overrides: {
      webstore: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'WEB-READY', web_slug: 'ready-product', listing_mode: 'master' },
      lazada: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'LZD-INCOMPLETE' },
    } });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const table = within(screen.getByRole('table', { name: 'Channel listings' }));
    expect(table.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(table.getAllByText('Sync on')).toHaveLength(1);
    expect(table.getAllByText('Sync off')).toHaveLength(2);
    expect(table.queryByText('Setup required')).not.toBeInTheDocument();
    expect(table.queryByText('Partial sync')).not.toBeInTheDocument();
    expect(screen.queryByText('Select ready')).not.toBeInTheDocument();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('uses the persisted listing snapshot in the table and detail even without a review-queue item', async () => {
    const source = { channel: 'amazon', storeName: 'Snapshot shop', listingId: 'snapshot-only', channelSku: 'SNAP-SKU', title: 'Original shop title', image: '/shop.jpg', channelCategory: 'Shop category', price: 29, currency: 'USD', channelStock: 0, retrievedAt: '2026-10-01T00:00:00Z' } as CatalogImportItem;
    updateProduct(id, { id, channels: [{ channel: source.channel, store_name: source.storeName, external_id: source.listingId, shop_sku: source.channelSku, publication_unconfirmed: true, status: 'active', listing_url: null, last_synced_at: null, shop_snapshot: snapshotShopListing(source) }] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const table = within(screen.getByRole('table', { name: 'Channel listings' }));
    expect(table.getByText('29 USD')).toBeVisible();
    expect(table.getByText('0 units')).toBeVisible();
    expect(table.queryByText('Shop data not loaded')).not.toBeInTheDocument();
    fireEvent.click(table.getByRole('button', { name: 'Manage listing' }));
    const detail = within(screen.getByRole('dialog', { name: 'Manage listing' }));
    expect(detail.getByLabelText('Listing title')).toHaveValue('Original shop title');
    fireEvent.click(detail.getByRole('tab', { name: 'Price & stock' }));
    expect(detail.getByLabelText('Listing price')).toHaveValue(29);
    expect(detail.getByLabelText('Shop stock')).toHaveValue(0);
    fireEvent.click(detail.getByRole('tab', { name: 'Images' }));
    expect(detail.getByRole('img', { name: 'Listing image 1' })).toHaveAttribute('src', '/shop.jpg');
    fireEvent.error(detail.getByRole('img', { name: 'Listing image 1' }));
    expect(detail.getByRole('img', { name: 'Listing image 1 unavailable' })).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('edits an imported listing independently, reopens its local draft and preserves sibling and unsaved Master edits', async () => {
    const imported = { channel: 'lazada' as const, store_name: 'Same shop', external_id: 'imported-1', shop_sku: 'IMPORTED-SKU', status: 'active' as const, publication_unconfirmed: true, reported_stock: 0, listing_url: null, last_synced_at: null };
    const managed = { ...imported, external_id: 'managed-1', shop_sku: 'MANAGED-SKU', publication_unconfirmed: false };
    updateProduct(id, { id, channels: [imported, managed], channel_overrides: { lazada: { enabled: true, title: 'Configured title', description: '', price_markup: 0, listing_sku: 'MANAGED-SKU', channel_price: 99, channel_currency: 'MYR' } } });
    await mount();
    const before = getProductById(id)!;
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    fireEvent.click(navigation.getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved Master name' } });
    fireEvent.click(navigation.getByRole('button', { name: /^Channel listings/ }));
    const row = () => within(within(screen.getByRole('table', { name: 'Channel listings' })).getAllByRole('row').find(row => row.textContent?.includes('IMPORTED-SKU'))!);
    fireEvent.click(row().getByRole('button', { name: 'Manage listing' }));
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Independent title' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    fireEvent.change(screen.getByLabelText('Shop stock'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(getProductById(id)).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(getProductById(id)!.channels[0].local_draft?.values).toEqual({ title: 'Independent title', stock: 7 });
    expect(getProductById(id)!.channels[1]).toEqual(before.channels[1]);
    expect(getProductById(id)!.channel_overrides).toEqual(before.channel_overrides);
    expect(getProductById(id)!.name).toBe(before.name);
    expect(row().getByText('7 units')).toBeVisible();
    expect(row().getByText('Local draft · Not sent to shop')).toBeVisible();
    fireEvent.click(row().getByRole('button', { name: 'Manage listing' }));
    expect(screen.getByLabelText('Listing title')).toHaveValue('Independent title');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(row().getByRole('button', { name: /Master sync settings for/ }));
    const syncDialog = within(screen.getByRole('dialog', { name: 'Master sync settings' }));
    expect(syncDialog.getByText(/SKU: IMPORTED-SKU/)).toBeVisible();
    fireEvent.click(syncDialog.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(navigation.getByRole('button', { name: /^Product data/ }));
    expect(screen.getByDisplayValue('Unsaved Master name')).toBeVisible();
  });
  it('reviews and persists sync for an imported listing without altering its Master or sibling', async () => {
    const first = { channel: 'lazada' as const, store_name: 'Same shop', external_id: 'one', shop_sku: 'SKU-ONE', publication_unconfirmed: true, status: 'draft' as const, listing_url: null, last_synced_at: null, reported_stock: 7 };
    updateProduct(id, { id, channels: [first, { ...first, external_id: 'two', shop_sku: 'SKU-TWO' }] });
    await mount();
    const before = getProductById(id)!;
    const row = within(screen.getByRole('table', { name: 'Channel listings' })).getAllByRole('row').find(row => row.textContent?.includes('SKU-ONE'))!;
    const trigger = within(row).getByRole('button', { name: /Master sync settings/ });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = within(screen.getByRole('dialog', { name: 'Master sync settings' }));
    fireEvent.click(dialog.getByRole('radio', { name: /^Sync on/ }));
    expect(dialog.getByText('Local demo:', { exact: false })).toBeVisible();
    expect(dialog.getByRole('checkbox', { name: 'Product content' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Images' })).toBeChecked();
    fireEvent.click(dialog.getByRole('button', { name: 'Review settings' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save sync settings' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(within(row).getByText('Sync on')).toBeVisible();
    const after = getProductById(id)!;
    expect(after.channels[0].master_data_sync).toMatchObject({ enabled: true, fields: ['content', 'media'] });
    expect(after.channels[0].last_synced_at).toBeNull();
    expect(after.channels[0].reported_stock).toBe(7);
    expect(after.channels[1]).toEqual(before.channels[1]);
    expect(after.status).toBe(before.status);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.channel_overrides).toEqual(before.channel_overrides);
    cleanup();
    await mount();
    expect(within(screen.getByRole('table', { name: 'Channel listings' })).getAllByText('Sync on')).toHaveLength(1);
  });
  it('canceling sync changes writes nothing and missing Master images only block the selected group', async () => {
    updateProduct(id, { id, images: [], channels: [{ channel: 'amazon', store_name: 'Imported shop', shop_sku: 'SKU', external_id: 'listing-1', publication_unconfirmed: true, status: 'draft', listing_url: null, last_synced_at: null }] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(screen.getByRole('button', { name: /Master sync settings for Imported shop/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Master sync settings' }));
    fireEvent.click(dialog.getByRole('radio', { name: /^Sync on/ }));
    expect(dialog.getByRole('alert')).toHaveTextContent('at least one image');
    expect(dialog.getByRole('button', { name: 'Review settings' })).toBeDisabled();
    fireEvent.click(dialog.getByRole('checkbox', { name: 'Images' }));
    expect(dialog.getByRole('button', { name: 'Review settings' })).toBeEnabled();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('keeps Overview compact, labels Active correctly and opens sales without changing the Master', async () => {
    updateProduct(id, { id, status: 'published', channels: [{ channel: 'amazon', store_name: 'Prime Beauty', external_id: 'listing-fixture', status: 'active', listing_url: null, last_synced_at: null }] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('heading', { name: 'Sales performance' })).toBeVisible();
    expect(screen.getByText('Master stock')).toBeVisible();
    expect(screen.getByText('Linked listings')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
    expect(within(screen.getByRole('region', { name: product.name })).getByRole('heading', { level: 2, name: product.name })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Edit product data' })).not.toBeInTheDocument();
    expect(screen.queryByText('Overall readiness')).not.toBeInTheDocument();
    expect(screen.queryByText('Required details are complete')).not.toBeInTheDocument();
    expect(screen.queryByText(/^published$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Active', { exact: true }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Preview demo' }));
    expect(screen.getByText('Demo data')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Sales period'), { target: { value: '7' } });
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it.each([undefined, 'Lazada · Prime Flagship Store'])('keeps import source %s in Overview without a banner on any workspace', async source => {
    updateProduct(id, { id, status: 'published', import_result: 'published', import_source: source });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    for (const workspace of ['Product data', 'Pricing & Inventory', 'Channel listings', 'Activity history', 'Overview']) {
      fireEvent.click(navigation.getByRole('button', { name: workspace }));
      expect(screen.queryByText('Imported product data')).not.toBeInTheDocument();
      expect(screen.queryByText('Complete missing master data')).not.toBeInTheDocument();
      expect(document.getElementById('product-import-review')).toBeNull();
    }
    expect(screen.getByText(`Source: ${source ?? 'Not recorded'}`)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Product source' }));
    expect(within(screen.getByRole('dialog', { name: 'Product source' })).getByText(source ? `Source: ${source}` : 'Source not recorded')).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('uses readiness for incomplete imported data without repeating an import warning', async () => {
    updateProduct(id, { id, import_result: 'incomplete', import_source: undefined, images: [], image_url: null, import_issues: ['Product image is required'] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    for (const workspace of ['Product data', 'Pricing & Inventory', 'Channel listings', 'Overview']) {
      fireEvent.click(navigation.getByRole('button', { name: workspace }));
      expect(screen.queryByText('Imported product data')).not.toBeInTheDocument();
      expect(screen.queryByText('Complete missing master data')).not.toBeInTheDocument();
      expect(screen.getAllByRole('region', { name: 'Product readiness' })).toHaveLength(1);
      expect(screen.getByRole('region', { name: 'Product readiness' })).toHaveTextContent('Add at least 1 product image');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Product source' }));
    expect(within(screen.getByRole('dialog', { name: 'Product source' })).getByText('Source not recorded')).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('keeps Overview readiness in its own sidebar beside both the snapshot and sales, and opens the full checks', async () => {
    updateProduct(id, { id, images: [], image_url: null });
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: 'Overview' }));
    expect(screen.queryByText(/Master details need attention/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Product readiness' })).toHaveLength(1);
    const main = screen.getByTestId('product-editor-main');
    const sidebar = screen.getByTestId('product-editor-readiness');
    const layout = screen.getByTestId('product-editor-layout');
    expect(within(sidebar).getByRole('region', { name: 'Product readiness' })).toBeVisible();
    expect(within(main).getByTestId('product-overview-snapshot')).toBeVisible();
    expect(within(main).getByRole('region', { name: 'Sales performance' })).toBeVisible();
    expect(main).not.toContainElement(sidebar);
    expect(main.parentElement).toBe(layout);
    expect(sidebar.parentElement).toBe(layout);
    expect(sidebar).toHaveClass('xl:sticky', 'xl:top-20');
    expect(layout).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)_300px]');
    expect(screen.queryByRole('button', { name: 'Review missing details' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View all readiness checks' }));
    const checks = within(screen.getByRole('dialog', { name: 'Complete this product' }));
    expect(checks.getByRole('button', { name: 'Add at least 1 product image' })).toBeVisible();
    fireEvent.click(checks.getByRole('button', { name: 'Add at least 1 product image' }));
    expect(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: 'Product data' })).toHaveAttribute('aria-current', 'page');
    expect(getProductById(id)?.status).toBe('draft');
  });
  it.each(['draft', 'published'] as const)('uses the same readiness card and direct field shortcut across Overview and editing tabs for %s', async status => {
    updateProduct(id, { id, status, name: 'X' });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    const sidebarText = screen.getByRole('region', { name: 'Product readiness' }).textContent;
    const sidebarClass = screen.getByTestId('product-editor-readiness').className;
    fireEvent.click(navigation.getByRole('button', { name: 'Overview' }));
    const readiness = screen.getByRole('region', { name: 'Product readiness' });
    expect(readiness.textContent).toBe(sidebarText);
    expect(screen.getByTestId('product-editor-readiness').className).toBe(sidebarClass);
    expect(readiness).toHaveTextContent('Complete the missing Master details.');
    expect(readiness).not.toHaveTextContent('activate your Master');
    expect(within(readiness).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    fireEvent.click(within(readiness).getByRole('button', { name: /Add product name and master SKU/ }));
    expect(navigation.getByRole('button', { name: 'Product data' })).toHaveAttribute('aria-current', 'page');
    const nameInput = screen.getByDisplayValue('X');
    await waitFor(() => expect(nameInput).toHaveFocus());
    fireEvent.change(nameInput, { target: { value: product.name } });
    fireEvent.click(navigation.getByRole('button', { name: 'Overview' }));
    expect(screen.queryByRole('region', { name: 'Product readiness' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-editor-readiness')).not.toBeInTheDocument();
    expect(screen.getByTestId('product-editor-layout')).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)]');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('uses the operational metrics as shortcuts without persisting changes', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    const nav = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    for (const [button, destination] of [['View Master stock', 'Pricing & Inventory'], ['View base price', 'Pricing & Inventory'], ['View linked listings', 'Channel listings']]) {
      fireEvent.click(nav.getByRole('button', { name: 'Overview' }));
      fireEvent.click(screen.getByRole('button', { name: button }));
      expect(nav.getByRole('button', { name: destination })).toHaveAttribute('aria-current', 'page');
    }
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it.each([true, false])('keeps workspace padding and section gaps identical when readiness is complete: %s', async complete => {
    if (!complete) updateProduct(id, { id, name: 'X' });
    await mount();
    const layoutClass = screen.getByTestId('product-editor-layout').className;
    const mainClass = screen.getByTestId('product-editor-main').className;
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    for (const workspace of ['Overview', 'Product data', 'Pricing & Inventory', 'Channel listings']) {
      fireEvent.click(navigation.getByRole('button', { name: workspace }));
      expect(screen.getByTestId('product-editor-layout').className).toBe(layoutClass);
      expect(screen.getByTestId('product-editor-layout')).toHaveClass('py-6', 'gap-6');
      expect(screen.getByTestId('product-editor-main').className).toBe(mainClass);
      expect(screen.getByTestId('product-editor-main')).toHaveClass('gap-5');
    }
  });
  it('resets the actual app scroll container on tab changes without resizing the header', async () => {
    await mount(true);
    const scrollContainer = document.getElementById('main-content')!;
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => { scrollContainer.scrollTop = top ?? 0; });
    scrollContainer.scrollTo = scrollTo;
    scrollContainer.scrollTop = 200;
    fireEvent.scroll(scrollContainer);
    expect(screen.getByTestId('product-editor-header')).toHaveClass('py-4', 'shadow-sm');
    fireEvent.click(screen.getByRole('button', { name: 'Overview', exact: true }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(scrollContainer.scrollTop).toBe(0);
    expect(screen.getByTestId('product-editor-header')).toHaveClass('py-4');
    expect(screen.getByTestId('product-editor-header')).not.toHaveClass('py-2', 'shadow-sm');
  });
  it.each([1, 3, 9])('uses compact wrapping thumbnails for all %s images and keeps the upload limit', async count => {
    updateProduct(id, { id, images: Array.from({ length: count }, (_, index) => `/image-${index}.jpg`) });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Product data', exact: true }));
    const gallery = screen.getByRole('group', { name: 'Product images', exact: true });
    expect(gallery).toHaveClass('flex', 'flex-wrap', 'gap-3');
    const thumbnails = within(gallery).getAllByRole('img');
    expect(thumbnails).toHaveLength(count);
    thumbnails.forEach(thumbnail => {
      expect(thumbnail).toHaveClass('object-contain');
      expect(thumbnail.parentElement).toHaveClass('size-28', 'sm:size-32', 'shrink-0');
    });
    expect(within(gallery).getAllByRole('button', { name: /Remove image/ })).toHaveLength(count);
    if (count < 9) expect(screen.getByLabelText('Add more product images')).toBeEnabled();
    else {
      expect(screen.queryByLabelText('Add more product images')).not.toBeInTheDocument();
      fireEvent.click(within(gallery).getByRole('button', { name: 'Remove image 9' }));
      expect(screen.getByLabelText('Add more product images')).toBeEnabled();
    }
  });
  it('keeps image order and accessibility text together when changing the main thumbnail or removing one', async () => {
    updateProduct(id, { id, images: ['/one.jpg', '/two.jpg', '/three.jpg'], image_alt_texts: ['Front', 'Side', 'Back'] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(screen.getByRole('button', { name: 'Product data', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Set image 3 as main' }));
    const gallery = within(screen.getByRole('group', { name: 'Product images', exact: true }));
    expect(gallery.getAllByRole('img').map(image => image.getAttribute('src'))).toEqual(['/three.jpg', '/one.jpg', '/two.jpg']);
    expect(screen.getByLabelText('Alt text for image 1')).toHaveValue('Back');
    expect(screen.getByLabelText('Alt text for image 2')).toHaveValue('Front');
    fireEvent.click(gallery.getByRole('button', { name: 'Remove image 2' }));
    expect(gallery.getAllByRole('img').map(image => image.getAttribute('src'))).toEqual(['/three.jpg', '/two.jpg']);
    expect(screen.getByLabelText('Alt text for image 2')).toHaveValue('Side');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('previews all saved images and shows translation progress without changing the Master', async () => {
    updateProduct(id, { id, images: ['/one.jpg', '/two.jpg', '/three.jpg'], image_alt_texts: ['Main product', 'Side view', 'Packaging'] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('img', { name: 'Main product' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Translations:/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'View product images (3)' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Product images' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Show image 3' }));
    expect(dialog.getByRole('img', { name: 'Packaging' })).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('allows read-only sales exploration for an archived Master without enabling editing', async () => {
    updateProduct(id, { id, status: 'archived', channels: [{ channel: 'amazon', store_name: 'Prime Beauty', external_id: 'listing-fixture', status: 'active', listing_url: null, last_synced_at: null }] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: 'Overview' }));
    expect(screen.getByLabelText('Sales period')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Edit product data' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview demo' }));
    expect(screen.getByLabelText('Sales summary')).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('keeps grouped navigation and explains both scopes without navigating or changing product data', async () => {
    await mount();
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    expect(navigation.getByText('Product Master', { exact: true })).toBeInTheDocument();
    expect(navigation.getByText('Shop listings', { exact: true })).toBeInTheDocument();
    const before = JSON.stringify(getProductById(id));
    for (const label of ['Product Master', 'Shop listings']) {
      fireEvent.click(navigation.getByRole('button', { name: `About ${label}` }));
      const help = await screen.findByRole('dialog', { name: `${label} explained` });
      fireEvent.click(within(help).getByRole('button', { name: `Close ${label} help` }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: `${label} explained` })).not.toBeInTheDocument());
      expect(navigation.getByRole('button', { name: 'Channel listings' })).toHaveAttribute('aria-current', 'page');
    }
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it.each(['draft', 'published'] as const)('hides completed readiness and reclaims the sidebar across workspaces for %s Masters', async status => {
    updateProduct(id, { id, status });
    await mount();
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    for (const name of [/^Overview/, /^Product data/, /^Pricing & Inventory/, /^Channel listings/]) {
      fireEvent.click(navigation.getByRole('button', { name }));
      expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'View all readiness checks' })).not.toBeInTheDocument();
      expect(screen.getByTestId('product-editor-layout')).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)]');
      expect(screen.getByTestId('product-editor-layout')).not.toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)_300px]');
    }
    expect(screen.getByRole('button', { name: status === 'draft' ? 'Activate Master' : 'Master active' })).toBeVisible();
    expect(getProductById(id)?.status).toBe(status);
  });
  it.each(['draft', 'published'] as const)('restores readiness for a missing field and hides it again without remounting the %s form', async status => {
    updateProduct(id, { id, status });
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    const nameInput = screen.getByDisplayValue(product.name);
    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: 'X' } });
    expect(screen.getByRole('heading', { name: /Product readiness/ })).toBeVisible();
    expect(screen.getByTestId('product-editor-layout')).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)_300px]');
    expect(screen.getByRole('button', { name: /Add product name and master SKU/ })).toBeVisible();
    expect(nameInput).toHaveFocus();
    fireEvent.change(nameInput, { target: { value: 'Complete product name again' } });
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('product-editor-layout')).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)]');
    expect(nameInput).toHaveFocus();
    expect(nameInput).toHaveValue('Complete product name again');
    expect(getProductById(id)).toMatchObject({ name: product.name, status });
  });
  it('shows unified activity history without an idle sidebar when readiness is complete', async () => {
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Activity history/ }));
    expect(screen.getByRole('heading', { name: 'Activity history' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Activity scope' })).toBeVisible();
    expect(screen.getByTestId('product-editor-layout')).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)]');
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
  });
  it('lets users reopen all checks from the menu without saving or activating', async () => {
    await mount();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Product actions' }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'View readiness checks' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Product readiness checks' }));
    expect(dialog.getByText(/All required Master details are complete/)).toBeVisible();
    expect(dialog.getByRole('button', { name: /Add at least 1 product image/ })).toBeVisible();
    fireEvent.click(dialog.getAllByRole('button', { name: /^Close$/ })[0]);
    expect(screen.queryByRole('dialog', { name: 'Product readiness checks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
    expect(getProductById(id)).toMatchObject({ status: 'draft', channels: [] });
  });
  it('shows the same one-image minimum in Media and readiness, including after removing the last image', async () => {
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    expect(screen.getByText('1 image · 1 required · 9 max')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate Master' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }));
    expect(screen.getByText('0 images · 1 required · 9 max')).toBeVisible();
    expect(screen.getByText('Add at least 1 product image', { selector: 'span' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Activate Master' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete product' })).toBeVisible();
  });
  it('keeps all three gallery slots and reports media complete when two URLs are duplicates', async () => {
    const images = ['/one.jpg', '/two.jpg', '/two.jpg'];
    updateProduct(id, { id, images });
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    expect(screen.getByText('3 images · 1 required · 9 max')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Add at least 1 product image')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove image 3' })).toBeInTheDocument();
    expect(getProductById(id)?.images).toEqual(images);
  });
  it('can save and resume an incomplete draft without a category or listing', async () => {
    updateProduct(id, { id, category: '', categoryId: undefined, images: [], description: '', inventory: {} });
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Saved unfinished product' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)).toMatchObject({ name: 'Saved unfinished product', status: 'draft', category: '', channels: [], inventory: {} });
    expect(screen.getByRole('button', { name: 'Complete product' })).toBeVisible();
  });
  it('preserves each imported shop relationship when saving Master content', async () => {
    const imported = ['One', 'Two'].map(store => ({ channel: 'shopee' as const, external_id: `listing-${store}`, store_name: store, shop_sku: `SHOP-${store}`, status: 'draft' as const, reported_stock: 12, publication_unconfirmed: true, listing_url: null, last_synced_at: null }));
    updateProduct(id, { id, channels: imported });
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Edited imported Master' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activate Master' }));
    expect(getProductById(id)?.channels).toEqual(imported);
    expect(getProductById(id)?.inventory).toEqual(product.inventory);
    expect(Object.values(getProductById(id)?.channel_overrides ?? {}).some(override => override.enabled)).toBe(false);
  });
  it('keeps provider IDs and per-listing sync settings when saving Master edits', async () => {
    const listings = ['One', 'Two'].map(shop => ({ channel: 'lazada' as const, external_id: `provider-${shop}`, store_name: shop, shop_sku: `SKU-${shop}`, status: 'active' as const, listing_url: null, last_synced_at: null, master_data_sync: { enabled: shop === 'One', fields: ['media' as const], updated_at: '2026-10-01T00:00:00Z' } }));
    updateProduct(id, { id, channels: listings, channel_overrides: { lazada: { enabled: true, title: '', description: '', listing_sku: 'SKU-One', price_markup: 0 } } });
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Updated Master only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.channels).toEqual(listings);
    expect(getProductById(id)?.channel_overrides?.lazada?.listing_mode).toBe('manual');
    expect(getProductById(id)?.channel_overrides?.lazada?.media_scope).toBe('custom');
  });
  it('is ready without a listing, stays Draft until confirmed, then publishes only Master', async () => {
    await mount();
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Prepare at least one channel for publishing')).not.toBeInTheDocument();
    expect(getProductById(id)?.status).toBe('draft');
    fireEvent.click(screen.getByRole('button', { name: 'Activate Master' }));
    let dialog = within(screen.getByRole('dialog', { name: 'Activate this Product Master?' }));
    expect(dialog.getByText(/You can link channels later/)).toBeVisible();
    expect(dialog.queryByRole('radiogroup')).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)?.status).toBe('draft');
    fireEvent.click(screen.getByRole('button', { name: 'Activate Master' }));
    dialog = within(screen.getByRole('dialog', { name: 'Activate this Product Master?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Activate Master' }));
    await waitFor(() => expect(getProductById(id)?.status).toBe('published'), { timeout: 4000 });
    expect(getProductById(id)?.channels).toEqual([]);
    expect(Object.values(getProductById(id)?.channel_overrides ?? {}).some(listing => listing.enabled)).toBe(false);
    expect(getProductById(id)?.revisions).toHaveLength(1);
    cleanup(); await mount();
    expect(screen.getByRole('button', { name: 'Master active' })).toBeDisabled();
    expect(screen.getByText('No channel listings configured')).toBeVisible();
  });

  it('still blocks missing Master fields and lists only actual requirements', async () => {
    updateProduct(id, { id, images: [] });
    await mount();
    expect(screen.queryByRole('button', { name: 'Activate Master' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete product' }));
    const checklist = within(screen.getByRole('dialog', { name: 'Complete this product' }));
    expect(checklist.getByText('Add at least 1 product image')).toBeVisible();
    expect(checklist.queryByText(/channel for publishing/)).not.toBeInTheDocument();
    expect(getProductById(id)?.status).toBe('draft');
  });

  it('saves complete edits and opens publish directly without a manual readiness step', async () => {
    await mount();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Edited standalone Master' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activate Master' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Activate this Product Master?' }));
    expect(getProductById(id)).toMatchObject({ name: 'Edited standalone Master', status: 'draft', channels: [] });
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)?.status).toBe('draft');
  });

  it('keeps creation review and channel validation separate for a setup without a listing relationship', async () => {
    updateProduct(id, { id, pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100,
      channel_overrides: { shopee: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'SHO-STANDALONE', category: '', shipping_option: '' } } });
    await mount();
    expect(screen.queryByRole('heading', { name: /Product readiness/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('product-editor-layout')).toHaveClass('xl:grid-cols-[220px_minmax(0,1fr)]');
    fireEvent.click(screen.getByRole('button', { name: 'Continue setup' }));
    const listing = within(screen.getByRole('dialog', { name: 'Shopee listing' }));
    expect(listing.getByRole('button', { name: 'Complete next item' })).toBeEnabled();
    expect(listing.getByRole('button', { name: /Channel requirements.*missing/ })).toBeVisible();
    expect(listing.queryByRole('button', { name: 'Publish update' })).not.toBeInTheDocument();
    fireEvent.click(listing.getAllByRole('button', { name: 'Close' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Activate Master' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Activate this Product Master?' }));
    expect(dialog.getByRole('radio', { name: /Save Master only/ })).toHaveAttribute('aria-checked', 'true');
    expect(dialog.getByRole('radio', { name: /Save Master & review listing updates/ })).toBeEnabled();
    expect(getProductById(id)?.channel_overrides?.shopee).toMatchObject({ title: '', category: '', shipping_option: '' });
  });
});
