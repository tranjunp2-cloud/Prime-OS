import { useId, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Info, Store } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SalesMetricHelp } from './SalesMetricHelp';
import type { Product } from '@/lib/product-store';
import { demoProductSales, SALES_CHANNEL_LABELS, salesShopsForProduct, summarizeProductSales, type ProductSalesData, type SalesPeriodDays } from '@/lib/product-sales-performance';
import { cn } from '@/lib/utils';
import styles from './ProductSalesPerformance.module.css';

const formatNumber = (value: number) => value.toLocaleString('en-US');
const formatDate = (time: number | string, detailed = false) => new Date(time).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  ...(detailed ? { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' } as const : {}),
});
type SalesRow = ReturnType<typeof summarizeProductSales>['rows'][number];
const SALES_HELP = {
  overview: 'See how this product sells across its linked shops. Figures use completed orders in the selected full days, in UTC. Only shops with complete period data contribute to totals. Master status does not affect sales.',
  units: 'Sellable units of this product in completed orders during the selected period. A pack counts as one unit. Pending and cancelled orders are excluded; returns are not deducted.',
  orders: 'Completed orders containing this product. Each order is counted once per shop, even if it contains multiple units or variants of this product.',
  share: 'This shop’s units sold divided by total units sold across shops with complete period data. For example, 40 of 100 units is 40%. “—” means no sales to calculate a share, or incomplete shop data.',
};

function Change({ value }: { value: number | null }) {
  const Icon = value !== null && value < 0 ? ArrowDownRight : ArrowUpRight;
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap tabular-nums', value === null || value === 0 ? 'text-muted-foreground' : value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>
    {value === null ? <span title="A complete previous period with sales is needed">—<span className="sr-only"> Comparison unavailable</span></span>
      : <>{value !== 0 && <Icon aria-hidden="true" className="size-3.5" />}{value > 0 ? '+' : ''}{value.toFixed(1)}%</>}
  </span>;
}

