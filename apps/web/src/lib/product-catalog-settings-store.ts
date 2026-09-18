export type CatalogRecordSource = 'internal' | 'imported';
export type ReviewStatus = 'mapped' | 'needs_review' | 'not_required';
export type CatalogChannel = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'rakuten' | 'social';

export interface CatalogAttribute {
  id: string;
  name: string;
  key: string;
  type: string;
  categories: number;
  description: string;
  options: string;
  unit: string;
  validation: string;
  status: 'Active' | 'Inactive';
  source: CatalogRecordSource;
}

export interface CatalogBrand {
  id: string;
  name: string;
  code: string;
  manufacturer: string;
  country: string;
  website: string;
  productCount: number;
  status: 'Verified' | 'Unverified' | 'Inactive';
  source: CatalogRecordSource;
  aliases: string[];
  mappings: Partial<Record<CatalogChannel, string>>;
}

export interface CatalogCategory {
  id: string;
  name: string;
  parentId: string | null;
  /** Legacy fields retained only so older browser demo data can be migrated. */
  group?: string;
  parent?: string;
  description: string;
  status: 'Active' | 'Inactive';
  source: CatalogRecordSource;
  attributes: Array<{ key: string; required: boolean }>;
  mappings: Record<CatalogChannel, ReviewStatus>;
}

const STORAGE_KEY = 'prime-product-catalog-settings-v1';

const mappedChannels = (overrides: Partial<Record<CatalogChannel, ReviewStatus>> = {}): Record<CatalogChannel, ReviewStatus> => ({
  webstore: 'mapped', pos: 'not_required', shopee: 'needs_review', lazada: 'needs_review',
  tiktok: 'needs_review', amazon: 'needs_review', rakuten: 'needs_review', social: 'not_required', ...overrides,
});

export const defaultCatalogAttributes: CatalogAttribute[] = [
  { id: 'material', name: 'Material', key: 'material', type: 'Multi-select', categories: 8, description: 'Primary materials used to manufacture the product.', options: 'Cotton, Leather, Metal, Plastic, Wood', unit: '', validation: 'At least one value when required by category', status: 'Active', source: 'internal' },
  { id: 'color', name: 'Color', key: 'color', type: 'Single select', categories: 7, description: 'Canonical product color used for variants and channel mapping.', options: 'Black, White, Red, Blue, Green', unit: '', validation: 'Select one canonical value', status: 'Active', source: 'internal' },
  { id: 'size', name: 'Size', key: 'size', type: 'Single select', categories: 6, description: 'Canonical product size used for variants.', options: 'XS, S, M, L, XL', unit: '', validation: 'Select one canonical value', status: 'Active', source: 'internal' },
  { id: 'dimensions', name: 'Dimensions', key: 'dimensions', type: 'Measurement set', categories: 10, description: 'Length, width, height and supported unit.', options: '', unit: 'cm', validation: 'Values must be greater than zero', status: 'Active', source: 'internal' },
  { id: 'country-of-origin', name: 'Country of Origin', key: 'country_of_origin', type: 'Country selector', categories: 9, description: 'Manufacturing country used for compliance.', options: '', unit: '', validation: 'ISO 3166 country list', status: 'Active', source: 'internal' },
  { id: 'care-instructions', name: 'Care Instructions', key: 'care_instructions', type: 'Rich text', categories: 5, description: 'Handling, cleaning and storage guidance.', options: '', unit: '', validation: 'Maximum 2,000 characters', status: 'Active', source: 'imported' },
];

export const defaultCatalogBrands: CatalogBrand[] = [
  { id: 'cyber-records', name: 'CYBER-RECORDS', code: 'CYBR', manufacturer: 'CyberRecord Japan Co.', country: 'Japan', website: 'https://cyber-records.example', productCount: 5, status: 'Verified', source: 'internal', aliases: ['CyberRecords', 'CYBER RECORDS'], mappings: { amazon: 'CYBER RECORDS', shopee: '1009234', lazada: 'BR-20418' } },
  { id: 'prime-essentials', name: 'Prime Essentials', code: 'PRME', manufacturer: 'Prime Commerce', country: 'Singapore', website: 'https://prime.example', productCount: 12, status: 'Verified', source: 'internal', aliases: [], mappings: { shopee: '1008871' } },
  { id: 'no-brand', name: 'No Brand', code: 'GENERIC', manufacturer: '', country: '', website: '', productCount: 8, status: 'Unverified', source: 'imported', aliases: ['Generic'], mappings: { amazon: 'Generic', shopee: '0', lazada: 'No Brand' } },
];

