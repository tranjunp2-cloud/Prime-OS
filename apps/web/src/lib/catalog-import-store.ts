export type ImportMatchStatus = 'matched' | 'suggested' | 'unmatched' | 'conflict' | 'ignored';
export type ImportResolution = 'link' | 'create' | 'later' | 'ignore';

export interface CatalogImportItem {
  id: string;
  channel: 'shopee' | 'amazon' | 'lazada';
  storeName: string;
  title: string;
  channelSku: string;
  listingId: string;
  image: string;
  variants: number;
  channelStock: number;
  channelCategory: string;
  price: number;
  currency: string;
  status: ImportMatchStatus;
  confidence: number;
  suggestedProductId?: string;
  resolution: ImportResolution;
  resolvedProductId?: string;
  confirmed?: boolean;
}

// Increment when the prototype seed changes so reviewers always receive the
// complete scenario set instead of a stale decision state from an older demo.
const STORAGE_KEY = 'prime-catalog-import-review-v10';
const AUTO_SYNC_THRESHOLD = 85;

const defaults: CatalogImportItem[] = [
  { id: 'imp-001', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Black Hardcover Notebook Japanese Craft Paper', channelSku: 'CR-NTB-BLK-A5', listingId: 'SHP-9012281', image: '/images/products/B0G432Z31H/1.jpg', variants: 3, channelStock: 62, channelCategory: 'Stationery > Notebooks', price: 2800, currency: 'JPY', status: 'matched', confidence: 100, suggestedProductId: 'prod_001', resolution: 'link', resolvedProductId: 'prod_001' },
  { id: 'imp-002', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Sketchbook Pro 200gsm Watercolor Paper', channelSku: 'CR-SKB-MDN-A5', listingId: 'SHP-9012282', image: '/images/products/B0G432Z32J/1.jpg', variants: 3, channelStock: 96, channelCategory: 'Stationery > Art paper', price: 3800, currency: 'JPY', status: 'suggested', confidence: 86, suggestedProductId: 'prod_002', resolution: 'link', resolvedProductId: 'prod_002' },
  { id: 'imp-003', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Premium Calligraphy Starter Kit', channelSku: 'SHP-CALLI-KIT', listingId: 'SHP-9012283', image: '', variants: 1, channelStock: 24, channelCategory: 'Art Supplies > Calligraphy', price: 5200, currency: 'JPY', status: 'unmatched', confidence: 0, resolution: 'later' },
  { id: 'imp-004', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Artist Precision Paint Brush Set 12 Pieces', channelSku: 'CR-BSH-SET-12', listingId: 'B0G432Z33K', image: '/images/products/B0G432Z33K/1.jpg', variants: 1, channelStock: 0, channelCategory: 'Arts, Crafts & Sewing > Brushes', price: 34, currency: 'USD', status: 'conflict', confidence: 58, suggestedProductId: 'prod_003', resolution: 'later' },
  { id: 'imp-005', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Sample promotional gift', channelSku: 'FREE-GIFT-01', listingId: 'LZD-1023491', image: '', variants: 1, channelStock: 400, channelCategory: 'Promotional Items', price: 0, currency: 'JPY', status: 'ignored', confidence: 0, resolution: 'ignore' },
  { id: 'imp-006', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Japanese Mythical Creatures Traditional Art Print', channelSku: 'CR-ART-MYTH-10', listingId: 'B0G432Z34L', image: '/images/products/B0G432Z34L/1.jpg', variants: 1, channelStock: 268, channelCategory: 'Home & Kitchen > Wall Art', price: 22, currency: 'USD', status: 'matched', confidence: 100, suggestedProductId: 'prod_004', resolution: 'link', resolvedProductId: 'prod_004' },
  { id: 'imp-007', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Traditional Japanese Precision Tailoring Scissors', channelSku: 'CR-TAI-BSZ-JP', listingId: 'LZD-1023492', image: '/images/products/B0G432Z35M/1.jpg', variants: 1, channelStock: 0, channelCategory: 'Home & Living > Sewing Tools', price: 4200, currency: 'JPY', status: 'suggested', confidence: 78, suggestedProductId: 'prod_005', resolution: 'later' },
  { id: 'imp-008', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Watercolor Travel Palette 24 Colors', channelSku: 'AMZ-WC-PALETTE-24', listingId: 'B0NEWPAL24', image: '', variants: 1, channelStock: 18, channelCategory: 'Arts, Crafts & Sewing > Paints', price: 29, currency: 'USD', status: 'unmatched', confidence: 0, resolution: 'later' },
  { id: 'imp-009', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Black Hardcover Notebook A5 Limited Edition', channelSku: 'CR-NTB-BLK-A5', listingId: 'SHP-9012289', image: '/images/products/B0G432Z31H/1.jpg', variants: 2, channelStock: 15, channelCategory: 'Stationery > Notebooks', price: 3200, currency: 'JPY', status: 'conflict', confidence: 64, suggestedProductId: 'prod_001', resolution: 'later' },
  { id: 'imp-010', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Discontinued tester listing', channelSku: 'TESTER-OLD-02', listingId: 'LZD-1023499', image: '', variants: 1, channelStock: 0, channelCategory: 'Uncategorized', price: 0, currency: 'JPY', status: 'ignored', confidence: 0, resolution: 'ignore' },
  { id: 'imp-011', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Sketchbook Pro Watercolor Paper 200gsm', channelSku: 'AMZ-CR-SKB-MDN-A5', listingId: 'B0GSKETCH22', image: '/images/products/B0G432Z32J/1.jpg', variants: 3, channelStock: 88, channelCategory: 'Arts, Crafts & Sewing > Art Paper', price: 27, currency: 'USD', status: 'suggested', confidence: 92, suggestedProductId: 'prod_002', resolution: 'link', resolvedProductId: 'prod_002' },
  { id: 'imp-012', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Japanese Precision Tailoring Scissors Professional', channelSku: 'AMZ-TAI-BSZ-JP', listingId: 'B0TAILOR88', image: '/images/products/B0G432Z35M/1.jpg', variants: 1, channelStock: 7, channelCategory: 'Arts, Crafts & Sewing > Scissors', price: 31, currency: 'USD', status: 'suggested', confidence: 81, suggestedProductId: 'prod_005', resolution: 'later' },
  { id: 'imp-013', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Artist Precision Brush Set 12pcs', channelSku: 'SHP-BSH-SET-12', listingId: 'SHP-9012293', image: '/images/products/B0G432Z33K/1.jpg', variants: 1, channelStock: 11, channelCategory: 'Art Supplies > Brushes', price: 4500, currency: 'JPY', status: 'suggested', confidence: 100, suggestedProductId: 'prod_003', resolution: 'later' },
  { id: 'imp-014', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Professional Artist Brush Set 12 Pieces', channelSku: 'LZD-BSH-SET-12', listingId: 'LZD-1023501', image: '/images/products/B0G432Z33K/1.jpg', variants: 1, channelStock: 9, channelCategory: 'Stationery > Painting', price: 4400, currency: 'JPY', status: 'suggested', confidence: 100, suggestedProductId: 'prod_003', resolution: 'later' },
  { id: 'imp-015', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Japanese Mythical Creatures Art Print', channelSku: 'SHP-ART-MYTH-10', listingId: 'SHP-9012295', image: '/images/products/B0G432Z34L/1.jpg', variants: 1, channelStock: 35, channelCategory: 'Home Decor > Wall Art', price: 3100, currency: 'JPY', status: 'suggested', confidence: 83, suggestedProductId: 'prod_004', resolution: 'later' },
  { id: 'imp-016', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Traditional Japanese Mythical Art Poster', channelSku: 'LZD-ART-MYTH-10', listingId: 'LZD-1023502', image: '/images/products/B0G432Z34L/1.jpg', variants: 1, channelStock: 28, channelCategory: 'Home & Living > Wall Decor', price: 3000, currency: 'JPY', status: 'suggested', confidence: 79, suggestedProductId: 'prod_004', resolution: 'later' },
  { id: 'imp-017', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Artist Precision Brush Set Professional 12pc', channelSku: 'CR-BSH-SET-12', listingId: 'B0GBRUSH17', image: '/images/products/B0G432Z33K/1.jpg', variants: 1, channelStock: 34, channelCategory: 'Arts, Crafts & Sewing > Paintbrushes', price: 33, currency: 'USD', status: 'matched', confidence: 100, suggestedProductId: 'prod_003', resolution: 'link', resolvedProductId: 'prod_003' },
  { id: 'imp-018', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Japanese Precision Tailoring Scissors', channelSku: 'CR-TAI-BSZ', listingId: 'LZD-1023518', image: '/images/products/B0G432Z35M/1.jpg', variants: 1, channelStock: 13, channelCategory: 'Home & Living > Sewing', price: 4300, currency: 'JPY', status: 'matched', confidence: 98, suggestedProductId: 'prod_005', resolution: 'link', resolvedProductId: 'prod_005' },
  { id: 'imp-019', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Black Hardcover Notebook A5 Japanese Paper', channelSku: 'AMZ-NTB-BLK-A5', listingId: 'B0GNOTE019', image: '/images/products/B0G432Z31H/1.jpg', variants: 3, channelStock: 44, channelCategory: 'Office Products > Notebooks', price: 20, currency: 'USD', status: 'suggested', confidence: 96, suggestedProductId: 'prod_001', resolution: 'later' },
  { id: 'imp-020', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Japanese Craft Hardcover Notebook Black A5', channelSku: 'LZD-NTB-BLK-A5', listingId: 'LZD-1023520', image: '/images/products/B0G432Z31H/1.jpg', variants: 3, channelStock: 38, channelCategory: 'Stationery > Premium Notebooks', price: 2900, currency: 'JPY', status: 'suggested', confidence: 95, suggestedProductId: 'prod_001', resolution: 'later' },
  { id: 'imp-021', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Japanese Mythical Creatures Art Collection 10 Sheets', channelSku: 'SHP-MYTH-ART-10', listingId: 'SHP-9012321', image: '/images/products/B0G432Z34L/1.jpg', variants: 1, channelStock: 52, channelCategory: 'Home Decor > Art Prints', price: 3200, currency: 'JPY', status: 'suggested', confidence: 88, suggestedProductId: 'prod_004', resolution: 'later' },
  { id: 'imp-022', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Watercolor Sketch Pad 200gsm Modern A5', channelSku: 'LZD-SKB-200-A5', listingId: 'LZD-1023522', image: '/images/products/B0G432Z32J/1.jpg', variants: 2, channelStock: 21, channelCategory: 'Stationery > Sketch Books', price: 3700, currency: 'JPY', status: 'suggested', confidence: 84, suggestedProductId: 'prod_002', resolution: 'later' },
  { id: 'imp-023', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Japanese Sewing Scissors Premium Gift Box', channelSku: 'SHP-TAI-GIFT', listingId: 'SHP-9012323', image: '/images/products/B0G432Z35M/1.jpg', variants: 1, channelStock: 8, channelCategory: 'Craft Supplies > Scissors', price: 5600, currency: 'JPY', status: 'suggested', confidence: 72, suggestedProductId: 'prod_005', resolution: 'later' },
  { id: 'imp-024', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Sketchbook Pro 200gsm Spiral Edition', channelSku: 'CR-SKB-MDN-A5', listingId: 'B0GSKETCH24', image: '/images/products/B0G432Z32J/1.jpg', variants: 4, channelStock: 17, channelCategory: 'Office Products > Sketchbooks', price: 35, currency: 'USD', status: 'conflict', confidence: 61, suggestedProductId: 'prod_002', resolution: 'later' },
  { id: 'imp-025', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Mythical Creatures Canvas Wall Art XL', channelSku: 'CR-ART-MYTH-10', listingId: 'LZD-1023525', image: '/images/products/B0G432Z34L/1.jpg', variants: 3, channelStock: 5, channelCategory: 'Home & Living > Canvas', price: 8900, currency: 'JPY', status: 'conflict', confidence: 55, suggestedProductId: 'prod_004', resolution: 'later' },
  { id: 'imp-026', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Ceramic Watercolor Mixing Palette 12 Well', channelSku: 'SHP-CER-PAL-12', listingId: 'SHP-9012326', image: '', variants: 1, channelStock: 31, channelCategory: 'Art Supplies > Palettes', price: 2600, currency: 'JPY', status: 'unmatched', confidence: 0, resolution: 'later' },
  { id: 'imp-027', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Professional Marker Set Dual Tip 48 Colors', channelSku: 'AMZ-MARKER-48', listingId: 'B0GMARKER27', image: '', variants: 6, channelStock: 26, channelCategory: 'Arts, Crafts & Sewing > Markers', price: 42, currency: 'USD', status: 'unmatched', confidence: 0, resolution: 'later' },
  { id: 'imp-028', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Internal bundle placeholder do not publish', channelSku: 'INTERNAL-BUNDLE-01', listingId: 'SHP-9012328', image: '', variants: 1, channelStock: 0, channelCategory: 'Uncategorized', price: 0, currency: 'JPY', status: 'ignored', confidence: 0, resolution: 'ignore' },
  { id: 'imp-029', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Bamboo Calligraphy Brush Holder', channelSku: 'LZD-BAMBOO-HOLDER', listingId: 'LZD-1023529', image: '', variants: 1, channelStock: 19, channelCategory: 'Stationery > Calligraphy', price: 2400, currency: 'JPY', status: 'unmatched', confidence: 0, resolution: 'create', resolvedProductId: 'prod_import_imp-029' },
  { id: 'imp-030', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Watercolor Sketchbook Pro A5 200gsm', channelSku: 'AMZ-SKB-PRO-A5', listingId: 'B0GSKETCH30', image: '/images/products/B0G432Z32J/1.jpg', variants: 3, channelStock: 41, channelCategory: 'Arts, Crafts & Sewing > Paper', price: 28, currency: 'USD', status: 'suggested', confidence: 90, suggestedProductId: 'prod_002', resolution: 'link', resolvedProductId: 'prod_002', confirmed: true },
  { id: 'imp-031', channel: 'lazada', storeName: 'Prime Flagship Store', title: 'Artist Precision Paint Brush Set 12 Pieces', channelSku: 'LZD-BSH-SET-12-PRO', listingId: 'LZD-1023531', image: '/images/products/B0G432Z33K/1.jpg', variants: 1, channelStock: 16, channelCategory: 'Stationery > Painting Tools', price: 4500, currency: 'JPY', status: 'matched', confidence: 100, suggestedProductId: 'prod_003', resolution: 'link', resolvedProductId: 'prod_003', confirmed: true },
  { id: 'imp-032', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Legacy seasonal campaign sample', channelSku: 'LEGACY-SAMPLE-2025', listingId: 'B0GLEGACY32', image: '', variants: 1, channelStock: 0, channelCategory: 'Samples', price: 0, currency: 'USD', status: 'ignored', confidence: 0, resolution: 'ignore' },
  { id: 'imp-033', channel: 'shopee', storeName: 'Prime Beauty Official', title: 'Black A5 Japanese Notebook Retail Pack', channelSku: 'SHP-NTB-BLK-A5-RT', listingId: 'SHP-9012333', image: '/images/products/B0G432Z31H/1.jpg', variants: 3, channelStock: 27, channelCategory: 'Stationery > Notebooks', price: 2950, currency: 'JPY', status: 'suggested', confidence: 95, suggestedProductId: 'prod_001', resolution: 'later' },
  { id: 'imp-034', channel: 'amazon', storeName: 'Prime Beauty US', title: 'Artist Precision Paint Brush Set 12 Pieces Exact', channelSku: 'AMZ-BSH-SET-12-EX', listingId: 'B0GBRUSH34', image: '/images/products/B0G432Z33K/1.jpg', variants: 1, channelStock: 29, channelCategory: 'Arts, Crafts & Sewing > Brushes', price: 34, currency: 'USD', status: 'matched', confidence: 100, suggestedProductId: 'prod_003', resolution: 'link', resolvedProductId: 'prod_003' },
];

export function getCatalogImportItems(): CatalogImportItem[] {
  const normalize = (item: CatalogImportItem): CatalogImportItem => {
    const safeCandidate = Boolean(item.suggestedProductId)
      && (item.status === 'matched' || item.status === 'suggested')
      && item.confidence >= AUTO_SYNC_THRESHOLD
      && item.resolution !== 'ignore'
      && item.resolution !== 'create';
    if (!safeCandidate) return { ...item };
    return {
      ...item,
      status: item.confidence === 100 ? 'matched' : item.status,
      resolution: 'link',
      resolvedProductId: item.suggestedProductId,
      confirmed: true,
    };
  };
  if (typeof window === 'undefined') return defaults.map(normalize);
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(value) ? value.map(normalize) : defaults.map(normalize);
  } catch { return defaults.map(normalize); }
}

export function saveCatalogImportItems(items: CatalogImportItem[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
