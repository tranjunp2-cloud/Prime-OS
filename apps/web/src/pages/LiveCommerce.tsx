import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, CircleDollarSign, Plus, RadioTower, RefreshCw, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { CreateLiveSessionWizard } from '@/components/live-commerce/CreateLiveSessionWizard';
import { EditSessionDrawer } from '@/components/live-commerce/EditSessionDrawer';
import { LiveWarRoomDrawer } from '@/components/live-commerce/LiveWarRoomDrawer';
import { SessionOperationsTable } from '@/components/live-commerce/SessionOperationsTable';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { liveCommerceApi, type LiveOptions, type LiveSession, type LiveSessionStatus, type LiveSummary } from '@/lib/live-commerce-api';
import { cn } from '@/lib/utils';

const emptySummary: LiveSummary = { active_sessions: 0, scheduled_today: 0, allocated_stock: 0, sold_units: 0, sold_percentage: 0, live_orders: 0, attributed_revenue: 0 };

export default function LiveCommercePage() {
  const [summary, setSummary] = useState(emptySummary);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [options, setOptions] = useState<LiveOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<LiveSession | null>(null);
  const [status, setStatus] = useState<LiveSessionStatus | 'ALL'>('ALL');
  const [channel, setChannel] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (channel !== 'ALL') params.set('channel_id', channel);
      const [summaryResponse, sessionsResponse, optionsResponse] = await Promise.all([liveCommerceApi.summary(), liveCommerceApi.list(params), liveCommerceApi.options()]);
      setSummary(summaryResponse.data);
      setSessions(sessionsResponse.data);
      setOptions(optionsResponse.data);
      setSelected((current) => current ? sessionsResponse.data.find((item) => item.id === current.id) ?? current : null);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load Live Commerce.'); } finally { setLoading(false); }
  }, [status, channel]);

  useEffect(() => { void load(); }, [load]);
  const cards = useMemo(() => [
    { label: 'Active Sessions', value: summary.active_sessions.toLocaleString(), detail: `${summary.scheduled_today} ${summary.scheduled_today === 1 ? 'session' : 'sessions'} scheduled today`, icon: RadioTower, tone: 'rose' },
    { label: 'Allocated Stock', value: summary.allocated_stock.toLocaleString(), detail: 'Across active and scheduled sessions', icon: Boxes, tone: 'indigo' },
    { label: 'Reserved / Sold', value: `${summary.sold_units.toLocaleString()} / ${summary.allocated_stock.toLocaleString()}`, detail: `${summary.sold_percentage}% of allocated live stock`, icon: CircleDollarSign, tone: 'amber', progress: summary.sold_percentage },
    { label: 'Live Orders', value: summary.live_orders.toLocaleString(), detail: `₫${summary.attributed_revenue.toLocaleString()} attributed revenue`, icon: ShoppingBag, tone: 'emerald' },
  ], [summary]);

  return <div className="min-h-full bg-background p-4 md:p-6"><div className="mx-auto max-w-[1600px] space-y-5"><WorkspacePageHeader title="Live Commerce" description="Plan livestream sessions, reserve sellable stock, and monitor real-time order capture." icon={RadioTower} actions={<Button onClick={() => setWizardOpen(true)}><Plus className="size-4"/>Create Live Session</Button>}/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Live commerce summary">{cards.map(({ label, value, detail, icon: Icon, tone, progress }) => <article key={label} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><span className={cn('grid size-8 place-items-center rounded-lg', tone === 'rose' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : tone === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300')}><Icon className="size-4"/></span></div><p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{loading ? '—' : value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>{progress !== undefined ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.min(100, progress)}%` }}/></div> : null}</article>)}</section>
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">{(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={cn('min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors', status === item ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-muted-foreground hover:bg-muted')}>{item === 'ALL' ? 'All Sessions' : item === 'LIVE' ? 'Live Now' : item.charAt(0) + item.slice(1).toLowerCase()}</button>)}</div><Select value={channel} onValueChange={setChannel}><SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="All channels"/></SelectTrigger><SelectContent><SelectItem value="ALL">All channels</SelectItem>{options?.channels.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh live commerce data"><RefreshCw className="size-4"/></Button></div>
    <SessionOperationsTable sessions={sessions} loading={loading} onSelect={(session) => { if (session.status === 'ENDED') { toast.info('Ended session is read-only.'); return; } setSelected(session); }}/>
  </div><CreateLiveSessionWizard open={wizardOpen} onOpenChange={setWizardOpen} options={options} onCreated={() => void load()}/><LiveWarRoomDrawer session={selected} open={selected?.status === 'LIVE'} onOpenChange={(open) => { if (!open) setSelected(null); }} options={options} onChanged={() => void load()}/><EditSessionDrawer session={selected} open={selected?.status === 'SCHEDULED'} onOpenChange={(open) => { if (!open) setSelected(null); }} options={options} onChanged={() => void load()}/></div>;
}
