// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Products from './Products';
import ProductCreatePage from './ProductCreatePage';
import { deleteProduct, getProducts } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const originalSettings = getProductCatalogSettings();
const testSku = 'MANUAL-CATEGORY-TEST';
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
  saveProductCatalogSettings(originalSettings);
});
afterEach(() => {
  cleanup();
  getProducts().filter(product => product.sku_code === testSku).forEach(product => deleteProduct(product.id));
  saveProductCatalogSettings(originalSettings);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Manual Product Master creation', () => {
  it.each(['Single product', 'With variants'])('persists category and loads its attributes in the %s editor without publishing', async structure => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Routes>
      <Route path="/products/master-catalog" element={<Products />} />
      <Route path="/products/:id/edit" element={<ProductCreatePage />} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Create Product Master' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Create Product Master draft' }));
    fireEvent.click(dialog.getByRole('radio', { name: new RegExp(`^${structure}`) }));
    fireEvent.change(dialog.getByLabelText(/Master SKU/), { target: { value: testSku } });
    fireEvent.change(dialog.getByLabelText(/Product name/), { target: { value: 'Manual category product' } });
    fireEvent.click(dialog.getByRole('combobox', { name: /Category/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Search categories' }), { target: { value: 'Art Supplies' } });
    fireEvent.click(screen.getByRole('option', { name: 'Office & Creative / Stationery / Art Supplies' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Create draft & continue' }));

    const product = getProducts().find(item => item.sku_code === testSku)!;
    expect(product).toMatchObject({ category: 'Art Supplies', categoryId: 'art-supplies', status: 'draft', product_type: structure === 'Single product' ? 'single' : 'variant', has_variants: structure === 'With variants', channels: [] });
    fireEvent.click(await screen.findByRole('button', { name: /^Product dataIdentity, content and media$/ }));
    expect(document.getElementById('product-category-trigger')).toHaveTextContent('Art Supplies');
    expect(screen.getByText('Office & Creative / Stationery / Art Supplies')).toBeVisible();
    expect(screen.getAllByText('Material', { exact: true }).length).toBeGreaterThan(0);
  });
});
