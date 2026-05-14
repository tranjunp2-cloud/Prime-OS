import { type ReactNode, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck,
  CheckSquare,
  Clock,
  FileText,
  Inbox,
  Megaphone,
  MessageSquareText,
  Moon,
  PenLine,
  RadioTower,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mdecSeedData } from '@/lib/prime/mdec-seed-data';
import { cn } from '@/lib/utils';

type MdecView = 'dashboard' | 'calendar' | 'composer' | 'approvals' | 'engagement' | 'escalations' | 'analytics' | 'listening' | 'reports';
type BadgeTone = 'default' | 'secondary' | 'destructive' | 'warning' | 'outline';

type NavItem = { id: MdecView; label: string; icon: LucideIcon; count?: string; tone?: 'normal' | 'danger' };

const mainNav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: RadioTower },
  { id: 'calendar', label: 'Calendar', icon: CalendarCheck },
  { id: 'composer', label: 'Composer', icon: PenLine },
];

const workflowNav: NavItem[] = [
  { id: 'approvals', label: 'Approvals', icon: CheckSquare, count: '01' },
  { id: 'engagement', label: 'Engagement', icon: Inbox, count: '06' },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle, count: '03', tone: 'danger' },
];

const insightNav: NavItem[] = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'listening', label: 'Listening', icon: Search },
  { id: 'reports', label: 'Reports', icon: FileText },
];

const allViews = [...mainNav, ...workflowNav, ...insightNav];

const {
  scheduledPosts,
  severeItems,
  inbound,
  clusters,
  approvals,
  reports,
  metrics,
} = mdecSeedData;

function tone(value: string): BadgeTone {
  if (['Critical', 'High', 'Negative'].includes(value)) return 'destructive';
  if (['Medium', 'Neutral'].includes(value)) return 'warning';
  if (['Positive', 'Low', 'Scheduled'].includes(value)) return 'default';
  return 'outline';
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 text-xs text-muted-foreground before:h-px before:w-5 before:bg-primary">{children}</div>;
}

