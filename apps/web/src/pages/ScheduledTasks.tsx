import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Clock3,
  Copy,
  History,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';
import { scheduledTasksApi, type ExecutionStatus, type ScheduledTask, type ScheduledTaskTemplate, type TaskExecutionLog, type TaskStatus } from '@/lib/scheduled-tasks-api';

type Filter = 'ALL' | TaskStatus;
type DrawerMode = 'create' | 'edit';

const owners = ['Customer Success AI', 'Inventory Agent', 'Sales Operations AI', 'Operations Agent'];
const channelOptions = [
  ['prime_inbox', 'Prime Inbox'], ['primeweb', 'WebStore'], ['pos', 'POS'], ['warehouse', 'Warehouse'], ['crm', 'CRM'], ['slack', 'Slack'], ['email', 'Email'],
] as const;

const ownerIds: Record<string, string> = {
  'Customer Success AI': 'agent_customer_success', 'Inventory Agent': 'agent_inventory', 'Sales Operations AI': 'agent_sales_ops', 'Operations Agent': 'agent_operations',
};

const channelLabels = Object.fromEntries(channelOptions);

function dateTime(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function countdown(value: string | null, now: number) {
  if (!value) return 'No upcoming run';
  const diff = Math.max(0, new Date(value).getTime() - now);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return hours > 48 ? dateTime(value) : `${hours}h ${minutes}m`;
}

const logTone: Record<ExecutionStatus, string> = {
  SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700', FAILED: 'border-rose-200 bg-rose-50 text-rose-700', SKIPPED: 'border-slate-200 bg-slate-50 text-slate-600',
};

function StatusBadge({ status }: { status: ExecutionStatus | null }) {
  if (!status) return <span className="text-xs text-slate-400">No runs</span>;
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold', logTone[status])}>{status === 'SUCCESS' ? <CheckCircle2 className="size-3" /> : status === 'FAILED' ? <XCircle className="size-3" /> : <CirclePause className="size-3" />}{status}</span>;
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'indigo' }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: 'indigo' | 'emerald' | 'amber' | 'slate' }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-100 text-slate-600' };
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><span className={cn('grid size-8 place-items-center rounded-lg', colors[tone])}><Icon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

const emptyDraft: Partial<ScheduledTask> = {
  title: '', description: '', owner_name: 'Operations Agent', owner_id: 'agent_operations', channel_ids: [], cron_expression: '0 10 * * *', human_schedule: 'Daily at 10:00 AM', system_prompt: '', status: 'RUNNING',
};

