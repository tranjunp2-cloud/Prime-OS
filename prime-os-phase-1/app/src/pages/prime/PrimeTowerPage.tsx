import {
  ArrowRight,
  BellRing,
  Bot,
  ClipboardList,
  Gauge,
  HeartHandshake,
  Megaphone,
  RadioTower,
  ScanSearch,
  Target,
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

const demandTowerIds: PrimeTowerId[] = ['acquisition', 'campaign', 'content-social', 'lead-capture', 'retargeting'];
const intelligenceTowerIds: PrimeTowerId[] = ['analytics', 'attribution', 'forecasting', 'ai-operator', 'voc', 'alerts'];

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

function DemandPanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const primaryCampaign = snapshot.campaigns[0];
  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalLeads = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
  const totalRfqs = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.rfqs, 0);

  const titleByTower: Record<string, string> = {
    acquisition: 'Acquisition source board',
    campaign: 'Campaign operating board',
    'content-social': 'Content and social proof board',
    'lead-capture': 'Lead capture queue',
    retargeting: 'Retargeting rule board',
  };

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
          <CardTitle>{titleByTower[towerId]}</CardTitle>
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
                <TableHead className="text-right">Revenue proof</TableHead>
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

      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Lead to RFQ handoff</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Next system</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.leads.slice(0, 7).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.contact}</TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell className={statusTone(lead.status)}>{lead.status.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right">{lead.score}</TableCell>
                    <TableCell>CRM Compact / RFQ</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>{towerId === 'retargeting' ? 'Retargeting guardrails' : 'Demand to COS linkage'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {snapshot.forecasts.slice(0, 4).map((forecast) => (
              <div key={forecast.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{forecast.skuCode}</span>
                  <Badge variant="outline" className={statusTone(forecast.risk)}>{forecast.risk} risk</Badge>
                </div>
                <Progress value={forecast.ats ? Math.min(100, Math.round((forecast.demand7d / Math.max(forecast.ats, 1)) * 100)) : 100} className="mt-2 h-2" />
                <p className="mt-2 text-muted-foreground">{forecast.suggestedAction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
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

function IntelligencePanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();

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
          <CardTitle>{towerId === 'attribution' ? 'Attribution chain' : 'Analytics operating view'}</CardTitle>
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
        <TowerFloorMap floors={config.floors} />

        {demandTowerIds.includes(towerId) ? <DemandPanel towerId={towerId} /> : null}
        {towerId === 'crm-compact' || towerId === 'service' ? <CustomerPanel towerId={towerId} /> : null}
        {intelligenceTowerIds.includes(towerId) ? <IntelligencePanel towerId={towerId} /> : null}
      </div>
    </div>
  );
}
