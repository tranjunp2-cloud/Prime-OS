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
  // This fixture describes single-SKU sources; do not inherit child records from the demo seed.
  items = items.map(item => ({ ...item, variantItems: undefined }));
  saveCatalogImportItems(items);
  const onSaved = vi.fn();
  render(<ListingMasterReview listings={items} initialMode="new" onBack={vi.fn()} onSaved={onSaved} />);
  editListingSection('Product essentials');
  return onSaved;
}
const submit = () => { completeListingDetails(); if (screen.getByRole('button', { name: 'Create, activate & link' }).hasAttribute('disabled')) throw new Error(screen.getByRole('group', { name: 'Review actions' }).textContent ?? 'Activation unavailable'); confirmListingSave('Create, activate & link'); };
function editField(label: string) {
  applyListingSection();
  fireEvent.click(screen.getByRole('button', { name: `Edit Master ${label}` }));
}
function resultCell(label: string) {
  const row = screen.getByRole('rowheader', { name: new RegExp('^' + label) }).closest('tr')!;
  return row.querySelector('td:last-child')!;
}
function chooseCategory() {
  editField('Category');
  expect(screen.queryByRole('option', { name: 'Hidden category' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Master category'), { target: { value: 'draft-tools' } });
  applyListingSection();
}
describe('Draft creation fields from a shop listing', () => {
  it('prefills identity, catalog brand and source-currency price in the shared comparison layout', () => {
    const onSaved = mount();
    expect(screen.getByRole('textbox', { name: /^Product name/ })).toHaveValue(sources[0].title);
    expect(screen.getByRole('heading', { name: 'Review data for the new Master' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue to details' })).not.toBeInTheDocument();
    expect(resultCell('Brand')).toHaveTextContent('Catalog Brand');
    expect(resultCell('Single SKU')).toHaveTextContent('34 USD');
    expect(resultCell('Barcode')).toHaveTextContent('00123');
    expect(resultCell('Pack quantity')).toHaveTextContent('Not provided');
    chooseCategory();
    submit();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ brandId: 'draft-brand', brand: 'Catalog Brand', categoryId: 'draft-tools', category: 'Tools', retail_price: 34, price_currency: 'USD', model_number: 'M-12', gtin: '00123', mpn: 'P-12', inventory: {}, status: 'published' });
  });
  it('allows unassigned optional brand and category while retaining the valid source price', () => {
    const onSaved = mount();
    editField('Brand');
    fireEvent.change(screen.getByRole('combobox', { name: 'Brand' }), { target: { value: '' } });
    submit();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ brand: '', category: '', retail_price: 34, price_currency: 'USD' });
  });
  it('compares all selected sources and replaces starting price without currency conversion, retaining category and SKU', () => {
    const onSaved = mount(sources);
    chooseCategory();
    const sku = resultCell('Master SKU').textContent;
    const table = within(screen.getByRole('table', { name: 'Product identity comparison' }));
    expect(table.getByRole('columnheader', { name: /Shop a/ })).toBeVisible();
    expect(table.getByRole('columnheader', { name: /Shop b/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Edit Master price for/ }));
    fireEvent.change(screen.getByLabelText('Base price *'), { target: { value: '90' } });
    applyListingSection();
    fireEvent.change(screen.getByLabelText('Starting data from'), { target: { value: sources[1].id } });
    expect(screen.getByRole('alertdialog', { name: 'Replace the starting listing data?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(resultCell('Single SKU')).toHaveTextContent('90 USD');
    fireEvent.change(screen.getByLabelText('Starting data from'), { target: { value: sources[1].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Replace draft data' }));
    expect(resultCell('Title')).toHaveTextContent(sources[1].title);
    expect(resultCell('Master SKU').textContent).toBe(sku);
    expect(resultCell('Category')).toHaveTextContent('Tools');
    expect(resultCell('Single SKU')).toHaveTextContent('2,500 JPY');
    completeListingDetails();
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked/ }));
    confirmListingSave('Create, activate & link');
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.channels).toHaveLength(2);
    expect(product.retail_price).toBe(2500);
    expect(product.price_currency).toBe('JPY');
  });
  it('preserves a multiple-SKU listing and exposes variant configuration inside the table', () => {
    const onSaved = mount([{ ...sources[0], variants: 3 }]);
    editField('Product structure');
    expect(screen.getByRole('radio', { name: 'Single product' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'With variants' })).toBeChecked();
    expect(screen.getByRole('region', { name: 'Variant setup' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('keeps edits staged and rejects changed source data at final confirmation', () => {
    const onSaved = mount();
    chooseCategory();
    editField('Title');
    fireEvent.change(screen.getByRole('textbox', { name: /^Product name/ }), { target: { value: 'Refreshed source product' } });
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /^Product name/ })).toHaveValue('Refreshed source product');
    completeListingDetails();
    saveCatalogImportItems([{ ...sources[0], price: 900 }]);
    confirmListingSave('Create, activate & link');
    expect(screen.getByRole('alert')).toHaveTextContent(/Source listing data changed/);
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProducts()).toHaveLength(ids.size);
  });
  it('keeps unavailable catalogs optional and prevents activation with an invalid price', () => {
    saveProductCatalogSettings({ ...settings, categories: [], brands: [] });
    const onSaved = mount([{ ...sources[0], price: -1, currency: '' }]);
    editField('Category');
    expect(screen.getByLabelText('Master category').querySelectorAll('option')).toHaveLength(1);
    applyListingSection();
    expect(resultCell('Category')).toHaveTextContent('Not provided');
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('changes a field source and saves the reviewed proposal as a Draft without activating', () => {
    const onSaved = mount();
    const row = within(screen.getByRole('group', { name: 'Mapping for Product name' }));
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
