import { useId } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { VariantMappings } from '@/lib/listing-master-completion';
import { resolveSourceSkuMappings, sourceSkuDataError, sourceSkuItems, suggestSourceSkuMappings } from '@/lib/listing-sku-mapping';

/** Relationship fields; SKU proposals are reviewed in the adjacent completion form. */
export function ListingSkuMappings({ product, sources, mappings, onChange, onReload }: {
  product: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  onChange: (value: VariantMappings) => void;
  onReload?: (sourceId: string) => void;
}) {
  const prefix = useId();
  const skus = product.skus.filter(sku => sku.status === 'active');
  return <section className="space-y-4 border-t pt-4" aria-label="Map source SKUs">
    <h3 className="text-sm font-semibold">Map source SKUs</h3>
    <p className="text-xs leading-5 text-muted-foreground">Shop SKUs are filled from listing data. Review the suggested matches before confirming.</p>
    {!skus.length && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">This Master has no available variant SKUs. Set up SKUs in this review, or save the link and finish later.</p>}
    {sources.map(source => {
      const items = sourceSkuItems(source);
      const rows = resolveSourceSkuMappings(source, product, mappings[source.id]);
      const suggestions = suggestSourceSkuMappings(source, product);
      const sourceError = sourceSkuDataError(source);
      const selectedCount = rows.filter(row => skus.some(sku => sku.id === row.master_sku_id)).length;
      return <div key={source.id} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="font-medium">{source.storeName} · {source.channelSku}</p>
          <p className="text-muted-foreground">Listing: {source.variants || items.length} SKUs · Master: {skus.length} SKUs{!sourceError && ` · ${selectedCount}/${items.length} matched`}</p>
        </div>
        {sourceError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="min-w-0 flex-1 space-y-1"><p className="flex items-center gap-2 text-sm font-medium"><TriangleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />Listing SKU data is incomplete</p><p className="text-xs leading-5 text-muted-foreground">{items.length} of {source.variants || 'unknown'} SKUs loaded. {sourceError.includes('duplicate') ? 'Duplicate SKU codes were received. ' : ''}Reload the imported listing data. If details are still missing, sync this listing from its channel first.</p></div>
          {onReload && <Button variant="outline" className="h-11" onClick={() => onReload(source.id)}><RefreshCw className="size-4" />Reload listing data</Button>}
        </div>}
        {!!items.length && <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-2 gap-4 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid"><span>Shop SKU</span><span>Master SKU</span></div>
          {items.map((item, index) => {
            const row = rows[index];
            const suggested = !mappings[source.id] && suggestions[index]?.master_sku_id;
            const hintId = `${prefix}-${source.id}-${index}-hint`;
            return <div key={`${item.sku}:${index}`} className="grid gap-3 border-b p-4 last:border-0 sm:grid-cols-2 sm:items-center sm:gap-4">
              <div className="min-w-0 space-y-1"><p className="text-sm font-medium">{item.label || 'Variant name not provided'}</p><p className="break-all font-mono text-xs text-muted-foreground">{item.sku || 'SKU code not loaded'}</p></div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor={`${hintId}-select`} className="block text-xs text-muted-foreground sm:hidden">Master SKU</label>
                <select id={`${hintId}-select`} aria-label={`Master SKU for shop SKU ${index + 1}`} aria-describedby={hintId} className="h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" disabled={Boolean(sourceError) || !skus.length} value={row.master_sku_id} onChange={event => onChange({ ...mappings, [source.id]: rows.map((value, i) => i === index ? { ...value, master_sku_id: event.target.value } : value) })}>
                  <option value="">Choose Master SKU</option>{skus.map(sku => <option key={sku.id} value={sku.id}>{sku.sku_code} · {sku.variation_name}</option>)}
                </select>
                <p id={hintId} className="text-xs text-muted-foreground">{sourceError ? 'Waiting for complete listing data' : suggested ? `Suggested · ${suggestions[index].reason}` : row.master_sku_id ? 'Selected for linking' : 'No match selected'}</p>
              </div>
            </div>;
          })}
        </div>}
      </div>;
    })}
  </section>;
}
