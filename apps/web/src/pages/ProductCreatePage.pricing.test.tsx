// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, type Product } from '@/lib/product-store';
import { PRICING_STORAGE_KEY } from '@/lib/pricing-rules';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
const id = 'pricing-master-integration';
let product: Product;
async function mount() {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=distribution`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
function openPricing() {
  fireEvent.click(screen.getByRole('button', { name: 'Continue setup' }));
  const drawer = within(screen.getByRole('dialog', { name: 'Shopee listing' }));
  fireEvent.click(drawer.getByRole('button', { name: /Price & inventory/ }));
  return drawer;
}
beforeEach(() => {
  localStorage.removeItem(PRICING_STORAGE_KEY);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  product = { ...getProducts().find(item => !item.has_variants)!, id, name: 'Pricing integration', sku_code: 'PRICING-INTEGRATION', has_variants: false, product_type: 'single', retail_price: 1000, price_currency: 'JPY', inventory: { wh_crjp: 20 }, skus: [], channels: [], import_sources: [], import_result: undefined, status: 'draft', revisions: [], price_policies: [], channel_overrides: { shopee: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'SHO-PRICE', channel_price: 250000, channel_currency: 'VND', pricing_source: 'manual', manual_price: '250000' } } };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); localStorage.removeItem(PRICING_STORAGE_KEY); vi.restoreAllMocks(); });
describe('Master and listing pricing integration', () => {
  it('removes cross-currency configuration from Master and uses the actual saved listing price', async () => {
    await mount();
    expect(screen.queryByText('Cross-currency policies')).not.toBeInTheDocument();
    expect(screen.getByText('250,000 VND')).toBeInTheDocument();
    expect(screen.queryByText('350,000 VND')).not.toBeInTheDocument();
  });
  it('saves pending price input without a separate confirmation, survives remount, and preserves Master data', async () => {
    await mount();
    const drawer = openPricing();
    fireEvent.change(drawer.getByLabelText('Manual price (VND)'), { target: { value: '260000' } });
    expect(drawer.queryByRole('button', { name: 'Confirm listing price' })).not.toBeInTheDocument();
    fireEvent.click(drawer.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.channel_overrides?.shopee).toMatchObject({ channel_price: 250000, manual_price: '260000', channel_currency: 'VND', pricing_source: 'manual' });
    expect(getProductById(id)).toMatchObject({ name: product.name, retail_price: 1000, price_currency: 'JPY', inventory: { wh_crjp: 20 } });
    fireEvent.click(drawer.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    cleanup(); await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    const reopened = within(screen.getByRole('dialog', { name: 'Manage listing' }));
    fireEvent.click(reopened.getByRole('tab', { name: 'Price & stock' }));
    expect(reopened.getByLabelText('Listing price')).toHaveValue(260000);
  });
  it('does not save pending Master edits when saving a listing', async () => {
    await mount();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved Master name' } });
    const drawer = openPricing();
    fireEvent.change(drawer.getByLabelText('Manual price (VND)'), { target: { value: '260000' } });
    fireEvent.click(drawer.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.name).toBe(product.name);
    fireEvent.click(drawer.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.getByDisplayValue('Unsaved Master name')).toBeInTheDocument();
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  });
});
