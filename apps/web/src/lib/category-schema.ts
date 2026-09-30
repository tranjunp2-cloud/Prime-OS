import { resolveCatalogCategory, type CatalogAttribute, type CatalogCategory } from './product-catalog-settings-store';
import type { Product } from './product-store';

export type Specification = NonNullable<Product['specifications']>[number];
type AssignedAttribute = CatalogAttribute & { required: boolean };

export function assignedCategoryAttributes(category: CatalogCategory | undefined, attributes: CatalogAttribute[]): AssignedAttribute[] {
  return (category?.attributes ?? []).flatMap(assignment => {
    const definition = attributes.find(attribute => attribute.key === assignment.key);
    return definition && definition.key !== 'brand' ? [{ ...definition, required: assignment.required }] : [];
  });
}

export function matchesAttribute(spec: Specification, attribute: Pick<CatalogAttribute, 'key' | 'name'>) {
  return spec.attributeKey ? spec.attributeKey === attribute.key : spec.name.trim().toLowerCase() === attribute.name.trim().toLowerCase();
}

/** Preserve every existing value, even if an assignment disappears or names collide. */
export function reconcileSpecifications<T extends Specification>(current: T[], attributes: AssignedAttribute[], create: (attribute: AssignedAttribute) => T): T[] {
  const used = new Set<T>();
  const active = attributes.map(attribute => {
    const existing = current.find(spec => spec.attributeKey === attribute.key)
      ?? current.find(spec => !spec.attributeKey && matchesAttribute(spec, attribute));
    if (!existing) return create(attribute);
    used.add(existing);
    return { ...existing, attributeKey: attribute.key, name: attribute.name };
  });
  return [...active, ...current.filter(spec => !used.has(spec))];
}

export function retainedSpecifications(specifications: Specification[], attributes: AssignedAttribute[]) {
  return specifications.filter(spec => !attributes.some(attribute => matchesAttribute(spec, attribute)));
}

/** No category filter here: non-applicable and legacy custom values are still owned by the Master. */
export function serializeSpecifications(specifications: Specification[]): Specification[] {
  return specifications.filter(spec => spec.name.trim() || spec.attributeKey).map(({ attributeKey, name, value }) => ({ attributeKey, name, value }));
}

type AttributeValues = { specifications?: Specification[]; variant_options?: Product['variant_options']; has_variants?: boolean };
export function missingCategoryAttributes(attributes: AssignedAttribute[], values: AttributeValues) {
  return attributes.filter(attribute => attribute.required
    && !values.specifications?.some(spec => matchesAttribute(spec, attribute) && spec.value.trim())
    && !(values.has_variants && values.variant_options?.some(option => option.attributeKey === attribute.key && option.values.some(value => value.trim()))));
}

export function categorySchemaDiff(before: CatalogCategory | undefined, after: CatalogCategory) {
  const old = new Map((before?.attributes ?? []).map(attribute => [attribute.key, attribute]));
  const next = new Map(after.attributes.map(attribute => [attribute.key, attribute]));
  return {
    added: after.attributes.filter(attribute => !old.has(attribute.key)).map(attribute => attribute.key),
    removed: (before?.attributes ?? []).filter(attribute => !next.has(attribute.key)).map(attribute => attribute.key),
    required: after.attributes.filter(attribute => attribute.required && !old.get(attribute.key)?.required).map(attribute => attribute.key),
    optional: after.attributes.filter(attribute => !attribute.required && old.get(attribute.key)?.required).map(attribute => attribute.key),
  };
}

export function categoryConfigurationImpact(before: CatalogCategory, after: CatalogCategory, categories: CatalogCategory[], attributes: CatalogAttribute[], products: Product[]) {
  // Assignments are direct, not inherited from category ancestors.
  const affected = products.filter(product => resolveCatalogCategory(product, categories)?.id === before.id);
  const unresolved = products.filter(product => !product.categoryId && !resolveCatalogCategory(product, categories)
    && product.category.trim().toLowerCase() === before.name.trim().toLowerCase());
  const oldAttributes = assignedCategoryAttributes(before, attributes);
  const newAttributes = assignedCategoryAttributes(after, attributes);
  const newlyIncomplete = affected.flatMap(product => {
    const alreadyMissing = new Set(missingCategoryAttributes(oldAttributes, product).map(attribute => attribute.key));
    const missing = missingCategoryAttributes(newAttributes, product).filter(attribute => !alreadyMissing.has(attribute.key));
    return missing.length ? [{ product, missing }] : [];
  });
  return { ...categorySchemaDiff(before, after), affected, unresolved, newlyIncomplete };
}
