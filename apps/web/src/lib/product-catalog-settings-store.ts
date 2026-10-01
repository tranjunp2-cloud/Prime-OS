export type CatalogRecordSource = 'internal' | 'imported';
export type ReviewStatus = 'mapped' | 'needs_review' | 'not_required';
export type CatalogChannel = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'rakuten' | 'social';

export interface CategoryChannelMapping {
  externalCategoryId: string;
  externalCategoryName: string;
  externalCategoryPath: string[];
  market: string;
  account: string;
  lastSyncedAt: string;
  confidence?: number;
  matchMethod?: 'automatic' | 'manual';
}

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
  purpose?: 'variant' | 'specification';
  groupId?: string;
  /**
   * When true, this attribute supports per-locale values.
   * Spec §5.2: only attributes with isLocalizable=true may receive a locale coordinate.
   * Rule: Rich text / Text → true; Single select / Multi-select / Measurement / Country → false.
   */
  isLocalizable: boolean;
  status: 'Active' | 'Inactive';
  source: CatalogRecordSource;
}

export interface CatalogAttributeGroup {
  id: string;
  name: string;
  description: string;
  purpose: 'variant' | 'specification';
  system?: boolean;
}

export interface CatalogBrand {
  id: string;
  name: string;
  code: string;
  manufacturer: string;
  legalName?: string;
  country: string;
  website: string;
  roles?: Array<'Brand' | 'Manufacturer' | 'Rights holder' | 'Distributor' | 'Reseller'>;
  productCount: number;
  status: 'Active' | 'Inactive';
  source: CatalogRecordSource;
  aliases: string[];
  mappings: Partial<Record<CatalogChannel, string>>;
  /** Optional local-demo selection context; not marketplace approval. */
  mappingSelections?: Partial<Record<CatalogChannel, import('./brand-marketplace-demo').BrandMappingSelection>>;
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
  channelMappings?: Partial<Record<CatalogChannel, CategoryChannelMapping>>;
}

type StoredCatalogBrand = Omit<CatalogBrand, 'status'> & {
  status: CatalogBrand['status'] | 'Verified' | 'Unverified';
};

function restoreCatalogBrand(brand: StoredCatalogBrand): CatalogBrand {
  // Legacy verification described internal records, not marketplace approval.
  // Preserve inactive brands, identities and mappings when removing that gate.
  return {
    ...brand,
    status: brand.status === 'Verified' || brand.status === 'Unverified' ? 'Active' : brand.status,
  };
}

const STORAGE_KEY = 'prime-product-catalog-settings-v2';


const mappedChannels = (overrides: Partial<Record<CatalogChannel, ReviewStatus>> = {}): Record<CatalogChannel, ReviewStatus> => ({
  webstore: 'mapped', pos: 'not_required', shopee: 'needs_review', lazada: 'needs_review',
  tiktok: 'needs_review', amazon: 'needs_review', rakuten: 'needs_review', social: 'not_required', ...overrides,
});