const defs = [
  ['jacket', 'Jacket', 'Fashion', 'Apparel', ['material', 'color', 'size']],
  ['shoe', 'Shoe', 'Fashion', 'Apparel', ['material', 'color', 'size']],
  ['hat', 'Hat', 'Fashion', 'Apparel', ['material', 'color', 'size']],
  ['bag', 'Bag', 'Fashion', 'Accessories', ['material', 'color', 'dimensions']],
  ['watch', 'Watch', 'Fashion', 'Accessories', ['material', 'color', 'dimensions']],
  ['sunglasses', 'Sunglasses', 'Fashion', 'Accessories', ['material', 'color']],
  ['electronics', 'Electronics', 'Electronics', 'Consumer Electronics', ['dimensions', 'country_of_origin']],
  ['headphones', 'Headphones', 'Electronics', 'Consumer Electronics', ['color', 'dimensions']],
  ['home-living', 'Home & Living', 'Lifestyle', 'Home & Living', ['material', 'dimensions']],
  ['food-beverages', 'Food & Beverages', 'Lifestyle', 'Home & Living', ['country_of_origin']],
  ['sports', 'Sports', 'Lifestyle', 'Leisure', ['material', 'dimensions']],
  ['bicycle', 'Bicycle', 'Lifestyle', 'Leisure', ['color', 'dimensions']],
  ['books', 'Books', 'Lifestyle', 'Leisure', []],
  ['toys', 'Toys', 'Lifestyle', 'Leisure', ['material', 'country_of_origin']],
  ['beauty-personal-care', 'Beauty & Personal Care', 'Personal Care', 'Beauty', ['country_of_origin']],
] as const;

