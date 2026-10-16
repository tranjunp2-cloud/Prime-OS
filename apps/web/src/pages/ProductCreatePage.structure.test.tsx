// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
const id = 'product-structure-placement-test';
let product: Product;
async function mount(section = 'commerce', viewer = false) {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=${section}${viewer ? '&mode=viewer' : ''}`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
function tab(section: string) { if (section === 'commerce' || section === 'product-data') section = 'setup'; fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: section } }); }
function changeType(colorOnly = false) {
  if (colorOnly) fireEvent.click(screen.getByRole('button', { name: 'Remove Material attribute' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Product with variants' }));
}
beforeEach(() => {
  toast.mockReset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  const seed = getProducts().find(item => !item.has_variants && item.category === 'Art Supplies')!;
  product = { ...seed, id, name: 'Product structure fixture', sku_code: 'STRUCTURE-TEST',
    description: 'A paper notebook', retail_price: 100, images: ['/cover.jpg'], has_variants: false, product_type: 'single', variant_options: [],
    specifications: [{ attributeKey: 'material', name: 'Material', value: 'Paper' }, { attributeKey: 'color', name: 'Color', value: 'White' }],
    skus: [{ id: 'original-single', sku_code: 'STRUCTURE-TEST', variation_name: 'Default', weight_g: 50, units_per_carton: 1, status: 'active', price: 100 }],
    inventory: { wh_crjp: 8, wh_rslsg: 4 }, status: 'draft', import_source: undefined, import_sources: [], import_result: undefined,
    revisions: [], channel_overrides: {}, channels: [], record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });

describe('Single-source variant setup', () => {
  it('keeps an immediate automatic conversion dirty after the initialization timer finishes', () => {
    vi.useFakeTimers();
    try {
      render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=setup`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
      changeType();
      expect(screen.getByLabelText('Price for Paper / White')).toHaveValue(100);
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeVisible();
      act(() => { vi.advanceTimersByTime(200); });
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeVisible();
      expect(getProductById(id)?.has_variants).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      expect(getProductById(id)?.has_variants).toBe(true);
      expect(getProductById(id)?.skus[0].id).toBe('original-single');
    } finally { cleanup(); vi.useRealTimers(); }
  });

  it('removes suggested Material from this product only and keeps its SKU and stock after reload', async () => {
    await mount();
    const catalog = localStorage.getItem('prime-product-catalog-settings-v2');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Material attribute' }));
    expect(screen.queryByRole('group', { name: 'Material' })).not.toBeInTheDocument();
    expect(getProductById(id)?.specifications).toEqual(product.specifications);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.attribute_setup?.excludedKeys).toContain('material');
    expect(getProductById(id)?.skus[0]).toMatchObject({ id: 'original-single', price: 100 });
    expect(getProductById(id)?.inventory).toEqual(product.inventory);
    expect(localStorage.getItem('prime-product-catalog-settings-v2')).toBe(catalog);
    cleanup(); await mount();
    expect(screen.queryByRole('button', { name: 'Remove Material attribute' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add attribute' }), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Material' }));
    expect(screen.getByRole('button', { name: 'Remove Material attribute' })).toBeVisible();
  });

  it('reviews affected SKUs when removing an axis and preserves their identities, prices and inventory', async () => {
    const skus = ['White', 'Black'].map((value, index) => ({ ...product.skus[0], id: `remove-axis-${index}`, sku_code: `KEEP-${value.toUpperCase()}`, variation_name: `Paper / ${value}`, option_values: { material: 'Paper', color: value }, stock_by_location: { wh_crjp: index + 2 }, price: 100 + index * 25 }));
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [
      { attributeKey: 'material', name: 'Material', values: ['Paper'] },
      { attributeKey: 'color', name: 'Color', values: ['White', 'Black'] },
    ], skus });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Material attribute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove attribute' }));
    expect(screen.getByText('Review affected SKUs')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Complete variant setup' }));
    expect(JSON.stringify(getProductById(id))).toBe(before);
    for (const value of ['White', 'Black']) fireEvent.change(screen.getByLabelText(`Keep SKU KEEP-${value.toUpperCase()} as`), { target: { value } });
    fireEvent.click(screen.getByLabelText(/I reviewed the existing SKU mappings/));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    const saved = getProductById(id)!;
    expect(saved.variant_options).toEqual([{ name: 'Color', attributeKey: 'color', values: ['White', 'Black'] }]);
    for (const sku of skus) expect(saved.skus.find(item => item.id === sku.id)).toMatchObject({ id: sku.id, sku_code: sku.sku_code, price: sku.price, stock_by_location: sku.stock_by_location });
    cleanup(); await mount();
    expect(screen.queryByRole('button', { name: 'Remove Material attribute' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Price for Black')).toHaveValue(125);
  });

  it('does not save an empty matrix after removing the last variant attribute', async () => {
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['White'] }], skus: [{ ...product.skus[0], variation_name: 'White', stock_by_location: { wh_crjp: 8 } }] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Color attribute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove attribute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Complete variant setup' }));
    expect(JSON.stringify(getProductById(id))).toBe(before);
    fireEvent.click(screen.getByRole('radio', { name: 'Single product' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /Convert/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)).toMatchObject({ has_variants: false, inventory: { wh_crjp: 8 } });
    expect(getProductById(id)?.skus[0].id).toBe('original-single');
  });

  it('offers one Product setup destination and accepts both legacy URLs', async () => {
    await mount('product-data');
    expect(screen.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('setup');
    expect(within(screen.getByRole('combobox', { name: 'Product editor section' })).getAllByRole('option').map(item => item.textContent)).toEqual(['Overview', 'Product setup', 'Channel listings', 'Activity history']);
    expect(screen.getByRole('heading', { name: 'Product setup', exact: true })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Attributes', exact: true })).toBeVisible();
    expect(screen.getByText('1 SKU', { exact: true })).toBeVisible();
    cleanup(); await mount('commerce');
    expect(screen.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('setup');
  });
  it('creates and removes product-only attributes inline and preserves them after reload', async () => {
    await mount();
    const catalog = localStorage.getItem('prime-product-catalog-settings-v2');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add attribute' }), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Create new attribute' }));
    fireEvent.change(screen.getByLabelText('Attribute name'), { target: { value: 'Finish' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to product' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Finish value' }));
    fireEvent.change(screen.getByLabelText('New finish value'), { target: { value: 'Matte' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.queryByRole('table', { name: 'Variant pricing matrix' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Color attribute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.attribute_setup?.attributes[0].name).toBe('Finish');
    expect(getProductById(id)?.attribute_setup?.excludedKeys).toContain('color');
    expect(localStorage.getItem('prime-product-catalog-settings-v2')).toBe(catalog);
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    cleanup(); await mount();
    expect(screen.getByRole('button', { name: 'Matte' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Color', { exact: true })).not.toBeInTheDocument();
    changeType();
    expect(screen.getByLabelText('Create variants from Finish')).toBeChecked();
    expect(screen.getByLabelText('Price for Paper / Matte')).toHaveValue(100);
    expect(screen.getAllByRole('group', { name: 'Finish', exact: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.skus[0]).toMatchObject({ id: 'original-single', variation_name: 'Paper / Matte' });
  });
  it('keeps draft opening counts on failed persistence and never publishes partial stock', async () => {
    await mount(); changeType(true);
    fireEvent.click(screen.getByRole('button', { name: 'Add Color value' }));
    fireEvent.change(screen.getByLabelText('New color value'), { target: { value: 'Black' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'View inventory for Black' }));
    fireEvent.change(screen.getByLabelText('Add warehouse for Black'), { target: { value: 'wh_crjp' } });
    const count = screen.getByLabelText('Opening stock for Black at CyberRecord Japan HQ');
    fireEvent.change(count, { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Review opening stock' }));
    fireEvent.change(count, { target: { value: '6' } });
    const before = JSON.stringify(getProductById(id));
    const persist = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not save the Product Master' }));
    expect(JSON.stringify(getProductById(id))).toBe(before);
    expect(count).toHaveValue(6);
    persist.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    const saved = getProductById(id)!;
    expect(saved.skus.find(sku => sku.variation_name === 'Black')?.stock_by_location).toEqual({ wh_crjp: 6 });
    expect(saved.inventory_adjustments?.filter(item => item.sku.includes('BLACK'))).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });
  it('owns structure and attributes together in Product setup and keeps single pricing free of variant selectors', async () => {
    await mount('product-data');
    expect(within(document.getElementById('product-section-basic')!).queryByRole('region', { name: 'Product structure' })).not.toBeInTheDocument();
    tab('commerce');
    expect(screen.getByRole('region', { name: 'Product structure' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'About product structure' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeChecked();
    expect(screen.queryByRole('table', { name: 'Variant pricing matrix' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Variant option type')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bulk edit' })).not.toBeInTheDocument();
  });
  it('automatically creates the matrix from selected Material and Color values without ticking attributes', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    changeType();
    expect(screen.getByLabelText('Create variants from Color')).toBeChecked();
    expect(screen.getByLabelText('Create variants from Material')).toBeChecked();
    expect(screen.queryByRole('button', { name: 'About variant options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Material variant values' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Price for Paper / White')).toHaveValue(100);
    expect(screen.getByRole('table', { name: 'Variant pricing matrix' }).querySelectorAll('tbody > tr')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'View inventory for Paper / White' })).toHaveTextContent('12 units');
    expect(screen.getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'true');
    tab('product-data');
    expect(within(document.getElementById('product-section-basic')!).queryByRole('region', { name: 'Product structure' })).not.toBeInTheDocument();
    tab('commerce');
    expect(screen.getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('maps the original single to one variant, preserving ID, price, stock and listing link on save/reload', async () => {
    const channels = [{ channel: 'shopee' as const, external_id: 'original-shop', status: 'active' as const, listing_url: null, last_synced_at: null,
      variant_mappings: [{ shop_sku: 'SHOP-WHITE', master_sku_id: 'original-single' }] }];
    updateProduct(id, { id, channels });
    await mount(); changeType(true);
    fireEvent.click(screen.getByRole('button', { name: 'Add Color value' }));
    fireEvent.change(screen.getByLabelText('New color value'), { target: { value: 'Black' } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Attributes and SKU matrix' })).getByRole('button', { name: 'Add', exact: true }));
    expect(screen.queryByRole('button', { name: 'Apply SKU setup' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Keep SKU STRUCTURE-TEST as')).not.toBeInTheDocument();
    tab('product-data');
    expect(screen.getAllByRole('group', { name: 'Color', exact: true })).toHaveLength(1);
    tab('commerce');
    expect(screen.getByRole('table', { name: 'Variant pricing matrix' }).querySelectorAll('tbody > tr')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Price for Black'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    const saved = getProductById(id)!;
    expect(saved.has_variants).toBe(true);
    expect(saved.skus.find(sku => sku.id === 'original-single')).toMatchObject({ sku_code: 'STRUCTURE-TEST', variation_name: 'White', price: 100, stock_by_location: { wh_crjp: 8, wh_rslsg: 4 } });
    expect(saved.skus.find(sku => sku.variation_name === 'Black')).toMatchObject({ price: 120, stock_by_location: {} });
    expect(saved.channels).toEqual(channels);
    cleanup(); await mount('commerce');
    expect(screen.getByLabelText('Price for Black')).toHaveValue(120);
    expect(screen.getByRole('button', { name: 'View inventory for White' })).toHaveTextContent('12 units');
  });
  it('does not regenerate missing or inactive combinations when pricing is opened', async () => {
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['White', 'Black', 'Blue'] }],
      skus: [{ ...product.skus[0], variation_name: 'White', stock_by_location: { wh_crjp: 8 } }, { ...product.skus[0], id: 'inactive-black', sku_code: 'OLD-BLACK', variation_name: 'Black', status: 'inactive', stock_by_location: {} }] });
    await mount('commerce');
    expect(screen.queryByLabelText('Price for Black')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Price for Blue')).not.toBeInTheDocument();
    expect(getProductById(id)?.skus).toHaveLength(2);
  });
  it('blocks collapsing multiple active SKUs instead of silently discarding them', async () => {
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['White', 'Black'] }], skus: ['White', 'Black'].map((value, index) => ({ ...product.skus[0], id: `sku-${index}`, sku_code: `CODE-${index}`, variation_name: value, stock_by_location: { wh_crjp: index + 1 } })) });
    await mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Single product' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Keep one sellable SKU first' }));
    expect(screen.getByRole('radio', { name: 'Product with variants' })).toBeChecked();
    expect(getProductById(id)?.skus).toHaveLength(2);
  });
  it('keeps the only active SKU and its own inventory when explicitly converting back to single', async () => {
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['White'] }], skus: [{ ...product.skus[0], sku_code: 'KEEP-WHITE', variation_name: 'White', stock_by_location: { wh_crjp: 3 }, price: 75 }] });
    await mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Single product' }));
    const dialog = within(screen.getByRole('alertdialog'));
    expect(dialog.getByText(/Keep KEEP-WHITE as the single/)).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: /Convert/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)).toMatchObject({ has_variants: false, sku_code: 'KEEP-WHITE', inventory: { wh_crjp: 3 }, retail_price: 75 });
    expect(getProductById(id)?.skus[0].id).toBe('original-single');
  });
  it('rebuilds the matrix when switching back to variants before saving a single conversion', async () => {
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['White'] }], skus: [{ ...product.skus[0], variation_name: 'White', option_values: { color: 'White' }, stock_by_location: { wh_crjp: 3 }, price: 75 }] });
    await mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Single product' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /Convert/ }));
    changeType();
    expect(screen.getByLabelText('Price for Paper / White')).toHaveValue(75);
    expect(screen.getByRole('button', { name: 'View inventory for Paper / White' })).toHaveTextContent('3 units');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.skus[0]).toMatchObject({ id: 'original-single', price: 75, stock_by_location: { wh_crjp: 3 } });
  });
  it('retains an explicitly inactivated SKU and never regenerates it on reload', async () => {
    updateProduct(id, { id, product_type: 'variant', has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['White', 'Black'] }], skus: [
      { ...product.skus[0], variation_name: 'White', stock_by_location: { wh_crjp: 8 } },
      { ...product.skus[0], id: 'keep-black-history', sku_code: 'KEEP-BLACK', variation_name: 'Black', stock: 0, stock_by_location: {} },
    ] });
    await mount();
    const options = within(screen.getByRole('region', { name: 'Attributes and SKU matrix' }));
    fireEvent.click(options.getByLabelText('Include Black'));
    fireEvent.change(options.getByLabelText('Keep SKU KEEP-BLACK as'), { target: { value: '__archive' } });
    fireEvent.click(options.getByLabelText(/I reviewed 1 SKU/));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.skus.find(sku => sku.id === 'keep-black-history')).toMatchObject({ status: 'inactive', sku_code: 'KEEP-BLACK', price: 100 });
    cleanup(); await mount('commerce');
    expect(screen.queryByLabelText('Price for Black')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Variant pricing matrix' }).querySelectorAll('tbody > tr')).toHaveLength(1);
    expect(getProductById(id)?.product_type).toBe('variant');
  });
  it('does not expose structure editing to a viewer', async () => {
    await mount('commerce', true);
    expect(screen.queryByRole('button', { name: 'Edit product structure' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Product with variants' })).toBeDisabled();
  });
  it('requires confirmation before discarding an unsaved variant setup and restores common attributes', async () => {
    await mount(); changeType();
    fireEvent.click(screen.getByRole('radio', { name: 'Single product' }));
    let dialog = within(screen.getByRole('alertdialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Keep variants' }));
    expect(screen.getByRole('radio', { name: 'Product with variants' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Single product' }));
    dialog = within(screen.getByRole('alertdialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Return to single product' }));
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeChecked();
    tab('product-data');
    expect(screen.getByDisplayValue('White')).toBeInTheDocument();
    expect(getProductById(id)?.has_variants).toBe(false);
    expect(getProductById(id)?.inventory).toEqual({ wh_crjp: 8, wh_rslsg: 4 });
  });
  it('blocks Save while a mapping is unresolved, retains the draft across tabs and directs readiness to Pricing', async () => {
    updateProduct(id, { id, specifications: [{ attributeKey: 'material', name: 'Material', value: 'Paper' }] });
    await mount(); changeType(true);
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(screen.getByRole('button', { name: 'Add Color value' }));
    fireEvent.change(screen.getByLabelText('New color value'), { target: { value: 'Blue' } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Attributes and SKU matrix' })).getByRole('button', { name: 'Add', exact: true }));
    tab('product-data');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Complete variant setup' }));
    expect(JSON.stringify(getProductById(id))).toBe(before);
    expect(document.getElementById('product-section-pricing')).not.toHaveClass('hidden');
    expect(screen.getByLabelText('Keep SKU STRUCTURE-TEST as')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Keep SKU STRUCTURE-TEST as'), { target: { value: 'Blue' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.skus[0]).toMatchObject({ id: 'original-single', variation_name: 'Blue' });
  });
});
