import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';
import { getProductCatalogSettings } from './product-catalog-settings-store';
import { assignedCategoryAttributes } from './category-schema';

/** Provider fields are optional. Never invent raw provider names for normalized imports. */
export type ImportedMappingField = { key: string; label: string; value: string | number; kind: 'text' | 'number' | 'length' | 'weight' | 'money'; unit?: string; currency?: string };
export type FieldMappingDecision = {
  mode: 'source' | 'manual' | 'master';
  source?: { channel: string; shop: string; listingId: string; fieldKey: string; fieldLabel: string; rawValue: string | number; unit?: string; currency?: string; retrievedAt?: string };
  value: string | number;
  sourceResult?: string | number;
  transform?: string;
};
export type MasterFieldMappings = Record<string, FieldMappingDecision>;
export type MappingTarget = { key: string; label: string; sourceKey?: string; kind: ImportedMappingField['kind']; unit?: string; options?: Array<{ value: string; label: string }>; multiple?: boolean; required?: boolean };
export type FieldCandidate = ImportedMappingField & { source: CatalogImportItem; normalized: boolean };

export const MASTER_MAPPING_TARGETS: MappingTarget[] = [
  { key: 'name', label: 'Product name', sourceKey: 'title', kind: 'text', required: true },
  { key: 'description', label: 'Product description', sourceKey: 'description', kind: 'text', required: true },
  { key: 'brandId', label: 'Brand', sourceKey: 'brand', kind: 'text' },
  { key: 'model_number', label: 'Model', sourceKey: 'modelNumber', kind: 'text' },
  { key: 'mpn', label: 'Manufacturer part number', sourceKey: 'mpn', kind: 'text' },
  { key: 'gtin', label: 'Barcode (GTIN)', sourceKey: 'gtin', kind: 'text' },
  { key: 'pack_quantity', label: 'Pack quantity', sourceKey: 'packQuantity', kind: 'number' },
  { key: 'categoryId', label: 'Master category', sourceKey: 'channelCategory', kind: 'text', required: true },
  { key: 'retail_price', label: 'Base price', sourceKey: 'price', kind: 'money', required: true },
  ...(['length', 'width', 'height'] as const).map(dimension => ({ key: `pkg_${dimension}`, label: `Package ${dimension} (cm)`, sourceKey: `pkg_${dimension}`, kind: 'length' as const, unit: 'cm', required: true })),
  { key: 'pkg_weight', label: 'Package weight (g)', sourceKey: 'pkg_weight', kind: 'weight', unit: 'g', required: true },
];

export function importedFieldCandidates(sources: CatalogImportItem[]): FieldCandidate[] {
  return sources.flatMap(source => {
    const known: ImportedMappingField[] = [
      { key: 'title', label: 'Listing title', value: source.title, kind: 'text' },
      { key: 'description', label: 'Description', value: source.description ?? '', kind: 'text' },
      { key: 'brand', label: 'Brand', value: source.brand ?? '', kind: 'text' },
      { key: 'modelNumber', label: 'Model', value: source.modelNumber ?? '', kind: 'text' },
      { key: 'mpn', label: 'Manufacturer part number', value: source.mpn ?? '', kind: 'text' },
      { key: 'gtin', label: 'Barcode (GTIN)', value: source.gtin ?? '', kind: 'text' },
      { key: 'packQuantity', label: 'Pack quantity', value: source.packQuantity ?? '', kind: 'number' },
      { key: 'channelCategory', label: 'Shop category', value: source.channelCategory, kind: 'text' },
      { key: 'price', label: 'Listing price', value: source.price, kind: 'money', currency: source.currency },
      ...(['length', 'width', 'height', 'weight'] as const).map(dimension => ({ key: `pkg_${dimension}`, label: `Package ${dimension}`, value: source[`pkg_${dimension}`] ?? source.shipping?.[dimension] ?? '', kind: dimension === 'weight' ? 'weight' as const : 'length' as const, unit: dimension === 'weight' ? 'g' : 'cm' })),
      ...(['attribute_material', 'attribute_color'] as const).map(key => ({ key, label: key === 'attribute_material' ? 'Material' : 'Color', value: source.channelSettings?.[key] ?? '', kind: 'text' as const })),
    ];
    return [...known.map(field => ({ ...field, source, normalized: true })), ...(source.mappingFields ?? []).map(field => ({ ...field, key: `provider:${field.key}`, source, normalized: false }))]
      .filter(field => String(field.value).trim() && (typeof field.value !== 'number' || Number.isFinite(field.value)));
  });
}

