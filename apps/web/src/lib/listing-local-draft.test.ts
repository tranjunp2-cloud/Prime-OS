// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type ChannelListing, type Product } from './product-store';
import { listingDraftErrors, listingDraftTableData, listingEditableValues, listingEditSnapshot, listingIndependentPatch, saveListingLocalDraft } from './listing-local-draft';
import { listingMasterSync, masterSyncPlan, masterSyncSnapshot, type MasterSyncPreference } from './listing-master-sync';
import { resolveListingShopData } from './listing-shop-data';

const id = 'listing-local-draft-test';
const listing: ChannelListing = { channel: 'lazada', external_id: 'listing-a', store_name: 'Shop A', shop_sku: 'SKU-A', status: 'active', publication_unconfirmed: true, listing_url: null, last_synced_at: '2026-10-01T00:00:00Z', reported_stock: 0,
  shop_snapshot: { channel: 'lazada', store_name: 'Shop A', listing_id: 'listing-a', shop_sku: 'SKU-A', title: 'Shop title', brand: 'Shop brand', category: 'Shop category', images: ['/one.jpg'], price: { amount: 29, currency: 'USD' }, stock: 0, recorded_at: '2026-10-01T00:00:00Z' } };
function fixture(extra: Partial<Product> = {}) {
  listing.shop_snapshot!.requirements = { channel: 'lazada', category: 'Shop category', revision: 'test-v1', origin: 'prototype', fields: [] };
  addProduct({ ...getProducts()[0], id, status: 'draft', import_activation_paused: true, name: '', images: [], inventory: {}, import_sources: [],
    channels: [listing, { ...listing, external_id: 'listing-b', shop_sku: 'SKU-B' }, { ...listing, store_name: 'Shop B' }],
    channel_overrides: { lazada: { enabled: true, title: 'Unrelated configured listing', description: '', price_markup: 0, channel_price: 999, channel_currency: 'JPY' } }, ...extra });
  return getProductById(id)!;
}
afterEach(() => { vi.restoreAllMocks(); deleteProduct(id); });
describe('Listing-owned local edits', () => {
  it('commits opposite source choices and independent edits in one write without changing provider data', () => {
    const before = fixture({ name: 'Master name', images: ['/master.jpg'], channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content'], updated_at: '' } }, { ...listing, external_id: 'sibling' }] });
    const target = before.channels[0];
    const preference: MasterSyncPreference = { enabled: true, fields: ['media'] };
    const sync = { preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature };
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    saveListingLocalDraft(id, target, { title: 'Independent title', stock: 3 }, listingEditSnapshot(before, target), sync);
    expect(persist).toHaveBeenCalledTimes(1);
    const after = getProductById(id)!;
    expect(after.channels[0].master_data_sync).toMatchObject(preference);
    expect(after.channels[0].local_draft?.values).toEqual({ title: 'Independent title', brand: 'Shop brand', stock: 3 });
    expect(after.channels[0].shop_snapshot).toEqual(target.shop_snapshot);
    expect(after.channels[0].last_synced_at).toBe(target.last_synced_at);
    expect(after.channels[1]).toEqual(before.channels[1]);
    expect(after.name).toBe('Master name');
    expect(after.images).toEqual(['/master.jpg']);
    expect(after.activity?.slice(before.activity?.length ?? 0).map(event => event.title)).toEqual(['Listing edits saved locally', 'Master sync preference updated']);
  });
  it('rejects stale Master/review and conflicting synced edits without partially committing', () => {
    const before = fixture({ name: 'Master name', images: ['/master.jpg'] });
    const target = before.channels[0], snapshot = listingEditSnapshot(before, target);
    const preference: MasterSyncPreference = { enabled: true, fields: ['content'] };
    const sync = { preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature };
    expect(() => saveListingLocalDraft(id, target, { stock: 4 }, snapshot, { ...sync, reviewedPlan: 'stale' })).toThrow('Review the latest');
    expect(() => saveListingLocalDraft(id, target, { title: 'Conflicting title' }, snapshot, sync)).toThrow('same group independently');
    expect(getProductById(id)).toBe(before);
    updateProduct(id, { id, name: 'New Master name' });
    const changed = getProductById(id)!;
    expect(() => saveListingLocalDraft(id, target, { stock: 4 }, snapshot, sync)).toThrow('Master data changed');
    expect(getProductById(id)).toBe(changed);
  });
  it('preserves independent values when resuming Master and rolls back both changes on storage failure', () => {
    const before = fixture({ name: 'Master name', channels: [{ ...listing, local_draft: { values: { title: 'Local title' }, updated_at: '' } }] });
    const target = before.channels[0], snapshot = listingEditSnapshot(before, target);
    const preference: MasterSyncPreference = { enabled: true, fields: ['content'] };
    const sync = { preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature };
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => saveListingLocalDraft(id, target, { stock: 4 }, snapshot, sync)).toThrow('Storage full');
    expect(getProductById(id)).toBe(before);
    write.mockRestore();
    saveListingLocalDraft(id, target, {}, snapshot, sync);
    expect(getProductById(id)!.channels[0]).toMatchObject({ master_data_sync: preference, local_draft: target.local_draft, shop_snapshot: target.shop_snapshot, last_synced_at: target.last_synced_at });
  });
  it('validates price, inventory and shipping configuration through the combined save', () => {
    const before = fixture({ name: 'Master name', retail_price: 42, price_currency: 'USD', product_type: 'single', has_variants: false });
    const target = before.channels[0], snapshot = listingEditSnapshot(before, target);
    for (const preference of [
      { enabled: true, fields: ['price'], pricing: { currency: 'JPY' } },
      { enabled: true, fields: ['inventory'], inventory: { warehouse_id: '', safety_buffer: 0 } },
    ] as MasterSyncPreference[]) {
      expect(() => saveListingLocalDraft(id, target, { category: 'New category' }, snapshot, { preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature })).toThrow();
      expect(getProductById(id)).toBe(before);
    }
    const preference: MasterSyncPreference = { enabled: true, fields: ['price'], pricing: { currency: 'USD' } };
    saveListingLocalDraft(id, target, { brand: 'New brand' }, snapshot, { preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature });
    expect(getProductById(id)!.channels[0].master_data_sync?.pricing).toEqual({ currency: 'USD' });
    expect(getProductById(id)!.channels[0].local_draft?.values).toEqual({ brand: 'New brand' });
    expect(getProductById(id)!.retail_price).toBe(42);
  });
  it('does not enable sync using the old requirements when category changes in the same save', () => {
    const before = fixture({ name: 'Master name', product_type: 'single', has_variants: false });
    const target = before.channels[0];
    const preference: MasterSyncPreference = { enabled: true, fields: ['content'] };
    expect(() => saveListingLocalDraft(id, target, { category: 'Different category' }, listingEditSnapshot(before, target), {
      preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature,
    })).toThrow('Channel requirements not checked');
    expect(getProductById(id)).toBe(before);
  });
  it('validates completed listing fields when enabling sync in the same save', () => {
    fixture({ name: 'Master name', product_type: 'single', has_variants: false });
    updateProduct(id, { id, channels: [{ ...listing, shop_snapshot: { ...listing.shop_snapshot!, requirements: {
      channel: 'lazada', category: 'Shop category', revision: 'test-material-v1', origin: 'prototype',
      fields: [{ key: 'channel_settings.attribute_material', label: 'Material', kind: 'text' }],
    } } }] });
    const before = getProductById(id)!, target = before.channels[0];
    const preference: MasterSyncPreference = { enabled: true, fields: ['content'] };
    const patch = { channel_settings: { attribute_material: 'Paper' } };
    expect(masterSyncPlan(before, target, preference).error).toContain('Material');
    const reviewed = masterSyncPlan(before, target, preference, undefined, undefined, patch);
    expect(reviewed.error).toBeFalsy();
    saveListingLocalDraft(id, target, patch, listingEditSnapshot(before, target), {
      preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: reviewed.signature,
    });
    const after = getProductById(id)!;
    expect(after.channels[0].local_draft?.values).toEqual(patch);
    expect(after.channels[0].master_data_sync).toMatchObject(preference);
    expect(after.channels[0].shop_snapshot).toEqual(target.shop_snapshot);
    expect(after.specifications).toEqual(before.specifications);
    expect(after.name).toBe(before.name);
  });
  it('allows detaching a group without fixing unrelated incomplete legacy sync setup', () => {
    const before = fixture({ channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } }] });
    const target = before.channels[0];
    const preference: MasterSyncPreference = { enabled: true, fields: ['media'] };
    saveListingLocalDraft(id, target, { title: 'Independent title' }, listingEditSnapshot(before, target), { preference, masterSnapshot: masterSyncSnapshot(before), reviewedPlan: masterSyncPlan(before, target, preference).signature });
    expect(getProductById(id)!.channels[0].master_data_sync?.fields).toEqual(['media']);
    expect(getProductById(id)!.channels[0].local_draft?.values.title).toBe('Independent title');
  });
  it('atomically opts out of one group, freezes its values, and records both listing events', () => {
    const before = fixture({ channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } }, { ...listing, external_id: 'sibling' }] });
    const target = before.channels[0];
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    saveListingLocalDraft(id, target, { title: 'Independent title' }, listingEditSnapshot(before, target), ['content']);
    expect(persist).toHaveBeenCalledTimes(1);
    const after = getProductById(id)!;
    expect(after.channels[0].master_data_sync).toMatchObject({ enabled: true, fields: ['media'] });
    expect(after.channels[0].local_draft?.values).toEqual({ title: 'Independent title', brand: 'Shop brand' });
    expect(after.channels[0].shop_snapshot).toEqual(target.shop_snapshot);
    expect(after.channels[0].last_synced_at).toEqual(target.last_synced_at);
    expect(after.channels[1]).toEqual(before.channels[1]);
    for (const key of ['status', 'name', 'images', 'brand', 'inventory', 'retail_price', 'skus', 'channel_overrides'] as const) expect(after[key]).toEqual(before[key]);
    expect(after.activity?.slice(before.activity?.length ?? 0).map(event => event.title)).toEqual(['Listing edits saved locally', 'Master sync preference updated']);
  });
  it('turns sync off when the last group opts out, including a value-preserving opt-out', () => {
    const before = fixture({ channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content'], updated_at: '' } }] });
    saveListingLocalDraft(id, before.channels[0], {}, listingEditSnapshot(before, before.channels[0]), ['content']);
    const after = getProductById(id)!;
    expect(listingMasterSync(after.channels[0])).toEqual({ enabled: false, fields: [] });
    expect(listingEditableValues(after, after.channels[0]).title).toBe('Shop title');
  });
  it('preserves displayed fallback images when switching from legacy sync to independent data', () => {
    const before = fixture({ channels: [{ ...listing, publication_unconfirmed: false, shop_snapshot: undefined }], channel_overrides: { lazada: { enabled: true, title: '', description: '', price_markup: 0, listing_mode: 'master', media_scope: 'all', listing_sku: 'SKU-A' } } });
    const patch = listingIndependentPatch({ title: 'Displayed title', images: ['/displayed.jpg'] }, {}, ['media']);
    expect(patch).toEqual({ images: ['/displayed.jpg'] });
    saveListingLocalDraft(id, before.channels[0], patch, listingEditSnapshot(before, before.channels[0]), ['media']);
    const after = getProductById(id)!;
    expect(listingEditableValues(after, after.channels[0]).images).toEqual(['/displayed.jpg']);
    expect(listingMasterSync(after.channels[0])).toMatchObject({ enabled: true, fields: ['content'] });
  });
  it('rolls back both the opt-out and values on validation or storage failure', () => {
    const before = fixture({ channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content'], updated_at: '' } }] });
    const target = before.channels[0], snapshot = listingEditSnapshot(before, target);
    expect(() => saveListingLocalDraft(id, target, { title: '' }, snapshot, ['content'])).toThrow('Enter a listing title');
    expect(getProductById(id)).toBe(before);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => saveListingLocalDraft(id, target, { title: 'New' }, snapshot, ['content'])).toThrow('Storage full');
    expect(getProductById(id)).toBe(before);
  });
  it('rejects opting out of unknown/off groups, stale preferences and edits to still-synced groups', () => {
    const before = fixture({ channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } }] });
    const target = before.channels[0], snapshot = listingEditSnapshot(before, target);
    expect(() => saveListingLocalDraft(id, target, {}, snapshot, ['price'])).toThrow('Sync settings changed');
    expect(() => saveListingLocalDraft(id, target, {}, snapshot, ['invalid' as never])).toThrow('Sync settings changed');
    expect(() => saveListingLocalDraft(id, target, { images: ['/new.jpg'] }, snapshot, ['content'])).toThrow('Turn off Images');
    updateProduct(id, { id, channels: [{ ...target, master_data_sync: { enabled: false, fields: [], updated_at: '' } }] });
    expect(() => saveListingLocalDraft(id, target, { title: 'New' }, snapshot, ['content'])).toThrow('changed');
  });
  it('does not bypass per-SKU or FBA stock restrictions through an opt-out', () => {
    let before = fixture({ channels: [{ ...listing, variant_mappings: [{ shop_sku: 'a', master_sku_id: 'a' }, { shop_sku: 'b', master_sku_id: 'b' }], master_data_sync: { enabled: true, fields: ['inventory'], updated_at: '' } }] });
    expect(() => saveListingLocalDraft(id, before.channels[0], { stock: 8 }, listingEditSnapshot(before, before.channels[0]), ['inventory'])).toThrow('multiple SKUs');
    updateProduct(id, { id, channels: [{ ...listing, channel: 'amazon', master_data_sync: { enabled: true, fields: ['inventory'], inventory: { warehouse_id: '', safety_buffer: 0, fulfillment: 'FBA' }, updated_at: '' } }] });
    before = getProductById(id)!;
    expect(() => saveListingLocalDraft(id, before.channels[0], { stock: 8 }, listingEditSnapshot(before, before.channels[0]), ['inventory'])).toThrow('FBA');
  });
  it('merges nested recorded values and local patches without persisting untouched fields', () => {
    const target = { ...listing, shop_snapshot: { ...listing.shop_snapshot!, shipping: { length: 14, weight: 160 }, channel_settings: { condition: 'New', attribute_color: 'Red' } }, local_draft: { values: { shipping: { notes: 'Keep dry' } }, updated_at: '' } };
    const before = fixture({ channels: [target] });
    saveListingLocalDraft(id, before.channels[0], { shipping: { weight: 200 }, channel_settings: { attribute_color: 'Blue' } }, listingEditSnapshot(before, before.channels[0]));
    const after = getProductById(id)!;
    expect(after.channels[0].local_draft?.values).toEqual({ shipping: { notes: 'Keep dry', weight: 200 }, channel_settings: { attribute_color: 'Blue' } });
    expect(listingEditableValues(after, after.channels[0])).toMatchObject({ shipping: { length: 14, weight: 200, notes: 'Keep dry' }, channel_settings: { condition: 'New', attribute_color: 'Blue' } });
    expect(after.channels[0].shop_snapshot).toEqual(target.shop_snapshot);
  });
  it('recovers only owned legacy inputs and preserves channel details independently', () => {
    const before = fixture({ channels: [{ ...listing, publication_unconfirmed: false, shop_snapshot: undefined, reported_stock: undefined }], channel_overrides: { lazada: { enabled: true, title: 'Configured title', description: '', price_markup: 0, listing_sku: 'SKU-A', pricing_source: 'manual', manual_price: '31', channel_price: 29, channel_currency: 'USD', stock_quantity: '0', warranty: '12 months', compliance_notes: 'Keep dry' } } });
    const target = before.channels[0];
    expect(listingEditableValues(before, target)).toMatchObject({ title: 'Configured title', price: { amount: 31, currency: 'USD' }, stock: 0, shipping: { notes: 'Keep dry' }, channel_settings: { warranty: '12 months' } });
    saveListingLocalDraft(id, target, { channel_settings: { warranty: '24 months' } }, listingEditSnapshot(before, target));
    const after = getProductById(id)!;
    expect(after.channel_overrides).toEqual(before.channel_overrides);
    expect(listingEditableValues(after, after.channels[0]).channel_settings?.warranty).toBe('24 months');
    expect(listingDraftErrors(after, after.channels[0], { channel_settings: { preorder_days: '-1' } }).channel_settings).toBeTruthy();
    expect(listingDraftErrors(after, after.channels[0], { channel_settings: { name: 'Master' } as never }).channel_settings).toBeTruthy();
  });
  it('saves only the exact shop and listing; never updates Master, siblings, snapshots or sync receipts', () => {
    const before = fixture();
    const target = before.channels[0];
    saveListingLocalDraft(id, target, { title: 'Independent title', images: ['/listing.jpg'], price: { amount: 32, currency: 'USD' }, stock: 0 }, listingEditSnapshot(before, target));
    const after = getProductById(id)!;
    expect(after.channels[0].local_draft?.values).toEqual({ title: 'Independent title', images: ['/listing.jpg'], price: { amount: 32, currency: 'USD' } });
    expect(after.channels[0]).toEqual({ ...target, local_draft: expect.any(Object) });
    expect(after.channels.slice(1)).toEqual(before.channels.slice(1));
    for (const key of ['status', 'name', 'images', 'description', 'brand', 'inventory', 'retail_price', 'channel_overrides', 'skus'] as const) expect(after[key]).toEqual(before[key]);
    expect(after.activity?.at(-1)).toMatchObject({ scope: 'listing', title: 'Listing edits saved locally', listing: { externalId: 'listing-a', shop: 'Shop A' } });
    expect(after.activity?.slice(before.activity?.length ?? 0)).toHaveLength(1);
    expect(listingEditableValues(after, after.channels[0]).title).toBe('Independent title');
    expect(resolveListingShopData(after, after.channels[0], []).price?.amount).toBe(29);
    expect(listingDraftTableData(after.channels[0], resolveListingShopData(after, after.channels[0], [])).price).toEqual({ amount: 32, currency: 'USD', origin: 'saved' });
  });
  it('persists fields when reopening and allows changing only stock with incomplete Master content', () => {
    const before = fixture();
    saveListingLocalDraft(id, before.channels[0], { stock: 7 }, listingEditSnapshot(before, before.channels[0]));
    const reopened = getProductById(id)!;
    saveListingLocalDraft(id, reopened.channels[0], { description: 'Listing description' }, listingEditSnapshot(reopened, reopened.channels[0]));
    expect(getProductById(id)!.channels[0].local_draft?.values).toEqual({ stock: 7, description: 'Listing description' });
    expect(JSON.stringify(localStorage)).toContain('Listing description');
  });
  it('does not fill unknown fields or use another listing’s override', () => {
    const before = fixture({ channels: [{ ...listing, reported_stock: undefined, shop_snapshot: undefined }] });
    expect(listingEditableValues(before, before.channels[0])).toMatchObject({ title: undefined, price: undefined, stock: undefined, images: undefined });
    saveListingLocalDraft(id, before.channels[0], { stock: 0 }, listingEditSnapshot(before, before.channels[0]));
    expect(getProductById(id)!.channels[0].local_draft?.values).toEqual({ stock: 0 });
  });
  it('protects selected sync groups but allows independent fields and explicit Sync off', () => {
    const before = fixture({ channels: [{ ...listing, master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } }] });
    const target = before.channels[0];
    expect(() => saveListingLocalDraft(id, target, { title: 'No' }, listingEditSnapshot(before, target))).toThrow('Turn off');
    saveListingLocalDraft(id, target, { stock: 8 }, listingEditSnapshot(before, target));
    const off = { ...getProductById(id)!.channels[0], master_data_sync: { enabled: false, fields: ['content' as const], updated_at: '' } };
    updateProduct(id, { id, channels: [off] });
    const product = getProductById(id)!;
    saveListingLocalDraft(id, product.channels[0], { title: 'Allowed' }, listingEditSnapshot(product, product.channels[0]));
    expect(getProductById(id)!.channels[0].local_draft?.values.title).toBe('Allowed');
  });
  it.each([{ stock: -1 }, { stock: 1.5 }, { stock: NaN }, { price: { amount: -1, currency: 'USD' } }, { price: { amount: 1, currency: 'JPY' } }, { title: '' }, { images: [] }, { images: ['javascript:alert(1)'] }, { shipping: { weight: 0 } }])('rejects invalid changed fields %j', patch => {
    const before = fixture();
    expect(() => saveListingLocalDraft(id, before.channels[0], patch, listingEditSnapshot(before, before.channels[0]))).toThrow();
    expect(getProductById(id)).toBe(before);
  });
  it('rejects ambiguous, removed, stale and archived targets', () => {
    let before = fixture(); const snapshot = listingEditSnapshot(before, before.channels[0]);
    updateProduct(id, { id, channels: [listing, { ...listing }] });
    expect(() => saveListingLocalDraft(id, listing, { stock: 7 }, snapshot)).toThrow('changed');
    updateProduct(id, { id, channels: [] });
    expect(() => saveListingLocalDraft(id, listing, { stock: 7 }, snapshot)).toThrow('changed');
    updateProduct(id, { id, channels: [{ ...listing, reported_stock: 9 }] });
    expect(() => saveListingLocalDraft(id, listing, { stock: 7 }, snapshot)).toThrow('changed');
    updateProduct(id, { id, status: 'archived' });
    before = getProductById(id)!;
    expect(() => saveListingLocalDraft(id, before.channels[0], { stock: 7 }, listingEditSnapshot(before, before.channels[0]))).toThrow('no longer editable');
  });
  it('rejects concurrent edits and sync changes without requiring unchanged Master data', () => {
    const before = fixture(); const snapshot = listingEditSnapshot(before, before.channels[0]);
    updateProduct(id, { id, name: 'Other Master edit' });
    saveListingLocalDraft(id, before.channels[0], { stock: 7 }, snapshot);
    expect(() => saveListingLocalDraft(id, before.channels[0], { stock: 9 }, snapshot)).toThrow('changed');
    const next = getProductById(id)!;
    updateProduct(id, { id, channels: [{ ...next.channels[0], master_data_sync: { enabled: true, fields: ['inventory'], updated_at: '' } }] });
    expect(() => saveListingLocalDraft(id, next.channels[0], { stock: 9 }, listingEditSnapshot(next, next.channels[0]))).toThrow('changed');
  });
  it('rolls back on storage failure and does not record false success', () => {
    const before = fixture();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => saveListingLocalDraft(id, before.channels[0], { stock: 7 }, listingEditSnapshot(before, before.channels[0]))).toThrow('Storage full');
    expect(getProductById(id)).toBe(before);
  });
  it('does not write for an unchanged patch or allow Master fields', () => {
    const before = fixture();
    saveListingLocalDraft(id, before.channels[0], { title: 'Shop title', stock: 0 }, listingEditSnapshot(before, before.channels[0]));
    expect(getProductById(id)).toBe(before);
    expect(() => saveListingLocalDraft(id, before.channels[0], { name: 'Master' } as never, listingEditSnapshot(before, before.channels[0]))).toThrow('Only listing fields');
  });
  it('does not replace SKU-level stock and pricing with aggregate edits', () => {
    const before = fixture({ channels: [{ ...listing, variant_mappings: [{ shop_sku: 'A', master_sku_id: 'a' }, { shop_sku: 'B', master_sku_id: 'b' }] }] });
    expect(listingDraftErrors(before, before.channels[0], { stock: 9, price: { amount: 32, currency: 'USD' } })).toMatchObject({ stock: expect.stringContaining('multiple SKUs'), price: expect.stringContaining('multiple SKUs') });
    expect(listingDraftErrors(before, before.channels[0], { title: 'Allowed' })).toEqual({});
  });
});
