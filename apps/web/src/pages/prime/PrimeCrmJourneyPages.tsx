import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CirclePlus,
  Clock3,
  Filter,
  Megaphone,
  MessageSquareText,
  RefreshCcw,
  Search,
  Target,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChannelSourceFilter, type ChannelSource } from '@/components/shared/ChannelSourceFilter';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

type Tone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';

interface Metric {
  label: string;
  value: string | number;
  helper: string;
  tone?: 'neutral' | 'success' | 'warning';
  onClick?: () => void;
  active?: boolean;
}

interface DetailField {
  label: string;
  value: ReactNode;
}

function statusTone(status: string): Tone {
  if (['active', 'qualified', 'converted', 'retention', 'healthy'].includes(status)) return 'success';
  if (['paused', 'at-risk', 'needs_review', 'rfq_sent'].includes(status)) return 'warning';
  if (['new', 'draft', 'testing', 'quoted'].includes(status)) return 'secondary';
  return 'outline';
}

function MetricCard({ metric }: { metric: Metric }) {
  const content = (
    <Card className={cn('h-full rounded-xl shadow-none transition-colors', metric.tone === 'warning' && 'border-amber-300/70', metric.tone === 'success' && 'border-emerald-300/70', metric.onClick && 'hover:border-primary/60 hover:bg-muted/20', metric.active && 'border-primary ring-2 ring-primary/15')}>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground">{metric.label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{metric.value}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{metric.helper}</div>
      </CardContent>
    </Card>
  );
  return metric.onClick ? <button type="button" className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={metric.onClick} aria-pressed={metric.active}>{content}</button> : content;
}

function JourneyPage({
  title,
  description,
  primaryLabel,
  primaryHref,
  onPrimaryAction,
  metrics,
  children,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref?: string;
  onPrimaryAction?: () => void;
  metrics: Metric[];
  children: ReactNode;
}) {
  const action = (
    <Button className="h-9 rounded-md gap-2" onClick={onPrimaryAction}>
      <CirclePlus className="size-4" />
      {primaryLabel}
    </Button>
  );

  return (
    <div className="min-h-full bg-background">
      <div className="w-full space-y-5 p-4 pb-16 md:p-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          {primaryHref ? <Link to={primaryHref}>{action}</Link> : action}
        </header>

        <section aria-label={`${title} summary`} className="grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </section>

        {children}
      </div>
    </div>
  );
}

