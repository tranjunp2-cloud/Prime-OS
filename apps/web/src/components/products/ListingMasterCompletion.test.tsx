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
function confirmDraftLink() {
  click('Save draft & link');
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save draft & link' }));
}
const masterCell = (field: string) => within(screen.getByRole('rowheader', { name: new RegExp('^' + field) }).closest('tr')!).getAllByRole('cell').at(-1)!;
describe('Required details inside the listing drawer', () => {
  it('keeps a Master without image and warehouse as Draft while retaining separate channel requirements', () => {
    source = { ...source, image: '', images: [], description: 'A short, valid description.', channelCategory: 'Paper',
      requirements: { channel: 'amazon', category: 'Paper', revision: 'test-v1', origin: 'prototype', fields: [{ key: 'channel_settings.attribute_material', label: 'Material', kind: 'text' }] } };
    const { onSaved } = mount('new');
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    expect(screen.getByRole('region', { name: 'Listing sync readiness' })).toHaveTextContent('Missing: Material. Only this listing’s sync is blocked.');
    confirmDraftLink();
    const saved = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(saved).toMatchObject({ status: 'draft', category: '', images: [] });
    expect(saved.channels[0].master_data_sync?.enabled).not.toBe(true);
  });
  it('completes channel fields inline without changing Master attributes or the shop snapshot', () => {
    source = { ...source, description: 'A short, valid description.', channelCategory: 'Paper',
      requirements: { channel: 'amazon', category: 'Paper', revision: 'test-v1', origin: 'prototype', fields: [{ key: 'channel_settings.attribute_material', label: 'Material', kind: 'text' }] } };
    const { onSaved } = mount('new');
    const readiness = within(screen.getByRole('region', { name: 'Listing sync readiness' }));
    fireEvent.click(readiness.getByRole('button', { name: 'Complete' }));
    fireEvent.change(readiness.getByLabelText('Material *'), { target: { value: 'Cotton paper' } });
    expect(readiness.getByText('Data ready after confirmation')).toBeVisible();
    confirmDraftLink();
    const saved = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(saved.channels[0].local_draft?.values.channel_settings?.attribute_material).toBe('Cotton paper');
    expect(saved.channels[0].shop_snapshot?.channel_settings).toBeUndefined();
    expect(saved.specifications ?? []).toEqual([]);
  });
  it('previews changes without saving and keeps the proposal when returning from the final summary', () => {
    const { onSaved } = mount('new');
    completeListingDetails();
    const before = structuredClone(getProducts());
    click('Save draft & link');
    const summary = within(screen.getByRole('alertdialog', { name: 'Save a draft Master and link these listings?' }));
    expect(summary.getByText(/The new Master stays Draft/)).toBeVisible();
    expect(summary.getByText(/No shop data is changed/)).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProducts()).toEqual(before);
    fireEvent.click(summary.getByRole('button', { name: 'Keep reviewing' }));
    expect(screen.queryByRole('alertdialog', { name: 'Save a draft Master and link these listings?' })).not.toBeInTheDocument();
    expect(within(masterCell('Title')).getByText(source.title)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    confirmDraftLink();
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it('shows source-to-Master field rows, core fields first, with inline edits and visible missing data', () => {
    mount('new');
    const table = within(screen.getByRole('table', { name: 'Product identity comparison' }));
    expect(table.getByRole('columnheader', { name: /Test shop/ })).toBeVisible();
    expect(table.getByRole('columnheader', { name: /New Master · value to create/ })).toBeVisible();
    expect(table.getAllByRole('rowheader').slice(0, 3).map(cell => cell.textContent)).toEqual(['TitleRequired', 'Master SKURequired', 'DescriptionRequired']);
    expect(screen.queryByRole('textbox', { name: 'Product name *' })).not.toBeInTheDocument();
    expect(masterCell('Title')).toHaveTextContent(source.title);
    expect(screen.queryByLabelText('Product description *')).not.toBeInTheDocument();
    expect(masterCell('Description')).toHaveTextContent('Master data missing');
    expect(screen.queryByText('Keep current Master value')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Edit Master Package weight (g)' })).toBeDisabled();
    expect(screen.getByText('Apply or cancel your edits before saving this Master.')).toBeVisible();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    click('Cancel edit');
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
    expect(within(masterCell('Title')).getByText('Reviewed name')).toBeVisible();
    expect(masterCell('Title')).toHaveTextContent('Edited in this review · Not saved');
    editListingSection('Product essentials');
    expect(screen.getByRole('textbox', { name: 'Product name *' })).toHaveValue('Reviewed name');
    click('Cancel edit');
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
    click('Cancel edit');
    expect(within(masterCell('Title')).getByText(source.title)).toBeVisible();
    editListingSection('Product essentials');
    expect(screen.getByRole('textbox', { name: 'Product name *' })).toHaveValue(source.title);
    click('Change source for Product name');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search source fields' }), { target: { value: 'unfinished query' } });
    click('Cancel edit');
    editListingSection('Product essentials');
    expect(screen.queryByRole('region', { name: 'Choose source for Product name' })).not.toBeInTheDocument();
    click('Cancel edit');
  });
  it('restores SKU mappings and prices when a variant edit is cancelled', () => {
    source = { ...source, variants: 2, variantItems: [{ sku: 'RED', label: 'Red', price: { amount: 12, currency: 'JPY' } }, { sku: 'BLUE', label: 'Blue', price: { amount: 14, currency: 'JPY' } }] };
    mount('new');
    expect(screen.getAllByText('Suggested pair')).toHaveLength(2);
    editListingSection('Variants, pricing & SKU mapping');
    const select = screen.getByLabelText('Master SKU for shop SKU 1');
    const original = (select as HTMLSelectElement).value;
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.change(screen.getAllByLabelText('Price (JPY)')[0], { target: { value: '900' } });
    click('Cancel edit');
    expect(screen.getAllByText('Suggested pair')).toHaveLength(2);
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
  it('retains applied field edits and warns about unavailable images in the inline image editor', () => {
    mount('new');
    completeListingDetails();
    expect(masterCell('Description')).toHaveTextContent(readyMasterFields().description);
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    click('Edit Master Images');
    fireEvent.error(screen.getByAltText('Master image 1'));
    expect(within(screen.getByRole('region', { name: 'Product images' })).getByRole('alert')).toHaveTextContent('Master activation is not blocked');
    applyListingSection();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    editListingSection('Description & images');
    expect(screen.getByLabelText('Product description *')).toHaveValue(readyMasterFields().description);
  });
  it('keeps incomplete data as a proposal and focuses a missing field directly from the table', async () => {
    mount('new');
    completeListingDetails();
    editListingSection('Description & images');
    fireEvent.change(screen.getByLabelText('Product description *'), { target: { value: '' } });
    applyListingSection();
    expect(masterCell('Description')).toHaveTextContent('Master data missing');
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    click('Edit Master Description');
    await waitFor(() => expect(screen.getByLabelText('Product description *')).toHaveFocus());
  });
  it('copies the source image but keeps a new Master Draft until a warehouse is assigned', () => {
    source = { ...source, images: [] };
    const { onSaved } = mount('new');

    expect(screen.queryByRole('textbox', { name: 'Product description *' })).not.toBeInTheDocument();
    completeListingDetails();
    expect(masterCell('Images')).toHaveTextContent('1 image');
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    confirmDraftLink();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ status: 'draft', images: [source.image] });
  });
  it('cannot activate without images after applying image edits', () => {
    source = { ...source, images: [] };
    const { onSaved } = mount('new');
    completeListingDetails();
    click('Edit Master Images');
    click('Remove image 1');
    expect(screen.getByText('0 images · 1 required · 9 max')).toBeVisible();
    expect(screen.getByText(/At least 1 product image is required to activate Master/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    applyListingSection();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
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
  it('warns about broken images and confirms before discarding unsaved edits', () => {
    const { onBack, onSaved, onDirtyChange } = mount('new');
    completeListingDetails();
    click('Edit Master Images');
    fireEvent.error(screen.getByRole('img', { name: 'Master image 4' }));
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Master activation is not blocked');
    click('Remove image 4'); applyListingSection();
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    click('Back to listings');
    expect(screen.getByRole('alertdialog', { name: 'Discard unsaved details?' })).toBeVisible();
    expect(onBack).not.toHaveBeenCalled();
    click('Keep editing');
    expect(masterCell('Description')).toHaveTextContent(readyMasterFields().description);
    click('Back to listings'); click('Discard & go back');
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProductById(master.id)).toMatchObject({ description: '', status: 'draft', channels: [] });
  });
  it('retains entered content and reports storage errors without confirming a link', () => {
    const { onSaved } = mount('new');
    completeListingDetails();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Storage full'); });
    confirmDraftLink();
    expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
    expect(masterCell('Description')).toHaveTextContent(readyMasterFields().description);
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
    expect(screen.getByRole('button', { name: 'Create, activate & link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft & link' })).toBeEnabled();
    confirmDraftLink();
    expect(onSaved).toHaveBeenCalledOnce();
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.status).toBe('draft');
    expect(product.skus).toHaveLength(2);
    expect(product.channels[0].variant_mappings).toBeUndefined();
    expect(product.channels[0].review_pending?.sku_mapping_pending).toBe(false);
    expect(product.channels[0].review_pending?.draft_mappings).toHaveLength(2);
    expect(product.channels[0].review_pending?.issues).toContain('Assign at least 1 warehouse');
    expect(product.inventory).toEqual({});
  });
});