export const defaultCatalogAttributes: CatalogAttribute[] = [
  // Single select / Multi-select / Measurement / Country → isLocalizable: false
  // (values are canonical codes — no per-locale translation needed)
  { id: 'material', name: 'Material', key: 'material', type: 'Multi-select', categories: 8, description: 'Primary materials used to manufacture the product.', options: 'Cotton, Canvas, Natural Canvas, Leather, Metal, Paper, Plastic, Wood', unit: '', validation: 'At least one value when required by category', isLocalizable: false, status: 'Active', source: 'internal' },
  { id: 'color', name: 'Color', key: 'color', type: 'Single select', categories: 7, description: 'Canonical product color used for variants and channel mapping.', options: 'Black, Midnight Black, White, Cloud White, Red, Blue, Green', unit: '', validation: 'Select one canonical value', isLocalizable: false, status: 'Active', source: 'internal' },
  { id: 'size', name: 'Size', key: 'size', type: 'Single select', categories: 6, description: 'Canonical product size used for variants.', options: 'XS, S, M, L, XL', unit: '', validation: 'Select one canonical value', isLocalizable: false, status: 'Active', source: 'internal' },
  { id: 'paper-size', name: 'Paper Size', key: 'paper_size', type: 'Single select', categories: 3, description: 'Standard paper format used to create notebook and paper-product variants.', options: 'A4, B5, A5', unit: '', validation: 'Select one standard paper size', isLocalizable: false, status: 'Active', source: 'internal' },
  { id: 'binding-type', name: 'Binding Type', key: 'binding_type', type: 'Single select', categories: 2, description: 'Binding construction used to create book and sketchbook variants.', options: 'Hardcover, Softcover', unit: '', validation: 'Select one binding type', isLocalizable: false, status: 'Active', source: 'internal' },
  { id: 'dimensions', name: 'Dimensions', key: 'dimensions', type: 'Measurement set', categories: 10, description: 'Length, width, height and supported unit.', options: '', unit: 'cm', validation: 'Values must be greater than zero', isLocalizable: false, status: 'Active', source: 'internal' },
  { id: 'country-of-origin', name: 'Country of Origin', key: 'country_of_origin', type: 'Country selector', categories: 9, description: 'Manufacturing country used for compliance.', options: '', unit: '', validation: 'ISO 3166 country list', isLocalizable: false, status: 'Active', source: 'internal' },
  // Rich text / Text → isLocalizable: true (human-readable copy, needs translation per locale)
  { id: 'care-instructions', name: 'Care Instructions', key: 'care_instructions', type: 'Rich text', categories: 5, description: 'Handling, cleaning and storage guidance.', options: '', unit: '', validation: 'Maximum 2,000 characters', isLocalizable: true, status: 'Active', source: 'imported' },
];

