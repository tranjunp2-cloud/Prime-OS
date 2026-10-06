// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addProduct, commitListingReviewProducts, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { demoProductActivity, getProductActivity, groupRoutineSyncActivity, withProductActivity } from './product-activity';

const listing = { channel: 'amazon' as const, external_id: 'A-1', store_name: 'Shop A', shop_sku: 'SHOP-A-SKU', status: 'draft' as const, publication_unconfirmed: true, listing_url: null, last_synced_at: null };
const fixture = (): Product => ({ ...getProducts()[0], id: `activity-test-${crypto.randomUUID()}`, status: 'draft', channels: [], channel_overrides: {}, revisions: [], activity: [], import_result: undefined });
const ids: string[] = [];
afterEach(() => { vi.restoreAllMocks(); ids.splice(0).forEach(id => deleteProduct(id)); });

describe('Product activity recording', () => {
  it('logs linking without activating, editing Master content, or claiming publication', () => {
    const original = fixture();
    const next = withProductActivity(original, { ...original, channels: [listing] });
    expect(next.status).toBe('draft');
    expect(next.name).toBe(original.name);
    expect(next.activity).toHaveLength(1);
    expect(next.activity?.[0]).toMatchObject({ scope: 'listing', kind: 'linked', listing: { shop: 'Shop A', sku: 'SHOP-A-SKU' } });
    expect(next.activity?.[0].detail).toContain('No shop publication');
  });
  it('does not duplicate events on a no-op save', () => {
    const product = withProductActivity(undefined, { ...fixture(), channels: [listing] });
    expect(withProductActivity(product, { ...product, updated_at: new Date().toISOString() }).activity).toEqual(product.activity);
  });
  it('records listing-only overrides with before/after values', () => {
    const product = { ...fixture(), channels: [{ ...listing, publication_unconfirmed: false }, { ...listing, external_id: 'imported-sibling' }], channel_overrides: { amazon: { enabled: true, title: 'Old title', price_markup: 0, description: '' } } };
    const next = withProductActivity(product, { ...product, channel_overrides: { amazon: { ...product.channel_overrides.amazon, title: 'New title' } } });
    expect(next.activity).toEqual([expect.objectContaining({ scope: 'listing', kind: 'updated', changes: [{ field: 'title', before: 'Old title', after: 'New title' }] })]);
  });
  it('preserves old shop identity after unlinking and records no remote deletion', () => {
    const product = withProductActivity(undefined, { ...fixture(), channels: [listing] });
    const next = withProductActivity(product, { ...product, channels: [] });
    expect(next.activity?.filter(event => event.scope === 'listing').map(event => event.kind)).toEqual(['linked', 'unlinked']);
    expect(next.activity?.at(-1)?.listing?.shop).toBe('Shop A');
    expect(next.activity?.at(-1)?.detail).toContain('were not deleted or updated');
    expect(next.activity?.at(-1)?.unlinkedSnapshot?.listing).toEqual(listing);
  });
  it('distinguishes identical external IDs belonging to different shops', () => {
    const product = { ...fixture(), channels: [listing] };
    const next = withProductActivity(product, { ...product, channels: [...product.channels, { ...listing, store_name: 'Shop B' }] });
    expect(next.activity).toHaveLength(1);
    expect(next.activity?.[0].listing?.shop).toBe('Shop B');
  });
  it('records mapping review separately from publication', () => {
    const product = { ...fixture(), channels: [listing] };
    const next = withProductActivity(product, { ...product, channels: [{ ...listing, identity_review_signature: 'verified' }] });
    expect(next.activity?.map(event => event.kind)).toEqual(['mapping']);
  });
  it('does not interpret a new sync timestamp as successful publication', () => {
    const product = { ...fixture(), channels: [listing] };
    const next = withProductActivity(product, { ...product, channels: [{ ...listing, last_synced_at: new Date().toISOString() }] });
    expect(next.activity?.[0].title).toBe('Sync timestamp updated');
    expect(next.activity?.[0].detail).toContain('does not confirm successful publication');
  });
  it('keeps Master lifecycle and listing creation as separate events', () => {
    const next = withProductActivity(undefined, { ...fixture(), status: 'published', channels: [listing] });
    expect(next.activity?.map(event => event.scope)).toEqual(['master', 'listing']);
    expect(next.activity?.[0].detail).toContain('Active');
  });
  it('keeps existing versions accessible without synthesizing old listing activity', () => {
    const product = { ...fixture(), channels: [listing], revisions: [{ id: 'v1', number: 1, status: 'published' as const, createdAt: '2026-09-01T00:00:00Z', createdBy: 'Seller', summary: 'Activated Master' }] };
    expect(getProductActivity(product)).toEqual([expect.objectContaining({ scope: 'master', revisionId: 'v1' })]);
  });
  it('never mutates or persists presentation-only demo events', () => {
    const product = fixture();
    const before = JSON.stringify(product);
    expect(demoProductActivity(product).every(event => event.demo)).toBe(true);
    expect(JSON.stringify(product)).toBe(before);
    expect(getProductActivity(product)).toEqual([]);
  });
  it('groups routine sync events but leaves failures separate', () => {
    const base = demoProductActivity(fixture())[0];
    const routine = { ...base, outcome: undefined, title: 'Sync timestamp updated' };
    const events = [{ ...routine, id: 'one' }, { ...routine, id: 'two' }, base];
    const groups = groupRoutineSyncActivity(events);
    expect(groups).toHaveLength(2);
    expect(groups[0].repeated).toHaveLength(2);
    expect(groups[1].outcome).toBe('error');
    expect(events[0]).not.toHaveProperty('repeated');
  });
  it('persists new events together with listing changes and retains authoritative history', () => {
    const product = fixture(); ids.push(product.id); addProduct(product, { requirePersistence: true });
    updateProduct(product.id, { id: product.id, channels: [listing], activity: [] }, { requirePersistence: true });
    const saved = getProductById(product.id)!;
    expect(saved.activity?.map(event => event.kind)).toEqual(['created', 'linked']);
    const persisted = JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((item: Product) => item.id === product.id);
    expect(persisted.activity).toEqual(saved.activity);
    expect(persisted.channels).toEqual(saved.channels);
  });
  it('keeps both old and new Master logs when moving a listing atomically', () => {
    const source = { ...fixture(), channels: [listing] }; const target = fixture();
    ids.push(source.id, target.id); addProduct(source); addProduct(target);
    commitListingReviewProducts([{ ...getProductById(source.id)!, channels: [] }, { ...getProductById(target.id)!, channels: [listing] }]);
    expect(getProductById(source.id)?.activity?.at(-1)?.kind).toBe('unlinked');
    expect(getProductById(target.id)?.activity?.at(-1)?.kind).toBe('linked');
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it('does not expose events or relationship changes when atomic persistence fails', () => {
    const product = fixture(); ids.push(product.id); addProduct(product);
    const before = getProductById(product.id)!;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => commitListingReviewProducts([{ ...before, channels: [listing] }])).toThrow('Storage full');
    expect(getProductById(product.id)?.activity).toEqual(before.activity);
    expect(getProductById(product.id)?.channels).toEqual([]);
  });
});
