import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, PackageX } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Product } from '@/lib/product-store';
import { productListStock } from '@/lib/product-list-stock';
import { getWarehouses } from '@/lib/warehouse-store';
import { cn } from '@/lib/utils';

export function ProductVariantStockBreakdown({ product, id }: { product: Product; id: string }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const location = useLocation();
  const { variants } = productListStock(product);
  const warehouses = getWarehouses();
  return <section id={id} aria-label={`Variant stock for ${product.name}`} className="border-l-2 border-primary/25 bg-muted/20 px-4 py-3 text-foreground">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div><h3 className="text-sm font-semibold">Variant stock</h3><p className="mt-0.5 text-xs text-muted-foreground">Recorded quantities across all locations, including channel-managed stock.</p></div>
      <Link to={`/products/${product.id}/edit?section=setup&setupSection=sales`} state={{ from: `${location.pathname}${location.search}` }} className="inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Manage variants</Link>
    </div>
    {!variants.length ? <p className="py-4 text-sm text-muted-foreground">No variants yet. Add variant options in Product setup.</p> : <table className="w-full text-left text-sm" aria-label={`Variants of ${product.name}`}>
      <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="w-14 py-2 pr-3 font-medium">Image</th><th scope="col" className="px-3 py-2 font-medium">Variant</th><th scope="col" className="px-3 py-2 font-medium">SKU</th><th scope="col" className="w-48 py-2 pl-3 text-right font-medium">Recorded stock</th></tr></thead>
      <tbody>{variants.map(({ sku, total, incomplete, locations, status }) => {
        const open = expanded.includes(sku.id);
        const detailsId = `${id}-${sku.id}-warehouses`;
        const label = sku.variation_name || Object.values(sku.option_values ?? {}).join(' / ') || sku.sku_code;
        const image = sku.image_url || product.images[0];
        const tone = sku.status === 'inactive' ? 'text-muted-foreground' : status === 'out-of-stock' ? 'text-rose-700 dark:text-rose-300' : status === 'low-stock' ? 'text-amber-700 dark:text-amber-300' : 'text-foreground';
        const stockLabel = total === null ? 'Not recorded' : `${total.toLocaleString()}${incomplete ? ' · Partial' : ''}`;
        return <Fragment key={sku.id}>
          <tr className="border-b border-border/60 last:border-0">
            <td className="py-2 pr-3"><div className="relative grid size-9 place-items-center overflow-hidden rounded border bg-background"><PackageX aria-hidden="true" className="size-4 text-muted-foreground" />{image && <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-contain" onError={event => { event.currentTarget.style.display = 'none'; }} />}</div></td>
            <th scope="row" className="px-3 py-2 text-left font-medium"><span className="break-words">{label}</span>{sku.status === 'inactive' && <span className="ml-2 rounded border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">Inactive</span>}</th>
            <td className="break-all px-3 py-2 font-mono text-xs">{sku.sku_code}</td>
            <td className="py-1 pl-3 text-right">{locations.length ? <button type="button" aria-expanded={open} aria-controls={open ? detailsId : undefined} aria-label={`Stock by warehouse for ${sku.sku_code}`} onClick={() => setExpanded(current => open ? current.filter(value => value !== sku.id) : [...current, sku.id])} className={cn('ml-auto flex min-h-11 items-center justify-end gap-2 rounded px-2 text-right hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', tone)}><span><strong className="block font-semibold tabular-nums">{stockLabel}</strong>{sku.status === 'active' && (status === 'out-of-stock' || status === 'low-stock') && <span className="block text-xs">{status === 'out-of-stock' ? 'Out of stock' : 'Low stock'}</span>}</span><ChevronDown aria-hidden="true" className={cn('size-3.5 shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-180')} /></button> : <span className="text-xs text-muted-foreground">Not recorded</span>}</td>
          </tr>
          {open && <tr><td colSpan={4} className="pb-3 pl-14 pt-1"><div id={detailsId} role="region" aria-label={`Warehouses for ${sku.sku_code}`} className="rounded-md border bg-background px-3">
            {locations.map(item => {
              const warehouse = warehouses.find(value => value.id === item.id);
              const external = warehouse?.is_virtual || ['fba', 'fbs'].includes(warehouse?.type ?? '');
              return <div key={item.id} className="flex items-center justify-between gap-4 border-b py-2.5 text-xs last:border-0"><span className="flex min-w-0 items-center gap-2"><ChevronRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" /><span className="break-words">{warehouse?.name ?? `Unknown warehouse (${item.id})`}{external && <span className="ml-2 text-muted-foreground">Channel-managed</span>}</span></span><span className="shrink-0 font-medium tabular-nums">{item.quantity === null ? 'Not recorded' : `${item.quantity.toLocaleString()} units`}</span></div>;
            })}
          </div></td></tr>}
        </Fragment>;
      })}</tbody>
    </table>}
  </section>;
}
