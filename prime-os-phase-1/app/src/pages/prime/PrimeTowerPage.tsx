import {
  ArrowRight,
  BellRing,
  Bot,
  ClipboardList,
  CircleUserRound,
  CircleDollarSign,
  Gauge,
  HeartHandshake,
  Megaphone,
  Mail,
  MessageCircle,
  Phone,
  PanelsTopLeft,
  RadioTower,
  ScanSearch,
  Target,
  TrendingUp,
  UserRoundCheck,
  } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import {
  PRIME_TOWER_CONFIGS,
  getPrimeSnapshot,
  getSkuLabel,
  type PrimeActivationPlay,
  type PrimeInsightModel,
  type PrimeSocialStream,
  type PrimeTowerId,
} from '@/lib/prime/prime-data';

interface PrimeTowerPageProps {
  towerId: PrimeTowerId;
}

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const demandTowerIds: PrimeTowerId[] = ['campaign-ops', 'content-creator-ops', 'lead-response-capture', 'retargeting-outreach'];
const intelligenceTowerIds: PrimeTowerId[] = ['creators', 'customers', 'campaigns', 'analytics', 'attribution', 'forecasting', 'ai-operator', 'voc', 'alerts'];
const financeTowerIds: PrimeTowerId[] = ['capital', 'lending', 'risk'];

function statusTone(status: string) {
  if (['active', 'qualified', 'converted', 'resolved', 'positive', 'low'].includes(status)) return 'text-emerald-600 dark:text-emerald-300';
  if (['high', 'open', 'negative'].includes(status)) return 'text-rose-600 dark:text-rose-300';
  return 'text-amber-600 dark:text-amber-300';
}

function streamTone(status: PrimeSocialStream['status']) {
  if (status === 'healthy') return 'text-emerald-600 dark:text-emerald-300';
  if (status === 'lagging') return 'text-rose-600 dark:text-rose-300';
  return 'text-amber-600 dark:text-amber-300';
}

function activationBadgeTone(lift: number) {
  if (lift >= 16) return 'default';
  if (lift >= 12) return 'secondary';
  return 'outline';
}

