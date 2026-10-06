import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { VariantMappings } from '@/lib/listing-master-completion';

/** Relationship fields only: existing Master SKUs cannot be edited here. */
export function ListingSkuMappings({ product, sources, mappings, onChange }: {
  product: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  onChange: (value: VariantMappings) => void;
}) {
  const prefix = useId();
  const skus = product.skus.filter(sku => sku.status === 'active');
  return <section className="space-y-4 border-t pt-4" aria-label="Map source SKUs">
    <h3 className="text-sm font-semibold">Map source SKUs</h3>
    <p className="text-xs text-muted-foreground">Choose the existing Master SKU for each shop SKU. Master details and status stay unchanged.</p>
    {!skus.length && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">This Master has no available variant SKUs. Choose another Master, or configure its SKUs in the Product Editor first.</p>}
    {sources.map(source => {
      const rows = mappings[source.id] ?? Array.from({ length: source.variants || Math.max(1, skus.length) }, (_, index) => ({ shop_sku: source.variantItems?.[index]?.sku ?? (source.variants === 1 ? source.channelSku : ''), master_sku_id: '' }));
      const update = (index: number, patch: Partial<typeof rows[number]>) => onChange({ ...mappings, [source.id]: rows.map((row, i) => i === index ? { ...row, ...patch } : row) });
      return <div key={source.id} className="space-y-3"><p className="text-xs font-medium">{source.storeName} · {source.channelSku}</p>{rows.map((row, index) => <div key={index} className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor={`${prefix}-${source.id}-${index}-source`}>Shop SKU {index + 1}</Label><Input id={`${prefix}-${source.id}-${index}-source`} className="h-11" value={row.shop_sku} readOnly={Boolean(source.variantItems?.[index]?.sku) || source.variants === 1} onChange={event => update(index, { shop_sku: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor={`${prefix}-${source.id}-${index}-master`}>Master SKU for shop SKU {index + 1}</Label><select id={`${prefix}-${source.id}-${index}-master`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={row.master_sku_id} onChange={event => update(index, { master_sku_id: event.target.value })}><option value="">Choose Master SKU</option>{skus.map(sku => <option key={sku.id} value={sku.id}>{sku.sku_code} · {sku.variation_name}</option>)}</select></div>
      </div>)}</div>;
    })}
  </section>;
}
