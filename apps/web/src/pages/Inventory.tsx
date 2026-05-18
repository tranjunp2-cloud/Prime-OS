import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Building2, ClipboardList, Package } from 'lucide-react';
import { DataTable, type Column } from '@/components/system/DataTable';
import { EmptyState } from '@/components/system/EmptyState';
import { FiltersBar } from '@/components/system/FiltersBar';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { SkuBadge } from '@/components/system/SkuBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getInventoryPositions } from '@/lib/inventory-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { getProducts } from '@/lib/product-store';
import { FbaInventorySync, type FbaInventoryRecord } from '@/components/fulfillment/FbaInventorySync';
import { getFulfillmentJobs } from '@/lib/fulfillment-store';
import { ATSBucketChart } from '@/components/inventory/ATSBucketChart';
import { ATSHealthDonut } from '@/components/inventory/ATSHealthDonut';
import { ReservationLedger } from '@/components/inventory/ReservationLedger';
import { InventoryStatusBadge } from '@/components/inventory/InventoryStatusBadge';
import { useInitialLoading } from '@/hooks/use-initial-loading';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedNumber, formatMessage } from '@/lib/i18n/format';


export default function Inventory() {
  const { locale, t } = useI18n();
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'local' | 'fba' | 'reservations'>('local');
  const [fbaSyncing, setFbaSyncing] = useState(false);
  const [lastFbaSync, setLastFbaSync] = useState<string | null>(null);
  const isInitialLoading = useInitialLoading();
  const activeWarehouseFilter = warehouseFilter === '__all__' ? '' : warehouseFilter;

  const positions = getInventoryPositions();
  const warehouses = getWarehouses();
  const products = getProducts();
  const fulfillmentJobs = getFulfillmentJobs();

  // FBA jobs — jobs going to FBA warehouses
  const fbaJobs = fulfillmentJobs.filter(j => j.flow_type === 'fba');

  // FBA mock records — in production these come from amazon-spapi.ts
  const mockFbaRecords: FbaInventoryRecord[] = fbaJobs.map(j => ({
    sku: j.job_code ?? j.id.slice(0, 8),
    fnsku: `FNSKU-${j.id.slice(0, 6).toUpperCase()}`,
    asin: '',
    localAts: 0,
    fbaQuantity: 0,
    fbaFulfillable: Math.floor(Math.random() * 50),
    fbaInboundWorking: Math.floor(Math.random() * 20),
    fbaInboundShipped: Math.floor(Math.random() * 10),
    fbaInboundReceiving: 0,
    lastUpdated: new Date().toISOString(),
    syncedAt: lastFbaSync,
  }));

  // Build SKU → product name map
  const skuProductMap = new Map<string, { name: string; skuCode: string }>();
  for (const p of products) {
    for (const s of p.skus) {
      skuProductMap.set(s.id, { name: p.name, skuCode: s.sku_code });
    }
  }

  const filteredPositions = positions.filter(p => {
    const warehouseMatch = !activeWarehouseFilter || p.warehouse_id === activeWarehouseFilter;
    const skuInfo = skuProductMap.get(p.sku_id);
    const searchMatch = !search ||
      (skuInfo?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (skuInfo?.skuCode ?? '').toLowerCase().includes(search.toLowerCase());
    return warehouseMatch && searchMatch;
  });

  // Aggregate by SKU
  const atsBySku = filteredPositions.reduce<Record<string, {
    skuId: string; name: string; skuCode: string;
    onHand: number; reserved: number; ats: number;
    health: 'healthy' | 'low' | 'critical';
  }>>((acc, p) => {
    const skuInfo = skuProductMap.get(p.sku_id);
    if (!skuInfo) return acc;
    if (!acc[p.sku_id]) {
      acc[p.sku_id] = {
        skuId: p.sku_id, name: skuInfo.name, skuCode: skuInfo.skuCode,
        onHand: 0, reserved: 0, ats: 0,
        health: 'healthy',
      };
    }
    acc[p.sku_id].onHand += p.on_hand ?? 0;
    acc[p.sku_id].reserved += p.reserved ?? 0;
    const skuAts = Math.max(0, (p.on_hand ?? 0) - (p.reserved ?? 0));
    acc[p.sku_id].ats += skuAts;
    return acc;
  }, {});

  // Set health
  for (const sku of Object.values(atsBySku)) {
    sku.health = sku.ats === 0 ? 'critical' : sku.ats < 10 ? 'low' : 'healthy';
  }

  const totalATS = Object.values(atsBySku).reduce((sum, s) => sum + s.ats, 0);
  const totalOnHand = Object.values(atsBySku).reduce((sum, s) => sum + s.onHand, 0);
  const skuRows = Object.values(atsBySku).sort((a, b) => b.ats - a.ats);
  const localInventoryColumns: Column<(typeof skuRows)[number]>[] = [
    {
      header: t('products.colProduct'),
      className: 'max-w-[220px]',
      cell: (stats) => <span className="block truncate text-sm font-medium">{stats.name}</span>,
    },
    {
      header: t('inventory.colSku'),
      cell: (stats) => (
        <SkuBadge sku={stats.skuCode} size="compact" />
      ),
    },
    {
      header: t('inventory.kpiTotalOnHand'),
      className: 'text-right',
      cell: (stats) => <span className="block text-right font-mono text-sm">{formatLocalizedNumber(locale, stats.onHand)}</span>,
    },
    {
      header: t('inventory.colReserved'),
      className: 'text-right',
      cell: (stats) => (
        <span className="block text-right font-mono text-sm text-muted-foreground">
          {stats.reserved > 0 ? formatLocalizedNumber(locale, stats.reserved) : '—'}
        </span>
      ),
    },
    {
      header: t('inventory.kpiTotalAts'),
      className: 'text-right',
      cell: (stats) => (
        <span className={`block text-right font-mono text-sm font-semibold ${
          stats.ats === 0 ? 'text-rose-700 dark:text-rose-300' : stats.ats < 10 ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'
        }`}>
          {formatLocalizedNumber(locale, stats.ats)}
        </span>
      ),
    },
    {
      header: t('inventory.colStatus'),
      cell: (stats) => <InventoryStatusBadge status={stats.health} className="capitalize" />,
    },
  ];

  // FBA sync handler — in production this calls amazon-spapi.getInventorySummaries()
  const handleFbaSync = async () => {
    setFbaSyncing(true);
    await new Promise(r => setTimeout(r, 1500)); // mock delay
    setLastFbaSync(new Date().toISOString());
    setFbaSyncing(false);
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:gap-6 md:p-6 lg:p-8">
      <PageHeader
        title={t('inventory.pageTitle')}
        description={t('inventory.pageDesc')}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="h-9 w-full rounded-lg border-input bg-background text-sm sm:w-[200px]">
                <SelectValue placeholder={t('inventory.allWarehouses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('inventory.allWarehouses')}</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              to="/warehouses"
              className="self-start text-xs text-primary hover:underline sm:self-center"
            >
              {t('inventory.manageWarehouses')} →
            </Link>
          </div>
        }
      />

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('inventory.filterSearchPlaceholder'),
          onClear: () => setSearch(''),
        }}
        primaryFilters={{
          value: activeTab,
          onChange: (value) => setActiveTab(value as 'local' | 'fba' | 'reservations'),
          options: [
            { value: 'local', label: t('inventory.localTab'), count: skuRows.length },
            { value: 'reservations', label: t('inventory.reservationsTab') },
            { value: 'fba', label: t('inventory.fbaTab'), count: fbaJobs.length },
          ],
        }}
        resultCount={search || activeWarehouseFilter
          ? formatMessage(t('inventory.matchingSkus'), {
              count: skuRows.length,
              suffix: skuRows.length !== 1 ? 's' : '',
            })
          : undefined}
        clearAll={search || activeWarehouseFilter ? () => {
          setSearch('');
          setWarehouseFilter('');
        } : undefined}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryMetricCard
          label={t('inventory.kpiTotalAts')}
          value={formatLocalizedNumber(locale, totalATS)}
          meta={t('inventory.kpiTotalAtsMeta')}
          icon={<Boxes className="size-4" />}
          tone="success"
        />
        <SummaryMetricCard
          label={t('inventory.kpiTotalOnHand')}
          value={formatLocalizedNumber(locale, totalOnHand)}
          meta={t('inventory.kpiTotalOnHandMeta')}
          icon={<Package className="size-4" />}
          tone="info"
        />
        <SummaryMetricCard
          label={t('inventory.kpiWarehouses')}
          value={warehouses.length}
          meta={formatMessage(t('inventory.kpiWarehousesMeta'), { count: warehouses.length })}
          icon={<Building2 className="size-4" />}
          tone="indigo"
        />
      </div>

      {/* ATS Charts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Boxes className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t('inventory.inventoryHealth')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <ATSBucketChart warehouseId={activeWarehouseFilter || undefined} topN={8} />
          </div>
          <div className="min-w-0">
            <ATSHealthDonut warehouseId={activeWarehouseFilter || undefined} />
          </div>
        </div>
      </div>

      {/* FBA Inventory Tab */}
      {activeTab === 'fba' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Package className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{t('inventory.fbaSyncSurface')}</h2>
          </div>
          <FbaInventorySync
            records={mockFbaRecords}
            onSync={handleFbaSync}
            isSyncing={fbaSyncing}
            lastSyncAt={lastFbaSync}
            amazonConfigStatus={fbaJobs.length > 0 ? 'connected' : 'pending_setup'}
          />
        </div>
      )}

      {/* Reservations Tab */}
      {activeTab === 'reservations' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ClipboardList className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{t('inventory.reservationLedgerTitle')}</h2>
          </div>
          <ReservationLedger />
        </div>
      )}

      {/* Local Inventory Table */}
      {activeTab === 'local' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Boxes className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{t('inventory.atsBySku')}</h2>
          </div>
          <div className="grid gap-3 md:hidden" data-testid="inventory-mobile-sku-cards">
            {skuRows.length === 0 && !isInitialLoading ? (
              <EmptyState
                title={search || warehouseFilter ? t('inventory.emptyFilteredTitle') : t('inventory.emptyEmptyTitle')}
                description={search || activeWarehouseFilter
                  ? t('inventory.emptyFilteredDesc')
                  : t('inventory.emptyEmptyDesc')}
                icon={<Boxes className="size-5" />}
                variant={search || activeWarehouseFilter ? 'filtered' : 'empty'}
                action={search || activeWarehouseFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setWarehouseFilter('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button type="button" variant="outline" asChild>
                    <Link to="/warehouses">{t('inventory.manageWarehouses')}</Link>
                  </Button>
                )}
                className="min-h-[260px]"
              />
            ) : null}
            {skuRows.map((stats) => (
              <div key={stats.skuId} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{stats.name}</div>
                    <SkuBadge sku={stats.skuCode} size="compact" className="mt-2" />
                  </div>
                  <InventoryStatusBadge status={stats.health} className="shrink-0 capitalize" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border bg-muted/20 p-2">
                    <div className="text-[11px] text-muted-foreground">On hand</div>
                    <div className="mt-1 font-mono text-sm font-semibold">{formatLocalizedNumber(locale, stats.onHand)}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-2">
                    <div className="text-[11px] text-muted-foreground">Reserved</div>
                    <div className="mt-1 font-mono text-sm font-semibold">{stats.reserved > 0 ? formatLocalizedNumber(locale, stats.reserved) : '—'}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-2">
                    <div className="text-[11px] text-muted-foreground">ATS</div>
                    <div className={`mt-1 font-mono text-sm font-semibold ${stats.ats === 0 ? 'text-rose-700 dark:text-rose-300' : stats.ats < 10 ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                      {formatLocalizedNumber(locale, stats.ats)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DataTable
            columns={localInventoryColumns}
            data={skuRows}
            keyExtractor={(stats) => stats.skuId}
            isLoading={isInitialLoading}
            wrapperClassName="[&_table]:min-w-[760px]"
            className="hidden md:block"
            emptyState={!isInitialLoading ? (
              <EmptyState
                title={search || warehouseFilter ? t('inventory.emptyFilteredTitle') : t('inventory.emptyEmptyTitle')}
                description={search || activeWarehouseFilter
                  ? t('inventory.emptyFilteredDesc')
                  : t('inventory.emptyEmptyDesc')}
                icon={<Boxes className="size-5" />}
                variant={search || activeWarehouseFilter ? 'filtered' : 'empty'}
                action={search || activeWarehouseFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setWarehouseFilter('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button type="button" variant="outline" asChild>
                    <Link to="/warehouses">{t('inventory.manageWarehouses')}</Link>
                  </Button>
                )}
                className="min-h-[320px]"
              />
            ) : undefined}
            emptyTitle={search || activeWarehouseFilter ? t('inventory.emptyFilteredTitle') : t('inventory.emptyEmptyTitle')}
            emptyDescription={search || activeWarehouseFilter
              ? t('inventory.emptyFilteredDesc')
              : t('inventory.emptyEmptyDesc')}
            emptyVariant={search || activeWarehouseFilter ? 'filtered' : 'empty'}
          />
        </div>
      )}
    </div>
  );
}
