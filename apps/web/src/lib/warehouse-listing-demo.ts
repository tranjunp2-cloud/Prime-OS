import type { ChannelListing, Product } from './product-store';

type Fixture = {
  sku: string;
  listings: Array<{ channel: ChannelListing['channel']; id: string; shop: string; replacementId?: string }>;
  variants?: Array<[id: string, code: string]>;
};
const amazon = (id: string, replacementId?: string) => ({ channel: 'amazon' as const, id, shop: 'Prime Beauty US', replacementId });
const rakuten = (id: string, replacementId?: string) => ({ channel: 'rakuten' as const, id, shop: 'Prime Beauty JP', replacementId });
const shopee = (id: string, replacementId?: string) => ({ channel: 'shopee' as const, id, shop: 'Prime Beauty Official', replacementId });
const lazada = (id: string, replacementId?: string) => ({ channel: 'lazada' as const, id, shop: 'Prime Flagship Store', replacementId });
const notebook: Fixture['variants'] = [['sku_001a', 'CR-NTB-BLK-A5-A4'], ['sku_001b', 'CR-NTB-BLK-A5-B5'], ['sku_001c', 'CR-NTB-BLK-A5-A5']];
const sketchbook: Fixture['variants'] = [['sku_002a', 'CR-SKB-MDN-A5-HC'], ['sku_002b', 'CR-SKB-MDN-A5-PB'], ['sku_002c', 'CR-SKB-MDN-A5-A4']];

// Explicit identities for shipped prototype records. This is seed data, never
// a rule that assigns a real listing to the only shop on its sales channel.
const fixtures: Record<string, Fixture> = {
  prod_001: { sku: 'CR-NTB-BLK-A5', listings: [amazon('B0G432Z31H'), shopee('SHP-9012281')], variants: notebook },
  prod_002: { sku: 'CR-SKB-MDN-A5', listings: [rakuten('R001002003')], variants: sketchbook },
  prod_003: { sku: 'CR-BSH-SET-12', listings: [amazon('B0FQHTSM8B'), shopee('SH-ARCH-001')] },
  prod_004: { sku: 'CR-ART-MYTH-10', listings: [amazon('B0G5Y7YCDD'), rakuten('R001002001')] },
  prod_demo_electronics: { sku: 'DEMO-ELC-001', listings: [amazon('B0G432Z31H', 'DEMO-AMZ-HEADPHONES-001')], variants: [['sku_demo_electronics', 'DEMO-ELC-001']] },
  prod_demo_bag: { sku: 'DEMO-BAG-001', listings: [rakuten('R001002003', 'DEMO-RKT-BAG-001')], variants: [['sku_demo_bag', 'DEMO-BAG-001']] },
  prod_demo_books: { sku: 'DEMO-BOOK-001', listings: [amazon('B0G5Y7YCDD', 'DEMO-AMZ-BOOK-001'), rakuten('R001002001', 'DEMO-RKT-BOOK-001')] },
  prod_import_review_demo: { sku: 'IMP-BRUSH-12', listings: [amazon('B0IMPORTBRUSH'), shopee('SHP-BRUSH-12'), lazada('LZD-BRUSH-12')] },
  prod_import_ready_demo: { sku: 'IMP-SKETCH-A5', listings: [lazada('LZD-READY-SKETCH')], variants: sketchbook },
  prod_import_test_ready_02: { sku: 'TEST2-SKETCH-A5', listings: [lazada('LZD-READY-SKETCH', 'DEMO-LZD-TEST2-SKETCH')], variants: sketchbook },
  prod_import_test_review_02: { sku: 'TEST2-BRUSH-12', listings: [amazon('B0IMPORTBRUSH', 'DEMO-AMZ-TEST2-BRUSH'), shopee('SHP-BRUSH-12', 'DEMO-SHP-TEST2-BRUSH'), lazada('LZD-BRUSH-12', 'DEMO-LZD-TEST2-BRUSH')] },
  prod_import_test_matched_02: { sku: 'TEST2-MYTH-ART-10', listings: [amazon('B0G5Y7YCDD', 'DEMO-AMZ-TEST2-MYTH'), rakuten('R001002001', 'DEMO-RKT-TEST2-MYTH'), shopee('SHP-TEST2-MYTH')] },
};

/** Complete omitted fixture identity and mappings; preserve reviewed, imported,
 * custom or explicitly unfinished configuration. Never enable stock sync. */
export function completeWarehouseListingDemo(product: Product): Product {
  const fixture = fixtures[product.id];
  if (!fixture || product.sku_code !== fixture.sku) return product;
  let changed = false;
  const channels = product.channels.map(listing => {
    const entry = fixture.listings.find(item => item.channel === listing.channel && [item.id, item.replacementId].filter(Boolean).includes(listing.external_id ?? ''));
    if (!entry || listing.publication_unconfirmed || listing.review_pending || listing.local_draft || listing.creation_config) return listing;
    const owner = listing.store_name ?? listing.shop_snapshot?.store_name;
    if (owner !== undefined && owner !== entry.shop) return listing;
    const inheritedId = entry.replacementId && listing.external_id === entry.id;
    if (inheritedId && (product.listing_review_migrated || listing.shop_snapshot || listing.store_name !== undefined || listing.master_data_sync || listing.variant_mappings || listing.listing_url)) return listing;
    const variants = fixture.variants;
    const canMap = product.has_variants && variants && product.skus.length === variants.length
      && variants.every(([id, code]) => product.skus.some(sku => sku.id === id && sku.sku_code === code))
      && !listing.shop_snapshot?.variant_items && listing.variant_mappings === undefined;
    if (listing.store_name !== undefined && !inheritedId && !canMap) return listing;
    changed = true;
    return { ...listing,
      ...(listing.store_name === undefined ? { store_name: entry.shop } : {}),
      ...(inheritedId ? { external_id: entry.replacementId! } : {}),
      ...(canMap ? { variant_mappings: variants.map(([master_sku_id, shop_sku]) => ({ master_sku_id, shop_sku })) } : {}),
    };
  });
  return changed ? { ...product, channels } : product;
}
