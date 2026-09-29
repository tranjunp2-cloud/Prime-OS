import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProductImage } from '@/lib/constants';
import type { Product } from '@/lib/product-store';
import { activeChannels, canEditWarehouseStock, channelNames, recordedQuantity, stockAt, sumStock, type StockValue } from '@/lib/warehouse-stock-view';

export type StockLocation = { id: string; name: string; code?: string; address?: string | null; unknown?: boolean; external?: boolean };
export function StockNumber({ value }: { value: StockValue }) {
  if (value.quantity === null) return <span className="text-muted-foreground" title="No stock quantity has been recorded for this product at this location.">— <span className="text-xs">Not recorded</span></span>;
  return <span><strong className="tabular-nums">{value.quantity.toLocaleString()}</strong>{value.incomplete ? <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Partial data</span> : value.quantity === 0 ? <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">Out of stock</span> : null}</span>;
}

export type StockAdjustmentTarget = { product: Product; warehouse: StockLocation; sku?: string };
type Props = { onViewWarehouse?: (warehouseId: string) => void; onAdjustStock?: (target: StockAdjustmentTarget) => void; products: Product[]; warehouses: StockLocation[]; warehouseId: string; onShowAll: () => void; initialSearch?: string };
export function WarehouseStockTable({ products, warehouses, warehouseId, onShowAll, onAdjustStock, onViewWarehouse, initialSearch = '' }: Props) {
  const [query, setQuery] = useState(initialSearch);
  const [productId, setProductId] = useState(products.find(p => p.sku_code === initialSearch)?.id ?? '');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showOtherLocations, setShowOtherLocations] = useState<string[]>([]);
  useEffect(() => { setPage(1); setExpanded([]); }, [warehouseId]);
  const selectedProduct = products.find(p => p.id === productId);
  const scopedWarehouses = warehouses.filter(w => !warehouseId || w.id === warehouseId);
  const matches = products.filter(p => `${p.name} ${p.sku_code} ${p.skus.map(sku => sku.sku_code).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const stockMatches = (stock: StockValue) => status === 'all' || (status === 'available' && stock.quantity !== null && stock.quantity > 0) || (status === 'empty' && stock.quantity === 0 && !stock.incomplete) || (status === 'untracked' && stock.quantity === null) || (status === 'partial' && stock.incomplete);
  const values = (product: Product) => sumStock(scopedWarehouses.map(w => stockAt(product, w.id)));
  const filteredProducts = (selectedProduct ? [selectedProduct] : matches).filter(p => (channel === 'all' || activeChannels(p).includes(channel as ReturnType<typeof activeChannels>[number])) && (selectedProduct || stockMatches(values(p))));
  const rows = selectedProduct
    ? filteredProducts.flatMap(product => scopedWarehouses.map(warehouse => ({ key: warehouse.id, name: warehouse.name, product, warehouse, stock: stockAt(product, warehouse.id) }))).filter(row => stockMatches(row.stock))
    : filteredProducts.map(product => ({ key: product.id, name: product.name, product, warehouse: undefined as StockLocation | undefined, stock: values(product) }));
  rows.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : a.stock.quantity === null ? b.stock.quantity === null ? 0 : 1 : b.stock.quantity === null ? -1 : sort === 'low' ? a.stock.quantity - b.stock.quantity : b.stock.quantity - a.stock.quantity);
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pages);
  const displayed = rows.slice((currentPage - 1) * 20, currentPage * 20);
  const total = sumStock(rows.map(row => row.stock));
  const clearFilters = () => { setQuery(''); setProductId(''); setStatus('all'); setChannel('all'); setPage(1); setExpanded([]); };
  const pickProduct = (product: Product) => { setProductId(product.id); setQuery(product.name); setPage(1); setExpanded([]); };
  const channels = [...new Set(products.flatMap(activeChannels))];
  const controlClass = 'h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm';

  const warehouseTitle = (warehouse: StockLocation) => onViewWarehouse
    ? <button type="button" aria-haspopup="dialog" className="rounded text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); onViewWarehouse(warehouse.id); }}>{warehouse.name}</button>
    : <span className="font-medium">{warehouse.name}</span>;

  const editButton = (product: Product, warehouse: StockLocation | undefined, sku?: string) => warehouse && onAdjustStock && canEditWarehouseStock(warehouse.id)
    ? <Button variant="outline" size="sm" className="ml-3 min-h-9" onClick={event => { event.stopPropagation(); onAdjustStock({ product, warehouse, sku }); }}>Adjust stock</Button>
    : null;

  return <section aria-label="Warehouse products" className="min-w-0">
    <div className="space-y-3 border-b border-border p-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-40 flex-[1_1_16rem]"><label htmlFor="warehouse-product" className="sr-only">Product</label><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input id="warehouse-product" value={query} placeholder="Search product name or SKU…" className="h-11 pl-9 pr-10" onChange={e => { setQuery(e.target.value); setProductId(''); setPage(1); }} />{query && <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1 size-9" onClick={() => { setQuery(''); setProductId(''); setPage(1); }}><X className="size-4" /></Button>}</div>
        <select aria-label="Stock status" className={controlClass} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">All stock statuses</option><option value="available">In stock</option><option value="empty">Out of stock</option><option value="untracked">Not recorded</option><option value="partial">Partial data</option></select>
        <select aria-label="Sales channel" className={controlClass} value={channel} onChange={e => { setChannel(e.target.value); setPage(1); }}><option value="all">All sales channels</option>{channels.map(c => <option key={c} value={c}>{channelNames[c] ?? c}</option>)}</select>
        <select aria-label="Sort products" className={controlClass} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="name">Name A–Z</option><option value="low">Lowest stock first</option><option value="high">Highest stock first</option></select>
      </div>
      {query.trim() && !selectedProduct && matches.length > 0 && <div aria-label="Matching products" className="max-h-48 overflow-auto rounded-md border border-border">{matches.slice(0, 20).map(p => <button type="button" key={p.id} onClick={() => pickProduct(p)} className="flex min-h-12 w-full items-center gap-3 p-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><img src={getProductImage(p.id, p.asin)} alt="" className="size-8 rounded object-cover" /><span>{p.name} <span className="text-xs text-muted-foreground">{p.sku_code}</span></span></button>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{rows.length} {selectedProduct ? 'warehouses' : 'products'} · {rows.some(row => row.stock.quantity === null || row.stock.incomplete) ? 'Recorded subtotal' : 'Total stock'}: <span className="font-semibold text-foreground">{total.quantity?.toLocaleString() ?? '—'}</span> units</span><div className="flex items-center gap-2">{(query || status !== 'all' || channel !== 'all') && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}</div></div>
      {selectedProduct && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"><div><p className="text-sm font-semibold">{selectedProduct.name}</p><p className="text-xs text-muted-foreground">{selectedProduct.sku_code} · Stock by warehouse</p></div>{warehouseId && <Button variant="outline" size="sm" onClick={() => { onShowAll(); setPage(1); }}>View this product in all warehouses</Button>}</div>}
    </div>
    <div className="max-h-[62vh] overflow-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground"><tr><th className="px-4 py-3">{selectedProduct ? 'Warehouse' : 'Product / SKU'}</th><th className="px-4 py-3 text-right">{warehouseId || selectedProduct ? 'Stock on hand' : 'Total across warehouses'}</th>{!selectedProduct && <><th className="px-4 py-3">{warehouseId ? 'Variants' : 'Locations'}</th><th className="px-4 py-3">Selling on</th></>}</tr></thead><tbody>
      {displayed.map(row => {
        const open = expanded.includes(row.key);
        const byLocation = !warehouseId && !selectedProduct;
        const canExpand = byLocation || row.product.has_variants;
        const toggle = () => setExpanded(ids => open ? ids.filter(id => id !== row.key) : [...ids, row.key]);
        const stockedLocations = warehouses.filter(w => (stockAt(row.product, w.id).quantity ?? 0) > 0);
        const showingOthers = showOtherLocations.includes(row.key);
        const visibleLocations = showingOthers ? warehouses : stockedLocations;
        const otherCount = warehouses.length - stockedLocations.length;
        return <Fragment key={row.key}><tr
          className={`border-t border-border hover:bg-muted/20 ${canExpand ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring' : ''}`}
          tabIndex={canExpand ? 0 : undefined}
          aria-expanded={canExpand ? open : undefined}
          onClick={canExpand ? toggle : undefined}
          onKeyDown={event => {
            if (canExpand && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              toggle();
            }
          }}
        ><td className="px-4 py-3"><div className="flex items-center gap-2">{canExpand ? <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${row.name}`} onClick={event => { event.stopPropagation(); toggle(); }}>{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button> : <span className="w-9 shrink-0" />}{!selectedProduct && <img src={getProductImage(row.product.id, row.product.asin)} alt="" className="size-10 rounded object-cover" />}<div>{selectedProduct && row.warehouse ? warehouseTitle(row.warehouse) : <button className="text-left font-medium hover:text-primary hover:underline" aria-expanded={canExpand ? open : undefined} onClick={event => { event.stopPropagation(); if (canExpand) toggle(); else pickProduct(row.product); }}>{row.name}</button>}<p className="mt-1 text-xs text-muted-foreground">{selectedProduct ? row.warehouse?.external ? 'External stock · Read only' : row.warehouse?.code : row.product.sku_code}</p>{row.product.has_variants && <p className="mt-1 text-xs text-muted-foreground">Total of {row.product.skus.length} variants</p>}</div></div></td><td className="px-4 py-3 text-right"><StockNumber value={row.stock} />{editButton(row.product, row.warehouse ?? warehouses.find(w => w.id === warehouseId))}</td>{!selectedProduct && <><td className="px-4 py-3 text-xs text-muted-foreground">{byLocation ? `${stockedLocations.length} warehouses with stock` : row.product.has_variants ? `${row.product.skus.length} variants` : 'Single SKU'}</td><td className="px-4 py-3"><div className="flex max-w-48 flex-wrap gap-1">{activeChannels(row.product).map(c => <span key={c} className="rounded bg-muted px-2 py-1 text-xs">{channelNames[c] ?? c}</span>)}{!activeChannels(row.product).length && <span className="text-xs text-muted-foreground">No active listings</span>}</div></td></>}</tr>
          {open && (byLocation ? visibleLocations.map(w => <tr key={w.id} className="border-t border-border bg-muted/20 text-sm"><td className="py-3 pl-16 pr-4">{warehouseTitle(w)}{w.external && <span className="ml-2 text-xs text-muted-foreground">Read only</span>}</td><td className="px-4 py-3 text-right"><StockNumber value={stockAt(row.product, w.id)} /></td><td colSpan={2} className="px-4 py-2">{editButton(row.product, w)}</td></tr>) : row.product.skus.map(sku => <tr key={sku.id} className="border-t border-border bg-muted/20"><td className="py-3 pl-16 pr-4"><p>{sku.variation_name}</p><p className="text-xs text-muted-foreground">{sku.sku_code}</p></td><td className="px-4 py-3 text-right"><StockNumber value={{ quantity: recordedQuantity(sku.stock_by_location?.[row.warehouse?.id ?? warehouseId]), incomplete: false }} />{editButton(row.product, row.warehouse ?? warehouses.find(w => w.id === warehouseId), sku.sku_code)}</td>{!selectedProduct && <td colSpan={2} />}</tr>))}
          {open && byLocation && otherCount > 0 && <tr className="border-t border-border bg-muted/20"><td colSpan={4} className="px-4 py-2 pl-16">
            {!stockedLocations.length && !showingOthers && <p className="mb-1 text-sm text-muted-foreground">No warehouses currently have stock.</p>}
            <Button variant="ghost" size="sm" onClick={() => setShowOtherLocations(ids => showingOthers ? ids.filter(id => id !== row.key) : [...ids, row.key])}>
              {showingOthers ? 'Show only warehouses with stock' : `Show other warehouses (${otherCount})`}
            </Button>
          </td></tr>}
        </Fragment>;
      })}
    </tbody></table></div>
    {!rows.length && <div className="p-10 text-center"><p className="font-medium">No products match these filters</p><p className="mt-1 text-sm text-muted-foreground">Try another product name or stock status.</p><Button variant="ghost" className="mt-3" onClick={clearFilters}>Clear filters</Button></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground"><span>{rows.length ? `${(currentPage - 1) * 20 + 1}–${Math.min(currentPage * 20, rows.length)} of ${rows.length}` : '0 results'}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage} / {pages}</span><Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></div>
    <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">Variant totals use child SKU quantities only. Partial data means some variants have no recorded quantity. Sales channels show active product listings, not warehouse-to-shop stock allocation.</p>
  </section>;
}
