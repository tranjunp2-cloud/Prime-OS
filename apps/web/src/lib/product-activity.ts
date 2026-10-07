import type { ChannelListing, ChannelOverride, Product } from './product-store';
import { configuredListing } from './product-channel-listings';

export interface ProductActivity {
  id: string;
  scope: 'master' | 'listing';
  kind: 'created' | 'updated' | 'status' | 'linked' | 'unlinked' | 'mapping' | 'sync' | 'version';
  title: string;
  occurredAt: string;
  actor: string;
  detail: string;
  changes?: Array<{ field: string; before: string; after: string }>;
  listing?: { key: string; channel: ChannelListing['channel']; shop: string; sku: string; externalId: string | null };
  revisionId?: string;
  demo?: boolean;
  outcome?: 'error';
  /** Preserve local data for audit/recovery when a relationship is removed. */
  unlinkedSnapshot?: { listing: ChannelListing; override?: ChannelOverride };
}

export const ACTIVITY_CHANNEL_LABELS: Record<ChannelListing['channel'], string> = {
  website: 'PrimeWeb', pos: 'PrimePOS', shopee: 'Shopee', lazada: 'Lazada', tiktok: 'TikTok Shop',
  amazon: 'Amazon', social: 'Social', rakuten: 'Rakuten',
};

export function listingActivityKey(listing: ChannelListing) {
  return JSON.stringify([listing.channel, listing.store_name || '', listing.external_id || 'local']);
}

function listingIdentity(listing: ChannelListing): NonNullable<ProductActivity['listing']> {
  return { key: listingActivityKey(listing), channel: listing.channel, shop: listing.store_name || 'Shop not recorded',
    sku: listing.shop_sku || 'SKU not recorded', externalId: listing.external_id };
}

const changed = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
const display = (value: unknown): string => value === null || value === undefined || value === '' ? 'Not set'
  : Array.isArray(value) ? `${value.length} items` : typeof value === 'object' ? 'Updated values' : String(value);
const masterStatus = (status: Product['status']) => status === 'published' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1);

