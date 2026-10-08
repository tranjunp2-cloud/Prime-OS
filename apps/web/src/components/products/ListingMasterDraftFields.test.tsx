// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { editListingSection, applyListingSection, completeListingDetails, confirmListingSave } from '@/test/fixtures/complete-listing-details';
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
  editListingSection('Product essentials');
  return onSaved;
}
const submit = () => { completeListingDetails(); confirmListingSave('Create, activate & link'); };
function chooseCategory() {
  editListingSection('Product essentials');
  expect(screen.queryByRole('option', { name: 'Hidden category' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Master category'), { target: { value: 'draft-tools' } });
}

describe('Draft creation fields from a shop listing', () => {
  it('prefills identity, catalog brand and source-currency price for review', () => {
    const onSaved = mount();
    expect(screen.getByRole('textbox', { name: /^Product name/ })).toHaveValue(sources[0].title);
    expect(screen.getByText('Product essentials')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue to details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to review' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Brand' })).toHaveValue('draft-brand');
    expect(screen.getByLabelText('Base price *')).toHaveValue(34);
    expect(screen.getByLabelText('Currency *')).toHaveValue('USD');
    chooseCategory();
    editListingSection('Model, barcode & pack details');
    expect(screen.getByLabelText('Barcode (GTIN)')).toHaveValue('00123');
    expect(screen.getByLabelText('Pack quantity')).toHaveValue(null);
    submit();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ brandId: 'draft-brand', brand: 'Catalog Brand', categoryId: 'draft-tools', category: 'Tools', retail_price: 34, price_currency: 'USD', model_number: 'M-12', gtin: '00123', mpn: 'P-12', inventory: {}, status: 'published' });
  });
  it('allows an unassigned optional brand but requires category and price before activation', () => {
    const onSaved = mount();
    fireEvent.change(screen.getByRole('combobox', { name: 'Brand' }), { target: { value: '' } });
    submit();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ brand: '', category: 'Art', retail_price: 34, price_currency: 'USD' });
  });
  it('prefills the newly chosen source price without currency conversion, retaining category and SKU', () => {
    const onSaved = mount(sources);
    chooseCategory();
    const sku = (screen.getByRole('textbox', { name: 'Master SKU' }) as HTMLInputElement).value;
    editListingSection('Pricing');
    fireEvent.change(screen.getByLabelText('Base price *'), { target: { value: '90' } });
    applyListingSection();
    fireEvent.change(screen.getByLabelText('Starting data from'), { target: { value: sources[1].id } });
    expect(screen.getByRole('alertdialog', { name: 'Replace the starting listing data?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Base price *')).toHaveValue(90);
    fireEvent.change(screen.getByLabelText('Starting data from'), { target: { value: sources[1].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Replace draft data' }));
    expect(screen.getByRole('group', { name: 'Source listing' })).toHaveTextContent('Shop b');
    editListingSection('Product essentials');
    expect(screen.getByRole('textbox', { name: /^Product name/ })).toHaveValue(sources[1].title);
    expect(screen.getByRole('textbox', { name: 'Master SKU' })).toHaveValue(sku);
    expect(screen.getByLabelText('Master category')).toHaveValue('draft-tools');
    expect(screen.getByRole('combobox', { name: 'Brand' })).toHaveValue('');
    expect(screen.getByLabelText('Base price *')).toHaveValue(2500);
    expect(screen.getByLabelText('Currency *')).toHaveValue('JPY');
    expect(screen.getByRole('radio', { name: 'With variants' })).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked/ }));
    submit();
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.channels).toHaveLength(2);
    expect(product.retail_price).toBe(2500);
  });
  it('preserves a multiple-SKU listing as a variant draft with pending child SKU setup', () => {
    const onSaved = mount([{ ...sources[0], variants: 3 }]);
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'With variants' })).toBeChecked();
    expect(screen.getByText(/3 shop SKUs detected/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Variant setup' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('blocks unavailable categories, preserves the form and rejects changed source data at final confirmation', () => {
    const onSaved = mount();
    chooseCategory();
    saveProductCatalogSettings({ ...settings, categories: [] });
    fireEvent.change(screen.getByRole('textbox', { name: /^Product name/ }), { target: { value: 'Edited while catalog unavailable' } });
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByLabelText('Master category')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /^Product name/ })).toHaveValue('Edited while catalog unavailable');
    saveProductCatalogSettings(settings);
    fireEvent.change(screen.getByRole('textbox', { name: /^Product name/ }), { target: { value: 'Refreshed source product' } });
    chooseCategory();
    completeListingDetails();
    saveCatalogImportItems([{ ...sources[0], price: 900 }]);
    confirmListingSave('Create, activate & link');
    expect(screen.getByRole('alert')).toHaveTextContent(/Source listing data changed/);
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProducts()).toHaveLength(ids.size);
  });

  it('explains unavailable catalogs and prevents incomplete activation', () => {
    saveProductCatalogSettings({ ...settings, categories: [], brands: [] });
    const onSaved = mount([{ ...sources[0], price: -1, currency: '' }]);
    expect(screen.getByText(/No active categories\./)).toBeVisible();
    expect(screen.getByLabelText('Base price *')).toHaveValue(0);
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('changes a field source immediately and saves the reviewed proposal as a Draft without activating', () => {
    const onSaved = mount();
    const row = within(screen.getByRole('group', { name: 'Mapping for Product name' }));
    expect(row.getByText(/Listing title/)).toBeVisible();
    fireEvent.click(row.getByRole('button', { name: 'Change source for Product name' }));
    fireEvent.change(row.getByRole('textbox', { name: 'Search source fields' }), { target: { value: 'M-12' } });
    fireEvent.click(row.getByRole('radio'));
    fireEvent.click(row.getByRole('button', { name: 'Use this source' }));
    expect(row.getByRole('textbox', { name: /^Product name/ })).toHaveValue('M-12');
    expect(getProducts()).toHaveLength(ids.size);
    applyListingSection();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft & link' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save draft & link' }));
    const saved = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(saved).toMatchObject({ name: 'M-12', status: 'draft', field_mappings: { name: { mode: 'source', source: { fieldKey: 'modelNumber' } } } });
    expect(saved.channels[0].master_data_sync).toBeUndefined();
    expect(saved.channels[0].shop_snapshot?.title).toBe(sources[0].title);
  });
});