export function ProductSalesPerformance({ product, showDemoInitially = false, data, onReviewChannels, now: suppliedNow }: {
  product?: Product;
  showDemoInitially?: boolean;
  /** Real analytics must arrive through a shop-aware adapter, not the legacy SKU-only OMS store. */
  data?: ProductSalesData;
  onReviewChannels: () => void;
  now?: Date;
}) {
  const id = useId();
  const [mountedAt] = useState(() => new Date());
  const now = suppliedNow ?? mountedAt;
  const [days, setDays] = useState<SalesPeriodDays>(30);
  const [showDemo, setShowDemo] = useState(showDemoInitially);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [orderLimit, setOrderLimit] = useState(20);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const source = useMemo(() => data ?? (showDemo && product ? demoProductSales(product, now)
    : { demo: false, shops: salesShopsForProduct(product), lines: [] }), [showDemo, product, now, data]);
  const summary = useMemo(() => summarizeProductSales(product?.id ?? '', source, days, now), [product?.id, source, days, now]);
  const { rows, units, orders, leaders, completeShops } = summary;
  const hasData = completeShops > 0;
  const partial = hasData && completeShops < rows.length;
  const singleShop = rows.length === 1 ? rows[0] : null;
  const selected = rows.find(row => row.id === selectedShop);
  const orderRows = useMemo(() => {
    const grouped = new Map<string, { id: string; completedAt: string; units: number; skus: Set<string> }>();
    selected?.lines.forEach(line => {
      const order = grouped.get(line.orderId) ?? { id: line.orderId, completedAt: line.completedAt, units: 0, skus: new Set<string>() };
      order.units += line.quantity;
      order.skus.add(line.sku);
      if (Date.parse(line.completedAt) > Date.parse(order.completedAt)) order.completedAt = line.completedAt;
      grouped.set(order.id, order);
    });
    return [...grouped.values()].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  }, [selected]);
  const dateRange = `${formatDate(summary.window.start)} – ${formatDate(summary.window.end - 1)}`;
  const periodLabel = `${days} completed days · UTC`;
  const changeHelp = `Percentage change in units sold compared with the immediately preceding ${days} days: (current − previous) ÷ previous × 100. Positive means growth; negative means decline. “—” means the previous period had zero sales or either period lacks complete data.`;

  function openOrders(row: SalesRow, trigger: HTMLButtonElement) {
    lastTrigger.current = trigger;
    setOrderLimit(20);
    setSelectedShop(row.id);
  }

  function shopTable() {
    return <table role="table" className={cn('w-full table-fixed text-sm', styles.table)}>
      <caption className="sr-only">All {rows.length} shops for {dateRange}. Fully covered shops ranked by units sold. Change compares units sold with the prior {days} days.</caption>
      <thead role="rowgroup"><tr role="row" className="border-b text-xs text-muted-foreground">
        <th role="columnheader" scope="col" className="w-[40%] text-left font-normal">Shop</th>
        <th role="columnheader" scope="col" aria-sort="descending" className="w-[14%] text-right font-normal"><SalesMetricHelp label="Units sold" description={SALES_HELP.units} /></th>
        <th role="columnheader" scope="col" className="w-[12%] text-right font-normal"><SalesMetricHelp label="Orders" description={SALES_HELP.orders} /></th>
        <th role="columnheader" scope="col" className="w-[16%] text-right font-normal"><SalesMetricHelp label="Share" description={SALES_HELP.share} /></th>
        <th role="columnheader" scope="col" className="w-[18%] text-right font-normal">vs. prior {days}d</th>
      </tr></thead>
      <tbody role="rowgroup" className="divide-y">{rows.map(row => {
        const available = row.coverage === 'complete';
        const share = available && units > 0 ? row.units / units * 100 : null;
        const rank = available && row.units > 0 ? rows.findIndex(item => item.coverage === 'complete' && item.units === row.units) + 1 : null;
        const identity = <><span aria-hidden="true" className="w-3 shrink-0 text-xs tabular-nums text-muted-foreground">{rank ?? '—'}</span><ChannelLogo channel={{ key: row.channel === 'website' ? 'primeweb' : row.channel }} size="sm" /><span className="min-w-0 break-words"><span className="font-medium">{row.name}</span>{' '}<span className={styles.channel}>{SALES_CHANNEL_LABELS[row.channel]}</span>{!available && <span className="block text-xs text-muted-foreground">{row.coverage === 'partial' ? 'Incomplete period' : 'Not synced'}</span>}</span></>;
        return <tr role="row" key={row.id}>
          <td role="cell" className={styles.identityCell}>{available ? <button type="button" aria-label={`View orders for ${row.name}`} onClick={event => openOrders(row, event.currentTarget)} className={cn(styles.identity, 'w-full rounded-md text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none')}>{identity}</button> : <div className={styles.identity}>{identity}</div>}</td>
          <td role="cell" className="text-right font-semibold tabular-nums"><span className={styles.mobileLabel}><SalesMetricHelp label="Units sold" description={SALES_HELP.units} /></span>{available ? formatNumber(row.units) : <span className="font-normal text-muted-foreground">—</span>}</td>
          <td role="cell" className="text-right tabular-nums"><span className={styles.mobileLabel}><SalesMetricHelp label="Orders" description={SALES_HELP.orders} /></span>{available ? formatNumber(row.orders) : <span className="text-muted-foreground">—</span>}</td>
          <td role="cell"><span className={styles.mobileLabel}><SalesMetricHelp label="Share" description={SALES_HELP.share} /></span><div className={styles.share}><span aria-hidden="true" className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${share ?? 0}%` }} /></span><span className="text-xs tabular-nums text-muted-foreground">{share === null ? '—' : `${share.toFixed(1)}%`}</span></div></td>
          <td role="cell" className="text-right text-xs"><span className={styles.mobileLabel}>vs. prior {days}d</span><Change value={available ? row.change : null} /></td>
        </tr>;
      })}</tbody>
    </table>;
  }

  return <TooltipProvider delayDuration={200}>
    <Card role="region" aria-labelledby={`${id}-title`} className={styles.card}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><BarChart3 aria-hidden="true" className="size-4 text-primary" /><h2 id={`${id}-title`} className="text-sm font-semibold"><SalesMetricHelp label="Sales performance" description={SALES_HELP.overview} /></h2>{source.demo && <span className="rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground">Demo data</span>}</div>
          <p className="mt-1.5 text-xs text-muted-foreground">{dateRange} · UTC</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {product && source.shops.length > 0 && !data && <Button type="button" size="sm" variant="ghost" className="h-9 text-muted-foreground" aria-pressed={showDemo} onClick={() => setShowDemo(!showDemo)}>{showDemo ? 'Hide demo' : 'Preview demo'}</Button>}
          <label htmlFor={`${id}-period`} className="sr-only">Sales period</label>
          <select id={`${id}-period`} value={days} onChange={event => setDays(Number(event.target.value) as SalesPeriodDays)} className="h-9 rounded-md border bg-background pl-3 pr-6 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.summary}>
          {hasData ? <dl aria-label="Sales summary" className={styles.metrics}>
            <div><dt className="text-xs text-muted-foreground"><SalesMetricHelp label="Units sold" description={`${SALES_HELP.units} Totals include only shops with complete period data.`} /></dt><dd className="mt-1 text-2xl font-semibold leading-7 tracking-tight tabular-nums">{formatNumber(units)}</dd></div>
            <div><dt className="text-xs text-muted-foreground"><SalesMetricHelp label="Orders" description={`${SALES_HELP.orders} Totals include only shops with complete period data.`} /></dt><dd className="mt-1 text-2xl font-semibold leading-7 tracking-tight tabular-nums">{formatNumber(orders)}</dd></div>
            <div><dt className="text-xs text-muted-foreground"><span className="sr-only">Units sold change </span><SalesMetricHelp label={`vs. prior ${days} days`} description={changeHelp} /></dt><dd className="mt-1 text-xl font-semibold leading-7"><Change value={summary.change} /></dd></div>
          </dl> : <div className="flex h-full flex-col justify-center gap-3">
            <Store aria-hidden="true" className="size-6 text-muted-foreground" /><div><p className="text-sm font-semibold">{rows.length ? 'Sales data unavailable' : 'No linked shops yet'}</p><p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">{rows.length ? 'Missing data is not zero sales. Connect complete shop-level order data to see results.' : 'Link a shop listing to see this product’s sales once order data is available.'}</p></div>
            {!rows.length && <Button type="button" variant="outline" className="w-fit" onClick={onReviewChannels}>View channel listings<ArrowRight className="size-4" /></Button>}
          </div>}
          {hasData && units === 0 && <p className="mt-2 text-xs text-muted-foreground">No completed sales in this period.</p>}
        </div>
        {rows.length > 0 && <div className="min-w-0 border-t pt-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold">{singleShop ? 'Linked shop' : hasData ? 'Sales by shop' : 'Shop coverage'}</h3>
            {!singleShop && <p className="text-xs text-muted-foreground">{leaders.length > 1 ? `${leaders.length} shops tied for first · ${formatNumber(leaders[0].units)} units each` : `${rows.length} shops · Ranked by units sold`}</p>}
          </div>
          {singleShop ? <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-3">
              <ChannelLogo channel={{ key: singleShop.channel === 'website' ? 'primeweb' : singleShop.channel }} size="sm" />
              <div className="min-w-0"><p className="break-words text-sm font-medium">{singleShop.name}</p><p className="mt-1 text-xs text-muted-foreground">{SALES_CHANNEL_LABELS[singleShop.channel]}{singleShop.coverage !== 'complete' && ` · ${singleShop.coverage === 'partial' ? 'Incomplete period' : 'Not synced'}`}</p></div>
            </div>
            {singleShop.coverage === 'complete' && <Button type="button" variant="ghost" size="sm" className="-mr-2 min-h-11 gap-1 text-primary" aria-label={`View orders for ${singleShop.name}`} onClick={event => openOrders(singleShop, event.currentTarget)}>Order details<ArrowRight aria-hidden="true" /></Button>}
          </div> : <>
            {shopTable()}
          </>}
        </div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p>{completeShops}/{rows.length} {singleShop ? 'shop' : 'shops'} with complete period data{partial && <span className="text-amber-700 dark:text-amber-300"> · Partial coverage</span>}</p><p aria-label="Sales data freshness">{summary.updatedAt ? <>{source.demo ? 'Demo snapshot' : 'Updated'}: <time dateTime={summary.updatedAt}>{formatDate(summary.updatedAt, true)}</time></> : 'No complete sales sync recorded'}</p></div>
        <Popover><PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" className="-mr-2 h-8 gap-1.5 text-xs text-muted-foreground"><Info aria-hidden="true" />How sales are counted</Button></PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-3 text-xs leading-5" aria-label="Sales definitions and coverage">
            <p className="font-semibold text-foreground">{periodLabel}</p>
            <p>Quantities in completed orders, grouped by completion date in UTC. Pending and cancelled orders are excluded; returns are not deducted. A pack counts as one sellable unit. Orders are counted once per shop for this product.</p>
            <p>{partial ? 'Partial coverage: totals, shares and ranking include only shops with a complete selected period.' : 'Shares use shops with complete data only.'} Comparisons need a complete prior period with sales. Master status does not affect sales.</p>
            {source.demo && <p className="border-t pt-3 text-muted-foreground">Illustrative sales and orders only. No real shop, order or inventory data is changed.</p>}
          </PopoverContent>
        </Popover>
      </div>
    </Card>
    <Sheet open={selectedShop !== null} onOpenChange={open => { if (!open) setSelectedShop(null); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl motion-reduce:animate-none motion-reduce:transition-none" onCloseAutoFocus={event => { event.preventDefault(); lastTrigger.current?.focus(); }}>
        <SheetHeader className="pr-6"><SheetTitle>{source.demo ? 'Demo orders' : 'Product orders'}</SheetTitle><SheetDescription>{selected?.name} · {product?.name}<br />{dateRange} · UTC · Completed orders only{source.demo && <span className="mt-2 block">Demo data · Illustrative orders, not records from your connected shops.</span>}</SheetDescription></SheetHeader>
        {selected && <div className="mt-6 space-y-4">
          <p className="text-sm font-medium">{formatNumber(selected.orders)} orders · {formatNumber(selected.units)} units of this product</p>
          <p className="flex flex-wrap gap-x-1.5 text-xs"><Change value={selected.change} /><span className="text-muted-foreground">units sold vs. prior {days} days</span></p>
          {orderRows.length ? <ol className="divide-y" aria-label="Orders for this product and shop">{orderRows.slice(0, orderLimit).map(order => <li key={order.id} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><p className="break-all text-sm font-medium">{order.id}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(order.completedAt, true)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{[...order.skus].join(', ')}</p></div><span className="shrink-0 text-sm tabular-nums">{formatNumber(order.units)} {order.units === 1 ? 'unit' : 'units'}</span></li>)}</ol> : <p className="py-6 text-sm text-muted-foreground">No completed orders in this period.</p>}
          {orderRows.length > orderLimit && <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setOrderLimit(orderLimit + 20)}>Load more orders</Button>}
        </div>}
        <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={() => setSelectedShop(null)}>Back to overview</Button>
      </SheetContent>
    </Sheet>
  </TooltipProvider>;
}
