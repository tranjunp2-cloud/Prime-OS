import { useMemo, useState } from 'react';
import { BarChart3, Box, CalendarDays, ChevronDown, CircleDollarSign, Download, PackageCheck, Search, ShoppingBag, Truck, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';

type MetricKey = 'revenue' | 'orders' | 'products' | 'retention' | 'shipping';
type DimensionKey = 'store' | 'product' | 'region' | 'customer';

const metrics: Array<{ key: MetricKey; label: string; value: string; detail: string; icon: typeof BarChart3 }> = [
  { key: 'revenue', label: 'Total Revenue', value: '₫4.82B', detail: '+18.4% vs previous period', icon: CircleDollarSign },
  { key: 'orders', label: 'Total Orders', value: '12,480', detail: '+12.6% vs previous period', icon: ShoppingBag },
  { key: 'products', label: 'Total Products Sold', value: '18,942', detail: '+9.2% vs previous period', icon: PackageCheck },
  { key: 'retention', label: 'Repeat Purchase Rate', value: '38.6%', detail: '+4.1 pts vs previous period', icon: UsersRound },
  { key: 'shipping', label: 'Avg Shipping Cost', value: '₫31,400', detail: '-5.3% vs previous period', icon: Truck },
];

const chartData: Record<MetricKey, number[]> = {
  revenue: [38, 44, 42, 55, 51, 64, 61, 72, 68, 80, 77, 89],
  orders: [26, 34, 31, 43, 46, 52, 49, 61, 65, 69, 75, 82],
  products: [32, 37, 35, 48, 44, 59, 57, 66, 62, 74, 81, 86],
  retention: [42, 43, 45, 44, 47, 49, 50, 53, 54, 56, 57, 60],
  shipping: [76, 72, 74, 68, 66, 63, 65, 59, 57, 55, 52, 49],
};

const distributions = [
  { title: 'Order Cancellation Reasons', subtitle: 'Reasons & initiators', items: [{ label: 'Customer request', value: 38, color: '#635bff' }, { label: 'Out of stock', value: 27, color: '#818cf8' }, { label: 'Payment failed', value: 21, color: '#38bdf8' }, { label: 'Seller initiated', value: 14, color: '#cbd5e1' }] },
  { title: 'Top 5 Regions by Revenue', subtitle: 'Province contribution', items: [{ label: 'Ho Chi Minh City', value: 31, color: '#635bff' }, { label: 'Hanoi', value: 26, color: '#818cf8' }, { label: 'Da Nang', value: 17, color: '#38bdf8' }, { label: 'Binh Duong', value: 14, color: '#10b981' }, { label: 'Dong Nai', value: 12, color: '#f59e0b' }] },
  { title: 'Shipping Carrier Breakdown', subtitle: 'Delivered order share', items: [{ label: 'GHN', value: 44, color: '#635bff' }, { label: 'GHTK', value: 34, color: '#38bdf8' }, { label: 'ViettelPost', value: 22, color: '#10b981' }] },
];

const tableConfigs: Record<DimensionKey, { label: string; columns: string[]; rows: string[][] }> = {
  store: { label: 'By Store / Channel', columns: ['Store Name', 'Total Orders', 'Gross Revenue', 'Net Revenue', 'Avg Order Value', 'Total Customers'], rows: [['Shopee Flagship', '4,820', '₫1.92B', '₫1.74B', '₫398K', '3,406'], ['TikTok Shop VN', '3,150', '₫1.24B', '₫1.13B', '₫394K', '2,688'], ['Prime Web', '2,340', '₫920M', '₫868M', '₫393K', '1,976'], ['Prime POS', '1,420', '₫510M', '₫488M', '₫359K', '1,086'], ['Lazada Official', '750', '₫230M', '₫212M', '₫307K', '642']] },
  product: { label: 'By Product', columns: ['Product Name', 'Channel', 'Revenue', 'Units Sold', 'Orders', 'Return Rate %', 'Repeat Rate %'], rows: [['HydraGlow Essence 30ml', 'All channels', '₫684M', '1,842', '1,610', '2.1%', '42.8%'], ['Daily Barrier Cream', 'Shopee', '₫492M', '1,316', '1,108', '1.8%', '38.4%'], ['Vitamin C Brightening Set', 'TikTok Shop', '₫417M', '984', '876', '3.2%', '31.6%'], ['Hydrating Mask 5-pack', 'Prime Web', '₫318M', '1,219', '940', '1.4%', '45.2%']] },
  region: { label: 'By Region', columns: ['Province', 'Revenue', 'Total Orders', 'Delivered', 'Canceled', 'Returned', 'Avg Ship Fee'], rows: [['Ho Chi Minh City', '₫1.49B', '3,868', '3,612', '151', '105', '₫24,800'], ['Hanoi', '₫1.25B', '3,214', '2,984', '142', '88', '₫27,400'], ['Da Nang', '₫819M', '2,106', '1,928', '112', '66', '₫31,200'], ['Binh Duong', '₫675M', '1,742', '1,608', '79', '55', '₫22,600']] },
  customer: { label: 'By Customer Segment', columns: ['Store', 'Total Customers', 'New Customers', 'New Revenue', 'Repeat Customers', 'Repeat Revenue'], rows: [['Shopee Flagship', '3,406', '2,108', '₫982M', '1,298', '₫758M'], ['TikTok Shop VN', '2,688', '1,902', '₫804M', '786', '₫326M'], ['Prime Web', '1,976', '1,024', '₫448M', '952', '₫420M'], ['Prime POS', '1,086', '694', '₫298M', '392', '₫190M']] },
};

function Donut({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  let cursor = 0;
  const stops = items.map((item) => { const start = cursor; cursor += item.value; return `${item.color} ${start}% ${cursor}%`; }).join(', ');
  return <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center"><div className="mx-auto grid size-32 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }}><div className="grid size-20 place-items-center rounded-full bg-white text-sm font-semibold text-slate-700">100%</div></div><div className="grid gap-2">{items.map((item) => <div key={item.label} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="min-w-0 flex-1 truncate font-medium text-slate-600">{item.label}</span><span className="font-semibold text-slate-900">{item.value}%</span></div>)}</div></div>;
}

