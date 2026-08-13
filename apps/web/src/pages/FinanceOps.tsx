import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  Gauge,
  History,
  Landmark,
  Mail,
  MoreHorizontal,
  Network,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
  TriangleAlert,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import {
  financeOpsApi,
  type AgingBucket,
  type CollectionStatus,
  type FinanceForecast,
  type FinanceOwner,
  type FinanceRisk,
  type FinanceSummary,
  type FinanceView,
  type PaymentConnection,
  type PaymentEvidence,
  type ReceivableItem,
  type SourceType,
} from '@/lib/finance-ops-api';
import { cn } from '@/lib/utils';

const views: Array<{ value: FinanceView; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'collections', label: 'Collections' },
  { value: 'forecast', label: 'Forecast' },
  { value: 'risk', label: 'Controls & Risks' },
];

const agingBuckets: Array<{ value: AgingBucket; label: string; description: string }> = [
  { value: 'DUE_TODAY', label: 'Due Today', description: 'Requires attention today' },
  { value: 'OVERDUE_1_7', label: '1–7 Days Overdue', description: 'Early collection follow-up' },
  { value: 'OVERDUE_8_30', label: '8–30 Days Overdue', description: 'Escalated collection queue' },
  { value: 'OVERDUE_30_PLUS', label: '>30 Days Overdue', description: 'Critical recovery action' },
];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function compactMoney(value: number) {
  if (value >= 1_000_000_000) return `₫${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `₫${(value / 1_000_000).toFixed(1)}M`;
  return money.format(value);
}

function KpiCard({ label, value, detail, icon: Icon, progress, tone = 'indigo' }: { label: string; value: string; detail: string; icon: LucideIcon; progress?: number; tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700', slate: 'bg-slate-100 text-slate-600' };
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><span className={cn('grid size-8 place-items-center rounded-lg', colors[tone])}><Icon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-slate-950">{value}</p>{progress !== undefined ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.min(100, progress)}%` }} /></div> : null}<p className="mt-2 text-xs text-slate-500">{detail}</p></article>;
}

function SeverityBadge({ severity }: { severity: FinanceRisk['severity'] | 'CRITICAL' | 'WARNING' | 'INFO' }) {
  const tone = severity === 'CRITICAL' ? 'border-rose-200 bg-rose-50 text-rose-700' : severity === 'WARNING' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700';
  return <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider', tone)}>{severity === 'CRITICAL' ? 'Critical' : severity === 'WARNING' ? 'Warning' : 'Info'}</Badge>;
}

function CollectionStatusBadge({ status }: { status: CollectionStatus }) {
  const tone = status === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'PARTIAL' ? 'border-blue-200 bg-blue-50 text-blue-700' : status === 'DISPUTED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  const label = status === 'PAID' ? 'Collected' : status === 'PARTIAL' ? 'Partial' : status === 'DISPUTED' ? 'Disputed' : 'Pending';
  return <Badge variant="outline" className={cn('font-semibold', tone)}>{label}</Badge>;
}

