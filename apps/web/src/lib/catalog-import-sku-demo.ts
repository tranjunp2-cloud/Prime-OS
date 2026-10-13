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

// Complete, explicit provider snapshots for the other multi-SKU demo listings.
// Never derive source SKU codes, options, prices or stock from the chosen Master.
const otherSources: typeof sketchbookSources = [
  { id: 'imp-001', channel: 'shopee', listingId: 'SHP-9012281', storeName: 'Prime Beauty Official', channelSku: 'CR-NTB-BLK-A5', variantItems: [
    { sku: 'CR-NTB-BLK-A5-A4', label: 'Black / A4', price: { amount: 3600, currency: 'JPY' }, stock: 18 },
    { sku: 'CR-NTB-BLK-A5-B5', label: 'Black / B5', price: { amount: 3200, currency: 'JPY' }, stock: 20 },
    { sku: 'CR-NTB-BLK-A5-A5', label: 'Black / A5', price: { amount: 2800, currency: 'JPY' }, stock: 24 },
  ] },
  { id: 'imp-009', channel: 'shopee', listingId: 'SHP-9012289', storeName: 'Prime Beauty Official', channelSku: 'CR-NTB-BLK-A5', variantItems: [
    { sku: 'SHP-NTB-LTD-A5', label: 'Black / A5', price: { amount: 3200, currency: 'JPY' }, stock: 9 },
    { sku: 'SHP-NTB-LTD-B5', label: 'Black / B5', price: { amount: 3500, currency: 'JPY' }, stock: 6 },
  ] },
  { id: 'imp-019', channel: 'amazon', listingId: 'B0GNOTE019', storeName: 'Prime Beauty US', channelSku: 'AMZ-NTB-BLK-A5', variantItems: [
    { sku: 'AMZ-NTB-A5-BLK', label: 'Black / A5', price: { amount: 20, currency: 'USD' }, stock: 20 },
    { sku: 'AMZ-NTB-A4-BLK', label: 'Black / A4', price: { amount: 27, currency: 'USD' }, stock: 10 },
    { sku: 'AMZ-NTB-B5-BLK', label: 'Black / B5', price: { amount: 24, currency: 'USD' }, stock: 14 },
  ] },
  { id: 'imp-020', channel: 'lazada', listingId: 'LZD-1023520', storeName: 'Prime Flagship Store', channelSku: 'LZD-NTB-BLK-A5', variantItems: [
    { sku: 'LZD-NTB-B5-BLK', label: 'B5 / Black', price: { amount: 3300, currency: 'JPY' }, stock: 12 },
    { sku: 'LZD-NTB-A5-BLK', label: 'A5 / Black', price: { amount: 2900, currency: 'JPY' }, stock: 16 },
    { sku: 'LZD-NTB-A4-BLK', label: 'A4 / Black', price: { amount: 3700, currency: 'JPY' }, stock: 10 },
  ] },
  { id: 'imp-022', channel: 'lazada', listingId: 'LZD-1023522', storeName: 'Prime Flagship Store', channelSku: 'LZD-SKB-200-A5', variantItems: [
    { sku: 'LZD-SKB-A5-SC', label: 'Softcover / A5', price: { amount: 3300, currency: 'JPY' }, stock: 9 },
    { sku: 'LZD-SKB-A5-HC', label: 'Hardcover / A5', price: { amount: 3700, currency: 'JPY' }, stock: 12 },
  ] },
  { id: 'imp-024', channel: 'amazon', listingId: 'B0GSKETCH24', storeName: 'Prime Beauty US', channelSku: 'CR-SKB-MDN-A5', variantItems: [
    { sku: 'AMZ-SKB-SP-A5', label: 'Spiral / A5', price: { amount: 35, currency: 'USD' }, stock: 6 },
    { sku: 'AMZ-SKB-SP-A4', label: 'Spiral / A4', price: { amount: 43, currency: 'USD' }, stock: 3 },
    { sku: 'AMZ-SKB-SP-B5', label: 'Spiral / B5', price: { amount: 39, currency: 'USD' }, stock: 4 },
    { sku: 'AMZ-SKB-SP-A6', label: 'Spiral / A6', price: { amount: 29, currency: 'USD' }, stock: 4 },
  ] },
  { id: 'imp-025', channel: 'lazada', listingId: 'LZD-1023525', storeName: 'Prime Flagship Store', channelSku: 'CR-ART-MYTH-10', variantItems: [
    { sku: 'LZD-MYTH-CANVAS-XL', label: 'Canvas / XL', price: { amount: 8900, currency: 'JPY' }, stock: 2 },
    { sku: 'LZD-MYTH-CANVAS-L', label: 'Canvas / L', price: { amount: 6900, currency: 'JPY' }, stock: 2 },
    { sku: 'LZD-MYTH-CANVAS-M', label: 'Canvas / M', price: { amount: 4900, currency: 'JPY' }, stock: 1 },
  ] },
  { id: 'imp-027', channel: 'amazon', listingId: 'B0GMARKER27', storeName: 'Prime Beauty US', channelSku: 'AMZ-MARKER-48', variantItems: [
    { sku: 'AMZ-MARKER-48-CLASSIC', label: '48 colors / Classic', price: { amount: 42, currency: 'USD' }, stock: 6 },
    { sku: 'AMZ-MARKER-48-PASTEL', label: '48 colors / Pastel', price: { amount: 42, currency: 'USD' }, stock: 5 },
    { sku: 'AMZ-MARKER-48-PORTRAIT', label: '48 colors / Portrait', price: { amount: 44, currency: 'USD' }, stock: 4 },
    { sku: 'AMZ-MARKER-48-LANDSCAPE', label: '48 colors / Landscape', price: { amount: 44, currency: 'USD' }, stock: 4 },
    { sku: 'AMZ-MARKER-48-GRAY', label: '48 colors / Gray', price: { amount: 40, currency: 'USD' }, stock: 3 },
    { sku: 'AMZ-MARKER-48-BRIGHT', label: '48 colors / Bright', price: { amount: 42, currency: 'USD' }, stock: 4 },
  ] },
  { id: 'imp-030', channel: 'amazon', listingId: 'B0GSKETCH30', storeName: 'Prime Beauty US', channelSku: 'AMZ-SKB-PRO-A5', variantItems: [
    { sku: 'AMZ-SKB-PRO-A5-HC', label: 'Hardcover / A5', price: { amount: 28, currency: 'USD' }, stock: 18 },
    { sku: 'AMZ-SKB-PRO-A5-SC', label: 'Softcover / A5', price: { amount: 25, currency: 'USD' }, stock: 14 },
    { sku: 'AMZ-SKB-PRO-A4-HC', label: 'Hardcover / A4', price: { amount: 36, currency: 'USD' }, stock: 9 },
  ] },
  { id: 'imp-033', channel: 'shopee', listingId: 'SHP-9012333', storeName: 'Prime Beauty Official', channelSku: 'SHP-NTB-BLK-A5-RT', variantItems: [
    { sku: 'SHP-NTB-RT-A5', label: 'Black / A5', price: { amount: 2950, currency: 'JPY' }, stock: 12 },
    { sku: 'SHP-NTB-RT-B5', label: 'Black / B5', price: { amount: 3350, currency: 'JPY' }, stock: 9 },
    { sku: 'SHP-NTB-RT-A4', label: 'Black / A4', price: { amount: 3750, currency: 'JPY' }, stock: 6 },
  ] },
];

/** Fill only omitted fields on the exact old demo records; preserve all decisions
 * and any explicitly supplied (even incomplete) source data. No storage reset. */
export function withCatalogSkuDemo(source: CatalogImportItem): CatalogImportItem {
  const fixture = [...sketchbookSources, ...otherSources].find(item => item.id === source.id && item.channel === source.channel
    && item.listingId === source.listingId && item.storeName === source.storeName && item.channelSku === source.channelSku);
  if (!fixture) return source;
  return { ...source,
    ...(source.variantItems === undefined && source.variants === fixture.variantItems!.length ? { variantItems: structuredClone(fixture.variantItems) } : {}),
    // Explicit prototype scenarios, not a claim about live Shopee/Amazon policies.
    // Real imports must supply their own schema per market, category and revision.
    requirements: source.requirements ?? (sketchbookSources.includes(fixture) ? { channel: source.channel, category: source.channelCategory, revision: 'prototype-sketchbook-v1', origin: 'prototype', fields:
      source.channel === 'shopee' ? [{ key: 'channel_settings.attribute_material', label: 'Material', kind: 'text' }]
        : [{ key: 'images', label: 'Product image', kind: 'images' }] } : undefined),
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
