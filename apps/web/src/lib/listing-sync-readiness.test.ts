// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createEmptyListingCatalog } from './listing-intake-catalog';
import { confirmListingIntake } from './product-listing-intake';
import type { CatalogImportItem } from './catalog-import-store';
import { getStoredMasterReadiness } from './product-master-readiness';
import { listingSyncReadiness } from './listing-sync-readiness';
import { masterSyncPlan } from './listing-master-sync';

const source: CatalogImportItem = {
  id: 'required-a', listingId: 'required-a', channel: 'shopee', storeName: 'Shop A', title: 'Watercolor paper',
  description: 'Paper for watercolor.', channelSku: 'SHOP-A', channelStock: 1, channelCategory: 'Art paper',
  variants: 1, image: '', price: 20, currency: 'USD', status: 'unmatched', confidence: 0, resolution: 'later',
  requirements: { channel: 'shopee', category: 'Art paper', revision: 'test-v1', origin: 'prototype', fields: [{ key: 'channel_settings.attribute_material', label: 'Material', kind: 'text' }] },
};
function create(drafts?: Parameters<typeof confirmListingIntake>[1]['listingDrafts']) {
  const other: CatalogImportItem = { ...source, id: 'required-b', listingId: 'required-b', storeName: 'Shop B', channelSku: 'SHOP-B', channelSettings: { attribute_material: 'Paper' } };
  const catalog = createEmptyListingCatalog([source, other]);
  confirmListingIntake([source.id, other.id], { name: source.title, sku: 'READINESS-MASTER', sourceId: source.id, copySourcePrice: true, listingDrafts: drafts }, catalog);
  return { catalog, product: catalog.products()[0] };
}
describe('Independent Master and per-listing readiness', () => {
  it('activates with only core data, retaining two links while only one listing is blocked', () => {
    const { product } = create();
    expect(product).toMatchObject({ status: 'published', category: '', images: [], pkg_weight: 0 });
    expect(getStoredMasterReadiness(product).checks).toHaveLength(4);
    expect(getStoredMasterReadiness(product).ready).toBe(true);
    expect(product.channels).toHaveLength(2);
    expect(listingSyncReadiness(product, product.channels[0])).toMatchObject({ ready: false, label: 'Missing channel details' });
    expect(listingSyncReadiness(product, product.channels[1]).ready).toBe(true);
    const preference = { enabled: true, fields: ['content' as const] };
    expect(masterSyncPlan(product, product.channels[0], preference).error).toContain('Material');
    expect(masterSyncPlan(product, product.channels[1], preference).error).toBeUndefined();
    expect(product.channels.every(link => !link.master_data_sync?.enabled && link.last_synced_at === null)).toBe(true);
  });
  it('persists inline channel details only as that listing’s local draft', () => {
    const { product, catalog } = create({ [source.id]: { channel_settings: { attribute_material: 'Cotton paper' } } });
    expect(listingSyncReadiness(product, product.channels[0]).ready).toBe(true);
    expect(product.channels[0].shop_snapshot?.channel_settings).toBeUndefined();
    expect(product.channels[0].local_draft?.values.channel_settings?.attribute_material).toBe('Cotton paper');
    expect(product.channels[1].local_draft).toBeUndefined();
    expect(product.specifications ?? []).toEqual([]);
    expect(catalog.listings()[0].channelSettings).toBeUndefined();
  });
  it('does not guess readiness for absent rules or a changed category', () => {
    const { product } = create();
    const link = product.channels[1];
    const unknown = { ...link, shop_snapshot: { ...link.shop_snapshot!, requirements: undefined } };
    expect(listingSyncReadiness(product, unknown).requirements.state).toBe('unchecked');
    expect(masterSyncPlan(product, unknown, { enabled: true, fields: ['content'] }).error).toContain('not checked');
    expect(listingSyncReadiness(product, { ...link, local_draft: { values: { category: 'Other' }, updated_at: '' } }).ready).toBe(false);
  });
  it('does not use Master values to fill independent listing fields silently', () => {
    const { product } = create();
    const link = { ...product.channels[1], shop_snapshot: { ...product.channels[1].shop_snapshot!, description: '', requirements: { ...source.requirements!, fields: [{ key: 'description' as const, label: 'Description', kind: 'text' as const }] } } };
    expect(listingSyncReadiness(product, link).ready).toBe(false);
    expect(masterSyncPlan(product, link, { enabled: true, fields: ['content'] }).error).toBeUndefined();
  });
  it('keeps pending SKU matches distinct from complete channel fields', () => {
    const { product } = create();
    const link = { ...product.channels[1], review_pending: { issues: ['SKU review'], sku_mapping_pending: true, saved_at: '' } };
    expect(listingSyncReadiness(product, link)).toMatchObject({ label: 'Mapping unfinished', ready: false, requirements: { state: 'complete' } });
    expect(masterSyncPlan(product, link, { enabled: true, fields: ['price'], pricing: { currency: 'USD' } }).error).toContain('variant-SKU');
  });
});