function SocialDataPipeline({ streams }: { streams: PrimeSocialStream[] }) {
  return (
    <Card className="rounded-lg border">
      <CardHeader>
        <CardTitle>Big Data ingestion lane</CardTitle>
      </CardHeader>
      <CardContent>
        <Table variant="embedded">
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Events / day</TableHead>
              <TableHead className="text-right">Freshness</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((stream) => (
              <TableRow key={stream.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{stream.source}</span>
                    <span className="text-xs text-muted-foreground">{stream.audienceSignal}</span>
                  </div>
                </TableCell>
                <TableCell className="uppercase text-xs tracking-wide text-muted-foreground">{stream.ingestionMode}</TableCell>
                <TableCell className="text-right">{stream.eventVolume.toLocaleString()}</TableCell>
                <TableCell className="text-right">{stream.freshnessMinutes}m</TableCell>
                <TableCell className={streamTone(stream.status)}>{stream.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ModelInsightBoard({ models }: { models: PrimeInsightModel[] }) {
  return (
    <Card className="rounded-lg border">
      <CardHeader>
        <CardTitle>ML / DL insight models</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {models.map((model) => (
          <div key={model.id} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{model.name}</span>
              <Badge variant="outline">{model.confidence}% confidence</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{model.objective}</p>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">Input:</span> {model.inputSignal}
              </div>
              <div>
                <span className="font-medium text-foreground">Output:</span> {model.outputSignal}
              </div>
            </div>
            <p className="mt-2 text-xs text-primary">Retrain: {model.retrainCadence}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivationBoard({ plays }: { plays: PrimeActivationPlay[] }) {
  return (
    <Card className="rounded-lg border">
      <CardHeader>
        <CardTitle>Recommended activation plays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plays.map((play) => (
          <div key={play.id} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{play.audience}</span>
              <Badge variant={activationBadgeTone(play.projectedLift)}>+{play.projectedLift}% projected lift</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Trigger: {play.trigger}</p>
            <p className="mt-2 text-sm text-primary">{play.nextBestAction}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {play.channelMix.map((channel) => (
                <Badge key={`${play.id}-${channel}`} variant="outline">{channel}</Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function channelTone(channel: string) {
  if (channel.includes('TikTok')) return 'default';
  if (channel.includes('Email')) return 'secondary';
  return 'outline';
}

function hasChannel(channels: readonly string[], channel: string) {
  return channels.some((item) => item === channel);
}

function TowerFloorMap({ floors }: { floors: string[] }) {
  return (
    <Card className="rounded-lg border">
      <CardHeader>
        <CardTitle>Floors in this tower</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {floors.map((floor) => (
          <div key={floor} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            {floor}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StrategicNarrativeBanner({ towerId }: { towerId: PrimeTowerId }) {
  const areaNarratives: Record<string, { label: string; detail: string }> = {
    creators: {
      label: 'Narrative role',
      detail: 'Intelligence helps a brand understand market opportunity before resources are committed into execution.',
    },
    customers: {
      label: 'Narrative role',
      detail: 'Customer intelligence makes the market visible at user and segment level, not only at company level.',
    },
    campaigns: {
      label: 'Narrative role',
      detail: 'Campaign planning converts insight into an executable go-to-market play instead of stopping at analysis.',
    },
    'campaign-ops': {
      label: 'Narrative role',
      detail: 'Demand is where PrimeOS actively brings traffic and response into the system, not just monitors it.',
    },
    'content-creator-ops': {
      label: 'Narrative role',
      detail: 'Demand execution includes creators and content as managed operating flows tied to products and outcomes.',
    },
    'lead-response-capture': {
      label: 'Narrative role',
      detail: 'This is where attention becomes identifiable response, qualified lead, and commercial intent.',
    },
    'retargeting-outreach': {
      label: 'Narrative role',
      detail: 'PrimeOS does not stop after acquisition; it keeps outbound follow-up and recovery inside the same loop.',
    },
    'crm-compact': {
      label: 'Narrative role',
      detail: 'Customer memory is retained after the transaction so the next sale is smarter than the previous one.',
    },
    service: {
      label: 'Narrative role',
      detail: 'Service and issue recovery are part of growth quality because trust and repeat purchase depend on them.',
    },
    capital: {
      label: 'Narrative role',
      detail: 'Finance turns operating proof into capital readiness, showing how PrimeOS can support larger strategic expansion.',
    },
    lending: {
      label: 'Narrative role',
      detail: 'This area frames how CR could connect manufacturers and SMBs to financial partners using platform signals.',
    },
    risk: {
      label: 'Narrative role',
      detail: 'Risk and trust make finance explainable by tying lending confidence back to inventory, service, and transaction health.',
    },
  };

  const narrative = areaNarratives[towerId];

  if (!narrative) return null;

  return (
    <Card className="rounded-lg border border-primary/20 bg-primary/5">
      <CardContent className="p-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{narrative.label}</span>
          <span className="text-muted-foreground">{narrative.detail}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DemandPanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const primaryCampaign = snapshot.campaigns[0];
  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalLeads = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
  const totalRfqs = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.rfqs, 0);

  if (towerId === 'campaign-ops') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Active campaigns" value={snapshot.campaigns.length} meta="Execution view across live GTM programs." icon={<Megaphone className="size-5" />} tone="info" />
          <SummaryMetricCard label="Traffic live" value={totalTraffic.toLocaleString()} meta="Current channel deployment across active campaigns." icon={<RadioTower className="size-5" />} tone="success" />
          <SummaryMetricCard label="Budget in market" value={currency.format(snapshot.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0))} meta="Allocated spend already pushed into campaign execution." icon={<Target className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Primary SKU" value={primaryCampaign?.skuCode || 'COS SKU'} meta="Campaign ops stays anchored to real product and SKU context." icon={<ClipboardList className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Campaign calendar and launch status</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Channel deployment</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Launch status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.campaigns.map((campaign, index) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{['Acquire traffic', 'Drive RFQ', 'Launch creator push', 'Reactivate buyers'][index] || 'Market activation'}</TableCell>
                    <TableCell>{campaign.channel}</TableCell>
                    <TableCell>{['Growth', 'Performance', 'Creator Ops', 'CRM Ops'][index] || 'Demand Ops'}</TableCell>
                    <TableCell className={statusTone(campaign.status)}>{campaign.status}</TableCell>
                    <TableCell className="text-right">{currency.format(campaign.spend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Asset readiness and timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.campaigns.map((campaign, index) => (
                <div key={`asset-${campaign.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{campaign.name}</span>
                    <Badge variant="outline">{['Brief approved', 'Asset in review', 'Ready to launch', 'Monitoring live'][index] || 'In progress'}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Timeline owner: {['Growth lead', 'Performance lead', 'Creator manager', 'CRM manager'][index] || 'Demand ops'}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Execution handoff into COS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {snapshot.campaigns.slice(0, 4).map((campaign) => (
                <div key={`handoff-${campaign.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">{campaign.skuCode}</p>
                  <p className="mt-2 text-muted-foreground">Campaign is live against COS product, listing, and order context.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (towerId === 'content-creator-ops') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Creator briefs" value={snapshot.campaigns.length} meta="Execution queue for creators, posts, and livestream tasks." icon={<MessageCircle className="size-5" />} tone="info" />
          <SummaryMetricCard label="Publishing queue" value={snapshot.socialStreams.length} meta="Content tasks scheduled across social and marketplace surfaces." icon={<RadioTower className="size-5" />} tone="success" />
          <SummaryMetricCard label="Assets pending" value="6" meta="Creative and post approvals still in creator ops workflow." icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Livestream slots" value="3" meta="Reserved activation windows for creator-led launches." icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Creator booking and post plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Brief</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Post plan</TableHead>
                  <TableHead>Asset approval</TableHead>
                  <TableHead>Publishing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.campaigns.map((campaign, index) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{['Linh Dao', 'Minh Chau', 'Ha An', 'Quynh My'][index] || `Creator ${index + 1}`}</TableCell>
                    <TableCell>{campaign.skuCode} brief</TableCell>
                    <TableCell>{['Booked', 'Pending contract', 'Booked', 'In review'][index] || 'Booked'}</TableCell>
                    <TableCell>{['2 posts + 1 live', '1 case study post', '1 live bundle push', 'Email-assisted social post'][index] || 'Scheduled'}</TableCell>
                    <TableCell>{['Approved', 'Awaiting edits', 'Approved', 'Queued'][index] || 'Approved'}</TableCell>
                    <TableCell>{['Queued', 'Drafting', 'Scheduled', 'Scheduled'][index] || 'Queued'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (towerId === 'lead-response-capture') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Inbound leads" value={totalLeads} meta="All market responses captured from active GTM motions." icon={<UserRoundCheck className="size-5" />} tone="info" />
          <SummaryMetricCard label="Open RFQs" value={totalRfqs} meta="High-intent responses waiting for quote or follow-up." icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Response channels" value="4" meta="Form, message, RFQ, and campaign replies are routed from one queue." icon={<Mail className="size-5" />} tone="success" />
          <SummaryMetricCard label="CRM handoffs" value={snapshot.customers.length} meta="Qualified responses are handed into CRM Compact with entity context." icon={<HeartHandshake className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Lead and response intake queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Next system</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.leads.slice(0, 8).map((lead, index) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.contact}</TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell className={statusTone(lead.status)}>{lead.status.replace('_', ' ')}</TableCell>
                    <TableCell>{['BDR', 'Sales Ops', 'CRM Ops', 'Growth'][index % 4]}</TableCell>
                    <TableCell>CRM Compact / RFQ</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (towerId === 'retargeting-outreach') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Retarget pools" value="6" meta="Audience sets ready for remarketing and recall." icon={<Target className="size-5" />} tone="info" />
          <SummaryMetricCard label="Outreach sequences" value="4" meta="Active follow-up plays across owned and paid channels." icon={<Mail className="size-5" />} tone="success" />
          <SummaryMetricCard label="Promo pushes" value="3" meta="Offer pushes scheduled for recovery and reactivation." icon={<Megaphone className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Suppression rules" value="5" meta="Guardrails prevent duplicate or conflicting follow-up." icon={<BellRing className="size-5" />} tone="purple" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Retargeting and outreach execution</CardTitle>
            </CardHeader>
            <CardContent>
              <Table variant="embedded">
                <TableHeader>
                  <TableRow>
                    <TableHead>Audience / flow</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Offer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.activationPlays.slice(0, 4).map((play, index) => (
                    <TableRow key={play.id}>
                      <TableCell className="font-medium">{play.audience}</TableCell>
                      <TableCell>{play.channelMix.join(', ')}</TableCell>
                      <TableCell>{['Bundle offer', 'Reminder follow-up', 'WhatsApp outreach', 'Promo refresh'][index] || 'Recovery push'}</TableCell>
                      <TableCell>{['Active', 'Queued', 'Active', 'Review'][index] || 'Active'}</TableCell>
                      <TableCell>{['Suppress converted users', '7-day cooldown', 'One-touch per channel', 'Hold after RFQ'][index] || 'Default guardrail'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Follow-up guardrails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                'Do not resend paid retargeting to customers already routed into RFQ.',
                'Pause WhatsApp outreach after live sales ownership is assigned.',
                'Suppress promo pushes when fulfillment or service cases remain open.',
                'Use CRM handoff before sending a second manual follow-up.',
              ].map((rule) => (
                <div key={rule} className="rounded-lg border bg-muted/20 p-3">{rule}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Traffic" value={totalTraffic.toLocaleString()} meta="Campaign traffic linked to product catalog." icon={<RadioTower className="size-5" />} tone="info" />
        <SummaryMetricCard label="Leads" value={totalLeads} meta="Lead records hand off to CRM Compact." icon={<UserRoundCheck className="size-5" />} tone="success" />
        <SummaryMetricCard label="RFQs" value={totalRfqs} meta="Assisted commerce demand signal." icon={<ClipboardList className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Primary SKU" value={primaryCampaign?.skuCode || 'COS SKU'} meta="Demand is anchored to COS Product Master." icon={<Target className="size-5" />} tone="teal" />
      </div>

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>Demand execution board</CardTitle>
        </CardHeader>
        <CardContent>
          <Table variant="embedded">
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Traffic</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">RFQs</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{campaign.name}</span>
                      <span className="text-xs text-muted-foreground">{campaign.targetSegment}</span>
                    </div>
                  </TableCell>
                  <TableCell>{campaign.channel}</TableCell>
                  <TableCell>{campaign.skuCode}</TableCell>
                  <TableCell className="text-right">{campaign.traffic.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.leads}</TableCell>
                  <TableCell className="text-right">{campaign.rfqs}</TableCell>
                  <TableCell className="text-right">{currency.format(campaign.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerPanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();

  if (towerId === 'service') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Service cases" value={snapshot.tickets.length} meta="Linked to order or RMA context." icon={<ClipboardList className="size-5" />} tone="info" />
          <SummaryMetricCard label="Open issues" value={snapshot.metrics.openIssues} meta="Cases feeding CRM timeline." icon={<BellRing className="size-5" />} tone={snapshot.metrics.openIssues > 0 ? 'warning' : 'success'} />
          <SummaryMetricCard label="Returns" value={snapshot.returnsCount} meta="Reused COS Returns data." icon={<HeartHandshake className="size-5" />} tone="teal" />
          <SummaryMetricCard label="SLA source" value="Policy" meta="Routes to COS Policy & Rule floor." icon={<Gauge className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Service ticket / case / RMA / SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Linked entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell>{ticket.linkedEntity}</TableCell>
                    <TableCell className={statusTone(ticket.status)}>{ticket.status.replace('_', ' ')}</TableCell>
                    <TableCell className={statusTone(ticket.priority)}>{ticket.priority}</TableCell>
                    <TableCell>{ticket.sla}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Compact profiles" value={snapshot.customers.length} meta="Built from orders, leads, returns." icon={<HeartHandshake className="size-5" />} tone="success" />
        <SummaryMetricCard label="Customer revenue" value={currency.format(snapshot.metrics.revenue)} meta="Reused OMS order totals." icon={<UserRoundCheck className="size-5" />} tone="info" className="md:col-span-2" />
        <SummaryMetricCard label="B2B extensions" value={snapshot.customers.filter((customer) => customer.b2bAccount).length} meta="Kept inside CRM Compact." icon={<ClipboardList className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>CRM Compact list</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>B2B account</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        <span className="text-xs text-muted-foreground">{customer.company}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.segment}</TableCell>
                    <TableCell className={statusTone(customer.lifecycle)}>{customer.lifecycle}</TableCell>
                    <TableCell>{customer.b2bAccount}</TableCell>
                    <TableCell className="text-right">{currency.format(customer.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Timeline, notes, follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.customers.slice(0, 3).map((customer) => (
              <div key={customer.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{customer.name}</span>
                  <Badge variant="outline">{customer.lifecycle}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {customer.timeline.slice(0, 3).map((item) => (
                    <p key={`${customer.id}-${item}`}>{item}</p>
                  ))}
                </div>
                <p className="mt-2 text-xs text-primary">{customer.notes[0]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinancePanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const totalRevenue = snapshot.metrics.revenue;
  const repeatRevenue = snapshot.customers.reduce((sum, customer) => sum + customer.totalRevenue, 0);
  const serviceRisk = snapshot.tickets.filter((ticket) => ticket.priority === 'high').length;
  const repaymentReadiness = snapshot.customers.length
    ? Math.min(96, 62 + snapshot.customers.filter((customer) => customer.totalOrders > 0).length * 4)
    : 0;

  if (towerId === 'capital') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Revenue proof" value={currency.format(totalRevenue)} meta="Live order and transaction context is the base input for capital readiness." icon={<CircleDollarSign className="size-5" />} tone="success" />
          <SummaryMetricCard label="RFQ pipeline" value={currency.format(snapshot.metrics.opportunityValue)} meta="Open commercial opportunity helps explain future working capital need." icon={<ClipboardList className="size-5" />} tone="info" />
          <SummaryMetricCard label="Repeat revenue" value={currency.format(repeatRevenue)} meta="Customer retention quality improves financing confidence." icon={<HeartHandshake className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Readiness score" value={`${repaymentReadiness}%`} meta="A simplified lender-facing summary built from operating proof." icon={<TrendingUp className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Capital readiness summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Signal</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead className="text-right">Current value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Revenue stability</TableCell>
                  <TableCell>Observed sales and order flow in PrimeOS</TableCell>
                  <TableCell className="text-right">{currency.format(totalRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Commercial pipeline</TableCell>
                  <TableCell>Qualified opportunity likely to convert into transaction</TableCell>
                  <TableCell className="text-right">{currency.format(snapshot.metrics.opportunityValue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Customer quality</TableCell>
                  <TableCell>Active customer base with repeat purchase context</TableCell>
                  <TableCell className="text-right">{snapshot.customers.length}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fulfillment proof</TableCell>
                  <TableCell>Execution confidence tied to shipment and service outcomes</TableCell>
                  <TableCell className="text-right">{snapshot.fulfillmentJobsCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (towerId === 'lending') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Potential partners" value="3" meta="Illustrates a future flow to bank, lender, or strategic finance partner." icon={<CircleDollarSign className="size-5" />} tone="info" />
          <SummaryMetricCard label="Merchants in scope" value={snapshot.customers.length} meta="Profiles that already have operating and transaction evidence in PrimeOS." icon={<HeartHandshake className="size-5" />} tone="success" />
          <SummaryMetricCard label="Application-ready cases" value={Math.min(snapshot.customers.length, 4)} meta="Shortlisted examples that can be routed into partner discussion." icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Signal completeness" value={`${Math.min(98, 58 + snapshot.orders.length * 6)}%`} meta="Shows how close the data is to a finance-grade application package." icon={<TrendingUp className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Lending and partner routing</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant / brand</TableHead>
                  <TableHead>Use case</TableHead>
                  <TableHead>Partner fit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.customers.slice(0, 4).map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.company}</TableCell>
                    <TableCell>{['Inventory expansion', 'Campaign financing', 'Cross-border launch', 'Working capital buffer'][index] || 'Growth financing'}</TableCell>
                    <TableCell>{['SMB bank', 'Lender', 'Strategic partner', 'Embedded finance'][index] || 'Finance partner'}</TableCell>
                    <TableCell className={statusTone(index === 1 ? 'open' : 'active')}>{index === 0 ? 'ready' : index === 1 ? 'review' : 'prepared'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="High-risk issues" value={serviceRisk} meta="Service and operational friction directly affect financial trust." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Inventory watch" value={snapshot.forecasts.filter((forecast) => forecast.risk !== 'low').length} meta="Stock pressure is a finance signal, not only an ops signal." icon={<Gauge className="size-5" />} tone="info" />
        <SummaryMetricCard label="Open alerts" value={snapshot.alerts.length} meta="Cross-area alerts act as explainable guardrails for capital decisions." icon={<ClipboardList className="size-5" />} tone="success" />
        <SummaryMetricCard label="Trust score" value={`${Math.max(38, 84 - serviceRisk * 8)}%`} meta="A simplified trust layer built from transaction, service, and fulfillment behavior." icon={<TrendingUp className="size-5" />} tone="purple" />
      </div>

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>Risk and trust explanation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            `Inventory pressure cases: ${snapshot.forecasts.filter((forecast) => forecast.risk !== 'low').length}`,
            `Open customer/service issues: ${snapshot.tickets.filter((ticket) => ticket.status !== 'resolved').length}`,
            `Fulfillment proof points: ${snapshot.fulfillmentJobsCount} jobs / ${snapshot.shipmentsCount} shipments`,
            `Repeat customer context: ${snapshot.customers.filter((customer) => customer.totalOrders > 0).length} profiles with order history`,
          ].map((line) => (
            <div key={line} className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">{line}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IntelligencePanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();

  if (towerId === 'creators') {
    const creatorProfiles = snapshot.campaigns.map((campaign, index) => {
      const stream = snapshot.socialStreams[index % snapshot.socialStreams.length];
      const play = snapshot.activationPlays[index % snapshot.activationPlays.length];
      const voc = snapshot.vocInsights[index % snapshot.vocInsights.length];
      const fitScore = Math.min(98, 71 + index * 6 + Math.round(play.projectedLift / 3));
      const engagementRate = (5.2 + index * 1.1).toFixed(1);

      return {
        id: campaign.id,
        name: ['Linh Dao', 'Minh Chau', 'Ha An', 'Quynh My'][index] || `Creator ${index + 1}`,
        handle: ['@linhdesk', '@minhmarkets', '@haan.live', '@quynhchoice'][index] || `@creator${index + 1}`,
        category: ['Office setup', 'SME buying', 'Lifestyle commerce', 'Value review'][index] || 'Commerce',
        avatarTone: ['from-fuchsia-500/20 to-violet-500/20', 'from-sky-500/20 to-cyan-500/20', 'from-amber-500/20 to-orange-500/20', 'from-emerald-500/20 to-teal-500/20'][index] || 'from-primary/20 to-primary/10',
        channel: campaign.channel,
        fitScore,
        engagementRate,
        revenue: campaign.revenue,
        product: campaign.skuCode,
        recommendation: play.nextBestAction,
        signal: stream?.source || 'Social listening',
        summary: voc?.summary || 'Audience response remains healthy for creator-led launches.',
      };
    });

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Tracked creators" value={creatorProfiles.length} meta="Ranking combines creator performance, social signal, and SKU fit." icon={<CircleUserRound className="size-5" />} tone="info" />
          <SummaryMetricCard label="Top fit score" value={`${Math.max(...creatorProfiles.map((creator) => creator.fitScore))}%`} meta="Best current creator-to-product alignment." icon={<TrendingUp className="size-5" />} tone="success" />
          <SummaryMetricCard label="KOL signals" value={snapshot.socialStreams.length} meta="TikTok, review, and partner feeds refresh creator confidence." icon={<ScanSearch className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Ready actions" value={snapshot.activationPlays.length} meta="Shortlist and launch suggestions are linked to products and campaigns." icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Creator ranking and product fit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {creatorProfiles.map((creator, index) => (
                <div key={creator.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${creator.avatarTone} text-sm font-semibold text-foreground`}>
                    {initials(creator.name)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">#{index + 1} {creator.name}</span>
                      <Badge variant="outline">{creator.handle}</Badge>
                      <Badge variant="outline">{creator.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Primary product: {creator.product} · Main channel: {creator.channel}</p>
                    <p className="text-sm text-primary">{creator.recommendation}</p>
                  </div>
                  <div className="grid gap-1 text-right text-sm">
                    <span className="font-medium">Fit {creator.fitScore}%</span>
                    <span className="text-muted-foreground">ER {creator.engagementRate}%</span>
                    <span className="text-muted-foreground">{currency.format(creator.revenue)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Creator insight and next action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {creatorProfiles.slice(0, 3).map((creator) => (
                <div key={`insight-${creator.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{creator.name}</span>
                    <Badge>{creator.fitScore}% fit</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Signal source: {creator.signal}</p>
                  <p className="mt-2 text-sm">{creator.summary}</p>
                  <p className="mt-2 text-xs text-primary">Action: bundle {creator.product} into the next creator brief and move to shortlist.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (towerId === 'customers') {
    const recommendedChannels = [
      ['TikTok', 'WhatsApp'],
      ['Facebook', 'Email'],
      ['Email', 'SMS'],
      ['WhatsApp', 'Phone'],
    ] as const;
    const customerIntelligence = snapshot.customers.map((customer, index) => {
      const campaign = snapshot.campaigns[index % snapshot.campaigns.length];
      const play = snapshot.activationPlays[index % snapshot.activationPlays.length];
      const channels = recommendedChannels[index % recommendedChannels.length];
      const potentialScore = Math.min(96, 68 + customer.totalOrders * 4 + index * 5);

      return {
        ...customer,
        potentialScore,
        recommendedProduct: campaign.skuCode,
        recommendedChannels: channels,
        nextBestAction: play.nextBestAction,
      };
    });

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Priority customers" value={customerIntelligence.length} meta="Scored by lifecycle, revenue, and campaign response context." icon={<HeartHandshake className="size-5" />} tone="info" />
          <SummaryMetricCard label="Best product matches" value={snapshot.campaigns.length} meta="Each segment is mapped to the strongest current product push." icon={<Target className="size-5" />} tone="success" />
          <SummaryMetricCard label="Reach channels" value="5" meta="TikTok, Facebook, email, phone, and WhatsApp are ranked per segment." icon={<MessageCircle className="size-5" />} tone="warning" />
          <SummaryMetricCard label="AI follow-ups" value={snapshot.activationPlays.length} meta="Outreach recommendations are ready to route into CRM or media actions." icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Customer list, potential, and product affinity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table variant="embedded">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Recommended product</TableHead>
                    <TableHead>Best channels</TableHead>
                    <TableHead className="text-right">Potential</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerIntelligence.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{customer.name}</span>
                          <span className="text-xs text-muted-foreground">{customer.company}</span>
                        </div>
                      </TableCell>
                      <TableCell>{customer.segment}</TableCell>
                      <TableCell>{customer.recommendedProduct}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.recommendedChannels.map((channel) => (
                            <Badge key={`${customer.id}-${channel}`} variant={channelTone(channel)}>{channel}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{customer.potentialScore}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Recommended outreach mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerIntelligence.slice(0, 4).map((customer) => (
                <div key={`outreach-${customer.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{customer.name}</span>
                    <Badge variant="outline">{customer.lifecycle}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Best product: {customer.recommendedProduct}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {hasChannel(customer.recommendedChannels, 'Email') ? <Badge variant="outline"><Mail className="mr-1 size-3" />Email</Badge> : null}
                    {hasChannel(customer.recommendedChannels, 'Phone') || hasChannel(customer.recommendedChannels, 'SMS') ? <Badge variant="outline"><Phone className="mr-1 size-3" />Phone / SMS</Badge> : null}
                    {hasChannel(customer.recommendedChannels, 'WhatsApp') ? <Badge variant="outline"><MessageCircle className="mr-1 size-3" />WhatsApp</Badge> : null}
                    {hasChannel(customer.recommendedChannels, 'TikTok') ? <Badge variant="outline">TikTok</Badge> : null}
                    {hasChannel(customer.recommendedChannels, 'Facebook') ? <Badge variant="outline">Facebook</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm text-primary">{customer.nextBestAction}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (towerId === 'campaigns') {
    const plannedCampaigns = snapshot.campaigns.map((campaign, index) => {
      const customer = snapshot.customers[index % snapshot.customers.length];
      const play = snapshot.activationPlays[index % snapshot.activationPlays.length];
      const alert = snapshot.alerts[index % snapshot.alerts.length];
      const creatorName = ['Linh Dao', 'Minh Chau', 'Ha An', 'Quynh My'][index] || `Creator ${index + 1}`;
      const budgetFocus = Math.round(campaign.spend / 1000);

      return {
        ...campaign,
        creatorName,
        audience: customer.segment,
        nextBestAction: play.nextBestAction,
        executionRisk: alert?.title || 'No major execution risk detected.',
        budgetFocus,
      };
    });

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Planned campaigns" value={plannedCampaigns.length} meta="Each plan links a product, audience, channel, and creator." icon={<PanelsTopLeft className="size-5" />} tone="info" />
          <SummaryMetricCard label="Forecast revenue" value={currency.format(plannedCampaigns.reduce((sum, campaign) => sum + campaign.revenue, 0))} meta="Projected GMV from current campaign recommendations." icon={<TrendingUp className="size-5" />} tone="success" className="md:col-span-2" />
          <SummaryMetricCard label="Active risks" value={snapshot.alerts.length} meta="Execution alerts stay attached to campaign planning." icon={<BellRing className="size-5" />} tone="warning" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Campaign planner</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Channel / creator</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plannedCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.skuCode}</TableCell>
                    <TableCell>{campaign.audience}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{campaign.channel}</span>
                        <span className="text-xs text-muted-foreground">{campaign.creatorName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{campaign.budgetFocus}k JPY</TableCell>
                    <TableCell className="text-sm text-primary">{campaign.nextBestAction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Channel mix and product mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plannedCampaigns.slice(0, 4).map((campaign) => (
                <div key={`mix-${campaign.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{campaign.skuCode}</span>
                    <Badge variant="outline">{campaign.channel}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Best audience: {campaign.audience}</p>
                  <p className="mt-2 text-sm text-primary">Creator lead: {campaign.creatorName}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Execution alerts and optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plannedCampaigns.slice(0, 4).map((campaign) => (
                <div key={`risk-${campaign.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{campaign.name}</span>
                    <Badge variant="outline">{campaign.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{campaign.executionRisk}</p>
                  <p className="mt-2 text-xs text-primary">Optimization: re-check budget pacing and keep the creator-product match intact before scaling.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (towerId === 'analytics') {
    const totalSocialSignals = snapshot.socialStreams.reduce((sum, stream) => sum + stream.eventVolume, 0);
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Social events" value={totalSocialSignals.toLocaleString()} meta="Daily signals from API, crawler, and partner feeds." icon={<RadioTower className="size-5" />} tone="info" />
          <SummaryMetricCard label="Behavior clusters" value={snapshot.insightModels.length} meta="Mock ML / DL models producing actionable segments." icon={<Bot className="size-5" />} tone="purple" />
          <SummaryMetricCard label="Activation plays" value={snapshot.activationPlays.length} meta="PrimeOS-ready recommendations for outreach and campaign actions." icon={<Megaphone className="size-5" />} tone="success" />
          <SummaryMetricCard label="Linked VOC" value={snapshot.vocInsights.length} meta="Signals linked back to product, customer, and campaign context." icon={<ScanSearch className="size-5" />} tone="warning" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SocialDataPipeline streams={snapshot.socialStreams} />
          <ModelInsightBoard models={snapshot.insightModels} />
        </div>

        <ActivationBoard plays={snapshot.activationPlays} />
      </div>
    );
  }

  if (towerId === 'attribution') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Tracked creator flows" value={snapshot.campaigns.length} meta="Campaigns tied to SKUs, RFQs, and orders." icon={<ArrowRight className="size-5" />} tone="info" />
          <SummaryMetricCard label="KOL signal sources" value={snapshot.socialStreams.filter((stream) => stream.source.toLowerCase().includes('tiktok') || stream.source.toLowerCase().includes('instagram')).length} meta="Streams that inform creator and livestream performance." icon={<RadioTower className="size-5" />} tone="success" />
          <SummaryMetricCard label="RFQ proof" value={snapshot.rfqs.length} meta="Attribution path extends beyond click to assisted commerce evidence." icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="ML-linked actions" value={snapshot.activationPlays.length} meta="Attribution feeds next-best-action, not only reporting." icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Attribution chain from social signal to conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Primary signal</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">RFQs</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead>PrimeOS recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.campaigns.map((campaign, index) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{campaign.name}</span>
                        <span className="text-xs text-muted-foreground">{campaign.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell>{snapshot.socialStreams[index % snapshot.socialStreams.length]?.source || 'Social stream'}</TableCell>
                    <TableCell className="text-right">{campaign.leads}</TableCell>
                    <TableCell className="text-right">{campaign.rfqs}</TableCell>
                    <TableCell className="text-right">{campaign.orders}</TableCell>
                    <TableCell className="text-sm text-primary">{snapshot.activationPlays[index % snapshot.activationPlays.length]?.nextBestAction || 'Review operator suggestion'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (towerId === 'forecasting') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryMetricCard label="Forecasted SKUs" value={snapshot.forecasts.length} meta="Derived from COS Product Master + Inventory." icon={<Gauge className="size-5" />} tone="info" />
          <SummaryMetricCard label="High risk" value={snapshot.forecasts.filter((forecast) => forecast.risk === 'high').length} meta="Inventory and demand pressure." icon={<BellRing className="size-5" />} tone="warning" />
          <SummaryMetricCard label="AI actions" value={snapshot.recommendations.length} meta="Recommendations grounded in real entity ids." icon={<Bot className="size-5" />} tone="purple" />
        </div>
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Forecast and optimization queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.forecasts.map((forecast) => (
              <div key={forecast.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[1fr_1fr_2fr] md:items-center">
                <div>
                  <p className="font-medium">{forecast.skuCode}</p>
                  <p className="text-xs text-muted-foreground">{getSkuLabel(forecast.skuId)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Demand {forecast.demand7d}</span>
                    <span>ATS {forecast.ats}</span>
                  </div>
                  <Progress value={forecast.ats ? Math.min(100, Math.round((forecast.demand7d / Math.max(forecast.ats, 1)) * 100)) : 100} className="h-2" />
                </div>
                <p className="text-sm text-muted-foreground">{forecast.suggestedAction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (towerId === 'voc') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Listening streams" value={snapshot.socialStreams.length} meta="Crawl/API feeds from social, review, and chat surfaces." icon={<ScanSearch className="size-5" />} tone="info" />
          <SummaryMetricCard label="Negative signals" value={snapshot.vocInsights.filter((insight) => insight.sentiment === 'negative').length} meta="Root-cause signals that can affect campaign or service flows." icon={<BellRing className="size-5" />} tone="warning" />
          <SummaryMetricCard label="KOL relevance" value={snapshot.activationPlays.filter((play) => play.trigger.toLowerCase().includes('livestream') || play.trigger.toLowerCase().includes('creator')).length} meta="Signals usable for creator and livestream planning." icon={<Megaphone className="size-5" />} tone="success" />
          <SummaryMetricCard label="Response lanes" value="Mail + Chat" meta="Insight can be activated through outreach, CRM, and media suppression." icon={<HeartHandshake className="size-5" />} tone="purple" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SocialDataPipeline streams={snapshot.socialStreams} />
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Social listening and VOC insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {snapshot.vocInsights.map((insight) => (
                <div key={insight.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{insight.source}</Badge>
                    <span className={statusTone(insight.sentiment)}>{insight.sentiment}</span>
                  </div>
                  <p className="mt-3 text-sm">{insight.summary}</p>
                  <p className="mt-2 text-xs text-primary">{insight.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (towerId === 'alerts') {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Automation and alert center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.alerts.map((alert) => (
              <div key={alert.id} className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{alert.area}</Badge>
                    <span className={statusTone(alert.severity)}>{alert.severity} severity</span>
                  </div>
                  <p className="mt-1 font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">Linked entity: {alert.linkedEntity}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/intelligence/ai-operator">Open recommendation</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <ActivationBoard plays={snapshot.activationPlays} />
      </div>
    );
  }

  if (towerId === 'ai-operator') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Context sources" value={snapshot.socialStreams.length + 4} meta="Social, campaign, OMS, CRM, inventory, and service are fused into one operator view." icon={<Bot className="size-5" />} tone="purple" />
          <SummaryMetricCard label="Decision queue" value={snapshot.recommendations.length} meta="Action cards generated from joined system context." icon={<ClipboardList className="size-5" />} tone="info" />
          <SummaryMetricCard label="Suggested activations" value={snapshot.activationPlays.length} meta="Marketing and retention actions ready for operator review." icon={<Megaphone className="size-5" />} tone="success" />
          <SummaryMetricCard label="Linked alerts" value={snapshot.alerts.length} meta="Execution risks routed back into operator context." icon={<BellRing className="size-5" />} tone="warning" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Live context reader</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                `COS products: ${snapshot.products.length}`,
                `OMS orders: ${snapshot.orders.length}`,
                `Inventory positions: ${snapshot.inventoryPositions.length}`,
                `Fulfillment jobs: ${snapshot.fulfillmentJobsCount}`,
                `Social streams: ${snapshot.socialStreams.length}`,
                `Insight models: ${snapshot.insightModels.length}`,
                `Campaigns and RFQs: ${snapshot.campaigns.length} / ${snapshot.rfqs.length}`,
              ].map((line) => (
                <div key={line} className="rounded-lg border bg-muted/20 p-3">{line}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Decision queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{recommendation.target}</span>
                    <Badge variant="outline">{recommendation.confidence}% confidence</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{recommendation.reasoning}</p>
                  <p className="mt-2 text-sm text-primary">{recommendation.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <ActivationBoard plays={snapshot.activationPlays} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Revenue context" value={currency.format(snapshot.metrics.revenue)} meta="From OMS." icon={<Megaphone className="size-5" />} tone="info" className="md:col-span-2" />
        <SummaryMetricCard label="Lead to order" value={`${snapshot.metrics.leadToOrderRate}%`} meta="Demand proof." icon={<ArrowRight className="size-5" />} tone="success" />
        <SummaryMetricCard label="Open alerts" value={snapshot.alerts.length} meta="Cross-area automation." icon={<BellRing className="size-5" />} tone="warning" />
      </div>

      <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Analytics operating view</CardTitle>
          </CardHeader>
        <CardContent>
          <Table variant="embedded">
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Product / SKU</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">RFQs</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.skuCode}</TableCell>
                  <TableCell className="text-right">{campaign.leads}</TableCell>
                  <TableCell className="text-right">{campaign.rfqs}</TableCell>
                  <TableCell className="text-right">{campaign.orders}</TableCell>
                  <TableCell className="text-right">{currency.format(campaign.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function PrimeTowerPage({ towerId }: PrimeTowerPageProps) {
  const config = PRIME_TOWER_CONFIGS[towerId];

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title={config.tower}
        description={config.promise}
        actions={(
          <>
            <Badge variant="outline">{config.area}</Badge>
            <Badge variant="outline">{config.reuseSource}</Badge>
          </>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <StrategicNarrativeBanner towerId={towerId} />
        <TowerFloorMap floors={config.floors} />

        {financeTowerIds.includes(towerId) ? <FinancePanel towerId={towerId} /> : null}
        {demandTowerIds.includes(towerId) ? <DemandPanel towerId={towerId} /> : null}
        {towerId === 'crm-compact' || towerId === 'service' ? <CustomerPanel towerId={towerId} /> : null}
        {intelligenceTowerIds.includes(towerId) ? <IntelligencePanel towerId={towerId} /> : null}
      </div>
    </div>
  );
}
