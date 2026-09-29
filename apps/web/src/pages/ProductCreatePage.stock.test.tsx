// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import Products from './Products';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
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
  fireEvent.change(screen.getByLabelText('New stock'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
}
function saveMetadata() { fireEvent.click(screen.getByRole('button', { name: /^(Publish updates|Publish product|Complete product)$/ })); }
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  product = { ...seed, id, name: 'Stock detail test', sku_code: 'STOCK-DETAIL-TEST', has_variants: false, product_type: 'single', inventory: { wh_crjp: 7, wh_rslsg: 3, wh_fbajp: 0 }, skus: [], channels: [], channel_overrides: {}, status: 'draft', inventory_adjustments: [], import_result: undefined, record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });
describe('stock adjustments without leaving Product Master', () => {
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
    fireEvent.change(screen.getByLabelText('New stock'), { target: { value: '18' } });
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
    cleanup(); mount();
    expect(screen.queryByRole('button', { name: 'Adjust stock at Fulfillment By Amazon Japan' })).not.toBeInTheDocument();
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