function WorkToolbar({ query, onQueryChange, placeholder, children }: { query: string; onQueryChange: (value: string) => void; placeholder: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="h-9 pl-9" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <Button type="button" variant={active ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={onClick}>{children}</Button>;
}

function DetailSheet({ open, onOpenChange, title, description, fields, actionLabel, onAction, nextStep, checklist = [], secondaryLabel, onSecondary, actionDisabled = false }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; fields: DetailField[]; actionLabel: string; onAction?: () => void; nextStep?: string; checklist?: string[]; secondaryLabel?: string; onSecondary?: () => void; actionDisabled?: boolean }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-3">
          {fields.map((field) => (
            <div key={field.label} className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">{field.label}</div>
              <div className="mt-1 text-sm font-semibold">{field.value}</div>
            </div>
          ))}
        </div>
        {checklist.length ? <div className="mt-5 rounded-lg border bg-muted/20 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ready before continuing</p><div className="mt-3 grid gap-2">{checklist.map((item) => <div key={item} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span>{item}</span></div>)}</div></div> : null}
        {nextStep ? <div className="mt-4 flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">What happens next</p><p className="mt-1 text-sm leading-5">{nextStep}</p></div></div> : null}
        <div className="mt-6 grid gap-2">{secondaryLabel ? <Button variant="outline" onClick={onSecondary}>{secondaryLabel}</Button> : null}<Button disabled={actionDisabled} onClick={onAction}>{actionLabel}</Button></div>
      </SheetContent>
    </Sheet>
  );
}

function WorkflowDialog({ open, onOpenChange, title, description, submitLabel, onSubmit, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; submitLabel: string; onSubmit: () => void; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}{helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}</div>;
}

export function PrimeCrmSourcesSimplePage() {
  const navigate = useNavigate();
  const snapshot = getPrimeSnapshot();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('Social');
  type SourceRow = { name: string; channel: string; tags: string[]; leads: number; rfqs: number; campaigns: number; quality: number; issue?: string };
  const [customSources, setCustomSources] = useState<SourceRow[]>([]);
  const [sourceHealth, setSourceHealth] = useState<Record<string, { quality: number; issue?: string }>>({});
  const [selected, setSelected] = useState<SourceRow | null>(null);
  const seededSources = useMemo(() => {
    const channels = new Map<string, SourceRow>();
    snapshot.campaigns.forEach((campaign, index) => {
      const key = campaign.channel;
      const tags = /linkedin/i.test(key) ? ['B2B', 'Social'] : /email|retarget/i.test(key) ? ['Direct', 'Nurture'] : /tiktok.*amazon|amazon.*tiktok/i.test(key) ? ['Social', 'Marketplace'] : /amazon|rakuten|marketplace/i.test(key) ? ['Marketplace'] : /social|tiktok|instagram/i.test(key) ? ['Social'] : /ads|paid/i.test(key) ? ['Ads'] : /partner/i.test(key) ? ['Partner'] : ['Direct'];
      const quality = 88 + (index % 4) * 2;
      const current = channels.get(key) ?? { name: campaign.channel, channel: tags[0], tags, leads: 0, rfqs: 0, campaigns: 0, quality, issue: quality < 92 ? (index % 3 === 0 ? 'Fix Auth' : index % 3 === 1 ? 'Check Webhook' : 'Reconnect') : undefined };
      current.leads += campaign.leads;
      current.rfqs += campaign.rfqs;
      current.campaigns += 1;
      channels.set(key, current);
    });
    return Array.from(channels.values());
  }, [snapshot.campaigns]);
  const sources = [...customSources, ...seededSources].map((source) => ({ ...source, ...(sourceHealth[source.name] ?? {}) }));
  const filtered = sources.filter((source) => (type === 'all' || source.tags.includes(type)) && (!attentionOnly || source.quality < 92) && `${source.name} ${source.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const needsReview = sources.filter((source) => source.quality < 92).length;

  return (
    <JourneyPage title="Sources" description="See where customer demand comes from and quickly identify the channels that need attention." primaryLabel="Add source" onPrimaryAction={() => setCreateOpen(true)} metrics={[
      { label: 'Active sources', value: sources.length, helper: 'Click to show all connected sources.', onClick: () => { setAttentionOnly(false); setType('all'); }, active: !attentionOnly && type === 'all' },
      { label: 'Leads generated', value: sources.reduce((sum, source) => sum + source.leads, 0), helper: 'Leads connected to a known source.', tone: 'success' },
      { label: 'Needs attention', value: needsReview, helper: 'Click to filter sources with connection errors.', tone: needsReview ? 'warning' : 'success', onClick: () => { setAttentionOnly(true); setType('all'); }, active: attentionOnly },
    ]}>
      <WorkToolbar query={query} onQueryChange={setQuery} placeholder="Search source or channel…">
        {['all', 'Marketplace', 'Social', 'B2B', 'Direct', 'Nurture', 'Ads', 'Partner'].map((item) => <FilterButton key={item} active={type === item && !attentionOnly} onClick={() => { setType(item); setAttentionOnly(false); }}>{item === 'all' ? 'All' : item}</FilterButton>)}
      </WorkToolbar>
      <Card className="overflow-hidden rounded-xl shadow-none">
        <Table>
          <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>Leads</TableHead><TableHead>RFQs</TableHead><TableHead>Quality</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Next action</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((source) => <TableRow key={source.name} className="cursor-pointer" onClick={() => setSelected(source)}><TableCell className="font-semibold">{source.name}<div className="mt-1 text-xs font-normal text-muted-foreground">{source.campaigns} connected campaigns</div></TableCell><TableCell><div className="flex flex-wrap gap-1">{source.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div></TableCell><TableCell>{source.leads}</TableCell><TableCell>{source.rfqs}</TableCell><TableCell>{source.quality}/100</TableCell><TableCell><Badge variant={source.quality < 92 ? 'warning' : 'success'}>{source.quality < 92 ? 'Needs attention' : 'Healthy'}</Badge></TableCell><TableCell className="text-right"><Button variant={source.issue ? 'outline' : 'ghost'} size="sm">{source.issue ?? 'View performance'} <ArrowRight className="size-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </Card>
      <DetailSheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title={selected?.name ?? ''} description="Validate source quality, ownership, and output before using it in a campaign." fields={[{ label: 'Classification', value: selected?.tags.join(' + ') }, { label: 'Owner', value: 'Growth team' }, { label: 'Lead / RFQ output', value: `${selected?.leads ?? 0} leads · ${selected?.rfqs ?? 0} RFQs` }, { label: 'Quality and readiness', value: `${selected?.quality ?? 0}/100 · ${(selected?.quality ?? 0) >= 92 ? 'Ready to activate' : selected?.issue ?? 'Review tracking first'}` }, { label: 'Conversion signal', value: `${selected?.leads ? Math.round(((selected?.rfqs ?? 0) / selected.leads) * 100) : 0}% of leads requested a quote` }, { label: 'Last synchronized', value: selected?.issue ? 'Sync interrupted · action required' : 'Today, 16:42 · Connector healthy' }]} checklist={selected?.issue ? ['Connector credentials are available', 'No active campaign will lose historical data', 'Run a test event after repair'] : ['Source owner is assigned', 'Tracking and consent status are valid', 'Audience has enough qualified signals']} nextStep={selected?.issue ? 'Repair the connection, run a test event, and return the source to Healthy before using it in a new campaign.' : 'A campaign draft will open with this source preselected. Add the offer, audience, budget and approval owner before activation.'} actionLabel={selected?.issue ?? 'Continue to campaign setup'} secondaryLabel={selected?.issue ? 'Assign to connector owner' : 'Mark source for review'} onSecondary={() => { toast.success(selected?.issue ? 'Issue assigned to Connector Operations' : 'Source added to the review queue'); setSelected(null); }} onAction={() => { if (!selected) return; if (selected.issue) { setSourceHealth((health) => ({ ...health, [selected.name]: { quality: 96, issue: undefined } })); toast.success(`${selected.issue} completed — source is healthy`); setSelected(null); return; } navigate(`/crm/campaigns?source=${encodeURIComponent(selected.name)}`); }} />
      <WorkflowDialog open={createOpen} onOpenChange={setCreateOpen} title="Add source" description="Register a new demand source so CRM can track its leads and RFQs." submitLabel="Add source" onSubmit={() => {
        if (!sourceName.trim()) { toast.error('Enter a source name'); return; }
        setCustomSources((rows) => [{ name: sourceName.trim(), channel: sourceType, tags: [sourceType], leads: 0, rfqs: 0, campaigns: 0, quality: 100 }, ...rows]);
        setSourceName(''); setCreateOpen(false); toast.success('Source added');
      }}>
        <FormField label="Source name"><Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Example: LinkedIn Ads Vietnam" autoFocus /></FormField>
        <FormField label="Primary source type"><Select value={sourceType} onValueChange={setSourceType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Marketplace', 'Social', 'B2B', 'Direct', 'Nurture', 'Ads', 'Partner'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></FormField>
        <FormField label="Tracking note" helper="This note helps the CRM team understand how the source will be used."><Textarea placeholder="Campaign, market, owner, or expected audience…" /></FormField>
      </WorkflowDialog>
    </JourneyPage>
  );
}

export function PrimeCrmCampaignsSimplePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const snapshot = getPrimeSnapshot();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [campaigns, setCampaigns] = useState(() => snapshot.campaigns);
  const [createOpen, setCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignChannel, setCampaignChannel] = useState('Social');
  const [campaignAudience, setCampaignAudience] = useState('Returning customers');
  const [selected, setSelected] = useState<(typeof campaigns)[number] | null>(null);
  const filtered = campaigns.filter((campaign) => (status === 'all' || campaign.status === status) && `${campaign.name} ${campaign.channel} ${campaign.targetSegment}`.toLowerCase().includes(query.toLowerCase()));
  const active = campaigns.filter((campaign) => campaign.status === 'active').length;
  const testing = campaigns.filter((campaign) => campaign.status === 'testing').length;
  useEffect(() => {
    const source = searchParams.get('source');
    if (!source) return;
    setCampaignName(`${source} activation`);
    setCampaignChannel(/social|instagram|tiktok/i.test(source) ? 'Social' : 'Marketplace');
    setCreateOpen(true);
  }, [searchParams]);

  return (
    <JourneyPage title="Campaigns" description="Plan campaigns and see which ones are ready, active, or waiting for a decision." primaryLabel="Create campaign" onPrimaryAction={() => setCreateOpen(true)} metrics={[
      { label: 'Active campaigns', value: active, helper: 'Campaigns currently generating demand.', tone: 'success' },
      { label: 'Needs review', value: testing, helper: 'Testing campaigns waiting for a decision.', tone: testing ? 'warning' : 'success' },
      { label: 'Revenue attributed', value: money.format(snapshot.campaigns.reduce((sum, item) => sum + item.revenue, 0)), helper: 'Revenue linked to campaign activity.' },
    ]}>
      <WorkToolbar query={query} onQueryChange={setQuery} placeholder="Search campaign, channel or audience…">
        {['all', 'active', 'testing', 'paused'].map((item) => <FilterButton key={item} active={status === item} onClick={() => setStatus(item)}>{item === 'all' ? 'All' : item}</FilterButton>)}
      </WorkToolbar>
      <Card className="overflow-hidden rounded-xl shadow-none"><Table><TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Audience</TableHead><TableHead>Leads</TableHead><TableHead>Revenue</TableHead><TableHead className="text-right">Next action</TableHead></TableRow></TableHeader><TableBody>{filtered.map((campaign) => <TableRow key={campaign.id} className="cursor-pointer" onClick={() => setSelected(campaign)}><TableCell className="font-semibold">{campaign.name}<div className="mt-1 text-xs font-normal text-muted-foreground">SKU {campaign.skuCode}</div></TableCell><TableCell>{campaign.channel}</TableCell><TableCell><Badge variant={statusTone(campaign.status)}>{campaign.status}</Badge></TableCell><TableCell>{campaign.targetSegment}</TableCell><TableCell>{campaign.leads}</TableCell><TableCell>{money.format(campaign.revenue)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">{campaign.status === 'testing' ? 'Review campaign' : 'View campaign'} <ArrowRight className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></Card>
      <DetailSheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title={selected?.name ?? ''} description="Decide whether to approve, pause, or continue this campaign using delivery and commercial context." fields={[{ label: 'Status and owner', value: `${selected?.status ?? '—'} · Growth Operations` }, { label: 'Audience and channel', value: `${selected?.targetSegment ?? '—'} · ${selected?.channel ?? '—'}` }, { label: 'Funnel performance', value: `${selected?.traffic ?? 0} visits → ${selected?.leads ?? 0} leads → ${selected?.orders ?? 0} orders` }, { label: 'Conversion rate', value: `${selected?.leads ? Math.round(((selected?.orders ?? 0) / selected.leads) * 100) : 0}% lead to order` }, { label: 'Budget / revenue / ROAS', value: `${money.format(selected?.spend ?? 0)} / ${money.format(selected?.revenue ?? 0)} / ${(selected?.spend ?? 0) ? ((selected?.revenue ?? 0) / (selected?.spend ?? 1)).toFixed(1) : '0'}x` }, { label: 'Review deadline', value: 'Today, 18:00' }]} checklist={['Audience and offer are defined', 'Budget owner has reviewed spend', 'Tracking and suppression rules are enabled']} nextStep={selected?.status === 'testing' ? 'Approval activates the campaign. New responses will appear in Leads & RFQs for qualification.' : 'Continue monitoring responses in Leads & RFQs; pause if quality or spend falls outside the agreed threshold.'} secondaryLabel="Open generated leads" onSecondary={() => navigate('/crm/leads-rfqs')} actionLabel={selected?.status === 'testing' ? 'Approve and activate' : selected?.status === 'active' ? 'Pause campaign' : 'Resume campaign'} onAction={() => {
        if (!selected) return;
        const nextStatus = selected.status === 'testing' ? 'active' : selected.status === 'active' ? 'paused' : 'active';
        setCampaigns((rows) => rows.map((row) => row.id === selected.id ? { ...row, status: nextStatus } : row));
        toast.success(nextStatus === 'active' ? 'Campaign is now active' : 'Campaign paused'); setSelected(null);
      }} />
      <WorkflowDialog open={createOpen} onOpenChange={setCreateOpen} title="Create campaign" description="Create a campaign draft with the minimum information needed for review." submitLabel="Create draft" onSubmit={() => {
        if (!campaignName.trim()) { toast.error('Enter a campaign name'); return; }
        const base = campaigns[0];
        setCampaigns((rows) => [{ ...base, id: `campaign_local_${Date.now()}`, name: campaignName.trim(), channel: campaignChannel, targetSegment: campaignAudience, status: 'testing', traffic: 0, leads: 0, rfqs: 0, orders: 0, spend: 0, revenue: 0 }, ...rows]);
        setCampaignName(''); setCreateOpen(false); toast.success('Campaign draft created — review it before activation');
      }}>
        <FormField label="Campaign name"><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Example: Q4 replenishment campaign" autoFocus /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Channel"><Select value={campaignChannel} onValueChange={setCampaignChannel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Social', 'Email', 'Marketplace', 'Partner'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Audience"><Input value={campaignAudience} onChange={(event) => setCampaignAudience(event.target.value)} /></FormField></div>
        <FormField label="Campaign objective"><Textarea placeholder="Describe the intended customer outcome and offer…" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Budget"><Input type="number" placeholder="5000" /></FormField><FormField label="Review owner"><Select defaultValue="growth"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="growth">Growth Operations</SelectItem><SelectItem value="sales">Sales Lead</SelectItem><SelectItem value="manager">CRM Manager</SelectItem></SelectContent></Select></FormField></div>
        <FormField label="Success criteria" helper="Used to tell the reviewer when to scale, pause, or revise."><Input placeholder="Example: 40 qualified leads at CPA ≤ $25" /></FormField>
      </WorkflowDialog>
    </JourneyPage>
  );
}

export function PrimeCrmLeadsSimplePage() {
  const navigate = useNavigate();
  const snapshot = getPrimeSnapshot();
  const [query, setQuery] = useState('');
  const [leadRows, setLeadRows] = useState(() => snapshot.leads);
  const [rfqRows, setRfqRows] = useState(() => snapshot.rfqs);
  const [createOpen, setCreateOpen] = useState(false);
  const [leadContact, setLeadContact] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadSource, setLeadSource] = useState('Manual');
  const [selectedLead, setSelectedLead] = useState<(typeof leadRows)[number] | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<(typeof rfqRows)[number] | null>(null);
  const leads = leadRows.filter((lead) => `${lead.contact} ${lead.company} ${lead.source}`.toLowerCase().includes(query.toLowerCase()));
  const overdue = leadRows.filter((lead) => lead.status === 'new').length;

  return (
    <JourneyPage title="Contact Leads" description="Manage potential customers from Page, Web, and social conversations who have not purchased yet." primaryLabel="Add lead" onPrimaryAction={() => setCreateOpen(true)} metrics={[
      { label: 'Needs action', value: leadRows.filter((lead) => lead.status !== 'converted').length, helper: 'Open leads waiting for sales work.', tone: 'warning' },
      { label: 'Qualified', value: leadRows.filter((lead) => lead.status === 'qualified').length, helper: 'Leads ready for direct follow-up.', tone: 'success' },
      { label: 'New / unassigned', value: overdue, helper: 'New intent that still needs an owner.' },
    ]}>
      <WorkToolbar query={query} onQueryChange={setQuery} placeholder="Search customer, company or source…" />
      <Tabs defaultValue="leads" className="space-y-3">
        <TabsList><TabsTrigger value="leads">Leads ({leadRows.length})</TabsTrigger><TabsTrigger value="rfqs">RFQs ({rfqRows.length})</TabsTrigger></TabsList>
        <TabsContent value="leads"><Card className="overflow-hidden rounded-xl shadow-none"><Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Source</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Last activity</TableHead><TableHead className="text-right">Next action</TableHead></TableRow></TableHeader><TableBody>{leads.map((lead) => <TableRow key={lead.id} className="cursor-pointer" onClick={() => setSelectedLead(lead)}><TableCell className="font-semibold">{lead.contact}<div className="mt-1 text-xs font-normal text-muted-foreground">{lead.company}</div></TableCell><TableCell>{lead.source}</TableCell><TableCell><Badge variant={lead.score >= 85 ? 'warning' : 'outline'}>{lead.score >= 85 ? 'High' : 'Normal'}</Badge></TableCell><TableCell><Badge variant={statusTone(lead.status)}>{lead.status.replace('_', ' ')}</Badge></TableCell><TableCell>{lead.lastTouch}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">{lead.status === 'rfq_sent' ? 'Review RFQ' : 'Assign follow-up'} <ArrowRight className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>
        <TabsContent value="rfqs"><Card className="overflow-hidden rounded-xl shadow-none"><Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Quantity</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Next action</TableHead></TableRow></TableHeader><TableBody>{rfqRows.map((rfq) => <TableRow key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRfq(rfq)}><TableCell className="font-semibold">{rfq.requestedBy}<div className="mt-1 text-xs font-normal text-muted-foreground">{rfq.id}</div></TableCell><TableCell>{rfq.quantity}</TableCell><TableCell>{money.format(rfq.value)}</TableCell><TableCell><Badge variant={statusTone(rfq.status)}>{rfq.status}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">{rfq.status === 'draft' ? 'Prepare quotation' : 'Review quotation'} <ArrowRight className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>
      </Tabs>
      <DetailSheet open={Boolean(selectedLead)} onOpenChange={(open) => !open && setSelectedLead(null)} title={selectedLead?.contact ?? ''} description="Qualify the lead, understand intent, and assign a concrete sales action." fields={[{ label: 'Contact', value: `${selectedLead?.email || 'No email'} · ${selectedLead?.company ?? '—'}` }, { label: 'Source and campaign', value: `${selectedLead?.source ?? '—'} · ${selectedLead?.campaignId ?? 'No campaign'}` }, { label: 'Intent signal', value: selectedLead?.lastTouch }, { label: 'Lead score and status', value: `${selectedLead?.score ?? 0}/100 · ${selectedLead?.status.replace('_', ' ') ?? '—'}` }, { label: 'Suggested owner', value: 'B2B Sales · Japan market' }, { label: 'Response SLA', value: selectedLead?.score && selectedLead.score >= 85 ? 'High priority · contact within 2 hours' : 'Standard · contact within 1 business day' }]} checklist={['Contact details are usable', 'Need, product and timing are understood', 'Owner and follow-up deadline are assigned']} nextStep="The owner contacts the lead and records the outcome. If price or quantity is requested, create an RFQ; if accepted, convert the record into a customer profile." secondaryLabel="Open customer profile" onSecondary={() => navigate('/crm/customers')} actionLabel={selectedLead?.status === 'new' ? 'Qualify and assign follow-up' : 'Update follow-up task'} onAction={() => { if (!selectedLead) return; setLeadRows((rows) => rows.map((row) => row.id === selectedLead.id ? { ...row, status: 'qualified', lastTouch: 'Follow-up due tomorrow · assigned to B2B Sales' } : row)); toast.success('Owner and follow-up deadline assigned'); setSelectedLead(null); }} />
      <DetailSheet open={Boolean(selectedRfq)} onOpenChange={(open) => !open && setSelectedRfq(null)} title={selectedRfq?.requestedBy ?? ''} description="Verify commercial requirements before sending a quotation or converting the opportunity." fields={[{ label: 'RFQ and linked lead', value: `${selectedRfq?.id ?? '—'} · ${selectedRfq?.leadId ?? '—'}` }, { label: 'Requested quantity', value: selectedRfq?.quantity }, { label: 'Estimated value', value: money.format(selectedRfq?.value ?? 0) }, { label: 'Commercial status', value: selectedRfq?.status }, { label: 'Quotation owner', value: 'B2B Sales · due tomorrow' }, { label: 'Fulfillment check', value: 'Inventory confirmation required before sending' }]} checklist={['Quantity and SKU are confirmed', 'Price, tax and payment terms are complete', 'Inventory and delivery promise are verified']} nextStep={selectedRfq?.status === 'draft' ? 'Create and send the quotation, then wait for the buyer decision.' : 'When the buyer accepts, convert the RFQ and open the unified customer profile for ongoing care.'} secondaryLabel="Return to lead" onSecondary={() => setSelectedRfq(null)} actionLabel={selectedRfq?.status === 'draft' ? 'Prepare and send quotation' : 'Convert to customer'} onAction={() => { if (!selectedRfq) return; const next = selectedRfq.status === 'draft' ? 'quoted' : 'converted'; setRfqRows((rows) => rows.map((row) => row.id === selectedRfq.id ? { ...row, status: next } : row)); toast.success(next === 'quoted' ? 'Quotation prepared and sent' : 'RFQ converted — customer profile is ready'); setSelectedRfq(null); if (next === 'converted') navigate('/crm/customers'); }} />
      <WorkflowDialog open={createOpen} onOpenChange={setCreateOpen} title="Add lead" description="Capture the minimum customer context needed for qualification." submitLabel="Add lead" onSubmit={() => {
        if (!leadContact.trim() || !leadCompany.trim()) { toast.error('Enter the contact and company'); return; }
        const base = leadRows[0];
        setLeadRows((rows) => [{ ...base, id: `lead_local_${Date.now()}`, contact: leadContact.trim(), company: leadCompany.trim(), email: '', source: leadSource, status: 'new', score: 60, lastTouch: 'Lead added manually' }, ...rows]);
        setLeadContact(''); setLeadCompany(''); setCreateOpen(false); toast.success('Lead added');
      }}>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Contact name"><Input value={leadContact} onChange={(event) => setLeadContact(event.target.value)} autoFocus /></FormField><FormField label="Company"><Input value={leadCompany} onChange={(event) => setLeadCompany(event.target.value)} /></FormField></div>
        <FormField label="Source"><Select value={leadSource} onValueChange={setLeadSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Manual', 'Marketplace', 'Social', 'Campaign', 'Partner'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></FormField>
        <FormField label="Customer need"><Textarea placeholder="Product interest, quantity, timing, or question…" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Priority"><Select defaultValue="normal"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></FormField><FormField label="Assign owner"><Select defaultValue="unassigned"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem><SelectItem value="b2b">B2B Sales</SelectItem><SelectItem value="inside">Inside Sales</SelectItem></SelectContent></Select></FormField></div>
      </WorkflowDialog>
    </JourneyPage>
  );
}

const customerSources: ChannelSource[] = ['primeweb', 'pos', 'shopee', 'social'];

export function PrimeCrmCustomersSimplePage({ mode = 'directory' }: { mode?: 'directory' | 'segments' }) {
  const navigate = useNavigate();
  const snapshot = getPrimeSnapshot();
  const [query, setQuery] = useState('');
  const [lifecycle, setLifecycle] = useState('all');
  const [channel, setChannel] = useState<ChannelSource>('all');
  const [customerRows, setCustomerRows] = useState(() => snapshot.customers);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selected, setSelected] = useState<(typeof customerRows)[number] | null>(null);
  const customersWithSource = customerRows.map((customer, index) => ({ ...customer, source: customerSources[index % customerSources.length] }));
  const customers = customersWithSource.filter((customer) => (lifecycle === 'all' || customer.lifecycle === lifecycle) && (channel === 'all' || customer.source === channel) && `${customer.name} ${customer.company} ${customer.email}`.toLowerCase().includes(query.toLowerCase()));
  const atRisk = customerRows.filter((customer) => customer.lifecycle === 'at-risk').length;
  const channelCounts = {
    all: customersWithSource.length,
    primeweb: customersWithSource.filter((customer) => customer.source === 'primeweb').length,
    pos: customersWithSource.filter((customer) => customer.source === 'pos').length,
    shopee: customersWithSource.filter((customer) => customer.source === 'shopee').length,
    social: customersWithSource.filter((customer) => customer.source === 'social').length,
  };
  const segmentCounts = customerRows.reduce<Record<string, number>>((counts, customer) => ({ ...counts, [customer.segment]: (counts[customer.segment] ?? 0) + 1 }), {});

  if (mode === 'segments') {
    return (
      <JourneyPage title="Segments & Tags" description="Classify VIP, wholesale, retail, and lifecycle audiences across every connected channel." primaryLabel="Create segment" onPrimaryAction={() => toast.success('Segment builder opened')} metrics={[
        { label: 'Total profiles', value: customerRows.length, helper: 'Profiles available for segmentation.' },
        { label: 'Segments', value: Object.keys(segmentCounts).length, helper: 'Reusable customer audiences.', tone: 'success' },
        { label: 'At risk', value: atRisk, helper: 'Profiles needing a recovery tag.', tone: atRisk ? 'warning' : 'success' },
      ]}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(segmentCounts).map(([segment, count]) => <Card key={segment} className="rounded-xl shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><UsersRound className="size-5" /></span><Badge variant="secondary">{count} customers</Badge></div><h2 className="mt-4 font-semibold">{segment}</h2><p className="mt-1 text-sm text-muted-foreground">Unified tag available to Orders, Promotions, PrimeWeb, and POS.</p><Button variant="outline" className="mt-4 w-full">Manage segment <ArrowRight className="size-4" /></Button></CardContent></Card>)}
        </div>
      </JourneyPage>
    );
  }

  return (
    <JourneyPage title="Customer Directory" description="Find customers who purchased from any connected channel and open their unified 360° profile." primaryLabel="Add customer" onPrimaryAction={() => setCreateOpen(true)} metrics={[
      { label: 'Total customers', value: customerRows.length, helper: 'Unified customer profiles.' },
      { label: 'Active customers', value: customerRows.filter((customer) => ['active', 'retention'].includes(customer.lifecycle)).length, helper: 'Customers with an active relationship.', tone: 'success' },
      { label: 'At risk', value: atRisk, helper: 'Customers who may need attention.', tone: atRisk ? 'warning' : 'success' },
    ]}>
      <ChannelSourceFilter value={channel} onChange={setChannel} counts={channelCounts} />
      <WorkToolbar query={query} onQueryChange={setQuery} placeholder="Search customer, company or email…">
        {['all', 'active', 'lead', 'at-risk', 'retention'].map((item) => <FilterButton key={item} active={lifecycle === item} onClick={() => setLifecycle(item)}>{item === 'all' ? 'All' : item}</FilterButton>)}
      </WorkToolbar>
      <Card className="overflow-hidden rounded-xl shadow-none"><Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Source</TableHead><TableHead>Segment</TableHead><TableHead>Lifecycle</TableHead><TableHead>Orders</TableHead><TableHead>Revenue</TableHead><TableHead>Last activity</TableHead><TableHead className="text-right">Next action</TableHead></TableRow></TableHeader><TableBody>{customers.map((customer) => <TableRow key={customer.id} className="cursor-pointer" onClick={() => setSelected(customer)}><TableCell className="font-semibold">{customer.name}<div className="mt-1 text-xs font-normal text-muted-foreground">{customer.company}</div></TableCell><TableCell className="capitalize">{customer.source === 'social' ? 'Social Chat' : customer.source === 'pos' ? 'POS Tân Bình' : customer.source}</TableCell><TableCell>{customer.segment}</TableCell><TableCell><Badge variant={statusTone(customer.lifecycle)}>{customer.lifecycle}</Badge></TableCell><TableCell>{customer.totalOrders}</TableCell><TableCell>{money.format(customer.totalRevenue)}</TableCell><TableCell className="max-w-[260px] truncate">{customer.timeline.at(-1) ?? 'No activity'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">Open profile <ArrowRight className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></Card>
      <DetailSheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title={selected?.name ?? ''} description="Use one profile to understand the relationship and coordinate the next customer action." fields={[{ label: 'Identity and contact', value: `${selected?.company ?? '—'} · ${selected?.email ?? 'No email'}` }, { label: 'Lifecycle and segment', value: `${selected?.lifecycle ?? '—'} · ${selected?.segment ?? '—'}` }, { label: 'Commercial value', value: `${selected?.totalOrders ?? 0} orders · ${money.format(selected?.totalRevenue ?? 0)}` }, { label: 'Last order', value: selected?.lastOrderId ?? 'No completed order' }, { label: 'Latest activity', value: selected?.timeline.at(-1) ?? 'No activity recorded' }, { label: 'Open context', value: `${selected?.notes.length ?? 0} notes · Support and Sales share this profile` }, { label: 'Suggested next action', value: selected?.lifecycle === 'at-risk' ? 'Resolve friction and prepare a recovery plan' : 'Schedule a relationship follow-up' }]} checklist={['Profile identity and consent are valid', 'Open sales and support activity has been reviewed', 'Follow-up has a clear owner and due date']} nextStep={selected?.lifecycle === 'at-risk' ? 'A recovery task is assigned first. After open support issues are resolved, the customer becomes eligible for a controlled re-engagement plan.' : 'The task appears in the shared work queue. Record the outcome so lifecycle and future recommendations stay current.'} secondaryLabel={selected?.lifecycle === 'at-risk' ? 'Build re-engagement plan' : 'View re-engagement audiences'} onSecondary={() => navigate('/crm/re-engage')} actionLabel={selected?.lifecycle === 'at-risk' ? 'Create recovery task' : 'Create follow-up task'} onAction={() => { if (!selected) return; setCustomerRows((rows) => rows.map((row) => row.id === selected.id ? { ...row, timeline: [...row.timeline, selected.lifecycle === 'at-risk' ? 'Recovery task · Owner: Customer Success · Due tomorrow' : 'Follow-up · Owner: Account Manager · Due in 3 days'] } : row)); toast.success(selected.lifecycle === 'at-risk' ? 'Recovery task assigned to Customer Success' : 'Follow-up assigned to Account Manager'); setSelected(null); }} />
      <WorkflowDialog open={createOpen} onOpenChange={setCreateOpen} title="Add customer" description="Create a customer profile that Sales and Support can share." submitLabel="Add customer" onSubmit={() => {
        if (!customerName.trim() || !customerCompany.trim()) { toast.error('Enter the customer and company'); return; }
        const base = customerRows[0];
        setCustomerRows((rows) => [{ ...base, id: `customer_local_${Date.now()}`, name: customerName.trim(), company: customerCompany.trim(), email: customerEmail.trim(), lifecycle: 'lead', totalOrders: 0, totalRevenue: 0, lastOrderId: null, b2bAccount: '', notes: ['Customer added manually'], timeline: ['Customer profile created'] }, ...rows]);
        setCustomerName(''); setCustomerCompany(''); setCustomerEmail(''); setCreateOpen(false); toast.success('Customer added');
      }}>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Customer name"><Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoFocus /></FormField><FormField label="Company"><Input value={customerCompany} onChange={(event) => setCustomerCompany(event.target.value)} /></FormField></div>
        <FormField label="Email"><Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="customer@company.com" /></FormField>
        <FormField label="Initial note"><Textarea placeholder="Customer need, relationship context, or preferred follow-up…" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Lifecycle"><Select defaultValue="lead"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lead">Lead</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="retention">Retention</SelectItem></SelectContent></Select></FormField><FormField label="Relationship owner"><Select defaultValue="account"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="account">Account Manager</SelectItem><SelectItem value="success">Customer Success</SelectItem></SelectContent></Select></FormField></div>
      </WorkflowDialog>
    </JourneyPage>
  );
}

export function PrimeCrmReengagementSimplePage() {
  const snapshot = getPrimeSnapshot();
  const [query, setQuery] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planChannel, setPlanChannel] = useState('Email');
  const [planAudience, setPlanAudience] = useState('');
  const [plans, setPlans] = useState<Array<{ id: string; name: string; audience: string; channel: string; status: 'Draft' | 'Approved' | 'Scheduled' }>>([]);
  const [selected, setSelected] = useState<null | { id: string; name: string; reason: string; customers: number; channel: string; status: string }>(null);
  const audiences = useMemo(() => [
    { id: 'at-risk', name: 'At-risk customers', reason: 'Customers showing inactivity or service friction.', customers: snapshot.customers.filter((item) => item.lifecycle === 'at-risk').length, channel: 'Email + LINE', status: 'Needs review' },
    { id: 'lead-follow-up', name: 'Unconverted leads', reason: 'Qualified intent without a completed order.', customers: snapshot.leads.filter((item) => item.status !== 'converted').length, channel: 'Sales follow-up', status: 'Ready' },
    { id: 'repeat', name: 'Repeat purchase opportunity', reason: 'Active customers with previous order history.', customers: snapshot.customers.filter((item) => item.totalOrders > 1).length, channel: 'Email', status: 'Draft' },
  ], [snapshot.customers, snapshot.leads]);
  const filtered = audiences.filter((item) => `${item.name} ${item.reason} ${item.channel}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <JourneyPage title="Re-engagement" description="Choose the right audience, prepare a safe follow-up plan, and avoid contacting customers who should be suppressed." primaryLabel="Create plan" onPrimaryAction={() => { setPlanAudience(''); setPlanOpen(true); }} metrics={[
      { label: 'Eligible customers', value: audiences.reduce((sum, item) => sum + item.customers, 0), helper: 'Customers currently eligible for review.' },
      { label: 'Plans ready', value: audiences.filter((item) => item.status === 'Ready').length, helper: 'Audiences with enough context to act.', tone: 'success' },
      { label: 'Needs approval', value: audiences.filter((item) => item.status === 'Needs review').length, helper: 'Plans requiring a human decision.', tone: 'warning' },
    ]}>
      <WorkToolbar query={query} onQueryChange={setQuery} placeholder="Search audience, reason or channel…" />
      <Tabs defaultValue="audiences" className="space-y-3">
        <TabsList><TabsTrigger value="audiences">Audiences</TabsTrigger><TabsTrigger value="plans">Plans</TabsTrigger><TabsTrigger value="results">Results</TabsTrigger></TabsList>
        <TabsContent value="audiences"><div className="grid gap-3 lg:grid-cols-3">{filtered.map((audience) => <Card key={audience.id} className="rounded-xl shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Target className="size-5" /></span><Badge variant={audience.status === 'Ready' ? 'success' : audience.status === 'Needs review' ? 'warning' : 'secondary'}>{audience.status}</Badge></div><h3 className="mt-4 font-semibold">{audience.name}</h3><p className="mt-2 min-h-10 text-sm text-muted-foreground">{audience.reason}</p><div className="mt-4 flex items-center justify-between border-t pt-3 text-sm"><span>{audience.customers} customers</span><span className="text-muted-foreground">{audience.channel}</span></div><Button variant="outline" className="mt-4 w-full" onClick={() => setSelected(audience)}>Review audience <ArrowRight className="size-4" /></Button></CardContent></Card>)}</div></TabsContent>
        <TabsContent value="plans">{plans.length ? <Card className="overflow-hidden rounded-xl shadow-none"><Table><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Audience</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Next step</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{plans.map((plan) => <TableRow key={plan.id}><TableCell className="font-semibold">{plan.name}</TableCell><TableCell>{plan.audience}</TableCell><TableCell>{plan.channel}</TableCell><TableCell><Badge variant={plan.status === 'Draft' ? 'secondary' : 'success'}>{plan.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{plan.status === 'Draft' ? 'Human approval' : plan.status === 'Approved' ? 'Choose send time' : 'Monitor delivery'}</TableCell><TableCell className="text-right">{plan.status === 'Draft' ? <Button size="sm" variant="outline" onClick={() => { setPlans((rows) => rows.map((row) => row.id === plan.id ? { ...row, status: 'Approved' } : row)); toast.success('Plan approved — it is ready to schedule'); }}>Approve plan</Button> : plan.status === 'Approved' ? <Button size="sm" variant="outline" onClick={() => { setPlans((rows) => rows.map((row) => row.id === plan.id ? { ...row, status: 'Scheduled' } : row)); toast.success('Plan scheduled for the next business window'); }}>Schedule plan</Button> : <Badge variant="outline">Scheduled</Badge>}</TableCell></TableRow>)}</TableBody></Table></Card> : <Card className="rounded-xl border-dashed shadow-none"><CardContent className="flex flex-col items-center px-6 py-12 text-center"><RefreshCcw className="size-8 text-muted-foreground" /><h3 className="mt-3 font-semibold">No plans running yet</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Review an eligible audience, choose a channel, apply suppression rules, then submit the plan for approval.</p></CardContent></Card>}</TabsContent>
        <TabsContent value="results"><Card className="overflow-hidden rounded-xl shadow-none"><Table><TableHeader><TableRow><TableHead>Completed plan</TableHead><TableHead>Delivered</TableHead><TableHead>Replies</TableHead><TableHead>Recovered</TableHead><TableHead>Revenue</TableHead><TableHead>Suppressed</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-semibold">Dormant customer recovery · July</TableCell><TableCell>124 / 130</TableCell><TableCell>21</TableCell><TableCell>8</TableCell><TableCell>{money.format(12840)}</TableCell><TableCell>6</TableCell></TableRow></TableBody></Table><CardContent className="border-t p-4 text-sm text-muted-foreground"><Megaphone className="mr-2 inline size-4" />Use results to refine the audience and offer before creating the next plan.</CardContent></Card></TabsContent>
      </Tabs>
      <DetailSheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title={selected?.name ?? ''} description="Confirm eligibility, exclusions, channel and expected outcome before creating a plan." fields={[{ label: 'Audience reason', value: selected?.reason }, { label: 'Eligible after suppression', value: `${selected?.customers ?? 0} customers` }, { label: 'Suggested channel and owner', value: `${selected?.channel ?? '—'} · CRM Manager` }, { label: 'Suppression rules', value: 'Exclude opted-out, converted, recently contacted, and open support cases' }, { label: 'Contact frequency', value: 'Maximum 2 contacts in 14 days' }, { label: 'Success measurement', value: 'Replies, recovered customers, orders and revenue' }, { label: 'Approval requirement', value: 'Human approval required before scheduling' }]} checklist={['Audience contains eligible customers', 'Consent and suppression rules pass', 'Message, offer, owner and success metric are defined']} nextStep="Save a draft, request human approval, schedule the approved plan, then review delivery, responses, conversions and exclusions in Results." actionDisabled={(selected?.customers ?? 0) === 0} actionLabel={(selected?.customers ?? 0) === 0 ? 'No eligible customers' : 'Create re-engagement plan'} onAction={() => { if (!selected) return; setPlanAudience(selected.name); setPlanChannel(selected.channel.split(' + ')[0]); setPlanName(`${selected.name} follow-up`); setSelected(null); setPlanOpen(true); }} />
      <WorkflowDialog open={planOpen} onOpenChange={setPlanOpen} title="Create re-engagement plan" description="Define the audience, channel, and safety rules before requesting approval." submitLabel="Save draft" onSubmit={() => {
        if (!planName.trim() || !planAudience.trim()) { toast.error('Enter a plan name and audience'); return; }
        setPlans((rows) => [{ id: `plan_${Date.now()}`, name: planName.trim(), audience: planAudience.trim(), channel: planChannel, status: 'Draft' }, ...rows]);
        setPlanOpen(false); setPlanName(''); toast.success('Re-engagement draft saved');
      }}>
        <FormField label="Plan name"><Input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Example: At-risk customer recovery" autoFocus /></FormField>
        <FormField label="Audience"><Input value={planAudience} onChange={(event) => setPlanAudience(event.target.value)} placeholder="Choose or describe an eligible audience" /></FormField>
        <FormField label="Channel"><Select value={planChannel} onValueChange={setPlanChannel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Email', 'LINE', 'Sales follow-up', 'SMS'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></FormField>
        <FormField label="Message and offer"><Textarea placeholder="Describe the follow-up message, offer, and timing…" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Plan owner"><Select defaultValue="crm"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="crm">CRM Manager</SelectItem><SelectItem value="success">Customer Success</SelectItem></SelectContent></Select></FormField><FormField label="Send window"><Select defaultValue="business"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="business">Business hours</SelectItem><SelectItem value="morning">Next morning</SelectItem><SelectItem value="manual">Schedule later</SelectItem></SelectContent></Select></FormField></div>
        <FormField label="Success criteria"><Input placeholder="Example: 10 replies or 5 recovered customers" /></FormField>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Suppression is enabled by default: converted customers and customers with open service cases are excluded.</div>
      </WorkflowDialog>
    </JourneyPage>
  );
}