export const fieldCandidateId = (field: FieldCandidate) => JSON.stringify([field.source.channel, field.source.storeName, field.source.listingId, field.key]);
export const fieldValue = (product: Product, key: string): string | number => key.startsWith('attribute:')
  ? product.specifications?.find(spec => spec.attributeKey === key.slice(10) || (!spec.attributeKey && spec.name === getProductCatalogSettings().attributes.find(attribute => attribute.key === key.slice(10))?.name))?.value ?? ''
  : (product as unknown as Record<string, string | number>)[key] ?? '';

export function convertField(candidate: FieldCandidate, target: MappingTarget, currency: string): { value: string | number; transform?: string; error?: string } {
  if (candidate.kind !== target.kind) return { value: '', error: `Choose a ${target.kind} field for ${target.label}.` };
  if (target.key === 'categoryId') return { value: '', error: 'Shop and Master categories use different taxonomies. Choose the internal category below.' };
  if (target.key === 'brandId') {
    const value = String(candidate.value).trim().toLowerCase();
    const brands = getProductCatalogSettings().brands.filter(brand => brand.status === 'Active' && [brand.name, brand.code, ...brand.aliases].some(name => name.trim().toLowerCase() === value));
    return brands.length === 1 ? { value: brands[0].id, transform: `Catalog brand: ${brands[0].name}` } : { value: '', error: 'Choose a catalog brand. No unique brand matches this source value.' };
  }
  if (target.options) {
    const parts = target.multiple ? String(candidate.value).split(',') : [String(candidate.value)];
    const options = parts.map(value => target.options!.find(option => option.label.toLowerCase() === value.trim().toLowerCase()));
    return options.every(Boolean) ? { value: [...new Set(options.map(option => option!.value))].join(', ') } : { value: '', error: 'Choose an allowed Master value below. The source value is not in this attribute’s options.' };
  }
  if (target.kind === 'text') return { value: String(candidate.value) };
  const number = Number(candidate.value);
  if (!Number.isFinite(number) || number < 0) return { value: '', error: 'The source must contain a non-negative number.' };
  if (target.kind === 'money' && candidate.currency?.toUpperCase() !== currency.toUpperCase()) return { value: '', error: `Source uses ${candidate.currency || 'unknown currency'}; Master uses ${currency}. No automatic currency conversion.` };
  if (target.kind === 'length' || target.kind === 'weight') {
    const units: Record<string, number> = target.kind === 'length' ? { mm: 0.1, cm: 1, m: 100 } : { g: 1, kg: 1000 };
    const factor = units[candidate.unit ?? ''];
    if (factor === undefined) return { value: '', error: 'Source unit is missing or unsupported. Verify it and enter a value manually.' };
    const value = Number((number * factor).toFixed(6));
    return { value, transform: factor !== 1 ? `${number} ${candidate.unit} → ${value} ${target.unit}` : undefined };
  }
  if (target.key === 'pack_quantity' && (!Number.isInteger(number) || number < 1)) return { value: '', error: 'Pack quantity must be a positive whole number.' };
  return { value: number };
}

export function mappingDecision(candidate: FieldCandidate, value: string | number, mode: 'source' | 'manual', transform?: string): FieldMappingDecision {
  return { mode, value, sourceResult: value, transform, source: { channel: candidate.source.channel, shop: candidate.source.storeName, listingId: candidate.source.listingId, fieldKey: candidate.key, fieldLabel: candidate.label, rawValue: candidate.value, unit: candidate.unit, currency: candidate.currency, retrievedAt: candidate.source.retrievedAt } };
}

export function writeMappedField(product: Product, target: MappingTarget, value: string | number, decision: FieldMappingDecision): Product {
  const next = { ...product, field_mappings: { ...product.field_mappings, [target.key]: decision } };
  if (target.key.startsWith('attribute:')) next.specifications = [...(product.specifications ?? []).filter(spec => spec.attributeKey !== target.key.slice(10) && (spec.attributeKey || spec.name !== target.label)), { attributeKey: target.key.slice(10), name: target.label, value: String(value) }];
  else Object.assign(next, { [target.key]: value === '' && target.kind !== 'text' ? target.key === 'pack_quantity' ? undefined : 0 : value });
  if (target.key === 'brandId') next.brand = getProductCatalogSettings().brands.find(brand => brand.id === value)?.name ?? '';
  if (target.key === 'categoryId') next.category = getProductCatalogSettings().categories.find(category => category.id === value)?.name ?? '';
  return next;
}

