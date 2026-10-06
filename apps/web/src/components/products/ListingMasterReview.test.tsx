// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { completeListingDetails } from '@/test/fixtures/complete-listing-details';
import { ListingMasterReview } from './ListingMasterReview';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';

let original: CatalogImportItem[];
let originalIds: Set<string>;
let target: Product;
let listings: CatalogImportItem[];
beforeEach(() => {
  original = getCatalogImportItems({ requireConfirmation: true });
  originalIds = new Set(getProducts().map(product => product.id));
  target = { ...getProducts()[0], ...readyMasterFields(), id: 'comparison-test-master', name: 'Comparison brush 12-piece', sku_code: 'COMPARE-12', brand: 'Master Brand', gtin: '12345', mpn: 'BRUSH-12', model_number: '2026-12', pack_quantity: undefined, has_variants: false, product_type: 'single', skus: [], channels: [], import_sources: [], import_result: undefined, status: 'draft', inventory: { wh_crjp: 17 }, images: ['/test-brush.jpg', '/test-back.jpg', '/test-detail.jpg'] };
  addProduct(target);
  listings = ['a', 'b'].map(id => ({ ...original.find(item => item.variants === 1)!, id: `comparison-${id}`, listingId: `comparison-${id}`, title: 'Comparison brush 12 pieces', channelSku: 'COMPARE-12', storeName: `Shop ${id}`, brand: 'Shop Brand', image: '/test-source.jpg', images: ['/test-back.jpg', '/test-detail.jpg'], description: readyMasterFields().description, variants: 1, suggestedProductId: target.id, resolvedProductId: undefined, confirmed: false, resolution: 'later', status: 'suggested' }));
  saveCatalogImportItems(listings);
});
afterEach(() => {
  cleanup();
  getProducts().filter(product => !originalIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(original);
});
const mount = (sources = listings.slice(0, 1), initialMode: 'existing' | 'new' = 'existing') => {
  const onSaved = vi.fn(); const onBack = vi.fn();
  saveCatalogImportItems(listings.map(item => sources.find(source => source.id === item.id) ?? item));
  render(<ListingMasterReview listings={sources} initialMode={initialMode} onSaved={onSaved} onBack={onBack} />);
  return { onSaved, onBack };
};
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const compare = () => click(`Compare with ${target.name}`);

describe('Fast evidence-based Master review', () => {
  it.each(['suggestion', 'search', 'new draft'])('Use existing Master opens the finder from %s without saving or losing draft inputs', origin => {
    const sources = origin === 'search' ? [{ ...listings[0], suggestedProductId: undefined }] : listings.slice(0, 1);
    const { onBack, onSaved } = mount(sources, origin === 'new draft' ? 'new' : 'existing');
    const count = getProducts().length;
    if (origin === 'search') fireEvent.change(screen.getByRole('textbox', { name: /Search by/ }), { target: { value: 'no-results-zzzz' } });
    if (origin !== 'new draft') click('Create new Master');
    fireEvent.change(screen.getByRole('textbox', { name: 'Product name' }), { target: { value: 'Edited draft name' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Master SKU' }), { target: { value: 'KEEP-DRAFT-12' } });
    click('Use existing Master');
    expect(screen.getByRole('region', { name: 'Find a Product Master' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Search by/ })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: /Search by/ })).toHaveValue('');
    expect(screen.getByRole('group', { name: 'Source listing' })).toHaveTextContent(listings[0].title);
    expect(screen.getByRole('button', { name: `Compare with ${target.name}` })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Link to this Master' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to details' })).not.toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProducts()).toHaveLength(count);
    expect(getCatalogImportItems({ requireConfirmation: true }).some(item => item.confirmed)).toBe(false);
    click('Create new Master');
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue('Edited draft name');
    expect(screen.getByRole('textbox', { name: 'Master SKU' })).toHaveValue('KEEP-DRAFT-12');
  });
  it('keeps the selected group and current source when returning from creation to the finder', () => {
    mount(listings, 'new');
    fireEvent.change(screen.getByLabelText('Use product data from'), { target: { value: listings[1].id } });
    click('Use existing Master');
    expect(screen.getByRole('region', { name: 'Find a Product Master' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Selected listing 1' })).toHaveTextContent('Shop a');
    expect(screen.getByRole('group', { name: 'Selected listing 2' })).toHaveTextContent('Shop b');
    expect(screen.getByText('2 listings selected')).toBeVisible();
    expect(screen.queryByLabelText('Listing to review')).not.toBeInTheDocument();
    click('Create new Master');
    expect(screen.getByLabelText('Use product data from')).toHaveValue(listings[1].id);
  });
  it('shows both selected listings together and scopes candidate evidence to the whole group', () => {
    const sources = listings.map((item, index) => ({ ...item, suggestedProductId: undefined, channelSku: index ? 'OTHER-SKU' : item.channelSku }));
    const { onSaved } = mount(sources);
    const overview = within(screen.getByRole('region', { name: 'Selected listings 2' }));
    expect(overview.getByText('All 2 listings')).toBeVisible();
    expect(overview.getByText('1 Product Master')).toBeVisible();
    for (const [index, source] of sources.entries()) {
      const card = within(overview.getByRole('group', { name: `Selected listing ${index + 1}` }));
      expect(card.getByText(source.title)).toBeVisible();
      expect(card.getByText(source.channelSku)).toBeVisible();
      expect(card.getByText(new RegExp(source.storeName))).toBeVisible();
      expect(card.getByText('Shop Brand · Single product')).toBeVisible();
    }
    expect(screen.queryByRole('group', { name: 'Source listing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const candidate = within(screen.getByRole('button', { name: `Compare with ${target.name}` }));
    expect(candidate.getByText('SKU matches 1/2 listings')).toBeVisible();
    expect(candidate.getByText('Differences in 2/2 listings')).toBeVisible();
    expect(candidate.getByText('Missing data in 2/2 listings')).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('switches comparison cards without marking them reviewed or saving links', () => {
    const { onSaved } = mount(listings);
    const firstName = `View listing 1: ${listings[0].title} · Shop a`;
    const secondName = `View listing 2: ${listings[1].title} · Shop b`;
    expect(screen.getByRole('button', { name: firstName })).toHaveAttribute('aria-pressed', 'true');
    click(secondName);
    expect(screen.getByRole('button', { name: secondName })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Source listing' })).toHaveTextContent('Shop b');
    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 listings reviewed');
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProductById(target.id)?.channels).toEqual([]);
    click('Review next listing');
    expect(screen.getByRole('button', { name: secondName })).toHaveTextContent('Reviewed');
    expect(screen.getByRole('button', { name: firstName })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 listings reviewed');
    expect(onSaved).not.toHaveBeenCalled();
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it.each(['choose', 'compare', 'create'])('provides a non-saving Back to listings action in the %s stage', stage => {
    const { onBack, onSaved } = mount(stage === 'choose' ? [{ ...listings[0], suggestedProductId: undefined }] : listings.slice(0, 1), stage === 'create' ? 'new' : 'existing');
    expect(screen.getByRole('button', { name: 'Back to listings' })).toHaveClass('h-11');
    expect(screen.queryByRole('button', { name: 'Review later' })).not.toBeInTheDocument();
    if (stage === 'choose') expect(within(screen.getByRole('group', { name: 'Review actions' })).queryByRole('button')).not.toBeInTheDocument();
    click('Back to listings');
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProductById(target.id)?.channels).toEqual([]);
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it('keeps an already Active Master active and confirms only the new link', () => {
    updateProduct(target.id, { id: target.id, status: 'published' });
    const { onSaved } = mount([{ ...listings[0], brand: target.brand }]);
    expect(screen.queryByRole('button', { name: 'Confirm link & activate' })).not.toBeInTheDocument();
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)?.status).toBe('published');
    expect(getProductById(target.id)?.channels).toHaveLength(1);
  });
  it('keeps source identity and both actions in the compact chooser', () => {
    mount([{ ...listings[0], suggestedProductId: undefined }]);
    const source = within(screen.getByRole('group', { name: 'Source listing' }));
    expect(source.getByText(listings[0].title)).toBeVisible();
    expect(source.getByText(listings[0].channelSku)).toBeVisible();
    expect(source.getByText(/Shop Brand/)).toBeVisible();
    expect(source.getByText(/Shop a/)).toBeVisible();
    expect(source.getByRole('button', { name: `Enlarge image of ${listings[0].title}` })).toHaveClass('size-14');
    expect(screen.queryByText('Find the same product')).not.toBeInTheDocument();
    const toolbar = within(screen.getByRole('group', { name: 'Find or create a Master' }));
    expect(toolbar.getByLabelText('Search by product name, SKU or brand')).toHaveClass('h-11');
    expect(toolbar.getByText('Find a Product Master')).toHaveAttribute('for', 'compare-master-search');
    click('Create new Master');
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue(listings[0].title);
  });
  it('prioritizes differences and reveals the full evidence table on demand', () => {
    const { onSaved } = mount([{ ...listings[0], suggestedProductId: undefined }]);
    expect(screen.getAllByRole('button', { name: /^Compare with/ })[0]).toHaveAccessibleName(`Compare with ${target.name}`);
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    compare();
    expect(screen.getByRole('group', { name: 'Differences to check' })).toHaveTextContent('Brand differs');
    expect(screen.getByText(/4 fields unverified/)).toBeVisible();
    expect(screen.getByRole('table', { name: 'Product identity comparison' })).not.toBeVisible();
    fireEvent.click(screen.getByText('View all 7 comparison fields'));
    expect(screen.getByRole('table', { name: 'Product identity comparison' })).toBeVisible();
    expect(screen.getByText('Title says “12 pieces” · unverified')).toBeVisible();
    expect(screen.getByText('Title says “12-piece” · unverified')).toBeVisible();
    expect(getProductById(target.id)?.channels).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('preselects the suggestion, shows conflicts, and saves only the link with one explicit action', () => {
    const { onSaved } = mount([{ ...listings[0], status: 'conflict', confidence: 58 }]);
    const before = structuredClone(getProductById(target.id)!);
    expect(screen.getByText('Suggested Product Master')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Differences to check' })).toHaveTextContent('Brand differs');
    const footer = within(screen.getByRole('group', { name: 'Review actions' }));
    for (const name of ['Choose another Master', 'Create new Master', 'Link to this Master']) {
      expect(footer.getByRole('button', { name })).toHaveClass('h-11');
    }
    click('Link to this Master'); click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)).toMatchObject({ status: before.status, images: before.images, inventory: before.inventory, description: before.description });
    expect(getProductById(target.id)?.channels).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Complete Product Master' })).not.toBeInTheDocument();
  });
  it('links without a completion form even when identity fields are unverified', () => {
    const { onSaved } = mount([{ ...listings[0], brand: target.brand }]);
    expect(screen.getByText(/4 fields unverified/)).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(screen.queryByRole('group', { name: 'Are these the same product?' })).not.toBeInTheDocument();
  });
  it.each([
    ['modelNumber', 'OTHER-MODEL', 'Model'], ['mpn', 'OTHER-PART', 'Manufacturer part number'],
    ['gtin', '99999', 'Barcode (GTIN)'], ['packQuantity', 6, 'Pack quantity'],
  ])('shows the %s conflict without adding an activation or second confirmation step', (field, value, label) => {
    updateProduct(target.id, { id: target.id, pack_quantity: 12 });
    const { onSaved } = mount([{ ...listings[0], brand: target.brand, [field]: value }]);
    expect(screen.getByRole('group', { name: 'Differences to check' })).toHaveTextContent(label);
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it.each(['missing', 'archived', 'mixed', 'partially suggested'])('keeps manual choice for %s suggestions', scenario => {
    if (scenario === 'archived') updateProduct(target.id, { id: target.id, status: 'archived' });
    mount(scenario === 'missing' ? [{ ...listings[0], suggestedProductId: 'missing-master' }]
      : scenario === 'mixed' ? [listings[0], { ...listings[1], suggestedProductId: getProducts().find(product => product.id !== target.id && product.status !== 'archived')!.id }]
      : scenario === 'partially suggested' ? [listings[0], { ...listings[1], suggestedProductId: undefined }] : listings.slice(0, 1));
    expect(screen.getByRole('region', { name: 'Find a Product Master' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Link to this Master' })).not.toBeInTheDocument();
    expect(getCatalogImportItems({ requireConfirmation: true }).every(item => !item.confirmed)).toBe(true);
  });
  it('chooses a different Master without reapplying the suggestion or writing until confirmation', () => {
    const { onSaved } = mount();
    click('Choose another Master');
    fireEvent.change(screen.getByRole('textbox', { name: /Search by/ }), { target: { value: 'Comparison' } });
    compare();
    expect(onSaved).not.toHaveBeenCalled();
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it('reviews each listing before atomically linking a deliberate group', () => {
    const { onSaved } = mount(listings);
    click('Review next listing');
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 listings reviewed');
    expect(getProductById(target.id)?.channels).toEqual([]);
    click('Choose another Master'); compare();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 listings reviewed');
    click('Review next listing'); click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)?.channels).toHaveLength(2);
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it('blocks variant links but retains the separate-draft path', () => {
    mount([{ ...listings[0], variants: 3 }]);
    expect(screen.getByText('Variant-SKU matching is required')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Link to this Master' })).toBeDisabled();
    click('Create new Master');
    expect(screen.getByRole('region', { name: 'Create one Master' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeEnabled();
  });
  it('maps existing variant SKUs without completing or editing an incomplete Draft', () => {
    const skus = ['Red', 'Blue'].map((variation_name, index) => ({ id: `existing-child-${index}`, sku_code: `EXISTING-${index}`, variation_name, status: 'active' as const, weight_g: 0, units_per_carton: 1, price: undefined }));
    updateProduct(target.id, { id: target.id, has_variants: true, product_type: 'variant', skus, images: [], description: '', retail_price: 0 });
    const before = structuredClone(getProductById(target.id)!);
    const { onSaved } = mount([{ ...listings[0], variants: 2, variantItems: [{ sku: 'SHOP-RED', label: 'Red' }, { sku: 'SHOP-BLUE', label: 'Blue' }] }]);
    expect(screen.getByRole('button', { name: 'Link to this Master' })).toBeDisabled();
    expect(screen.queryByLabelText('Product description *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Master variant SKU')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Master SKU for shop SKU 1'), { target: { value: skus[0].id } });
    fireEvent.change(screen.getByLabelText('Master SKU for shop SKU 2'), { target: { value: skus[0].id } });
    expect(screen.getByRole('button', { name: 'Link to this Master' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Master SKU for shop SKU 2'), { target: { value: skus[1].id } });
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)).toMatchObject({ status: before.status, images: [], description: '', retail_price: 0, skus: before.skus });
    expect(getProductById(target.id)?.channels[0].variant_mappings).toEqual([{ shop_sku: 'SHOP-RED', master_sku_id: skus[0].id }, { shop_sku: 'SHOP-BLUE', master_sku_id: skus[1].id }]);
  });
  it('creates a complete Active Master from one listing without a generic checkbox or publication', () => {
    const { onSaved } = mount();
    click('Create new Master');
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue(listings[0].title);
    expect(screen.queryByRole('checkbox', { name: /I checked/ })).not.toBeInTheDocument();
    click('Continue to details');
    completeListingDetails(); click('Create & activate Master');
    expect(onSaved).toHaveBeenCalledOnce();
    const product = getProductById(onSaved.mock.calls[0][0].productId)!;
    expect(product.status).toBe('published');
    expect(product.channels).toHaveLength(1);
    expect(product.inventory).toEqual({});
    expect(product.retail_price).toBe(123);
    expect(getProductById(target.id)?.channels).toEqual([]);
  });
  it('validates duplicate SKUs and keeps grouping consent for multiple listings', () => {
    const { onSaved } = mount(listings, 'new');
    expect(screen.getByRole('button', { name: 'Continue to details' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Master SKU' }), { target: { value: target.sku_code } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked/ }));
    click('Continue to details');
    completeListingDetails();
    expect(screen.getByText(/This SKU already exists on another Master/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create & activate Master' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('refuses stale data without changing Master status and allows a fresh comparison', () => {
    const { onSaved } = mount();
    updateProduct(target.id, { ...getProductById(target.id)!, brand: 'Changed Brand' });
    click('Link to this Master');
    expect(screen.getByRole('alert')).toHaveTextContent('changed during review');
    expect(onSaved).not.toHaveBeenCalled();
    expect(getProductById(target.id)?.channels).toEqual([]);
    click('Choose another Master'); compare();
    expect(screen.getByRole('group', { name: 'Differences to check' })).toHaveTextContent('Changed Brand');
    click('Link to this Master');
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it('allows search and leaving without changing any mapping', () => {
    const { onBack } = mount();
    click('Choose another Master');
    fireEvent.change(screen.getByRole('textbox', { name: /Search by/ }), { target: { value: 'no-results-zzzz' } });
    expect(screen.getByText('No Master found')).toBeVisible();
    click('Clear search'); compare(); click('Back to listings');
    expect(onBack).toHaveBeenCalledOnce();
    expect(getCatalogImportItems({ requireConfirmation: true }).some(item => item.confirmed)).toBe(false);
  });
  it('enlarges source images and removes zoom when the image is missing', () => {
    mount();
    click(`Enlarge image of ${listings[0].title}`);
    const preview = within(screen.getByRole('dialog', { name: 'Product image' }));
    expect(preview.getByRole('img')).toHaveAttribute('src', listings[0].image);
    fireEvent.click(preview.getByRole('button', { name: 'Close' }));
    fireEvent.error(screen.getByRole('img', { name: listings[0].title }));
    expect(screen.queryByRole('button', { name: `Enlarge image of ${listings[0].title}` })).not.toBeInTheDocument();
  });
});
