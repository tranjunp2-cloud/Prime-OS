import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Inbox,
  MessageSquare,
  UserCheck,
  RefreshCcw,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getCrmItems,
  getCrmQueueMetrics,
  claimCrmItem,
  resolveCrmItem,
  snoozeCrmItem,
  getOperators,
  type CrmItem,
} from '@/lib/crm-queue-store';

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'P0 Live Order', color: 'bg-rose-500/14 text-rose-700 dark:text-rose-300' },
  1: { label: 'P1 Chat', color: 'bg-amber-500/14 text-amber-700 dark:text-amber-300' },
  2: { label: 'P2 Support', color: 'bg-slate-500/14 text-slate-600 dark:text-slate-300' },
};

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  buy_now: { label: 'Buy Now', color: 'bg-emerald-500/14 text-emerald-700' },
  ask_price: { label: 'Ask Price', color: 'bg-blue-500/14 text-blue-700' },
  ask_stock: { label: 'Ask Stock', color: 'bg-violet-500/14 text-violet-700' },
  support: { label: 'Support', color: 'bg-orange-500/14 text-orange-700' },
  unknown: { label: 'General', color: 'bg-muted text-muted-foreground' },
};

export default function PrimeCrmOperatorDashboard() {
  const [selectedQueue, setSelectedQueue] = useState<'all' | 'p0' | 'p1' | 'p2' | 'mine'>('all');
  const [operatorId, setOperatorId] = useState('op_01');
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  const refresh = () => setTick(t => t + 1);
  const items = getCrmItems();
  const metrics = getCrmQueueMetrics();
  const operators = getOperators();
  const operator = operators.find(o => o.id === operatorId);

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedQueue === 'p0') result = result.filter(d => d.priority === 0 && d.status !== 'resolved');
    if (selectedQueue === 'p1') result = result.filter(d => d.priority === 1 && d.status !== 'resolved');
    if (selectedQueue === 'p2') result = result.filter(d => d.priority === 2 && d.status !== 'resolved');
    if (selectedQueue === 'mine') result = result.filter(d => d.assignedTo === operatorId && d.status !== 'resolved');

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d =>
        d.customer.name.toLowerCase().includes(s) ||
        d.preview.text.toLowerCase().includes(s) ||
        d.platform.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, selectedQueue, operatorId, search]);

  const queueTabs = [
    { id: 'all', label: 'All', count: metrics.total - metrics.resolved },
    { id: 'p0', label: 'P0 Live', count: metrics.p0, color: 'text-rose-500' },
    { id: 'p1', label: 'P1 Chat', count: metrics.p1, color: 'text-amber-500' },
    { id: 'p2', label: 'P2 Support', count: metrics.p2, color: 'text-slate-500' },
    { id: 'mine', label: 'My Queue', count: items.filter(d => d.assignedTo === operatorId && d.status !== 'resolved').length },
  ];

  return (
    <div className="flex h-full min-h-[680px] flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Inbox className="size-3.5" />
              Operator Dashboard
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {operator?.name ?? 'Operator'}
            </span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-normal text-foreground">CRM Queue</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {metrics.unassigned} unassigned · {metrics.assigned} assigned · {metrics.in_progress} in progress · {metrics.breached} breached
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCcw className="size-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 border-b bg-card px-4 py-3 sm:grid-cols-4 lg:grid-cols-5">
        <KpiBox label="Unassigned" value={metrics.unassigned} tone={metrics.unassigned > 10 ? 'danger' : 'default'} icon={<Inbox className="size-4" />} />
        <KpiBox label="In Progress" value={metrics.in_progress} tone="primary" icon={<Clock className="size-4" />} />
        <KpiBox label="Breached" value={metrics.breached} tone={metrics.breached > 0 ? 'danger' : 'default'} icon={<AlertTriangle className="size-4" />} />
        <KpiBox label="Resolved" value={metrics.resolved} tone="success" icon={<UserCheck className="size-4" />} />
        <KpiBox label="Total" value={metrics.total} tone="info" icon={<BarChart3 className="size-4" />} />
      </div>

      {/* Queue Tabs */}
      <div className="border-b bg-card px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {queueTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors',
                selectedQueue === tab.id && 'bg-primary/12 text-primary shadow-sm',
              )}
              onClick={() => setSelectedQueue(tab.id as typeof selectedQueue)}
            >
              {tab.label} <span className={cn('font-identifier text-xs', tab.color)}>({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="border-b bg-card px-4 py-3">
        <Input
          placeholder="Search by customer name, message, platform..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      {/* Queue List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <MessageSquare className="size-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-muted-foreground">No demand items</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {selectedQueue === 'mine' ? 'No items in your queue. Check "All" or "P0" to claim.' : 'Queue is clear.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredItems.map(item => (
              <CrmItemRow
                key={item.id}
                item={item}
                operatorId={operatorId}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, tone, icon }: { label: string; value: number; tone: 'default' | 'primary' | 'success' | 'danger' | 'info'; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
      <span className={cn(
        'grid size-9 place-items-center rounded-lg',
        tone === 'danger' && 'bg-rose-100 text-rose-600 dark:bg-rose-500/15',
        tone === 'primary' && 'bg-primary/10 text-primary',
        tone === 'success' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15',
        tone === 'info' && 'bg-blue-100 text-blue-600 dark:bg-blue-500/15',
        tone === 'default' && 'bg-muted text-muted-foreground',
      )}>
        {icon}
      </span>
      <div>
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className={cn(
          'font-identifier text-2xl font-semibold',
          tone === 'danger' && 'text-rose-600',
          tone === 'primary' && 'text-primary',
          tone === 'success' && 'text-emerald-600',
        )}>{value}</div>
      </div>
    </div>
  );
}