function TrendChart({ metric }: { metric: MetricKey }) {
  const values = chartData[metric];
  const points = values.map((value, index) => `${32 + index * 82},${205 - value * 1.65}`).join(' ');
  return <svg viewBox="0 0 960 230" className="h-[260px] w-full" role="img" aria-label={`${metrics.find((item) => item.key === metric)?.label} trend chart`}>
    {[35, 75, 115, 155, 195].map((y) => <line key={y} x1="26" x2="934" y1={y} y2={y} stroke="#e2e8f0" />)}
    <polyline points={points} fill="none" stroke="#635bff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {points.split(' ').map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} cx={cx} cy={cy} r="4" fill="white" stroke="#635bff" strokeWidth="3" />; })}
    {['Aug 1', 'Aug 5', 'Aug 9', 'Aug 13', 'Aug 17', 'Aug 21'].map((label, index) => <text key={label} x={32 + index * 180} y="224" fill="#64748b" fontSize="11">{label}</text>)}
  </svg>;
}

export function PrimeClientReportsPage() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('revenue');
  const [aggregation, setAggregation] = useState('Daily');
  const [dimension, setDimension] = useState<DimensionKey>('store');
  const [query, setQuery] = useState('');
  const table = tableConfigs[dimension];
  const filteredRows = useMemo(() => table.rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase())), [query, table.rows]);

  return <div className="space-y-6 p-4 pb-28 md:p-6">
    <WorkspacePageHeader title="Unified Analytics Hub" description="Revenue, commerce, product, fulfillment, and customer performance in one operating view." icon={BarChart3} />

    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end" aria-label="Analytics filters">
      <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-slate-600"><span>Date range</span><button type="button" className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"><CalendarDays className="size-4 text-slate-400" />Aug 1, 2026 — Aug 31, 2026<ChevronDown className="ml-auto size-4 text-slate-400" /></button></label>
      <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-slate-600"><span>Stores</span><button type="button" className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"><Box className="size-4 text-slate-400" />All stores (6)<ChevronDown className="ml-auto size-4 text-slate-400" /></button></label>
      <Button className="min-h-10 px-6">Apply</Button>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Analytics KPI summary">{metrics.map((metric) => { const Icon = metric.icon; const active = activeMetric === metric.key; return <button key={metric.key} type="button" onClick={() => setActiveMetric(metric.key)} className={cn('rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', active ? 'border-primary ring-1 ring-primary/20' : 'border-slate-200')}><span className={cn('grid size-9 place-items-center rounded-lg', active ? 'bg-primary text-white' : 'bg-indigo-50 text-indigo-600')}><Icon className="size-4" /></span><div className="mt-4 text-xs font-semibold text-slate-500">{metric.label}</div><div className="mt-1 text-2xl font-semibold text-slate-900">{metric.value}</div><div className={cn('mt-1 text-xs font-semibold', metric.key === 'shipping' ? 'text-emerald-600' : 'text-indigo-600')}>{metric.detail}</div></button>; })}</section>

    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold text-slate-900">Unified Trend</h2><p className="mt-1 text-xs font-medium text-slate-500">One chart for every primary business metric</p></div><div className="flex flex-wrap gap-2"><select value={activeMetric} onChange={(event) => setActiveMetric(event.target.value as MetricKey)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="revenue">Revenue</option><option value="orders">Order Count</option><option value="products">Products Sold</option><option value="retention">Customer Retention (New vs Repeat)</option></select><div className="flex rounded-lg border border-slate-200 p-0.5">{['Daily', 'Weekly', 'Monthly'].map((item) => <button key={item} type="button" onClick={() => setAggregation(item)} className={cn('h-8 rounded-md px-3 text-xs font-semibold transition-colors', aggregation === item ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50')}>{item}</button>)}</div></div></div><div className="overflow-x-auto p-4"><TrendChart metric={activeMetric} /></div></section>

    <section className="grid gap-4 xl:grid-cols-3">{distributions.map((card) => <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">{card.title}</h2><p className="mt-1 text-xs font-medium text-slate-500">{card.subtitle}</p><div className="mt-5"><Donut items={card.items} /></div></article>)}</section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{(Object.keys(tableConfigs) as DimensionKey[]).map((key) => <button key={key} type="button" onClick={() => setDimension(key)} className={cn('min-h-9 shrink-0 rounded-md px-3 text-xs font-semibold transition-colors', dimension === key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{tableConfigs[key].label}</button>)}</div><div className="flex gap-2"><div className="relative min-w-0 flex-1 xl:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search master data..." className="h-10 pl-9" /></div><Button variant="outline" className="h-10 shrink-0"><Download className="size-4" />CSV Export</Button></div></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr>{table.columns.map((column) => <th key={column} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map((row, rowIndex) => <tr key={rowIndex} className="transition-colors hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={cellIndex} className={cn('px-4 py-3 text-sm text-slate-600', cellIndex === 0 && 'font-semibold text-slate-900')}>{cell}</td>)}</tr>)}</tbody></table></div><div className="border-t border-slate-200 px-4 py-3 text-xs font-medium text-slate-500">Showing {filteredRows.length} records · Updated 2 minutes ago</div></section>
  </div>;
}
