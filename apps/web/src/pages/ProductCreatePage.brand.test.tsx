// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'brand-availability-test';
const seed = getProducts().find(product => !product.has_variants)!;
let product: Product;

async function mount(section = 'product-data') {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=${section}`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}

function openBrandCreation() {
  fireEvent.click(screen.getByRole('combobox', { name: 'Brand', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Create new brand' }));
  return within(screen.getByRole('dialog', { name: 'New brand' }));
}

beforeEach(() => {
  localStorage.removeItem('prime-product-catalog-settings-v2');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  toastMock.mockClear();
  product = {
    ...seed, id, name: 'Brand availability test', sku_code: 'BRAND-AVAILABILITY-TEST',
    brand: '', brandId: undefined, category: 'Books', categoryId: 'books',
    description: 'A detailed product description with all the information needed for this product. '.repeat(3),
    images: ['/test-image-1.png', '/test-image-2.png', '/test-image-3.png'],
    retail_price: 100, inventory: { wh_crjp: 20 }, has_variants: false, product_type: 'single',
    skus: [], channels: [], channel_overrides: { pos: { enabled: true, title: '', description: '', price_markup: 0 } },
    status: 'draft', import_result: undefined, import_issues: [], revisions: [], record_version: 1,
  };
  addProduct(product);
});

afterEach(() => {
  cleanup();
  deleteProduct(id);
  localStorage.removeItem('prime-product-catalog-settings-v2');
  vi.restoreAllMocks();
});

describe('brands are immediately available to Product Master', () => {
  it('uses the Rakuten suggestion for an empty listing and saves edits only to that listing', async () => {
    const settings = getProductCatalogSettings();
    const brand = { ...settings.brands[0], mappings: { ...settings.brands[0].mappings, rakuten: 'サイバーレコード' } };
    saveProductCatalogSettings({ ...settings, brands: settings.brands.map(item => item.id === brand.id ? brand : item) });
    updateProduct(id, { id, brand: brand.name, brandId: brand.id, import_sources: [], channel_overrides: { rakuten: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'RKT-BRAND-TEST' } } });
    await mount('distribution');
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    const drawer = within(screen.getByRole('dialog', { name: 'Rakuten listing' }));
    fireEvent.click(drawer.getByRole('button', { name: /Channel requirements/ }));
    expect(drawer.getByLabelText('Rakuten brand name')).toHaveValue('サイバーレコード');
    expect(getProductById(id)?.channel_overrides?.rakuten?.brand).toBeUndefined();
    fireEvent.change(drawer.getByLabelText('Rakuten brand name'), { target: { value: 'Listing-only brand name' } });
    fireEvent.click(drawer.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)?.channel_overrides?.rakuten?.brand).toBe('Listing-only brand name');
    expect(getProductById(id)).toMatchObject({ brand: brand.name, brandId: brand.id });
    expect(getProductCatalogSettings().brands.find(item => item.id === brand.id)?.mappings.rakuten).toBe('サイバーレコード');
    cleanup();
    await mount('distribution');
    fireEvent.click(screen.getByRole('button', { name: 'Manage listing' }));
    const reopened = within(screen.getByRole('dialog', { name: 'Rakuten listing' }));
    fireEvent.click(reopened.getByRole('button', { name: /Channel requirements/ }));
    expect(reopened.getByLabelText('Rakuten brand name')).toHaveValue('Listing-only brand name');
  });

  it('creates and selects an Active brand, then allows the publish review without verification', async () => {
    await mount();
    const dialog = openBrandCreation();
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: 'Immediate Brand' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save', exact: true }));

    const brand = getProductCatalogSettings().brands.find(item => item.name === 'Immediate Brand')!;
    expect(brand).toMatchObject({ status: 'Active', source: 'internal', mappings: {} });
    expect(screen.getByRole('combobox', { name: 'Brand', exact: true })).toHaveTextContent('Immediate Brand');
    expect(screen.queryByText(/Candidate|unverified|verify before publishing/i)).not.toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Brand created' }));
    expect(toastMock.mock.calls.some(([toast]) => toast.variant === 'destructive')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Publish product', exact: true }));
    expect(await screen.findByRole('dialog', { name: 'Publish this Product revision?' })).toBeInTheDocument();
    expect(getProductById(id)).toMatchObject({ brandId: brand.id, brand: brand.name, status: 'draft' });
  });

  it('retains name, duplicate and optional website validation', async () => {
    await mount();
    const dialog = openBrandCreation();
    const save = dialog.getByRole('button', { name: 'Save', exact: true });
    expect(save).toBeDisabled();
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: '  kuretake  ' } });
    expect(dialog.getByText('This Brand already exists. Select it from the list instead.')).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: 'Valid New Brand' } });
    fireEvent.change(dialog.getByLabelText('Website'), { target: { value: 'invalid-url' } });
    expect(save).toBeDisabled();
    fireEvent.change(dialog.getByLabelText('Website'), { target: { value: '' } });
    expect(save).toBeEnabled();
  });

  it('allows a previously Unverified brand to pass readiness while preserving its mapping', async () => {
    const settings = getProductCatalogSettings();
    const brand = { ...settings.brands[0], status: 'Unverified' };
    localStorage.setItem('prime-product-catalog-settings-v2', JSON.stringify({ ...settings, brands: [brand] }));
    updateProduct(id, { id, brand: brand.name, brandId: brand.id });
    await mount('distribution');

    expect(screen.getByRole('button', { name: 'Publish product', exact: true })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Link another channel' })).toBeEnabled();
    expect(screen.queryByText(/unverified|verify before publishing/i)).not.toBeInTheDocument();
    expect(getProductCatalogSettings().brands[0].mappings).toEqual(brand.mappings);
  });

  it('still blocks publish and channel linking for missing product data', async () => {
    const brand = getProductCatalogSettings().brands[0];
    updateProduct(id, { id, brand: brand.name, brandId: brand.id, images: [] });
    await mount('distribution');

    expect(screen.getByRole('button', { name: 'Complete product', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link another channel' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Link another channel' }));
    expect(screen.queryByRole('dialog', { name: 'Link sales channels' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Add at least 3 product images/).length).toBeGreaterThan(0);
  });

  it('does not offer inactive brands in the picker', async () => {
    const settings = getProductCatalogSettings();
    const brand = { ...settings.brands[0], status: 'Inactive' as const };
    saveProductCatalogSettings({ ...settings, brands: [brand] });
    await mount();
    fireEvent.click(screen.getByRole('combobox', { name: 'Brand', exact: true }));
    expect(screen.getByText('No matching brand found.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create new brand' }));
    const dialog = within(screen.getByRole('dialog', { name: 'New brand' }));
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: brand.name } });
    expect(dialog.getByText('This brand is inactive. Reactivate it in Brands instead of creating a duplicate.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  });
});
