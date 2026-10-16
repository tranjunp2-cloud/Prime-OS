import { getProductCatalogSettings, saveProductCatalogSettings, type CatalogCategory } from './product-catalog-settings-store';
import type { PrimeSession } from './prime/backend-auth';

export type CategoryCreateInput = { name: string; parentId: string | null; description: string };
type CatalogSession = Pick<PrimeSession, 'role' | 'canWrite'> | null | undefined;

// Catalog configuration has no separate permission in the current session model.
// Keep creation admin-only; generic product write access is not sufficient.
export const canCreateCatalogCategory = (session: CatalogSession) => session?.role === 'admin' && session.canWrite;
const normalizeName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ');

export function categoryAncestors(category: CatalogCategory, categories: CatalogCategory[]): CatalogCategory[] | null {
  const path = [category];
  let current = category;
  const seen = new Set([current.id]);
  while (current.parentId) {
    const parent = categories.find(item => item.id === current.parentId);
    if (!parent || seen.has(parent.id)) return null;
    seen.add(parent.id);
    path.unshift(parent);
    current = parent;
  }
  return path;
}

export function categoryCreationParents(categories: CatalogCategory[]) {
  return categories.flatMap(category => {
    const path = categoryAncestors(category, categories);
    return path && path.length < 3 && path.every(item => item.status === 'Active')
      ? [{ id: category.id, label: path.map(item => item.name).join(' / ') }] : [];
  }).sort((a, b) => a.label.localeCompare(b.label));
}

export function categoryCreateErrors(input: CategoryCreateInput, categories: CatalogCategory[]) {
  const errors: Partial<Record<'name' | 'parentId' | 'description', string>> = {};
  const name = normalizeName(input.name);
  if (!name) errors.name = 'Enter a category name.';
  else if (name.length > 120) errors.name = 'Use 120 characters or fewer.';
  else if (categories.some(item => (item.parentId || null) === input.parentId && normalizeName(item.name).toLowerCase() === name.toLowerCase())) {
    errors.name = 'This name already exists under this parent. Choose another name or select the existing category.';
  }
  if (input.parentId && !categoryCreationParents(categories).some(item => item.id === input.parentId)) errors.parentId = 'Choose an active parent with fewer than 3 levels, or create at root level.';
  if (input.description.trim().length > 2000) errors.description = 'Use 2,000 characters or fewer.';
  return errors;
}

export function createCatalogCategory(input: CategoryCreateInput, session: CatalogSession): CatalogCategory {
  if (!canCreateCatalogCategory(session)) throw new Error('Only an Admin with write access can create a category.');
  // Re-read at submit: never replace another catalog edit with a stale dialog snapshot.
  const latest = getProductCatalogSettings();
  const errors = categoryCreateErrors(input, latest.categories);
  if (Object.values(errors).length) throw new Error(Object.values(errors)[0]);
  const category: CatalogCategory = {
    id: `category-${crypto.randomUUID()}`, name: normalizeName(input.name), parentId: input.parentId,
    description: input.description.trim(), status: 'Active', source: 'internal', attributes: [],
    mappings: { webstore: 'needs_review', pos: 'not_required', shopee: 'needs_review', lazada: 'needs_review', tiktok: 'needs_review', amazon: 'needs_review', rakuten: 'needs_review', social: 'not_required' },
  };
  saveProductCatalogSettings({ ...latest, categories: [...latest.categories, category] });
  return category;
}