/** Record exact copy provenance at creation, not by guessing from equal values later. */
export function initialFieldMappings(product: Product, source: CatalogImportItem): MasterFieldMappings {
  const candidates = importedFieldCandidates([source]);
  return Object.fromEntries(MASTER_MAPPING_TARGETS.flatMap(target => {
    const candidate = candidates.find(candidate => candidate.key === target.sourceKey);
    if (!candidate) return [];
    const converted = convertField(candidate, target, product.price_currency);
    return !converted.error && String(converted.value) === String(fieldValue(product, target.key))
      ? [[target.key, mappingDecision(candidate, converted.value, 'source', converted.transform)]] : [];
  }));
}

/** Only exact, unambiguous attribute matches are suggested; conflicting shops stay manual. */
export function suggestAttributeFields(product: Product, sources: CatalogImportItem[]): Product {
  let next = product;
  const settings = getProductCatalogSettings();
  const category = settings.categories.find(category => category.id === product.categoryId);
  const candidates = importedFieldCandidates(sources);
  for (const attribute of assignedCategoryAttributes(category, settings.attributes)) {
    const key = `attribute:${attribute.key}`;
    if (fieldValue(next, key) || next.field_mappings?.[key] || next.variant_options?.some(option => option.attributeKey === attribute.key)) continue;
    const target: MappingTarget = { key, label: attribute.name, kind: 'text', multiple: attribute.type === 'Multi-select', options: ['Single select', 'Multi-select'].includes(attribute.type) ? attribute.options.split(',').map(value => ({ value: value.trim(), label: value.trim() })) : undefined };
    const matches = candidates.filter(candidate => [attribute.name.toLowerCase(), attribute.key.toLowerCase()].includes(candidate.label.toLowerCase()) || candidate.key === `attribute_${attribute.key}`).map(candidate => ({ candidate, result: convertField(candidate, target, product.price_currency) })).filter(item => !item.result.error);
    if (!matches.length || new Set(matches.map(item => String(item.result.value))).size !== 1) continue;
    const { candidate, result } = matches[0];
    next = writeMappedField(next, target, result.value, mappingDecision(candidate, result.value, 'source', result.transform));
  }
  return next;
}

export function fieldMappingErrors(product: Product, sources: CatalogImportItem[] = [], baseline?: Product): string[] {
  const errors: string[] = [];
  if (product.pack_quantity != null && (!Number.isInteger(product.pack_quantity) || product.pack_quantity <= 0)) errors.push('Pack quantity must be a positive whole number.');
  const settings = getProductCatalogSettings();
  if (product.brandId && !settings.brands.some(brand => brand.id === product.brandId && brand.status === 'Active')) errors.push('Choose an active catalog brand.');
  for (const spec of product.specifications ?? []) {
    const attr = settings.attributes.find(attribute => attribute.key === spec.attributeKey && attribute.status === 'Active');
    if (attr && ['Single select', 'Multi-select'].includes(attr.type) && spec.value && (attr.type === 'Multi-select' ? spec.value.split(',') : [spec.value]).some(part => !attr.options.split(',').some(value => value.trim() === part.trim()))) errors.push(`Choose an allowed value for ${attr.name}.`);
  }
  const candidates = importedFieldCandidates(sources);
  for (const [key, decision] of Object.entries(product.field_mappings ?? {})) {
    if (decision.mode !== 'source' || !decision.source) continue;
    if (baseline && JSON.stringify(baseline.field_mappings?.[key]) === JSON.stringify(decision) && (key !== 'retail_price' || baseline.price_currency === product.price_currency)) continue;
    const source = decision.source;
    const knownSource = sources.some(item => item.channel === source.channel && item.storeName === source.shop && item.listingId === source.listingId);
    if (!knownSource) continue;
    const field = candidates.find(item => item.source.channel === source.channel && item.source.storeName === source.shop && item.source.listingId === source.listingId && item.key === source.fieldKey);
    if (!field || String(field.value) !== String(source.rawValue) || field.unit !== source.unit || field.currency !== source.currency) errors.push(`Source for ${source.fieldLabel} changed. Choose the source again or enter a value manually.`);
    if (key === 'retail_price' && source.currency?.toUpperCase() !== product.price_currency) errors.push('The selected price source uses a different currency. Choose a matching source or enter a Master price manually.');
  }
  return errors;
}