export default function FinanceOps() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view') as FinanceView | null;
  const view: FinanceView = views.some((item) => item.value === requestedView) ? requestedView as FinanceView : 'overview';
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [owners, setOwners] = useState<FinanceOwner[]>([]);
  const [forecast, setForecast] = useState<FinanceForecast | null>(null);
  const [risks, setRisks] = useState<FinanceRisk[]>([]);
  const [paymentConnections, setPaymentConnections] = useState<PaymentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState<'ALL' | SourceType>('ALL');
  const [paymentStatus, setPaymentStatus] = useState<'ALL' | 'OVERDUE' | CollectionStatus>('ALL');
  const [ownerId, setOwnerId] = useState('ALL');
  const [agingBucket, setAgingBucket] = useState<'ALL' | AgingBucket>('ALL');
  const [activeReceivable, setActiveReceivable] = useState<ReceivableItem | null>(null);
  const [targetInput, setTargetInput] = useState('');
  const [proof, setProof] = useState<PaymentEvidence | null>(null);
  const [expandedHistory, setExpandedHistory] = useState(false);

  const setView = (next: FinanceView) => setSearchParams({ view: next });

  const loadPrimary = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, forecastResult, riskResult] = await Promise.all([financeOpsApi.summary(), financeOpsApi.forecast(), financeOpsApi.risks()]);
      setSummary(summaryResult.data);
      setForecast(forecastResult.data);
      setTargetInput(String(forecastResult.data.target.target_amount));
      setRisks(riskResult.data);
      setPaymentConnections(riskResult.payment_connections);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load Finance Ops.');
    } finally { setLoading(false); }
  }, []);

  const loadReceivables = useCallback(async () => {
    const params = new URLSearchParams({ page_size: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (sourceType !== 'ALL') params.set('source_type', sourceType);
    if (paymentStatus !== 'ALL') params.set('payment_status', paymentStatus);
    if (ownerId !== 'ALL') params.set('owner_id', ownerId);
    if (agingBucket !== 'ALL') params.set('aging_bucket', agingBucket);
    try {
      const result = await financeOpsApi.receivables(params);
      setReceivables(result.data);
      setOwners(result.owners);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load receivables.'); }
  }, [agingBucket, ownerId, paymentStatus, search, sourceType]);

  useEffect(() => { void loadPrimary(); }, [loadPrimary]);
  useEffect(() => { const timer = window.setTimeout(() => void loadReceivables(), 180); return () => window.clearTimeout(timer); }, [loadReceivables]);

  const refreshReceivable = async (item: ReceivableItem) => {
    setActiveReceivable(item);
    await Promise.all([loadReceivables(), loadPrimary()]);
  };

  const openReceivable = async (id: string) => {
    try { const result = await financeOpsApi.receivable(id); setProof(result.data.evidence); setExpandedHistory(false); setActiveReceivable(result.data); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to open receivable.'); }
  };

  const sendReminder = async () => {
    if (!activeReceivable) return;
    try { const result = await financeOpsApi.sendReminder(activeReceivable.id); await refreshReceivable(result.data); toast.success('Payment reminder sent'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to send reminder.'); }
  };

  const assignOwner = async (nextOwnerId: string) => {
    if (!activeReceivable) return;
    try { const result = await financeOpsApi.assignOwner(activeReceivable.id, nextOwnerId); await refreshReceivable(result.data); toast.success('Collection owner updated'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to assign owner.'); }
  };

  const confirmPayment = async () => {
    if (!activeReceivable) return;
    try { const result = await financeOpsApi.confirmPayment(activeReceivable.id, proof); await refreshReceivable(result.data); toast.success('Payment collected; source update queued'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to confirm payment.'); }
  };

  const flagDispute = async () => {
    if (!activeReceivable) return;
    const reason = window.prompt('Why is this receivable disputed?', 'Payment amount or proof requires review.');
    if (!reason) return;
    try { const result = await financeOpsApi.flagDispute(activeReceivable.id, reason); await refreshReceivable(result.data); toast.success('Receivable flagged for dispute'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to flag dispute.'); }
  };

  const saveTarget = async () => {
    if (!forecast) return;
    try { await financeOpsApi.updateTarget(forecast.month_year, Number(targetInput)); await loadPrimary(); toast.success('Monthly target saved with a new version'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update target.'); }
  };

  const updateRisk = async (risk: FinanceRisk, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try { const result = await financeOpsApi.updateRisk(risk.id, status); setRisks((current) => current.map((item) => item.id === risk.id ? result.data : item)); await loadPrimary(); toast.success(status === 'RESOLVED' ? 'Risk resolved' : 'Risk acknowledged'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update risk.'); }
  };

  const activeRiskCount = risks.filter((risk) => risk.status !== 'RESOLVED').length;
  const riskCards = useMemo(() => [
    { type: 'UNVERIFIED_PROOF', label: 'Payment Proof Audit', icon: FileCheck2 },
    { type: 'TARGET_GAP', label: 'Revenue Target Coverage Risk', icon: Target },
    { type: 'UNASSIGNED_SERVICE', label: 'Unassigned Service Bookings', icon: UsersRound },
    { type: 'CONNECTOR_DISCONNECTED', label: 'Disconnected Payment Connections', icon: Network },
    { type: 'LOW_REPEAT_REVENUE', label: 'Low Repeat Customer Rate', icon: RefreshCw },
  ].map((card) => ({ ...card, count: risks.filter((risk) => risk.risk_type === card.type && risk.status !== 'RESOLVED').length })), [risks]);

  return <main className="min-h-full bg-slate-50/60 p-4 pb-24 md:p-6"><div className="mx-auto max-w-[1720px] space-y-5">
    <WorkspacePageHeader title="Finance Ops" description="Operational revenue, collections control, cash forecasting, and financial risk monitoring." icon={WalletCards} actions={<Button variant="outline" onClick={() => void Promise.all([loadPrimary(), loadReceivables()])}><RefreshCw className="size-4" />Refresh Data</Button>} />

    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Finance Ops views">{views.map((item) => <button key={item.value} type="button" onClick={() => setView(item.value)} className={cn('min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors', view === item.value ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{item.label}{item.value === 'risk' && activeRiskCount ? <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">{activeRiskCount}</span> : null}</button>)}</nav>

    {summary ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Finance summary"><KpiCard label="Revenue this month" value={compactMoney(summary.revenue_this_month)} detail={`${compactMoney(summary.target_amount)} target · ${summary.target_progress.toFixed(1)}% progress`} icon={TrendingUp} progress={summary.target_progress} /><KpiCard label="Collected" value={compactMoney(summary.collected)} detail="Commerce orders & service bookings" icon={CheckCircle2} tone="emerald" /><KpiCard label="Amount to collect" value={compactMoney(summary.amount_to_collect)} detail="Pending receivables" icon={ReceiptText} tone="amber" /><KpiCard label="Remaining to target" value={compactMoney(summary.remaining_to_target)} detail="Current monthly target gap" icon={Target} tone="rose" /><KpiCard label="Finance Health Index" value={`${summary.finance_health_index}/100`} detail="Coverage, collection, repeat & connections" icon={Gauge} tone="slate" /></section> : null}

    {loading && !summary ? <div className="rounded-xl border border-slate-200 bg-white py-20 text-center text-sm text-slate-500">Loading Finance Ops…</div> : null}

    {view === 'overview' && summary ? <OverviewView summary={summary} onView={setView} /> : null}
    {view === 'collections' && summary ? <CollectionsView summary={summary} receivables={receivables} owners={owners} search={search} setSearch={setSearch} sourceType={sourceType} setSourceType={setSourceType} paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} ownerId={ownerId} setOwnerId={setOwnerId} agingBucket={agingBucket} setAgingBucket={setAgingBucket} onOpen={openReceivable} onQuickReminder={async (item) => { const result = await financeOpsApi.sendReminder(item.id); await refreshReceivable(result.data); toast.success(`Reminder sent to ${item.customer_name}`); }} /> : null}
    {view === 'forecast' && forecast ? <ForecastView forecast={forecast} targetInput={targetInput} setTargetInput={setTargetInput} onSave={saveTarget} /> : null}
    {view === 'risk' ? <RiskView risks={risks} riskCards={riskCards} paymentConnections={paymentConnections} onUpdate={updateRisk} /> : null}
  </div>

  <Sheet open={Boolean(activeReceivable)} onOpenChange={(open) => { if (!open) setActiveReceivable(null); }}><SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[650px]">{activeReceivable ? <><SheetHeader className="border-b border-slate-200 px-6 py-5 pr-14"><div className="flex items-center gap-2"><CollectionStatusBadge status={activeReceivable.collection_status} /><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{activeReceivable.source_type === 'COMMERCE_ORDER' ? 'Commerce Order' : 'Service Booking'}</Badge></div><SheetTitle className="pt-2">{activeReceivable.customer_name}</SheetTitle><SheetDescription><button type="button" className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline">{activeReceivable.source_id}<ExternalLink className="size-3" /></button> · Due {date.format(new Date(`${activeReceivable.due_date}T00:00:00`))}</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
<section className="rounded-xl border border-slate-200"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-semibold text-slate-900">Financial breakdown</h3></div><dl className="grid grid-cols-2 gap-px bg-slate-200"><FinanceFact label="Original Amount" value={money.format(activeReceivable.total_amount)} /><FinanceFact label="Collected Amount" value={money.format(activeReceivable.collected_amount)} /><FinanceFact label="Balance Due" value={money.format(activeReceivable.balance_due)} emphasis /><FinanceFact label="Aging" value={activeReceivable.aging_days ? `${activeReceivable.aging_days} days overdue` : activeReceivable.is_due ? 'Due today' : 'Upcoming'} /></dl></section>
    <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Payment Evidence & Proof</h3><p className="mt-1 text-xs text-slate-500">{activeReceivable.payment_method}</p></div>{proof ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{proof.provider_status}</Badge> : null}</div>{proof ? <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3"><FileText className="size-5 text-indigo-600" /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{proof.file_name}</p><p className="text-xs text-slate-500">Uploaded {dateTime.format(new Date(proof.uploaded_at))}</p></div></div> : <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">No payment proof attached.</p>}<label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><Upload className="size-4" />Attach payment proof<input type="file" className="sr-only" accept="image/*,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) setProof({ file_name: file.name, provider_status: 'Manual proof attached', uploaded_at: new Date().toISOString() }); }} /></label></section>
    <section className="overflow-hidden rounded-xl border border-slate-200"><button type="button" onClick={() => setExpandedHistory((current) => !current)} className="flex min-h-12 w-full items-center justify-between px-4 text-left"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="size-4 text-slate-500" />Collection Timeline</span><ChevronDown className={cn('size-4 text-slate-400 transition-transform', expandedHistory && 'rotate-180')} /></button>{expandedHistory ? <div className="border-t border-slate-200 px-4 py-2">{activeReceivable.timeline.map((entry) => <div key={entry.id} className="relative border-l border-slate-200 py-3 pl-4 before:absolute before:-left-1 before:top-4 before:size-2 before:rounded-full before:bg-indigo-500"><p className="text-sm text-slate-700">{entry.message}</p><p className="mt-1 text-xs text-slate-400">{dateTime.format(new Date(entry.at))}</p></div>)}</div> : null}</section>
  </div><div className="border-t border-slate-200 bg-white p-4"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void sendReminder()}><Mail className="size-4" />Send Payment Reminder</Button><Select value={activeReceivable.assigned_owner_id || ''} onValueChange={(value) => void assignOwner(value)}><SelectTrigger className="w-[155px]"><UserRound className="size-4" /><SelectValue placeholder="Assign Owner" /></SelectTrigger><SelectContent>{owners.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => navigate(`/finance/invoices?source_id=${encodeURIComponent(activeReceivable.source_id)}${activeReceivable.linked_invoice_id ? `&invoice_id=${encodeURIComponent(activeReceivable.linked_invoice_id)}` : ''}`)}><FileText className="size-4" />View / Issue Invoice</Button><Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => void flagDispute()}><AlertTriangle className="size-4" />Flag Dispute</Button><Button className="ml-auto" disabled={activeReceivable.collection_status === 'PAID'} onClick={() => void confirmPayment()}><Check className="size-4" />Confirm Manual Payment</Button></div></div></> : null}</SheetContent></Sheet>
  </main>;
}

function FinanceFact({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="bg-white p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className={cn('mt-1 text-sm font-semibold tabular-nums text-slate-800', emphasis && 'text-lg text-indigo-700')}>{value}</dd></div>;
}

function OverviewView({ summary, onView }: { summary: FinanceSummary; onView: (view: FinanceView) => void }) {
  const metrics = [
    { label: 'Commerce revenue', value: summary.overview.commerce_revenue, detail: 'Recognized commerce orders', icon: Banknote, tone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Service Booking value', value: summary.overview.service_booking_revenue, detail: 'Recognized service bookings', icon: CalendarClock, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Sales Pipeline value', value: summary.overview.sales_pipeline, detail: 'Open CRM opportunities', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Active Risk Count', value: summary.overview.active_risk_count, detail: 'Open finance controls', icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700' },
  ];
  return <div className="grid gap-5 xl:grid-cols-[1fr_1.35fr]"><section className="grid gap-3 sm:grid-cols-2">{metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5"><span className={cn('grid size-9 place-items-center rounded-lg', tone)}><Icon className="size-4" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{typeof value === 'number' && label !== 'Active Risk Count' ? compactMoney(value) : value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>)}</section><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Finance Queue</h2><p className="mt-1 text-sm text-slate-500">Backend-generated actions ordered by financial impact.</p></div><div className="divide-y divide-slate-100">{summary.finance_queue.map((item) => <article key={item.id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><SeverityBadge severity={item.severity} /><p className="mt-2 font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.description}</p></div><Button variant="outline" onClick={() => onView(item.target_view)}>{item.action_label}<ArrowRight className="size-4" /></Button></article>)}</div></section></div>;
}

type CollectionsProps = {
  summary: FinanceSummary; receivables: ReceivableItem[]; owners: FinanceOwner[]; search: string; setSearch: (value: string) => void;
  sourceType: 'ALL' | SourceType; setSourceType: (value: 'ALL' | SourceType) => void; paymentStatus: 'ALL' | 'OVERDUE' | CollectionStatus; setPaymentStatus: (value: 'ALL' | 'OVERDUE' | CollectionStatus) => void;
  ownerId: string; setOwnerId: (value: string) => void; agingBucket: 'ALL' | AgingBucket; setAgingBucket: (value: 'ALL' | AgingBucket) => void;
  onOpen: (id: string) => void; onQuickReminder: (item: ReceivableItem) => Promise<void>;
};

function CollectionsView(props: CollectionsProps) {
  return <div className="space-y-4"><section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Receivable aging buckets">{agingBuckets.map((bucket) => { const metric = props.summary.aging[bucket.value]; const active = props.agingBucket === bucket.value; return <button key={bucket.value} type="button" onClick={() => props.setAgingBucket(active ? 'ALL' : bucket.value)} className={cn('rounded-xl border bg-white p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', active ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20')}><div className="flex items-start justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{bucket.label}</p><span className={cn('grid size-7 place-items-center rounded-lg', bucket.value === 'OVERDUE_30_PLUS' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}><Clock3 className="size-4" /></span></div><div className="mt-3 flex items-baseline justify-between gap-3"><p className="text-2xl font-bold tabular-nums text-slate-950">{metric.count}</p><p className="text-sm font-semibold tabular-nums text-slate-700">{compactMoney(metric.amount)}</p></div><p className="mt-1 text-xs text-slate-500">{bucket.description}</p></button>; })}</section><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid gap-3 border-b border-slate-200 p-4 xl:grid-cols-[minmax(300px,1fr)_190px_170px_180px]"><label className="relative"><span className="sr-only">Search receivables</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={props.search} onChange={(event) => props.setSearch(event.target.value)} className="pl-9" placeholder="Customer name, Order ID, or Invoice ID" /></label><Select value={props.sourceType} onValueChange={(value) => props.setSourceType(value as 'ALL' | SourceType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Source Types</SelectItem><SelectItem value="COMMERCE_ORDER">Commerce Order</SelectItem><SelectItem value="SERVICE_BOOKING">Service Booking</SelectItem></SelectContent></Select><Select value={props.paymentStatus} onValueChange={(value) => props.setPaymentStatus(value as 'ALL' | 'OVERDUE' | CollectionStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Payment Statuses</SelectItem><SelectItem value="UNPAID">Pending</SelectItem><SelectItem value="OVERDUE">Overdue</SelectItem><SelectItem value="PARTIAL">Partial</SelectItem><SelectItem value="DISPUTED">Disputed</SelectItem><SelectItem value="PAID">Collected</SelectItem></SelectContent></Select><Select value={props.ownerId} onValueChange={props.setOwnerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Collectors</SelectItem><SelectItem value="UNASSIGNED">Unassigned</SelectItem>{props.owners.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}</SelectContent></Select></div><div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Source ID</th><th className="px-4 py-3">Customer Name</th><th className="px-4 py-3 text-right">Total Amount</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Aging</th><th className="px-4 py-3">Collection Status</th><th className="px-4 py-3">Assigned Owner</th><th className="px-4 py-3">Linked Invoice</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{props.receivables.map((item) => <tr key={item.id} role="button" tabIndex={0} onClick={() => props.onOpen(item.id)} onKeyDown={(event) => { if (event.key === 'Enter') props.onOpen(item.id); }} className="cursor-pointer transition hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"><td className="px-4 py-3"><p className="font-semibold text-indigo-700">{item.source_id}</p><Badge variant="outline" className="mt-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600">{item.source_type === 'COMMERCE_ORDER' ? 'Commerce Order' : 'Service Booking'}</Badge></td><td className="px-4 py-3 font-medium text-slate-800">{item.customer_name}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900"><p>{money.format(item.total_amount)}</p><p className="mt-1 text-xs font-normal text-slate-500">{money.format(item.balance_due)} due</p></td><td className="px-4 py-3 text-slate-600">{date.format(new Date(`${item.due_date}T00:00:00`))}</td><td className="px-4 py-3"><span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-semibold', item.aging_days > 30 ? 'border-rose-200 bg-rose-50 text-rose-700' : item.aging_days > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>{item.aging_days ? `${item.aging_days} days` : 'Due today'}</span></td><td className="px-4 py-3"><CollectionStatusBadge status={item.collection_status} /></td><td className="px-4 py-3"><span className={cn('text-sm', item.assigned_owner_name ? 'font-medium text-slate-700' : 'text-amber-700')}>{item.assigned_owner_name || 'Unassigned'}</span></td><td className="px-4 py-3"><p className="font-medium text-slate-700">{item.linked_invoice_id || 'Not linked'}</p><p className="mt-1 text-xs text-slate-500">{item.invoice_status}</p></td><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1"><DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline"><BadgeDollarSign className="size-4" />Quick Action</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void props.onQuickReminder(item)}><Mail className="mr-2 size-4" />Send Reminder</DropdownMenuItem><DropdownMenuItem onSelect={() => props.onOpen(item.id)}><UserRound className="mr-2 size-4" />Assign Owner</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button size="sm" variant="ghost" onClick={() => props.onOpen(item.id)}>View Details</Button></div></td></tr>)}</tbody></table></div>{!props.receivables.length ? <div className="py-14 text-center"><ReceiptText className="mx-auto size-6 text-slate-300" /><p className="mt-3 font-semibold text-slate-900">No receivables match these filters</p><button type="button" onClick={() => { props.setSearch(''); props.setSourceType('ALL'); props.setPaymentStatus('ALL'); props.setOwnerId('ALL'); props.setAgingBucket('ALL'); }} className="mt-2 text-sm font-semibold text-indigo-700 hover:underline">Clear all filters</button></div> : null}</section></div>;
}

function ForecastView({ forecast, targetInput, setTargetInput, onSave }: { forecast: FinanceForecast; targetInput: string; setTargetInput: (value: string) => void; onSave: () => void }) {
  const bridgeTotal = forecast.gap_bridge.reduce((sum, lever) => sum + lever.amount * lever.coverage, 0);
  return <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><div className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="monthly-target">Monthly Target Configuration</Label><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">₫</span><Input id="monthly-target" type="number" min="1" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} className="pl-7 text-lg font-semibold tabular-nums" /></div></div><Button onClick={onSave}><Check className="size-4" />Save New Version</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><FinanceFact label="Revenue this month" value={compactMoney(forecast.revenue_this_month)} /><FinanceFact label="Remaining to target" value={compactMoney(forecast.remaining_to_target)} emphasis /><FinanceFact label="Weighted bridge" value={compactMoney(bridgeTotal)} /></div></section><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">How to Reach Target</h2><p className="mt-1 text-sm text-slate-500">Prioritized sources that can close the remaining revenue gap.</p></div><div className="divide-y divide-slate-100">{forecast.gap_bridge.map((lever, index) => <article key={lever.id} className="p-5"><div className="flex items-start gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{lever.label}</p><p className="font-semibold tabular-nums text-slate-900">{compactMoney(lever.amount)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${lever.coverage * 100}%` }} /></div><p className="mt-2 text-xs text-slate-500">{Math.round(lever.coverage * 100)}% confidence · {compactMoney(lever.amount * lever.coverage)} weighted contribution</p></div></div></article>)}</div></section></div><div className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-950">Probability Breakdown</h2><p className="mt-1 text-sm text-slate-500">Pipeline grouped by conversion confidence.</p><div className="mt-5 space-y-5">{forecast.probability.map((item) => <div key={item.category}><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-700">{item.category}</p><p className="text-sm font-semibold tabular-nums text-slate-900">{compactMoney(item.amount)}</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', item.category === 'Committed' ? 'bg-emerald-500' : item.category === 'Probable' ? 'bg-indigo-500' : 'bg-slate-400')} style={{ width: `${item.probability * 100}%` }} /></div><p className="mt-1 text-xs text-slate-500">{Math.round(item.probability * 100)}% probability</p></div>)}</div></section><section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><History className="size-4 text-slate-500" /><h2 className="font-semibold text-slate-950">Target Version History</h2></div><div className="mt-4 space-y-3">{forecast.target_history.slice(0, 5).map((target) => <div key={target.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-medium text-slate-800">{target.month_year}</p><p className="text-xs text-slate-500">{dateTime.format(new Date(target.created_at))}</p></div><p className="font-semibold tabular-nums text-slate-900">{compactMoney(target.target_amount)}</p></div>)}</div></section></div></div>;
}

function RiskView({ risks, riskCards, paymentConnections, onUpdate }: { risks: FinanceRisk[]; riskCards: Array<{ type: string; label: string; icon: LucideIcon; count: number }>; paymentConnections: PaymentConnection[]; onUpdate: (risk: FinanceRisk, status: 'ACKNOWLEDGED' | 'RESOLVED') => void }) {
  return <div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{riskCards.map(({ type, label, icon: Icon, count }) => <article key={type} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><span className={cn('grid size-8 place-items-center rounded-lg', count ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}><Icon className="size-4" /></span><span className={cn('text-xl font-bold tabular-nums', count ? 'text-rose-700' : 'text-emerald-700')}>{count}</span></div><p className="mt-4 text-sm font-semibold text-slate-900">{label}</p><p className="mt-1 text-xs text-slate-500">{count ? 'Requires finance review' : 'No active findings'}</p></article>)}</section><div className="grid gap-5 xl:grid-cols-[1fr_340px]"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">AI Action Feed & Risk Management</h2><p className="mt-1 text-sm text-slate-500">Prioritized finance controls with an auditable resolution state.</p></div><div className="divide-y divide-slate-100">{risks.map((risk) => <article key={risk.id} className={cn('p-5 transition', risk.status === 'RESOLVED' && 'bg-slate-50/70 opacity-70')}><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={risk.severity} /><Badge variant="outline" className="border-slate-200 bg-white text-[10px] uppercase text-slate-600">{risk.status.toLowerCase()}</Badge></div><p className="mt-2 font-semibold text-slate-900">{risk.title}</p><p className="mt-1 text-sm text-slate-500">{risk.description}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => toast.info(risk.description)}><Search className="size-4" />Review Detail</Button>{risk.status === 'OPEN' ? <Button size="sm" variant="outline" onClick={() => void onUpdate(risk, 'ACKNOWLEDGED')}><Check className="size-4" />Acknowledge Risk</Button> : null}{risk.status !== 'RESOLVED' ? <Button size="sm" onClick={() => void onUpdate(risk, 'RESOLVED')}><Wrench className="size-4" />Resolve Risk</Button> : null}</div></div></article>)}</div></section><section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Landmark className="size-5 text-indigo-700" /><h2 className="font-semibold text-slate-950">Payment connections</h2></div><p className="mt-1 text-sm text-slate-500">Real-time collection update coverage.</p><div className="mt-5 space-y-3">{paymentConnections.map((connection) => <div key={connection.id} className="flex min-h-11 items-center justify-between rounded-lg border border-slate-200 px-3"><span className="text-sm font-medium text-slate-700">{connection.name}</span><span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', connection.status === 'CONNECTED' ? 'text-emerald-700' : 'text-rose-700')}>{connection.status === 'CONNECTED' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}{connection.status === 'CONNECTED' ? 'Connected' : 'Disconnected'}</span></div>)}</div></section></div></div>;
}