export const defaultCatalogBrands: CatalogBrand[] = [
  { id: 'cyber-records', name: 'CYBER-RECORDS', code: 'CYBR', manufacturer: 'CyberRecord Japan Co.', country: 'Japan', website: 'https://cyber-records.example', productCount: 5, status: 'Active', source: 'internal', aliases: ['CyberRecords', 'CYBER RECORDS'], mappings: { amazon: 'CYBER RECORDS', shopee: '1009234', lazada: 'BR-20418' } },
  { id: 'prime-essentials', name: 'Prime Essentials', code: 'PRME', manufacturer: 'Prime Commerce', country: 'Singapore', website: 'https://prime.example', productCount: 12, status: 'Active', source: 'internal', aliases: [], mappings: { shopee: '1008871' } },
  { id: 'prime-craft', name: 'Prime Craft', code: 'PRCR', manufacturer: 'Prime Commerce', country: 'Singapore', website: 'https://prime.example', productCount: 8, status: 'Active', source: 'internal', aliases: [], mappings: { shopee: '1008872', lazada: 'BR-20419' } },
  { id: 'prime-art', name: 'Prime Art', code: 'PRAT', manufacturer: 'Prime Commerce', country: 'Singapore', website: 'https://prime.example', productCount: 4, status: 'Active', source: 'internal', aliases: [], mappings: { shopee: '1008873' } },
  { id: 'kuretake', name: 'Kuretake', code: 'KRTK', manufacturer: 'Kuretake Co., Ltd.', country: 'Japan', website: 'https://kuretake.co.jp', productCount: 1, status: 'Active', source: 'internal', aliases: ['呉竹', 'ZIG'], mappings: { amazon: 'Kuretake', shopee: '1012045', lazada: 'BR-20445' } },
  { id: 'da-vinci', name: 'Da Vinci', code: 'DVNC', manufacturer: 'Da Vinci Brushes GmbH', country: 'Germany', website: 'https://da-vinci-brushes.com', productCount: 3, status: 'Active', source: 'internal', aliases: ['DaVinci', 'da vinci brushes'], mappings: { amazon: 'Da Vinci', shopee: '1010881' } },
  { id: 'kai-industries', name: 'Kai Industries', code: 'KAII', manufacturer: 'Kai Industries Co., Ltd.', country: 'Japan', website: 'https://kai-group.com', productCount: 2, status: 'Active', source: 'internal', aliases: ['KAI', '貝印'], mappings: { amazon: 'KAI', rakuten: 'kai-group', lazada: 'BR-20501' } },
  { id: 'mijello', name: 'Mijello', code: 'MJLO', manufacturer: 'Mijello Co., Ltd.', country: 'South Korea', website: 'https://mijello.com', productCount: 2, status: 'Active', source: 'imported', aliases: ['미젤로'], mappings: { amazon: 'Mijello', shopee: '1013201' } },
  { id: 'copic', name: 'Copic', code: 'COPC', manufacturer: 'Too Copic', country: 'Japan', website: 'https://copic.jp', productCount: 1, status: 'Active', source: 'imported', aliases: ['Too Copic', 'コピック'], mappings: { amazon: 'Copic' } },
  { id: 'no-brand', name: 'No Brand', code: 'GENERIC', manufacturer: '', country: '', website: '', productCount: 8, status: 'Active', source: 'imported', aliases: ['Generic'], mappings: { amazon: 'Generic', shopee: '0', lazada: 'No Brand' } },
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
  addNode({ id: stationeryBranchId, name: 'Stationery', parentId: creativeRootId, description: 'Paper goods, notebooks and art materials.', status: 'Active', source: 'internal', attributes: [{ key: 'material', required: false }, { key: 'color', required: false }, { key: 'paper_size', required: false }], mappings: mappedChannels({ webstore: 'mapped', shopee: 'mapped', lazada: 'needs_review', tiktok: 'needs_review', amazon: 'mapped', rakuten: 'needs_review' }) });
  addNode({ id: 'art-supplies', name: 'Art Supplies', parentId: stationeryBranchId, description: 'Drawing, painting and craft supplies.', status: 'Active', source: 'internal', attributes: [{ key: 'material', required: true }, { key: 'color', required: false }], mappings: mappedChannels({ webstore: 'mapped', shopee: 'mapped', lazada: 'mapped', tiktok: 'mapped', amazon: 'mapped', rakuten: 'mapped' }) });
  addNode({ id: 'painting-accessories', name: 'Painting Accessories', parentId: stationeryBranchId, description: 'Brushes, palettes and painting tools linked to Product Masters.', status: 'Active', source: 'internal', attributes: [{ key: 'material', required: false }, { key: 'binding_type', required: false }, { key: 'paper_size', required: false }], mappings: mappedChannels({ webstore: 'mapped', shopee: 'mapped', lazada: 'mapped', tiktok: 'mapped', amazon: 'mapped', rakuten: 'mapped' }) });
  addNode({ id: emergingBranchId, name: 'Emerging Categories', parentId: creativeRootId, description: 'New categories awaiting catalog and channel setup.', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels({ webstore: 'needs_review' }) });
  addNode({ id: 'bamboo-crafts', name: 'Bamboo Crafts', parentId: emergingBranchId, description: 'Demo case: no Product Masters and no channel mappings.', status: 'Active', source: 'internal', attributes: [], mappings: mappedChannels({ webstore: 'needs_review' }) });
  return nodes;
}

export const defaultCatalogCategories: CatalogCategory[] = buildDefaultCategories();

export const defaultCatalogAttributeGroups: CatalogAttributeGroup[] = [
  { id: 'variant-attributes', name: 'Variant attributes', description: 'Create sellable combinations such as Black / Size M', purpose: 'variant', system: true },
  { id: 'materials-construction', name: 'Materials & construction', description: 'Materials, finish and how the product is made', purpose: 'specification' },
  { id: 'physical-details', name: 'Physical details', description: 'Dimensions, weight and measurable specifications', purpose: 'specification' },
  { id: 'compliance-origin', name: 'Compliance & origin', description: 'Origin, regulatory and compliance information', purpose: 'specification' },
  { id: 'product-content', name: 'Product content', description: 'Care instructions and customer-facing details', purpose: 'specification' },
];

