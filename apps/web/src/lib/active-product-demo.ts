import type { Product } from './product-store';
import { getProductCatalogSettings, resolveCatalogCategory, type ProductCatalogSettings } from './product-catalog-settings-store';
import { assignedCategoryAttributes, matchesAttribute } from './category-schema';
import { richTextPlainText } from './product-master-readiness';

const gallery = (asin: string) => [1, 2, 3].map(index => `/images/products/${asin}/${index}.jpg`);
const illustrations = (kind: string) => ['front', 'detail', 'package'].map(view => `/images/products/demo-complete/${kind}-${view}.svg`);
const artImages = ['/images/products/B0G5Y7YCDD/1.jpg', '/images/products/demo-complete/art-detail.svg', '/images/products/demo-complete/art-package.svg'];
type Profile = { sku: string; images: string[]; material: string; color: string; description?: string; inheritedImage?: string };

// Explicit prototype fixtures only. Never infer demo ownership from published status.
const profiles: Record<string, Profile> = {
  prod_001: { sku: 'CR-NTB-BLK-A5', images: gallery('B0G432Z31H'), material: 'Paper', color: 'Black' },
  prod_002: { sku: 'CR-SKB-MDN-A5', images: gallery('B0FH1K4CMN'), material: 'Cotton', color: 'White' },
  prod_003: { sku: 'CR-BSH-SET-12', images: gallery('B0FQHTSM8B'), material: 'Wood', color: 'Blue' },
  prod_004: { sku: 'CR-ART-MYTH-10', images: artImages, material: 'Paper', color: 'White' },
  prod_import_test_matched_02: { sku: 'TEST2-MYTH-ART-10', images: artImages, material: 'Paper', color: 'White' },
  prod_import_review_demo: { sku: 'IMP-BRUSH-12', images: gallery('B0FQHTSM8B'), material: 'Wood', color: 'Blue' },
  prod_import_test_ready_02: { sku: 'TEST2-SKETCH-A5', images: gallery('B0FH1K4CMN'), material: 'Cotton', color: 'White' },
  prod_import_ready_demo: { sku: 'IMP-SKETCH-A5', images: gallery('B0FH1K4CMN'), material: 'Cotton', color: 'White' },
  prod_demo_electronics: {
    sku: 'DEMO-ELC-001', images: illustrations('headphones'), inheritedImage: '/images/products/B0G432Z31H/1.jpg', material: 'Plastic', color: 'Midnight Black',
    description: 'Wireless Studio Headphones in Midnight Black, with an adjustable headband and cushioned over-ear cups for everyday listening. Includes the headphones, charging cable and a protective storage pouch. Wipe with a soft dry cloth and store away from moisture. Product specifications and illustrations are sample data for the commerce prototype.',
  },
  prod_demo_bag: {
    sku: 'DEMO-BAG-001', images: illustrations('bag'), inheritedImage: '/images/products/B0FH1K4CMN/1.jpg', material: 'Natural Canvas', color: 'White',
    description: 'Everyday Canvas Tote Bag in natural canvas, with reinforced shoulder handles and a spacious open compartment for books and daily essentials. Fold flat for storage and spot-clean with a damp cloth. Supplied as one reusable tote bag. Product specifications and illustrations are sample data for the commerce prototype.',
  },
  prod_demo_books: {
    sku: 'DEMO-BOOK-001', images: illustrations('book'), inheritedImage: '/images/products/B0G5Y7YCDD/1.jpg', material: 'Paper', color: 'White',
    description: 'Japanese Design Reference Book is a hardcover reference for exploring composition, typography and traditional visual motifs. The illustrated page layouts support design research and creative study. Supplied as one book; keep dry and away from direct sunlight. Product specifications and illustrations are sample data for the commerce prototype.',
  },
};

/** Fill actual fixture values; leave validation, lifecycle and non-Active examples intact.
 * Called once for existing browser data, not from addProduct/updateProduct/getProducts.
 */
export function completeActiveProductDemo(product: Product, settings: ProductCatalogSettings = getProductCatalogSettings()): Product {
  const profile = profiles[product.id];
  if (!profile || product.sku_code !== profile.sku || product.status !== 'published') return product;
  const category = resolveCatalogCategory(product, settings.categories);
  const specifications = (product.specifications ?? []).map(spec => ({ ...spec }));
  const values: Record<string, string> = {
    material: profile.material, color: profile.color,
    dimensions: product.prod_length > 0 ? `${product.prod_length} cm` : '',
    country_of_origin: product.country_of_origin,
    paper_size: 'A5', binding_type: 'Hardcover',
  };
  for (const attribute of assignedCategoryAttributes(category, settings.attributes)) {
    const spec = specifications.find(item => matchesAttribute(item, attribute));
    const managedByVariants = product.has_variants && product.variant_options?.some(option => option.attributeKey === attribute.key && option.values.some(value => value.trim()));
    if (managedByVariants || spec?.value.trim() || !values[attribute.key]) continue;
    if (spec) { spec.attributeKey = attribute.key; spec.value = values[attribute.key]; }
    else specifications.push({ attributeKey: attribute.key, name: attribute.name, value: values[attribute.key] });
  }
  // Remove only the known unrelated image copied by the original fixture; keep uploads.
  const existingImages = product.images.filter(image => image !== profile.inheritedImage);
  const images = existingImages.length >= 3 ? existingImages : [...new Set([...existingImages, ...profile.images])].slice(0, 3);
  const altByImage = new Map(product.images.map((image, index) => [image, product.image_alt_texts?.[index]]));
  const next: Product = {
    ...product,
    images,
    image_alt_texts: images.map((image, index) => altByImage.get(image) || `${product.name} — ${image.endsWith('.svg') ? 'prototype reference illustration' : 'product photo'} ${index + 1}`),
    description: richTextPlainText(product.description).length < 100 && profile.description ? profile.description : product.description,
    specifications,
    skus: product.skus.map(sku => ({
      ...sku,
      price: sku.price && sku.price > 0 ? sku.price : product.retail_price,
      image_url: sku.image_url && sku.image_url !== profile.inheritedImage ? sku.image_url : images[0],
    })),
  };
  // The resolved 12-piece imported brush example should be a healthy Active case.
  // Its separate TEST2 review/low-stock fixture remains unchanged.
  if (product.id === 'prod_import_review_demo') {
    const stock = Object.values(product.inventory).reduce((total, quantity) => total + quantity, 0);
    if (stock < 72) next.inventory = { ...product.inventory, wh_crjp: (product.inventory.wh_crjp ?? 0) + 72 - stock };
    next.channels = product.channels.map(listing => listing.status === 'pending' ? { ...listing, status: 'active' } : listing);
    next.channel_overrides = Object.fromEntries(Object.entries(product.channel_overrides ?? {}).map(([channel, override]) => [channel, {
      ...override,
      title: override.title?.replace(/24\s*(pieces?|[- ]piece)/i, '12 Pieces'),
      description: override.description || product.description,
      stock_quantity: String(Math.max(Number(override.stock_quantity) || 0, 20)),
      allocation_cap: String(Math.max(Number(override.allocation_cap) || 0, 20)),
    }]));
  }
  return JSON.stringify(next) === JSON.stringify(product) ? product : next;
}
