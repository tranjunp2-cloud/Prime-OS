// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import Products from './Products';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions } from '@/lib/inventory-store';
import { getStockHoldHistory, STOCK_HOLD_STORAGE_KEY } from '@/lib/stock-hold-history';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
const id = 'stock-detail-test';
const seed = getProducts().find(product => !product.has_variants)!;
let product: Product;
function Path() { const location = useLocation(); return <output data-testid="current-path">{location.pathname}</output>; }
function mount(query = '') {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=commerce${query}`]}><Path /><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
}
async function ready() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); }); }
function record(value: string) {
  fireEvent.change(screen.getByLabelText('Actual stock count'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
}
function saveMetadata() { fireEvent.click(screen.getByRole('button', { name: /^(Update Master|Activate Master|Complete product)$/ })); }
function seedVariants(blue: Record<string, number> = {}, red: Record<string, number> = { wh_rslsg: 7 }) {
  const sku = { weight_g: 0, units_per_carton: 1, status: 'active' as const, price: 10 };
  product = { ...product, has_variants: true, product_type: 'variant', variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Blue', 'Red'] }], skus: [
    { ...sku, id: 'child-blue', sku_code: 'STOCK-DETAIL-BLUE', variation_name: 'Blue', stock_by_location: blue },
    { ...sku, id: 'child-red', sku_code: 'STOCK-DETAIL-RED', variation_name: 'Red', stock_by_location: red },
  ] };
  updateProduct(id, product);
}
beforeEach(() => {
  clearInventoryStore();
  window.localStorage.removeItem(STOCK_HOLD_STORAGE_KEY);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  product = { ...seed, id, name: 'Stock detail test', sku_code: 'STOCK-DETAIL-TEST', has_variants: false, product_type: 'single', inventory: { wh_crjp: 7, wh_rslsg: 3, wh_fbajp: 0 }, skus: [], channels: [], channel_overrides: {}, status: 'draft', inventory_adjustments: [], import_result: undefined, record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); clearInventoryStore(); window.localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); vi.restoreAllMocks(); });
describe('stock adjustments without leaving Product Master', () => {
  it('shows related locations per variant in a full-width panel and keeps provider stock read-only', async () => {
    seedVariants({ wh_crjp: 0, wh_fbajp: 2 });
    mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'View inventory for Blue' }));
    const panel = screen.getByRole('region', { name: 'Inventory for Blue' });
    expect(panel.closest('td')).toHaveAttribute('colspan', '6');
    expect(screen.getByRole('table', { name: 'Variant pricing matrix' }).querySelector('[rowspan]')).toBeNull();
    const details = within(panel);
    expect(details.getByText('CyberRecord Japan HQ')).toBeInTheDocument();
    expect(details.getByText('0 units')).toBeInTheDocument();
    expect(details.getByText('Channel-managed stock · read only')).toBeInTheDocument();
    expect(details.getByText('Fulfillment By Amazon Japan')).toBeInTheDocument();
    expect(details.queryByText('Reseller Singapore')).not.toBeInTheDocument();
    expect(details.queryByText('Vietnam 3PL Partner')).not.toBeInTheDocument();
    expect(details.queryByRole('button', { name: /Adjust stock at Fulfillment/ })).not.toBeInTheDocument();
    expect(details.getByText('Not verified')).toBeInTheDocument();
  });
  it('explicitly adds stock to only the chosen variant and location while retaining unsaved edits', async () => {
    seedVariants();
    mount(); await ready();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved variant name' } });
    fireEvent.click(screen.getByRole('button', { name: 'View inventory for Blue' }));
    const panel = within(screen.getByRole('region', { name: 'Inventory for Blue' }));
    expect(panel.getByText('No stock recorded yet')).toBeInTheDocument();
    expect(panel.queryByText('0 units')).not.toBeInTheDocument();
    fireEvent.click(panel.getByRole('button', { name: 'Add stock location for Blue' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Record opening stock' }));
    expect(dialog.getByLabelText('Variant SKU')).toBeDisabled();
    expect(dialog.getByLabelText('Variant SKU')).toHaveValue('STOCK-DETAIL-BLUE');
    expect(within(dialog.getByLabelText('Warehouse')).getAllByRole('option').map(option => option.textContent)).toEqual(['Select a warehouse', 'CyberRecord Japan HQ', 'Reseller Singapore', 'Vietnam 3PL Partner']);
    fireEvent.change(dialog.getByLabelText('Warehouse'), { target: { value: 'wh_crjp' } });
    fireEvent.change(dialog.getByLabelText('Opening stock'), { target: { value: '0' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save opening stock' }));
    expect(getProductById(id)?.skus.map(sku => sku.stock_by_location)).toEqual([{ wh_crjp: 0 }, { wh_rslsg: 7 }]);
    expect(getProductById(id)?.inventory_adjustments?.[0]).toMatchObject({ sku: 'STOCK-DETAIL-BLUE', warehouseId: 'wh_crjp', before: null, after: 0, kind: 'opening' });
    expect(screen.getByDisplayValue('Unsaved variant name')).toBeInTheDocument();
    expect(panel.getByText('0 units')).toBeInTheDocument();
    saveMetadata();
    expect(getProductById(id)?.skus.map(sku => sku.stock_by_location)).toEqual([{ wh_crjp: 0 }, { wh_rslsg: 7 }]);
  });
  it('does not assign warehouses when saving a newly generated variant', async () => {
    seedVariants({ wh_crjp: 5 });
    updateProduct(id, { id, skus: [product.skus[0]] });
    mount(); await ready();
    expect(screen.getByRole('button', { name: 'View inventory for Red' })).toHaveTextContent('Not saved');
    fireEvent.click(screen.getByRole('button', { name: 'View inventory for Red' }));
    const panel = within(screen.getByRole('region', { name: 'Inventory for Red' }));
    expect(panel.getByText('Save this variant before setting up stock')).toBeInTheDocument();
    expect(panel.queryByRole('button', { name: /Add stock location/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Price for Red'), { target: { value: '20' } });
    saveMetadata();
    const saved = getProductById(id)!;
    expect(saved.skus).toHaveLength(2);
    expect(saved.skus[0].stock_by_location).toEqual({ wh_crjp: 5 });
    expect(saved.skus[1].stock_by_location).toEqual({});
    expect(saved.skus[1].stock).toBeUndefined();
    expect(saved.inventory).toEqual(product.inventory);
    expect(saved.inventory_adjustments).toHaveLength(0);
  });
  it('cancels new variant stock without creating a count and hides stock writes from viewers', async () => {
    seedVariants();
    mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'View inventory for Blue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add stock location for Blue' }));
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_crjp' } });
    fireEvent.change(screen.getByLabelText('Opening stock'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)?.skus[0].stock_by_location).toEqual({});
    expect(getProductById(id)?.inventory_adjustments).toHaveLength(0);
    cleanup(); mount('&mode=viewer'); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'View inventory for Red' }));
    const panel = within(screen.getByRole('region', { name: 'Inventory for Red' }));
    expect(panel.queryByRole('button', { name: /Add stock location|Adjust stock|Manage holds/ })).not.toBeInTheDocument();
  });
  it('counts confirmed SKU mappings per listing, not every shop sharing its channel', async () => {
    seedVariants({ wh_crjp: 5 });
    const listing = { channel: 'amazon' as const, status: 'active' as const, listing_url: null, last_synced_at: null };
    updateProduct(id, { id, channels: [
      { ...listing, store_name: 'Blue shop', external_id: 'blue-listing', variant_mappings: [{ shop_sku: 'SHOP-BLUE', master_sku_id: 'child-blue' }] },
      { ...listing, store_name: 'Red shop', external_id: 'red-listing', variant_mappings: [{ shop_sku: 'SHOP-RED', master_sku_id: 'child-red' }] },
      { ...listing, store_name: 'Pending shop', external_id: 'pending-listing', variant_mappings: [{ shop_sku: 'PENDING', master_sku_id: 'child-blue' }], review_pending: { issues: ['Review SKU'], sku_mapping_pending: true, saved_at: '2026-10-08T00:00:00Z' } },
    ] });
    mount(); await ready();
    const matrix = within(screen.getByRole('table', { name: 'Variant pricing matrix' }));
    expect(matrix.getAllByText('1 mapped listing')).toHaveLength(2);
    const sources = within(screen.getByRole('region', { name: 'Listing stock sources' }));
    expect(sources.getByText('Blue shop · amazon')).toBeInTheDocument();
    expect(sources.getByText('Red shop · amazon')).toBeInTheDocument();
    expect(sources.getByText(/SKU mapping needs review/)).toBeInTheDocument();
  });
  it('manages holds without leaving product details or overwriting unsaved product edits', async () => {
    addInventoryPosition({ id: 'detail-hold', product_id: id, sku_id: `${id}_default`, warehouse_id: 'wh_crjp', on_hand: 7, reserved_unpaid: 0, reserved_paid: 1, allocated: 0, safety_stock: 1, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' });
    mount(); await ready();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved product name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manage holds for Stock detail test at CyberRecord Japan HQ' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'campaign_lock' } });
    fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save hold' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent(`/products/${id}/edit`);
    expect(screen.getByDisplayValue('Unsaved product name')).toBeInTheDocument();
    expect(getProductById(id)?.name).toBe(product.name);
    expect(getProductById(id)?.inventory.wh_crjp).toBe(7);
    saveMetadata();
    expect(getProductById(id)?.name).toBe('Unsaved product name');
    expect(getInventoryPositions()[0].campaign_lock).toBe(2);
    expect(getStockHoldHistory()).toHaveLength(1);
  });
  it('preserves unsaved product edits and adjusted stock when product details are later saved', async () => {
    mount(); await ready();
    const name = screen.getByDisplayValue(product.name);
    fireEvent.change(name, { target: { value: 'Name still being edited' } });
    expect(screen.queryByLabelText('CyberRecord Japan HQ available stock')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust stock at CyberRecord Japan HQ' }));
    expect(screen.getByLabelText('Product')).toBeDisabled();
    expect(screen.getByLabelText('Warehouse')).toHaveValue('wh_crjp');
    record('13');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent(`/products/${id}/edit`);
    expect(name).toHaveValue('Name still being edited');
    expect(screen.getByText('13 units')).toBeInTheDocument();
    expect(getProductById(id)?.name).toBe(product.name);
    expect(getProductById(id)?.inventory_adjustments).toHaveLength(1);
    updateProduct(id, { id, inventory: { ...getProductById(id)!.inventory, wh_rslsg: 9 } });
    saveMetadata();
    expect(getProductById(id)?.name).toBe('Name still being edited');
    expect(getProductById(id)?.inventory).toMatchObject({ wh_crjp: 13, wh_rslsg: 9 });
    expect(getProductById(id)?.inventory_adjustments?.[0]).toMatchObject({ before: 7, after: 13 });
  });
  it('cancels without changing stock or clearing the product form', async () => {
    mount(); await ready();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unfinished name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adjust stock at CyberRecord Japan HQ' }));
    fireEvent.change(screen.getByLabelText('Actual stock count'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByDisplayValue('Unfinished name')).toBeInTheDocument();
    expect(getProductById(id)?.inventory.wh_crjp).toBe(7);
    expect(getProductById(id)?.inventory_adjustments).toHaveLength(0);
  });
  it('adjusts one variant and preserves both child warehouse balances on metadata save', async () => {
    const sku = { weight_g: 0, units_per_carton: 1, status: 'active' as const, price: 10 };
    product = { ...product, has_variants: true, product_type: 'variant', variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Blue', 'Red'] }], skus: [{ ...sku, id: 'child-blue', sku_code: 'STOCK-DETAIL-BLUE', variation_name: 'Blue', stock_by_location: { wh_crjp: 5 } }, { ...sku, id: 'child-red', sku_code: 'STOCK-DETAIL-RED', variation_name: 'Red', stock_by_location: { wh_crjp: 2 } }] };
    updateProduct(id, product);
    mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'By warehouse' }));
    expect(screen.queryByLabelText('Warehouse for bulk stock update')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust stock at CyberRecord Japan HQ for Blue' }));
    expect(screen.getByLabelText('Variant SKU')).toHaveValue('STOCK-DETAIL-BLUE');
    record('8');
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Updated variant product' } });
    saveMetadata();
    const saved = getProductById(id)!;
    expect(saved.name).toBe('Updated variant product');
    expect(saved.skus.map(item => item.id)).toEqual(['child-blue', 'child-red']);
    expect(saved.skus.map(item => item.stock_by_location?.wh_crjp)).toEqual([8, 2]);
    expect(saved.inventory.wh_crjp).toBe(10);
    expect(saved.inventory_adjustments?.[0]).toMatchObject({ sku: 'STOCK-DETAIL-BLUE', before: 5, after: 8 });
  });
  it('does not expose adjustment actions for a viewer or external warehouse', async () => {
    mount('&mode=viewer'); await ready();
    expect(screen.queryByRole('button', { name: /^Adjust stock/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Manage holds/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add stock location' })).not.toBeInTheDocument();
    cleanup(); mount();
    expect(screen.queryByRole('button', { name: 'Adjust stock at Fulfillment By Amazon Japan' })).not.toBeInTheDocument();
  });
  it('shows only recorded locations, preserves zero and external stock, and displays one total', async () => {
    mount(); await ready();
    const inventory = within(screen.getByRole('region', { name: 'Inventory by location' }));
    expect(inventory.getByText('CyberRecord Japan HQ')).toBeInTheDocument();
    expect(inventory.getByText('Reseller Singapore')).toBeInTheDocument();
    expect(inventory.getByText('Fulfillment By Amazon Japan')).toBeInTheDocument();
    expect(inventory.getByText('0 units')).toBeInTheDocument();
    expect(inventory.getByText('Read only')).toBeInTheDocument();
    expect(inventory.queryByText('Vietnam 3PL Partner')).not.toBeInTheDocument();
    expect(inventory.queryByText('Fulfillment By Shopee Malaysia')).not.toBeInTheDocument();
    expect(inventory.queryByText('Not recorded')).not.toBeInTheDocument();
    expect(inventory.getAllByText('10 units')).toHaveLength(1);
    expect(inventory.getByText('Total recorded stock')).toBeInTheDocument();
  });
  it('adds a location with an explicit zero count and preserves unsaved edits and other balances', async () => {
    mount(); await ready();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Still editing this product' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add stock location' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Record opening stock' }));
    expect(within(dialog.getByLabelText('Warehouse')).getAllByRole('option').map(option => option.textContent)).toEqual(['Select a warehouse', 'Vietnam 3PL Partner']);
    expect(dialog.getByRole('button', { name: 'Save opening stock' })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText('Warehouse'), { target: { value: 'wh_3plvn' } });
    fireEvent.change(dialog.getByLabelText('Opening stock'), { target: { value: '0' } });
    updateProduct(id, { id, inventory: { ...product.inventory, wh_rslsg: 9 } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save opening stock' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adjust stock at Vietnam 3PL Partner' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add stock location' })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Still editing this product')).toBeInTheDocument();
    const saved = getProductById(id)!;
    expect(saved.inventory).toEqual({ ...product.inventory, wh_rslsg: 9, wh_3plvn: 0 });
    expect(saved.inventory_adjustments?.[0]).toMatchObject({ warehouseId: 'wh_3plvn', before: null, after: 0, kind: 'opening', reason: 'Opening stock' });
    expect(saved.channels).toEqual(product.channels);
    expect(saved.channel_overrides).toEqual(product.channel_overrides);
    saveMetadata();
    expect(getProductById(id)?.inventory.wh_3plvn).toBe(0);
  });
  it('does not create a location on cancel and shows an honest empty state', async () => {
    updateProduct(id, { id, inventory: {} });
    mount(); await ready();
    const inventory = within(screen.getByRole('region', { name: 'Inventory by location' }));
    expect(inventory.getByText('No stock recorded yet')).toBeInTheDocument();
    expect(inventory.queryByText('0 units')).not.toBeInTheDocument();
    fireEvent.click(inventory.getByRole('button', { name: 'Add stock location' }));
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_crjp' } });
    fireEvent.change(screen.getByLabelText('Opening stock'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)?.inventory).toEqual({});
    expect(inventory.getByText('No stock recorded yet')).toBeInTheDocument();
  });
  it('retains recorded inventory for a location no longer in the registry', async () => {
    updateProduct(id, { id, inventory: { deleted_location: 6 } });
    mount(); await ready();
    const inventory = within(screen.getByRole('region', { name: 'Inventory by location' }));
    expect(inventory.getByText('Unknown stock location')).toBeInTheDocument();
    expect(inventory.getByText('deleted_location')).toBeInTheDocument();
    expect(inventory.getByText('Read only')).toBeInTheDocument();
    expect(inventory.getAllByText('6 units')).toHaveLength(2);
  });
  it('updates stock inside the product list drawer without navigating to Warehouse', async () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Path /><Products /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: `${product.name}: 10 master stock available. Manage master stock.` }));
    fireEvent.click(screen.getByRole('button', { name: 'Adjust stock at CyberRecord Japan HQ' }));
    record('11');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/products/master-catalog');
    expect(screen.getByRole('heading', { name: 'Product Stock' })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('11')).toBeInTheDocument();
    expect(getProductById(id)?.inventory_adjustments).toHaveLength(1);
  });
});
