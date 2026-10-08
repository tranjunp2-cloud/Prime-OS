import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Warehouse, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { getProductImage } from '@/lib/constants';
import type { Product } from '@/lib/product-store';
import { getInventoryPositions, type InventoryPosition } from '@/lib/inventory-store';
import { activeChannels, canEditWarehouseStock, channelNames, recordedQuantity, stockAt, type StockValue } from '@/lib/warehouse-stock-view';
import { canManageWarehouseHolds } from '@/lib/warehouse-holds';
import { availabilityAt, summarizeAvailability, type AvailabilitySummary } from '@/lib/warehouse-availability';
import { InventoryAmount, StockBreakdown, type StockBreakdownMode } from './StockAvailability';
import { ManageStockHoldsDialog } from './ManageStockHoldsDialog';
import { StockRowActions } from './StockRowActions';
import { getWarehouseById } from '@/lib/warehouse-store';
import { useToast } from '@/hooks/use-toast';
import type { ConnectedChannelRecord } from '@/lib/channel-integrations-api';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { resolveProductShopSources, shopsAtWarehouse, type ShopLinksState } from '@/lib/warehouse-shop-sources';
import { WarehouseShopsCell, WarehouseShopsDrawer } from './WarehouseShops';
import { warehouseProductLocations, warehouseProductPresence } from '@/lib/warehouse-product-scope';