function ShellNavGroup({ label, items, activeView }: { label: string; items: NavItem[]; activeView: MdecView }) {
  return (
    <div className="space-y-2">
      <SectionLabel>{label}</SectionLabel>
      <div className="grid gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeView;
          return (
            <Link
              key={item.id}
              to={`/demand/mdec?view=${item.id}`}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary/12 text-primary ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.count ? <span className={cn('font-identifier text-xs', item.tone === 'danger' ? 'text-destructive' : 'text-primary')}>[{item.count}]</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function KpiStrip() {
  const kpis = [
    { label: 'Scheduled', value: String(metrics.scheduled).padStart(2, '0'), detail: 'today', color: 'text-foreground' },
    { label: 'Pending review', value: String(metrics.pendingReview).padStart(2, '0'), detail: 'awaiting reviewer', color: 'text-primary' },
    { label: 'High severity', value: String(metrics.highSeverity).padStart(2, '0'), detail: 'open escalations', color: 'text-destructive' },
    { label: 'Unread engagement', value: String(metrics.unreadEngagement).padStart(2, '0'), detail: 'across all channels', color: 'text-foreground' },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid divide-y divide-border/70 md:grid-cols-4 md:divide-x md:divide-y-0">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
              <span>{kpi.label}</span>
              <ArrowRight className="size-3 rotate-[-45deg]" />
            </div>
            <div className={cn('mt-3 font-identifier text-5xl font-semibold tracking-tight', kpi.color)}>{kpi.value}</div>
            <p className="mt-2 text-sm text-muted-foreground">{kpi.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Panel({ label, title, action, children, className }: { label: string; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <SectionLabel>{label}</SectionLabel>
          <h3 className="mt-1 font-semibold tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function ChannelDot({ label }: { label: string }) {
  const color = label === 'IG' ? 'bg-pink-500' : label === 'FB' ? 'bg-blue-600' : label === 'IN' ? 'bg-sky-700' : 'bg-foreground';
  return <span className={cn('grid size-5 place-items-center rounded-full text-[9px] font-bold text-white', color)}>{label}</span>;
}

function DashboardLayout({ onAction }: { onAction: (message: string) => void }) {
  return (
    <div className="space-y-6">
      <KpiStrip />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Panel label="Today" title="Scheduled posts" action={<Button asChild variant="ghost" size="sm"><Link to="/demand/mdec?view=calendar">Calendar →</Link></Button>} className="min-h-[440px]">
          <div className="divide-y">
            {scheduledPosts.map((post) => (
              <div key={post.id} className="grid gap-3 px-5 py-5 md:grid-cols-[minmax(136px,176px)_minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0 truncate font-identifier text-xs text-primary" title={post.id}>{post.id}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{post.title}</h4>
                    <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" />AI best time</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{post.when} <span className="px-2">/</span> {post.campaign}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Badge variant="outline">{post.status}</Badge>
                  <div className="flex -space-x-1">{post.channels.map((channel) => <ChannelDot key={`${post.id}-${channel}`} label={channel} />)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel label="Crisis" title="Severe items" action={<Button asChild variant="ghost" size="sm"><Link to="/demand/mdec?view=escalations">All →</Link></Button>}>
          <div className="divide-y">
            {severeItems.map((item) => (
              <div key={item.title} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={tone(item.tone)}>{item.tone}</Badge>
                  <Badge variant={tone(item.sentiment)}>{item.sentiment}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">6d ago</span>
                </div>
                <h4 className="text-sm font-medium leading-5">{item.title}</h4>
                <p className="line-clamp-1 text-xs text-muted-foreground">{item.source}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel label="Engagement" title="Recent inbound" action={<Button asChild variant="ghost" size="sm"><Link to="/demand/mdec?view=engagement">Engagement →</Link></Button>}>
          <div className="divide-y">
            {inbound.map((item) => (
              <button key={`${item.channel}-${item.name}`} type="button" onClick={() => onAction(`${item.name} routed from ${item.channel}`)} className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 md:grid-cols-[22px_1fr_auto] md:items-start">
                <ChannelDot label={item.channel} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.name}</span><Badge variant={tone(item.tone)}>{item.tone}</Badge></div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
                <span className="text-xs text-muted-foreground">6d ago</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel label="Signals" title="Trend clusters" action={<Button asChild variant="ghost" size="sm"><Link to="/demand/mdec?view=listening">All →</Link></Button>}>
          <div className="divide-y">
            {clusters.map((cluster) => (
              <div key={cluster.title} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-lg font-semibold leading-6 tracking-tight">{cluster.title}</h4>
                  <span className="font-identifier text-xs text-muted-foreground">vol {cluster.volume}</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{cluster.body}</p>
                <div className="mt-3 flex gap-3 font-identifier text-xs">
                  <span className="text-emerald-600">+{cluster.pos}</span><span className="text-muted-foreground">·{cluster.neu}</span><span className="text-destructive">−{cluster.neg}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatStrip({ items }: { items: Array<{ label: string; value: string; detail?: string; tone?: 'default' | 'primary' | 'danger' | 'success' }> }) {
  return (
    <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid divide-y divide-border/70 md:grid-cols-4 md:divide-x md:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="p-5">
            <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
            <div className={cn('mt-2 font-identifier text-4xl font-semibold tracking-tight', item.tone === 'danger' && 'text-destructive', item.tone === 'primary' && 'text-primary', item.tone === 'success' && 'text-emerald-600')}>{item.value}</div>
            {item.detail ? <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SegmentTabs({ items }: { items: string[] }) {
  return <div className="inline-flex rounded-2xl bg-muted p-1">{items.map((item, index) => <button key={item} className={cn('rounded-xl px-5 py-2 text-sm font-medium text-muted-foreground', index === 0 && 'bg-card text-primary shadow-sm')}>{item}</button>)}</div>;
}


const calendarMonthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

function parseMdecPostDate(post: typeof scheduledPosts[number]) {
  const day = Number(post.when.match(/^(\d+)/)?.[1] || 1);
  const time = post.when.split(',').pop()?.trim() || '09:00';
  return { date: new Date(2026, 4, day), day, time };
}

function addCalendarMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayStartOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayStartOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, day: date.getDate(), muted: date.getMonth() !== month, key: date.toISOString().slice(0, 10) };
  });
}

function calendarKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function CalendarLayout({ onAction }: { onAction: (message: string) => void }) {
  const [mode, setMode] = useState<'Month' | 'Week' | 'Agenda'>('Month');
  const [channel, setChannel] = useState('All channels');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(2026, 4, 1));
  const [posts, setPosts] = useState(scheduledPosts);
  const [selectedPostId, setSelectedPostId] = useState(scheduledPosts[0]?.id || '');
  const channelOptions = ['All channels', ...Array.from(new Set(posts.flatMap((post) => post.channels)))];
  const visiblePosts = channel === 'All channels' ? posts : posts.filter((post) => post.channels.includes(channel));
  const selectedPost = posts.find((post) => post.id === selectedPostId) || visiblePosts[0] || posts[0];
  const monthLabel = calendarMonthFormatter.format(visibleMonth);
  const postTime = (post: typeof posts[number]) => parseMdecPostDate(post).time;
  const postsByDate = visiblePosts.reduce<Record<string, typeof posts>>((acc, post) => {
    const key = calendarKey(parseMdecPostDate(post).date);
    acc[key] = [...(acc[key] || []), post];
    return acc;
  }, {});
  const days = buildCalendarDays(visibleMonth).map((day) => ({ ...day, events: postsByDate[day.key] || [] }));
  const activeWeekStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 11);
  const weekDays = Array.from({ length: 7 }, (_, index) => { const date = new Date(activeWeekStart); date.setDate(activeWeekStart.getDate() + index); return date; });
  const selectPost = (post: typeof posts[number]) => {
    setSelectedPostId(post.id);
    onAction(`Calendar post opened: ${post.title}`);
  };
  const setPostStatus = (postId: string, status: typeof posts[number]['status']) => {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, status } : post));
    onAction(`Calendar post ${status.toLowerCase()}: ${posts.find((post) => post.id === postId)?.title || postId}`);
  };
  const cycleChannel = () => {
    const next = channelOptions[(channelOptions.indexOf(channel) + 1) % channelOptions.length] || 'All channels';
    setChannel(next);
    onAction(`Calendar channel filter: ${next}`);
  };
  const moveMonth = (direction: -1 | 1) => {
    setVisibleMonth((current) => addCalendarMonths(current, direction));
    onAction(direction > 0 ? 'Calendar moved to next month' : 'Calendar moved to previous month');
  };
  const jumpToday = () => {
    setVisibleMonth(new Date(2026, 4, 1));
    setMode('Month');
    setChannel('All channels');
    setSelectedPostId(posts[0]?.id || '');
    onAction('Calendar jumped to today');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl bg-muted p-1">{(['Month', 'Week', 'Agenda'] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); onAction(`Calendar switched to ${item}`); }} className={cn('rounded-xl px-5 py-2 text-sm font-medium text-muted-foreground', mode === item && 'bg-card text-primary shadow-sm')}>{item}</button>)}</div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to="/demand/mdec?view=composer">New post</Link></Button>
          <Button variant="outline" className="min-w-44 justify-between" onClick={cycleChannel}>{channel} <ArrowRight className="size-3 rotate-90" /></Button>
          <Button variant="outline" aria-label="Previous" onClick={() => moveMonth(-1)}>‹</Button>
          <Button variant="outline" onClick={jumpToday}>TODAY</Button>
          <Button variant="outline" aria-label="Next" onClick={() => moveMonth(1)}>›</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <Panel label="Queue" title={`${String(visiblePosts.length).padStart(2, '0')} scheduled ${channel === 'All channels' ? 'this month' : channel}`}>
          <div className="divide-y">
            {visiblePosts.map((post) => (
              <button key={post.id} type="button" onClick={() => selectPost(post)} className={cn('grid w-full grid-cols-[56px_1fr] gap-3 p-4 text-left transition hover:bg-primary/5', selectedPost?.id === post.id && 'bg-primary/10')}>
                <div className="font-identifier text-xs uppercase text-muted-foreground"><div>{post.when.split(' ')[0]}</div><div className="mt-1 text-primary">{postTime(post)}</div></div>
                <div className="min-w-0"><div className="font-semibold leading-5">{post.title}</div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.campaign}</p><div className="mt-2 flex flex-wrap gap-1"><Badge variant={tone(post.status)}>{post.status}</Badge>{post.channels.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div></div>
              </button>
            ))}
            {!visiblePosts.length ? <div className="p-5 text-sm text-muted-foreground">No posts match this channel.</div> : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <div><SectionLabel>{mode} calendar</SectionLabel><h3 className="mt-2 text-4xl font-semibold tracking-tight">{monthLabel}</h3><p className="mt-2 text-sm text-muted-foreground">Click a calendar item or queue row to inspect status, campaign linkage, and next action.</p></div>
          {mode === 'Month' ? (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="grid grid-cols-7 border-b text-center font-identifier text-xs uppercase tracking-[0.24em] text-muted-foreground">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day)=><div key={day} className="border-r py-3 last:border-r-0">{day}</div>)}</div>
              <div className="grid grid-cols-7">{days.map((day, index)=><div key={index} className={cn('min-h-32 border-r border-b p-3 last:border-r-0', day.muted && 'bg-muted/20 text-muted-foreground', day.key === '2026-05-13' && 'bg-primary/10')}><div className="text-xl font-semibold">{day.day}</div><div className="mt-3 space-y-2">{day.events.slice(0,2).map((post)=><button key={post.id} type="button" onClick={() => selectPost(post)} className={cn('block w-full border-l-2 border-primary bg-background px-2 py-1.5 text-left text-xs transition hover:bg-primary/10', selectedPost?.id === post.id && 'ring-1 ring-primary/40')}><div className="font-identifier text-primary">{postTime(post)}</div><div className="mt-1 line-clamp-2 font-medium leading-4">{post.title}</div>{post.channels.length > 1 ? <div className="mt-1 text-[10px] text-muted-foreground">+{post.channels.length - 1} channel</div> : null}</button>)}{day.events.length > 2 ? <div className="text-xs text-muted-foreground">+{day.events.length - 2} more</div> : null}</div></div>)}</div>
            </div>
          ) : null}
          {mode === 'Week' ? (
            <div className="grid gap-3 md:grid-cols-7">{weekDays.map((date)=><div key={calendarKey(date)} className="min-h-72 rounded-2xl border bg-card p-3"><div className="font-identifier text-xs uppercase text-muted-foreground">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div><div className="mt-3 space-y-2">{(postsByDate[calendarKey(date)] || []).map((post)=><button key={post.id} onClick={() => selectPost(post)} className="w-full rounded-xl border bg-background p-3 text-left text-xs hover:border-primary/50"><div className="text-primary">{postTime(post)}</div><div className="mt-1 font-semibold">{post.title}</div><Badge className="mt-2" variant={tone(post.status)}>{post.status}</Badge></button>)}{!(postsByDate[calendarKey(date)] || []).length ? <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">No scheduled post.</div> : null}</div></div>)}</div>
          ) : null}
          {mode === 'Agenda' ? (
            <div className="rounded-2xl border bg-card"><div className="divide-y">{visiblePosts.map((post)=><button key={post.id} type="button" onClick={() => selectPost(post)} className={cn('grid w-full gap-3 p-4 text-left hover:bg-primary/5 md:grid-cols-[120px_1fr_120px]', selectedPost?.id === post.id && 'bg-primary/10')}><div className="font-identifier text-sm text-primary">{post.when}</div><div><div className="font-semibold">{post.title}</div><p className="mt-1 text-sm text-muted-foreground">{post.campaign} · SKU {post.skuId}</p></div><Badge className="w-fit" variant={tone(post.status)}>{post.status}</Badge></button>)}</div></div>
          ) : null}
        </div>

        <Panel label="Details" title={selectedPost?.title || 'Select post'}>
          {selectedPost ? <div className="space-y-4 p-5"><div className="flex flex-wrap gap-2"><Badge variant={tone(selectedPost.status)}>{selectedPost.status}</Badge>{selectedPost.channels.map((item)=><Badge key={item} variant="outline">{item}</Badge>)}</div><div className="grid gap-3 text-sm"><MiniRow label="Time" value={selectedPost.when} /><MiniRow label="Campaign" value={selectedPost.campaign} /><MiniRow label="Product" value={selectedPost.productId} /><MiniRow label="SKU" value={selectedPost.skuId} /></div><div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">Next: {selectedPost.status === 'Review' ? 'Request approval before publishing.' : selectedPost.status === 'Blocked' ? 'Resolve blocker or route to escalation.' : 'Keep schedule and monitor engagement window.'}</div><div className="grid gap-2"><Button asChild><Link to="/demand/mdec?view=composer">Open in composer</Link></Button>{selectedPost.status !== 'Approved' ? <Button variant="outline" onClick={() => setPostStatus(selectedPost.id, 'Approved')}>Mark approved</Button> : null}{selectedPost.status !== 'Review' ? <Button variant="outline" onClick={() => setPostStatus(selectedPost.id, 'Review')}>Send to review</Button> : null}</div></div> : <div className="p-5 text-sm text-muted-foreground">Select a post to inspect.</div>}
        </Panel>
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function ComposerLayout({ onAction }: { onAction: (message: string) => void }) {
  const destinations = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'WhatsApp'];
  const [selectedDestinations, setSelectedDestinations] = useState(new Set(['Instagram']));
  const [assistMode, setAssistMode] = useState<'AI' | 'Snippets' | 'Hashtags'>('Snippets');
  const [mediaCount, setMediaCount] = useState(0);
  const [storyCount, setStoryCount] = useState(0);
  const [draftTitle, setDraftTitle] = useState('Untitled post');
  const blockingCount = Math.max(0, 2 - mediaCount - (draftTitle.trim() && draftTitle !== 'Untitled post' ? 1 : 0));
  const toggleDestination = (dest: string) => {
    setSelectedDestinations((current) => {
      const next = new Set(current);
      if (next.has(dest)) next.delete(dest); else next.add(dest);
      onAction(`${dest} ${next.has(dest) ? 'selected' : 'removed'} in composer`);
      return next;
    });
  };
  return (
    <div className="space-y-6">
      <StatStrip items={[{ label: 'Destinations', value: String(selectedDestinations.size).padStart(2, '0'), tone: 'primary' }, { label: 'Media', value: String(mediaCount).padStart(2, '0') }, { label: 'Stories', value: String(storyCount).padStart(2, '0') }, { label: 'Blocking', value: String(blockingCount).padStart(2, '0'), tone: blockingCount ? 'danger' : 'success' }]} />
      <Panel label="01" title="Choose post destination"><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">{destinations.map((dest)=><button key={dest} onClick={() => toggleDestination(dest)} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/40', selectedDestinations.has(dest) ? 'border-primary/30 bg-primary/10' : 'bg-card')}><span className={cn('size-4 rounded border', selectedDestinations.has(dest) && 'bg-primary')} /><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">MD</span><span><span className="block font-semibold">MDEC {dest}</span><span className="block text-xs text-muted-foreground">@mdec_{dest.toLowerCase()}</span></span></button>)}</div></Panel>
      <Panel label="02" title="Add post content"><div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div><textarea className="min-h-48 w-full rounded-xl border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={draftTitle === 'Untitled post' ? '' : draftTitle} onChange={(event) => setDraftTitle(event.target.value || 'Untitled post')} placeholder="Add your text or link here" /><div className="mt-4 grid gap-3 md:grid-cols-3"><Button variant="outline" onClick={() => { setMediaCount((value) => value + 1); onAction('Post media uploaded'); }}>Upload post</Button><Button variant="outline" onClick={() => { setStoryCount((value) => value + 1); onAction('Story media uploaded'); }}>Upload story</Button><Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Optional campaign or internal title" /></div></div><div className="space-y-3 border-l pl-5"><div className="flex gap-2">{(['AI','Snippets','Hashtags'] as const).map((mode) => <Button key={mode} size="sm" variant={assistMode === mode ? 'default' : 'ghost'} onClick={() => { setAssistMode(mode); onAction(`Composer assist mode: ${mode}`); }}>{mode === 'Hashtags' ? '# Hashtags' : mode}</Button>)}</div>{['Malaysia Digital launch','Event reminder'].map(x=><button type="button" key={x} onClick={() => { setDraftTitle(`${x}: Prime demand connects content, companies, and buyers across the digital economy.`); onAction(`Snippet inserted: ${x}`); }} className="w-full rounded-xl border p-3 text-left hover:border-primary/40"><div className="font-semibold">{x}</div><p className="mt-1 text-sm text-muted-foreground">Prime demand connects content, companies, and buyers across the digital economy.</p></button>)}<div className="rounded-xl border border-dashed p-3"><div className="font-semibold">Ideas</div><Button className="mt-2" variant="outline" onClick={() => { setDraftTitle((value) => `${value} Short version for X.`); onAction('Shorten for X applied'); }}>Shorten for X</Button></div></div></div></Panel>
      <Panel label="03" title="Customize by network"><div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]"><div className="space-y-3"><Badge>{Array.from(selectedDestinations)[0] || 'No destination'}</Badge><Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /><div className="min-h-28 rounded-xl border p-4 text-muted-foreground">Optional network override</div><Button variant="outline" onClick={() => onAction('Privacy menu opened')}>Privacy: Public</Button></div><div className="rounded-2xl bg-muted p-5"><div className="h-40 rounded-xl bg-background" /><div className="mt-4 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">MD</span><span className="h-3 flex-1 rounded bg-background" /></div></div></div></Panel>
      <Panel label="04" title="Create post"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className={cn('space-y-2 text-sm', blockingCount ? 'text-destructive' : 'text-emerald-600')}><div>{blockingCount ? '△ Missing content/media requirements' : '✓ Ready for approval'}</div><div>{selectedDestinations.size ? `${selectedDestinations.size} destinations selected` : '△ Select at least 1 destination'}</div></div><div className="flex gap-2"><Button variant="outline" onClick={() => onAction(`Draft saved: ${draftTitle}`)}>Save as draft</Button><Button variant="outline" onClick={() => onAction('Queued at bottom')}>Bottom of queue</Button><Button disabled={blockingCount > 0 || selectedDestinations.size === 0} onClick={()=>onAction('Composer submitted for approval')}>Submit for approval</Button></div></div></Panel>
    </div>
  );
}

function ApprovalsLayout({ onAction }: { onAction: (message: string) => void }) {
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'changes' | 'rejected'>>({});
  const decide = (title: string, status: 'approved' | 'changes' | 'rejected') => {
    setDecisions((current) => ({ ...current, [title]: status }));
    onAction(`${title}: ${status}`);
  };
  const pending = approvals.filter((item) => !decisions[item.title]);
  return <div className="space-y-6"><StatStrip items={[{label:'Pending', value:String(pending.length).padStart(2,'0'), tone:'danger'}, {label:'Scheduled', value:String(metrics.scheduled).padStart(2,'0'), tone:'primary'}, {label:'Risk flags', value:String(metrics.highSeverity).padStart(2,'0')}, {label:'Recent', value:String(Object.keys(decisions).length).padStart(2,'0')}]} /><Panel label="Awaiting review" title="Pending queue" action={<span className="font-identifier text-xs text-muted-foreground">{pending.length.toString().padStart(2,'0')} ITEMS</span>}><div className="divide-y">{approvals.map((item, index) => <div key={item.title} className="p-5"><div className="grid gap-4 md:grid-cols-[40px_1fr]"><div className="font-identifier text-xs text-primary">0{index + 1}</div><div><h3 className="text-2xl font-semibold">{item.title}</h3><p className="mt-3 font-identifier text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.owner} / {item.next} / {item.campaignId}</p><p className="mt-4">Review content against linked campaign, product, and escalation guardrails.</p><div className="mt-4 flex gap-2"><ChannelDot label="IN" /><ChannelDot label="FB" /><Badge variant={tone(item.risk)}>{item.risk}</Badge>{decisions[item.title] ? <Badge>{decisions[item.title]}</Badge> : null}</div><div className="mt-5 border-t pt-4"><Button disabled={Boolean(decisions[item.title])} onClick={()=>decide(item.title, 'approved')}>Approve</Button><Button disabled={Boolean(decisions[item.title])} className="ml-2" variant="outline" onClick={()=>decide(item.title, 'changes')}>Request changes</Button><Button disabled={Boolean(decisions[item.title])} className="ml-2" variant="outline" onClick={()=>decide(item.title, 'rejected')}>Reject</Button></div></div></div></div>)}</div></Panel><Panel label="Audit trail" title="Recent decisions"><div className="divide-y">{Object.entries(decisions).length ? Object.entries(decisions).map(([title, status]) => <div key={title} className="p-5"><span className="font-semibold">{title}</span> <Badge className="ml-2">{status}</Badge><p className="mt-2 font-identifier text-xs uppercase tracking-[0.22em] text-muted-foreground">Decision logged / 13 May 2026</p></div>) : <div className="p-5 text-muted-foreground">No local decisions yet.</div>}</div></Panel></div>;
}

function EngagementLayout({ onAction }: { onAction: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(inbound[0]?.id || '');
  const [typeFilter, setTypeFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'Open' | 'Closed'>('Open');
  const [replyText, setReplyText] = useState('');
  const [threadStates, setThreadStates] = useState<Record<string, { private?: boolean; hidden?: boolean; liked?: boolean; replied?: boolean; escalated?: boolean; handoff?: string }>>({});
  const selected = inbound.find((item) => item.id === selectedId) || inbound[0];
  const selectedState = selected ? threadStates[selected.id] || {} : {};
  const draftText = selected ? `Terima kasih ${selected.name}. We linked this conversation to ${selected.action === 'Create RFQ' ? 'an RFQ route' : 'a Demand follow-up'} and will respond with the next verified step.` : '';
  const visibleInbound = inbound.filter((item) => {
    if (channelFilter !== 'All' && item.channel !== channelFilter) return false;
    if (riskFilter === 'Negative' && item.tone !== 'Negative') return false;
    if (riskFilter === 'High risk' && !['Negative', 'Neutral'].includes(item.tone)) return false;
    if (riskFilter === 'Spam' && item.action !== 'Escalate') return false;
    if (statusFilter === 'Closed' && !threadStates[item.id]?.replied) return false;
    if (statusFilter === 'Open' && threadStates[item.id]?.replied) return false;
    return typeFilter === 'All' || typeFilter === 'Comments';
  });

  const updateThread = (message: string, patch: NonNullable<typeof threadStates[string]>) => {
    if (!selected) return;
    setThreadStates((current) => ({ ...current, [selected.id]: { ...current[selected.id], ...patch } }));
    onAction(message);
  };

  const typeTabs = [
    ['All', `${inbound.length.toString().padStart(2, '0')}`],
    ['Comments', '04'],
    ['DMs', '01'],
    ['Reviews', '01'],
    ['Mentions', '01'],
    ['Reactions', '00'],
  ];
  const channels = ['All', 'IG', 'FB', 'TT', 'IN', 'X', 'WA'];
  const riskTabs = [
    ['All', ''],
    ['Negative', '04'],
    ['High risk', '03'],
    ['Spam', '01'],
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-muted p-1">
            {typeTabs.map(([label, count]) => (
              <button key={label} type="button" onClick={() => setTypeFilter(label)} className={cn('shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground', typeFilter === label && 'bg-card text-primary shadow-sm')}>
                {label} {count}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-2xl bg-muted p-1">
            {(['Open', 'Closed'] as const).map((label) => (
              <button key={label} type="button" onClick={() => setStatusFilter(label)} className={cn('rounded-xl px-5 py-2 text-sm font-medium text-muted-foreground', statusFilter === label && 'bg-card text-primary shadow-sm')}>
                {label}{label === 'Closed' ? ` ${Object.values(threadStates).filter((state) => state.replied).length.toString().padStart(2, '0')}` : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => <Button key={channel} size="sm" variant={channelFilter === channel ? 'default' : 'outline'} className="rounded-full" onClick={() => setChannelFilter(channel)}>{channel}</Button>)}
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-muted p-1">
            {riskTabs.map(([label, count]) => (
              <button key={label} type="button" onClick={() => setRiskFilter(label)} className={cn('shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground', riskFilter === label && 'bg-card text-primary shadow-sm')}>
                {label}{count ? ` ${count}` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border bg-card xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <div className="max-h-[560px] overflow-y-auto border-r bg-card">
          {visibleInbound.length ? visibleInbound.map((item) => {
            const active = item.id === selected?.id;
            const state = threadStates[item.id] || {};
            return (
              <button key={item.id} className={cn('w-full border-b p-4 text-left hover:bg-muted/50', active && 'bg-primary/10')} onClick={() => { setSelectedId(item.id); onAction(`${item.name} selected`); }}>
                <div className="flex justify-between gap-3">
                  <div className="flex min-w-0 gap-2"><ChannelDot label={item.channel}/><span className="truncate font-semibold">{item.name}</span></div>
                  <span className="font-identifier text-xs text-muted-foreground">6D AGO</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                <div className="mt-2 flex flex-wrap gap-2"><Badge variant={tone(item.tone)}>{item.tone}</Badge><Badge variant="outline">comment</Badge>{state.replied ? <Badge>replied</Badge> : null}{state.hidden ? <Badge variant="warning">hidden</Badge> : null}</div>
              </button>
            );
          }) : <div className="p-8 text-sm text-muted-foreground">No conversations match current filters.</div>}
        </div>

        <div className="border-r bg-background">
          {selected ? (
            <>
              <div className="border-b p-4">
                <div className="flex items-center gap-2"><ChannelDot label={selected.channel}/><span className="font-semibold">{selected.channel === 'IN' ? 'LinkedIn' : selected.channel === 'IG' ? 'Instagram' : selected.channel === 'X' ? 'X' : 'Facebook'}</span><span className="font-semibold">{selected.name}</span><span className="ml-auto font-identifier text-xs text-muted-foreground">6D AGO</span></div>
              </div>
              <div className="p-4">
                <SectionLabel>comment</SectionLabel>
                <p className="mt-3 max-w-xl text-sm leading-6">{selected.body}</p>
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
                  <div className="font-identifier text-xs uppercase tracking-[0.22em] text-muted-foreground">AI draft (not sent)</div>
                  <p className="mt-2 text-sm leading-6">{draftText}</p>
                  <Button className="mt-3" size="sm" variant="outline" onClick={() => { setReplyText(draftText); onAction(`Draft inserted for ${selected.name}`); }}>Use this draft →</Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <button type="button" onClick={() => updateThread(`Lead/RFQ handoff created for ${selected.name}`, { handoff: selected.action })} className="rounded-xl border bg-muted/20 p-3 text-left hover:border-primary/40"><div className="text-xs text-muted-foreground">Handoff</div><div className="mt-1 font-semibold">{selected.action}</div></button>
                  <button type="button" onClick={() => updateThread(`Escalation created for ${selected.name}`, { escalated: true })} className="rounded-xl border bg-muted/20 p-3 text-left hover:border-primary/40"><div className="text-xs text-muted-foreground">Risk</div><div className="mt-1 font-semibold">Escalate</div></button>
                  <button type="button" onClick={() => updateThread(`Owner assigned for ${selected.name}`, { handoff: 'Assigned to Demand Ops' })} className="rounded-xl border bg-muted/20 p-3 text-left hover:border-primary/40"><div className="text-xs text-muted-foreground">Owner</div><div className="mt-1 font-semibold">Assign</div></button>
                </div>
              </div>
              <div className="border-t p-4">
                <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} className="min-h-20 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" placeholder={`Reply to ${selected.name}...`} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => updateThread(`Reply sent to ${selected.name}`, { replied: true })}>Send</Button>
                  <Button variant={selectedState.private ? 'default' : 'outline'} onClick={() => updateThread(`Private reply ${selectedState.private ? 'disabled' : 'enabled'} for ${selected.name}`, { private: !selectedState.private })}>Private</Button>
                  <Button variant={selectedState.hidden ? 'default' : 'outline'} onClick={() => updateThread(`${selected.name} thread ${selectedState.hidden ? 'unhidden' : 'hidden'}`, { hidden: !selectedState.hidden })}>Hide</Button>
                  <Button variant={selectedState.liked ? 'default' : 'outline'} onClick={() => updateThread(`${selected.name} thread ${selectedState.liked ? 'unliked' : 'liked'}`, { liked: !selectedState.liked })}>Like</Button>
                  <Button variant="outline" onClick={() => { setReplyText(''); onAction(`Draft cleared for ${selected.name}`); }}>Clear</Button>
                </div>
              </div>
            </>
          ) : <div className="p-8 text-sm text-muted-foreground">Select a conversation.</div>}
        </div>

        <div className="bg-card p-4">
          {selected ? (
            <>
              <SectionLabel>Author</SectionLabel>
              <h4 className="mt-3 font-semibold">{selected.name}</h4>
              <p className="font-identifier text-xs uppercase tracking-[0.22em] text-muted-foreground">{selected.channel}</p>
              <SectionLabel>Classification</SectionLabel>
              <div className="mt-3 flex flex-wrap gap-2"><Badge variant={tone(selected.tone)}>{selected.tone}</Badge><Badge variant="outline">{selected.tone === 'Negative' ? 'High' : 'Low'}</Badge><Badge variant="outline">MS</Badge></div>
              <SectionLabel>Linked PrimeOS IDs</SectionLabel>
              <div className="mt-3 grid gap-2 break-all font-identifier text-[11px] text-muted-foreground"><span>Lead: {selected.leadId}</span><span>Customer: {selected.customerId}</span><span>Campaign: {selected.campaignId}</span></div>
              <SectionLabel>Capabilities</SectionLabel>
              <div className="mt-3 grid gap-2 font-identifier text-xs uppercase tracking-[0.2em]">
                <button type="button" onClick={() => updateThread(`Capability reply checked for ${selected.name}`, {})} className="text-left hover:text-primary">Reply [Y]</button>
                <button type="button" onClick={() => updateThread(`Private capability checked for ${selected.name}`, {})} className="text-left hover:text-primary">Private reply [Y / 7d]</button>
                <button type="button" onClick={() => updateThread(`Hide capability checked for ${selected.name}`, {})} className="text-left hover:text-primary">Hide [Y]</button>
                <button type="button" onClick={() => updateThread(`Like capability checked for ${selected.name}`, {})} className="text-left hover:text-primary">Like [Y]</button>
              </div>
              <SectionLabel>Current state</SectionLabel>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <div>Private: {selectedState.private ? 'yes' : 'no'}</div>
                <div>Hidden: {selectedState.hidden ? 'yes' : 'no'}</div>
                <div>Liked: {selectedState.liked ? 'yes' : 'no'}</div>
                <div>Replied: {selectedState.replied ? 'yes' : 'no'}</div>
                <div>Handoff: {selectedState.handoff || 'none'}</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function EscalationsLayout({ onAction }: { onAction: (message: string) => void }) {
  const [closed, setClosed] = useState<Record<string, 'dismissed' | 'resolved'>>({});
  const [ownersByTitle, setOwnersByTitle] = useState<Record<string, string>>({});
  const activeItems = severeItems.filter((item) => !closed[item.title]);
  const closeItem = (title: string, status: 'dismissed' | 'resolved') => { setClosed((current) => ({ ...current, [title]: status })); onAction(`${title}: ${status}`); };
  const rotateOwner = (title: string, index: number) => {
    const next = ['Aisyah Rahman', 'Priya Subramaniam', 'Unassigned'][(index + 1) % 3];
    setOwnersByTitle((current) => ({ ...current, [title]: next }));
    onAction(`${title} owner changed to ${next}`);
  };
  return <div className="space-y-6"><StatStrip items={[{label:'Open', value:String(activeItems.length).padStart(2,'0'), tone:'danger'}, {label:'High priority', value:String(activeItems.length).padStart(2,'0'), tone:'danger'}, {label:'Unassigned', value:String(activeItems.filter((item) => (ownersByTitle[item.title] || item.owner) === 'Unassigned').length).padStart(2,'0'), tone:'danger'}, {label:'Closed', value:String(Object.keys(closed).length).padStart(2,'0'), tone:'success'}]} /><Panel label="Open" title="Active escalations" action={<span className="font-identifier text-xs text-muted-foreground">{activeItems.length.toString().padStart(2,'0')} ITEMS</span>}><div className="divide-y">{activeItems.map((item,index)=><div key={item.title} className="p-5"><div className="flex gap-2"><Badge variant={tone(index===0?'Critical':'High')}>{index===0?'Critical':'High'}</Badge><Badge variant="destructive">Negative</Badge><Badge variant="outline">{index===0?'in progress':'open'}</Badge><span className="font-identifier text-xs text-muted-foreground">◷ 6D AGO</span></div><h3 className="mt-3 text-2xl font-semibold">{item.title}</h3><p className="mt-2 font-identifier text-xs text-muted-foreground">{item.source}</p><div className="mt-4 border-t pt-4"><Button variant="outline" className="w-full justify-between" onClick={() => rotateOwner(item.title, index)}>{ownersByTitle[item.title] || item.owner}⌄</Button><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => closeItem(item.title, 'dismissed')}>Dismiss</Button><Button onClick={() => closeItem(item.title, 'resolved')}>Resolve</Button></div></div></div>)}</div></Panel><Panel label="Audit trail" title="Recently closed"><div className="divide-y">{Object.entries(closed).length ? Object.entries(closed).map(([title,status]) => <div key={title} className="p-5"><span className="font-semibold">{title}</span><Badge className="ml-2">{status}</Badge></div>) : <div className="p-10 text-center text-muted-foreground">No closed items yet</div>}</div></Panel></div>;
}

function AnalyticsLayout() {
  const channels=['Instagram','Facebook','TikTok','LinkedIn','X','WhatsApp'];
  const [selectedChannel, setSelectedChannel] = useState('Instagram');
  const [range, setRange] = useState('Last 30 days');
  return <div className="space-y-6"><div className="flex flex-wrap justify-between gap-3"><div className="flex flex-wrap gap-2">{channels.map(c=><Button key={c} size="sm" variant={selectedChannel === c ? 'default' : 'outline'} className="rounded-full" onClick={() => setSelectedChannel(c)}>{c}</Button>)}</div><Button variant="outline" onClick={() => setRange(range === 'Last 30 days' ? 'Last 7 days' : 'Last 30 days')}>{range}</Button></div><StatStrip items={[{label:'Reach', value:metrics.reach.toLocaleString(), detail:selectedChannel}, {label:'Impressions', value:metrics.impressions.toLocaleString()}, {label:'Engagement', value:`${metrics.engagementRate}%`, tone:'primary'}, {label:'Clicks', value:metrics.clicks.toLocaleString()}]} /><Panel label="Trend" title={`Engagement rate over time · ${selectedChannel}`}><div className="h-80 p-5"><div className="relative h-full overflow-hidden rounded-xl border bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:96px_56px]"><svg viewBox="0 0 900 260" className="absolute inset-0 h-full w-full p-6"><path d="M0 140 C80 20 130 240 220 100 S360 20 440 150 590 240 680 95 820 40 900 130" fill="none" stroke="#1d4ed8" strokeWidth="3"/><path d="M0 110 C100 230 150 40 250 110 S420 210 500 92 650 40 760 155 840 220 900 92" fill="none" stroke="#db2777" strokeWidth="3"/><path d="M0 95 C120 170 160 210 250 125 S400 70 480 135 640 190 730 110 830 55 900 120" fill="none" stroke="#16a34a" strokeWidth="3"/></svg></div></div></Panel><div className="grid gap-6 lg:grid-cols-2"><Panel label="Comparison" title="Impressions by channel"><div className="flex h-72 items-end gap-4 p-6">{channels.map((c,i)=><button key={c} onClick={() => setSelectedChannel(c)} className="flex flex-1 flex-col items-center gap-2"><div className={cn('w-full rounded-t', selectedChannel === c ? 'bg-primary' : 'bg-primary/50')} style={{height: `${150-i*4}px`}}/><span className="font-identifier text-xs text-muted-foreground">{c}</span></button>)}</div></Panel><Panel label="Format" title="Performance by format"><div className="divide-y p-5">{[['Video','12','6.4%'],['Image','22','4.1%'],['Carousel','7','2.9%'],['Document','3','1.7%']].map(r=><button key={r[0]} onClick={() => setSelectedChannel(r[0])} className="grid w-full grid-cols-[1fr_60px_80px] py-3 text-left hover:text-primary"><span>{r[0]}</span><span className="text-right text-muted-foreground">{r[1]}</span><span className="text-right text-2xl font-semibold text-primary">{r[2]}</span></button>)}</div></Panel></div></div>;
}

function ListeningLayout({ onAction }: { onAction: (message: string) => void }) {
  const tabs = ['Mentions', 'Keywords', 'Sentiment', 'Sources', 'Trends', 'Digest'];
  const [tab, setTab] = useState('Mentions');
  const [selectedId, setSelectedId] = useState(clusters[0]?.id || '');
  const [watching, setWatching] = useState<Record<string, boolean>>({});
  const [digestReady, setDigestReady] = useState(false);
  const selected = clusters.find((cluster) => cluster.id === selectedId) || clusters[0];
  const feed = clusters.map((cluster, index) => ({
    ...cluster,
    source: ['X', 'reddit', 'news', 'blogs'][index] || 'social',
    author: ['@prime_watch', 'u/demand_ops', 'The Star', 'Lowyat.NET'][index] || '@mdec',
    sentiment: cluster.neg > 0 ? 'Negative' : cluster.pos >= cluster.neu ? 'Positive' : 'Neutral',
    risk: cluster.neg > 0 ? 'Medium' : 'Low',
  }));
  const visibleFeed = tab === 'Sentiment' ? feed.slice().sort((a, b) => b.neg - a.neg) : feed;
  const activateTab = (next: string) => {
    setTab(next);
    onAction(`Listening ${next} opened`);
    if (next === 'Digest') setDigestReady(true);
  };
  const openItem = (id: string, title: string) => {
    setSelectedId(id);
    onAction(`Listening item opened: ${title}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-muted p-1">
        {tabs.map((item) => <button key={item} type="button" onClick={() => activateTab(item)} className={cn('shrink-0 rounded-xl px-5 py-2 text-sm font-medium text-muted-foreground', tab === item && 'bg-card text-primary shadow-sm')}>{item}</button>)}
      </div>
      <StatStrip items={[{ label: 'Clusters', value: String(clusters.length).padStart(2, '0'), tone: 'primary' }, { label: 'Watched', value: String(Object.values(watching).filter(Boolean).length).padStart(2, '0') }, { label: 'Negative', value: String(clusters.reduce((sum, cluster) => sum + cluster.neg, 0)).padStart(2, '0'), tone: 'danger' }, { label: 'Digest', value: digestReady ? 'READY' : 'DRAFT', tone: digestReady ? 'success' : undefined }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel label="Stream" title={`${tab} feed`} action={<span className="font-identifier text-xs text-muted-foreground">{selected?.campaignId || 'no-campaign'}</span>}>
          <div className="divide-y">
            {visibleFeed.map((item, index) => <button key={item.id} type="button" onClick={() => openItem(item.id, item.title)} className={cn('grid w-full gap-3 p-5 text-left hover:bg-muted/40 md:grid-cols-[40px_1fr_auto]', selectedId === item.id && 'bg-primary/10')}><span className="font-identifier text-xs text-primary">0{index + 1}</span><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.source}</Badge><span className="font-semibold">{item.author}</span><Badge variant={tone(item.sentiment)}>{item.sentiment}</Badge><Badge variant={tone(item.risk)}>{item.risk}</Badge>{watching[item.id] ? <Badge>watching</Badge> : null}</div><p className="mt-3">{item.body}</p><p className="mt-2 font-identifier text-xs uppercase tracking-[0.2em] text-muted-foreground">Source {item.sourceId} / Campaign {item.campaignId}</p></div><span className="font-identifier text-xs text-muted-foreground">{item.volume}K VOL ↗</span></button>)}
          </div>
        </Panel>
        <Panel label="Action" title={selected?.title || 'Select cluster'}>
          {selected ? <div className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-3 text-center"><KpiMini label="Positive" value={String(selected.pos)} /><KpiMini label="Neutral" value={String(selected.neu)} /><KpiMini label="Negative" value={String(selected.neg)} /></div>
            <p className="text-sm leading-6 text-muted-foreground">{selected.body}</p>
            <div className="rounded-xl border bg-muted/20 p-3 font-identifier text-xs uppercase tracking-[0.2em] text-muted-foreground">Campaign link: {selected.campaignId}<br />Source link: {selected.sourceId}</div>
            <div className="grid gap-2">
              <Button onClick={() => { setWatching((current) => ({ ...current, [selected.id]: !current[selected.id] })); onAction(`${selected.title} ${watching[selected.id] ? 'removed from' : 'added to'} watchlist`); }}>{watching[selected.id] ? 'Remove watch' : 'Add to watchlist'}</Button>
              <Button variant="outline" onClick={() => { setDigestReady(true); onAction(`Digest generated for ${selected.title}`); }}>Generate digest</Button>
              <Button variant="outline" onClick={() => onAction(`Insight routed to campaign ${selected.campaignId}`)}>Route to campaign</Button>
            </div>
          </div> : null}
        </Panel>
      </div>
    </div>
  );
}

function ReportsLayout({ onAction }: { onAction: (message: string) => void }) {
  const [generatedIds, setGeneratedIds] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState(reports[0]?.id || '');
  const [period, setPeriod] = useState('May 2026');
  const [channels, setChannels] = useState('Instagram · Facebook · LinkedIn · TikTok · WhatsApp');
  const [sections, setSections] = useState('6 default');
  const generatedCount = Object.values(generatedIds).filter(Boolean).length;
  const readyCount = reports.filter((report) => report.status === 'ready').length + generatedCount;
  const draftCount = Math.max(0, reports.filter((report) => report.status === 'draft').length - generatedCount);
  const activeReport = reports.find((report) => report.id === preview) || reports[0];
  const generateReport = (report = reports.find((item) => item.status === 'draft') || reports[0]) => {
    if (!report) return;
    setGeneratedIds((current) => ({ ...current, [report.id]: true }));
    setPreview(report.id);
    onAction(`Report generated: ${report.title}`);
  };
  const cycleBuilder = (field: 'period' | 'channels' | 'sections') => {
    if (field === 'period') setPeriod((value) => value === 'May 2026' ? 'Week 20, 2026' : 'May 2026');
    if (field === 'channels') setChannels((value) => value.includes('TikTok') ? 'LinkedIn · Facebook' : 'Instagram · Facebook · LinkedIn · TikTok · WhatsApp');
    if (field === 'sections') setSections((value) => value === '6 default' ? '8 with listening appendix' : '6 default');
    onAction(`Report ${field} changed`);
  };

  return <div className="space-y-6"><StatStrip items={[{label:'Ready', value:String(readyCount).padStart(2,'0'), tone:'success'}, {label:'Drafts', value:String(draftCount).padStart(2,'0')}, {label:'Campaigns', value:String(new Set(reports.map((report) => report.campaignId)).size).padStart(2,'0'), tone:'primary'}, {label:'Generated', value:String(generatedCount).padStart(2,'0')}]} /><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Panel label="Library" title="Generated reports" action={<span className="font-identifier text-xs text-muted-foreground">{String(reports.length + generatedCount).padStart(2,'0')} TOTAL</span>}><div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">{reports.map((report, index) => <div key={report.id} className="p-5"><SectionLabel>{index === 0 ? 'Apr 2026' : 'Wk 18, 2026'}</SectionLabel><h3 className="mt-4 text-2xl font-semibold">{report.title}</h3><p className="mt-4 font-identifier text-xs uppercase tracking-[0.22em] text-muted-foreground">Campaign {report.campaignId}<br/>Status {generatedIds[report.id] ? 'ready' : report.status}</p><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setPreview(report.id); onAction(`Report preview opened: ${report.title}`); }}>Preview</Button>{report.status === 'draft' && !generatedIds[report.id] ? <Button onClick={() => generateReport(report)}>Generate</Button> : null}</div></div>)}</div>{activeReport ? <div className="border-t p-5 text-sm text-muted-foreground">Previewing: <span className="font-semibold text-foreground">{activeReport.title}</span><br/><span className="font-identifier text-xs uppercase tracking-[0.2em]">Linked campaign {activeReport.campaignId}</span></div> : null}</Panel><Panel label="Builder" title="Compose new"><div className="space-y-5 p-5"><p className="text-muted-foreground">Choose period, channels, and sections — then generate from linked MDEC campaign data.</p>{[['Period',period,'period'],['Channels',channels,'channels'],['Sections',sections,'sections']].map(([label,value,key])=><button key={label} type="button" onClick={() => cycleBuilder(key as 'period' | 'channels' | 'sections')} className="flex w-full justify-between border-b pb-3 text-left"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></button>)}<Button className="w-full" onClick={() => generateReport()}>Generate next draft →</Button></div></Panel></div></div>;
}

function WorkQueue({ activeView, onAction }: { activeView: MdecView; onAction: (message: string) => void }) {
  if (activeView === 'calendar') return <CalendarLayout onAction={onAction} />;
  if (activeView === 'composer') return <ComposerLayout onAction={onAction} />;
  if (activeView === 'approvals') return <ApprovalsLayout onAction={onAction} />;
  if (activeView === 'engagement') return <EngagementLayout onAction={onAction} />;
  if (activeView === 'escalations') return <EscalationsLayout onAction={onAction} />;
  if (activeView === 'analytics') return <AnalyticsLayout />;
  if (activeView === 'listening') return <ListeningLayout onAction={onAction} />;
  if (activeView === 'reports') return <ReportsLayout onAction={onAction} />;
  return <DashboardLayout onAction={onAction} />;
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/20 p-4"><div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div className="mt-2 text-3xl font-semibold">{value}</div></div>;
}

function SetupCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="rounded-2xl border bg-muted/20 p-4"><Icon className="size-5 text-primary" /><div className="mt-3 font-semibold">{title}</div><p className="mt-1 text-sm text-muted-foreground">{body}</p></div>;
}

function AgenticModeWorkspace({ onClose, onAction }: { onClose: () => void; onAction: (message: string) => void }) {
  const agents = [
    ['Orchestrator', Sparkles],
    ['Content', PenLine],
    ['Scheduling', CalendarCheck],
    ['Review', ShieldCheck],
    ['Engagement', Inbox],
    ['Listening', Search],
    ['Analytics', BarChart3],
  ] as const;
  const history = [
    ['TODAY', 'Current session', 'Active'],
    ['YESTERDAY', 'Demand Dashboard launch plan', 'Drafted 3, scheduled 2'],
    ['YESTERDAY', 'Inbox triage — Tue PM', '12 replies sent w/ approval'],
    ['LAST 7 DAYS', 'Listening: B2B chatter', 'Escalated 1, watch added'],
    ['LAST 7 DAYS', 'Q1 weekly report', 'Generated, delivered to leads'],
    ['LAST 7 DAYS', 'Crisis: stock claim', 'Holding statement queued'],
    ['LAST 7 DAYS', 'Creator campaign brief', 'Drafted 5 anchor posts'],
  ];
  const chips = ['Draft posts', 'Schedule', 'Review queue', 'Triage inbox', 'Trending', 'Weekly report', 'Handle escalation', 'Plan the week'];
  const [activeAgent, setActiveAgent] = useState('Orchestrator');
  const [request, setRequest] = useState('');
  const [proposal, setProposal] = useState<{ title: string; detail: string; owner: string; status: 'draft' | 'confirmed' } | null>(null);
  const createProposal = (title: string) => {
    const next = {
      title,
      detail: `${activeAgent} proposes a safe MDEC action. It will not mutate publishing state until confirmed here.`,
      owner: activeAgent,
      status: 'draft' as const,
    };
    setProposal(next);
    onAction(`Agentic proposal drafted: ${title}`);
  };
  const confirmProposal = () => {
    if (!proposal) return;
    setProposal({ ...proposal, status: 'confirmed' });
    onAction(`Agentic proposal confirmed: ${proposal.title}`);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-md">
      <div className="flex h-full flex-col p-5 md:p-10">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"><Sparkles className="size-5" /></span>
            <div>
              <h2 className="text-lg font-semibold">MDEC Orchestrator</h2>
              <p className="text-sm text-muted-foreground">7 specialised subagents · every action needs your confirm</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>×</Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <Card className="min-h-0 rounded-3xl border bg-card shadow-xl">
            <CardContent className="flex h-full flex-col gap-4 p-3">
              <Button className="h-11 rounded-2xl" onClick={() => createProposal('Start a new MDEC orchestration chat')}>⊞ New chat</Button>
              <Input className="rounded-2xl" placeholder="Search history" />
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2">
                {history.map(([section, title, detail], index) => (
                  <div key={`${section}-${title}`} className="space-y-1">
                    {(index === 0 || history[index - 1][0] !== section) ? <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{section}</div> : null}
                    <button type="button" onClick={() => createProposal(title)} className="w-full rounded-xl p-2 text-left transition-colors hover:bg-muted">
                      <div className="text-sm font-semibold">{title}</div>
                      <div className="text-xs text-muted-foreground">{detail}</div>
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm">
              {agents.map(([name, Icon]) => (
                <button key={name} type="button" onClick={() => { setActiveAgent(name); createProposal(`${name} agent selected`); }} className={cn('flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted', activeAgent === name && 'bg-primary/10 text-primary')}>
                  <Icon className="size-3.5" /> {name}
                </button>
              ))}
            </div>

            <Card className="min-h-0 flex-1 overflow-hidden rounded-3xl border bg-card/90 shadow-2xl">
              <CardContent className="flex h-full flex-col p-5">
                <div className="max-w-3xl rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
                  <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" />Agentic Mode</Badge>
                  <h3 className="mt-4 text-xl font-semibold">How can I help today?</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">
                    I'm the MDEC Orchestrator. I delegate to seven specialised subagents — Content, Scheduling, Review, Engagement, Listening, Analytics, and Escalation. Tap a chip below to see one work end-to-end. Every state change waits for your explicit confirm in the right-hand panel.
                  </p>
                </div>
                <div className="flex-1" />
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => <Button key={chip} size="sm" variant="outline" className="rounded-full" onClick={() => createProposal(chip)}>{chip}</Button>)}
                  </div>
                  <div className="flex gap-2 rounded-2xl border bg-background p-2 shadow-sm">
                    <Input value={request} onChange={(event) => setRequest(event.target.value)} className="h-11 border-primary/40" placeholder="Type to delegate... (try: plan the week)" />
                    <Button size="icon" className="h-11 w-11 rounded-full" onClick={() => createProposal(request || 'Plan the week')}>↑</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-0 rounded-3xl border bg-card shadow-xl">
            <CardContent className="flex h-full flex-col p-6">
              {proposal ? (
                <div className="my-auto rounded-3xl border bg-muted/20 p-5 text-left">
                  <Badge variant={proposal.status === 'confirmed' ? 'default' : 'warning'}>{proposal.status === 'confirmed' ? 'Confirmed' : 'Needs confirm'}</Badge>
                  <h3 className="mt-4 text-xl font-semibold">{proposal.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{proposal.detail}</p>
                  <div className="mt-4 rounded-xl border bg-background p-3 text-sm"><span className="text-muted-foreground">Owner</span><div className="font-semibold">{proposal.owner}</div></div>
                  <div className="mt-4 flex gap-2"><Button disabled={proposal.status === 'confirmed'} onClick={confirmProposal}>Confirm</Button><Button variant="outline" onClick={() => setProposal(null)}>Dismiss</Button></div>
                </div>
              ) : (
                <div className="m-auto text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-6" /></span>
                  <h3 className="mt-5 font-semibold">Standing by</h3>
                  <p className="mt-3 max-w-52 text-sm leading-6 text-muted-foreground">Pick a quick action below or type a request. Anything I propose will show up here for you to review.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


export function PrimeMdecPage() {
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view') as MdecView | null;
  const activeView: MdecView = allViews.some((view) => view.id === requestedView) ? requestedView! : 'dashboard';
  const activeLabel = allViews.find((view) => view.id === activeView)?.label ?? 'Dashboard';
  const [agentic, setAgentic] = useState(false);
  const [log, setLog] = useState<string[]>(['MDEC product loaded in Demand Suite']);
  const dateLabel = useMemo(() => 'Kemaskini 13 MAY 2026', []);
  const record = (message: string) => setLog((current) => [message, ...current].slice(0, 4));

  return (
    <div className="min-h-full bg-muted/20">
      <div className="min-h-[calc(100svh-var(--header-height))]">
        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 md:px-6">
              <div className="min-w-[180px] flex-1">
                <SectionLabel>MDEC / {activeView}</SectionLabel>
                <h1 className="font-display text-xl font-semibold leading-tight">{activeLabel}</h1>
              </div>
              <div className="min-w-[260px] flex-[2]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 rounded-xl pl-9" placeholder="Search posts, mentions, conversations..." />
                </div>
              </div>
              <Button variant="outline" className="h-11 rounded-xl">{dateLabel}</Button>
              <Button size="icon" variant="outline" className="h-11 w-11 rounded-xl"><Moon className="size-4" /></Button>
              <Button size="icon" variant="ghost" className="h-11 w-11 rounded-xl"><Bell className="size-4" /></Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => setAgentic(true)}><Sparkles className="size-4 text-primary" />Agentic Mode</Button>
              <Button variant="outline" className="h-11 rounded-xl"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">AR</span><span className="hidden text-left md:block"><span className="block text-sm font-semibold">Aisyah Rahman</span><span className="block text-xs text-primary">admin</span></span></Button>
            </div>
          </header>

          <div className="flex min-h-[calc(100svh-var(--header-height))] flex-col gap-6 p-4 md:p-6">
            <section className={cn('flex flex-col gap-4 border-b xl:flex-row xl:items-end xl:justify-between', activeView === 'engagement' ? 'pb-3' : 'pb-6')}>
              <div>
                <SectionLabel>Operations / {activeLabel}</SectionLabel>
                <h2 className={cn('mt-3 max-w-4xl font-semibold tracking-tight', activeView === 'engagement' ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl')}>{activeView === 'dashboard' ? 'Today across the public voice' : `${activeLabel} across the public voice`}</h2>
                {activeView === 'engagement' ? null : <p className="mt-3 text-base text-muted-foreground">Six channels at a glance. Rebuilt with Prime OS design tokens, spacing, cards, buttons, and badges.</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  Latest: <span className="font-medium text-foreground">{log[0]}</span>
                </div>
                <Button className="h-11 self-start rounded-xl xl:self-auto" onClick={() => record('Compose new opened')}><Rocket className="size-4" />Compose new</Button>
              </div>
            </section>

            {activeView === 'dashboard' ? <DashboardLayout onAction={record} /> : <WorkQueue activeView={activeView} onAction={record} />}

            <div aria-hidden="true" className="min-h-0 flex-1 rounded-2xl bg-card/20" />

            {agentic ? <AgenticModeWorkspace onClose={() => setAgentic(false)} onAction={record} /> : null}

            <div className="sr-only" aria-live="polite">{log[0]}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