function taxonomyId(prefix: 'root' | 'branch', ...parts: string[]) {
  return `category-${prefix}-${parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function buildDefaultCategories(): CatalogCategory[] {
  const nodes: CatalogCategory[] = [];
  const seen = new Set<string>();
  const addNode = (category: CatalogCategory) => {
    if (!seen.has(category.id)) { seen.add(category.id); nodes.push(category); }
  };

  defs.forEach(([id, name, group, parent, keys], index) => {
    const rootId = taxonomyId('root', group);
    const branchId = taxonomyId('branch', group, parent);
    addNode({ id: rootId, name: group, parentId: null, description: '', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels() });
    addNode({ id: branchId, name: parent, parentId: rootId, description: '', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels() });
    addNode({
      id, name, parentId: branchId, description: '', status: 'Active', source: index > 12 ? 'imported' : 'internal',
      attributes: keys.map((key, keyIndex) => ({ key, required: keyIndex < 2 })),
      mappings: mappedChannels({ webstore: 'mapped', shopee: index % 3 ? 'mapped' : 'needs_review', lazada: index % 2 ? 'needs_review' : 'mapped', amazon: index % 4 ? 'mapped' : 'needs_review' }),
    });
  });

  const creativeRootId = taxonomyId('root', 'Office & Creative');
  const stationeryBranchId = taxonomyId('branch', 'Office & Creative', 'Stationery');
  const emergingBranchId = taxonomyId('branch', 'Office & Creative', 'Emerging Categories');
  addNode({ id: creativeRootId, name: 'Office & Creative', parentId: null, description: 'Office, stationery and creative product taxonomy.', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels() });
  addNode({ id: stationeryBranchId, name: 'Stationery', parentId: creativeRootId, description: 'Paper goods, notebooks and art materials.', status: 'Active', source: 'internal', attributes: [{ key: 'material', required: false }], mappings: mappedChannels({ webstore: 'mapped', shopee: 'mapped', lazada: 'needs_review', tiktok: 'needs_review', amazon: 'mapped', rakuten: 'needs_review' }) });
  addNode({ id: 'art-supplies', name: 'Art Supplies', parentId: stationeryBranchId, description: 'Drawing, painting and craft supplies.', status: 'Active', source: 'internal', attributes: [{ key: 'material', required: true }, { key: 'color', required: false }], mappings: mappedChannels({ webstore: 'mapped', shopee: 'mapped', lazada: 'mapped', tiktok: 'mapped', amazon: 'mapped', rakuten: 'mapped' }) });
  addNode({ id: 'painting-accessories', name: 'Painting Accessories', parentId: stationeryBranchId, description: 'Brushes, palettes and painting tools linked to Product Masters.', status: 'Active', source: 'internal', attributes: [{ key: 'material', required: true }], mappings: mappedChannels({ webstore: 'mapped', shopee: 'mapped', lazada: 'mapped', tiktok: 'mapped', amazon: 'mapped', rakuten: 'mapped' }) });
  addNode({ id: emergingBranchId, name: 'Emerging Categories', parentId: creativeRootId, description: 'New categories awaiting catalog and channel setup.', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels({ webstore: 'needs_review' }) });
  addNode({ id: 'bamboo-crafts', name: 'Bamboo Crafts', parentId: emergingBranchId, description: 'Demo case: no Product Masters and no channel mappings.', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels({ webstore: 'needs_review' }) });
  return nodes;
}

export const defaultCatalogCategories: CatalogCategory[] = buildDefaultCategories();

export interface ProductCatalogSettings { categories: CatalogCategory[]; attributes: CatalogAttribute[]; brands: CatalogBrand[] }

function defaults(): ProductCatalogSettings {
  return {
    categories: defaultCatalogCategories.map(category => ({ ...category, attributes: category.attributes.map(attribute => ({ ...attribute })), mappings: { ...category.mappings } })),
    attributes: defaultCatalogAttributes.map(attribute => ({ ...attribute })),
    brands: defaultCatalogBrands.map(brand => ({ ...brand, aliases: [...brand.aliases], mappings: { ...brand.mappings } })),
  };
}

function migrateLegacyCategories(input: CatalogCategory[]): CatalogCategory[] {
  if (input.every(category => Object.prototype.hasOwnProperty.call(category, 'parentId'))) {
    return input.map(category => ({ ...category, parentId: category.parentId ?? null }));
  }

  const migrated: CatalogCategory[] = [];
  const seen = new Set<string>();
  const addNode = (category: CatalogCategory) => {
    if (!seen.has(category.id)) { seen.add(category.id); migrated.push(category); }
  };

  input.forEach(category => {
    const group = category.group?.trim();
    const legacyParent = category.parent?.trim();
    if (!group) {
      addNode({ ...category, parentId: null });
      return;
    }
    const rootId = taxonomyId('root', group);
    addNode({ id: rootId, name: group, parentId: null, description: '', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels() });
    const hasBranch = Boolean(legacyParent && legacyParent !== 'None (root category)' && legacyParent !== group);
    const parentId = hasBranch ? taxonomyId('branch', group, legacyParent!) : rootId;
    if (hasBranch) addNode({ id: parentId, name: legacyParent!, parentId: rootId, description: '', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels() });
    addNode({ ...category, parentId });
  });
  return migrated;
}

function ensureDemoTaxonomy(categories: CatalogCategory[]): CatalogCategory[] {
  const existingIds = new Set(categories.map(category => category.id));
  return [...categories, ...defaultCatalogCategories.filter(category => !existingIds.has(category.id))];
}

export function getProductCatalogSettings(): ProductCatalogSettings {
  if (typeof window === 'undefined') return defaults();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults();
    const parsed = { ...defaults(), ...JSON.parse(stored) } as ProductCatalogSettings;
    return { ...parsed, categories: ensureDemoTaxonomy(migrateLegacyCategories(parsed.categories)) };
  } catch { return defaults(); }
}

export function saveProductCatalogSettings(settings: ProductCatalogSettings) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getActiveCatalogBrands() { return getProductCatalogSettings().brands.filter(item => item.status !== 'Inactive'); }
export function getActiveCatalogCategories() { return getProductCatalogSettings().categories.filter(item => item.status === 'Active'); }
export function getAttributesForCategory(categoryName: string) {
  const settings = getProductCatalogSettings();
  const category = settings.categories.find(item => item.name === categoryName);
  return (category?.attributes ?? []).map(assignment => ({ ...settings.attributes.find(item => item.key === assignment.key)!, required: assignment.required })).filter(item => item.id);
}
