import type { Product } from './product-store';
import type { VariantGroup, VariantItem } from './product-master-readiness';
import { getInventoryPositions } from './inventory-store';

export const MAX_VARIANT_COMBINATIONS = 200;
export const MAX_VARIANT_ATTRIBUTES = 2;
export const supportsVariantAttribute = (attribute: { type: string }) => ['Single select', 'Multi-select', 'Enum', 'Array'].includes(attribute.type);
/** Only product attributes and their selected values participate, never catalog defaults. */
export function automaticVariantGroups(attributes: Array<{ key: string; name: string; currentValues: string[] }>): VariantGroup[] {
  return [...new Map(attributes.map(attribute => [attribute.key, attribute])).values()].slice(0, MAX_VARIANT_ATTRIBUTES).map(attribute => ({
    id: `auto-option-${attribute.key}`, attributeKey: attribute.key, name: attribute.name,
    values: [...new Map(attribute.currentValues.map(value => value.trim()).filter(Boolean).map(value => [value.toLowerCase(), value])).values()],
  }));
}
export const axisKey = (group: VariantGroup) => group.attributeKey || group.name.trim().toLowerCase();
const normalized = (value: string) => value.trim().toLowerCase();
const identity = (values: Record<string, string>) => JSON.stringify(Object.entries(values).map(([key, value]) => [key, normalized(value)]).sort(([a], [b]) => a.localeCompare(b)));

export function itemOptionValues(item: VariantItem, groups: VariantGroup[]) {
  return item.option_values ?? Object.fromEntries(groups.map((group, index) => [axisKey(group), item.key.split(' / ')[index] ?? '']));
}

export function variantCombinations(groups: VariantGroup[]) {
  const count = groups.length ? groups.reduce((total, group) => total * group.values.length, 1) : 0;
  if (!count || count > MAX_VARIANT_COMBINATIONS) return { count, rows: [] as Array<{ key: string; values: Record<string, string> }> };
  const combinations = groups.reduce<string[][]>((rows, group) => rows.flatMap(row => group.values.map(value => [...row, value])), [[]]);
  return { count, rows: combinations.map(values => ({ key: values.join(' / '), values: Object.fromEntries(groups.map((group, index) => [axisKey(group), values[index]])) })) };
}

/** Persisted SKUs are explicitly retained/remapped, or archived without deleting identity/history. */
export function planVariants({ groups, previousGroups, items, parentSku, basePrice, excluded = [], assignments = {} }: {
  groups: VariantGroup[]; previousGroups: VariantGroup[]; items: VariantItem[]; parentSku: string; basePrice: string;
  excluded?: string[]; assignments?: Record<string, string>;
}) {
  const combinations = variantCombinations(groups);
  const rows = combinations.rows.filter(row => !excluded.includes(row.key));
  const used = new Set<VariantItem>();
  const next = rows.map(row => {
    // An explicit mapping takes precedence over the inferred match, never over another explicit mapping.
    const assigned = items.find(item => item.id && assignments[item.id] === row.key);
    const existing = assigned ?? items.find(item => !used.has(item) && (!item.id || !assignments[item.id]) && identity(itemOptionValues(item, previousGroups)) === identity(row.values));
    if (existing) used.add(existing);
    return existing ? { ...existing, key: row.key, option_values: row.values, selected: true } : {
      key: row.key, option_values: row.values, sku_code: `${parentSku}-${row.key.replace(/ \/ /g, '-').replace(/\s+/g, '-').toUpperCase()}`,
      price: basePrice, stock: '', stock_by_location: {}, image_url: '', selected: true,
    } satisfies VariantItem;
  });
  const unresolved = items.filter(item => item.id && item.selected && !used.has(item) && assignments[item.id] !== '__archive');
  const archived = items.filter(item => item.id && !used.has(item) && (!item.selected || assignments[item.id] === '__archive')).map(item => ({ ...item, selected: false }));
  const duplicateAssignments = Object.values(assignments).filter(value => value && value !== '__archive').some((value, index, values) => values.indexOf(value) !== index);
  return { count: combinations.count, rows: combinations.rows, items: [...next, ...archived], unresolved, archived, duplicateAssignments,
    added: next.filter(item => !item.id).length, kept: next.filter(item => item.id).length,
    newlyArchived: archived.filter(item => items.find(previous => previous.id === item.id)?.selected) };
}

/** Conservative guard: never retire a SKU with recorded stock or a shop mapping through the option editor. */
export function variantArchiveBlock(item: VariantItem, product?: Product | null) {
  if (getInventoryPositions().some(position => position.sku_id === item.id && [position.on_hand, position.reserved_unpaid, position.reserved_paid, position.allocated, position.inbound, position.outbound, position.return_pending, position.unfulfillable].some(value => Number(value || 0) !== 0))) return 'This SKU has inventory or outstanding stock commitments. Resolve them before archiving.';
  if (Number(item.stock) > 0 || Object.values(item.stock_by_location).some(value => Number(value) !== 0)) return 'This SKU has recorded stock. Resolve its inventory before archiving.';
  if (product?.channels.some(listing => (listing.external_id && !listing.variant_mappings?.length) || [...(listing.variant_mappings ?? []), ...(listing.review_pending?.draft_mappings ?? [])].some(mapping => mapping.master_sku_id === item.id))) return 'This SKU is linked to a listing. Review its listing mappings before archiving.';
  return '';
}

export function singleSkuForConversion(product: Product): VariantItem {
  const sku = product.skus.find(item => item.status === 'active') ?? product.skus[0];
  return { id: sku?.id ?? `${product.id}-single-sku`, key: 'Existing single SKU', sku_code: sku?.sku_code ?? product.sku_code,
    price: String(sku?.price ?? product.retail_price), stock: String(Object.values(product.inventory).reduce((sum, value) => sum + value, 0)),
    stock_by_location: Object.fromEntries(Object.entries(product.inventory).map(([id, count]) => [id, String(count)])),
    selected: true, image_url: sku?.image_url ?? product.images[0] ?? '', option_values: {} };
}
