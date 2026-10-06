// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { completeListingDetails } from '@/test/fixtures/complete-listing-details';
import { ListingMasterReview } from './ListingMasterReview';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { deleteProduct, getProductById, getProducts } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';

const initialSettings = getProductCatalogSettings();
const settings = { ...initialSettings,
  categories: [
    { ...initialSettings.categories[0], id: 'draft-art', name: 'Art', parentId: null, status: 'Active' as const },
    { ...initialSettings.categories[0], id: 'draft-tools', name: 'Tools', parentId: 'draft-art', status: 'Active' as const },
    { ...initialSettings.categories[0], id: 'draft-hidden', name: 'Hidden category', status: 'Inactive' as const },
  ],
  brands: [{ ...initialSettings.brands[0], id: 'draft-brand', name: 'Catalog Brand', aliases: ['Shop Brand'], status: 'Active' as const }],
};
let original: CatalogImportItem[];
let ids: Set<string>;
let sources: CatalogImportItem[];
beforeEach(() => {
  original = getCatalogImportItems({ requireConfirmation: true });
  ids = new Set(getProducts().map(product => product.id));
  saveProductCatalogSettings(settings);
  sources = ['a', 'b'].map(id => ({ ...original[0], images: readyMasterFields().images, description: readyMasterFields().description, id: `draft-fields-${id}`, listingId: `draft-fields-${id}`, storeName: `Shop ${id}`, title: `Brush 12 pieces ${id}`, channelSku: `FIELDS-${id}`, brand: id === 'a' ? 'Shop Brand' : 'Unknown brand', price: id === 'a' ? 34 : 2500, currency: id === 'a' ? 'USD' : 'JPY', variants: 1, gtin: '00123', modelNumber: 'M-12', mpn: 'P-12', packQuantity: undefined, suggestedProductId: undefined, resolvedProductId: undefined, confirmed: false, resolution: 'later', status: 'unmatched' }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  getProducts().filter(product => !ids.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(original); saveProductCatalogSettings(initialSettings);
});
function mount(items = sources.slice(0, 1)) {
  saveCatalogImportItems(items);
  const onSaved = vi.fn();
  render(<ListingMasterReview listings={items} initialMode="new" onBack={vi.fn()} onSaved={onSaved} />);
  return onSaved;
}
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continue to details' }));
const submit = () => { next(); completeListingDetails(); fireEvent.click(screen.getByRole('button', { name: 'Create & activate Master' })); };
function chooseCategory() {
  fireEvent.click(screen.getByRole('combobox', { name: /Category/ }));
  expect(screen.queryByRole('option', { name: 'Hidden category' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Search category' }), { target: { value: 'Tools' } });
  fireEvent.click(screen.getByRole('option', { name: 'Art / Tools' }));
}

describe('Draft creation fields from a shop listing', () => {
  it('prefills identity and catalog brand, supports category search, and only copies price on explicit choice', () => {
    const onSaved = mount();
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue(sources[0].title);
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: /Brand/ })).toHaveTextContent('Catalog Brand');
    expect(screen.getByText('Base price not set')).toBeVisible();
    chooseCategory();
    fireEvent.click(screen.getByText('Data from this listing'));
    expect(screen.getByText('Shop price: 34 USD')).toBeVisible();
    expect(screen.getByText('00123')).toBeVisible();
    expect(screen.getByText('Not provided — left blank')).toBeVisible();
    const price = screen.getByRole('checkbox', { name: 'Use this shop price as Master base price' });
    expect(price).not.toBeChecked();
    fireEvent.click(price);
    submit();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ brandId: 'draft-brand', brand: 'Catalog Brand', categoryId: 'draft-tools', category: 'Tools', retail_price: 34, price_currency: 'USD', model_number: 'M-12', gtin: '00123', mpn: 'P-12', inventory: {}, status: 'published' });
  });
  it('allows an unassigned optional brand but requires category and price before activation', () => {
    const onSaved = mount();
    fireEvent.click(screen.getByRole('combobox', { name: /Brand/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Assign later' }));
    submit();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ brand: '', category: 'Art', retail_price: 123 });
  });
  it('resets source-dependent values and price consent when changing the data source, but retains chosen category and SKU', () => {
    const onSaved = mount(sources);
    chooseCategory();
    const sku = (screen.getByRole('textbox', { name: 'Master SKU' }) as HTMLInputElement).value;
    fireEvent.click(screen.getByText('Data from this listing'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use this shop price as Master base price' }));
    fireEvent.change(screen.getByLabelText('Use product data from'), { target: { value: sources[1].id } });
    expect(screen.getByRole('group', { name: 'Source listing' })).toHaveTextContent('Shop b');
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue(sources[1].title);
    expect(screen.getByRole('textbox', { name: 'Master SKU' })).toHaveValue(sku);
    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveTextContent('Art / Tools');
    expect(screen.getByRole('combobox', { name: /Brand/ })).toHaveTextContent('Select brand');
    fireEvent.click(screen.getByText('Data from this listing'));
    expect(screen.getByText('Shop price: 2,500 JPY')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Use this shop price as Master base price' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'With variants' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked/ }));
    submit();
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.channels).toHaveLength(2);
    expect(product.retail_price).toBe(123);
  });
  it('preserves a multiple-SKU listing as a variant draft with pending child SKU setup', () => {
    const onSaved = mount([{ ...sources[0], variants: 3 }]);
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'With variants' })).toBeChecked();
    expect(screen.getByText(/3 shop SKUs detected/)).toBeVisible();
    next();
    expect(screen.getByRole('region', { name: 'Variant setup' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('blocks unavailable categories, preserves the form and rejects changed source data at final confirmation', () => {
    const onSaved = mount();
    chooseCategory();
    saveProductCatalogSettings({ ...settings, categories: [] });
    next();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
    expect(screen.getByLabelText('Master category *')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue(sources[0].title);
    saveProductCatalogSettings(settings);
    fireEvent.change(screen.getByRole('textbox', { name: 'Product name' }), { target: { value: 'Refreshed source product' } });
    chooseCategory();
    next(); completeListingDetails();
    saveCatalogImportItems([{ ...sources[0], price: 900 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Create & activate Master' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Source listing data changed/);
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProducts()).toHaveLength(ids.size);
  });

  it('explains unavailable catalogs and prevents incomplete activation', () => {
    saveProductCatalogSettings({ ...settings, categories: [], brands: [] });
    const onSaved = mount([{ ...sources[0], price: -1, currency: '' }]);
    expect(screen.getByText(/No active categories\./)).toBeVisible();
    fireEvent.click(screen.getByText('Data from this listing'));
    expect(screen.getByRole('checkbox', { name: 'Use this shop price as Master base price' })).toBeDisabled();
    next();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