export default function ScheduledTasksPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [templates, setTemplates] = useState<ScheduledTaskTemplate[]>([]);
  const [logs, setLogs] = useState<TaskExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(id));
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('edit');
  const [drawerTab, setDrawerTab] = useState('configuration');
  const [draft, setDraft] = useState<Partial<ScheduledTask>>(emptyDraft);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskResult, templateResult] = await Promise.all([scheduledTasksApi.list(new URLSearchParams({ page_size: '100' })), scheduledTasksApi.templates()]);
      setTasks(taskResult.data);
      setTemplates(templateResult.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load scheduled tasks.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!id) return;
    setDrawerOpen(true); setDrawerMode('edit');
    Promise.all([scheduledTasksApi.get(id), scheduledTasksApi.logs(id)]).then(([task, history]) => { setDraft(task.data); setLogs(history.data); }).catch((error) => { toast.error(error.message); navigate('/automation/scheduled-tasks', { replace: true }); });
  }, [id, navigate]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesFilter = filter === 'ALL' || task.status === filter;
    const text = `${task.title} ${task.description} ${task.human_schedule} ${task.owner_name} ${task.channel_ids.join(' ')} ${task.system_prompt}`.toLowerCase();
    return matchesFilter && text.includes(query.trim().toLowerCase());
  }), [tasks, filter, query]);
  const running = tasks.filter((task) => task.status === 'RUNNING').length;
  const paused = tasks.length - running;
  const nearest = tasks.filter((task) => task.status === 'RUNNING' && task.next_run_at).sort((a, b) => String(a.next_run_at).localeCompare(String(b.next_run_at)))[0];
  const allVisibleSelected = visibleTasks.length > 0 && visibleTasks.every((task) => selectedIds.includes(task.id));

  const openCreate = () => { setDraft(emptyDraft); setLogs([]); setDrawerMode('create'); setDrawerTab('configuration'); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setDraft(emptyDraft); setLogs([]); if (id) navigate('/automation/scheduled-tasks'); };
  const openTask = (task: ScheduledTask, tab = 'configuration') => { setDrawerTab(tab); navigate(`/automation/scheduled-tasks/${task.id}`); };

  const save = async () => {
    try {
      const payload = { ...draft, owner_id: ownerIds[draft.owner_name || 'Operations Agent'] || draft.owner_id };
      const result = drawerMode === 'create' ? await scheduledTasksApi.create(payload) : await scheduledTasksApi.update(String(draft.id), payload);
      toast.success(drawerMode === 'create' ? 'Scheduled task created' : 'Scheduled task saved');
      await load();
      if (drawerMode === 'create') navigate(`/automation/scheduled-tasks/${result.data.id}`, { replace: true }); else setDraft(result.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save task.'); }
  };

  const toggle = async (task: ScheduledTask, status: TaskStatus) => {
    try { const result = await scheduledTasksApi.toggle(task.id, status); setTasks((current) => current.map((item) => item.id === task.id ? result.data : item)); if (draft.id === task.id) setDraft(result.data); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update status.'); }
  };

  const runNow = async (task: ScheduledTask) => {
    try { await scheduledTasksApi.runNow(task.id); toast.success(`${task.title} queued to run now`); window.setTimeout(() => { void load(); if (id === task.id) void scheduledTasksApi.logs(task.id).then((result) => setLogs(result.data)); }, 900); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to run task.'); }
  };

  const remove = async (task: ScheduledTask) => {
    if (!window.confirm(`Delete “${task.title}” and its execution history?`)) return;
    try { await scheduledTasksApi.remove(task.id); toast.success('Scheduled task deleted'); closeDrawer(); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete task.'); }
  };

  const duplicate = async (task: ScheduledTask) => {
    try { await scheduledTasksApi.create({ ...task, id: undefined, title: `${task.title} (Copy)`, status: 'PAUSED' }); toast.success('Task duplicated as paused'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to duplicate task.'); }
  };

  const useTemplate = async (template: ScheduledTaskTemplate) => {
    try { const result = await scheduledTasksApi.create({ template_id: template.id }); setTemplateOpen(false); await load(); navigate(`/automation/scheduled-tasks/${result.data.id}`); toast.success('Task created from template'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to use template.'); }
  };

  const bulkToggle = async (status: TaskStatus) => { try { await scheduledTasksApi.bulkToggle(selectedIds, status); setSelectedIds([]); await load(); toast.success(`${status === 'RUNNING' ? 'Resumed' : 'Paused'} selected tasks`); } catch (error) { toast.error(error instanceof Error ? error.message : 'Bulk action failed.'); } };
  const bulkDelete = async () => { if (!window.confirm(`Delete ${selectedIds.length} selected tasks and their logs?`)) return; try { await scheduledTasksApi.bulkDelete(selectedIds); setSelectedIds([]); await load(); toast.success('Selected tasks deleted'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Bulk delete failed.'); } };

  return <div className="min-h-full bg-background p-4 pb-24 md:p-6"><div className="mx-auto max-w-[1700px] space-y-5">
    <WorkspacePageHeader title="Scheduled Tasks" description="Schedule recurring operational jobs, review upcoming runs, and monitor execution history." icon={CalendarClock} actions={<><Button variant="outline" onClick={() => setTemplateOpen(true)}><Zap className="size-4" />Create from Template</Button><Button onClick={openCreate}><Plus className="size-4" />New Scheduled Task</Button></>} />

    <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p><span className="font-semibold text-indigo-800">Scheduled Tasks</span> run on a recurring time schedule.</p>
      <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">Automation Workflows</span> react to business events.</p>
    </div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Scheduled task summary"><MetricCard label="Total Tasks" value={String(tasks.length)} detail="Time-triggered operational jobs" icon={CalendarClock} /><MetricCard label="Running Jobs" value={String(running)} detail="Active scheduler registrations" icon={Play} tone="emerald" /><MetricCard label="Paused Jobs" value={String(paused)} detail="Not scheduled until resumed" icon={Pause} tone="amber" /><MetricCard label="Next Scheduled Run" value={countdown(nearest?.next_run_at || null, now)} detail={nearest ? nearest.title : 'No running tasks'} icon={Clock3} tone="slate" /></section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center"><div className="flex gap-1">{([['ALL', 'All Tasks'], ['RUNNING', 'Running'], ['PAUSED', 'Paused']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={cn('min-h-10 rounded-lg px-3 text-sm font-semibold', filter === value ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50')}>{label}</button>)}</div><div className="relative min-w-0 flex-1 lg:ml-auto lg:max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, schedule, owner, channel, or system prompt..." className="h-10 pl-9" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1350px] text-left"><thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500"><tr><th className="w-10 px-4 py-3"><Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => setSelectedIds(checked === true ? visibleTasks.map((task) => task.id) : [])} aria-label="Select all visible tasks" /></th><th className="px-3 py-3">Task & Channels</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">System Prompt / Instructions</th><th className="px-4 py-3">Last / Next Run</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleTasks.map((task) => { const selected = selectedIds.includes(task.id); return <tr key={task.id} className={cn('hover:bg-slate-50/70', selected && 'bg-indigo-50/40')}><td className="px-4 py-3"><Checkbox checked={selected} onCheckedChange={(checked) => setSelectedIds((current) => checked === true ? [...new Set([...current, task.id])] : current.filter((item) => item !== task.id))} aria-label={`Select ${task.title}`} /></td><td className="max-w-[320px] px-3 py-3"><button type="button" onClick={() => openTask(task)} className="text-left"><p className="font-semibold text-slate-900 hover:text-indigo-700">{task.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{task.description}</p></button><div className="mt-2 flex flex-wrap gap-1">{task.channel_ids.slice(0, 3).map((channel) => <span key={channel} className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{channelLabels[channel] || channel.replaceAll('_', ' ')}</span>)}</div></td><td className="px-4 py-3"><p className="text-sm font-semibold text-slate-800">{task.human_schedule}</p><p className="mt-1 font-mono text-xs text-slate-400" title="Cron expression">{task.cron_expression}</p></td><td className="max-w-[280px] px-4 py-3"><p className="line-clamp-2 text-xs leading-5 text-slate-600" title={task.system_prompt}>{task.system_prompt}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><StatusBadge status={task.last_run_status} /><span className="text-xs text-slate-500">{dateTime(task.last_run_at)}</span></div><p className="mt-2 text-xs font-medium text-indigo-700">Next: {dateTime(task.next_run_at)}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-indigo-100 text-indigo-700"><UserRound className="size-4" /></span><span className="text-sm font-medium text-slate-700">{task.owner_name}</span></div></td><td className="px-4 py-3"><div className="flex items-center gap-2"><Switch checked={task.status === 'RUNNING'} onCheckedChange={(checked) => void toggle(task, checked ? 'RUNNING' : 'PAUSED')} aria-label={`${task.status === 'RUNNING' ? 'Pause' : 'Resume'} ${task.title}`} /><span className={cn('text-xs font-semibold', task.status === 'RUNNING' ? 'text-emerald-700' : 'text-slate-500')}>{task.status === 'RUNNING' ? 'Running' : 'Paused'}</span></div></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => void runNow(task)}><Play className="size-4" />Run Now</Button><Button size="sm" variant="ghost" onClick={() => openTask(task, 'history')}><History className="size-4" />Logs</Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`More actions for ${task.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => openTask(task)}><CalendarClock className="mr-2 size-4" />Configure</DropdownMenuItem><DropdownMenuItem onSelect={() => void duplicate(task)}><Copy className="mr-2 size-4" />Duplicate</DropdownMenuItem><DropdownMenuItem className="text-rose-700" onSelect={() => void remove(task)}><Trash2 className="mr-2 size-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>; })}</tbody></table></div>{!loading && !visibleTasks.length ? <div className="py-14 text-center"><p className="font-semibold text-slate-900">No scheduled tasks found</p><p className="mt-1 text-sm text-slate-500">Adjust filters or create a recurring operational job.</p></div> : null}{loading ? <div className="py-14 text-center text-sm text-slate-500">Loading scheduled tasks…</div> : null}</section>
  </div>

  <Dialog open={templateOpen} onOpenChange={setTemplateOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Create from an operational template</DialogTitle><DialogDescription>Start with a safe recurring-job configuration, then customize its scope and instructions.</DialogDescription></DialogHeader><div className="grid gap-3 md:grid-cols-3">{templates.map((template) => <button key={template.id} type="button" onClick={() => void useTemplate(template)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Sparkles className="size-4" /></span><p className="mt-4 font-semibold text-slate-900">{template.title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{template.description}</p><p className="mt-4 text-xs font-semibold text-indigo-700">{template.human_schedule}</p></button>)}</div></DialogContent></Dialog>

  <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) closeDrawer(); }}><SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[650px]"><SheetHeader className="border-b border-slate-200 px-6 py-5 pr-14"><SheetTitle>{drawerMode === 'create' ? 'New Scheduled Task' : draft.title || 'Scheduled Task'}</SheetTitle><SheetDescription>{drawerMode === 'create' ? 'Configure a recurring time-triggered operational job.' : `${draft.human_schedule || ''} · ${draft.status === 'RUNNING' ? 'Running' : 'Paused'}`}</SheetDescription></SheetHeader><Tabs value={drawerTab} onValueChange={setDrawerTab} className="flex min-h-0 flex-1 flex-col"><TabsList className="h-auto justify-start rounded-none border-b border-slate-200 bg-white px-4 py-0"><TabsTrigger value="configuration" className="min-h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none">Configuration & System Prompt</TabsTrigger><TabsTrigger value="history" disabled={drawerMode === 'create'} className="min-h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none">Execution History</TabsTrigger></TabsList><div className="min-h-0 flex-1 overflow-y-auto p-6"><TabsContent value="configuration" className="mt-0 space-y-6"><section className="grid gap-4"><div><Label htmlFor="task-title">Task name</Label><Input id="task-title" value={draft.title || ''} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="mt-2" /></div><div><Label htmlFor="task-description">Description</Label><Textarea id="task-description" value={draft.description || ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-20" /></div><div><Label>Assigned owner / agent</Label><Select value={draft.owner_name || 'Operations Agent'} onValueChange={(value) => setDraft((current) => ({ ...current, owner_name: value, owner_id: ownerIds[value] }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{owners.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent></Select></div></section><section className="border-t border-slate-200 pt-5"><h3 className="text-sm font-semibold text-slate-900">Target channel scope</h3><div className="mt-3 grid grid-cols-2 gap-2">{channelOptions.map(([value, label]) => { const checked = draft.channel_ids?.includes(value) || false; return <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"><Checkbox checked={checked} onCheckedChange={(next) => setDraft((current) => ({ ...current, channel_ids: next === true ? [...(current.channel_ids || []), value] : (current.channel_ids || []).filter((item) => item !== value) }))} />{label}</label>; })}</div></section><section className="border-t border-slate-200 pt-5"><h3 className="text-sm font-semibold text-slate-900">Recurrence schedule</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="human-schedule">Human-readable schedule</Label><Input id="human-schedule" value={draft.human_schedule || ''} onChange={(event) => setDraft((current) => ({ ...current, human_schedule: event.target.value }))} className="mt-2" placeholder="Daily at 10:00 AM" /></div><div><Label htmlFor="cron-expression">Cron expression</Label><Input id="cron-expression" value={draft.cron_expression || ''} onChange={(event) => setDraft((current) => ({ ...current, cron_expression: event.target.value }))} className="mt-2 font-mono" placeholder="0 10 * * *" /></div></div><div className="mt-3 flex flex-wrap gap-2">{[['Daily 10:00', '0 10 * * *'], ['Weekly Monday', '0 9 * * 1'], ['Monthly', '0 9 1 * *']].map(([label, cron]) => <button key={cron} type="button" onClick={() => setDraft((current) => ({ ...current, cron_expression: cron, human_schedule: label === 'Daily 10:00' ? 'Daily at 10:00 AM' : label === 'Weekly Monday' ? 'Every Monday at 09:00 AM' : 'Monthly on day 1 at 09:00 AM' }))} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">{label}</button>)}</div></section><section className="border-t border-slate-200 pt-5"><Label htmlFor="system-prompt">System Prompt / AI Instructions</Label><Textarea id="system-prompt" value={draft.system_prompt || ''} onChange={(event) => setDraft((current) => ({ ...current, system_prompt: event.target.value }))} className="mt-2 min-h-44 font-mono text-xs leading-5" placeholder="Describe exactly what the Prime OS Execution Engine should inspect, decide, and produce..." /><p className="mt-2 text-xs text-slate-500">Markdown is supported. Data-changing actions should require explicit approval in the prompt.</p></section><div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5"><Button onClick={() => void save()}><CheckCircle2 className="size-4" />Save Changes</Button>{drawerMode === 'edit' && draft.id ? <><Button variant="outline" onClick={() => void toggle(draft as ScheduledTask, draft.status === 'RUNNING' ? 'PAUSED' : 'RUNNING')}>{draft.status === 'RUNNING' ? <Pause className="size-4" /> : <Play className="size-4" />}{draft.status === 'RUNNING' ? 'Pause' : 'Resume'}</Button><Button variant="outline" className="ml-auto border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => void remove(draft as ScheduledTask)}><Trash2 className="size-4" />Delete Task</Button></> : null}</div></TabsContent><TabsContent value="history" className="mt-0 space-y-3">{logs.map((log) => <div key={log.id} className="overflow-hidden rounded-xl border border-slate-200"><button type="button" onClick={() => setExpandedLog((current) => current === log.id ? null : log.id)} className="grid w-full grid-cols-[1fr_auto] gap-4 p-4 text-left hover:bg-slate-50"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={log.status} /><span className="text-xs font-semibold text-slate-600">{log.trigger_type === 'MANUAL_RUN_NOW' ? 'Manual Run Now' : 'Scheduled'}</span></div><p className="mt-2 text-sm font-medium text-slate-800">{log.result_summary}</p><p className="mt-1 text-xs text-slate-500">{dateTime(log.executed_at)} · {log.duration_ms.toLocaleString()} ms</p></div><ChevronDown className={cn('mt-1 size-4 text-slate-400 transition-transform', expandedLog === log.id && 'rotate-180')} /></button>{expandedLog === log.id ? <div className="border-t border-slate-200 bg-slate-950 p-4 text-xs text-slate-200"><pre className="whitespace-pre-wrap break-words">{JSON.stringify({ error: log.error_message, payload: log.execution_payload }, null, 2)}</pre></div> : null}</div>)}{!logs.length ? <div className="py-12 text-center"><History className="mx-auto size-6 text-slate-300" /><p className="mt-3 font-semibold text-slate-900">No execution history yet</p><p className="mt-1 text-sm text-slate-500">Use Run Now or wait for the first scheduled execution.</p></div> : null}</TabsContent></div></Tabs></SheetContent></Sheet>

  {selectedIds.length ? <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white shadow-2xl"><span className="px-2 text-xs font-semibold">{selectedIds.length} selected</span><span className="h-6 w-px bg-slate-700" /><Button size="sm" variant="ghost" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => void bulkToggle('PAUSED')}><Pause className="size-4" />Pause Selected</Button><Button size="sm" variant="ghost" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => void bulkToggle('RUNNING')}><Play className="size-4" />Resume Selected</Button><Button size="sm" variant="ghost" className="text-rose-300 hover:bg-rose-950 hover:text-rose-200" onClick={() => void bulkDelete()}><Trash2 className="size-4" />Delete Selected</Button></div> : null}
  </div>;
}
