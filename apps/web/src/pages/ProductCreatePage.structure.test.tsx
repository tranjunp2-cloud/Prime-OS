// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'product-structure-placement-test';
let product: Product;
async function mount(section = 'product-data', viewer = false) {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=${section}${viewer ? '&mode=viewer' : ''}`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
function seedVariants() {
  updateProduct(id, { id, has_variants: true, product_type: 'variant', variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Blue', 'Red'] }], skus: ['Blue', 'Red'].map((color, index) => ({
    id: `structure-${color}`, sku_code: `STRUCTURE-${color.toUpperCase()}`, variation_name: color, status: 'active', weight_g: 0, units_per_carton: 1, price: 100, stock_by_location: { wh_crjp: 5 + index },
  })) });
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  product = { ...getProducts()[0], id, name: 'Product structure fixture', sku_code: 'STRUCTURE-TEST', category: '', categoryId: undefined,
    description: '', retail_price: 100, has_variants: false, product_type: 'single', variant_options: [], skus: [],
    inventory: { wh_crjp: 8, wh_rslsg: 4 }, status: 'draft', import_source: undefined, import_sources: [], import_result: undefined,
    revisions: [], channel_overrides: {}, channels: [{ channel: 'shopee', external_id: 'structure-listing', status: 'active', listing_url: null, last_synced_at: null }], record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });

describe('Product structure workspace placement', () => {
  it('omits the structure summary from Product data and keeps the editor at the top of Pricing & Inventory', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    expect(document.getElementById('product-structure-summary')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage variants' })).not.toBeInTheDocument();
    expect(document.getElementById('product-section-pricing')).toHaveClass('hidden');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pricing & Inventory' }));
    expect(screen.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('commerce');
    expect(document.getElementById('product-section-pricing')).not.toHaveClass('hidden');
    expect(document.getElementById('product-structure-summary')).toBeNull();
    const editor = screen.getByRole('region', { name: 'Product structure' });
    expect(editor).toHaveTextContent('Single product · 1 SKU');
    expect(editor.parentElement?.firstElementChild).toBe(editor);
    expect(within(editor).getByRole('button', { name: 'Edit product structure' })).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('retains unsaved structure changes across tabs without adding a Product data summary or changing saved stock and links', async () => {
    await mount('commerce');
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(screen.getByRole('button', { name: 'Edit product structure' }));
    expect(screen.getByRole('radio', { name: 'Single product', exact: true })).toBeChecked();
    expect(screen.getByText('One sellable SKU. Stock can be held in multiple warehouses.')).toBeVisible();
    expect(screen.getByText(/Stock is already recorded/)).toHaveTextContent('1 linked listing may need SKU mapping reviewed');
    fireEvent.click(screen.getByRole('radio', { name: 'Product with variants', exact: true }));
    expect(screen.getByRole('heading', { name: 'Variants', exact: true })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Structure change not saved');
    fireEvent.click(screen.getByRole('button', { name: 'Hide product structure options' }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: 'product-data' } });
    expect(document.getElementById('product-structure-summary')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage variants' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: 'commerce' } });
    expect(screen.getByRole('region', { name: 'Product structure' })).toHaveTextContent('With variants · No SKUs configured');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('keeps the destructive confirmation and leaves variant stock and links unchanged when canceled', async () => {
    seedVariants();
    await mount('commerce');
    const before = JSON.stringify(getProductById(id));
    expect(screen.getByRole('region', { name: 'Product structure' })).toHaveTextContent('With variants · 2 SKUs');
    fireEvent.click(screen.getByRole('button', { name: 'Edit product structure' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Single product', exact: true }));
    const dialog = screen.getByRole('alertdialog', { name: 'Convert to non-variant product?' });
    expect(dialog).toHaveTextContent('2 variant SKUs in this setup');
    expect(dialog).toHaveTextContent('Stock will not be merged into the single SKU');
    expect(dialog).toHaveTextContent('1 linked listing');
    fireEvent.click(within(dialog).getByRole('button', { name: /Keep/ }));
    expect(screen.getByRole('radio', { name: 'Product with variants', exact: true })).toBeChecked();
    expect(screen.getByRole('table', { name: 'Variant pricing matrix' })).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('does not expose structure editing to a read-only viewer', async () => {
    await mount('commerce', true);
    expect(screen.getByRole('region', { name: 'Product structure' })).toHaveTextContent('Single product · 1 SKU');
    expect(screen.queryByRole('button', { name: 'Edit product structure' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