export interface ProductCatalogSettings { categories: CatalogCategory[]; attributes: CatalogAttribute[]; brands: CatalogBrand[]; attributeGroups?: CatalogAttributeGroup[]; taxonomyVersion?: number }

function defaults(): ProductCatalogSettings {
  return {
    taxonomyVersion: 1,
    categories: defaultCatalogCategories.map(category => ({ ...category, attributes: category.attributes.map(attribute => ({ ...attribute })), mappings: { ...category.mappings }, channelMappings: { ...category.channelMappings } })),
    attributes: defaultCatalogAttributes.map(attribute => ({ ...attribute, groupId: inferredAttributeGroup(attribute) })),
    brands: defaultCatalogBrands.map(brand => ({ ...brand, aliases: [...brand.aliases], mappings: { ...brand.mappings } })),
    attributeGroups: defaultCatalogAttributeGroups.map(group => ({ ...group })),
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
  // Upgrade old demo taxonomies once. Never restore assignments the user removed.
  return [...categories, ...defaultCatalogCategories.filter(category => !existingIds.has(category.id))];
}

function ensureDemoAttributes(attributes: CatalogAttribute[]): CatalogAttribute[] {
  const byKey = new Map(defaultCatalogAttributes.map(attribute => [attribute.key, attribute]));
  const upgraded = attributes.map(attribute => {
    const currentDefault = byKey.get(attribute.key);
    if (!currentDefault) return attribute;
    const existingOptions = attribute.options.split(',').map(option => option.trim()).filter(Boolean);
    const defaultOptions = currentDefault.options.split(',').map(option => option.trim()).filter(Boolean);
    return { ...attribute, options: Array.from(new Set([...existingOptions, ...defaultOptions])).join(', '), isLocalizable: currentDefault.isLocalizable };
  });
  const existingKeys = new Set(upgraded.map(attribute => attribute.key));
  return [...upgraded, ...defaultCatalogAttributes.filter(attribute => !existingKeys.has(attribute.key))];
}

function inferredAttributeGroup(attribute: CatalogAttribute): string {
  if (attribute.groupId) return attribute.groupId;
  if (attribute.purpose === 'variant' || /(^|\s)(color|colour|size|capacity|storage|style|version|variant|paper size|binding type)(\s|$)/i.test(attribute.name)) return 'variant-attributes';
  if (/material|fabric|finish|construction/i.test(attribute.name)) return 'materials-construction';
  if (/country|origin|compliance|certification/i.test(attribute.name)) return 'compliance-origin';
  if (/dimension|weight|height|width|length|volume/i.test(attribute.name)) return 'physical-details';
  return 'product-content';
}

export function getProductCatalogSettings(): ProductCatalogSettings {
  if (typeof window === 'undefined') return defaults();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults();
    const parsed = { ...defaults(), taxonomyVersion: 0, ...JSON.parse(stored) } as Omit<ProductCatalogSettings, 'brands'> & { brands: StoredCatalogBrand[] };
    const categories = migrateLegacyCategories(parsed.categories);
    return { ...parsed, taxonomyVersion: 1, brands: parsed.brands.map(restoreCatalogBrand), categories: parsed.taxonomyVersion ? categories : ensureDemoTaxonomy(categories), attributes: ensureDemoAttributes(parsed.attributes).map(attribute => ({ ...attribute, groupId: inferredAttributeGroup(attribute) })), attributeGroups: parsed.attributeGroups?.length ? parsed.attributeGroups : defaultCatalogAttributeGroups.map(group => ({ ...group })) };
  } catch { return defaults(); }
}

export function saveProductCatalogSettings(settings: ProductCatalogSettings) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, taxonomyVersion: 1 }));
}