/** Record committed local state changes, never infer remote publication from a mapping or sync timestamp. */
export function withProductActivity(previous: Product | undefined, next: Product, now = new Date().toISOString()): Product {
  const events: ProductActivity[] = [];
  const push = (event: Omit<ProductActivity, 'id' | 'occurredAt' | 'actor'>) => events.push({
    ...event, id: `activity-${crypto.randomUUID()}`, occurredAt: now, actor: 'You · local demo',
  });
  if (!previous) push({ scope: 'master', kind: 'created', title: 'Product Master created',
    detail: `Created as ${masterStatus(next.status)}. No shop publication was requested.` });
  else {
    if (previous.status !== next.status) push({ scope: 'master', kind: 'status', title: next.status === 'published' ? 'Product Master activated' : 'Master status changed',
      detail: 'Master lifecycle only. Shop publication is separate.', changes: [{ field: 'Master status', before: masterStatus(previous.status), after: masterStatus(next.status) }] });
    const fields: Array<[keyof Product, string]> = [
      ['name', 'Product name'], ['sku_code', 'Master SKU'], ['description', 'Description'], ['brand', 'Brand'], ['category', 'Category'],
      ['images', 'Product images'], ['image_alt_texts', 'Image descriptions'], ['retail_price', 'Base price'], ['price_currency', 'Currency'],
      ['inventory', 'Warehouse stock'], ['skus', 'Variants'], ['specifications', 'Attributes'], ['localized_content', 'Translations'],
      ['gtin', 'GTIN'], ['mpn', 'MPN'], ['model_number', 'Model'], ['pack_quantity', 'Pack quantity'], ['field_mappings', 'Import field sources'],
      ['manufacturer', 'Manufacturer'], ['asin', 'ASIN'], ['condition', 'Condition'], ['original_price', 'Original price'],
      ['prod_length', 'Product length'], ['prod_width', 'Product width'], ['prod_height', 'Product height'], ['prod_weight', 'Product weight'],
      ['pkg_length', 'Package length'], ['pkg_width', 'Package width'], ['pkg_height', 'Package height'], ['pkg_weight', 'Package weight'],
      ['country_of_origin', 'Country of origin'], ['hs_code', 'HS code'], ['slug', 'URL slug'], ['meta_title', 'SEO title'], ['meta_description', 'SEO description'],
      ['product_type', 'Product structure'], ['variant_options', 'Variant options'], ['associations', 'Related products'], ['price_policies', 'Price policies'],
    ];
    const changes = fields.filter(([key]) => changed(previous[key], next[key])).map(([key, field]) => ({
      field, before: ['description', 'localized_content'].includes(key) ? 'Previous content' : display(previous[key]),
      after: ['description', 'localized_content'].includes(key) ? 'Updated content' : display(next[key]),
    }));
    if (changes.length) push({ scope: 'master', kind: 'updated', title: 'Master data updated', changes,
      detail: 'Saved to this Product Master. No listing publication or sync is implied.' });
  }
  const oldLinks = previous?.channels ?? [];
  for (const listing of next.channels) {
    const old = oldLinks.find(candidate => listingActivityKey(candidate) === listingActivityKey(listing));
    const identity = listingIdentity(listing);
    const key = listing.channel === 'website' ? 'webstore' : listing.channel;
    if (!old) {
      push({ scope: 'listing', kind: 'linked', title: listing.external_id ? 'Listing linked to this Master' : 'Local listing draft added', listing: identity,
        detail: listing.review_pending ? `Review unfinished: ${listing.review_pending.issues.join('; ')}. Sync was not turned on.` : 'Local relationship recorded. No shop publication or stock transfer was requested.' });
      continue;
    }
    if (changed(old.review_pending, listing.review_pending)) push({ scope: 'listing', kind: 'mapping', listing: identity,
      title: listing.review_pending ? 'Listing review progress saved' : 'Listing review completed',
      detail: listing.review_pending ? listing.review_pending.issues.join('; ') : 'Pending review cleared. Sync was not turned on.' });
    if (changed(old.variant_mappings, listing.variant_mappings) || old.identity_review_signature !== listing.identity_review_signature) {
      push({ scope: 'listing', kind: 'mapping', title: 'Listing mapping confirmed', listing: identity,
        detail: 'The listing identity or SKU mapping was reviewed. Master activation is a separate action.' });
    }
    if (old.status !== listing.status || old.publication_unconfirmed !== listing.publication_unconfirmed) {
      push({ scope: 'listing', kind: 'status', title: 'Recorded listing status changed', listing: identity,
        detail: 'Local listing record updated. This event is not a remote publication receipt.',
        changes: [{ field: 'Recorded status', before: old.status, after: listing.status }] });
    }
    const oldOverride = previous?.channel_overrides?.[key];
    const newOverride = next.channel_overrides?.[key];
    if (changed(old.local_draft?.values, listing.local_draft?.values)) {
      const before = old.local_draft?.values ?? {};
      const after = listing.local_draft?.values ?? {};
      const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])] as Array<keyof typeof after>;
      push({ scope: 'listing', kind: 'updated', title: 'Listing edits saved locally', listing: identity,
        detail: 'Only this shop listing was edited. Master data and other listings are unchanged; no update was sent to the shop.',
        changes: fields.filter(field => changed(before[field], after[field])).map(field => ({ field, before: display(before[field]), after: display(after[field]) })),
      });
    }
    if (changed(old.master_data_sync, listing.master_data_sync)) {
      push({ scope: 'listing', kind: 'updated', title: 'Master sync preference updated', listing: identity,
        detail: 'Sync settings saved locally for this listing. No update was sent to the shop.',
        changes: [{ field: 'Master data sync', before: old.master_data_sync ? (old.master_data_sync.enabled ? `On: ${old.master_data_sync.fields.join(', ')}` : 'Off') : 'Previous configuration', after: listing.master_data_sync?.enabled ? `On: ${listing.master_data_sync.fields.join(', ')}` : 'Off' },
          ...(changed(old.master_data_sync?.pricing, listing.master_data_sync?.pricing) ? [{ field: 'Sync pricing rule', before: old.master_data_sync?.pricing ? `${old.master_data_sync.pricing.currency} · ${old.master_data_sync.pricing.rule_id || 'Master base price'}` : 'Not set', after: listing.master_data_sync?.pricing ? `${listing.master_data_sync.pricing.currency} · ${listing.master_data_sync.pricing.rule_id || 'Master base price'}` : 'Not set' }] : []),
          ...(changed(old.master_data_sync?.inventory, listing.master_data_sync?.inventory) ? [{ field: 'Sync inventory source', before: old.master_data_sync?.inventory ? JSON.stringify(old.master_data_sync.inventory) : 'Not set', after: listing.master_data_sync?.inventory ? JSON.stringify(listing.master_data_sync.inventory) : 'Not set' }] : []),
        ] });
    }
    if (changed(oldOverride, newOverride) && configuredListing(oldLinks, old.channel, oldOverride?.listing_sku || '') === old) {
      const keys = [...new Set([...Object.keys(oldOverride ?? {}), ...Object.keys(newOverride ?? {})])];
      const changes = keys.filter(field => changed(oldOverride?.[field as keyof typeof oldOverride], newOverride?.[field as keyof typeof newOverride]))
        .map(field => ({ field: field.replace(/_/g, ' '), before: display(oldOverride?.[field as keyof typeof oldOverride]), after: display(newOverride?.[field as keyof typeof newOverride]) }));
      push({ scope: 'listing', kind: 'updated', title: 'Listing draft updated', listing: identity, changes,
        detail: 'Shop-specific settings saved locally. Nothing was published to the shop.' });
    }
    if (old.last_synced_at !== listing.last_synced_at) push({ scope: 'listing', kind: 'sync', title: 'Sync timestamp updated', listing: identity,
      detail: 'The local sync timestamp changed. A timestamp alone does not confirm successful publication.',
      changes: [{ field: 'Sync timestamp', before: display(old.last_synced_at), after: display(listing.last_synced_at) }] });
  }
  for (const listing of oldLinks) {
    if (!next.channels.some(candidate => listingActivityKey(candidate) === listingActivityKey(listing))) push({
      scope: 'listing', kind: 'unlinked', title: 'Listing unlinked from this Master', listing: listingIdentity(listing),
      detail: 'Unlinked locally from this Master. The listing and its data on the shop were not deleted or updated.',
      unlinkedSnapshot: { listing, override: configuredListing(oldLinks, listing.channel, previous?.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel]?.listing_sku || '') === listing ? previous?.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel] : undefined },
    });
  }
  // Always retain authoritative history, including events for listings that have moved elsewhere.
  return { ...next, activity: [...(previous?.activity ?? next.activity ?? []), ...events] };
}

