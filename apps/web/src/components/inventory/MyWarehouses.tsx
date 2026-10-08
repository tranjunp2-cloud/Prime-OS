import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Layers3, Search, Warehouse } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConnectedShops } from '@/hooks/use-connected-shops';
import { shopWarehouse } from '@/lib/shop-warehouse-settings';
import type { Product } from '@/lib/product-store';
import { DEMO_WAREHOUSE_ALIASES } from '@/lib/demo-warehouse-locations';
import { getWarehouseById } from '@/lib/warehouse-store';
import { canEditWarehouseStock } from '@/lib/warehouse-stock-view';
import { stockAt, sumStock } from '@/lib/warehouse-stock-view';
import { warehouseProductLocations } from '@/lib/warehouse-product-scope';
import { cn } from '@/lib/utils';
import { getInventoryPositions, type InventoryPosition } from '@/lib/inventory-store';
import { StockGuide } from './StockAvailability';
import { WarehouseStockTable, type StockLocation, type StockAdjustmentTarget } from './WarehouseStockTable';

type Location = { id: string; name: string; code?: string; address?: string | null };
type Props = { warehouses: Location[]; products: Product[]; positions?: InventoryPosition[]; initialSearch?: string; onAdjustStock?: (target: StockAdjustmentTarget) => void; warehouseId?: string; onSelectWarehouse?: (id: string) => void; onAddStock?: (warehouse: StockLocation) => void; onLinkShops?: (warehouse: StockLocation) => void; onTransferStock?: (target: Partial<StockAdjustmentTarget>) => void };
export function MyWarehouses({ warehouses, products, onAdjustStock, positions = getInventoryPositions(), initialSearch = '', warehouseId: controlledWarehouse, onSelectWarehouse, onAddStock, onLinkShops, onTransferStock }: Props) {
  const [localWarehouseId, setLocalWarehouseId] = useState('');
  const warehouseId = controlledWarehouse ?? localWarehouseId;
  const setWarehouseId = (id: string) => { setLocalWarehouseId(id); onSelectWarehouse?.(id); };
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const connections = useConnectedShops();
  const shops = useMemo(() => connections.shops.map(shop => ({ ...shop, warehouse: shopWarehouse(shop.warehouse) })), [connections.shops]);
  const status = connections.status === 'idle' ? 'loading' : connections.status;
  const reloadShops = () => { void connections.reload().catch(() => {}); };
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsWarehouseId, setDetailsWarehouseId] = useState('');
  const openDetails = (id: string) => { setDetailsWarehouseId(id); setDetailsOpen(true); };
  const locations = new Map<string, StockLocation>(warehouses.filter(w => !DEMO_WAREHOUSE_ALIASES[w.id]).map(w => {
    const stored = getWarehouseById(w.id);
    return [w.id, { ...w, external: Boolean(stored?.is_virtual || ['fba', 'fbs'].includes(stored?.type ?? '')) }];
  }));
  shops.forEach(shop => { if (shop.warehouse && !locations.has(shop.warehouse.id)) locations.set(shop.warehouse.id, shop.warehouse); });
  const productLocations = useMemo(() => new Map(products.map(product => [product.id, warehouseProductLocations(product, positions)])), [products, positions]);
  products.forEach(product => productLocations.get(product.id)!.forEach(id => {
    if (!locations.has(id)) locations.set(id, { id, name: 'Unidentified warehouse', code: id, unknown: true });
  }));
  const allWarehouses = [...locations.values()].sort((a, b) => Number(Boolean(a.unknown)) - Number(Boolean(b.unknown)));
  const selected = locations.get(warehouseId);
  const detailsWarehouse = locations.get(detailsWarehouseId);
  const detailsLocations = detailsWarehouse ? [detailsWarehouse] : allWarehouses;
  const detailsShops = shops.filter(shop => shop.warehouse && (!detailsWarehouseId || shop.warehouse.id === detailsWarehouseId));
  const scopedShops = shops.filter(shop => shop.warehouse && (!warehouseId || shop.warehouse.id === warehouseId));
  const stats = (scope: StockLocation[]) => {
    const scoped = products.filter(product => scope.some(w => productLocations.get(product.id)!.includes(w.id)));
    const values = scoped.map(product => sumStock(scope.filter(w => productLocations.get(product.id)!.includes(w.id)).map(w => stockAt(product, w.id))));
    const total = sumStock(values);
    return { products: scoped.length, ...total };
  };
  const editableSelected = selected && canEditWarehouseStock(selected.id);
  const hasCounts = selected && products.some(product => stockAt(product, selected.id).quantity !== null);
  const hasRelatedProducts = selected && products.some(product => productLocations.get(product.id)!.includes(selected.id));
  const channelCount = new Set(scopedShops.map(shop => shop.platform)).size;
  const summary = (scope: StockLocation[]) => {
    const value = stats(scope);
    return `${value.products} ${value.products === 1 ? 'product' : 'products'} · ${value.quantity?.toLocaleString() ?? '—'} units${value.incomplete ? ' (partial)' : ''}`;
  };
  const visibleWarehouses = allWarehouses.filter(w => `${w.name} ${w.code ?? ''}`.toLowerCase().includes(warehouseSearch.toLowerCase()));
  const rowClass = (active: boolean) => cn('flex min-h-11 w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted/60');

  return <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
    <section aria-label="Choose a warehouse" className="min-w-0 rounded-xl border border-border bg-card lg:sticky lg:top-4">
      <div className="border-b border-border p-4 lg:hidden">
        <label htmlFor="inventory-scope" className="text-sm font-semibold">View inventory</label>
        <select id="inventory-scope" aria-label="Warehouse scope" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="mt-2 h-11 w-full rounded border border-input bg-background px-3 text-sm">
          <option value="">Overview — all warehouses</option>
          <optgroup label="Individual warehouses">{allWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.unknown ? ` (${w.code})` : ''}</option>)}</optgroup>
        </select>
      </div>
      <div className="hidden lg:block">
        <div className="border-b border-border p-3">
          <button type="button" onClick={() => setWarehouseId('')} aria-pressed={!warehouseId} className={rowClass(!warehouseId)}>
            <Layers3 className={cn('mt-0.5 size-5 shrink-0', !warehouseId ? 'text-primary' : 'text-muted-foreground')} />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overview</span>
              <span className="mt-1 block text-sm font-semibold">All warehouses</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">Combined stock · {allWarehouses.length} locations</span>
            </span>
            {!warehouseId && <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />}
          </button>
        </div>
        <div className="px-4 pb-2 pt-4">
          <h2 className="flex items-center justify-between text-xs font-semibold text-muted-foreground">Choose one warehouse <span className="rounded bg-muted px-2 py-0.5 tabular-nums">{allWarehouses.filter(w => !w.unknown).length}</span></h2>
          <div className="relative mt-3"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Find a warehouse" value={warehouseSearch} onChange={e => setWarehouseSearch(e.target.value)} placeholder="Find a warehouse…" className="pl-9" /></div>
        </div>
        <div className="max-h-[55vh] space-y-1 overflow-y-auto p-2">
          {visibleWarehouses.map(w => <button type="button" key={w.id} aria-pressed={warehouseId === w.id} onClick={() => setWarehouseId(w.id)} className={rowClass(warehouseId === w.id)}>
            {w.unknown ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" /> : <Warehouse className={cn('mt-0.5 size-4 shrink-0', warehouseId === w.id ? 'text-primary' : 'text-muted-foreground')} />}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{w.name}</span>
              {w.unknown && <span className="block break-all text-xs text-amber-600 dark:text-amber-400">{w.code}</span>}
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{summary([w])}</span>
              {status === 'ready' && <span className="block text-xs leading-5 text-muted-foreground">{shops.filter(shop => shop.warehouse?.id === w.id).length} linked shops{w.external ? ' · Read only' : ''}</span>}
            </span>
            {warehouseId === w.id && <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />}
          </button>)}
          {!visibleWarehouses.length && <p className="p-3 text-sm text-muted-foreground">No warehouses match your search.</p>}
        </div>
      </div>
    </section>
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold">{selected?.name ?? 'All warehouses'}</h2>
            {!selected && <span className="text-xs text-muted-foreground">{allWarehouses.length} locations</span>}
            {selected?.external && <span className="text-xs text-muted-foreground" title="Stock is managed by the fulfillment provider.">Read only</span>}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {selected && <Button variant="ghost" size="sm" aria-label="Back to overview" onClick={() => setWarehouseId('')}><ArrowLeft className="mr-1 size-4" />All warehouses</Button>}
            {status === 'ready' && <span className="mr-1 text-xs text-muted-foreground">{scopedShops.length} {scopedShops.length === 1 ? 'linked shop' : 'linked shops'} · {channelCount} {channelCount === 1 ? 'channel' : 'channels'}</span>}
            <Button variant="outline" size="sm" aria-label={selected ? 'Warehouse details' : 'Locations & shops'} onClick={() => openDetails(warehouseId)}>Details</Button>
            {editableSelected && hasCounts && onTransferStock && <Button variant="outline" size="sm" onClick={() => onTransferStock({ warehouse: selected })}>Transfer stock</Button>}
            {editableSelected && onLinkShops && <Button variant="outline" size="sm" onClick={() => onLinkShops(selected!)}>Set shop warehouse</Button>}
            <StockGuide iconOnly />
          </div>
        </div>
        {status === 'loading' ? <p className="mt-1 text-xs text-muted-foreground" role="status">Loading shop links…</p> : status === 'error' ? <div role="status" className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Shop links unavailable. Stock is still available.</span><Button variant="ghost" size="sm" onClick={() => reloadShops()}>Retry shop links</Button></div> : null}
        {selected?.unknown && <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">Stock is recorded against {selected.code}, but this location is not in the warehouse directory. These quantities remain included in totals.</p>}
      </header>
      {editableSelected && !hasRelatedProducts && onAddStock ? <div className="px-6 py-12 text-center"><Warehouse className="mx-auto mb-4 size-8 text-muted-foreground" /><h3 className="text-base font-semibold">Set up opening stock</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Select existing Product Master SKUs and record the quantities already in this warehouse.</p><Button className="mt-5" onClick={() => onAddStock(selected!)}>Record opening stock</Button></div> : <WarehouseStockTable onRecordOpeningStock={editableSelected && onAddStock ? () => onAddStock(selected!) : undefined} shops={shops} shopLinksState={status} onTransferStock={onTransferStock} positions={positions} onViewWarehouse={openDetails} onAdjustStock={onAdjustStock} products={products} warehouses={allWarehouses} warehouseId={warehouseId} onShowAll={() => setWarehouseId('')} initialSearch={initialSearch} />}
    </div>
    <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{detailsWarehouse?.name ?? 'All warehouses'}</SheetTitle><SheetDescription>Location details and shop defaults for the current selection.</SheetDescription></SheetHeader>
        <div className="mt-6 space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Warehouse information</h3>
            <div className="space-y-3">{detailsLocations.map(w => {
              const type = getWarehouseById(w.id)?.type;
              const platform = type === 'fba' ? 'amazon' : type === 'fbs' ? 'shopee' : undefined;
              return <div key={w.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                {platform ? <ChannelLogo channel={{ key: platform }} size="lg" /> : <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Warehouse className="size-5" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{w.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{w.code ?? w.id} · {w.unknown ? 'Unidentified location' : w.external ? 'External · Read only' : type === '3pl' ? '3PL' : 'Warehouse'}</p>
                  <p className="mt-2 text-muted-foreground">{w.address || 'Address not recorded'}</p>
                </div>
              </div>;
            })}</div>
          </section>
          {detailsWarehouse && canEditWarehouseStock(detailsWarehouse.id) && onAddStock && <section>
            <h3 className="mb-2 text-sm font-semibold">Stock setup</h3>
            <p className="text-sm text-muted-foreground">Record opening counts for existing SKUs that have no stock recorded here yet. For new deliveries, use Receive stock.</p>
            <Button variant="outline" className="mt-3" onClick={() => { setDetailsOpen(false); onAddStock(detailsWarehouse); }}>Record opening stock</Button>
          </section>}
          <section>
            <h3 className="mb-3 text-sm font-semibold">Shop defaults</h3>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">These shops use the selected warehouse by default. Individual listings can have their own stock source.</p>
            {status !== 'ready' ? <p className="text-sm text-muted-foreground">Shop links are currently unavailable.</p> : detailsShops.length ? <div className="divide-y divide-border rounded-lg border border-border">{detailsShops.map(shop => <div key={shop.id} className="flex items-start gap-3 p-3 text-sm">
              <ChannelLogo channel={{ key: shop.platform, label: shop.name }} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{shop.store_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{shop.name} · {shop.warehouse?.name}</p>
                <p className="mt-2 text-xs">{shop.status === 'CONNECTED' ? 'Connected' : shop.status === 'EXPIRED' ? 'Connection expired' : shop.status === 'INITIAL_SYNCING' ? 'Syncing' : 'Sync needs attention'} · Stock sync: {shop.sync_services.stock ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>)}</div> : <p className="text-sm text-muted-foreground">No shops use this selection as their default.</p>}
            {detailsWarehouse && canEditWarehouseStock(detailsWarehouse.id) && onLinkShops && <Button variant="outline" className="mt-4" onClick={() => { setDetailsOpen(false); onLinkShops(detailsWarehouse); }}>Set shop warehouse</Button>}
            {!detailsWarehouse && <p className="mt-4 text-xs text-muted-foreground">Select an individual warehouse to set a shop’s default.</p>}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  </div>;
}