export function getActiveCatalogBrands() { return getProductCatalogSettings().brands.filter(item => item.status !== 'Inactive'); }
export function getActiveCatalogCategories() { return getProductCatalogSettings().categories.filter(item => item.status === 'Active'); }
/** An explicit ID is authoritative; ambiguous legacy names must be chosen again. */
export function resolveCatalogCategory(reference: { category?: string; categoryId?: string }, categories: CatalogCategory[]) {
  if (reference.categoryId) return categories.find(item => item.id === reference.categoryId);
  const name = reference.category?.trim().toLowerCase();
  if (!name) return undefined;
  const matches = categories.filter(item => item.name.trim().toLowerCase() === name);
  return matches.length === 1 ? matches[0] : undefined;
}

export function getAttributesForCategory(categoryName: string, categoryId?: string) {
  const settings = getProductCatalogSettings();
  const category = resolveCatalogCategory({ category: categoryName, categoryId }, settings.categories);
  return (category?.attributes ?? []).map(assignment => ({ ...settings.attributes.find(item => item.key === assignment.key)!, required: assignment.required })).filter(item => item.id);
}

// ─── Org Locale Config ────────────────────────────────────────────────────────
//
// Spec: active locales are driven by Org Settings + connected channel markets.
// In production this is a server-managed config. Here we seed 4 locales;
// Demo organization has Lazada Malaysia connected, so ms-MY is active at market level.
// TODO: replace with org-settings API call once backend is implemented.

export interface OrgLocaleConfig {
  /** BCP-47 locale code, e.g. 'en-US', 'ja-JP' */
  locale: string;
  /** English label, e.g. 'Japanese' */
  label: string;
  /** Native label shown in UI, e.g. '日本語' */
  nativeLabel: string;
  /** Whether this locale is active for the org. Primary locale is always enabled. */
  enabled: boolean;
  /** True only for en-US — the canonical/primary locale. */
  isPrimary: boolean;
}

export const DEFAULT_ORG_LOCALES: OrgLocaleConfig[] = [
  { locale: 'en-US', label: 'English',    nativeLabel: 'English',       enabled: true,  isPrimary: true  },
  { locale: 'ja-JP', label: 'Japanese',   nativeLabel: '日本語',         enabled: true,  isPrimary: false },
  { locale: 'vi-VN', label: 'Vietnamese', nativeLabel: 'Tiếng Việt',    enabled: true,  isPrimary: false },
  { locale: 'ms-MY', label: 'Malay',      nativeLabel: 'Bahasa Melayu', enabled: true, isPrimary: false },
];

const LOCALE_CONFIG_STORAGE_KEY = 'prime-org-locale-config-v1';

/** Returns all org locales (enabled and disabled). */
export function getOrgLocaleConfig(): OrgLocaleConfig[] {
  if (typeof window === 'undefined') return DEFAULT_ORG_LOCALES;
  try {
    const stored = window.localStorage.getItem(LOCALE_CONFIG_STORAGE_KEY);
    if (!stored) return DEFAULT_ORG_LOCALES;
    const parsed = JSON.parse(stored) as OrgLocaleConfig[];
    // Merge: ensure any new default locales added in code appear for existing users
    const existingCodes = new Set(parsed.map(l => l.locale));
    const merged = [...parsed, ...DEFAULT_ORG_LOCALES.filter(l => !existingCodes.has(l.locale))]
      .map(locale => locale.locale === 'ms-MY' ? { ...locale, enabled: true } : locale);
    return merged;
  } catch { return DEFAULT_ORG_LOCALES; }
}

/** Saves the full org locale config to localStorage. */
export function saveOrgLocaleConfig(config: OrgLocaleConfig[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

/** Returns only the locales that are currently enabled for this org. */
export function getActiveOrgLocales(): OrgLocaleConfig[] {
  return getOrgLocaleConfig().filter(l => l.enabled);
}
