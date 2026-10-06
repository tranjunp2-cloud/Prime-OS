// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkExistingListingsDialog } from './LinkExistingListingsDialog';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { confirmListingIntake } from '@/lib/product-listing-intake';
import { listingMasterSync } from '@/lib/listing-master-sync';

let original: CatalogImportItem[];
let master: Product;
let items: CatalogImportItem[];
let originalIds: Set<string>;
beforeEach(() => {
  original = getCatalogImportItems({ requireConfirmation: true });
  originalIds = new Set(getProducts().map(product => product.id));
  master = { ...getProducts()[0], id: `link-picker-${crypto.randomUUID()}`, name: 'Saved tailoring Master', sku_code: 'TAILOR-1',
    status: 'draft', brand: 'Tailor', model_number: '', mpn: '', gtin: '', pack_quantity: 1,
    has_variants: false, product_type: 'single', skus: [], channels: [], channel_overrides: {}, import_sources: [],
    images: [], description: '', activity: [], record_version: 1, import_result: undefined, inventory: { wh_crjp: 17 } };
  addProduct(master);
  items = ['a', 'b', 'c'].map((id, index) => ({ id, channel: index === 2 ? 'amazon' : 'lazada', storeName: `Shop ${id}`,
    listingId: `listing-${id}`, title: `Tailoring listing ${id}`, channelSku: index ? `SHOP-${id}` : master.sku_code,
    image: '/image.jpg', images: ['/image.jpg', '/back.jpg'], variants: 1, channelStock: index ? 12 : 0,
    channelCategory: 'Sewing', price: 100, currency: 'JPY', brand: 'Tailor', packQuantity: 1,
    description: 'Original shop description', status: 'unmatched', confidence: 0, resolution: 'later', confirmed: false }));
  saveCatalogImportItems(items);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  getProducts().filter(product => !originalIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(original);
});
function mount() {
  const onClose = vi.fn(); const onLinked = vi.fn(); const restoreFocus = vi.fn();
  render(<LinkExistingListingsDialog master={getProductById(master.id)!} onClose={onClose} onLinked={onLinked} restoreFocus={restoreFocus} />);
  return { onClose, onLinked, restoreFocus };
}
const select = (index: number) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${items[index].channelSku} from ${items[index].storeName}` }));
const review = (count = 1) => fireEvent.click(screen.getByRole('button', { name: `Review links (${count})` }));
const acknowledge = () => fireEvent.click(screen.getByRole('checkbox', { name: /I checked that every/ }));

describe('Link existing listings from a fixed Master', () => {
  it('starts unselected, focuses search and does not persist when selecting, reviewing or cancelling', () => {
    const before = JSON.stringify(getProducts()); const imports = JSON.stringify(getCatalogImportItems({ requireConfirmation: true }));
    const { onClose, onLinked } = mount();
    expect(screen.getByLabelText('Search listings')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Review links' })).toBeDisabled();
    select(0); review();
    expect(screen.getByRole('heading', { name: 'Review links' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /Choose Master|Create listing|Publish/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('checkbox', { name: /Select TAILOR-1/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce(); expect(onLinked).not.toHaveBeenCalled();
    expect(JSON.stringify(getProducts())).toBe(before);
    expect(JSON.stringify(getCatalogImportItems({ requireConfirmation: true }))).toBe(imports);
  });
  it('preserves selection across search/channel/shop filters and searches listing IDs', () => {
    mount(); select(0);
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'amazon' } });
    expect(screen.getByText('1 selected · 1 outside filters')).toBeVisible();
    select(2);
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'lazada' } });
    fireEvent.change(screen.getByLabelText('Shop'), { target: { value: JSON.stringify(['lazada', 'Shop b']) } });
    expect(screen.queryByRole('checkbox', { name: /Select TAILOR-1/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Selected (2)' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox').every(checkbox => checkbox.getAttribute('aria-checked') === 'true')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    fireEvent.change(screen.getByLabelText('Search listings'), { target: { value: 'listing-b' } });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Review links (2)' })).toBeEnabled();
  });
  it('links multiple shops on the same channel to an incomplete Master and records activity without modifying Master or shop data', () => {
    const before = structuredClone(getProductById(master.id)!);
    const { onLinked } = mount(); select(0); select(1); review(2);
    expect(screen.getByRole('button', { name: 'Link 2 listings' })).toBeDisabled();
    acknowledge(); fireEvent.click(screen.getByRole('button', { name: 'Link 2 listings' }));
    expect(onLinked).toHaveBeenCalledWith({ productId: master.id, reviewSaved: true }, before.record_version, items.slice(0, 2));
    const after = getProductById(master.id)!;
    expect(after.channels).toHaveLength(2);
    for (const field of ['name', 'sku_code', 'brand', 'description', 'images', 'inventory', 'retail_price', 'status', 'channel_overrides'] as const) expect(after[field]).toEqual(before[field]);
    after.channels.forEach((listing, index) => {
      expect(listingMasterSync(listing)).toEqual({ enabled: false, fields: [] });
      expect(listing.shop_snapshot).toMatchObject({ title: items[index].title, images: items[index].images, stock: items[index].channelStock, price: { amount: 100, currency: 'JPY' } });
      expect(listing.last_synced_at).toBeNull();
    });
    expect(after.activity?.filter(event => event.kind === 'linked')).toHaveLength(2);
  });
  it('shows linked listings as unavailable only when searching, and excludes ignored records', () => {
    const other = { ...master, id: `${master.id}-other`, name: 'Other Master', sku_code: 'OTHER' }; addProduct(other);
    confirmListingIntake(['a'], { productId: other.id });
    confirmListingIntake(['b'], { productId: master.id });
    saveCatalogImportItems(getCatalogImportItems({ requireConfirmation: true }).map(item => item.id === 'c' ? { ...item, status: 'ignored' } : item));
    mount();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('No unlinked listings available')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search listings'), { target: { value: 'listing' } });
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox').every(element => element.hasAttribute('disabled'))).toBe(true);
    expect(screen.getByText('Linked to Other Master')).toBeVisible();
    expect(screen.getByText('Already linked to this Master')).toBeVisible();
  });
  it('keeps zero stock distinct from unavailable data and exposes identity differences in review', () => {
    items[1] = { ...items[1], channelStock: undefined as unknown as number, price: undefined as unknown as number, modelNumber: 'DIFFERENT', packQuantity: 12 };
    saveCatalogImportItems(items); updateProduct(master.id, { id: master.id, model_number: 'ORIGINAL' }); mount();
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.some(row => row.textContent?.includes('0 units'))).toBe(true);
    expect(within(rows.find(row => row.textContent?.includes('Tailoring listing b'))!).getAllByText('—')).toHaveLength(2);
    select(1); review();
    expect(screen.getByText('Check product identity before linking')).toBeVisible();
    expect(screen.getByText(/DIFFERENT/)).toHaveTextContent('ORIGINAL');
    expect(screen.getByText(/12 units/)).toHaveTextContent('1 units');
  });
  it('blocks multi-SKU listings for a single Master', () => {
    items[0].variants = 2; saveCatalogImportItems(items); mount(); select(0); review(); acknowledge();
    expect(screen.getByRole('button', { name: 'Link 1 listing' })).toBeDisabled();
    expect(screen.getByText(/It needs a variant Master/)).toBeVisible();
  });
  it('requires explicit mapping for every variant and saves the exact mappings', () => {
    const sku = getProducts().flatMap(product => product.skus)[0];
    updateProduct(master.id, { id: master.id, has_variants: true, product_type: 'variant', skus: [
      { ...sku, id: 'master-small', sku_code: 'SMALL', variation_name: 'Small', status: 'active' },
      { ...sku, id: 'master-large', sku_code: 'LARGE', variation_name: 'Large', status: 'active' },
    ] });
    items[0] = { ...items[0], variants: 2, variantItems: [{ sku: 'SHOP-S', label: 'Small' }, { sku: 'SHOP-L', label: 'Large' }] };
    saveCatalogImportItems(items); mount(); select(0); review(); acknowledge();
    expect(screen.getByRole('button', { name: 'Link 1 listing' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Master SKU for shop SKU 1'), { target: { value: 'master-small' } });
    expect(screen.getByRole('button', { name: 'Link 1 listing' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Master SKU for shop SKU 2'), { target: { value: 'master-large' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link 1 listing' }));
    expect(getProductById(master.id)!.channels[0].variant_mappings).toEqual([{ shop_sku: 'SHOP-S', master_sku_id: 'master-small' }, { shop_sku: 'SHOP-L', master_sku_id: 'master-large' }]);
  });
  it.each(['listing', 'master', 'already-linked', 'archived'])('rejects stale %s data atomically, keeps selection and allows returning to review', change => {
    const { onLinked } = mount(); select(0); select(1); review(2); acknowledge();
    if (change === 'listing') saveCatalogImportItems(items.map(item => item.id === 'a' ? { ...item, price: 200 } : item));
    if (change === 'master') updateProduct(master.id, { id: master.id, name: 'Changed elsewhere', record_version: 2 });
    if (change === 'archived') updateProduct(master.id, { id: master.id, status: 'archived' });
    if (change === 'already-linked') confirmListingIntake(['a'], { productId: master.id });
    fireEvent.click(screen.getByRole('button', { name: 'Link 2 listings' }));
    expect(screen.getByRole('alert')).toBeVisible(); expect(onLinked).not.toHaveBeenCalled();
    expect(getProductById(master.id)!.channels).toHaveLength(change === 'already-linked' ? 1 : 0);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Review links (2)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Select TAILOR-1/ })).toBeChecked();
  });
  it('keeps review open when persistence fails without partial links', () => {
    const { onLinked } = mount(); select(0); review(); acknowledge();
    const originalSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) { if (key === 'primeos-product-master-v5') throw new Error('Storage full. Free space and try again.'); originalSet.call(this, key, value); });
    fireEvent.click(screen.getByRole('button', { name: 'Link 1 listing' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
    expect(onLinked).not.toHaveBeenCalled(); expect(getProductById(master.id)!.channels).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Link 1 listing' })).toBeEnabled();
  });
});