export type StockLocation = { id: string; name: string; code?: string; address?: string | null; unknown?: boolean; external?: boolean };
export function StockNumber({ value, compact = false }: { value: StockValue; compact?: boolean }) {
  const outOfStock = value.quantity === 0 && !value.incomplete;
  if (compact) return value.quantity === null
    ? <span aria-label="Not recorded" title="No recorded stock" className="text-muted-foreground">—</span>
    : <span title={outOfStock ? 'Out of stock' : undefined} className={outOfStock ? 'text-destructive' : undefined}><InventoryAmount value={value} /></span>;
  if (value.quantity === null) return <span className="text-muted-foreground" title="No stock quantity has been recorded for this product at this location.">— <span className="text-xs">Not recorded</span></span>;
  return <span><strong className="tabular-nums">{value.quantity.toLocaleString()}</strong>{outOfStock && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">Out of stock</span>}</span>;
}

export type StockAdjustmentTarget = { product: Product; warehouse?: StockLocation; sku?: string; initializeLocation?: boolean; mode?: 'receive' | 'availability' };
const noShops: ConnectedChannelRecord[] = [];

type Props = {
  shops?: ConnectedChannelRecord[];
  shopLinksState?: ShopLinksState;
  onTransferStock?: (target: Partial<StockAdjustmentTarget>) => void;
  onViewWarehouse?: (warehouseId: string) => void;
  onAdjustStock?: (target: StockAdjustmentTarget) => void;
  onRecordOpeningStock?: () => void;
  products: Product[];
  warehouses: StockLocation[];
  positions?: InventoryPosition[];
  warehouseId: string;
  onShowAll: () => void;
  initialSearch?: string;
};
export function WarehouseStockTable({ products, warehouses, positions = getInventoryPositions(), warehouseId, onShowAll, onAdjustStock, onRecordOpeningStock, onViewWarehouse, onTransferStock, initialSearch = '', shops = noShops, shopLinksState = 'ready' }: Props) {
  const [query, setQuery] = useState(initialSearch);
  const [productId, setProductId] = useState(products.find(product => product.sku_code === initialSearch)?.id ?? '');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [shopDetails, setShopDetails] = useState<{ productId: string; warehouseId: string; skuId?: string } | null>(null);
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [breakdown, setBreakdown] = useState<{ productId: string; ids: string[]; sku?: string; mode: StockBreakdownMode } | null>(null);
  const [holdTarget, setHoldTarget] = useState<{ productId: string; warehouseId?: string; sku?: string } | null>(null);
  const { toast } = useToast();
  useEffect(() => { setPage(1); setExpanded([]); }, [warehouseId]);
  const productLocations = useMemo(() => new Map(products.map(product => [product.id, warehouseProductLocations(product, positions)])), [products, positions]);
  const scopedWarehouses = warehouses.filter(warehouse => !warehouseId || warehouse.id === warehouseId);
  const scopeIds = scopedWarehouses.map(warehouse => warehouse.id);
  const belongsHere = (product: Product, ids = scopeIds) => productLocations.get(product.id)!.some(id => ids.includes(id));
  const scopedProducts = products.filter(product => belongsHere(product));
  const selectedProduct = scopedProducts.find(product => product.id === productId);
  const shopScope = Boolean(warehouseId || selectedProduct);
  useEffect(() => { setShopFilter('all'); setChannel('all'); setShopDetails(null); }, [warehouseId, productId]);
  useEffect(() => { if (shopLinksState !== 'ready') setShopDetails(null); }, [shopLinksState]);
  const shopSources = useMemo(() => {
    const imports = getCatalogImportItems({ requireConfirmation: true });
    return new Map(products.map(product => [product.id, resolveProductShopSources(product, shops, imports)]));
  }, [products, shops]);
  const shopsFor = (product: Product, id: string, skuId?: string) => shopsAtWarehouse(shopSources.get(product.id)!, id, skuId);
  const filterShops = [...new Map((selectedProduct ? [selectedProduct] : scopedProducts).flatMap(product => shopSources.get(product.id)!.confirmed
    .filter(item => scopeIds.includes(item.warehouseId) && belongsHere(product, [item.warehouseId]))
    .map(item => [item.shop.id, item.shop] as const))).values()].sort((a, b) => a.store_name.localeCompare(b.store_name));
  const effectiveShopFilter = shopLinksState === 'ready' && filterShops.some(shop => shop.id === shopFilter) ? shopFilter : 'all';
  const matches = scopedProducts.filter(product => `${product.name} ${product.sku_code} ${product.skus.map(sku => sku.sku_code).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const stockMatches = (stock: AvailabilitySummary) => status === 'all'
    || (status === 'available' && stock.onHand.quantity !== null && stock.onHand.quantity > 0)
    || (status === 'empty' && stock.onHand.quantity === 0 && !stock.onHand.incomplete)
    || (status === 'untracked' && stock.onHand.quantity === null)
    || (status === 'partial' && stock.onHand.incomplete)
    || (status === 'atp' && stock.atp.quantity !== null && stock.atp.quantity > 0)
    || (status === 'no-atp' && stock.atp.quantity === 0 && !stock.atp.incomplete)
    || (status === 'held' && stock.held.quantity !== null && stock.held.quantity > 0)
    || (status === 'unknown-atp' && (stock.atp.quantity === null || stock.atp.incomplete));
  const filteredProducts = (selectedProduct ? [selectedProduct] : matches).filter(product => shopScope || channel === 'all' || activeChannels(product).includes(channel as ReturnType<typeof activeChannels>[number]));
  const rows = (selectedProduct
    ? filteredProducts.flatMap(product => scopedWarehouses.filter(warehouse => belongsHere(product, [warehouse.id])).map(warehouse => ({ key: warehouse.id, name: warehouse.name, product, warehouse, stock: availabilityAt(product, [warehouse.id], positions) })))
    : filteredProducts.map(product => ({ key: product.id, name: product.name, product, warehouse: undefined as StockLocation | undefined, stock: availabilityAt(product, scopeIds, positions) })))
    .filter(row => stockMatches(row.stock) && (!shopScope || effectiveShopFilter === 'all' || shopsFor(row.product, row.warehouse?.id ?? warehouseId).shops.some(item => item.shop.id === effectiveShopFilter)));
  rows.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    const aValue = sort === 'atp-low' ? a.stock.atp : a.stock.onHand;
    const bValue = sort === 'atp-low' ? b.stock.atp : b.stock.onHand;
    if (aValue.quantity === null) return bValue.quantity === null ? 0 : 1;
    if (bValue.quantity === null) return -1;
    return sort === 'high' ? bValue.quantity - aValue.quantity : aValue.quantity - bValue.quantity;
  });
  // Sum filtered parent rows, not the current page or expanded warehouse / SKU children.
  const totals = summarizeAvailability(rows.flatMap(row => row.stock.items));
  const resultLabel = selectedProduct ? rows.length === 1 ? 'warehouse' : 'warehouses' : rows.length === 1 ? 'product' : 'products';
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pages);
  const displayed = rows.slice((currentPage - 1) * 20, currentPage * 20);
  const clearFilters = () => { setQuery(''); setProductId(''); setStatus('all'); setChannel('all'); setShopFilter('all'); setPage(1); setExpanded([]); };
  const pickProduct = (product: Product) => { setProductId(product.id); setQuery(product.name); setPage(1); setExpanded([]); };
  const channels = [...new Set(scopedProducts.flatMap(activeChannels))];
  const pendingNote = (product: Product, ids: string[], sku?: string) => {
    const presence = ids.map(id => warehouseProductPresence(product, id, positions, sku)).filter(item => item.related);
    if (!presence.length || presence.some(item => item.hasCount)) return null;
    const reasons = [
      presence.some(item => item.incoming) && 'Incoming stock',
      presence.some(item => item.outgoing) && 'Stock in transit',
      presence.some(item => item.orderHolds) && 'Order holds',
      presence.some(item => item.otherHolds) && 'Other holds',
    ].filter(Boolean);
    return <p className="mt-0.5 text-xs text-muted-foreground">{reasons.join(' · ') || 'Inventory record'} · Count not recorded</p>;
  };
  const controlClass = 'h-10 min-w-0 flex-1 basis-36 rounded-md border border-input bg-background px-2.5 text-sm';
  const detailsProduct = products.find(product => product.id === breakdown?.productId);
  const holdsProduct = products.find(product => product.id === holdTarget?.productId);
  const editableIds = (ids: string[]) => ids.filter(id => canEditWarehouseStock(id) && getWarehouseById(id)?.status === 'active');
  const canManageHolds = (product: Product, ids: string[], sku?: string) => editableIds(ids).some(id =>
    (product.has_variants ? product.skus.filter(item => !sku || item.sku_code === sku).map(item => item.sku_code) : [product.sku_code])
      .some(code => canManageWarehouseHolds(product, id, code, positions)));
  const openHolds = (product: Product, ids: string[], sku?: string) => setHoldTarget({ productId: product.id, warehouseId: ids.length === 1 ? ids[0] : undefined, sku });
  const warehouseTitle = (warehouse: StockLocation) => onViewWarehouse
    ? <button type="button" aria-haspopup="dialog" className="rounded text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); onViewWarehouse(warehouse.id); }}>{warehouse.name}</button>
    : <span className="font-medium">{warehouse.name}</span>;
  const detailNumber = (product: Product, ids: string[], value: StockValue, mode: StockBreakdownMode, warehouse?: StockLocation, sku?: string) => {
    const interactive = mode === 'atp' || (value.quantity !== null && value.quantity > 0);
    const label = mode === 'atp' ? 'Stock breakdown' : mode === 'orders' ? 'Order holds' : 'Other holds';
    return interactive ? <button type="button" aria-haspopup="dialog" aria-label={`${label} for ${sku ?? product.name}${warehouse ? ` at ${warehouse.name}` : ''}`} title={mode === 'atp' ? 'View ATP calculation' : `View ${label.toLowerCase()}`}
      className={`min-h-9 min-w-9 rounded text-right hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === 'atp' ? '' : 'text-violet-600 dark:text-violet-400'}`}
      onClick={event => { event.stopPropagation(); setBreakdown({ productId: product.id, ids, sku, mode }); }}><InventoryAmount value={value} highlight={mode === 'atp'} /></button>
      : <span className="text-muted-foreground"><InventoryAmount value={value} /></span>;
  };
  const stockCells = (product: Product, ids: string[], stock: AvailabilitySummary, warehouse?: StockLocation, sku?: string) => <>
    <td className="px-3 py-2 text-right"><StockNumber value={stock.onHand} compact />{stock.onHand.quantity === 0 && !stock.onHand.incomplete && <p className="whitespace-nowrap text-xs leading-4 text-destructive">Out of stock</p>}</td>
    <td className="px-3 py-2 text-right">{detailNumber(product, ids, stock.held, 'orders', warehouse, sku)}</td>
    <td className="px-3 py-2 text-right">{detailNumber(product, ids, stock.unavailable, 'holds', warehouse, sku)}</td>
    <td className="bg-emerald-500/[0.03] px-3 py-2 text-right">{detailNumber(product, ids, stock.atp, 'atp', warehouse, sku)}</td>
  </>;
  const actionsCell = (product: Product, ids: string[], stock: AvailabilitySummary, warehouse?: StockLocation, sku?: string) => {
    const editable = editableIds(ids);
    const recorded = stock.items.some(item => editable.includes(item.warehouseId) && item.onHand !== null);
    const canInitialize = editable.some(id => product.has_variants
      ? product.skus.some(item => (!sku || item.sku_code === sku) && recordedQuantity(item.stock_by_location?.[id]) === null)
      : stockAt(product, id).quantity === null);
    const selectedSku = sku ?? (!product.has_variants ? product.sku_code : undefined);
    const singleLocation = warehouse ?? (ids.length === 1 ? warehouses.find(item => item.id === ids[0]) : undefined);
    const direct = singleLocation && selectedSku && editableIds(ids).includes(singleLocation.id);
    return <StockRowActions
      onReceive={direct && stock.onHand.quantity !== null && onAdjustStock ? () => onAdjustStock({ product, warehouse: singleLocation, sku: selectedSku, mode: 'receive' }) : undefined}
      onSetup={direct && stock.items.some(item => item.state === 'missing') && onAdjustStock ? () => onAdjustStock({ product, warehouse: singleLocation, sku: selectedSku, mode: 'availability' }) : undefined}
      onTransfer={direct && (stock.atp.quantity ?? 0) > 0 && !stock.atp.incomplete && onTransferStock ? () => onTransferStock({ product, warehouse: singleLocation, sku: selectedSku }) : undefined} label={`${sku ?? product.name}${warehouse ? ` at ${warehouse.name}` : ''}`}
      readOnly={!editable.length}
      onAdjust={onAdjustStock && recorded ? () => onAdjustStock({ product, warehouse, sku }) : undefined}
      onInitialize={onAdjustStock && canInitialize ? () => onAdjustStock({ product, warehouse, sku, initializeLocation: true }) : undefined}
      onManage={canManageHolds(product, ids, sku) ? () => openHolds(product, ids, sku) : undefined} />;
  };
  const salesCell = (product: Product, warehouse?: StockLocation, skuId?: string) => {
    if (warehouse) return <td className="px-3 py-2"><WarehouseShopsCell summary={shopsFor(product, warehouse.id, skuId)} status={shopLinksState} productName={product.name} warehouseName={warehouse.name} onOpen={() => setShopDetails({ productId: product.id, warehouseId: warehouse.id, skuId })} /></td>;
    const active = activeChannels(product);
    return <td className="px-3 py-2"><div className="flex flex-wrap items-center gap-1">{active.map(key => <span key={key} title={`${channelNames[key] ?? key} · Active listings across all shops`} className="inline-flex"><ChannelLogo channel={{ key }} size="sm" /><span className="sr-only">{channelNames[key] ?? key}</span></span>)}{active.length ? <span aria-label={`${active.length} ${active.length === 1 ? 'channel' : 'channels'}`} className="text-xs tabular-nums text-muted-foreground">{active.length} {active.length === 1 ? 'channel' : 'channels'}</span> : <span className="text-xs text-muted-foreground">Not listed</span>}</div></td>;
  };

  return <section aria-label="Warehouse products" className="min-w-0">
    <div className="space-y-2 border-b border-border px-4 py-2.5">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 basis-48 grow"><label htmlFor="warehouse-product" className="sr-only">Product</label><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="warehouse-product" value={query} placeholder="Search product or SKU…" className="h-10 pl-9 pr-10" onChange={event => { setQuery(event.target.value); setProductId(''); setPage(1); }} />{query && <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-0.5 size-9" onClick={() => { setQuery(''); setProductId(''); setPage(1); }}><X className="size-4" /></Button>}</div>
        <select aria-label="Stock status" className={controlClass} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="atp">Available to sell</option><option value="no-atp">No ATP available</option><option value="held">Held for orders</option><option value="unknown-atp">ATP data missing</option><option value="available">In warehouse</option><option value="empty">Out of stock</option><option value="untracked">Not recorded</option><option value="partial">Partial stock data</option></select>
        {shopScope ? <select aria-label="Shop using this warehouse" className={controlClass} disabled={shopLinksState !== 'ready'} value={effectiveShopFilter} onChange={event => { setShopFilter(event.target.value); setPage(1); }}><option value="all">{shopLinksState === 'loading' ? 'Loading shops…' : shopLinksState === 'error' ? 'Shops unavailable' : 'All shops using this warehouse'}</option>{filterShops.map(shop => <option key={shop.id} value={shop.id}>{shop.store_name} · {shop.name}</option>)}</select>
          : <select aria-label="Listing channel" className={controlClass} value={channel} onChange={event => { setChannel(event.target.value); setPage(1); }}><option value="all">All listing channels</option>{channels.map(key => <option key={key} value={key}>{channelNames[key] ?? key}</option>)}</select>}
        <select aria-label="Sort products" className={controlClass} value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="name">Name A–Z</option><option value="atp-low">Lowest ATP first</option><option value="low">Lowest stock first</option><option value="high">Highest stock first</option></select>
        {(query || status !== 'all' || channel !== 'all' || effectiveShopFilter !== 'all') && rows.length > 0 && <Button variant="ghost" size="icon" className="size-10 shrink-0" aria-label="Clear filters" title="Clear filters" onClick={clearFilters}><X className="size-4" /></Button>}
      </div>
      {query.trim() && !selectedProduct && matches.length > 0 && <div aria-label="Matching products" className="max-h-48 overflow-auto rounded-md border border-border">{matches.slice(0, 20).map(product => <button type="button" key={product.id} onClick={() => pickProduct(product)} className="flex min-h-12 w-full items-center gap-3 p-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><img src={getProductImage(product.id, product.asin)} alt="" className="size-8 rounded object-cover" /><span>{product.name} <span className="text-xs text-muted-foreground">{product.sku_code}</span></span></button>)}</div>}
      {selectedProduct && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"><div><p className="text-sm font-semibold">{selectedProduct.name}</p><p className="text-xs text-muted-foreground">{selectedProduct.sku_code} · Stock by warehouse</p></div>{warehouseId && <Button variant="outline" size="sm" onClick={() => { onShowAll(); setPage(1); }}>View this product in all warehouses</Button>}</div>}
    </div>
    {/* Keep the sticky header opaque over rows, overriding the shared translucent table header surface. */}
    <div className="max-h-[62vh] overflow-auto"><table className="w-full min-w-[860px] table-fixed text-left text-sm"><colgroup><col /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[96px]" /></colgroup><thead className="sticky top-0 z-10 !bg-card text-xs text-muted-foreground">
      <tr>
        <th scope="col" className="min-w-[220px] px-4 py-2.5 text-left align-top"><span className="block font-medium">{selectedProduct ? 'Warehouse / SKU' : 'Product / SKU'}</span><span aria-live="polite" className="mt-1 block text-sm font-semibold tabular-nums text-foreground">{rows.length} {resultLabel}</span></th>
        {([
          ['Stock', totals.onHand],
          ['For orders', totals.held],
          ['Other holds', totals.unavailable],
          ['Available (ATP)', totals.atp],
        ] as const).map(([label, value]) => <th key={label} scope="col" className={`px-3 py-2.5 text-right align-top ${label === 'Available (ATP)' ? 'bg-emerald-500/[0.03] text-emerald-700 dark:text-emerald-400' : ''}`} title={`${label}: total for all matching results`}><span className="block font-medium">{label}</span>{label === 'Available (ATP)' && scopedWarehouses.some(item => item.external) && <span className="block text-[10px] font-normal text-muted-foreground">Managed stock only</span>}<div className="mt-1 text-base text-foreground"><InventoryAmount value={value} highlight={label === 'Available (ATP)'} /></div></th>)}
        <th scope="col" className="px-3 py-2.5 text-left align-top font-medium" title={shopScope ? "Shops with an active listing of this product and a confirmed stock source here. Select a cell to check sync settings." : "Channels with active product listings across all shops; independent of warehouse links."}>{shopScope ? 'Shops using this warehouse' : 'Listed on'}</th>
        <th scope="col" className="sticky right-0 bg-card px-3 py-2.5 text-right align-top font-medium">Actions</th>
      </tr>
    </thead><tbody>
      {displayed.map(row => {
        const open = expanded.includes(row.key);
        const byLocation = !warehouseId && !selectedProduct;
        const canExpand = byLocation || row.product.has_variants;
        const toggle = () => setExpanded(ids => open ? ids.filter(id => id !== row.key) : [...ids, row.key]);
        const stockedLocations = warehouses.filter(warehouse => (stockAt(row.product, warehouse.id).quantity ?? 0) > 0);
        const visibleLocations = warehouses.filter(warehouse => belongsHere(row.product, [warehouse.id]));
        const location = row.warehouse ?? warehouses.find(warehouse => warehouse.id === warehouseId);
        const ids = location ? [location.id] : scopeIds;
        return <Fragment key={row.key}><tr className={`border-t border-border hover:bg-muted/20 ${canExpand ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring' : ''}`} tabIndex={canExpand ? 0 : undefined} aria-expanded={canExpand ? open : undefined} onClick={canExpand ? toggle : undefined} onKeyDown={event => { if (canExpand && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(); } }}>
          <td className="px-4 py-2"><div className="flex items-center gap-2">{canExpand ? <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${row.name}`} onClick={event => { event.stopPropagation(); toggle(); }}>{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button> : <span className="w-9 shrink-0" />}{!selectedProduct && <img src={getProductImage(row.product.id, row.product.asin)} alt="" className="size-9 rounded object-cover" />}<div className="min-w-0">{selectedProduct && row.warehouse ? warehouseTitle(row.warehouse) : <button type="button" title={row.name} className="block max-w-full truncate text-left font-medium hover:text-primary hover:underline" aria-expanded={canExpand ? open : undefined} onClick={event => { event.stopPropagation(); if (canExpand) toggle(); else pickProduct(row.product); }}>{row.name}</button>}<p className="mt-0.5 flex items-center gap-x-1.5 text-xs text-muted-foreground"><span className="min-w-0 truncate" title={selectedProduct ? row.warehouse?.code : row.product.sku_code}>{selectedProduct ? row.warehouse?.code : row.product.sku_code}</span>{byLocation ? <><span aria-hidden="true">·</span><span className="inline-flex shrink-0 items-center gap-1" aria-label={`${stockedLocations.length} ${stockedLocations.length === 1 ? 'warehouse' : 'warehouses'} with stock`} title={`${stockedLocations.length} ${stockedLocations.length === 1 ? 'warehouse' : 'warehouses'} with stock`}><Warehouse aria-hidden="true" className="size-3" />{stockedLocations.length}</span></> : row.product.has_variants ? <><span aria-hidden="true">·</span><span>{row.product.skus.length} variants</span></> : null}</p>{pendingNote(row.product, ids)}</div></div></td>
          {stockCells(row.product, ids, row.stock, location)}{salesCell(row.product, shopScope ? location : undefined)}{actionsCell(row.product, ids, row.stock, location)}
        </tr>
        {open && (byLocation ? visibleLocations.map(warehouse => <tr key={warehouse.id} className="border-t border-border bg-muted/20"><td className="py-2 pl-14 pr-4">{warehouseTitle(warehouse)}{pendingNote(row.product, [warehouse.id])}</td>{stockCells(row.product, [warehouse.id], availabilityAt(row.product, [warehouse.id], positions), warehouse)}<td />{actionsCell(row.product, [warehouse.id], availabilityAt(row.product, [warehouse.id], positions), warehouse)}</tr>) : row.product.skus.filter(sku => ids.some(id => warehouseProductPresence(row.product, id, positions, sku.sku_code).related)).map(sku => <tr key={sku.id} className="border-t border-border bg-muted/20"><td className="py-2 pl-14 pr-4"><p>{sku.variation_name}</p><p className="text-xs text-muted-foreground">{sku.sku_code}</p>{pendingNote(row.product, ids, sku.sku_code)}</td>{stockCells(row.product, ids, availabilityAt(row.product, ids, positions, sku.sku_code), location, sku.sku_code)}{location ? salesCell(row.product, location, sku.id) : <td />}{actionsCell(row.product, ids, availabilityAt(row.product, ids, positions, sku.sku_code), location, sku.sku_code)}</tr>))}
        </Fragment>;
      })}
    </tbody></table></div>
    {!rows.length && <div className="p-10 text-center"><p className="font-medium">No warehouse products match</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Only products with stock records or warehouse activity appear here. To start tracking another SKU, record its opening stock.</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Button variant="ghost" onClick={clearFilters}>Clear filters</Button>{onRecordOpeningStock && <Button variant="outline" onClick={onRecordOpeningStock}>Record opening stock</Button>}</div></div>}
    {pages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground"><span>{(currentPage - 1) * 20 + 1}–{Math.min(currentPage * 20, rows.length)} of {rows.length}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage} / {pages}</span><Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></div>}
    {breakdown && detailsProduct && <StockBreakdown mode={breakdown.mode} onManageHolds={breakdown.mode === 'holds' && canManageHolds(detailsProduct, breakdown.ids, breakdown.sku) ? () => openHolds(detailsProduct, breakdown.ids, breakdown.sku) : undefined} title={detailsProduct.name} summary={availabilityAt(detailsProduct, breakdown.ids, positions, breakdown.sku)} warehouses={warehouses} onClose={() => setBreakdown(null)} />}
    {shopDetails && products.find(product => product.id === shopDetails.productId) && <WarehouseShopsDrawer productName={products.find(product => product.id === shopDetails.productId)!.name} warehouseName={warehouses.find(warehouse => warehouse.id === shopDetails.warehouseId)?.name ?? shopDetails.warehouseId} summary={shopsFor(products.find(product => product.id === shopDetails.productId)!, shopDetails.warehouseId, shopDetails.skuId)} onClose={() => setShopDetails(null)} />}
    {holdTarget && holdsProduct && <ManageStockHoldsDialog product={holdsProduct} warehouseId={holdTarget.warehouseId} sku={holdTarget.sku} onClose={() => setHoldTarget(null)} onSaved={() => { setHoldTarget(null); toast({ title: 'Holds updated', description: 'Other holds and available stock have been recalculated.' }); }} />}
  </section>;
}
