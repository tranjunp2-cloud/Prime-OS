import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Layers3, Search, Warehouse } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { channelIntegrationsApi, type ConnectedChannelRecord } from '@/lib/channel-integrations-api';
import type { Product } from '@/lib/product-store';
import { DEMO_WAREHOUSE_ALIASES } from '@/lib/demo-warehouse-locations';
import { getWarehouseById } from '@/lib/warehouse-store';
import { productWarehouseIds, stockAt, sumStock } from '@/lib/warehouse-stock-view';
import { cn } from '@/lib/utils';
import { WarehouseStockTable, type StockLocation, type StockAdjustmentTarget } from './WarehouseStockTable';

type Location = { id: string; name: string; code?: string; address?: string | null };
export function MyWarehouses({ warehouses, products, onAdjustStock, initialSearch = '' }: { onAdjustStock?: (target: StockAdjustmentTarget) => void; warehouses: Location[]; products: Product[]; initialSearch?: string }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [shops, setShops] = useState<ConnectedChannelRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsWarehouseId, setDetailsWarehouseId] = useState('');
  const openDetails = (id: string) => { setDetailsWarehouseId(id); setDetailsOpen(true); };
  useEffect(() => {
    let active = true;
    setStatus('loading');
    channelIntegrationsApi.channels().then(result => { if (active) { setShops(result.data.map(shop => {
      const targetId = shop.warehouse && DEMO_WAREHOUSE_ALIASES[shop.warehouse.id];
      const target = targetId ? getWarehouseById(targetId) : undefined;
      return target ? { ...shop, warehouse: { id: target.id, name: target.name, code: target.code, city: target.address ?? '' } } : shop;
    })); setStatus('ready'); } }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [attempt]);
  const locations = new Map<string, StockLocation>(warehouses.map(w => {
    const stored = getWarehouseById(w.id);
    return [w.id, { ...w, external: Boolean(stored?.is_virtual || ['fba', 'fbs'].includes(stored?.type ?? '')) }];
  }));
  shops.forEach(shop => { if (shop.warehouse && !locations.has(shop.warehouse.id)) locations.set(shop.warehouse.id, shop.warehouse); });
  products.forEach(product => productWarehouseIds(product).forEach(id => {
    if (!locations.has(id)) locations.set(id, { id, name: 'Unidentified warehouse', code: id, unknown: true });
  }));
  const allWarehouses = [...locations.values()].sort((a, b) => Number(Boolean(a.unknown)) - Number(Boolean(b.unknown)));
  const selected = locations.get(warehouseId);
  const detailsWarehouse = locations.get(detailsWarehouseId);
  const detailsLocations = detailsWarehouse ? [detailsWarehouse] : allWarehouses;
  const detailsShops = shops.filter(shop => shop.warehouse && (!detailsWarehouseId || shop.warehouse.id === detailsWarehouseId));
  const scopedLocations = selected ? [selected] : allWarehouses;
  const scopedShops = shops.filter(shop => shop.warehouse && (!warehouseId || shop.warehouse.id === warehouseId));
  const stats = (scope: StockLocation[]) => {
    const values = products.map(product => sumStock(scope.map(w => stockAt(product, w.id))));
    const total = sumStock(values);
    return { products: values.filter(value => value.quantity !== null).length, ...total };
  };
  const scopeStats = stats(scopedLocations);
  const summary = (scope: StockLocation[]) => {
    const value = stats(scope);
    return `${value.products} products · ${value.quantity?.toLocaleString() ?? '—'} units${value.incomplete ? ' (partial)' : ''}`;
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
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{selected ? <Warehouse className="size-3.5" /> : <Layers3 className="size-3.5" />}{selected ? 'Single warehouse' : `Overview · ${allWarehouses.length} locations`}</span>
            {selected?.external && <span className="text-xs text-muted-foreground" title="Stock is managed by the fulfillment provider.">Read only</span>}
          </div>
          <div className="flex shrink-0 gap-2">
            {selected && <Button variant="ghost" size="sm" onClick={() => setWarehouseId('')}><ArrowLeft className="mr-1.5 size-4" />Back to overview</Button>}
            <Button variant="outline" size="sm" onClick={() => openDetails(warehouseId)}>{selected ? 'Warehouse details' : 'Locations & shops'}</Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <div className="flex items-baseline gap-1.5"><dt className="text-muted-foreground">products</dt><dd className="order-first font-semibold tabular-nums">{scopeStats.products}</dd></div>
            <div className="flex flex-wrap items-baseline gap-1.5"><dt className="text-muted-foreground">{selected ? 'Units in this warehouse' : 'Units across all warehouses'}</dt><dd className="order-first font-semibold tabular-nums">{scopeStats.quantity?.toLocaleString() ?? '—'}</dd>{scopeStats.incomplete && <dd className="text-xs text-amber-600 dark:text-amber-400">Partial data</dd>}</div>
          </dl>
          {status === 'ready' ? <button className="min-h-9 text-left text-sm font-medium text-primary hover:underline" onClick={() => openDetails(warehouseId)}>{scopedShops.length} linked shops across {new Set(scopedShops.map(shop => shop.platform)).size} sales channels</button> : status === 'loading' ? <p className="text-xs text-muted-foreground" role="status">Loading shop links…</p> : <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Shop links unavailable. Stock is still available.</span><Button variant="ghost" size="sm" onClick={() => setAttempt(n => n + 1)}>Retry shop links</Button></div>}
        </div>
        {selected?.unknown && <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">Stock is recorded against {selected.code}, but this location is not in the warehouse directory. These quantities remain included in totals.</p>}
      </header>
      <WarehouseStockTable onViewWarehouse={openDetails} onAdjustStock={onAdjustStock} products={products} warehouses={allWarehouses} warehouseId={warehouseId} onShowAll={() => setWarehouseId('')} initialSearch={initialSearch} />
    </div>
    <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{detailsWarehouse?.name ?? 'All warehouses'}</SheetTitle><SheetDescription>Location details and linked shops for the current selection.</SheetDescription></SheetHeader>
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
          <section>
            <h3 className="mb-3 text-sm font-semibold">Linked shops</h3>
            {status !== 'ready' ? <p className="text-sm text-muted-foreground">Shop links are currently unavailable.</p> : detailsShops.length ? <div className="divide-y divide-border rounded-lg border border-border">{detailsShops.map(shop => <div key={shop.id} className="flex items-start gap-3 p-3 text-sm">
              <ChannelLogo channel={{ key: shop.platform, label: shop.name }} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{shop.store_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{shop.name} · {shop.warehouse?.name}</p>
                <p className="mt-2 text-xs">{shop.status === 'CONNECTED' ? 'Connected' : shop.status === 'EXPIRED' ? 'Connection expired' : shop.status === 'INITIAL_SYNCING' ? 'Syncing' : 'Sync needs attention'} · Stock sync: {shop.sync_services.stock ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>)}</div> : <p className="text-sm text-muted-foreground">No shops linked to this selection.</p>}
            <Button asChild variant="outline" className="mt-4"><Link to="/sales-channels/connected-channels">Manage shop connections</Link></Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  </div>;
}
