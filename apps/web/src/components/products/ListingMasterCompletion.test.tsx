// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingMasterReview } from './ListingMasterReview';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { editListingSection, applyListingSection, completeListingDetails, loadMasterImages } from '@/test/fixtures/complete-listing-details';
import { addProduct, deleteProduct, getProductById, getProducts, type Product } from '@/lib/product-store';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { getProductCatalogSettings } from '@/lib/product-catalog-settings-store';

let imports: CatalogImportItem[];
let originalIds: Set<string>;
let master: Product;
let source: CatalogImportItem;
beforeEach(() => {
  imports = getCatalogImportItems({ requireConfirmation: true });
  originalIds = new Set(getProducts().map(product => product.id));
  master = { ...getProducts()[0], ...readyMasterFields(), id: 'completion-ui', sku_code: 'COMPLETE-UI',
    name: 'Draft to complete', brand: 'Same Brand', description: '', has_variants: false, product_type: 'single',
    inventory: {}, status: 'draft', import_result: undefined, import_issues: [], channels: [], channel_overrides: {} };
  addProduct(master);
  source = { id: 'completion-ui-source', channel: 'amazon', listingId: 'completion-ui-listing', storeName: 'Test shop',
    title: 'Reviewed shop product', channelSku: master.sku_code, brand: master.brand, variants: 1,
    image: '/listing-front.jpg', images: readyMasterFields().images, channelCategory: '', channelStock: 100, price: 123,
    currency: 'JPY', status: 'suggested', confidence: 99, resolution: 'later', suggestedProductId: master.id };
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  getProducts().filter(product => !originalIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(imports);
});
function mount(mode: 'existing' | 'new' = 'existing') {
  saveCatalogImportItems([source]);
  const onSaved = vi.fn(); const onBack = vi.fn(); const onDirtyChange = vi.fn();
  render(<ListingMasterReview listings={[source]} initialMode={mode} onSaved={onSaved} onBack={onBack} onDirtyChange={onDirtyChange} />);
  return { onSaved, onBack, onDirtyChange };
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
describe('Required details inside the listing drawer', () => {
  it('shows ordered read-only values, with explicit Edit actions and visible missing details', () => {
    mount('new');
    const controls = screen.getAllByRole('button', { name: /^Edit / });
    expect(controls.map(button => button.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('Product essentials'), expect.stringContaining('Pricing'),
      expect.stringContaining('Category attributes'), expect.stringContaining('Description & images'),
      expect.stringContaining('Shipping package'), expect.stringContaining('Model, barcode & pack details'),
    ]);
    expect(screen.queryByRole('textbox', { name: 'Product name *' })).not.toBeInTheDocument();
    expect(screen.getByText(source.title, { selector: 'dd' })).toBeVisible();
    expect(screen.getByLabelText('Product description *')).not.toBeVisible();
    expect(screen.getByRole('region', { name: 'Description & images' })).toHaveTextContent('Write a detailed description');
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
  });
  it('edits a group locally, cancels cleanly and prevents saving an unapplied section', () => {
    const { onSaved, onDirtyChange } = mount('new');
    const before = structuredClone(getProducts());
    editListingSection('Product essentials');
    const input = screen.getByRole('textbox', { name: 'Product name *' });
    fireEvent.change(input, { target: { value: 'Unapplied product name' } });
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use existing Master' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Shipping package' })).toBeDisabled();
    expect(screen.getByText('Apply or cancel your section edits before saving this Master.')).toBeVisible();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    click('Cancel edits');
    expect(screen.queryByRole('textbox', { name: 'Product name *' })).not.toBeInTheDocument();
    expect(screen.queryByText('Unapplied product name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(getProducts()).toEqual(before);
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('applies a group to the visible proposal without creating or linking a Master', () => {
    const { onSaved } = mount('new');
    const before = structuredClone(getProducts());
    editListingSection('Product essentials');
    fireEvent.change(screen.getByRole('textbox', { name: 'Product name *' }), { target: { value: 'Reviewed name' } });
    applyListingSection();
    expect(screen.getByText('Reviewed name', { selector: 'dd' })).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Product essentials' })).getByText('Updated')).toBeVisible();
    editListingSection('Product essentials');
    expect(screen.getByRole('textbox', { name: 'Product name *' })).toHaveValue('Reviewed name');
    click('Cancel edits');
    expect(getProducts()).toEqual(before);
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('cancels a source correction and resets the field picker on the next edit', () => {
    source = { ...source, modelNumber: 'MODEL-123' };
    mount('new');
    editListingSection('Product essentials');
    click('Change source for Product name');
    const picker = within(screen.getByRole('region', { name: 'Choose source for Product name' }));
    fireEvent.change(picker.getByRole('textbox', { name: 'Search source fields' }), { target: { value: 'MODEL-123' } });
    fireEvent.click(picker.getByRole('radio'));
    click('Use this source');
    expect(screen.getByRole('textbox', { name: 'Product name *' })).toHaveValue('MODEL-123');
    click('Cancel edits');
    expect(screen.getByText(source.title, { selector: 'dd' })).toBeVisible();
    editListingSection('Product essentials');
    expect(screen.getByRole('textbox', { name: 'Product name *' })).toHaveValue(source.title);
    click('Change source for Product name');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search source fields' }), { target: { value: 'unfinished query' } });
    click('Cancel edits');
    editListingSection('Product essentials');
    expect(screen.queryByRole('region', { name: 'Choose source for Product name' })).not.toBeInTheDocument();
    click('Cancel edits');
  });
  it('restores SKU mappings and prices when a variant edit is cancelled', () => {
    source = { ...source, variants: 2, variantItems: [{ sku: 'RED', label: 'Red', price: { amount: 12, currency: 'JPY' } }, { sku: 'BLUE', label: 'Blue', price: { amount: 14, currency: 'JPY' } }] };
    mount('new');
    expect(screen.getAllByText('Suggested · review before creating')).toHaveLength(2);
    editListingSection('Variants, pricing & SKU mapping');
    const select = screen.getByLabelText('Master SKU for shop SKU 1');
    const original = (select as HTMLSelectElement).value;
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.change(screen.getAllByLabelText('Price (JPY)')[0], { target: { value: '900' } });
    click('Cancel edits');
    expect(screen.getAllByText('Suggested · review before creating')).toHaveLength(2);
    editListingSection('Variants, pricing & SKU mapping');
    expect(screen.getByLabelText('Master SKU for shop SKU 1')).toHaveValue(original);
    expect(screen.getAllByLabelText('Price (JPY)')[0]).toHaveValue(12);
  });
  it('warns before leaving an un-applied edit', () => {
    const { onBack } = mount('new');
    editListingSection('Product essentials');
    fireEvent.change(screen.getByRole('textbox', { name: 'Product name *' }), { target: { value: 'Still editing' } });
    click('Back to listings');
    expect(screen.getByRole('alertdialog', { name: 'Discard unsaved details?' })).toBeVisible();
    click('Keep editing');
    expect(screen.getByRole('textbox', { name: 'Product name *' })).toHaveValue('Still editing');
    expect(onBack).not.toHaveBeenCalled();
  });
  it('retains applied field edits and validates images in read mode', () => {
    mount('new');
    completeListingDetails();
    const description = screen.getByLabelText('Product description *');
    const value = (description as HTMLTextAreaElement).value;
    applyListingSection();
    expect(description).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeEnabled();
    fireEvent.error(screen.getByAltText('Master image 1'));
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    editListingSection('Description & images');
    expect(screen.getByLabelText('Product description *')).toBeVisible();
    expect(screen.getByLabelText('Product description *')).toHaveValue(value);
    expect(within(screen.getByRole('region', { name: 'Product images' })).getByRole('alert')).toHaveTextContent('Remove or replace unavailable images');
  });
  it('opens and focuses the first incomplete group from the summary', async () => {
    mount('new');
    completeListingDetails();
    editListingSection('Description & images');
    fireEvent.change(screen.getByLabelText('Product description *'), { target: { value: 'Too short' } });
    applyListingSection();
    click('Review missing details');
    const input = screen.getByLabelText('Product description *');
    await waitFor(() => expect(input.closest('[tabindex="-1"]')).toHaveFocus());
    expect(screen.getByLabelText('Product description *')).toBeVisible();
  });
  it('creates an Active Master with just one image automatically copied from the source listing', () => {
    source = { ...source, images: [] };
    const { onSaved } = mount('new');

    expect(screen.queryByRole('textbox', { name: 'Product description *' })).not.toBeInTheDocument();
    completeListingDetails();
    expect(within(screen.getByRole('region', { name: 'Description & images' })).getByText('1 image')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeEnabled();
    click('Create, activate & link');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ status: 'published', images: [source.image] });
  });
  it('requires an image again if the seller removes the only source image', () => {
    source = { ...source, images: [] };
    const { onSaved } = mount('new');
    completeListingDetails();
    editListingSection('Description & images');
    click('Remove image 1');
    expect(screen.getByText('0 images · 1 required · 9 max')).toBeVisible();
    expect(screen.getByText(/Add at least 1 product image to continue/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('links an incomplete existing Draft without opening completion or copying images', () => {
    const { onSaved } = mount();
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(screen.queryByRole('region', { name: 'Complete Product Master' })).not.toBeInTheDocument();
    expect(getProductById(master.id)).toMatchObject({ sku_code: master.sku_code, status: 'draft', description: '', images: master.images });
    expect(getProductById(master.id)?.channels).toHaveLength(1);
  });
  it('blocks broken images and confirms before discarding unsaved edits', () => {
    const { onBack, onSaved, onDirtyChange } = mount('new');
    completeListingDetails();
    editListingSection('Description & images');
    fireEvent.error(screen.getByRole('img', { name: 'Master image 4' }));
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Remove or replace unavailable images');
    click('Remove image 4'); applyListingSection();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeEnabled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    click('Back to listings');
    expect(screen.getByRole('alertdialog', { name: 'Discard unsaved details?' })).toBeVisible();
    expect(onBack).not.toHaveBeenCalled();
    click('Keep editing');
    expect(screen.getByLabelText('Product description *')).toHaveValue(readyMasterFields().description);
    click('Back to listings'); click('Discard & go back');
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProductById(master.id)).toMatchObject({ description: '', status: 'draft', channels: [] });
  });
  it('retains entered content and reports storage errors without confirming a link', () => {
    const { onSaved } = mount('new');
    completeListingDetails();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Storage full'); });
    click('Create, activate & link');
    expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
    expect(screen.getByLabelText('Product description *')).toHaveValue(readyMasterFields().description);
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProductById(master.id)).toMatchObject({ status: 'draft', channels: [] });
  });
  it('lets a seller configure real variants and map all source SKUs without leaving the drawer', () => {
    const attribute = getProductCatalogSettings().attributes.find(item => item.status === 'Active'
      && ['Single select', 'Multi-select'].includes(item.type) && item.options.split(',').filter(Boolean).length >= 2)!;
    const values = attribute.options.split(',').slice(0, 2).map(value => value.trim());
    source = { ...source, variants: 2, variantItems: values.map((label, index) => ({ sku: `SOURCE-${index}`, label })) };
    const { onSaved } = mount('new');
    completeListingDetails();
    editListingSection('Variants, pricing & SKU mapping');
    expect(screen.getAllByLabelText('Master variant SKU')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: attribute.key } });
    fireEvent.change(screen.getByLabelText('Values (comma separated)'), { target: { value: values.join(', ') } });
    screen.getAllByLabelText('Master variant SKU').forEach((input, index) => fireEvent.change(input, { target: { value: `UI-CHILD-${index}` } }));
    screen.getAllByLabelText('Option values (use / between options)').forEach((input, index) => fireEvent.change(input, { target: { value: values[index] } }));
    screen.getAllByLabelText('Price (JPY)').forEach(input => fireEvent.change(input, { target: { value: '100' } }));
    // Actual source identities are prefilled; a user can still revise each suggestion.
    values.forEach((_, index) => {
      const select = screen.getByLabelText(`Master SKU for shop SKU ${index + 1}`) as HTMLSelectElement;
      const option = Array.from(select.options).find(option => option.textContent?.startsWith(`UI-CHILD-${index}`))!;
      fireEvent.change(select, { target: { value: option.value } });
    });
    loadMasterImages(); applyListingSection();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeEnabled();
    click('Create, activate & link');
    expect(onSaved).toHaveBeenCalledOnce();
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.status).toBe('published');
    expect(product.skus).toHaveLength(2);
    expect(product.channels[0].variant_mappings?.map(row => row.shop_sku)).toEqual(['SOURCE-0', 'SOURCE-1']);
    expect(product.inventory).toEqual({});
  });
});
