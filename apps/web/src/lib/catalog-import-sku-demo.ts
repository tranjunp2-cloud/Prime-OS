import type { CatalogImportItem } from './catalog-import-store';

// Explicit channel fixtures, independent of the selected Master. Different shop
// ordering/codes exercise matching by identity rather than array position.
const sketchbookSources: Pick<CatalogImportItem, 'id' | 'channel' | 'listingId' | 'storeName' | 'channelSku' | 'variantItems'>[] = [
  { id: 'imp-002', channel: 'shopee', listingId: 'SHP-9012282', storeName: 'Prime Beauty Official', channelSku: 'CR-SKB-MDN-A5', variantItems: [
    { sku: 'CR-SKB-MDN-A5-HC', label: 'Hardcover / A5', price: { amount: 3800, currency: 'JPY' }, stock: 40 },
    { sku: 'CR-SKB-MDN-A5-PB', label: 'Softcover / A5', price: { amount: 3400, currency: 'JPY' }, stock: 32 },
    { sku: 'CR-SKB-MDN-A5-A4', label: 'Hardcover / A4', price: { amount: 4800, currency: 'JPY' }, stock: 24 },
  ] },
  { id: 'imp-011', channel: 'amazon', listingId: 'B0GSKETCH22', storeName: 'Prime Beauty US', channelSku: 'AMZ-CR-SKB-MDN-A5', variantItems: [
    { sku: 'AMZ-SKB-A4-HC', label: 'Hardcover / A4', price: { amount: 35, currency: 'USD' }, stock: 22 },
    { sku: 'AMZ-SKB-A5-HC', label: 'Hardcover / A5', price: { amount: 27, currency: 'USD' }, stock: 36 },
    { sku: 'AMZ-SKB-A5-SC', label: 'Softcover / A5', price: { amount: 24, currency: 'USD' }, stock: 30 },
  ] },
];

/** Fill only omitted fields on the exact old demo records; preserve all decisions
 * and any explicitly supplied (even incomplete) source data. No storage reset. */
export function withCatalogSkuDemo(source: CatalogImportItem): CatalogImportItem {
  const fixture = sketchbookSources.find(item => item.id === source.id && item.channel === source.channel
    && item.listingId === source.listingId && item.storeName === source.storeName && item.channelSku === source.channelSku);
  if (!fixture) return source;
  return { ...source,
    ...(source.variantItems === undefined && source.variants === 3 ? { variantItems: structuredClone(fixture.variantItems) } : {}),
    // Explicit prototype scenarios, not a claim about live Shopee/Amazon policies.
    // Real imports must supply their own schema per market, category and revision.
    requirements: source.requirements ?? { channel: source.channel, category: source.channelCategory, revision: 'prototype-sketchbook-v1', origin: 'prototype', fields:
      source.channel === 'shopee' ? [{ key: 'channel_settings.attribute_material', label: 'Material', kind: 'text' }]
        : [{ key: 'images', label: 'Product image', kind: 'images' }] },
  };
}

/** Complete the known sketchbook fixture only in the isolated first-use preview. */
export function withFirstMasterDemoData(source: CatalogImportItem): CatalogImportItem {
  const fixture = sketchbookSources.find(item => item.id === source.id && item.channel === source.channel
    && item.listingId === source.listingId && item.storeName === source.storeName && item.channelSku === source.channelSku);
  if (!fixture) return source;
  const image = source.image === '/images/products/B0G432Z32J/1.jpg' ? '/images/products/B0FH1K4CMN/1.jpg' : source.image;
  return { ...withCatalogSkuDemo(source), image,
    description: source.description ?? 'Watercolor sketchbook with 200gsm paper for painting, drawing and mixed-media studies. Choose hardcover or softcover binding and the paper size that suits your work. Keep the book dry and store flat between sessions.',
    pkg_length: source.pkg_length ?? 31, pkg_width: source.pkg_width ?? 22,
    pkg_height: source.pkg_height ?? 2, pkg_weight: source.pkg_weight ?? 320 };
}