function CrmItemRow({ item, operatorId, onRefresh }: { item: CrmItem; operatorId: string; onRefresh: () => void }) {
  const isMine = item.assignedTo === operatorId;

  return (
    <div className={cn(
      'flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/30',
      item.priority === 0 && 'bg-rose-500/5',
      item.sla.breached && 'border-l-2 border-l-rose-500 bg-rose-500/5',
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn('text-[10px]', PRIORITY_LABELS[item.priority]?.color)}>
          {PRIORITY_LABELS[item.priority]?.label ?? `P${item.priority}`}
        </Badge>
        <Badge variant="outline" className="text-[10px] capitalize">{item.platform}</Badge>
        {item.preview.intent && (
          <Badge className={cn('text-[10px]', INTENT_LABELS[item.preview.intent]?.color)}>
            {INTENT_LABELS[item.preview.intent]?.label ?? item.preview.intent}
          </Badge>
        )}
        {item.sla.breached && (
          <Badge className="bg-rose-500/14 text-rose-700 text-[10px]">
            <AlertTriangle className="size-3 mr-1" />
            SLA Breached
          </Badge>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatTimeAgo(item.created_at)}
        </span>
      </div>

      <div>
        <span className="font-semibold">{item.customer.name}</span>
        {item.preview.orderId && (
          <span className="ml-2 text-xs text-muted-foreground">Order: {item.preview.orderId}</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{item.preview.text}</p>

      <div className="flex flex-wrap gap-2">
        {item.status === 'unassigned' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => { claimCrmItem(item.id, operatorId); onRefresh(); }}>
            Claim
          </Button>
        )}
        {isMine && item.status !== 'resolved' && (
          <>
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => { resolveCrmItem(item.id); onRefresh(); }}>
              <UserCheck className="size-3 mr-1" /> Resolve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { snoozeCrmItem(item.id, 15); onRefresh(); }}>
              <Clock className="size-3 mr-1" /> Snooze 15m
            </Button>
          </>
        )}
        {item.status === 'resolved' && (
          <Badge className="bg-emerald-500/14 text-emerald-700 text-[10px]">Resolved</Badge>
        )}
        {item.assignedTo && (
          <span className="ml-auto text-[11px] text-muted-foreground">Assigned to: {item.assignedTo}</span>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
