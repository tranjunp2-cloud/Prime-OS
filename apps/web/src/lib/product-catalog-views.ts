import type { Product } from './product-store';
import { getCatalogImportItems } from './catalog-import-store';
import { getStoredMasterReadiness } from './product-master-readiness';

export type CatalogView = 'all' | 'todo' | 'active' | 'archived';
export type TodoFilter = 'all' | 'issues' | 'drafts';
export type ProductSourceFilter = 'all' | 'manual' | 'imported';
export type DraftReadinessFilter = 'all' | 'ready' | 'incomplete';

/** Review is an unpublished workflow state, so it belongs in the Draft queue. */
export function isDraftMaster(product: Product) {
  return product.status === 'draft' || product.status === 'review';
}

export function isImportedMaster(product: Product) {
  // Publishing a manually-created Master used to set import_result=published too.
  // That flag alone is not provenance; use actual source/link evidence.
  return Boolean(product.import_source?.trim() || product.import_sources?.length
    || (product.import_result && product.import_result !== 'published')
    || getCatalogImportItems().some(item => item.resolvedProductId === product.id && ['link', 'create'].includes(item.resolution)));
}

export function isMasterReadyToPublish(product: Product) {
  return isDraftMaster(product) && getStoredMasterReadiness(product).ready;
}

export function matchesCatalogView(product: Product, view: CatalogView, needsAttention: boolean) {
  if (view === 'todo') return needsAttention || isDraftMaster(product);
  if (view === 'active') return product.status === 'published';
  if (view === 'archived') return product.status === 'archived';
  return true;
}

/** Work queues overlap; they never change the product's lifecycle status. */
export function matchesTodoFilter(product: Product, filter: TodoFilter, needsAttention: boolean) {
  if (filter === 'issues') return needsAttention;
  if (filter === 'drafts') return isDraftMaster(product);
  return matchesCatalogView(product, 'todo', needsAttention);
}