export function getProductActivity(product: Product): ProductActivity[] {
  const versions: ProductActivity[] = (product.revisions ?? []).map(revision => ({
    id: `version-${revision.id}`, scope: 'master', kind: 'version', title: `Master version v${revision.number} recorded`,
    occurredAt: revision.createdAt, actor: revision.createdBy, detail: revision.summary, revisionId: revision.id,
  }));
  return [...(product.activity ?? []), ...versions].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export type ActivityGroup = ProductActivity & { repeated?: ProductActivity[] };

/** Fold adjacent routine sync entries only; never hide failures or mix shops, actors or demo evidence. */
export function groupRoutineSyncActivity(events: ProductActivity[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const event of events) {
    const previous = groups.at(-1);
    if (previous && event.kind === 'sync' && previous.kind === 'sync' && !event.outcome && !previous.outcome
      && event.listing?.key && event.listing.key === previous.listing?.key && event.actor === previous.actor
      && event.title === previous.title && Boolean(event.demo) === Boolean(previous.demo)
      && new Date(event.occurredAt).toDateString() === new Date(previous.occurredAt).toDateString()) {
      previous.repeated = [...(previous.repeated ?? [{ ...previous }]), event];
    } else groups.push({ ...event });
  }
  return groups;
}

/** Explicit presentation-only examples. Never written to product storage or used as operational evidence. */
export function demoProductActivity(product: Product): ProductActivity[] {
  const sample = product.channels[0] ?? { channel: 'amazon' as const, external_id: 'DEMO-LISTING', store_name: 'Demo shop', shop_sku: `${product.sku_code}-DEMO`, status: 'draft' as const, listing_url: null, last_synced_at: null };
  const listing = listingIdentity({ ...sample, store_name: sample.store_name || 'Demo shop', shop_sku: sample.shop_sku || `${product.sku_code}-DEMO` });
  const base = { scope: 'listing' as const, actor: 'Demo seller', demo: true, listing };
  return [
    { ...base, id: 'demo-sync-error', kind: 'sync', title: 'Listing sync failed', occurredAt: '2026-10-05T10:04:32+07:00', outcome: 'error',
      detail: 'Example: the channel connection expired. Reconnect the shop before retrying. This is not a current shop error.' },
    { ...base, id: 'demo-listing-price', kind: 'updated', title: 'Listing price updated', occurredAt: '2026-10-05T09:42:10+07:00',
      detail: 'Example of a shop-specific price change. The Master base price stays unchanged.',
      changes: [{ field: 'Listing price', before: '4,200 JPY', after: '4,500 JPY' }] },
    { ...base, id: 'demo-listing-link', kind: 'linked', title: 'Listing linked to this Master', occurredAt: '2026-10-05T09:30:05+07:00',
      detail: 'Example of confirmed mapping. The existing Master status stays unchanged; nothing is published.' },
  ];
}
