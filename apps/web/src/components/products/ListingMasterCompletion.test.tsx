// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingMasterReview } from './ListingMasterReview';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { completeListingDetails, loadMasterImages } from '@/test/fixtures/complete-listing-details';
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
  it('creates an Active Master with just one image automatically copied from the source listing', () => {
    source = { ...source, images: [] };
    const { onSaved } = mount('new');
    click('Continue to details');
    expect(screen.getByText('1 image · 1 required · 9 max')).toBeVisible();
    completeListingDetails();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeEnabled();
    click('Create & activate Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(onSaved.mock.calls[0][0].productId)).toMatchObject({ status: 'published', images: [source.image] });
  });
  it('requires an image again if the seller removes the only source image', () => {
    source = { ...source, images: [] };
    const { onSaved } = mount('new');
    click('Continue to details'); completeListingDetails();
    click('Remove image 1');
    expect(screen.getByText('0 images · 1 required · 9 max')).toBeVisible();
    expect(screen.getByText(/Add at least 1 product image to continue/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
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
    click('Continue to details'); completeListingDetails();
    fireEvent.error(screen.getByRole('img', { name: 'Master image 4' }));
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Remove or replace unavailable images');
    click('Remove image 4');
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeEnabled();
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
    click('Continue to details'); completeListingDetails();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Storage full'); });
    click('Create & activate Master');
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
    click('Continue to details'); completeListingDetails();
    click('Add variant option');
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: attribute.key } });
    fireEvent.change(screen.getByLabelText('Values (comma separated)'), { target: { value: values.join(', ') } });
    click('Add variant SKU'); click('Add variant SKU');
    screen.getAllByLabelText('Master variant SKU').forEach((input, index) => fireEvent.change(input, { target: { value: `UI-CHILD-${index}` } }));
    screen.getAllByLabelText('Option values (use / between options)').forEach((input, index) => fireEvent.change(input, { target: { value: values[index] } }));
    screen.getAllByLabelText('Price (JPY)').forEach(input => fireEvent.change(input, { target: { value: '100' } }));
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
    values.forEach((_, index) => {
      const select = screen.getByLabelText(`Master SKU for source ${index + 1} from Test shop`) as HTMLSelectElement;
      const option = Array.from(select.options).find(option => option.textContent?.startsWith(`UI-CHILD-${index}`))!;
      fireEvent.change(select, { target: { value: option.value } });
    });
    loadMasterImages();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeEnabled();
    click('Create & activate Master');
    expect(onSaved).toHaveBeenCalledOnce();
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.status).toBe('published');
    expect(product.skus).toHaveLength(2);
    expect(product.channels[0].variant_mappings?.map(row => row.shop_sku)).toEqual(['SOURCE-0', 'SOURCE-1']);
    expect(product.inventory).toEqual({});
  });
});
