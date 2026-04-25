import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarCheck,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  CircleUserRound,
  Gauge,
  Globe,
  Heart,
  HeartHandshake,
  ImagePlus,
  Instagram,
  Loader2,
  Mail,
  Megaphone,
  MessageCircle,
  PackagePlus,
  PanelsTopLeft,
  PenLine,
  Phone,
  RadioTower,
  ScanSearch,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserRoundCheck,
  Upload,
  Youtube,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import {
  ActionSetupPanel,
  DecisionHeader,
  EvidenceStack,
  HandoffRail,
  LinkedEntityStrip,
  OperatingLoop,
  OutcomePreview,
  RegistryList,
  type EvidenceItem,
  type OperatingLoopStep,
  type RegistryItem,
} from '@/components/prime/PrimeOperatingSystem';
import {
  PRIME_TOWER_CONFIGS,
  getPrimeSnapshot,
  getSkuCodeValue,
  getSkuLabel,
  getSkuProductName,
  type PrimeActivationPlay,
  type PrimeInsightModel,
  type PrimeSnapshot,
  type PrimeSocialStream,
  type PrimeTowerId,
} from '@/lib/prime/prime-data';
import {
  fetchFinanceControlPlane,
  type CapitalOffersRecord,
  type CapitalReadinessRecord,
  type FinanceControlPlaneSnapshot,
  type RiskTrustRecord,
  type SettlementRepaymentRecord,
} from '@/lib/prime/finance-control-plane';
import {
  fetchIntelligenceControlPlane,
  type IntelligenceControlPlaneSnapshot,
  type IntelligenceCreatorRecord,
  type IntelligenceCustomerRecord,
  type IntelligenceLaunchDecisionRecord,
} from '@/lib/prime/intelligence-control-plane';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/product-images';
import {
  getIntelligenceAssets,
  removeIntelligenceAsset,
  type IntelligenceAsset,
  uploadIntelligenceAsset,
} from '@/lib/prime/intelligence-assets';

interface PrimeTowerPageProps {
  towerId: PrimeTowerId;
}

type CreatorProfile = {
  id: string;
  name: string;
  handle: string;
  category: string;
  avatarTone: string;
  channel: string;
  fitScore: number;
  engagementRate: number;
  revenue: number;
  product: string;
  recommendation: string;
  signal: string;
  summary: string;
  followers: number;
  avgViews: number;
  activeAudience: number;
  profileViews: number;
  reach: number;
  verified: boolean;
  country: string;
  genderSplit: { male: number; female: number };
  audienceSplit: Array<{ label: string; value: number; color: string }>;
  ageBuckets: Array<{ label: string; value: number }>;
  topCountries: Array<{ label: string; value: number }>;
  socialLinks: Array<{ label: string; handle: string; icon: 'instagram' | 'youtube' | 'web'; audience: string }>;
  topFollowerSegment: string;
  brandsMentioned: string[];
  lastPosted: string;
  matchedPosts: number;
  contentPreview: string[];
  authenticityScore: number;
  audienceQualityScore: number;
  benchmarkIndex: number;
};

type CustomerProfile = {
  id: string;
  name: string;
  company: string;
  lifecycle: string;
  segment: string;
  segmentLabel: string;
  momentum: string;
  totalRevenue: number;
  totalOrders: number;
  potentialScore: number;
  conversionLikelihood: number;
  churnRisk: number;
  revenueContribution: number;
  recommendedProduct: string;
  recommendedChannels: readonly string[];
  nextBestAction: string;
  reasoning: string;
  target: string;
  signalSummary: string;
  nextCategory: string;
};

type LaunchDecisionPlan = {
  id: string;
  name: string;
  skuCode: string;
  productLabel: string;
  creatorName: string;
  creatorHandle: string;
  creatorFit: number;
  customerName: string;
  customerCompany: string;
  customerSegment: string;
  customerLifecycle: string;
  customerFit: number;
  channel: string;
  channels: readonly string[];
  angle: string;
  budget: number;
  revenue: number;
  launchReadiness: number;
  outcomeScore: number;
  riskLevel: number;
  executionRisk: string;
  nextBestAction: string;
  narrative: string;
  whyItWins: string;
  offerHook: string;
  messageHook: string;
  optimization: string;
  timing: string;
};

const INTELLIGENCE_DECISIONS_HREF = '/intelligence/launch-decisions';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const demandTowerIds: PrimeTowerId[] = ['campaign-ops', 'content-creator-ops', 'lead-response-capture', 'retargeting-outreach'];
const intelligenceTowerIds: PrimeTowerId[] = ['creators', 'customers', 'campaigns', 'analytics', 'attribution', 'forecasting', 'ai-operator', 'voc', 'alerts'];
const financeTowerIds: PrimeTowerId[] = ['offers', 'risk', 'settlement'];

function getTowerConfidence(towerId: PrimeTowerId, snapshot: PrimeSnapshot) {
  if (demandTowerIds.includes(towerId)) {
    return Math.min(94, 62 + snapshot.campaigns.length * 5 + Math.round(snapshot.metrics.leadToOrderRate / 3));
  }

  if (intelligenceTowerIds.includes(towerId)) {
    return Math.min(95, 66 + snapshot.insightModels.length * 4 + snapshot.activationPlays.length * 3);
  }

  if (financeTowerIds.includes(towerId)) {
    return 76;
  }

  if (towerId === 'crm-compact' || towerId === 'service') {
    return Math.min(92, 68 + snapshot.customers.length * 2);
  }

  return 72;
}

function getTowerEvidence(towerId: PrimeTowerId, snapshot: PrimeSnapshot): EvidenceItem[] {
  if (demandTowerIds.includes(towerId)) {
    return [
      { label: 'Campaigns', value: snapshot.campaigns.length, detail: `${snapshot.leads.length} leads and ${snapshot.rfqs.length} RFQs attached.`, tone: 'info' },
      { label: 'Orders', value: snapshot.orders.length, detail: `${currency.format(snapshot.metrics.revenue)} revenue context from OMS.`, tone: 'success' },
      { label: 'Guardrail', value: `${snapshot.alerts.length} alerts`, detail: 'Demand actions must keep COS, finance, and customer controls visible.', tone: snapshot.alerts.length ? 'warning' : 'muted' },
    ];
  }

  if (intelligenceTowerIds.includes(towerId)) {
    return [
      { label: 'Signals', value: snapshot.socialStreams.length + snapshot.vocInsights.length, detail: 'Social, creator, VOC, and product signals are joined before action.', tone: 'purple' },
      { label: 'Models', value: snapshot.insightModels.length, detail: 'Mock ML/DL models explain what to activate next.', tone: 'info' },
      { label: 'Actions', value: snapshot.activationPlays.length, detail: 'Recommendations hand off into Demand, Customer, or COS.', tone: 'success' },
    ];
  }

  if (financeTowerIds.includes(towerId)) {
    return [
      { label: 'Revenue', value: currency.format(snapshot.metrics.revenue), detail: 'Finance reads operating reality from OMS.', tone: 'success' },
      { label: 'Risk', value: `${snapshot.forecasts.filter((forecast) => forecast.risk === 'high').length} blockers`, detail: 'Inventory and eligibility pressure stay visible before scale.', tone: 'warning' },
      { label: 'Customers', value: snapshot.customers.length, detail: 'CRM memory supports repayment and repeat health context.', tone: 'info' },
    ];
  }

  return [
    { label: 'Customers', value: snapshot.customers.length, detail: 'Customer memory anchors follow-up, repeat, and service context.', tone: 'info' },
    { label: 'Orders', value: snapshot.orders.length, detail: 'OMS order preview stays linked but not owned here.', tone: 'success' },
    { label: 'Service', value: snapshot.tickets.length, detail: 'Service context is previewed without absorbing the Service tower.', tone: 'warning' },
  ];
}

function getTowerLoop(towerId: PrimeTowerId, job: { handoffHref: string } | undefined, snapshot: PrimeSnapshot): OperatingLoopStep[] {
  if (demandTowerIds.includes(towerId)) {
    return [
      { label: 'Signal', title: 'Warm buyer or launch route appears', detail: `${snapshot.campaigns.length} campaign routes and ${snapshot.leads.length} leads are available.`, href: '/intelligence/launch-decisions', tone: 'purple' },
      { label: 'Decision', title: 'Choose message, CTA, and owner', detail: 'Demand works only after a clear route, audience, and guardrail exist.', tone: 'info' },
      { label: 'Handoff', title: 'Capture and CRM receive response', detail: 'RFQs, replies, and owner tasks should not disappear into marketing reporting.', href: job?.handoffHref || '/customer/crm-compact', tone: 'default' },
      { label: 'Outcome', title: 'OMS/CRM read back result', detail: `${snapshot.orders.length} orders and ${snapshot.customers.length} customer profiles close the loop.`, href: '/ecom/cos/oms', tone: 'success' },
    ];
  }

  if (intelligenceTowerIds.includes(towerId)) {
    return [
      { label: 'Signal', title: 'Signals are joined', detail: 'Creator, trend, VOC, SKU, campaign, and customer signals come together.', tone: 'purple' },
      { label: 'Decision', title: 'Recommend the next move', detail: 'The tower answers what to do now, not just what happened.', href: '/intelligence/launch-decisions', tone: 'info' },
      { label: 'Handoff', title: 'Send action to the owning tower', detail: 'Demand, COS, Finance, or Customer receives the next step.', href: job?.handoffHref || '/overview', tone: 'default' },
      { label: 'Outcome', title: 'Read execution back', detail: 'Orders, RFQs, and CRM outcomes return as evidence.', href: '/overview', tone: 'success' },
    ];
  }

  return [
    { label: 'Context', title: 'Read the operating record', detail: 'Use linked customer, finance, service, or commerce context.', tone: 'info' },
    { label: 'Decision', title: 'Pick the next accountable action', detail: 'Every screen should tell the operator what decision it supports.', tone: 'purple' },
    { label: 'Handoff', title: 'Move to the owner tower', detail: job?.handoffHref ? 'The next route is explicit.' : 'The handoff remains in this workspace.', href: job?.handoffHref, tone: 'default' },
    { label: 'Outcome', title: 'Preview result and risk', detail: 'Results are read views, not a parallel source of truth.', tone: 'success' },
  ];
}

function getTowerRegistryItems(towerId: PrimeTowerId, snapshot: PrimeSnapshot): RegistryItem[] {
  if (demandTowerIds.includes(towerId)) {
    return snapshot.campaigns.slice(0, 5).map((campaign) => ({
      id: campaign.id,
      label: 'Campaign',
      title: campaign.name,
      detail: `${getSkuLabel(campaign.skuCode)} · ${campaign.leads} leads · ${campaign.orders} orders`,
      meta: campaign.status,
      href: '/demand/campaign-ops',
      tone: 'info',
    }));
  }

  if (intelligenceTowerIds.includes(towerId)) {
    return snapshot.activationPlays.slice(0, 5).map((play) => ({
      id: play.id,
      label: 'Play',
      title: play.audience,
      detail: play.nextBestAction,
      meta: `+${play.projectedLift}%`,
      href: '/demand/campaign-ops',
      tone: 'purple',
    }));
  }

  return snapshot.customers.slice(0, 5).map((customer) => ({
    id: customer.id,
    label: 'Customer',
    title: customer.name,
    detail: `${customer.company} · ${customer.totalOrders} orders`,
    meta: customer.lifecycle,
    href: '/customer/crm-compact',
    tone: 'info',
  }));
}

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

function LinkedIntelligenceAssetCard({
  title,
  description,
  entityLabel,
  contextLabel,
  assets,
  isUploading,
  inputRef,
  onOpenPicker,
  onUpload,
  onRemove,
}: {
  title: string;
  description: string;
  entityLabel: string;
  contextLabel: string;
  assets: IntelligenceAsset[];
  isUploading: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onOpenPicker: () => void;
  onUpload: (files: FileList | null) => Promise<void>;
  onRemove: (assetId: string) => Promise<void>;
}) {
  return (
    <div className="mt-4 rounded-2xl border bg-muted/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <Badge variant="outline">{assets.length} linked</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="secondary" className="max-w-[260px] truncate px-3 py-1 text-xs font-medium text-muted-foreground">{entityLabel}</Badge>
        <Badge variant="secondary" className="max-w-[280px] truncate px-3 py-1 text-xs font-medium text-muted-foreground">{contextLabel}</Badge>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(event) => void onUpload(event.target.files)}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onOpenPicker} disabled={isUploading}>
          {isUploading ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Upload className="mr-1.5 size-4" />}
          Upload images
        </Button>
      </div>

      {assets.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {assets.slice(0, 3).map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-2xl border bg-background">
              <div className="relative">
                <img src={asset.url} alt={asset.filename} className="h-28 w-full object-cover" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 size-8"
                  onClick={() => void onRemove(asset.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="space-y-1 p-3">
                <div className="truncate text-sm font-medium">{asset.entityLabel}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{asset.contextLabel}</div>
                <div className="text-[11px] text-muted-foreground">{asset.filename} · {formatFileSize(asset.size)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed bg-background/60 p-4">
          <ImagePlus className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">No image inputs yet</div>
            <div className="text-xs text-muted-foreground">Attach JPG, PNG, WebP, or GIF files that help explain this recommendation.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedDecisionAssetLane({
  title,
  description,
  assets,
  emptyHref,
  emptyLabel,
}: {
  title: string;
  description: string;
  assets: IntelligenceAsset[];
  emptyHref: string;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <Badge variant="outline">{assets.length} images</Badge>
      </div>

      {assets.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {assets.slice(0, 3).map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-2xl border bg-muted/20">
              <img src={asset.url} alt={asset.filename} className="h-28 w-full object-cover" />
              <div className="space-y-1 p-3">
                <div className="truncate text-sm font-medium">{asset.entityLabel}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{asset.contextLabel}</div>
                <div className="text-[11px] text-muted-foreground">{asset.filename}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/10 p-4">
          <div className="text-sm font-medium">No linked visuals yet</div>
          <div className="mt-1 text-xs text-muted-foreground">This source has not uploaded any images into the decision flow yet.</div>
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <Link to={emptyHref}>{emptyLabel}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceMeter({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function EvidenceCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
    </div>
  );
}

function CreatorEvidenceBoard({
  creator,
  platformFilter,
  marketFilter,
}: {
  creator: CreatorProfile;
  platformFilter: string;
  marketFilter: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Prime evidence board</div>
          <div className="text-xs text-muted-foreground">Why this creator is surfacing as the strongest fit right now.</div>
        </div>
        <Badge variant="outline">{creator.fitScore}% confidence</Badge>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground">ER &gt; 5.0%</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground">Fit Score &gt; 80%</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{platformFilter === 'all' ? 'Multi-platform' : platformFilter}</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{marketFilter === 'all' ? 'Global market' : marketFilter}</Badge>
      </div>

      <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Prime readout</div>
        <div className="mt-2 text-sm font-medium">{creator.summary}</div>
        <div className="mt-1 text-xs text-muted-foreground">{creator.recommendation}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <EvidenceCard label="Audience overlap" value={creator.topFollowerSegment} meta={`${creator.country} · ${creator.channel}`} />
        <EvidenceCard label="Commerce proof" value={`${creator.matchedPosts} matched posts`} meta={`${(creator.avgViews / 1000).toFixed(0)}K avg views on recent content`} />
        <EvidenceCard label="Trust quality" value={`${creator.authenticityScore}% authenticity`} meta={`${creator.audienceQualityScore}% audience quality`} />
        <EvidenceCard label="Bench position" value={`Index ${creator.benchmarkIndex}`} meta={`${creator.engagementRate.toFixed(1)}% engagement vs platform benchmark`} />
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border bg-muted/10 p-4">
        <EvidenceMeter label="Product fit" value={creator.fitScore} hint={`${creator.product} is the strongest SKU match for this creator.`} />
        <EvidenceMeter label="Audience quality" value={creator.audienceQualityScore} hint="Follower mix and platform signal quality remain healthy." />
        <EvidenceMeter label="Conversion trust" value={Math.round((creator.authenticityScore + creator.audienceQualityScore) / 2)} hint="Prime prefers creators with proof-first credibility, not just reach." />
      </div>
    </div>
  );
}

function CustomerEvidenceBoard({
  customer,
  lifecycleFilter,
  channelFilter,
  activationReadiness,
}: {
  customer: CustomerProfile;
  lifecycleFilter: string;
  channelFilter: string;
  activationReadiness: number;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Prime evidence board</div>
          <div className="text-xs text-muted-foreground">Why this segment is moving up the priority stack now.</div>
        </div>
        <Badge variant="outline">{customer.potentialScore}% confidence</Badge>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{lifecycleFilter === 'all' ? 'Mixed lifecycle' : lifecycleFilter}</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{channelFilter === 'all' ? 'Multi-channel' : channelFilter}</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground">Readiness {activationReadiness}%</Badge>
        <Badge variant="secondary" className="max-w-[220px] truncate px-3 py-1 text-xs font-medium text-muted-foreground">{customer.segmentLabel}</Badge>
      </div>

      <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Prime readout</div>
        <div className="mt-2 text-sm font-medium">{customer.signalSummary}</div>
        <div className="mt-1 text-xs text-muted-foreground">{customer.reasoning}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <EvidenceCard label="Lifecycle window" value={customer.lifecycle} meta={`${customer.totalOrders} orders · ${customer.momentum}`} />
        <EvidenceCard label="Next category" value={customer.nextCategory} meta={`Lead SKU: ${customer.recommendedProduct}`} />
        <EvidenceCard label="Channel path" value={customer.recommendedChannels.join(' + ')} meta="Prime AI prefers sequencing, not a single-channel blast." />
        <EvidenceCard label="Revenue contribution" value={`${customer.revenueContribution}%`} meta={`${currency.format(customer.totalRevenue)} currently sits in this segment.`} />
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border bg-muted/10 p-4">
        <EvidenceMeter label="Potential score" value={customer.potentialScore} hint="Fit between lifecycle, product need, and response readiness." />
        <EvidenceMeter label="Conversion likelihood" value={customer.conversionLikelihood} hint="Expected chance of a positive action if this segment is activated next." />
        <EvidenceMeter label="Churn watch" value={customer.churnRisk} hint="Higher values mean Prime is seeing urgency or reactivation pressure." />
      </div>
    </div>
  );
}

function LaunchDecisionBoard({
  plan,
  channelFilter,
  readinessFilter,
  averageMatch,
  linkedCreatorAssets,
  linkedCustomerAssets,
}: {
  plan: LaunchDecisionPlan;
  channelFilter: string;
  readinessFilter: string;
  averageMatch: number;
  linkedCreatorAssets: IntelligenceAsset[];
  linkedCustomerAssets: IntelligenceAsset[];
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Decision thesis</div>
          <div className="text-xs text-muted-foreground">Why Prime believes this should be the next approved launch.</div>
        </div>
        <Badge variant="outline">{plan.outcomeScore}% match</Badge>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{channelFilter === 'all' ? 'Omni-channel mix' : channelFilter}</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{readinessFilter === 'all' ? 'Mixed readiness' : readinessFilter.replace('-', ' ')}</Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium text-muted-foreground">Avg match {averageMatch}%</Badge>
      </div>

      <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Prime readout</div>
        <div className="mt-2 text-sm font-medium">{plan.whyItWins}</div>
        <div className="mt-1 text-xs text-muted-foreground">{plan.nextBestAction}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <EvidenceCard label="Product" value={plan.productLabel} meta={`${plan.skuCode} · ${plan.offerHook}`} />
        <EvidenceCard label="Creator lead" value={plan.creatorName} meta={`${plan.creatorHandle} · fit ${plan.creatorFit}%`} />
        <EvidenceCard label="Customer target" value={plan.customerSegment} meta={`${plan.customerName} · fit ${plan.customerFit}%`} />
        <EvidenceCard label="Visual inputs" value={`${linkedCreatorAssets.length + linkedCustomerAssets.length} linked`} meta={`${linkedCreatorAssets.length} creator + ${linkedCustomerAssets.length} customer inputs`} />
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border bg-muted/10 p-4">
        <EvidenceMeter label="Creator fit" value={plan.creatorFit} hint="Measures whether the creator can carry this message credibly." />
        <EvidenceMeter label="Customer fit" value={plan.customerFit} hint="Measures intent, lifecycle timing, and product relevance." />
        <EvidenceMeter label="Launch readiness" value={plan.launchReadiness} hint={`Risk watch sits at ${plan.riskLevel}% while the system checks execution readiness.`} />
      </div>
    </div>
  );
}

function CreatorIntelligencePanel() {
  const snapshot = getPrimeSnapshot();
  const { toast } = useToast();
  const creatorProfiles = useMemo<CreatorProfile[]>(() => snapshot.campaigns.map((campaign, index) => {
    const stream = snapshot.socialStreams[index % snapshot.socialStreams.length];
    const play = snapshot.activationPlays[index % snapshot.activationPlays.length];
    const voc = snapshot.vocInsights[index % snapshot.vocInsights.length];
    const fitScore = Math.min(98, 71 + index * 6 + Math.round(play.projectedLift / 3));
    const engagementRate = Number((5.2 + index * 1.1).toFixed(1));
    const followers = 112800 - index * 16400;
    const avgViews = 351000 - index * 42000;
    const activeAudience = 82 - index * 4;
    const audienceSplit = [
      { label: 'Instagram', value: 46 - index * 2, color: 'bg-violet-400' },
      { label: 'TikTok', value: 29 + index * 2, color: 'bg-sky-400' },
      { label: 'YouTube', value: 17 + index, color: 'bg-rose-400' },
      { label: 'Facebook', value: Math.max(6, 8 - index), color: 'bg-amber-300' },
    ];
    const ageBuckets = [
      { label: '<18', value: Math.max(2.8, 6.3 - index * 0.4) },
      { label: '18-24', value: 37.3 - index * 1.8 },
      { label: '25-34', value: 36.2 + index * 1.2 },
      { label: '35-44', value: 15.3 + index * 0.5 },
      { label: '45-64', value: 4.9 + index * 0.3 },
      { label: '>64', value: 0.5 + index * 0.1 },
    ];
    const topCountries = [
      { label: 'Japan', value: 48 - index * 3 },
      { label: 'Vietnam', value: 18 + index * 2 },
      { label: 'Thailand', value: 12 + index },
      { label: 'Singapore', value: 8 + index },
      { label: 'United States', value: 5 + index },
    ];

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
      followers,
      avgViews,
      activeAudience,
      profileViews: 73000 - index * 6200,
      reach: 51800000 - index * 6400000,
      verified: index < 2,
      country: ['Japan', 'Vietnam', 'Thailand', 'Singapore'][index] || 'APAC',
      genderSplit: { male: 85 - index * 6, female: 15 + index * 6 },
      audienceSplit,
      ageBuckets,
      topCountries,
      socialLinks: [
        { label: 'Instagram', handle: creatorProfilesHandle(index, 'instagram'), icon: 'instagram', audience: `${(followers / 1000).toFixed(1)}K` },
        { label: 'YouTube', handle: creatorProfilesHandle(index, 'youtube'), icon: 'youtube', audience: `${Math.max(24, 60 - index * 7)}.2K` },
        { label: 'Website', handle: creatorProfilesHandle(index, 'web'), icon: 'web', audience: `${Math.max(9, 31 - index * 3)}.4K` },
      ],
      topFollowerSegment: ['Women 25-34', 'SME buyers 25-34', 'Lifestyle shoppers 18-24', 'Office teams 25-34'][index] || 'Commerce buyers',
      brandsMentioned: [['MUJI', 'Pentel'], ['Notion', 'Logitech'], ['Shopee', 'Anessa'], ['MUJI', 'Nitori']][index] || ['PrimeOS'],
      lastPosted: ['2d ago', '5h ago', '1d ago', '3d ago'][index] || 'Recently',
      matchedPosts: 5 - index,
      contentPreview: [
        `${campaign.targetSegment} desk setup reel`,
        `${campaign.name} product mention`,
        `${campaign.channel} short-form explainer`,
      ],
      authenticityScore: 91 - index * 4,
      audienceQualityScore: 88 - index * 3,
      benchmarkIndex: 72 + index * 7,
    };
  }), [snapshot]);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('instagram');
  const [marketFilter, setMarketFilter] = useState('all');
  const [sortBy, setSortBy] = useState('engagement');
  const [selectedCreatorId, setSelectedCreatorId] = useState(creatorProfiles[0]?.id ?? '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creatorAssets, setCreatorAssets] = useState<IntelligenceAsset[]>(() => getIntelligenceAssets('creators'));
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const creatorAssetInputRef = useRef<HTMLInputElement>(null);

  const filteredCreators = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const next = creatorProfiles.filter((creator) => {
      const matchesQuery = !normalizedQuery || [creator.name, creator.handle, creator.category, creator.summary, creator.country, creator.topFollowerSegment]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesPlatform = platformFilter === 'all' || creator.socialLinks.some((link) => link.label.toLowerCase() === platformFilter);
      const matchesMarket = marketFilter === 'all' || creator.country.toLowerCase() === marketFilter;
      return matchesQuery && matchesPlatform && matchesMarket;
    });

    next.sort((left, right) => {
      if (sortBy === 'reach') return right.reach - left.reach;
      if (sortBy === 'fit') return right.fitScore - left.fitScore;
      if (sortBy === 'views') return right.avgViews - left.avgViews;
      return right.engagementRate - left.engagementRate;
    });

    return next;
  }, [creatorProfiles, marketFilter, platformFilter, searchQuery, sortBy]);

  const selectedCreator = filteredCreators.find((creator) => creator.id === selectedCreatorId)
    ?? creatorProfiles.find((creator) => creator.id === selectedCreatorId)
    ?? filteredCreators[0]
    ?? creatorProfiles[0];
  const topFit = filteredCreators.length ? Math.max(...filteredCreators.map((creator) => creator.fitScore)) : 0;
  const totalReach = filteredCreators.reduce((sum, creator) => sum + creator.reach, 0);
  const averageEngagement = filteredCreators.length
    ? filteredCreators.reduce((sum, creator) => sum + creator.engagementRate, 0) / filteredCreators.length
    : 0;
  const shortlistCount = filteredCreators.filter((creator) => creator.fitScore >= 82).length;

  async function handleCreatorAssetUpload(files: FileList | null) {
    if (!files?.length || !selectedCreator) return;

    setIsUploadingAssets(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) {
        const asset = await uploadIntelligenceAsset({
          file,
          source: 'creators',
          entityId: selectedCreator.id,
          entityLabel: selectedCreator.name,
          contextLabel: `${selectedCreator.product} · ${selectedCreator.recommendation}`,
        });
        uploaded.push(asset);
      }

      setCreatorAssets(getIntelligenceAssets('creators'));
      toast({
        title: uploaded.length > 1 ? 'Creator images linked' : 'Creator image linked',
        description: `${uploaded.length} image is now ready inside Launch Decisions.`,
      });
    } catch (error) {
      toast({
        title: 'Creator image upload failed',
        description: error instanceof Error ? error.message : 'Could not upload the selected image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAssets(false);
      if (creatorAssetInputRef.current) {
        creatorAssetInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveCreatorAsset(assetId: string) {
    await removeIntelligenceAsset(assetId);
    setCreatorAssets(getIntelligenceAssets('creators'));
    toast({
      title: 'Creator image removed',
      description: 'The linked image has been removed from Launch Decisions.',
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Tracked creators" value={filteredCreators.length} meta="Search and filter down the active creator universe before you shortlist." icon={<CircleUserRound className="size-5" />} tone="info" />
          <SummaryMetricCard label="Top fit score" value={`${topFit}%`} meta="Highest creator-to-product affinity in the current shortlist." icon={<TrendingUp className="size-5" />} tone="success" />
          <SummaryMetricCard label="Audience reach" value={`${(totalReach / 1000000).toFixed(1)}M`} meta="Estimated combined reachable audience across active creator profiles." icon={<RadioTower className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Shortlist ready" value={shortlistCount} meta={`Avg ER ${averageEngagement.toFixed(1)}% across the current filtered set.`} icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>Creator search and discovery</CardTitle>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full gap-1.5 border">
                        <Bot className="size-3.5" />
                        View Shortlist ({shortlistCount})
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[400px] sm:max-w-[400px] overflow-y-auto">
                      <SheetHeader className="mb-6 mt-4">
                        <SheetTitle>Shortlist queue</SheetTitle>
                        <SheetDescription>Candidates ready for campaign ops execution.</SheetDescription>
                      </SheetHeader>
                      <div className="space-y-3">
                        {filteredCreators.map((creator, index) => (
                          <div key={`shortlist-${creator.id}`} className="rounded-lg border bg-muted/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">#{index + 1} {creator.name}</span>
                              <Badge>{creator.fitScore}% fit</Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{creator.handle} · {creator.category} · {creator.channel}</p>
                            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><TrendingUp className="size-3" />{creator.engagementRate.toFixed(1)}% ER</span>
                              <span>{(creator.reach / 1000000).toFixed(1)}M reach</span>
                              <span>{currency.format(creator.revenue)}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {creator.brandsMentioned.map((brand: string) => <Badge key={`${creator.id}-${brand}`} variant="outline">{brand}</Badge>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Apply query-first filters, review content style, then compare creators in a dense shortlist table.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1"><Sparkles className="size-3" /> Search-first workflow</Badge>
                <Badge variant="outline" className="gap-1"><SlidersHorizontal className="size-3" /> Intent + KPI comparison</Badge>
                <Badge variant="outline" className="gap-1"><CircleUserRound className="size-3" /> Drill-down profile modal</Badge>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 xl:grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr]">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Search query</div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" placeholder="Search creator, niche, audience, or vibe" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Platform</div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All platforms</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Market</div>
                <Select value={marketFilter} onValueChange={setMarketFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All markets</SelectItem>
                    <SelectItem value="japan">Japan</SelectItem>
                    <SelectItem value="vietnam">Vietnam</SelectItem>
                    <SelectItem value="thailand">Thailand</SelectItem>
                    <SelectItem value="singapore">Singapore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sort by</div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort creators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engagement rate</SelectItem>
                    <SelectItem value="reach">Reach</SelectItem>
                    <SelectItem value="fit">Fit score</SelectItem>
                    <SelectItem value="views">Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <CreatorEvidenceBoard creator={selectedCreator} platformFilter={platformFilter} marketFilter={marketFilter} />
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Prime recommendation strip</div>
                    <div className="text-xs text-muted-foreground">Pick the strongest creator, confirm the SKU story, attach visual proof, then hand off into Launch Decisions.</div>
                  </div>
                  {selectedCreator ? <Badge>{selectedCreator.fitScore}% fit</Badge> : null}
                </div>
                {selectedCreator ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended creator</div>
                        <div className="mt-2 text-sm font-medium">{selectedCreator.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{selectedCreator.handle} · {selectedCreator.category}</div>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Matched SKU</div>
                        <div className="mt-2 text-sm font-medium">{selectedCreator.product}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{selectedCreator.topFollowerSegment}</div>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next move</div>
                        <div className="mt-2 text-sm font-medium">{selectedCreator.recommendation}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{selectedCreator.matchedPosts} matched posts ready for review.</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                        Open profile
                      </Button>
                      <Button asChild size="sm">
                        <Link to={INTELLIGENCE_DECISIONS_HREF}>
                          Send to Launch Decisions
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(selectedCreator?.contentPreview || []).map((preview: string, index: number) => (
                    <div key={`${selectedCreator?.id || 'preview'}-${preview}`} className="overflow-hidden rounded-2xl border bg-muted/20">
                      <div className={`h-28 bg-gradient-to-br ${selectedCreator?.avatarTone || 'from-primary/20 to-primary/10'}`} />
                      <div className="space-y-1 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Post {index + 1}</div>
                        <div className="text-sm font-medium leading-5">{preview}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <LinkedIntelligenceAssetCard
                  title="Creator image inputs"
                  description="Attach screenshots or reference frames that explain why this creator should move forward."
                  entityLabel={selectedCreator ? `${selectedCreator.name} · ${selectedCreator.handle}` : 'Current creator'}
                  contextLabel={selectedCreator?.product || 'Attach image proof for this creator fit.'}
                  assets={selectedCreator ? creatorAssets.filter((asset) => asset.entityLabel === selectedCreator.name) : creatorAssets}
                  isUploading={isUploadingAssets}
                  inputRef={creatorAssetInputRef}
                  onOpenPicker={() => creatorAssetInputRef.current?.click()}
                  onUpload={handleCreatorAssetUpload}
                  onRemove={handleRemoveCreatorAsset}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Engagements</TableHead>
                  <TableHead className="text-right">ER</TableHead>
                  <TableHead className="text-right">Fit</TableHead>
                  <TableHead>Social links</TableHead>
                  <TableHead>Context / Bio</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreators.map((creator) => {
                  const estimatedEngagements = Math.round(creator.followers * (creator.engagementRate / 100));
                  return (
                    <TableRow key={creator.id} className={selectedCreator?.id === creator.id ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left"
                          onClick={() => {
                            setSelectedCreatorId(creator.id);
                            setIsDialogOpen(true);
                          }}
                        >
                          <div className={`flex size-12 items-center justify-center rounded-2xl border bg-gradient-to-br ${creator.avatarTone} text-sm font-semibold text-foreground shadow-sm`}>
                            {initials(creator.name)}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{creator.name}</span>
                              {creator.verified ? <Badge variant="outline" className="h-5 px-1.5 text-[10px]">verified</Badge> : null}
                            </div>
                            <div className="text-xs text-muted-foreground">{creator.handle}</div>
                            <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                              <span>{creator.category}</span>
                              <span>·</span>
                              <span>{creator.country}</span>
                              <span>·</span>
                              <span>{creator.topFollowerSegment}</span>
                            </div>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">{(creator.reach / 1000000).toFixed(1)}M</TableCell>
                      <TableCell className="text-right">{(estimatedEngagements / 1000).toFixed(1)}K</TableCell>
                      <TableCell className="text-right">{creator.engagementRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                          <span className={`size-2 rounded-full ${creator.fitScore >= 85 ? 'bg-emerald-500' : creator.fitScore >= 78 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                          {creator.fitScore}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {creator.socialLinks.map((link) => (
                            <Badge key={`${creator.id}-${link.label}`} variant="outline" className="gap-1.5 rounded-full px-2.5 py-1 text-[11px]">
                              {socialIcon(link.icon)}
                              {link.audience}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <div className="space-y-2">
                          <p className="line-clamp-2 text-sm text-muted-foreground">{creator.summary}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="rounded-full">{creator.matchedPosts} matched posts</Badge>
                            <span>Brands: {creator.brandsMentioned.join(', ')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedCreatorId(creator.id);
                          setIsDialogOpen(true);
                        }}>
                          Open profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedCreator ? (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCreator.name}</DialogTitle>
              <DialogDescription>Creator profile, channel footprint, audience analytics, and activation guidance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className={`flex size-28 items-center justify-center rounded-3xl border bg-gradient-to-br ${selectedCreator.avatarTone} text-2xl font-semibold shadow-sm`}>
                        {initials(selectedCreator.name)}
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-3xl font-semibold">{selectedCreator.name}</h3>
                          {selectedCreator.verified ? <Badge variant="outline">verified</Badge> : null}
                          <Badge variant="outline">{selectedCreator.handle}</Badge>
                          <Badge variant="outline">{selectedCreator.category}</Badge>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">{selectedCreator.summary}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{selectedCreator.country}</Badge>
                          <Badge variant="outline">{selectedCreator.channel}</Badge>
                          <Badge variant="outline">Authenticity {selectedCreator.authenticityScore}%</Badge>
                          <Badge variant="outline">Audience quality {selectedCreator.audienceQualityScore}%</Badge>
                          <Badge variant="outline">Primary SKU {selectedCreator.product}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button>+ Add to shortlist</Button>
                  </div>
                </div>
                <AudienceDonutCard creator={selectedCreator} compact={false} />
              </div>

              <Tabs defaultValue="audience" className="space-y-4">
                <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
                  <TabsTrigger value="content">Recent posts</TabsTrigger>
                  <TabsTrigger value="audience">Audience</TabsTrigger>
                  <TabsTrigger value="metrics">Key metrics</TabsTrigger>
                  <TabsTrigger value="similar">Similar creators</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {selectedCreator.contentPreview.map((preview: string, index: number) => (
                        <div key={`${selectedCreator.id}-content-${preview}`} className="overflow-hidden rounded-3xl border bg-background shadow-sm">
                          <div className={`h-40 bg-gradient-to-br ${selectedCreator.avatarTone}`} />
                          <div className="space-y-2 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Matched post {index + 1}</div>
                              <Badge variant="outline" className="rounded-full text-[10px]">{selectedCreator.lastPosted}</Badge>
                            </div>
                            <div className="text-sm font-medium">{preview}</div>
                            <div className="text-xs text-muted-foreground">Brand-safe commerce content with strong visual clarity for product-led campaigns.</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Card className="rounded-lg border">
                      <CardHeader>
                        <CardTitle className="text-base">Content fit summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <div className="font-medium">Top follower segment</div>
                          <div className="mt-1 text-muted-foreground">{selectedCreator.topFollowerSegment}</div>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <div className="font-medium">Top brands mentioned</div>
                          <div className="mt-1 text-muted-foreground">{selectedCreator.brandsMentioned.join(', ')}</div>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <div className="font-medium">Posting cadence</div>
                          <div className="mt-1 text-muted-foreground">Last posted {selectedCreator.lastPosted}. {selectedCreator.matchedPosts} posts align with this campaign query.</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="audience" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1fr]">
                    <GenderCard creator={selectedCreator} />
                    <AgeDistributionCard creator={selectedCreator} />
                    <TopCountriesCard creator={selectedCreator} />
                  </div>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricPill label="Connections" value={`${(selectedCreator.followers / 1000).toFixed(1)}K`} />
                    <MetricPill label="Avg views" value={`${(selectedCreator.avgViews / 1000).toFixed(0)}K`} />
                    <MetricPill label="Revenue" value={currency.format(selectedCreator.revenue)} />
                    <MetricPill label="Active audience" value={`${selectedCreator.activeAudience}%`} />
                  </div>
                  <Card className="rounded-lg border">
                    <CardHeader>
                      <CardTitle className="text-base">Connected accounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedCreator.socialLinks.map((link) => (
                        <div key={`${selectedCreator.id}-${link.label}-detail`} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex size-9 items-center justify-center rounded-lg border bg-background">{socialIcon(link.icon)}</span>
                            <div>
                              <div className="font-medium">{link.handle}</div>
                              <div className="text-xs text-muted-foreground">{link.label}</div>
                            </div>
                          </div>
                          <div className="text-sm font-medium">{link.audience}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="similar" className="space-y-3">
                  {filteredCreators.filter((creator) => creator.id !== selectedCreator.id).map((creator) => (
                    <div key={`similar-${creator.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
                      <div>
                        <div className="font-medium">{creator.name}</div>
                        <div className="text-sm text-muted-foreground">{creator.category} · {creator.handle} · {creator.country}</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Fit {creator.fitScore}%</Badge>
                        <Badge variant="outline">ER {creator.engagementRate.toFixed(1)}%</Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedCreatorId(creator.id)}>Switch</Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function creatorProfilesHandle(index: number, channel: 'instagram' | 'youtube' | 'web') {
  const handles = {
    instagram: ['linhdesk', 'minhmarkets', 'haan.live', 'quynhchoice'],
    youtube: ['LinhDeskTV', 'MinhMarkets', 'HaAnReview', 'QuynhChoice'],
    web: ['linhdesk.media', 'minhmarkets.studio', 'haanlive.co', 'quynhchoice.co'],
  };

  return handles[channel][index] || `${channel}-creator-${index + 1}`;
}

function CustomerIntelligencePanel() {
  const snapshot = getPrimeSnapshot();
  const { toast } = useToast();
  const recommendedChannels = [
    ['TikTok', 'WhatsApp'],
    ['Facebook', 'Email'],
    ['Email', 'SMS'],
    ['WhatsApp', 'Phone'],
  ] as const;

  const customerProfiles = useMemo<CustomerProfile[]>(() => snapshot.customers.map((customer, index) => {
    const campaign = snapshot.campaigns[index % snapshot.campaigns.length];
    const play = snapshot.activationPlays[index % snapshot.activationPlays.length];
    const recommendation = snapshot.recommendations[index % snapshot.recommendations.length];
    const vocInsight = snapshot.vocInsights[index % snapshot.vocInsights.length];
    const channels = recommendedChannels[index % recommendedChannels.length];
    const potentialScore = Math.min(96, 68 + customer.totalOrders * 4 + index * 5);
    const conversionLikelihood = Math.min(94, 54 + customer.totalOrders * 7 + index * 4);
    const churnRisk = customer.lifecycle === 'at-risk' ? 74 : customer.lifecycle === 'retention' ? 48 : 23;
    const revenueContribution = Math.max(4, Math.round((customer.totalRevenue / Math.max(1, snapshot.metrics.revenue)) * 100));
    const segmentLabel = [
      'Dormant repeat customers',
      'High-value loyalists',
      'Recent first-time buyers',
      'Marketplace expansion buyers',
    ][index % 4];
    const nextCategory = ['Refill bundles', 'Desk essentials', 'Creative kits', 'Marketplace packs'][index % 4];
    const momentum = ['Rising intent', 'Stable demand', 'Reactivation window', 'Cross-sell opening'][index % 4];

    return {
      ...customer,
      potentialScore,
      conversionLikelihood,
      churnRisk,
      revenueContribution,
      segmentLabel,
      recommendedProduct: campaign.skuCode,
      recommendedChannels: channels,
      nextBestAction: play.nextBestAction,
      reasoning: recommendation?.reasoning || 'Prime AI detected a reachable segment with strong product-fit signals.',
      target: recommendation?.target || customer.segment,
      signalSummary: vocInsight?.summary || 'Repeat engagement and catalog activity are recovering in this segment.',
      nextCategory,
      momentum,
    };
  }), [snapshot]);

  const [searchQuery, setSearchQuery] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('potential');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerProfiles[0]?.id ?? '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customerAssets, setCustomerAssets] = useState<IntelligenceAsset[]>(() => getIntelligenceAssets('customers'));
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const customerAssetInputRef = useRef<HTMLInputElement>(null);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const next = customerProfiles.filter((customer) => {
      const matchesQuery = !normalizedQuery || [
        customer.name,
        customer.company,
        customer.segment,
        customer.segmentLabel,
        customer.signalSummary,
        customer.nextCategory,
      ].join(' ').toLowerCase().includes(normalizedQuery);
      const matchesLifecycle = lifecycleFilter === 'all' || customer.lifecycle === lifecycleFilter;
      const matchesChannel = channelFilter === 'all' || customer.recommendedChannels.some((channel) => channel.toLowerCase() === channelFilter);
      return matchesQuery && matchesLifecycle && matchesChannel;
    });

    next.sort((left, right) => {
      if (sortBy === 'revenue') return right.totalRevenue - left.totalRevenue;
      if (sortBy === 'conversion') return right.conversionLikelihood - left.conversionLikelihood;
      if (sortBy === 'risk') return right.churnRisk - left.churnRisk;
      return right.potentialScore - left.potentialScore;
    });

    return next;
  }, [channelFilter, customerProfiles, lifecycleFilter, searchQuery, sortBy]);

  const selectedCustomer = filteredCustomers.find((customer) => customer.id === selectedCustomerId)
    ?? customerProfiles.find((customer) => customer.id === selectedCustomerId)
    ?? filteredCustomers[0]
    ?? customerProfiles[0];

  async function handleCustomerAssetUpload(files: FileList | null) {
    if (!files?.length || !selectedCustomer) return;

    setIsUploadingAssets(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) {
        const asset = await uploadIntelligenceAsset({
          file,
          source: 'customers',
          entityId: selectedCustomer.id,
          entityLabel: selectedCustomer.name,
          contextLabel: `${selectedCustomer.segmentLabel} · ${selectedCustomer.recommendedProduct}`,
        });
        uploaded.push(asset);
      }

      setCustomerAssets(getIntelligenceAssets('customers'));
      toast({
        title: uploaded.length > 1 ? 'Customer images linked' : 'Customer image linked',
        description: `${uploaded.length} image is now ready inside Launch Decisions.`,
      });
    } catch (error) {
      toast({
        title: 'Customer image upload failed',
        description: error instanceof Error ? error.message : 'Could not upload the selected image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAssets(false);
      if (customerAssetInputRef.current) {
        customerAssetInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveCustomerAsset(assetId: string) {
    await removeIntelligenceAsset(assetId);
    setCustomerAssets(getIntelligenceAssets('customers'));
    toast({
      title: 'Customer image removed',
      description: 'The linked image has been removed from Launch Decisions.',
    });
  }

  const revenueOnWatch = filteredCustomers
    .filter((customer) => customer.churnRisk >= 48)
    .reduce((sum, customer) => sum + customer.totalRevenue, 0);
  const activationReadiness = filteredCustomers.length
    ? Math.round(filteredCustomers.reduce((sum, customer) => sum + customer.potentialScore, 0) / filteredCustomers.length)
    : 0;
  const repeatPurchasePotential = filteredCustomers.filter((customer) => customer.totalOrders > 1).length;
  const totalReachableRevenue = filteredCustomers.reduce((sum, customer) => sum + customer.totalRevenue, 0);

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Tracked segments" value={filteredCustomers.length} meta="Compact customer discovery view with shortlist-ready segment rows." icon={<CircleUserRound className="size-5" />} tone="info" />
          <SummaryMetricCard label="Reachable revenue" value={currency.format(totalReachableRevenue)} meta="Revenue currently inside the filtered customer opportunity set." icon={<TrendingUp className="size-5" />} tone="success" />
          <SummaryMetricCard label="Revenue on watch" value={currency.format(revenueOnWatch)} meta="Revenue tied to cohorts already showing churn or reactivation pressure." icon={<BellRing className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Activation readiness" value={`${activationReadiness}%`} meta={`${repeatPurchasePotential} segments already show repeat-order or replenishment behavior.`} icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>Customer search and discovery</CardTitle>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="size-3" />
                    Compact decision workspace
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Filter by lifecycle and activation lane, compare customers in one dense table, then open the profile for the full intelligence story.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1"><SlidersHorizontal className="size-3" /> Query + filters</Badge>
                <Badge variant="outline" className="gap-1"><HeartHandshake className="size-3" /> Segment scoring</Badge>
                <Badge variant="outline" className="gap-1"><Bot className="size-3" /> Prime AI drilldown</Badge>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 xl:grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr]">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Search query</div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" placeholder="Search customer, segment, signal, or product" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lifecycle</div>
                <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose lifecycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All lifecycles</SelectItem>
                    <SelectItem value="retention">Retention</SelectItem>
                    <SelectItem value="at-risk">At-risk</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Channel lane</div>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All channels</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sort by</div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="potential">Potential score</SelectItem>
                    <SelectItem value="conversion">Conversion likelihood</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="risk">Churn risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <CustomerEvidenceBoard customer={selectedCustomer} lifecycleFilter={lifecycleFilter} channelFilter={channelFilter} activationReadiness={activationReadiness} />
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Prime recommendation strip</div>
                    <div className="text-xs text-muted-foreground">Turn the highest-fit segment into one clear activation move, add proof visuals, then hand off into Launch Decisions.</div>
                  </div>
                  {selectedCustomer ? <Badge>{selectedCustomer.potentialScore}% fit</Badge> : null}
                </div>
                {selectedCustomer ? (
                  <>
                    <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended move</div>
                      <div className="mt-2 text-sm font-medium">{selectedCustomer.nextBestAction}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Lead with {selectedCustomer.recommendedProduct}, then sequence {selectedCustomer.recommendedChannels.join(' + ')} around the {selectedCustomer.nextCategory.toLowerCase()} window.
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended SKU</div>
                        <div className="mt-2 text-sm font-medium">{selectedCustomer.recommendedProduct}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{selectedCustomer.segmentLabel}</div>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best channels</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedCustomer.recommendedChannels.map((channel) => (
                            <Badge key={`${selectedCustomer.id}-${channel}-signal`} variant={channelTone(channel)}>{channel}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Momentum</div>
                        <div className="mt-2 text-sm font-medium">{selectedCustomer.momentum}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                        Open profile
                      </Button>
                      <Button asChild size="sm">
                        <Link to={INTELLIGENCE_DECISIONS_HREF}>
                          Send to Launch Decisions
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : null}
                <LinkedIntelligenceAssetCard
                  title="Customer image inputs"
                  description="Attach CRM screenshots, persona notes, or proof that explains why this segment should be targeted now."
                  entityLabel={selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.segmentLabel}` : 'Current customer'}
                  contextLabel={selectedCustomer?.recommendedProduct || 'Attach image proof for this customer segment.'}
                  assets={selectedCustomer ? customerAssets.filter((asset) => asset.entityLabel === selectedCustomer.name) : customerAssets}
                  isUploading={isUploadingAssets}
                  inputRef={customerAssetInputRef}
                  onOpenPicker={() => customerAssetInputRef.current?.click()}
                  onUpload={handleCustomerAssetUpload}
                  onRemove={handleRemoveCustomerAsset}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className={selectedCustomer?.id === customer.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => {
                          setSelectedCustomerId(customer.id);
                          setIsDialogOpen(true);
                        }}
                      >
                        <div className="flex size-12 items-center justify-center rounded-2xl border bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-sm font-semibold text-foreground shadow-sm">
                          {initials(customer.name)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="font-semibold text-foreground">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.company}</div>
                          <div className="text-[11px] text-muted-foreground">{customer.lifecycle} lifecycle · {customer.totalOrders} orders</div>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{customer.segmentLabel}</div>
                        <div className="text-xs text-muted-foreground">{customer.momentum}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{currency.format(customer.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{customer.conversionLikelihood}%</TableCell>
                    <TableCell className="text-right">{customer.churnRisk}%</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {customer.recommendedChannels.map((channel) => (
                          <Badge key={`${customer.id}-${channel}`} variant={channelTone(channel)}>{channel}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="space-y-2">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{customer.signalSummary}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="rounded-full">{customer.nextCategory}</Badge>
                          <span>SKU: {customer.recommendedProduct}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setIsDialogOpen(true);
                      }}>
                        Open profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedCustomer ? (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCustomer.name}</DialogTitle>
              <DialogDescription>Customer profile, segment signals, recommended channels, and next-best-action details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex size-24 items-center justify-center rounded-3xl border bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-2xl font-semibold shadow-sm">
                        {initials(selectedCustomer.name)}
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-3xl font-semibold">{selectedCustomer.name}</h3>
                          <Badge variant="outline">{selectedCustomer.company}</Badge>
                          <Badge variant="outline" className="capitalize">{selectedCustomer.lifecycle}</Badge>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">{selectedCustomer.reasoning}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{selectedCustomer.segmentLabel}</Badge>
                          <Badge variant="outline">Target {selectedCustomer.target}</Badge>
                          <Badge variant="outline">Potential {selectedCustomer.potentialScore}%</Badge>
                          <Badge variant="outline">Conversion {selectedCustomer.conversionLikelihood}%</Badge>
                        </div>
                      </div>
                    </div>
                    <Button>Send to journey</Button>
                  </div>
                </div>
                <Card className="rounded-2xl border bg-muted/10 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Decision snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best move</div>
                      <div className="mt-2 font-medium">{selectedCustomer.nextBestAction}</div>
                    </div>
                    <div className="rounded-xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended product</div>
                      <div className="mt-2 font-medium">{selectedCustomer.recommendedProduct}</div>
                    </div>
                    <div className="rounded-xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Expected upside</div>
                      <div className="mt-2 font-medium">+8-12% reactivation or cross-sell lift</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="signals">Signals</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricPill label="Revenue" value={currency.format(selectedCustomer.totalRevenue)} />
                    <MetricPill label="Orders" value={`${selectedCustomer.totalOrders}`} />
                    <MetricPill label="Contribution" value={`${selectedCustomer.revenueContribution}%`} />
                    <MetricPill label="Churn risk" value={`${selectedCustomer.churnRisk}%`} />
                  </div>
                </TabsContent>

                <TabsContent value="signals" className="space-y-3">
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">{selectedCustomer.signalSummary}</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Momentum</div>
                      <div className="mt-2 font-medium text-foreground">{selectedCustomer.momentum}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next category</div>
                      <div className="mt-2 font-medium text-foreground">{selectedCustomer.nextCategory}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Prime target</div>
                      <div className="mt-2 font-medium text-foreground">{selectedCustomer.target}</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="channels" className="space-y-3">
                  {selectedCustomer.recommendedChannels.map((channel) => (
                    <div key={`${selectedCustomer.id}-${channel}-detail`} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                      <div>
                        <div className="font-medium">{channel}</div>
                        <div className="text-xs text-muted-foreground">Recommended lane for {selectedCustomer.segmentLabel.toLowerCase()}.</div>
                      </div>
                      <Badge variant={channelTone(channel)}>{channel}</Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="actions" className="space-y-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Prime AI recommendation</div>
                    <div className="mt-2 font-medium">{selectedCustomer.nextBestAction}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Lead with {selectedCustomer.recommendedProduct}, sequence {selectedCustomer.recommendedChannels.join(' + ')}, and time the message around the {selectedCustomer.nextCategory.toLowerCase()} window.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function LaunchDecisionPanel() {
  const snapshot = getPrimeSnapshot();
  const creatorNames = ['Linh Dao', 'Minh Chau', 'Ha An', 'Quynh My'] as const;
  const creatorHandles = ['@linhdesk', '@minhmarkets', '@haan.live', '@quynhchoice'] as const;
  const extraChannels = [
    ['TikTok Spark', 'Retargeting'],
    ['Instagram Reels', 'Email'],
    ['YouTube Shorts', 'Marketplace CRM'],
    ['Creator Live', 'WhatsApp'],
  ] as const;

  const campaignPlans = useMemo<LaunchDecisionPlan[]>(() => snapshot.campaigns.map((campaign, index) => {
    const customer = snapshot.customers[index % snapshot.customers.length];
    const play = snapshot.activationPlays[index % snapshot.activationPlays.length];
    const recommendation = snapshot.recommendations[index % snapshot.recommendations.length];
    const alert = snapshot.alerts[index % snapshot.alerts.length];
    const productLabel = getSkuLabel(campaign.skuCode);
    const creatorFit = Math.min(96, 74 + index * 5 + Math.round(play.projectedLift / 4));
    const customerFit = Math.min(94, 69 + customer.totalOrders * 5 + index * 4);
    const launchReadiness = Math.min(97, 72 + index * 6 + (campaign.status === 'active' ? 8 : 0));
    const outcomeScore = Math.round((creatorFit + customerFit + launchReadiness) / 3);
    const riskLevel = Math.max(18, 58 - index * 9 + (campaign.status === 'paused' ? 14 : 0));
    const channels = [campaign.channel, ...extraChannels[index % extraChannels.length]] as const;

    return {
      id: campaign.id,
      name: campaign.name,
      skuCode: campaign.skuCode,
      productLabel,
      creatorName: creatorNames[index] || `Creator ${index + 1}`,
      creatorHandle: creatorHandles[index] || `@creator${index + 1}`,
      creatorFit,
      customerName: customer.name,
      customerCompany: customer.company,
      customerSegment: customer.segment,
      customerLifecycle: customer.lifecycle,
      customerFit,
      channel: campaign.channel,
      channels,
      angle: ['Product proof for first-touch demand', 'Value comparison for high-intent buyers', 'Bundle upsell for repeat purchase cohorts', 'Creator-led urgency push for warm demand'][index] || 'Product-to-demand match narrative',
      budget: campaign.spend,
      revenue: campaign.revenue,
      launchReadiness,
      outcomeScore,
      riskLevel,
      executionRisk: alert?.title || 'No material execution risk detected.',
      nextBestAction: play.nextBestAction,
      narrative: recommendation?.reasoning || 'Prime AI sees a high-confidence product, audience, and creator overlap for this launch.',
      whyItWins: `${productLabel} fits ${customer.segment.toLowerCase()} demand, while ${creatorNames[index] || `Creator ${index + 1}`} gives the campaign credible reach on ${campaign.channel}.`,
      offerHook: ['Lead with hero SKU + starter incentive', 'Show ROI proof before price framing', 'Bundle the refill path into one offer', 'Use creator credibility to compress trust time'][index] || 'Lead with product clarity and proof.',
      messageHook: recommendation?.target || customer.segment,
      optimization: ['Scale creator spend only after creator-led CTR stabilizes.', 'Pair paid retargeting with creator proof assets.', 'Use CRM follow-up after first high-intent touch.', 'Open with creator content, then switch to conversion-led remarketing.'][index] || 'Preserve match quality before adding spend.',
      timing: ['Launch this week', 'Wait for inventory confirmation', 'Best in next 72 hours', 'Sync with creator posting window'][index] || 'Ready now',
    };
  }), [snapshot]);

  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [sortBy, setSortBy] = useState('match');
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaignPlans[0]?.id ?? '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const creatorAssets = useMemo(() => getIntelligenceAssets('creators'), []);
  const customerAssets = useMemo(() => getIntelligenceAssets('customers'), []);

  const filteredPlans = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const next = campaignPlans.filter((plan) => {
      const matchesQuery = !normalizedQuery || [plan.name, plan.productLabel, plan.skuCode, plan.creatorName, plan.customerName, plan.customerSegment, plan.angle, plan.narrative].join(' ').toLowerCase().includes(normalizedQuery);
      const matchesChannel = channelFilter === 'all' || plan.channels.some((channel) => channel.toLowerCase().includes(channelFilter));
      const matchesReadiness = readinessFilter === 'all'
        || (readinessFilter === 'launch-now' && plan.launchReadiness >= 84)
        || (readinessFilter === 'warm-up' && plan.launchReadiness >= 70 && plan.launchReadiness < 84)
        || (readinessFilter === 'at-risk' && plan.riskLevel >= 45);
      return matchesQuery && matchesChannel && matchesReadiness;
    });

    next.sort((left, right) => {
      if (sortBy === 'revenue') return right.revenue - left.revenue;
      if (sortBy === 'readiness') return right.launchReadiness - left.launchReadiness;
      if (sortBy === 'risk') return right.riskLevel - left.riskLevel;
      return right.outcomeScore - left.outcomeScore;
    });

    return next;
  }, [campaignPlans, channelFilter, readinessFilter, searchQuery, sortBy]);

  const selectedPlan = filteredPlans.find((plan) => plan.id === selectedCampaignId)
    ?? campaignPlans.find((plan) => plan.id === selectedCampaignId)
    ?? filteredPlans[0]
    ?? campaignPlans[0];

  const launchNowCount = filteredPlans.filter((plan) => plan.launchReadiness >= 84 && plan.riskLevel < 45).length;
  const averageMatch = filteredPlans.length ? Math.round(filteredPlans.reduce((sum, plan) => sum + plan.outcomeScore, 0) / filteredPlans.length) : 0;
  const forecastRevenue = filteredPlans.reduce((sum, plan) => sum + plan.revenue, 0);
  const avgRisk = filteredPlans.length ? Math.round(filteredPlans.reduce((sum, plan) => sum + plan.riskLevel, 0) / filteredPlans.length) : 0;
  const linkedCreatorAssets = selectedPlan ? creatorAssets.filter((asset) => asset.entityLabel === selectedPlan.creatorName) : [];
  const linkedCustomerAssets = selectedPlan ? customerAssets.filter((asset) => asset.entityLabel === selectedPlan.customerName) : [];

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Matched decisions" value={filteredPlans.length} meta="Each row scores product, buyer intent, creator fit, and visual context in one compact decision view." icon={<PanelsTopLeft className="size-5" />} tone="info" />
          <SummaryMetricCard label="Average match" value={`${averageMatch}%`} meta="Blended score across product-customer-creator alignment." icon={<Sparkles className="size-5" />} tone="success" />
          <SummaryMetricCard label="Forecast revenue" value={currency.format(forecastRevenue)} meta="Projected outcome from the currently filtered launch set." icon={<TrendingUp className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Ready to approve" value={launchNowCount} meta={`Avg risk ${avgRisk}% across the current decision stack.`} icon={<Megaphone className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>Launch decision workspace</CardTitle>
                  <Badge variant="outline" className="gap-1"><Sparkles className="size-3" />Compact decision workspace</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">See which product, creator, customer cohort, and uploaded source visuals should move forward, then approve the strongest launch without leaving the table.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1"><ScanSearch className="size-3" /> Match scoring</Badge>
                <Badge variant="outline" className="gap-1"><HeartHandshake className="size-3" /> Product x buyer fit</Badge>
                <Badge variant="outline" className="gap-1"><CircleUserRound className="size-3" /> Creator x message fit</Badge>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 xl:grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr]">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Search query</div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" placeholder="Search product, customer, creator, or launch angle" />
                </div>
              </div>
              <div className="space-y-2"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Channel lane</div><Select value={channelFilter} onValueChange={setChannelFilter}><SelectTrigger><SelectValue placeholder="Choose channel" /></SelectTrigger><SelectContent><SelectItem value="all">All channels</SelectItem><SelectItem value="tiktok">TikTok</SelectItem><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="youtube">YouTube</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Decision state</div><Select value={readinessFilter} onValueChange={setReadinessFilter}><SelectTrigger><SelectValue placeholder="Choose readiness" /></SelectTrigger><SelectContent><SelectItem value="all">All plans</SelectItem><SelectItem value="launch-now">Launch now</SelectItem><SelectItem value="warm-up">Warm-up needed</SelectItem><SelectItem value="at-risk">At risk</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sort by</div><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue placeholder="Sort plans" /></SelectTrigger><SelectContent><SelectItem value="match">Overall match</SelectItem><SelectItem value="readiness">Launch readiness</SelectItem><SelectItem value="revenue">Revenue</SelectItem><SelectItem value="risk">Risk</SelectItem></SelectContent></Select></div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <LaunchDecisionBoard
                plan={selectedPlan}
                channelFilter={channelFilter}
                readinessFilter={readinessFilter}
                averageMatch={averageMatch}
                linkedCreatorAssets={linkedCreatorAssets}
                linkedCustomerAssets={linkedCustomerAssets}
              />
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Prime approval strip</div><div className="text-xs text-muted-foreground">A compressed answer for how creators, customers, and visuals should converge before execution.</div></div>{selectedPlan ? <Badge>{selectedPlan.outcomeScore}% match</Badge> : null}</div>
                {selectedPlan ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-muted/20 p-3"><div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Product</div><div className="mt-2 text-sm font-medium">{selectedPlan.productLabel}</div><div className="mt-1 text-xs text-muted-foreground">{selectedPlan.skuCode}</div></div><div className="rounded-2xl border bg-muted/20 p-3"><div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Buyer + creator</div><div className="mt-2 text-sm font-medium">{selectedPlan.customerSegment}</div><div className="mt-1 text-xs text-muted-foreground">via {selectedPlan.creatorName}</div></div><div className="rounded-2xl border bg-muted/20 p-3"><div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended move</div><div className="mt-2 text-sm font-medium">{selectedPlan.offerHook}</div></div></div> : null}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <LinkedDecisionAssetLane
                title="Creator inputs in this decision"
                description="Images attached on the Creators screen now support this approval."
                assets={linkedCreatorAssets.length ? linkedCreatorAssets : creatorAssets}
                emptyHref="/intelligence/creators"
                emptyLabel="Upload on Creators"
              />
              <LinkedDecisionAssetLane
                title="Customer inputs in this decision"
                description="Images attached on the Customers screen stay with this segment during approval."
                assets={linkedCustomerAssets.length ? linkedCustomerAssets : customerAssets}
                emptyHref="/intelligence/trends"
                emptyLabel="Upload on Customers"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader><TableRow><TableHead>Decision</TableHead><TableHead>Product</TableHead><TableHead>Customer fit</TableHead><TableHead>Creator fit</TableHead><TableHead>Channels</TableHead><TableHead>Approval recommendation</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredPlans.map((plan) => (
                  <TableRow key={plan.id} className={selectedPlan?.id === plan.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium"><button type="button" className="flex items-start gap-3 text-left" onClick={() => { setSelectedCampaignId(plan.id); setIsDialogOpen(true); }}><div className="flex size-12 items-center justify-center rounded-2xl border bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-sm font-semibold text-foreground shadow-sm">{initials(plan.name)}</div><div className="min-w-0 space-y-1"><div className="font-semibold text-foreground">{plan.name}</div><div className="text-xs text-muted-foreground">{plan.angle}</div><div className="text-[11px] text-muted-foreground">{plan.timing} · readiness {plan.launchReadiness}%</div></div></button></TableCell>
                    <TableCell><div className="space-y-1"><div className="font-medium">{plan.productLabel}</div><div className="text-xs text-muted-foreground">{plan.skuCode}</div></div></TableCell>
                    <TableCell><div className="space-y-1"><div className="font-medium">{plan.customerName}</div><div className="text-xs text-muted-foreground">{plan.customerSegment} · {plan.customerLifecycle}</div><div className="text-xs text-primary">Fit {plan.customerFit}%</div></div></TableCell>
                    <TableCell><div className="space-y-1"><div className="font-medium">{plan.creatorName}</div><div className="text-xs text-muted-foreground">{plan.creatorHandle}</div><div className="text-xs text-primary">Fit {plan.creatorFit}%</div></div></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1.5">{plan.channels.map((channel) => <Badge key={`${plan.id}-${channel}`} variant={channelTone(channel)}>{channel}</Badge>)}</div></TableCell>
                    <TableCell className="max-w-[340px]"><div className="space-y-2"><p className="line-clamp-2 text-sm text-muted-foreground">{plan.whyItWins}</p><div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><Badge variant="outline" className="rounded-full">{plan.outcomeScore}% match</Badge><span>{plan.offerHook}</span></div></div></TableCell>
                    <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => { setSelectedCampaignId(plan.id); setIsDialogOpen(true); }}>Open decision</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedPlan ? (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPlan.name}</DialogTitle>
              <DialogDescription>Compact launch decision profile across creator fit, customer fit, linked visuals, and the final go-to-market recommendation.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex size-24 items-center justify-center rounded-3xl border bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-2xl font-semibold shadow-sm">
                        {initials(selectedPlan.productLabel)}
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-3xl font-semibold">{selectedPlan.productLabel}</h3>
                          <Badge variant="outline">{selectedPlan.skuCode}</Badge>
                          <Badge variant="outline">{selectedPlan.channel}</Badge>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">{selectedPlan.narrative}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">Customer fit {selectedPlan.customerFit}%</Badge>
                          <Badge variant="outline">Creator fit {selectedPlan.creatorFit}%</Badge>
                          <Badge variant="outline">Launch readiness {selectedPlan.launchReadiness}%</Badge>
                          <Badge variant="outline">Outcome score {selectedPlan.outcomeScore}%</Badge>
                        </div>
                      </div>
                    </div>
                    <Button asChild>
                      <Link to="/demand/campaign-ops">Send to Campaign Ops</Link>
                    </Button>
                  </div>
                </div>
                <Card className="rounded-2xl border bg-muted/10 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Decision snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best move</div>
                      <div className="mt-2 font-medium">{selectedPlan.nextBestAction}</div>
                    </div>
                    <div className="rounded-xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Offer framing</div>
                      <div className="mt-2 font-medium">{selectedPlan.offerHook}</div>
                    </div>
                    <div className="rounded-xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Risk watch</div>
                      <div className="mt-2 font-medium">{selectedPlan.executionRisk}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="audience">Audience</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="playbook">Playbook</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricPill label="Budget" value={currency.format(selectedPlan.budget)} />
                    <MetricPill label="Revenue" value={currency.format(selectedPlan.revenue)} />
                    <MetricPill label="Match" value={`${selectedPlan.outcomeScore}%`} />
                    <MetricPill label="Risk" value={`${selectedPlan.riskLevel}%`} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Creator visuals linked</div>
                      <div className="mt-2 font-medium text-foreground">{linkedCreatorAssets.length}</div>
                      <p className="mt-2 text-sm text-muted-foreground">Images uploaded from the Creators screen that match this decision.</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Customer visuals linked</div>
                      <div className="mt-2 font-medium text-foreground">{linkedCustomerAssets.length}</div>
                      <p className="mt-2 text-sm text-muted-foreground">Images uploaded from the Customers screen that stay attached here.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="audience" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best customer</div>
                      <div className="mt-2 font-medium text-foreground">{selectedPlan.customerName}</div>
                      <p className="mt-2 text-sm text-muted-foreground">{selectedPlan.customerCompany} · {selectedPlan.customerSegment} · {selectedPlan.customerLifecycle}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best creator</div>
                      <div className="mt-2 font-medium text-foreground">{selectedPlan.creatorName}</div>
                      <p className="mt-2 text-sm text-muted-foreground">{selectedPlan.creatorHandle} · strongest trust carrier for this product story.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="channels" className="space-y-3">
                  {selectedPlan.channels.map((channel) => (
                    <div key={`${selectedPlan.id}-${channel}-detail`} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                      <div>
                        <div className="font-medium">{channel}</div>
                        <div className="text-xs text-muted-foreground">Use this lane to sequence the product story into conversion.</div>
                      </div>
                      <Badge variant={channelTone(channel)}>{channel}</Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="playbook" className="space-y-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">How to run this launch</div>
                    <div className="mt-2 font-medium">{selectedPlan.offerHook}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Message to {selectedPlan.messageHook.toLowerCase()}, let {selectedPlan.creatorName} open the trust layer, then follow with {selectedPlan.channels.slice(1).join(' + ')} to close demand.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Optimization</div>
                      <div className="mt-2 font-medium text-foreground">{selectedPlan.optimization}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Timing</div>
                      <div className="mt-2 font-medium text-foreground">{selectedPlan.timing}</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}


function socialIcon(icon: 'instagram' | 'youtube' | 'web') {
  if (icon === 'instagram') return <Instagram className="size-3.5" />;
  if (icon === 'youtube') return <Youtube className="size-3.5" />;
  return <Globe className="size-3.5" />;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function DistributionCurveCard({ creator }: { creator: CreatorProfile }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Distribution curve</div>
          <div className="text-sm font-medium">Creator position vs platform benchmark</div>
        </div>
        <Badge variant="outline">Index {creator.benchmarkIndex}</Badge>
      </div>
      <div className="relative pt-5">
        <div className="h-2 rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-300" />
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span>Low</span>
          <span>Median</span>
          <span>High</span>
        </div>
        <div className="absolute left-0 right-0 top-0 h-6" style={{ left: `${Math.min(92, Math.max(8, creator.benchmarkIndex))}%` }}>
          <div className="flex -translate-x-1/2 flex-col items-center">
            <div className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold shadow-sm">{creator.engagementRate.toFixed(1)}% ER</div>
            <div className="size-2 rounded-full bg-foreground" />
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
        <div>Authenticity score: <span className="font-semibold text-foreground">{creator.authenticityScore}%</span></div>
        <div>Audience quality: <span className="font-semibold text-foreground">{creator.audienceQualityScore}%</span></div>
      </div>
    </div>
  );
}

function AudienceDonutCard({ creator, compact = true }: { creator: CreatorProfile; compact?: boolean }) {
  const total = creator.audienceSplit.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  const segments = creator.audienceSplit.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...item, startAngle, angle };
  });

  const conicGradient = segments
    .map((s) => `${segmentsColor(s.color)} ${s.startAngle}deg ${s.startAngle + s.angle}deg`)
    .join(', ');

  return (
    <Card className="rounded-2xl border bg-muted/10 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Audience connections</CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'space-y-6' : 'grid gap-6 md:grid-cols-[200px_1fr] md:items-center'}>
        <div className="relative mx-auto flex size-40 items-center justify-center rounded-full border-4 border-background shadow-inner">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${conicGradient})`,
              maskImage: 'radial-gradient(circle, transparent 62%, black 63%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 63%)',
            }}
          />
          <div className="relative text-center">
            <div className="text-2xl font-bold">{(creator.followers / 1000).toFixed(1)}K</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">total</div>
          </div>
        </div>
        <div className="grid gap-2">
          {creator.audienceSplit.map((item) => (
            <div key={`${creator.id}-${item.label}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${item.color}`} />
                <span className="font-medium text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function segmentsColor(colorClass: string) {
  if (colorClass.includes('fuchsia')) return '#d946ef';
  if (colorClass.includes('violet')) return '#8b5cf6';
  if (colorClass.includes('sky')) return '#0ea5e9';
  if (colorClass.includes('rose')) return '#f43f5e';
  if (colorClass.includes('amber')) return '#f59e0b';
  if (colorClass.includes('emerald')) return '#10b981';
  return '#94a3b8';
}

function GenderCard({ creator }: { creator: CreatorProfile }) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          Gender
          <Badge variant="outline" className="font-mono text-[10px]">{creator.genderSplit.male > creator.genderSplit.female ? 'Male skew' : 'Female skew'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="flex h-10 w-full overflow-hidden rounded-xl border bg-muted/20">
          <div className="flex items-center justify-center bg-sky-400 font-bold text-white transition-all duration-500" style={{ width: `${creator.genderSplit.male}%` }}>
            {creator.genderSplit.male > 20 && `${creator.genderSplit.male.toFixed(0)}%`}
          </div>
          <div className="flex items-center justify-center bg-rose-400 font-bold text-white transition-all duration-500" style={{ width: `${creator.genderSplit.female}%` }}>
            {creator.genderSplit.female > 20 && `${creator.genderSplit.female.toFixed(0)}%`}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-sky-400" />
            <span className="text-muted-foreground">Male</span>
            <span className="font-bold">{creator.genderSplit.male.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{creator.genderSplit.female.toFixed(1)}%</span>
            <span className="text-muted-foreground">Female</span>
            <div className="size-3 rounded-full bg-rose-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgeDistributionCard({ creator }: { creator: CreatorProfile }) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Age Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {creator.ageBuckets.map((bucket) => (
          <div key={`${creator.id}-${bucket.label}`} className="group space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">{bucket.label}</span>
              <span className="font-bold">{bucket.value.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
              <div 
                className="h-full bg-sky-400 transition-all duration-700 ease-out" 
                style={{ width: `${bucket.value}%` }} 
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TopCountriesCard({ creator }: { creator: CreatorProfile }) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Countries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {creator.topCountries.map((country, index: number) => (
          <div key={`${creator.id}-${country.label}`} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-sky-400/40" />
                <span className="font-medium text-muted-foreground">{country.label}</span>
              </div>
              <span className="font-bold">{country.value.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
              <div 
                className={`h-full transition-all duration-700 ease-out ${index === 0 ? 'bg-sky-500' : 'bg-sky-400/60'}`}
                style={{ width: `${country.value}%` }} 
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
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
      detail: 'Capital readiness turns launch, CRM, demand, and ops proof into a simple answer: is this business route strong enough to justify more capital?',
    },
    offers: {
      label: 'Narrative role',
      detail: 'Capital Offers analyzes sales momentum, demand quality, trust, and repayment capacity to suggest realistic funding for the seller.',
    },
    risk: {
      label: 'Narrative role',
      detail: 'Risk & Eligibility explains what blocks a seller from funding and what must be fixed to unlock the next offer.',
    },
    settlement: {
      label: 'Narrative role',
      detail: 'Finance Health keeps cashflow, settlement, repayment, and seller financial health visible in one simple operating view.',
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
  return <DemandExecutionPanel towerId={towerId} />;
}

function DemandExecutionPanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const { toast } = useToast();
  const primaryCampaign = snapshot.campaigns[0];
  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalLeads = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
  const totalRfqs = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.rfqs, 0);
  const totalOrders = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.orders, 0);
  const totalSpend = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalRevenue = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const socialReach = snapshot.socialStreams.reduce((sum, stream) => sum + stream.eventVolume, 0);
  const totalReach = totalTraffic + socialReach;
  const qualifiedLeads = snapshot.leads.filter((lead) => ['qualified', 'rfq_sent', 'converted'].includes(lead.status)).length;
  const openRfqs = snapshot.rfqs.filter((rfq) => rfq.status !== 'converted');
  const topPlay = snapshot.activationPlays[0];
  const sortedLeads = [...snapshot.leads].sort((left, right) => right.score - left.score);
  const topLead = sortedLeads[0];
  const topRfq = openRfqs[0];
  const primaryProduct = findProductBySku(snapshot, primaryCampaign?.skuCode);
  const primaryProductImage = primaryProduct?.images?.[0];
  const primaryForecast = findForecastBySku(snapshot, primaryCampaign?.skuCode);
  const roas = totalSpend ? `${(totalRevenue / totalSpend).toFixed(1)}x` : '0x';
  const launchRoute = primaryCampaign ? getSkuLabel(primaryCampaign.skuCode) : 'Launch route pending';
  const launchProductName = primaryCampaign ? getSkuProductName(primaryCampaign.skuCode) : 'Product route pending';
  const stockGuardrail = primaryForecast
    ? `${primaryForecast.ats} ATS / ${primaryForecast.demand7d} forecast`
    : 'Stock guardrail pending';
  const replenishmentUnits = primaryForecast ? Math.max(48, primaryForecast.demand7d - primaryForecast.ats + 40) : 120;
  const projectedLift = snapshot.activationPlays.reduce((sum, play) => sum + play.projectedLift, 0);

  type DemandActionStatus = 'ready' | 'drafted' | 'queued' | 'assigned';
  type DemandExecutionAction = {
    id: string;
    stage: string;
    kind: string;
    title: string;
    plainGoal: string;
    channel: string;
    audience: string;
    owner: string;
    signal: string;
    setup: Array<{ label: string; value: string }>;
    previewTitle: string;
    previewBody: string;
    checklist: string[];
    buttonLabel: string;
    doneLabel: string;
    result: string;
    statusAfter: DemandActionStatus;
    icon: ReactNode;
    nextSystem: string;
  };

  const [actionStatuses, setActionStatuses] = useState<Record<string, DemandActionStatus>>({});
  const [executionLog, setExecutionLog] = useState<Array<{ id: string; title: string; result: string; at: string; owner: string }>>([]);
  const [selectedAction, setSelectedAction] = useState<DemandExecutionAction | null>(null);

  const statusLabel: Record<DemandActionStatus, string> = {
    ready: 'Ready',
    drafted: 'Drafted',
    queued: 'Queued',
    assigned: 'Assigned',
  };

  const statusToneMap: Record<DemandActionStatus, 'default' | 'outline'> = {
    ready: 'outline',
    drafted: 'default',
    queued: 'default',
    assigned: 'default',
  };

  const runDemandAction = (action: DemandExecutionAction) => {
    setActionStatuses((current) => ({ ...current, [action.id]: action.statusAfter }));
    setExecutionLog((current) => [
      {
        id: action.id,
        title: action.title,
        result: action.result,
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        owner: action.owner,
      },
      ...current.filter((item) => item.id !== action.id),
    ].slice(0, 5));
    setSelectedAction(null);
    toast({ title: action.doneLabel, description: action.result });
  };

  const campaignActions: DemandExecutionAction[] = [
    {
      id: 'campaign-message-repeat-buyers',
      stage: '01',
      kind: 'Buyer message',
      title: 'Send campaign message to repeat buyers',
      plainGoal: 'Create one approved email/LINE/SMS draft for the warmest buyer lane.',
      channel: 'LINE + Email + SMS',
      audience: topPlay?.audience || 'Dormant repeat buyers',
      owner: 'CRM Ops - Hana Lee',
      signal: topPlay?.trigger || 'Dormant refill buyers came back to this product route.',
      setup: [
        { label: 'Product', value: launchProductName },
        { label: 'Audience size', value: formatCompactCount(totalLeads) },
        { label: 'Offer', value: 'Refill bundle + quote support' },
      ],
      previewTitle: 'Message draft preview',
      previewBody: `Subject: Restock ${launchProductName}\n\nYour team can restock ${launchProductName} this week with creator proof, bundle pricing, and fast RFQ support.\n\nCTA: Request bundle quote`,
      checklist: ['Seller reviews copy', 'CRM suppresses converted buyers', 'Send window: today 15:00 JST'],
      buttonLabel: 'Create draft',
      doneLabel: 'Message draft created',
      result: 'Local message draft created for seller approval. Nothing was sent externally.',
      statusAfter: 'drafted',
      icon: <Send className="size-5" />,
      nextSystem: 'CRM Compact',
    },
    {
      id: 'campaign-paid-social-adset',
      stage: '02',
      kind: 'Ad set',
      title: 'Queue paid ad set for social + marketplace',
      plainGoal: 'Create a ready-to-review ad set from the approved launch route.',
      channel: 'TikTok + Instagram + Rakuten',
      audience: primaryCampaign?.targetSegment || 'JP stationery buyers',
      owner: 'Performance - Ken Mori',
      signal: `${formatCompactCount(totalReach)} reachable signals are available now.`,
      setup: [
        { label: 'Budget', value: currency.format(Math.round(totalSpend * 0.32)) },
        { label: 'CTA', value: 'Ask for quote / View product' },
        { label: 'Guardrail', value: stockGuardrail },
      ],
      previewTitle: 'Ad set setup',
      previewBody: `Creative hook: Premium notebook refill bundle for teams that reorder monthly.\nAudience: ${primaryCampaign?.targetSegment || 'B2B buyers'}\nPlacement: TikTok feed, Instagram Reels, Rakuten sponsored slot.`,
      checklist: ['Use creator proof image', 'Cap budget until stock task is clear', 'Track leads, RFQs, orders'],
      buttonLabel: 'Queue ad set',
      doneLabel: 'Ad set queued',
      result: 'Local ad set queued with budget, audience, hook, and stock guardrail.',
      statusAfter: 'queued',
      icon: <Megaphone className="size-5" />,
      nextSystem: 'Campaign Ops',
    },
    {
      id: 'campaign-seo-marketplace-content',
      stage: '03',
      kind: 'SEO content',
      title: 'Create SEO + marketplace content brief',
      plainGoal: 'Turn the trend route into searchable content and marketplace copy.',
      channel: 'SEO + marketplace content',
      audience: 'Search buyers comparing premium stationery',
      owner: 'Content - Mai Sato',
      signal: `${launchProductName} is the clearest product route from Intelligence and live demand.`,
      setup: [
        { label: 'Primary keyword', value: 'premium notebook refill Japan' },
        { label: 'Content type', value: 'Article + marketplace module' },
        { label: 'CTA', value: 'Request bundle quote' },
      ],
      previewTitle: 'Content brief',
      previewBody: `Title: Best premium desk refill bundle for Japanese office teams\nKeywords: black hardcover notebook, craft paper refill, B2B stationery Japan\nSections: problem, product proof, creator proof, RFQ CTA.`,
      checklist: ['Attach product images', 'Mention creator proof', 'Link to marketplace listing'],
      buttonLabel: 'Create brief',
      doneLabel: 'Content brief created',
      result: 'SEO and marketplace content brief drafted locally.',
      statusAfter: 'drafted',
      icon: <PenLine className="size-5" />,
      nextSystem: 'Content Ops',
    },
    {
      id: 'campaign-inventory-topup',
      stage: '04',
      kind: 'Stock task',
      title: 'Create stock top-up task for trend SKU',
      plainGoal: 'Make Ecom increase stock before paid demand scales further.',
      channel: 'Ecom inventory handoff',
      audience: 'Ecom Ops + Warehouse',
      owner: 'Ecom Ops - Mika Sato',
      signal: `Forecast guardrail: ${stockGuardrail}.`,
      setup: [
        { label: 'SKU', value: launchRoute },
        { label: 'Request', value: `Add ${replenishmentUnits} units` },
        { label: 'Reason', value: 'Trend + campaign route ready' },
      ],
      previewTitle: 'Inventory task',
      previewBody: `Create replenishment task for ${launchRoute}.\nRequested units: ${replenishmentUnits}.\nReason: Intelligence trend is ready, but stock risk must stay visible before broader paid scale.`,
      checklist: ['Assign warehouse owner', 'Confirm inbound date', 'Notify Campaign Ops if delayed'],
      buttonLabel: 'Create task',
      doneLabel: 'Stock task assigned',
      result: 'Stock top-up task assigned locally to Ecom Ops.',
      statusAfter: 'assigned',
      icon: <PackagePlus className="size-5" />,
      nextSystem: 'Ecom Inventory',
    },
  ];

  const creatorActions: DemandExecutionAction[] = [
    {
      id: 'creator-book-kol-akira',
      stage: '01',
      kind: 'KOL booking',
      title: 'Book Akira Fujimoto for product proof',
      plainGoal: 'Reserve the creator slot that Intelligence says fits this product route.',
      channel: 'Instagram + short video',
      audience: 'JP premium stationery audience',
      owner: 'Creator Ops - Rina Kato',
      signal: 'Creator Intelligence shows strong JP relevance for the notebook route.',
      setup: [
        { label: 'Creator', value: 'Akira Fujimoto' },
        { label: 'Fee placeholder', value: currency.format(180000) },
        { label: 'Deliverables', value: '1 reel, 1 carousel, 1 story' },
      ],
      previewTitle: 'KOL booking setup',
      previewBody: `Book Akira Fujimoto for ${launchProductName}.\nDeliverables: reel demo, carousel proof, story CTA.\nUsage: paid ad whitelisting and marketplace proof.`,
      checklist: ['Confirm availability', 'Send product sample', 'Attach usage rights'],
      buttonLabel: 'Open booking setup',
      doneLabel: 'KOL booking assigned',
      result: 'KOL booking task assigned locally with deliverables and product route.',
      statusAfter: 'assigned',
      icon: <CalendarCheck className="size-5" />,
      nextSystem: 'Creator Ops',
    },
    {
      id: 'creator-brief-proof-script',
      stage: '02',
      kind: 'Creator brief',
      title: 'Generate creator brief and proof script',
      plainGoal: 'Give the creator a concrete angle, shot list, CTA, and guardrail.',
      channel: 'Creator brief',
      audience: primaryCampaign?.targetSegment || 'B2B office teams',
      owner: 'Content Lead - Emi Kuroda',
      signal: 'Launch route needs creator proof before broader paid scale.',
      setup: [
        { label: 'Angle', value: 'Premium desk refill without overbuying' },
        { label: 'CTA', value: 'Ask seller for bundle pricing' },
        { label: 'Do not say', value: 'No unrealistic discount promise' },
      ],
      previewTitle: 'Creator brief',
      previewBody: `Shot list: cover close-up, paper texture, desk setup, refill bundle, RFQ CTA.\nMessage: professional desk upgrade with practical replenishment logic.`,
      checklist: ['Include product close-ups', 'Include RFQ CTA', 'Approve brand-safe wording'],
      buttonLabel: 'Create brief',
      doneLabel: 'Creator brief created',
      result: 'Creator proof brief drafted locally.',
      statusAfter: 'drafted',
      icon: <MessageCircle className="size-5" />,
      nextSystem: 'Creator Ops',
    },
    {
      id: 'creator-schedule-live',
      stage: '03',
      kind: 'Live commerce',
      title: 'Schedule livestream demo for the trend product',
      plainGoal: 'Convert creator attention into live buyer questions and RFQs.',
      channel: 'TikTok Live + marketplace link',
      audience: 'Desk setup buyers + procurement viewers',
      owner: 'Live Ops - Kenji Mori',
      signal: `${snapshot.socialStreams.length} live/social streams are already feeding buyer signals.`,
      setup: [
        { label: 'Slot', value: 'Friday 20:00 JST' },
        { label: 'Demo', value: 'Texture, bundle, RFQ flow' },
        { label: 'CTA', value: 'Save product + request quote' },
      ],
      previewTitle: 'Livestream plan',
      previewBody: `Run 20-minute product demo.\nSegments: product texture, desk setup, bundle economics, quote request.\nModerator captures RFQ questions into Lead Capture.`,
      checklist: ['Prepare sample kit', 'Pin marketplace link', 'Route chat questions to CRM'],
      buttonLabel: 'Queue livestream',
      doneLabel: 'Livestream queued',
      result: 'Livestream plan queued locally.',
      statusAfter: 'queued',
      icon: <Youtube className="size-5" />,
      nextSystem: 'Live Ops',
    },
    {
      id: 'creator-approve-asset-kit',
      stage: '04',
      kind: 'Asset kit',
      title: 'Approve product photos and ad captions',
      plainGoal: 'Package creator/product visuals so Campaign Ops can reuse them.',
      channel: 'Asset library',
      audience: 'Campaign Ops + marketplace team',
      owner: 'Creative QA - Yuna Park',
      signal: 'Demand needs reusable proof assets, not one-off creator posts.',
      setup: [
        { label: 'Assets', value: '6 stills, 3 creator frames, 2 banners' },
        { label: 'Caption', value: 'Premium notebook refill for teams' },
        { label: 'Usage', value: 'Ads + marketplace + SEO' },
      ],
      previewTitle: 'Asset approval kit',
      previewBody: `Approve visual kit for ${launchProductName}.\nIncludes product stills, creator proof frames, marketplace banners, and short captions for ads.`,
      checklist: ['Check cropping', 'Check SKU naming', 'Approve paid usage'],
      buttonLabel: 'Approve kit',
      doneLabel: 'Asset kit approved',
      result: 'Asset kit marked ready locally for Campaign Ops.',
      statusAfter: 'queued',
      icon: <Upload className="size-5" />,
      nextSystem: 'Asset Library',
    },
  ];

  const leadActions: DemandExecutionAction[] = [
    {
      id: 'lead-rfq-reply-draft',
      stage: '01',
      kind: 'RFQ reply',
      title: `Draft quote reply for ${topRfq?.requestedBy || topLead?.company || 'top buyer'}`,
      plainGoal: 'Create the reply while buyer intent is still hot.',
      channel: 'Email + RFQ portal',
      audience: topLead?.contact || 'Qualified buyer',
      owner: 'Sales Ops - Daisuke Ito',
      signal: topLead ? `${topLead.score} lead score from ${topLead.source}.` : 'Qualified RFQ is waiting for response.',
      setup: [
        { label: 'Buyer', value: topLead?.company || topRfq?.requestedBy || 'Qualified buyer' },
        { label: 'Quantity', value: String(topRfq?.quantity || 24) },
        { label: 'Product', value: launchProductName },
      ],
      previewTitle: 'RFQ reply draft',
      previewBody: `Thanks for your interest in ${launchProductName}.\nWe can support a ${topRfq?.quantity || 24}-unit quote with bundle pricing and delivery window confirmation.\nNext: confirm quantity and ship date.`,
      checklist: ['Attach price', 'Confirm delivery date', 'Assign sales owner'],
      buttonLabel: 'Create reply',
      doneLabel: 'RFQ reply drafted',
      result: 'RFQ reply draft created locally for seller review.',
      statusAfter: 'drafted',
      icon: <Mail className="size-5" />,
      nextSystem: 'RFQ Flow',
    },
    {
      id: 'lead-assign-sales-owner',
      stage: '02',
      kind: 'Owner assignment',
      title: 'Assign hot leads to sales owner',
      plainGoal: 'Give qualified intent one owner and one SLA.',
      channel: 'CRM Compact',
      audience: `${qualifiedLeads} qualified leads`,
      owner: 'Sales Lead - Mika Sato',
      signal: `${totalLeads} leads and ${totalRfqs} RFQs came from live Demand routes.`,
      setup: [
        { label: 'Owner', value: 'Mika Sato' },
        { label: 'SLA', value: 'First response within 2 hours' },
        { label: 'Priority', value: 'Score above 80 / RFQ sent' },
      ],
      previewTitle: 'Lead assignment',
      previewBody: `Assign qualified leads to Mika Sato.\nSLA: respond within 2 hours.\nPriority order: RFQ sent, repeat buyer, lead score above 80.`,
      checklist: ['Assign owner', 'Set SLA reminder', 'Send CRM handoff'],
      buttonLabel: 'Assign owner',
      doneLabel: 'Owner assigned',
      result: 'Qualified lead ownership assigned locally.',
      statusAfter: 'assigned',
      icon: <UserRoundCheck className="size-5" />,
      nextSystem: 'CRM Compact',
    },
    {
      id: 'lead-phone-followup',
      stage: '03',
      kind: 'Human follow-up',
      title: 'Queue phone/LINE follow-up for top buyer',
      plainGoal: 'Use human follow-up when intent is high enough.',
      channel: 'Phone + LINE',
      audience: topLead?.contact || 'Highest score buyer',
      owner: 'BDR - Mina Sato',
      signal: topLead?.lastTouch || 'Buyer visited pricing and product route.',
      setup: [
        { label: 'Talk track', value: 'Use case, quantity, delivery window' },
        { label: 'Fallback', value: 'Send LINE quote link' },
        { label: 'Source', value: topLead?.source || 'Campaign response' },
      ],
      previewTitle: 'Call task',
      previewBody: `Call buyer to confirm use case, quantity, delivery window, and whether creator proof helped.\nIf no answer, send LINE note with quote link and product route.`,
      checklist: ['Queue call', 'Prepare LINE fallback', 'Attach campaign source'],
      buttonLabel: 'Queue follow-up',
      doneLabel: 'Follow-up queued',
      result: 'Phone/LINE follow-up queued locally.',
      statusAfter: 'queued',
      icon: <Phone className="size-5" />,
      nextSystem: 'CRM Compact',
    },
    {
      id: 'lead-crm-sync',
      stage: '04',
      kind: 'CRM memory',
      title: 'Sync buyer context into CRM Compact',
      plainGoal: 'Save the demand context so the next touch is smarter.',
      channel: 'CRM Compact',
      audience: 'CRM customer memory',
      owner: 'CRM Ops - Hana Lee',
      signal: 'Demand gets smarter only if response history flows back into CRM memory.',
      setup: [
        { label: 'Fields', value: 'Source, product, RFQ, score, owner' },
        { label: 'Next SLA', value: '2-hour owner response' },
        { label: 'Customer record', value: topLead?.company || 'Qualified buyer' },
      ],
      previewTitle: 'CRM sync payload',
      previewBody: `Sync campaign source, product route, RFQ quantity, lead score, last touch, owner, and next SLA into CRM Compact.`,
      checklist: ['Create/update CRM record', 'Attach RFQ', 'Set next follow-up'],
      buttonLabel: 'Sync CRM',
      doneLabel: 'CRM sync queued',
      result: 'CRM sync task queued locally.',
      statusAfter: 'queued',
      icon: <HeartHandshake className="size-5" />,
      nextSystem: 'CRM Compact',
    },
  ];

  const retargetingActions: DemandExecutionAction[] = [
    {
      id: 'retarget-abandoned-cart-sequence',
      stage: '01',
      kind: 'Recovery sequence',
      title: 'Create abandoned-cart email/SMS sequence',
      plainGoal: 'Bring warm buyers back with proof and urgency.',
      channel: 'Email + SMS',
      audience: topPlay?.audience || 'Warm cart abandoners',
      owner: 'Lifecycle - Aiko Tanaka',
      signal: topPlay?.trigger || 'Cart and refill behavior is reappearing around the trend SKU.',
      setup: [
        { label: 'Step 1', value: 'Creator proof + reminder' },
        { label: 'Step 2', value: 'RFQ/help prompt' },
        { label: 'Step 3', value: 'Limited bundle incentive' },
      ],
      previewTitle: 'Recovery sequence',
      previewBody: `Email/SMS sequence for warm cart abandoners.\nStep 1: creator proof.\nStep 2: quote/help prompt.\nStep 3: bundle incentive.\nSuppress converted buyers and open service cases.`,
      checklist: ['Review copy', 'Set suppression', 'Queue 3-step cadence'],
      buttonLabel: 'Create sequence',
      doneLabel: 'Sequence created',
      result: 'Abandoned-cart sequence drafted locally with suppression rules.',
      statusAfter: 'drafted',
      icon: <Mail className="size-5" />,
      nextSystem: 'Lifecycle CRM',
    },
    {
      id: 'retarget-paid-audience',
      stage: '02',
      kind: 'Retargeting ad',
      title: 'Queue retargeting audience from product viewers',
      plainGoal: 'Use paid reach only on buyers who already showed intent.',
      channel: 'Meta + TikTok + Rakuten ads',
      audience: 'Product viewers + RFQ visitors',
      owner: 'Performance - Ken Mori',
      signal: `${formatCompactCount(totalTraffic)} product visits exist; recover the warmest slice first.`,
      setup: [
        { label: 'Audience', value: 'Viewed product, no order' },
        { label: 'Budget cap', value: currency.format(Math.round(totalSpend * 0.18)) },
        { label: 'Creative', value: 'Creator proof + quote CTA' },
      ],
      previewTitle: 'Retargeting setup',
      previewBody: `Build audience from ${launchProductName} viewers with no order and no open service case.\nCreative: creator proof plus stock/quote CTA.`,
      checklist: ['Import audience', 'Attach creative', 'Apply suppression'],
      buttonLabel: 'Queue audience',
      doneLabel: 'Retargeting queued',
      result: 'Paid retargeting audience queued locally with guardrails.',
      statusAfter: 'queued',
      icon: <Target className="size-5" />,
      nextSystem: 'Ads Manager',
    },
    {
      id: 'retarget-promo-push',
      stage: '03',
      kind: 'Offer',
      title: 'Create bundle incentive for repeat buyers',
      plainGoal: 'Close repeat demand without training buyers to wait for discounts.',
      channel: 'Owned promo push',
      audience: 'Repeat replenishment customers',
      owner: 'Growth - Yuki Mori',
      signal: `${projectedLift}% projected lift from available activation plays.`,
      setup: [
        { label: 'Offer', value: 'Bundle shipping support above 24 units' },
        { label: 'Window', value: '7 days' },
        { label: 'Guardrail', value: 'Hide from converted buyers' },
      ],
      previewTitle: 'Promo setup',
      previewBody: `Create 7-day bundle incentive for repeat replenishment customers.\nOffer: shipping support above 24 units.\nGuardrail: no blast to converted or high-risk service cases.`,
      checklist: ['Approve margin', 'Apply audience filters', 'Send to CRM'],
      buttonLabel: 'Create offer',
      doneLabel: 'Promo push created',
      result: 'Promo push drafted locally for approval.',
      statusAfter: 'drafted',
      icon: <BellRing className="size-5" />,
      nextSystem: 'Lifecycle CRM',
    },
    {
      id: 'retarget-suppression-rules',
      stage: '04',
      kind: 'Suppression',
      title: 'Enable suppression rules before outreach',
      plainGoal: 'Make retargeting persistent without becoming spammy.',
      channel: 'CRM + Ads suppression',
      audience: 'Converted buyers, open cases, live RFQs',
      owner: 'Ops QA - Sora Ishikawa',
      signal: 'Outreach should stop when a buyer converts, opens a case, or gets an owner.',
      setup: [
        { label: 'Suppress', value: 'Converted, open ticket, assigned owner' },
        { label: 'Cooldown', value: '7 days after manual reply' },
        { label: 'Applies to', value: 'Email, SMS, ads, LINE' },
      ],
      previewTitle: 'Suppression rule setup',
      previewBody: `Rules: suppress converted buyers for 14 days, pause buyers with open ticket, stop paid retargeting once sales owner is assigned, cooldown 7 days after manual reply.`,
      checklist: ['Enable CRM rule', 'Sync ad exclusions', 'Monitor exceptions'],
      buttonLabel: 'Enable rules',
      doneLabel: 'Guardrails enabled',
      result: 'Suppression guardrails enabled locally.',
      statusAfter: 'queued',
      icon: <ClipboardList className="size-5" />,
      nextSystem: 'CRM + Ads',
    },
  ];

  const getActionStatus = (action: DemandExecutionAction) => actionStatuses[action.id] ?? 'ready';
  const activeActions = towerId === 'content-creator-ops'
    ? creatorActions
    : towerId === 'lead-response-capture'
      ? leadActions
      : towerId === 'retargeting-outreach'
        ? retargetingActions
        : campaignActions;
  const recommendedAction = activeActions[0];
  const doneCount = activeActions.filter((action) => getActionStatus(action) !== 'ready').length;

  const pageCopy = {
    'campaign-ops': {
      eyebrow: 'Campaign command center',
      title: 'Pick one seller action and open its setup.',
      description: 'PrimeOS turns the Intelligence route into messages, ads, SEO content, or stock tasks. The details open in a setup popup so this screen stays simple.',
      actionTitle: 'Demand actions',
      actionDescription: 'Four complete execution paths generated from the current Intelligence route.',
      nextHref: '/demand/lead-response-capture',
      nextLabel: 'Open Lead Capture',
    },
    'content-creator-ops': {
      eyebrow: 'Creator command center',
      title: 'Book proof, brief it, schedule it, then reuse it.',
      description: 'The seller can book a KOL, generate the brief, queue a livestream, or approve the asset kit from one compact workspace.',
      actionTitle: 'Creator actions',
      actionDescription: 'Creator work becomes reusable proof for ads, marketplace pages, and SEO.',
      nextHref: '/demand/campaign-ops',
      nextLabel: 'Send Proof To Campaign Ops',
    },
    'lead-response-capture': {
      eyebrow: 'Lead command center',
      title: 'Turn every response into a buyer task.',
      description: 'Draft replies, assign owners, queue phone/LINE follow-up, and sync context into CRM without hunting through a table.',
      actionTitle: 'Lead actions',
      actionDescription: 'Each response gets a next action, owner, SLA, and CRM memory.',
      nextHref: '/customer/crm-compact',
      nextLabel: 'Open CRM Compact',
    },
    'retargeting-outreach': {
      eyebrow: 'Recovery command center',
      title: 'Recover warm buyers without spamming them.',
      description: 'Create sequences, retargeting audiences, offers, and suppression rules from the same Intelligence-backed route.',
      actionTitle: 'Recovery actions',
      actionDescription: 'Warm buyer behavior becomes a safe follow-up sequence.',
      nextHref: '/customer/crm-compact',
      nextLabel: 'Open CRM Memory',
    },
  }[towerId] ?? {
    eyebrow: 'Demand command center',
    title: 'Move the Intelligence route into execution.',
    description: 'Demand coordinates messages, ads, content, creator proof, lead response, retargeting, and stock guardrails.',
    actionTitle: 'Demand actions',
    actionDescription: 'Concrete seller actions generated from the current Intelligence route.',
    nextHref: '/demand/campaign-ops',
    nextLabel: 'Open Campaign Ops',
  };

  const renderProductSignal = () => (
    <div className="rounded-3xl border bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
          {primaryProductImage ? (
            <img src={primaryProductImage} alt={launchProductName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Badge variant="secondary" className="rounded-full bg-background/80">From Intelligence</Badge>
          <div className="mt-2 line-clamp-2 text-base font-semibold">{launchProductName}</div>
          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{launchRoute}</div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border bg-background/75 p-3 text-sm">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Why now</div>
        <p className="mt-1 font-medium">{topPlay?.trigger || 'Buyer signal and creator proof are aligned.'}</p>
      </div>
    </div>
  );

  const renderSystemFlow = () => (
    <div className="grid gap-2 md:grid-cols-4">
      {[
        ['1', 'Intelligence finds route', 'Trend, creator proof, SKU guardrail'],
        ['2', 'Seller picks action', 'Message, ad, KOL, RFQ, stock task'],
        ['3', 'PrimeOS opens setup', 'Seed copy, owner, audience, channel'],
        ['4', 'Queue or assign', 'Local task moves to next system'],
      ].map(([step, title, detail]) => (
        <div key={step} className="rounded-2xl border bg-muted/20 p-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{step}</div>
          <div className="mt-2 text-sm font-semibold">{title}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      ))}
    </div>
  );

  const renderHero = () => (
    <Card className="overflow-hidden rounded-lg border shadow-sm">
      <CardContent className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-stretch">
        {renderProductSignal()}
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <Badge variant="outline" className="w-fit">{pageCopy.eyebrow}</Badge>
            <CardTitle className="mt-3 text-3xl leading-tight">{pageCopy.title}</CardTitle>
            <p className="mt-2 max-w-3xl text-base text-muted-foreground">{pageCopy.description}</p>
          </div>
          {renderSystemFlow()}
        </div>
      </CardContent>
    </Card>
  );

  const renderRecommendedAction = () => {
    const status = getActionStatus(recommendedAction);
    return (
      <Card className="rounded-lg border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Recommended now</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Start with this action. Open setup to review seed data before queueing anything.</p>
            </div>
            <Badge variant={statusToneMap[status]}>{statusLabel[status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-3xl border bg-primary/5 p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-background text-primary">{recommendedAction.icon}</div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{recommendedAction.kind}</div>
              <div className="mt-1 text-xl font-semibold">{recommendedAction.title}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendedAction.plainGoal}</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <RuntimeContextCard label="Audience" value={recommendedAction.audience} detail="Who this action reaches." />
            <RuntimeContextCard label="Channel" value={recommendedAction.channel} detail="Where the action will run." />
            <RuntimeContextCard label="Owner" value={recommendedAction.owner} detail="Who owns the next step." />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1 justify-between" onClick={() => setSelectedAction(recommendedAction)}>
              Open setup
              <ArrowRight className="size-4" />
            </Button>
            <Button asChild variant="outline" className="flex-1 justify-between">
              <Link to={pageCopy.nextHref}>{pageCopy.nextLabel}<ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderActionList = () => (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{pageCopy.actionTitle}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{pageCopy.actionDescription}</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">{doneCount}/{activeActions.length} queued</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
        {activeActions.map((action) => {
          const status = getActionStatus(action);
          return (
            <button
              key={action.id}
              type="button"
              className="group flex h-full min-h-[300px] flex-col rounded-3xl border bg-background p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
              onClick={() => setSelectedAction(action)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary">{action.icon}</div>
                <Badge variant={statusToneMap[status]} className="shrink-0 rounded-full px-3">{statusLabel[status]}</Badge>
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{action.stage} · {action.kind}</div>
              <div className="mt-2 min-h-[3.5rem] text-lg font-semibold leading-tight">
                <span className="line-clamp-2">{action.title}</span>
              </div>
              <p className="mt-2 min-h-[3rem] line-clamp-2 text-sm leading-6 text-muted-foreground">{action.plainGoal}</p>
              <div className="mt-4 grid gap-2 text-xs">
                <div className="min-w-0 rounded-2xl border bg-muted/20 px-3 py-2">
                  <div className="uppercase tracking-[0.12em] text-muted-foreground">Channel</div>
                  <div className="mt-1 truncate font-medium">{action.channel}</div>
                </div>
                <div className="min-w-0 rounded-2xl border bg-muted/20 px-3 py-2">
                  <div className="uppercase tracking-[0.12em] text-muted-foreground">Owner</div>
                  <div className="mt-1 truncate font-medium">{action.owner}</div>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 text-sm font-medium text-primary">
                <span>Open setup</span>
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );

  const renderQueueAndProof = () => (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
      <Card className="rounded-lg border">
        <CardHeader className="pb-3">
          <CardTitle>Local execution queue</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">This demo creates local drafts/tasks only. It does not send email, SMS, ads, or social posts externally.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {executionLog.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Open an action setup, review the mock seed, then queue it. The result will appear here.
            </div>
          ) : executionLog.map((item) => (
            <div key={item.id} className="rounded-2xl border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.result}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{item.at}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Owner: {item.owner}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg border">
        <CardHeader className="pb-3">
          <CardTitle>Execution proof</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Enough proof to act, not a dashboard to interpret.</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <RuntimeContextCard label="Reach" value={formatCompactCount(totalReach)} detail="Traffic plus social/content signals." />
          <RuntimeContextCard label="Lead proof" value={`${totalLeads} / ${totalRfqs}`} detail="Leads and RFQs captured." />
          <RuntimeContextCard label="Revenue proof" value={`${totalOrders} orders`} detail={`${currency.format(totalRevenue)} at ${roas} ROAS.`} />
          <RuntimeContextCard label="Stock" value={stockGuardrail} detail="Guardrail before scale." />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderHero()}
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {renderRecommendedAction()}
        {renderActionList()}
      </div>
      {renderQueueAndProof()}

      <Dialog open={Boolean(selectedAction)} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="max-h-[calc(100dvh-3rem)] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
          {selectedAction ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAction.title}</DialogTitle>
                <DialogDescription>{selectedAction.plainGoal}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <Card className="rounded-3xl border bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Setup summary</CardTitle>
                    <p className="text-sm text-muted-foreground">PrimeOS pre-fills this from Intelligence, COS, CRM, and Demand signals.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl border bg-background p-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary">{selectedAction.icon}</div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{selectedAction.kind}</div>
                        <div className="mt-1 font-semibold">{selectedAction.channel}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Next system: {selectedAction.nextSystem}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <RuntimeContextCard label="Audience" value={selectedAction.audience} detail="Target selected from current route." />
                      <RuntimeContextCard label="Owner" value={selectedAction.owner} detail="Person or team accountable." />
                    </div>
                    <div className="rounded-2xl border bg-background p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Intelligence signal</div>
                      <p className="mt-2 text-sm leading-6">{selectedAction.signal}</p>
                    </div>
                    <div className="grid gap-2">
                      {selectedAction.setup.map((item) => (
                        <div key={`${selectedAction.id}-${item.label}`} className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-3 text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="max-w-[65%] text-right font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{selectedAction.previewTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground">Mock sub-screen preview. Seller reviews this before anything goes live.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border bg-background">
                          {primaryProductImage ? (
                            <img src={primaryProductImage} alt={launchProductName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImagePlus className="size-5" /></div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Route product</div>
                          <div className="font-semibold">{launchProductName}</div>
                        </div>
                      </div>
                      <p className="mt-4 whitespace-pre-line rounded-2xl border bg-background/75 p-3 text-sm leading-6 text-muted-foreground">{selectedAction.previewBody}</p>
                    </div>

                    <div className="grid gap-2">
                      {selectedAction.checklist.map((item, index) => (
                        <div key={`${selectedAction.id}-check-${item}`} className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-3 text-sm">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground">
                      Safety note: this button only creates a local mock draft/task in PrimeOS. It does not send messages, publish ads, book creators, or change inventory externally.
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setSelectedAction(null)}>Close</Button>
                <Button onClick={() => runDemandAction(selectedAction)}>
                  {selectedAction.buttonLabel}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntelligenceRuntimeLoadingState({ label }: { label: string }) {
  return (
    <Card className="rounded-lg border">
      <CardContent className="flex min-h-48 items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Finding the best {label} signals...</span>
      </CardContent>
    </Card>
  );
}

function IntelligenceRuntimeErrorState({ title }: { title: string }) {
  return (
    <Card className="rounded-lg border">
      <CardContent className="space-y-2 p-6">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">
          PrimeOS cannot read the signals right now. Check the local backend, then refresh this screen.
        </p>
      </CardContent>
    </Card>
  );
}

function IntelligenceRuntimeEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-lg border">
      <CardContent className="space-y-2 p-6">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatCompactCount(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function humanizeIntelligenceValue(value?: string) {
  if (!value) return 'Not set';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeRuntimeText(value?: string) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeRuntimeSku(value?: string) {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function runtimeSkuLabel(value?: string) {
  return value ? getSkuLabel(value) : 'SKU pending';
}

function runtimeSkuName(value?: string) {
  return value ? getSkuProductName(value) : 'Product pending';
}

function runtimeSkuCode(value?: string) {
  return value ? getSkuCodeValue(value) : 'SKU pending';
}

function findCampaignBySku(snapshot: PrimeSnapshot, skuCode?: string) {
  const normalizedSku = normalizeRuntimeSku(skuCode);
  if (!normalizedSku) return null;
  return snapshot.campaigns.find((campaign) => normalizeRuntimeSku(campaign.skuCode) === normalizedSku) ?? null;
}

function findForecastBySku(snapshot: PrimeSnapshot, skuCode?: string) {
  const normalizedSku = normalizeRuntimeSku(skuCode);
  if (!normalizedSku) return null;
  return snapshot.forecasts.find((forecast) => normalizeRuntimeSku(forecast.skuCode) === normalizedSku) ?? null;
}

function runtimeSkuMatches(left?: string, right?: string) {
  const normalizedLeft = normalizeRuntimeSku(left);
  const normalizedRight = normalizeRuntimeSku(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight || normalizedLeft.startsWith(normalizedRight) || normalizedRight.startsWith(normalizedLeft);
}

function findProductBySku(snapshot: PrimeSnapshot, skuCode?: string) {
  if (!skuCode) return null;
  return snapshot.products.find((product) => (
    runtimeSkuMatches(product.sku_code, skuCode)
    || product.skus.some((sku) => runtimeSkuMatches(sku.sku_code, skuCode))
  )) ?? null;
}

function findCreatorBySku(creators: IntelligenceCreatorRecord[] | undefined, skuCode?: string) {
  if (!skuCode) return null;
  return (creators ?? []).find((creator) => runtimeSkuMatches(creator.linkedSku, skuCode)) ?? null;
}

function extractRuntimeNumbers(value?: string) {
  return (value?.match(/\d[\d,.]*/g) ?? [])
    .map((item) => Number(item.replace(/,/g, '')))
    .filter((item) => Number.isFinite(item));
}

function RuntimeContextCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function CustomerPanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const crmCustomers = useMemo(() => snapshot.customers.map((customer, index) => {
    const lead = snapshot.leads.find((candidate) => candidate.customerId === customer.id) ?? null;
    const rfq = snapshot.rfqs.find((candidate) => candidate.customerId === customer.id) ?? null;
    const ticket = snapshot.tickets.find((candidate) => candidate.customerId === customer.id) ?? null;
    const campaign = lead
      ? snapshot.campaigns.find((candidate) => candidate.id === lead.campaignId) ?? null
      : snapshot.campaigns[index % Math.max(snapshot.campaigns.length, 1)] ?? null;
    const product = snapshot.products.find((candidate) => candidate.id === lead?.productId || candidate.id === campaign?.productId)
      ?? snapshot.products[index % Math.max(snapshot.products.length, 1)]
      ?? null;
    const owner = ['Hana Lee', 'Daisuke Ito', 'Mika Sato', 'Ken Mori', 'Aiko Tanaka'][index % 5];
    const score = Math.min(
      96,
      Math.max(42, 64 + customer.totalOrders * 7 + (customer.lifecycle === 'retention' ? 10 : 0) - (customer.lifecycle === 'at-risk' ? 18 : 0) + index * 3)
    );
    const nextFollowUp = customer.lifecycle === 'lead'
      ? 'Create RFQ reply'
      : customer.lifecycle === 'at-risk'
        ? 'Start recovery follow-up'
        : customer.totalOrders > 1
          ? 'Send replenishment offer'
          : 'Assign next order check';
    const segmentLabel = customer.segment || campaign?.targetSegment || 'Customer memory';
    const channel = lead?.source || campaign?.channel || (customer.lifecycle === 'at-risk' ? 'Email + LINE' : 'CRM Compact');
    const recommendedSku = campaign?.skuCode || lead?.skuId || getPrimarySkuCodeFromSnapshot(snapshot, product?.id) || 'SKU pending';

    return {
      customer,
      index,
      owner,
      lead,
      rfq,
      ticket,
      campaign,
      product,
      score,
      nextFollowUp,
      segmentLabel,
      channel,
      recommendedSku,
      imageUrl: crmCustomerImageUrl(index),
    };
  }), [snapshot]);
  const topCustomer = crmCustomers[0] ?? null;
  const [selectedCustomerId, setSelectedCustomerId] = useState(topCustomer?.customer.id ?? '');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const selectedCustomer = crmCustomers.find((record) => record.customer.id === selectedCustomerId) ?? topCustomer;

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

  const followUpCount = crmCustomers.filter((record) => record.customer.lifecycle !== 'retention').length;
  const atRiskCount = crmCustomers.filter((record) => record.customer.lifecycle === 'at-risk').length;
  const averageScore = crmCustomers.length ? Math.round(crmCustomers.reduce((sum, record) => sum + record.score, 0) / crmCustomers.length) : 0;

  return (
    <div className="space-y-4">
      {selectedCustomer ? (
        <Card className="overflow-hidden rounded-lg border">
          <CardHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_170px] xl:items-stretch">
              <CrmCustomerVisual record={selectedCustomer} className="xl:order-1" />
              <div className="min-w-0 xl:order-2">
                <Badge variant="outline">PrimeOS recommends</Badge>
                <CardTitle className="mt-3 text-2xl">Follow up with {selectedCustomer.customer.name}</CardTitle>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  CRM Compact turns buyer memory into one next action: {selectedCustomer.nextFollowUp.toLowerCase()} for {selectedCustomer.segmentLabel.toLowerCase()}, with owner, product route, service context, and demand source attached.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4 text-right shadow-sm xl:order-3">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Customer fit</div>
                <div className="mt-1 text-3xl font-semibold">{selectedCustomer.score}%</div>
                <Badge variant={runtimeStatusVariant(selectedCustomer.customer.lifecycle)} className="mt-2 capitalize">
                  {selectedCustomer.customer.lifecycle}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-4">
              <RuntimeContextCard label="Buyer memory" value={selectedCustomer.customer.company} detail={`${selectedCustomer.customer.totalOrders} orders · ${currency.format(selectedCustomer.customer.totalRevenue)}`} />
              <RuntimeContextCard label="Next action" value={selectedCustomer.nextFollowUp} detail={`Owner: ${selectedCustomer.owner}`} />
              <RuntimeContextCard label="Product route" value={getSkuLabel(selectedCustomer.recommendedSku)} detail={selectedCustomer.campaign?.name || selectedCustomer.customer.notes[0] || 'Product interest from CRM.'} />
              <RuntimeContextCard label="Channel" value={selectedCustomer.channel} detail={selectedCustomer.ticket ? `Service watch: ${selectedCustomer.ticket.subject}` : 'Ready for seller follow-up.'} />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-3">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next move</div>
              <div className="mt-2 text-sm font-medium">Open the customer profile, confirm the latest timeline, then create the follow-up or hand this customer back into Trends Intelligence.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setIsCustomerDialogOpen(true)}>
                Open customer profile
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/intelligence/trends">
                  Send to Trends Intelligence
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/demand/lead-response-capture">
                  Create follow-up
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="CRM records" value={crmCustomers.length} meta={`${followUpCount} records need a next touch.`} icon={<HeartHandshake className="size-5" />} tone="success" />
        <SummaryMetricCard label="Best customer fit" value={`${selectedCustomer?.score ?? 0}%`} meta={selectedCustomer?.customer.name || 'No customer selected'} icon={<Sparkles className="size-5" />} tone="info" />
        <SummaryMetricCard label="Average fit" value={`${averageScore}%`} meta="Blended lifecycle, revenue, order, and lead context." icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Risk watch" value={atRiskCount} meta="At-risk memories should trigger recovery, not another dashboard review." icon={<BellRing className="size-5" />} tone="purple" />
      </div>

      <Card className="rounded-lg border">
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Compare customer records</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Pick the buyer memory that needs action now. Profile opens the full customer context, like Creators.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsCustomerDialogOpen(true)}>
              Open recommended customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table variant="embedded">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Product route</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Fit</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crmCustomers.map((record) => (
                <TableRow key={record.customer.id} className={selectedCustomer?.customer.id === record.customer.id ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-3 text-left"
                      onClick={() => {
                        setSelectedCustomerId(record.customer.id);
                        setIsCustomerDialogOpen(true);
                      }}
                    >
                      <CrmCustomerAvatar record={record} />
                      <div className="flex min-w-0 flex-col">
                        <span>{record.customer.name}</span>
                        <span className="text-xs text-muted-foreground">{record.customer.company}</span>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={runtimeStatusVariant(record.customer.lifecycle)} className="capitalize">{record.customer.lifecycle}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{getSkuLabel(record.recommendedSku)}</div>
                      <div className="text-xs text-muted-foreground">{record.segmentLabel}</div>
                    </div>
                  </TableCell>
                  <TableCell>{record.owner}</TableCell>
                  <TableCell className="text-right">{record.score}%</TableCell>
                  <TableCell className="text-right">{currency.format(record.customer.totalRevenue)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomerId(record.customer.id);
                        setIsCustomerDialogOpen(true);
                      }}
                    >
                      Open profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCustomer ? (
        <CrmCustomerProfileDialog
          record={selectedCustomer}
          open={isCustomerDialogOpen}
          onOpenChange={setIsCustomerDialogOpen}
        />
      ) : null}
    </div>
  );
}

function getPrimarySkuCodeFromSnapshot(snapshot: PrimeSnapshot, productId?: string) {
  const campaign = snapshot.campaigns.find((candidate) => candidate.productId === productId);
  if (campaign?.skuCode) return campaign.skuCode;

  const forecast = snapshot.forecasts.find((candidate) => candidate.productId === productId);
  return forecast?.skuCode;
}

function crmCustomerImageUrl(index: number) {
  const images = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=240&q=80',
  ];

  return images[index % images.length];
}

function CrmCustomerAvatar({
  record,
  size = 'sm',
}: {
  record: {
    customer: PrimeSnapshot['customers'][number];
    imageUrl: string;
  };
  size?: 'sm' | 'lg' | 'xl';
}) {
  const dimension = size === 'xl' ? 'size-20' : size === 'lg' ? 'size-14' : 'size-8';

  return (
    <div className={`${dimension} overflow-hidden rounded-full border bg-muted/20 shadow-sm`}>
      <img src={record.imageUrl} alt={record.customer.name} className="h-full w-full object-cover" />
    </div>
  );
}

function CrmCustomerVisual({
  record,
  className = '',
}: {
  record: {
    customer: PrimeSnapshot['customers'][number];
    product: PrimeSnapshot['products'][number] | null;
    imageUrl: string;
    owner: string;
    nextFollowUp: string;
    recommendedSku: string;
  };
  className?: string;
}) {
  const productImage = record.product?.images?.[0];
  const productLabel = getSkuLabel(record.recommendedSku);

  return (
    <div className={`${className} relative min-h-[210px] overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10 p-4 shadow-sm`}>
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-8 size-28 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <CrmCustomerAvatar record={record} size="xl" />
        <div className="min-w-0 pt-1">
          <Badge variant="secondary" className="rounded-full bg-background/75">
            Customer memory
          </Badge>
          <div className="mt-3 truncate text-lg font-semibold">{record.customer.name}</div>
          <div className="text-xs text-muted-foreground">{record.owner} owns next touch</div>
        </div>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-2xl border bg-background/80 shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/30">
            {productImage ? (
              <img src={productImage} alt={productLabel} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImagePlus className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Product route</div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold">{productLabel}</div>
          </div>
        </div>
      </div>
      <div className="relative mt-3 rounded-2xl border bg-background/80 p-3 text-xs text-muted-foreground shadow-sm">
        <span className="font-medium text-foreground">{record.nextFollowUp}</span> from CRM memory.
      </div>
    </div>
  );
}

function CrmCustomerProfileDialog({
  record,
  open,
  onOpenChange,
}: {
  record: {
    customer: PrimeSnapshot['customers'][number];
    product: PrimeSnapshot['products'][number] | null;
    campaign: PrimeSnapshot['campaigns'][number] | null;
    lead: PrimeSnapshot['leads'][number] | null;
    rfq: PrimeSnapshot['rfqs'][number] | null;
    ticket: PrimeSnapshot['tickets'][number] | null;
    imageUrl: string;
    owner: string;
    nextFollowUp: string;
    segmentLabel: string;
    channel: string;
    recommendedSku: string;
    score: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const productImage = record.product?.images?.[0];
  const productLabel = getSkuLabel(record.recommendedSku);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden rounded-3xl p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
          <DialogTitle>{record.customer.name}</DialogTitle>
          <DialogDescription>Customer profile, CRM memory, buyer context, and next-best follow-up guidance.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(100dvh-8rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
            <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
              <div className="flex flex-col gap-5">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                  <CrmCustomerAvatar record={record} size="lg" />
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words text-2xl font-semibold sm:text-3xl">{record.customer.name}</h3>
                      <Badge variant="outline">{record.customer.company}</Badge>
                      <Badge variant="outline" className="capitalize">{record.customer.lifecycle}</Badge>
                      <Badge variant="outline">{record.customer.b2bAccount}</Badge>
                    </div>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      CRM Compact keeps the buyer memory, service history, demand source, and next follow-up together so the seller knows exactly what to do next.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{record.segmentLabel}</Badge>
                      <Badge variant="outline">Customer fit {record.score}%</Badge>
                      <Badge variant="outline">Owner {record.owner}</Badge>
                      <Badge variant="outline">Product {productLabel}</Badge>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-3 text-sm">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best next action</div>
                      <div className="mt-2 font-medium">{record.nextFollowUp}</div>
                      <div className="mt-1 text-muted-foreground">Use {record.channel} and keep the buyer attached to {productLabel.toLowerCase()} before the next Demand or Intelligence handoff.</div>
                    </div>
                  </div>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
                  <Button asChild className="w-full whitespace-nowrap sm:w-auto">
                    <Link to="/demand/lead-response-capture">Create follow-up</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full whitespace-nowrap sm:w-auto">
                    <Link to="/intelligence/trends">Send to Trends</Link>
                  </Button>
                </div>
              </div>
            </div>
            <Card className="rounded-2xl border bg-muted/10 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customer snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-hidden rounded-2xl border bg-background">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/30">
                      {productImage ? (
                        <img src={productImage} alt={productLabel} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImagePlus className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Product route</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold">{productLabel}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{record.recommendedSku}</div>
                    </div>
                  </div>
                </div>
                <RuntimeContextCard label="Revenue" value={currency.format(record.customer.totalRevenue)} detail={`${record.customer.totalOrders} orders in CRM memory`} />
                <RuntimeContextCard label="Lead / RFQ" value={record.lead?.status || record.rfq?.status || 'No open RFQ'} detail={record.rfq ? `${record.rfq.quantity} units · ${currency.format(record.rfq.value)}` : record.lead?.lastTouch || 'No RFQ attached yet'} />
                <RuntimeContextCard label="Service" value={record.ticket?.status || 'No open ticket'} detail={record.ticket?.subject || 'No service blocker on this customer.'} />
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="h-auto max-w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="route">Demand route</TabsTrigger>
              <TabsTrigger value="service">Service / RFQ</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricPill label="Customer fit" value={`${record.score}%`} />
                <MetricPill label="Revenue" value={currency.format(record.customer.totalRevenue)} />
                <MetricPill label="Orders" value={`${record.customer.totalOrders}`} />
                <MetricPill label="Lifecycle" value={record.customer.lifecycle} />
              </div>
              <Card className="rounded-lg border">
                <CardHeader>
                  <CardTitle className="text-base">Customer memory</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <RuntimeContextCard label="Company" value={record.customer.company} detail={record.customer.email} />
                  <RuntimeContextCard label="Segment" value={record.segmentLabel} detail={record.customer.b2bAccount} />
                  <RuntimeContextCard label="Owner" value={record.owner} detail={record.nextFollowUp} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3">
              <Card className="rounded-lg border">
                <CardHeader>
                  <CardTitle className="text-base">Relationship timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {record.customer.timeline.slice(0, 6).map((entry, index) => (
                    <div key={`${record.customer.id}-timeline-${entry}`} className="flex items-start gap-3 rounded-2xl border bg-muted/20 p-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold">{index + 1}</div>
                      <div className="text-sm text-muted-foreground">{entry}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="route" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <RuntimeContextCard label="Channel" value={record.channel} detail={record.campaign?.name || 'CRM-owned follow-up route'} />
                <RuntimeContextCard label="Product" value={productLabel} detail={record.recommendedSku} />
                <RuntimeContextCard label="Next action" value={record.nextFollowUp} detail={`Owner: ${record.owner}`} />
              </div>
              <Card className="rounded-lg border">
                <CardHeader>
                  <CardTitle className="text-base">Recommended message</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  Start from the latest CRM memory, reference {productLabel.toLowerCase()}, then ask whether {record.customer.company} wants replenishment, RFQ support, or a service recovery follow-up.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="service" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-base">RFQ / lead context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <RuntimeContextCard label="Lead status" value={record.lead?.status || 'No lead'} detail={record.lead?.source || 'No lead source attached'} />
                    <RuntimeContextCard label="RFQ" value={record.rfq?.status || 'No RFQ'} detail={record.rfq ? `${record.rfq.quantity} units · ${currency.format(record.rfq.value)}` : 'Create RFQ from Demand if buyer replies.'} />
                  </CardContent>
                </Card>
                <Card className="rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-base">Service memory</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <RuntimeContextCard label="Ticket" value={record.ticket?.status || 'Clear'} detail={record.ticket?.subject || 'No service blocker.'} />
                    <RuntimeContextCard label="SLA" value={record.ticket?.sla || 'Normal'} detail={record.ticket?.priority || 'No priority escalation.'} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatFinanceDate(value?: string) {
  if (!value) return 'Not scheduled';

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatFinanceCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not set';
  }

  return currency.format(value);
}

function readinessStatusPriority(status: string) {
  if (status === 'ready' || status === 'active') return 0;
  if (status === 'submitted') return 1;
  if (status === 'watch') return 2;
  if (status === 'closed' || status === 'paused') return 3;
  return 4;
}

function offerStatusPriority(status: string) {
  if (status === 'active') return 0;
  if (status === 'onboarding') return 1;
  if (status === 'watch') return 2;
  return 3;
}

function riskSeverityPriority(severity: string) {
  if (severity === 'high') return 0;
  if (severity === 'medium') return 1;
  if (severity === 'low') return 2;
  return 3;
}

function settlementStatusPriority(status: string) {
  if (status === 'overdue') return 0;
  if (status === 'collecting') return 1;
  if (status === 'scheduled') return 2;
  if (status === 'closed') return 3;
  return 4;
}

function matchFinanceRecordByMarket<T extends { market: string }>(records: T[], market?: string) {
  if (!market) return null;

  return records.find(
    (record) => normalizeRuntimeText(record.market) === normalizeRuntimeText(market)
  ) ?? null;
}

function matchRiskRecordByKeyword(records: RiskTrustRecord[], keyword?: string) {
  const normalizedKeyword = normalizeRuntimeText(keyword);
  if (!normalizedKeyword) return null;

  return records.find((record) =>
    [record.profileName, record.signalSource, record.topRisk].some((value) => {
      const normalizedValue = normalizeRuntimeText(value);
      return normalizedValue.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedValue);
    })
  ) ?? null;
}

function matchFinanceRecordByKeyword<T>(
  records: T[],
  keyword: string | undefined,
  selectors: Array<(record: T) => string | undefined>
) {
  const normalizedKeyword = normalizeRuntimeText(keyword);
  if (!normalizedKeyword) return null;

  return records.find((record) =>
    selectors.some((selector) => {
      const normalizedValue = normalizeRuntimeText(selector(record));
      return normalizedValue.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedValue);
    })
  ) ?? null;
}

function financePercent(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function FinanceScoreRing({
  value,
  label,
  caption,
  tone = 'primary',
}: {
  value: number;
  label: string;
  caption: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const score = financePercent(value);
  const stroke = {
    primary: 'hsl(var(--primary))',
    success: 'hsl(var(--chart-2))',
    warning: 'hsl(var(--chart-4))',
    danger: 'hsl(var(--destructive))',
  }[tone];
  const circumference = 2 * Math.PI * 44;
  const dash = (score / 100) * circumference;

  return (
    <div className="rounded-3xl border bg-background/80 p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 112 112" className="size-28 -rotate-90">
            <circle cx="56" cy="56" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
            <circle
              cx="56"
              cy="56"
              r="44"
              fill="none"
              stroke={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
              strokeWidth="12"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">{score}%</div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{caption}</p>
        </div>
      </div>
    </div>
  );
}

function FinanceBarStack({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; detail: string; tone?: 'primary' | 'success' | 'warning' | 'danger' }>;
}) {
  const toneClass = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };

  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="font-semibold">{financePercent(item.value)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${toneClass[item.tone ?? 'primary']}`} style={{ width: `${financePercent(item.value)}%` }} />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FinanceMiniFlow({
  title,
  steps,
}: {
  title: string;
  steps: Array<{ label: string; value: string; icon?: ReactNode }>;
}) {
  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={`${step.label}-${index}`} className="rounded-3xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl border bg-background text-primary">
                  {step.icon ?? <CircleDollarSign className="size-5" />}
                </div>
                <Badge variant="outline" className="rounded-full">{index + 1}</Badge>
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{step.label}</div>
              <div className="mt-2 text-sm font-semibold leading-6">{step.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceRouteSelector<T extends { id: string }>({
  title,
  description,
  rows,
  selectedId,
  onSelect,
  getTitle,
  getMeta,
  getScore,
  getStatus,
}: {
  title: string;
  description: string;
  rows: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  getTitle: (row: T) => string;
  getMeta: (row: T) => string;
  getScore: (row: T) => number;
  getStatus: (row: T) => string;
}) {
  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {rows.slice(0, 4).map((row) => {
          const isSelected = row.id === selectedId;
          const score = financePercent(getScore(row));
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`rounded-3xl border p-4 text-left transition hover:border-primary/40 ${isSelected ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-background'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-1 font-semibold">{getTitle(row)}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{getMeta(row)}</p>
                </div>
                <Badge variant={isSelected ? 'default' : 'outline'} className="shrink-0 capitalize">{humanizeIntelligenceValue(getStatus(row))}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={score} className="h-2" />
                <span className="w-10 text-right text-sm font-semibold">{score}%</span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CompactCapitalReadinessRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: FinanceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const readinessRows = useMemo(
    () => [...(data?.capitalReadiness ?? [])].sort((left, right) => {
      const priorityDelta = readinessStatusPriority(left.status) - readinessStatusPriority(right.status);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return right.readinessScore - left.readinessScore;
    }),
    [data]
  );
  const topRow = readinessRows[0] ?? null;
  const [selectedRowId, setSelectedRowId] = useState('');

  useEffect(() => {
    if (!topRow) {
      if (selectedRowId) {
        setSelectedRowId('');
      }
      return;
    }

    if (!readinessRows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(topRow.id);
    }
  }, [readinessRows, selectedRowId, topRow]);

  if (isLoading) {
    return <IntelligenceRuntimeLoadingState label="finance readiness" />;
  }

  if (error) {
    return <IntelligenceRuntimeErrorState title="Capital readiness is unavailable" />;
  }

  if (!topRow) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No capital readiness rows are available yet"
        description="Admin has not published any capital readiness programs into the finance control plane."
      />
    );
  }

  const selectedRow = readinessRows.find((row) => row.id === selectedRowId) ?? topRow;
  const readyCount = readinessRows.filter((row) => ['ready', 'active'].includes(row.status) || row.readinessScore >= 80).length;
  const totalFundingNeed = readinessRows.reduce((sum, row) => sum + (row.fundingNeed ?? 0), 0);
  const averageReadiness = Math.round(readinessRows.reduce((sum, row) => sum + row.readinessScore, 0) / readinessRows.length);
  const matchingCampaign = findCampaignBySku(snapshot, selectedRow.linkedSku);
  const matchingForecast = findForecastBySku(snapshot, selectedRow.linkedSku);
  const relatedRisk = matchRiskRecordByKeyword(data?.riskTrust ?? [], selectedRow.market);

  const inventoryScore = matchingForecast
    ? financePercent(100 - Math.max(0, ((matchingForecast.demand7d - matchingForecast.ats) / Math.max(matchingForecast.demand7d, 1)) * 100))
    : 45;
  const demandScore = matchingCampaign ? financePercent(58 + matchingCampaign.orders * 4 + matchingCampaign.rfqs * 2) : 42;
  const crmScore = financePercent(Math.min(95, snapshot.metrics.leadToOrderRate + 52));
  const trustScore = relatedRisk?.trustScore ?? 68;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1fr_0.42fr]">
          <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">PrimeOS recommends</Badge>
              <Badge variant={selectedRow.readinessScore >= 80 ? 'default' : 'outline'} className="capitalize">{humanizeIntelligenceValue(selectedRow.status)}</Badge>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">Fund readiness: {selectedRow.programName}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{selectedRow.readinessReason || 'This route has enough operating proof to move into offer review.'}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <RuntimeContextCard label="Funding need" value={formatFinanceCurrency(selectedRow.fundingNeed)} detail={`Owner: ${selectedRow.owner}`} />
              <RuntimeContextCard label="Launch route" value={selectedRow.linkedLaunch || 'Pending'} detail={runtimeSkuLabel(selectedRow.linkedSku)} />
              <RuntimeContextCard label="Next review" value={formatFinanceDate(selectedRow.nextReview)} detail="Finance checkpoint before offer pricing." />
            </div>
          </div>
          <FinanceScoreRing value={selectedRow.readinessScore} label="Capital readiness" caption="One score from launch proof, demand signal, inventory guardrail, and trust posture." tone={selectedRow.readinessScore >= 80 ? 'success' : 'warning'} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FinanceRouteSelector<CapitalReadinessRecord>
          title="Routes to finance"
          description="Pick the launch route. The chart updates to show whether money should scale it now."
          rows={readinessRows}
          selectedId={selectedRow.id}
          onSelect={setSelectedRowId}
          getTitle={(row) => row.programName}
          getMeta={(row) => `${row.market} · ${formatFinanceCurrency(row.fundingNeed)} · ${row.linkedLaunch || 'Launch pending'}`}
          getScore={(row) => row.readinessScore}
          getStatus={(row) => row.status}
        />
        <FinanceBarStack
          title="Funding proof chart"
          subtitle="Simple enough for the seller: green means finance can trust the route, amber means fix before scaling."
          items={[
            { label: 'Demand proof', value: demandScore, detail: matchingCampaign ? `${matchingCampaign.leads} leads, ${matchingCampaign.rfqs} RFQs, ${matchingCampaign.orders} orders attached.` : 'Demand proof still needs Campaign Ops data.', tone: 'success' },
            { label: 'Inventory guardrail', value: inventoryScore, detail: matchingForecast ? `${matchingForecast.ats} ATS vs ${matchingForecast.demand7d} forecast demand.` : 'No inventory forecast is attached yet.', tone: inventoryScore < 55 ? 'warning' : 'success' },
            { label: 'CRM repayment quality', value: crmScore, detail: `${currency.format(snapshot.metrics.revenue)} revenue and ${snapshot.metrics.leadToOrderRate}% lead-to-order context.`, tone: 'primary' },
            { label: 'Risk trust', value: trustScore, detail: relatedRisk?.topRisk || 'Risk lane still needs clearer lender-facing proof.', tone: trustScore < 75 ? 'warning' : 'success' },
          ]}
        />
      </div>

      <FinanceMiniFlow
        title="Why this can move"
        steps={[
          { label: 'Intelligence', value: selectedRow.linkedLaunch || 'Approved launch route', icon: <Sparkles className="size-5" /> },
          { label: 'Demand', value: matchingCampaign ? `${matchingCampaign.name} is producing buyer proof` : 'Demand proof pending', icon: <Megaphone className="size-5" /> },
          { label: 'Finance', value: `${formatFinanceCurrency(totalFundingNeed)} total need across ${readinessRows.length} routes`, icon: <CircleDollarSign className="size-5" /> },
          { label: 'Next', value: readyCount > 0 ? 'Price the cleanest offer' : 'Clear the biggest blocker first', icon: <ArrowRight className="size-5" /> },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/finance/capital-offers">Open Capital Offers</Link></Button>
        <Button asChild variant="outline"><Link to="/finance/risk-trust">Open Risk &amp; Trust</Link></Button>
      </div>
    </div>
  );
}

function CompactCapitalOffersRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: FinanceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const offers = useMemo(
    () => [...(data?.capitalOffers ?? [])].sort((left, right) => {
      const priorityDelta = offerStatusPriority(left.status) - offerStatusPriority(right.status);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return (right.amount ?? 0) - (left.amount ?? 0);
    }),
    [data]
  );
  const topOffer = offers[0] ?? null;
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [fundingRequest, setFundingRequest] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!topOffer) {
      if (selectedOfferId) {
        setSelectedOfferId('');
      }
      return;
    }

    if (!offers.some((offer) => offer.id === selectedOfferId)) {
      setSelectedOfferId(topOffer.id);
    }
  }, [offers, selectedOfferId, topOffer]);

  if (isLoading) {
    return <IntelligenceRuntimeLoadingState label="capital offers" />;
  }

  if (error) {
    return <IntelligenceRuntimeErrorState title="Capital offers are unavailable" />;
  }

  if (!topOffer) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No capital offers are available yet"
        description="Admin has not published partner offers into the finance control plane."
      />
    );
  }

  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) ?? topOffer;
  const totalOfferAmount = offers.reduce((sum, offer) => sum + (offer.amount ?? 0), 0);
  const averageFeeRate = offers.length
    ? (offers.reduce((sum, offer) => sum + (offer.feeRate ?? 0), 0) / offers.length).toFixed(1)
    : '0.0';
  const splitSettlementOffers = offers.filter((offer) => offer.repaymentModel === 'split_settlement').length;
  const relatedReadiness = matchFinanceRecordByMarket(data?.capitalReadiness ?? [], selectedOffer.market);
  const relatedRisk = matchRiskRecordByKeyword(data?.riskTrust ?? [], selectedOffer.market);
  const relatedSettlement = (data?.settlementRepayment ?? []).find(
    (facility) => normalizeRuntimeText(facility.collectionMode) === normalizeRuntimeText(selectedOffer.repaymentModel)
      || normalizeRuntimeText(facility.market) === normalizeRuntimeText(selectedOffer.market)
  ) ?? null;

  const maxOffer = Math.max(1, ...offers.map((offer) => offer.amount ?? 0));
  const offerFit = relatedReadiness?.readinessScore ?? (selectedOffer.status === 'active' ? 82 : 68);
  const canRequestFunding = offerFit >= 80 && selectedOffer.status === 'active';
  const createFundingRequest = () => {
    const nextRequest = canRequestFunding
      ? `Funding request prepared for ${formatFinanceCurrency(selectedOffer.amount)} from ${selectedOffer.providerName}. Use of funds: scale ${selectedOffer.linkedLaunch || 'the approved launch route'} while repayment runs through ${humanizeIntelligenceValue(selectedOffer.repaymentModel)}.`
      : `Eligibility prep created before funding request. Clear ${relatedRisk?.topRisk || 'the main trust blocker'} and confirm repayment route before applying for ${selectedOffer.offerName}.`;
    setFundingRequest(nextRequest);
    toast({
      title: canRequestFunding ? 'Funding request prepared' : 'Eligibility prep created',
      description: canRequestFunding ? 'Local mock request is ready for seller review.' : 'PrimeOS created the steps needed before asking for capital.',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1fr_0.42fr]">
          <div className="rounded-3xl border bg-gradient-to-br from-emerald-500/10 via-background to-primary/10 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">PrimeOS recommends</Badge>
              <Badge variant={selectedOffer.status === 'active' ? 'default' : 'outline'} className="capitalize">{humanizeIntelligenceValue(selectedOffer.status)}</Badge>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">{canRequestFunding ? 'Eligible for capital' : 'Prepare before capital'}: {selectedOffer.offerName}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              PrimeOS analyzes sales momentum, launch proof, repayment clarity, and trust before recommending whether the seller should request funding.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <RuntimeContextCard label="Amount" value={formatFinanceCurrency(selectedOffer.amount)} detail={`${selectedOffer.termDays ?? 0} day term`} />
              <RuntimeContextCard label="Fee" value={`${selectedOffer.feeRate ?? 0}%`} detail={`${averageFeeRate}% average across offers`} />
              <RuntimeContextCard label="Repayment" value={humanizeIntelligenceValue(selectedOffer.repaymentModel)} detail={`${splitSettlementOffers} split-settlement lanes`} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={createFundingRequest}>
                {canRequestFunding ? 'Request funding' : 'Prepare eligibility'}
                <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="outline">
                <Link to="/finance/health">Check Finance Health</Link>
              </Button>
            </div>
          </div>
          <FinanceScoreRing value={offerFit} label="Offer fit" caption="Fit is based on readiness proof, repayment route, fee, and trust lane." tone={offerFit >= 80 ? 'success' : 'warning'} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FinanceRouteSelector<CapitalOffersRecord>
          title="Offers to compare"
          description="Pick one package. Amount and repayment logic should stay understandable at a glance."
          rows={offers}
          selectedId={selectedOffer.id}
          onSelect={setSelectedOfferId}
          getTitle={(offer) => offer.offerName}
          getMeta={(offer) => `${offer.providerName} · ${formatFinanceCurrency(offer.amount)} · ${humanizeIntelligenceValue(offer.repaymentModel)}`}
          getScore={(offer) => Math.round(((offer.amount ?? 0) / maxOffer) * 100)}
          getStatus={(offer) => offer.status}
        />
        <FinanceBarStack
          title="Offer economics chart"
          subtitle="The seller should see the tradeoff: money received, cost, repayment clarity, and trust."
          items={[
            { label: 'Funding size', value: Math.round(((selectedOffer.amount ?? 0) / maxOffer) * 100), detail: `${formatFinanceCurrency(totalOfferAmount)} total available across ${offers.length} offers.`, tone: 'success' },
            { label: 'Fee comfort', value: financePercent(100 - (selectedOffer.feeRate ?? 0) * 12), detail: `${selectedOffer.feeRate ?? 0}% fee rate over ${selectedOffer.termDays ?? 0} days.`, tone: (selectedOffer.feeRate ?? 0) > 3 ? 'warning' : 'success' },
            { label: 'Repayment clarity', value: relatedSettlement ? 88 : 58, detail: relatedSettlement ? `${relatedSettlement.facilityName} shows the collection path.` : 'Settlement route is not fully linked yet.', tone: relatedSettlement ? 'success' : 'warning' },
            { label: 'Trust posture', value: relatedRisk?.trustScore ?? 70, detail: relatedRisk?.topRisk || 'Risk lane pending.', tone: (relatedRisk?.trustScore ?? 70) < 75 ? 'warning' : 'success' },
          ]}
        />
      </div>

      <Dialog open={Boolean(fundingRequest)} onOpenChange={(open) => !open && setFundingRequest(null)}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{canRequestFunding ? 'Funding request draft' : 'Eligibility prep plan'}</DialogTitle>
            <DialogDescription>
              PrimeOS creates a local seller-ready action. Nothing is sent externally until the seller approves it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <RuntimeContextCard label="Offer" value={formatFinanceCurrency(selectedOffer.amount)} detail={selectedOffer.providerName} />
            <RuntimeContextCard label="Repayment" value={humanizeIntelligenceValue(selectedOffer.repaymentModel)} detail={relatedSettlement?.facilityName || 'Settlement route pending'} />
            <RuntimeContextCard label="Readiness" value={`${offerFit}%`} detail={canRequestFunding ? 'Eligible now' : 'Needs prep first'} />
          </div>
          <div className="rounded-2xl border bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
            {fundingRequest}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFundingRequest(null)}>Close</Button>
            <Button>{canRequestFunding ? 'Keep funding request' : 'Keep prep plan'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompactRiskTrustRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: FinanceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const riskRows = useMemo(
    () => [...(data?.riskTrust ?? [])].sort((left, right) => {
      const priorityDelta = riskSeverityPriority(left.severity) - riskSeverityPriority(right.severity);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return left.trustScore - right.trustScore;
    }),
    [data]
  );
  const topRisk = riskRows[0] ?? null;
  const [selectedRiskId, setSelectedRiskId] = useState('');
  const [avoidancePlan, setAvoidancePlan] = useState<string[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!topRisk) {
      if (selectedRiskId) {
        setSelectedRiskId('');
      }
      return;
    }

    if (!riskRows.some((row) => row.id === selectedRiskId)) {
      setSelectedRiskId(topRisk.id);
    }
  }, [riskRows, selectedRiskId, topRisk]);

  if (isLoading) {
    return <IntelligenceRuntimeLoadingState label="risk and eligibility" />;
  }

  if (error) {
    return <IntelligenceRuntimeErrorState title="Risk & trust is unavailable" />;
  }

  if (!topRisk) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No risk lanes are available yet"
        description="Admin has not published any risk and eligibility rows into the finance control plane."
      />
    );
  }

  const selectedRisk = riskRows.find((row) => row.id === selectedRiskId) ?? topRisk;
  const averageTrust = Math.round(riskRows.reduce((sum, row) => sum + row.trustScore, 0) / riskRows.length);
  const highSeverityCount = riskRows.filter((row) => row.severity === 'high').length;
  const activeFixes = riskRows.filter((row) => ['active', 'watch'].includes(row.status)).length;
  const relatedReadiness = matchFinanceRecordByKeyword(data?.capitalReadiness ?? [], selectedRisk.profileName, [
    (record) => record.programName,
    (record) => record.linkedLaunch,
    (record) => record.linkedSku,
    (record) => record.market,
  ]);
  const relatedOffer = matchFinanceRecordByKeyword(data?.capitalOffers ?? [], selectedRisk.profileName, [
    (record) => record.offerName,
    (record) => record.providerName,
    (record) => record.linkedLaunch,
    (record) => record.market,
  ]);
  const relatedSettlement = matchFinanceRecordByKeyword(data?.settlementRepayment ?? [], selectedRisk.profileName, [
    (record) => record.facilityName,
    (record) => record.disbursementTarget,
    (record) => record.repaymentSource,
    (record) => record.market,
  ]);
  const openServiceCases = snapshot.tickets.filter((ticket) => ticket.status !== 'resolved').length;

  const riskScore = 100 - selectedRisk.trustScore;
  const severityScore = selectedRisk.severity === 'high' ? 92 : selectedRisk.severity === 'medium' ? 62 : 32;
  const createAvoidancePlan = () => {
    const plan = [
      `Do not request more capital until ${selectedRisk.recommendedFix || 'the main eligibility blocker is cleared'}.`,
      relatedSettlement
        ? `Do not increase paid demand while ${formatFinanceCurrency(relatedSettlement.outstandingBalance)} remains exposed in ${relatedSettlement.facilityName}.`
        : 'Do not scale paid demand until repayment exposure is attached to a clear collection lane.',
      `Do not hide the risk: keep "${selectedRisk.topRisk || 'finance blocker'}" visible to the seller and owner ${selectedRisk.owner}.`,
    ];
    setAvoidancePlan(plan);
    toast({
      title: 'Eligibility guardrails created',
      description: 'PrimeOS listed what the seller should avoid before requesting more capital.',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1fr_0.42fr]">
          <div className="rounded-3xl border bg-gradient-to-br from-amber-500/10 via-background to-rose-500/10 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Watch first</Badge>
              <Badge variant={selectedRisk.severity === 'high' ? 'destructive' : 'outline'} className="capitalize">{humanizeIntelligenceValue(selectedRisk.severity)}</Badge>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">Eligibility blocker: {selectedRisk.profileName}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">This tab explains what could make the seller ineligible for capital, what to avoid, and which fix unlocks the next offer.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <RuntimeContextCard label="Fix owner" value={selectedRisk.owner} detail={selectedRisk.recommendedFix || 'Fix task pending.'} />
              <RuntimeContextCard label="Signal source" value={selectedRisk.signalSource || 'Pending'} detail="Where the concern came from." />
              <RuntimeContextCard label="Service pressure" value={`${openServiceCases} open`} detail={`${snapshot.returnsCount} returns also affect trust.`} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={createAvoidancePlan}>
                Recommend what to avoid
                <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="outline">
                <Link to="/finance/capital-offers">Recheck offers</Link>
              </Button>
            </div>
          </div>
          <FinanceScoreRing value={selectedRisk.trustScore} label="Eligibility score" caption="If eligibility is low, Finance should route the seller to fixes before more capital." tone={selectedRisk.trustScore >= 80 ? 'success' : selectedRisk.trustScore >= 70 ? 'warning' : 'danger'} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FinanceRouteSelector<RiskTrustRecord>
          title="Risk lanes"
          description="Pick a lane to see what blocks funding and who must clear it."
          rows={riskRows}
          selectedId={selectedRisk.id}
          onSelect={setSelectedRiskId}
          getTitle={(row) => row.profileName}
          getMeta={(row) => `${row.signalSource || 'Source pending'} · ${row.owner}`}
          getScore={(row) => row.trustScore}
          getStatus={(row) => row.severity}
        />
        <FinanceBarStack
          title="Risk pressure chart"
          subtitle="The point is not a scary score. It is knowing exactly which blocker to clear."
          items={[
            { label: 'Risk pressure', value: riskScore, detail: selectedRisk.topRisk || 'Top risk is not attached yet.', tone: riskScore > 35 ? 'danger' : 'success' },
            { label: 'Severity', value: severityScore, detail: `${highSeverityCount} high-severity lane(s) in Finance.`, tone: selectedRisk.severity === 'high' ? 'danger' : 'warning' },
            { label: 'Fix readiness', value: selectedRisk.recommendedFix ? 82 : 35, detail: selectedRisk.recommendedFix || 'Recommended fix still missing.', tone: selectedRisk.recommendedFix ? 'success' : 'warning' },
            { label: 'Operating proof', value: averageTrust, detail: `${averageTrust}% average trust across ${riskRows.length} lanes; ${activeFixes} fixes in motion.`, tone: averageTrust >= 80 ? 'success' : 'warning' },
          ]}
        />
      </div>

      <Dialog open={Boolean(avoidancePlan)} onOpenChange={(open) => !open && setAvoidancePlan(null)}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>What to avoid before funding</DialogTitle>
            <DialogDescription>
              These are simple guardrails Finance should keep visible before the seller asks for more capital.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <RuntimeContextCard label="Main blocker" value={selectedRisk.topRisk || 'Risk pending'} detail={selectedRisk.profileName} />
            <RuntimeContextCard label="Fix owner" value={selectedRisk.owner} detail={selectedRisk.recommendedFix || 'Fix task pending'} />
            <RuntimeContextCard label="Unlocks" value={relatedOffer?.offerName || relatedReadiness?.linkedLaunch || 'Capital route'} detail={`${selectedRisk.trustScore}% eligibility score`} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(avoidancePlan ?? []).map((item, index) => (
              <div key={item} className="rounded-2xl border bg-amber-500/10 p-4 text-sm leading-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Avoid {index + 1}</div>
                {item}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAvoidancePlan(null)}>Close</Button>
            <Button>Keep guardrails</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompactSettlementRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: FinanceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const settlementRows = useMemo(
    () => [...(data?.settlementRepayment ?? [])].sort((left, right) => {
      const priorityDelta = settlementStatusPriority(left.status) - settlementStatusPriority(right.status);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return (right.outstandingBalance ?? 0) - (left.outstandingBalance ?? 0);
    }),
    [data]
  );
  const topFacility = settlementRows[0] ?? null;
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [healthPlan, setHealthPlan] = useState<string[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!topFacility) {
      if (selectedFacilityId) {
        setSelectedFacilityId('');
      }
      return;
    }

    if (!settlementRows.some((row) => row.id === selectedFacilityId)) {
      setSelectedFacilityId(topFacility.id);
    }
  }, [settlementRows, selectedFacilityId, topFacility]);

  if (isLoading) {
    return <IntelligenceRuntimeLoadingState label="settlement and repayment" />;
  }

  if (error) {
    return <IntelligenceRuntimeErrorState title="Finance health is unavailable" />;
  }

  if (!topFacility) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No settlement facilities are available yet"
        description="Admin has not published any settlement or repayment lanes into the finance control plane."
      />
    );
  }

  const selectedFacility = settlementRows.find((row) => row.id === selectedFacilityId) ?? topFacility;
  const totalOutstanding = settlementRows.reduce((sum, row) => sum + (row.outstandingBalance ?? 0), 0);
  const totalNextDue = settlementRows.reduce((sum, row) => sum + (row.nextDueAmount ?? 0), 0);
  const collectingCount = settlementRows.filter((row) => row.status === 'collecting').length;
  const overdueCount = settlementRows.filter((row) => row.status === 'overdue').length;
  const relatedOffer = (data?.capitalOffers ?? []).find(
    (offer) => normalizeRuntimeText(offer.repaymentModel) === normalizeRuntimeText(selectedFacility.collectionMode)
      || normalizeRuntimeText(offer.market) === normalizeRuntimeText(selectedFacility.market)
  ) ?? null;
  const relatedRisk = matchRiskRecordByKeyword(data?.riskTrust ?? [], selectedFacility.market);

  const repaymentProgress = financePercent(100 - ((selectedFacility.outstandingBalance ?? 0) / Math.max((selectedFacility.outstandingBalance ?? 0) + (selectedFacility.nextDueAmount ?? 0), 1)) * 100);
  const collectionHealth = selectedFacility.status === 'overdue' ? 35 : selectedFacility.status === 'collecting' ? 86 : 70;
  const createHealthPlan = () => {
    const plan = [
      `Protect cashflow: reserve ${formatFinanceCurrency(selectedFacility.nextDueAmount)} for the next due date on ${formatFinanceDate(selectedFacility.nextDueDate)}.`,
      `Improve settlement health: keep ${selectedFacility.repaymentSource || 'repayment source'} attached to every funded campaign/order lane.`,
      relatedRisk?.recommendedFix || 'Reduce finance risk by clearing service, refund, stock, or overdue blockers before requesting more capital.',
    ];
    setHealthPlan(plan);
    toast({
      title: 'Finance health recommendations created',
      description: 'PrimeOS generated a local plan to improve seller finance health.',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1fr_0.42fr]">
          <div className="rounded-3xl border bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Finance Health</Badge>
              <Badge variant={selectedFacility.status === 'overdue' ? 'destructive' : 'default'} className="capitalize">{humanizeIntelligenceValue(selectedFacility.status)}</Badge>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">Seller finance health: {selectedFacility.facilityName}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Track cashflow, settlement, repayment, outstanding exposure, and whether this seller is financially healthy enough to scale.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <RuntimeContextCard label="Outstanding" value={formatFinanceCurrency(selectedFacility.outstandingBalance)} detail={`${formatFinanceCurrency(totalOutstanding)} total exposed`} />
              <RuntimeContextCard label="Next due" value={formatFinanceCurrency(selectedFacility.nextDueAmount)} detail={formatFinanceDate(selectedFacility.nextDueDate)} />
              <RuntimeContextCard label="Collection" value={humanizeIntelligenceValue(selectedFacility.collectionMode)} detail={`${collectingCount} collecting / ${overdueCount} overdue`} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={createHealthPlan}>
                Recommend health actions
                <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="outline">
                <Link to="/finance/capital-offers">Check capital eligibility</Link>
              </Button>
            </div>
          </div>
          <FinanceScoreRing value={collectionHealth} label="Collection health" caption="Repayment is healthy when money, route, due date, and demand source stay connected." tone={collectionHealth >= 80 ? 'success' : selectedFacility.status === 'overdue' ? 'danger' : 'warning'} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FinanceRouteSelector<SettlementRepaymentRecord>
          title="Finance health lanes"
          description="Pick a money lane. The visual answers what is healthy, what is due, and what needs attention."
          rows={settlementRows}
          selectedId={selectedFacility.id}
          onSelect={setSelectedFacilityId}
          getTitle={(row) => row.facilityName}
          getMeta={(row) => `${row.market} · ${row.disbursementTarget || 'Target pending'} · ${formatFinanceCurrency(row.nextDueAmount)} next due`}
          getScore={(row) => row.status === 'overdue' ? 35 : row.status === 'collecting' ? 86 : 70}
          getStatus={(row) => row.status}
        />
        <FinanceBarStack
          title="Seller finance health chart"
          subtitle="A compact health read: outstanding exposure, next due, collection clarity, and eligibility risk."
          items={[
            { label: 'Repayment progress', value: repaymentProgress, detail: `${formatFinanceCurrency(selectedFacility.outstandingBalance)} still outstanding.`, tone: repaymentProgress > 50 ? 'success' : 'warning' },
            { label: 'Next due readiness', value: selectedFacility.nextDueAmount ? 78 : 35, detail: `${formatFinanceCurrency(totalNextDue)} due across all lanes.`, tone: selectedFacility.nextDueAmount ? 'primary' : 'warning' },
            { label: 'Collection clarity', value: selectedFacility.collectionMode ? 88 : 42, detail: selectedFacility.repaymentSource || 'Repayment source pending.', tone: selectedFacility.collectionMode ? 'success' : 'warning' },
            { label: 'Risk trust', value: relatedRisk?.trustScore ?? 72, detail: relatedRisk?.recommendedFix || 'Risk review should confirm this lane stays healthy.', tone: (relatedRisk?.trustScore ?? 72) < 75 ? 'warning' : 'success' },
          ]}
        />
      </div>

      <Dialog open={Boolean(healthPlan)} onOpenChange={(open) => !open && setHealthPlan(null)}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Recommended finance health actions</DialogTitle>
            <DialogDescription>
              A compact action plan to improve cashflow, repayment clarity, and capital readiness.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <RuntimeContextCard label="Outstanding" value={formatFinanceCurrency(selectedFacility.outstandingBalance)} detail={`${formatFinanceCurrency(totalOutstanding)} total exposed`} />
            <RuntimeContextCard label="Next due" value={formatFinanceCurrency(selectedFacility.nextDueAmount)} detail={formatFinanceDate(selectedFacility.nextDueDate)} />
            <RuntimeContextCard label="Collection health" value={`${collectionHealth}%`} detail={humanizeIntelligenceValue(selectedFacility.collectionMode)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(healthPlan ?? []).map((item, index) => (
              <div key={item} className="rounded-2xl border bg-emerald-500/10 p-4 text-sm leading-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Action {index + 1}</div>
                {item}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setHealthPlan(null)}>Close</Button>
            <Button>Keep health plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancePanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const financeControlQuery = useQuery({
    queryKey: ['prime-finance-control-plane'],
    queryFn: fetchFinanceControlPlane,
    staleTime: 5 * 1000,
    refetchInterval: 5 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: financeTowerIds.includes(towerId),
  });

  if (towerId === 'capital') {
    return (
      <CompactCapitalReadinessRuntimePanel
        data={financeControlQuery.data}
        isLoading={financeControlQuery.isLoading}
        error={financeControlQuery.error}
        snapshot={snapshot}
      />
    );
  }

  if (towerId === 'offers') {
    return (
      <CompactCapitalOffersRuntimePanel
        data={financeControlQuery.data}
        isLoading={financeControlQuery.isLoading}
        error={financeControlQuery.error}
        snapshot={snapshot}
      />
    );
  }

  if (towerId === 'risk') {
    return (
      <CompactRiskTrustRuntimePanel
        data={financeControlQuery.data}
        isLoading={financeControlQuery.isLoading}
        error={financeControlQuery.error}
        snapshot={snapshot}
      />
    );
  }

  if (towerId === 'settlement') {
    return (
      <CompactSettlementRuntimePanel
        data={financeControlQuery.data}
        isLoading={financeControlQuery.isLoading}
        error={financeControlQuery.error}
        snapshot={snapshot}
      />
    );
  }

  return null;
}

function creatorStatusPriority(status: string) {
  if (status === 'approved') return 0;
  if (status === 'shortlisted') return 1;
  if (status === 'watchlist') return 2;
  if (status === 'archived') return 3;
  return 4;
}

function launchDecisionPriority(status: string) {
  if (status === 'approved') return 0;
  if (status === 'review') return 1;
  if (status === 'hold') return 2;
  if (status === 'rejected') return 3;
  return 4;
}

function runtimeStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (['approved', 'active', 'published', 'shortlisted'].includes(status)) return 'default';
  if (['review', 'testing', 'watchlist', 'watch', 'hold'].includes(status)) return 'secondary';
  return 'outline';
}

function RuntimeCreatorAvatar({
  creator,
  size = 'sm',
}: {
  creator: IntelligenceCreatorRecord;
  size?: 'sm' | 'lg' | 'xl';
}) {
  const dimension = size === 'xl' ? 'size-20 text-xl' : size === 'lg' ? 'size-14 text-base' : 'size-8 text-[10px]';

  if (creator.imageUrl) {
    return (
      <div className={`${dimension} overflow-hidden rounded-full border bg-muted/20 shadow-sm`}>
        <img src={creator.imageUrl} alt={creator.creatorName} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${dimension} flex items-center justify-center rounded-full border bg-gradient-to-br from-fuchsia-500/15 to-violet-500/10 font-semibold text-foreground shadow-sm`}>
      {creator.creatorName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  );
}

function RuntimeRecommendationVisual({
  creator,
  product,
  productLabel,
  variant,
  eyebrow,
  decisionMode,
  className = '',
}: {
  creator: IntelligenceCreatorRecord | null;
  product: PrimeSnapshot['products'][number] | null;
  productLabel: string;
  variant: 'creator' | 'launch';
  eyebrow: string;
  decisionMode?: string;
  className?: string;
}) {
  const productImage = product?.images?.[0];
  const displayProduct = product?.name || productLabel;
  const creatorName = creator?.creatorName || 'Creator proof';
  const channelLabel = creator ? humanizeIntelligenceValue(creator.primaryChannel) : 'PrimeOS route';

  if (variant === 'creator') {
    return (
      <div className={`${className} relative min-h-[210px] overflow-hidden rounded-3xl border bg-gradient-to-br from-rose-500/10 via-background to-amber-500/10 p-4 shadow-sm`}>
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-rose-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-8 size-28 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          {creator ? (
            <RuntimeCreatorAvatar creator={creator} size="xl" />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border bg-background/80 shadow-sm">
              <CircleUserRound className="size-7 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 pt-1">
            <Badge variant="secondary" className="rounded-full bg-background/75">
              {eyebrow}
            </Badge>
            <div className="mt-3 truncate text-lg font-semibold">{creatorName}</div>
            <div className="text-xs text-muted-foreground">{channelLabel} proof source</div>
          </div>
        </div>
        <div className="relative mt-4 overflow-hidden rounded-2xl border bg-background/80 shadow-sm">
          <div className="flex items-center gap-3 p-3">
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/30">
              {productImage ? (
                <img src={productImage} alt={displayProduct} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="size-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Product route</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold">{displayProduct}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative min-h-[210px] overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-500/10 via-background to-primary/10 p-4 shadow-sm`}>
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary" className="relative rounded-full bg-background/75">
          {eyebrow}
        </Badge>
        <div className="relative rounded-full border bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          {decisionMode || 'Review'}
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-background/80 shadow-sm">
          {productImage ? (
            <img src={productImage} alt={displayProduct} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Product to launch</div>
          <div className="mt-2 line-clamp-3 text-base font-semibold">{displayProduct}</div>
        </div>
      </div>
      <div className="relative mt-4 rounded-2xl border bg-background/80 p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {creator ? (
            <RuntimeCreatorAvatar creator={creator} />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted/30">
              <CircleUserRound className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{creatorName}</div>
            <div className="text-xs text-muted-foreground">{channelLabel} creator proof</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuntimeTrendKpiCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'rose' | 'sky' | 'amber';
  icon: ReactNode;
}) {
  const toneClass = {
    emerald: 'from-emerald-400 to-lime-400 text-emerald-950',
    rose: 'from-rose-500 to-red-500 text-white',
    sky: 'from-sky-400 to-blue-500 text-sky-950',
    amber: 'from-amber-300 to-yellow-400 text-amber-950',
  }[tone];

  return (
    <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${toneClass} p-4 shadow-sm`}>
      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-white/20" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">{label}</div>
          <div className="mt-3 max-w-[15rem] text-xs font-medium opacity-85">{detail}</div>
        </div>
        <div className="rounded-2xl bg-white/25 p-2">
          {icon}
        </div>
      </div>
    </div>
  );
}

function RuntimeTrendForecastChart({
  actualIntent,
  conversionIntent,
  forecastDemand,
  momentum,
  productRoute,
  risk,
}: {
  actualIntent: number;
  conversionIntent: number;
  forecastDemand: number;
  momentum: number;
  productRoute: string;
  risk?: string;
}) {
  const chartData = [
    { label: 'D-6', actual: Math.round(actualIntent * 0.48) },
    { label: 'D-4', actual: Math.round(actualIntent * 0.64) },
    { label: 'D-2', actual: Math.round(actualIntent * 0.82) },
    { label: 'Now', actual: actualIntent },
    { label: '+2d', forecast: Math.round((actualIntent + forecastDemand) * 0.52) },
    { label: '+5d', forecast: Math.round(forecastDemand * 0.88) },
    { label: '+7d', forecast: forecastDemand },
  ];
  const maxValue = Math.max(1, ...chartData.map((point) => point.actual ?? point.forecast ?? 0), conversionIntent);
  const points = chartData.map((point, index) => {
    const value = point.actual ?? point.forecast ?? 0;
    return {
      ...point,
      value,
      x: 28 + index * 48,
      y: 130 - (value / maxValue) * 92,
      barHeight: Math.max(8, (value / maxValue) * 88),
    };
  });
  const actualPath = points.slice(0, 4).map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const forecastPath = points.slice(3).map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <Card className="overflow-hidden rounded-lg border">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Market pulse + forecast</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Actual demand signals against PrimeOS 7-day prediction.</p>
          </div>
          <Badge variant="outline" className="w-fit capitalize">{risk || 'forecast ready'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="rounded-2xl border bg-muted/20 p-3">
          <svg viewBox="0 0 340 160" className="h-56 w-full">
            <line x1="24" y1="130" x2="324" y2="130" stroke="hsl(var(--border))" />
            <line x1="24" y1="84" x2="324" y2="84" stroke="hsl(var(--border))" strokeDasharray="4 6" opacity="0.7" />
            <line x1="172" y1="24" x2="172" y2="130" stroke="hsl(var(--border))" strokeDasharray="3 5" />
            {points.map((point) => (
              <g key={point.label}>
                <rect
                  x={point.x - 11}
                  y={130 - point.barHeight}
                  width="22"
                  height={point.barHeight}
                  rx="6"
                  fill={point.actual ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'}
                  opacity={point.actual ? '0.72' : '0.36'}
                />
                <text x={point.x} y="150" textAnchor="middle" className="fill-muted-foreground text-[10px]">{point.label}</text>
              </g>
            ))}
            <path d={actualPath} fill="none" stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            <path d={forecastPath} fill="none" stroke="hsl(var(--chart-2))" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {points.map((point) => (
              <circle key={`${point.label}-dot`} cx={point.x} cy={point.y} r="4.5" fill="hsl(var(--background))" stroke={point.actual ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'} strokeWidth="3" />
            ))}
          </svg>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RuntimeContextCard label="Actual now" value={formatCompactCount(actualIntent)} detail={`${formatCompactCount(conversionIntent)} conversion signals attached.`} />
          <RuntimeContextCard label="Predicted 7d" value={formatCompactCount(forecastDemand)} detail="Demand forecast from current market pulse." />
          <RuntimeContextCard label="Momentum" value={`${momentum}%`} detail={productRoute} />
        </div>
      </CardContent>
    </Card>
  );
}

function RuntimeTrendGeoMap({
  customers,
  selectedCustomer,
  onSelectCustomer,
}: {
  customers: IntelligenceCustomerRecord[];
  selectedCustomer: IntelligenceCustomerRecord;
  onSelectCustomer: (customerId: string) => void;
}) {
  const regionPositions: Record<string, { x: number; y: number; label: string }> = {
    JP: { x: 238, y: 56, label: 'Japan' },
    VN: { x: 176, y: 104, label: 'Vietnam' },
    SEA: { x: 182, y: 126, label: 'SEA' },
    KR: { x: 214, y: 58, label: 'Korea' },
    US: { x: 48, y: 76, label: 'United States' },
    EU: { x: 112, y: 58, label: 'Europe' },
  };
  const fallbackPositions = [
    { x: 142, y: 92 },
    { x: 210, y: 116 },
    { x: 82, y: 112 },
  ];
  const marketGroups = customers.reduce<Record<string, {
    market: string;
    label: string;
    segmentSize: number;
    momentum: number;
    primaryCustomer: IntelligenceCustomerRecord;
  }>>((groups, customer) => {
    const market = customer.market || 'Global';
    const existing = groups[market];
    const segmentSize = customer.segmentSize ?? 0;

    if (!existing) {
      groups[market] = {
        market,
        label: regionPositions[market]?.label || market,
        segmentSize,
        momentum: customer.potentialScore,
        primaryCustomer: customer,
      };
      return groups;
    }

    const nextSize = existing.segmentSize + segmentSize;
    groups[market] = {
      ...existing,
      segmentSize: nextSize,
      momentum: Math.round(((existing.momentum * existing.segmentSize) + (customer.potentialScore * segmentSize)) / Math.max(nextSize, 1)),
      primaryCustomer: customer.potentialScore > existing.primaryCustomer.potentialScore ? customer : existing.primaryCustomer,
    };
    return groups;
  }, {});
  const regions = Object.values(marketGroups)
    .sort((left, right) => right.momentum - left.momentum)
    .map((region, index) => ({
      ...region,
      ...(regionPositions[region.market] || fallbackPositions[index % fallbackPositions.length]),
    }));
  const maxSegmentSize = Math.max(1, ...regions.map((region) => region.segmentSize));

  return (
    <Card className="overflow-hidden rounded-lg border">
      <CardHeader className="border-b bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Geo demand map</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Regional heat behind the selected trend lane.</p>
          </div>
          <Badge variant="outline">{selectedCustomer.market}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-2xl border bg-muted/20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 70% 30%, hsl(var(--primary) / 0.14), transparent 32%), radial-gradient(circle at 34% 70%, hsl(var(--chart-2) / 0.16), transparent 28%)',
            }}
          />
          <svg viewBox="0 0 320 180" className="relative h-64 w-full">
            <defs>
              <linearGradient id="runtime-trend-map-land" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.55" />
                <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path d="M117 35 C151 17 207 28 236 57 C259 80 255 111 225 125 C187 143 141 128 111 103 C84 81 84 52 117 35Z" fill="url(#runtime-trend-map-land)" stroke="hsl(var(--border))" />
            <path d="M171 104 C191 101 208 112 209 130 C198 143 174 143 160 128 C153 118 157 108 171 104Z" fill="url(#runtime-trend-map-land)" stroke="hsl(var(--border))" />
            <path d="M48 58 C70 42 98 45 111 66 C113 91 90 107 64 100 C42 94 32 72 48 58Z" fill="url(#runtime-trend-map-land)" stroke="hsl(var(--border))" opacity="0.65" />
            <path d="M231 41 C242 48 250 64 247 82" fill="none" stroke="hsl(var(--border))" strokeLinecap="round" strokeWidth="5" />
            {[44, 84, 124, 164].map((x) => (
              <line key={x} x1={x} y1="18" x2={x} y2="162" stroke="hsl(var(--border))" strokeDasharray="2 8" opacity="0.38" />
            ))}
            {[42, 82, 122].map((y) => (
              <line key={y} x1="24" y1={y} x2="292" y2={y} stroke="hsl(var(--border))" strokeDasharray="2 8" opacity="0.38" />
            ))}
            {regions.map((region) => {
              const selected = region.market === selectedCustomer.market;
              const radius = 8 + Math.round((region.segmentSize / maxSegmentSize) * 14);

              return (
                <g key={region.market}>
                  {selected ? (
                    <>
                      <circle cx={region.x} cy={region.y} r={radius + 18} fill="hsl(var(--primary))" opacity="0.08" />
                      <circle cx={region.x} cy={region.y} r={radius + 9} fill="none" stroke="hsl(var(--primary))" strokeDasharray="4 5" strokeWidth="2" opacity="0.75" />
                    </>
                  ) : null}
                  <circle cx={region.x} cy={region.y} r={radius} fill={selected ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'} opacity={selected ? '0.9' : '0.55'} />
                  <circle cx={region.x} cy={region.y} r="4" fill="hsl(var(--background))" />
                  <text x={region.x} y={region.y - radius - 8} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">{region.market}</text>
                  <text x={region.x} y={region.y + radius + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">{region.momentum}%</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="space-y-2">
          {regions.map((region) => {
            const selected = region.market === selectedCustomer.market;

            return (
              <button
                key={region.market}
                type="button"
                onClick={() => onSelectCustomer(region.primaryCustomer.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 ${selected ? 'border-primary/40 bg-primary/5' : 'bg-muted/10'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{region.label}</div>
                    <div className="text-xs text-muted-foreground">{formatCompactCount(region.segmentSize)} buyers in play</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{region.momentum}%</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">heat</div>
                  </div>
                </div>
                <Progress value={region.momentum} className="mt-2 h-1.5" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function runtimeCreatorHandle(creator: IntelligenceCreatorRecord) {
  return `@${creator.creatorName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
}

function runtimeCreatorAudienceConnections(creator: IntelligenceCreatorRecord) {
  const primary = normalizeRuntimeText(creator.primaryChannel);

  if (primary === 'youtube') {
    return [
      { label: 'YouTube', value: 44, color: 'bg-rose-500' },
      { label: 'Instagram', value: 31, color: 'bg-violet-500' },
      { label: 'TikTok', value: 18, color: 'bg-sky-500' },
      { label: 'Email', value: 7, color: 'bg-amber-400' },
    ];
  }

  if (primary === 'tiktok') {
    return [
      { label: 'TikTok', value: 42, color: 'bg-sky-500' },
      { label: 'Instagram', value: 29, color: 'bg-violet-500' },
      { label: 'YouTube', value: 21, color: 'bg-rose-500' },
      { label: 'Email', value: 8, color: 'bg-amber-400' },
    ];
  }

  return [
    { label: 'Instagram', value: 40, color: 'bg-violet-500' },
    { label: 'TikTok', value: 33, color: 'bg-sky-500' },
    { label: 'YouTube', value: 19, color: 'bg-rose-500' },
    { label: 'Email', value: 8, color: 'bg-amber-400' },
  ];
}

function runtimeCreatorAudienceTotal(creator: IntelligenceCreatorRecord) {
  const channelMultiplier = normalizeRuntimeText(creator.primaryChannel) === 'youtube' ? 780 : normalizeRuntimeText(creator.primaryChannel) === 'tiktok' ? 920 : 860;
  return creator.fitScore * channelMultiplier;
}

function runtimeCreatorGenderSplit(creator: IntelligenceCreatorRecord) {
  const sku = normalizeRuntimeSku(creator.linkedSku);

  if (sku.includes('BSH') || sku.includes('SKB')) {
    return { male: 34, female: 66 };
  }

  if (sku.includes('ART')) {
    return { male: 46, female: 54 };
  }

  return { male: 43, female: 57 };
}

function runtimeCreatorAgeBuckets(creator: IntelligenceCreatorRecord) {
  const primary = normalizeRuntimeText(creator.primaryChannel);

  if (primary === 'youtube') {
    return [
      { label: '<18', value: 4.8 },
      { label: '18-24', value: 24.6 },
      { label: '25-34', value: 38.2 },
      { label: '35-44', value: 21.4 },
      { label: '45-64', value: 9.2 },
      { label: '>64', value: 1.8 },
    ];
  }

  if (primary === 'tiktok') {
    return [
      { label: '<18', value: 6.9 },
      { label: '18-24', value: 35.7 },
      { label: '25-34', value: 33.8 },
      { label: '35-44', value: 15.6 },
      { label: '45-64', value: 6.1 },
      { label: '>64', value: 1.9 },
    ];
  }

  return [
    { label: '<18', value: 3.9 },
    { label: '18-24', value: 27.8 },
    { label: '25-34', value: 39.6 },
    { label: '35-44', value: 18.4 },
    { label: '45-64', value: 8.1 },
    { label: '>64', value: 2.2 },
  ];
}

function runtimeCreatorTopCountries(creator: IntelligenceCreatorRecord) {
  if (creator.market === 'JP') {
    return [
      { label: 'Japan', value: 43 },
      { label: 'Vietnam', value: 18 },
      { label: 'Singapore', value: 13 },
      { label: 'Thailand', value: 11 },
      { label: 'United States', value: 7 },
    ];
  }

  if (creator.market === 'VN') {
    return [
      { label: 'Vietnam', value: 46 },
      { label: 'Japan', value: 17 },
      { label: 'Thailand', value: 14 },
      { label: 'Singapore', value: 10 },
      { label: 'Malaysia', value: 7 },
    ];
  }

  return [
    { label: 'Singapore', value: 25 },
    { label: 'Thailand', value: 21 },
    { label: 'Vietnam', value: 19 },
    { label: 'Japan', value: 17 },
    { label: 'Malaysia', value: 9 },
  ];
}

function runtimeCreatorProofPosts(creator: IntelligenceCreatorRecord) {
  const sku = runtimeSkuLabel(creator.linkedSku);

  return [
    `${sku} creator proof reel`,
    `${humanizeIntelligenceValue(creator.primaryChannel)} product explain-and-use clip`,
    `${creator.market} launch-route content proof`,
  ];
}

function runtimeCreatorProfileSummary(creator: IntelligenceCreatorRecord) {
  return `${creator.creatorName} gives PrimeOS a clear proof layer for ${runtimeSkuName(creator.linkedSku).toLowerCase()} by combining ${humanizeIntelligenceValue(creator.primaryChannel)} storytelling with ${creator.market} market relevance.`;
}

function RuntimeAudienceConnectionsCard({ creator }: { creator: IntelligenceCreatorRecord }) {
  const segments = runtimeCreatorAudienceConnections(creator);
  const total = runtimeCreatorAudienceTotal(creator);
  let currentAngle = 0;
  const conicGradient = segments
    .map((segment) => {
      const angle = (segment.value / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return `${segmentsColor(segment.color)} ${startAngle}deg ${startAngle + angle}deg`;
    })
    .join(', ');

  return (
    <Card className="rounded-2xl border bg-muted/10 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Audience connections</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center lg:grid-cols-[180px_1fr]">
        <div className="relative mx-auto flex size-32 items-center justify-center rounded-full border-4 border-background shadow-inner sm:size-36 lg:size-40">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${conicGradient})`,
              maskImage: 'radial-gradient(circle, transparent 62%, black 63%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 63%)',
            }}
          />
          <div className="relative text-center">
            <div className="text-2xl font-bold">{(total / 1000).toFixed(1)}K</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">total</div>
          </div>
        </div>
        <div className="grid min-w-0 gap-3">
          {segments.map((segment) => (
            <div key={`${creator.id}-${segment.label}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`size-2.5 rounded-full ${segment.color}`} />
                <span className="truncate font-medium text-muted-foreground">{segment.label}</span>
              </div>
              <span className="font-bold">{segment.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RuntimeGenderCard({ creator }: { creator: IntelligenceCreatorRecord }) {
  const split = runtimeCreatorGenderSplit(creator);

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Gender
          <Badge variant="outline" className="font-mono text-[10px]">{split.female >= split.male ? 'Female skew' : 'Male skew'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="flex h-10 w-full overflow-hidden rounded-xl border bg-muted/20">
          <div className="flex items-center justify-center bg-sky-400 font-bold text-white" style={{ width: `${split.male}%` }}>
            {split.male > 20 && `${split.male}%`}
          </div>
          <div className="flex items-center justify-center bg-rose-400 font-bold text-white" style={{ width: `${split.female}%` }}>
            {split.female > 20 && `${split.female}%`}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-sky-400" />
            <span className="text-muted-foreground">Male</span>
            <span className="font-bold">{split.male.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{split.female.toFixed(1)}%</span>
            <span className="text-muted-foreground">Female</span>
            <div className="size-3 rounded-full bg-rose-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RuntimeAgeDistributionCard({ creator }: { creator: IntelligenceCreatorRecord }) {
  const buckets = runtimeCreatorAgeBuckets(creator);

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Age distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {buckets.map((bucket) => (
          <div key={`${creator.id}-${bucket.label}`} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">{bucket.label}</span>
              <span className="font-bold">{bucket.value.toFixed(1)}%</span>
            </div>
            <Progress value={bucket.value} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RuntimeTopCountriesCard({ creator }: { creator: IntelligenceCreatorRecord }) {
  const countries = runtimeCreatorTopCountries(creator);

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top countries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {countries.map((country, index) => (
          <div key={`${creator.id}-${country.label}`} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-sky-400/40" />
                <span className="font-medium text-muted-foreground">{country.label}</span>
              </div>
              <span className="font-bold">{country.value.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
              <div className={`${index === 0 ? 'bg-sky-500' : 'bg-sky-400/60'} h-full`} style={{ width: `${country.value}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RuntimeCreatorProfileDialog({
  creator,
  open,
  onOpenChange,
  matchingCampaign,
  matchingForecast,
}: {
  creator: IntelligenceCreatorRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchingCampaign: PrimeSnapshot['campaigns'][number] | undefined;
  matchingForecast: PrimeSnapshot['forecasting'][number] | undefined;
}) {
  if (!creator) return null;

  const proofPosts = runtimeCreatorProofPosts(creator);
  const totalAudience = runtimeCreatorAudienceTotal(creator);
  const marketLabel = creator.market === 'JP' ? 'Japan' : creator.market === 'VN' ? 'Vietnam' : creator.market === 'SEA' ? 'Southeast Asia' : creator.market;
  const engagementRate = Math.max(3.8, Number((creator.fitScore / 12.6).toFixed(1)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] w-[calc(100vw-2rem)] max-w-6xl overflow-hidden p-0 sm:w-[calc(100vw-3rem)]">
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto p-4 pr-12 sm:p-6 sm:pr-14">
          <DialogHeader className="pr-2">
            <DialogTitle>{creator.creatorName}</DialogTitle>
            <DialogDescription>Creator profile, channel footprint, audience analytics, and activation guidance.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-5 sm:space-y-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] xl:items-start">
              <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                    <RuntimeCreatorAvatar creator={creator} size="lg" />
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words text-2xl font-semibold sm:text-3xl">{creator.creatorName}</h3>
                        <Badge variant="outline">{runtimeCreatorHandle(creator)}</Badge>
                        <Badge variant="outline">{humanizeIntelligenceValue(creator.primaryChannel)}</Badge>
                        <Badge variant="outline">{humanizeIntelligenceValue(creator.status)}</Badge>
                      </div>
                      <p className="max-w-2xl text-sm text-muted-foreground">{runtimeCreatorProfileSummary(creator)}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{marketLabel}</Badge>
                        <Badge variant="outline" className="max-w-full whitespace-normal text-left leading-snug">Product {runtimeSkuLabel(creator.linkedSku)}</Badge>
                        <Badge variant="outline">Audience quality {Math.max(76, creator.fitScore - 4)}%</Badge>
                        <Badge variant="outline">Authenticity {Math.max(72, creator.fitScore - 6)}%</Badge>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3 text-sm">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Best for products in cart</div>
                        <div className="mt-2 font-medium">PrimeOS thinks {creator.creatorName} is one of the clearest creator fits for {runtimeSkuName(creator.linkedSku).toLowerCase()}.</div>
                        <div className="mt-1 text-muted-foreground">This profile helps the seller see who can actually help sell the products already sitting in the cart or launch basket, not just who looks popular in isolation.</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
                    <Button asChild className="w-full sm:w-auto">
                      <Link to={INTELLIGENCE_DECISIONS_HREF}>Add to launch</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link to="/demand/content-creator-ops">Open Creator Ops</Link>
                    </Button>
                  </div>
                </div>
              </div>
              <RuntimeAudienceConnectionsCard creator={creator} />
            </div>

            <Tabs defaultValue="audience" className="space-y-4">
              <TabsList className="h-auto max-w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                <TabsTrigger value="proof">Recent posts</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="metrics">Key metrics</TabsTrigger>
                <TabsTrigger value="guidance">Activation guidance</TabsTrigger>
              </TabsList>

            <TabsContent value="proof" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="grid gap-3 sm:grid-cols-3">
                  {proofPosts.map((proof, index) => (
                    <div key={`${creator.id}-${proof}`} className="overflow-hidden rounded-3xl border bg-background shadow-sm">
                      <div className="h-40 overflow-hidden bg-muted/20">
                        {creator.imageUrl ? <img src={creator.imageUrl} alt={creator.creatorName} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Matched post {index + 1}</div>
                          <Badge variant="outline" className="rounded-full text-[10px]">{humanizeIntelligenceValue(creator.status)}</Badge>
                        </div>
                        <div className="text-sm font-medium">{proof}</div>
                        <div className="text-xs text-muted-foreground">{creator.recentProof || 'Recent creator proof is ready to support launch review.'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Card className="rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-base">Proof summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">Audience fit proof</div>
                      <div className="mt-1 text-muted-foreground">{creator.audienceFit || 'Audience fit proof has not been attached yet.'}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">Market fit proof</div>
                      <div className="mt-1 text-muted-foreground">{creator.marketFit || 'Market fit proof has not been attached yet.'}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">Commerce proof</div>
                      <div className="mt-1 text-muted-foreground">
                        {matchingCampaign
                          ? `${matchingCampaign.orders} orders and ${currency.format(matchingCampaign.revenue)} linked to adjacent campaign flow.`
                          : matchingForecast
                            ? `${matchingForecast.ats} ATS covers ${matchingForecast.demand7d} projected 7-day demand on this SKU.`
                            : 'PrimeOS still needs adjacent commerce proof on this linked SKU.'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="audience" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[0.9fr_1.1fr_1fr]">
                <RuntimeGenderCard creator={creator} />
                <RuntimeAgeDistributionCard creator={creator} />
                <RuntimeTopCountriesCard creator={creator} />
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricPill label="Connections" value={`${(totalAudience / 1000).toFixed(1)}K`} />
                <MetricPill label="Fit score" value={`${creator.fitScore}%`} />
                <MetricPill label="Engagement" value={`${engagementRate.toFixed(1)}%`} />
                <MetricPill label="Launch proof" value={matchingCampaign ? `${matchingCampaign.orders} orders` : 'Pending'} />
              </div>
              <Card className="rounded-lg border">
                <CardHeader>
                  <CardTitle className="text-base">Connected surfaces</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <RuntimeContextCard
                    label="Launch Decisions"
                    value={creator.status === 'approved' || creator.status === 'shortlisted' ? 'Ready to route' : 'Needs review'}
                    detail="This creator can move into launch review without exposing admin CRUD on the runtime side."
                  />
                  <RuntimeContextCard
                    label="Content & Creator Ops"
                    value={humanizeIntelligenceValue(creator.primaryChannel)}
                    detail="Creator execution belongs in Demand once the seller confirms this fit is real enough to activate."
                  />
                  <RuntimeContextCard
                    label="Ecom + Finance"
                    value={runtimeSkuLabel(creator.linkedSku)}
                    detail="PrimeOS can only turn creator proof into a closed loop when product, inventory, and capital routes stay attached."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guidance" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <Card className="rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-base">Next-best move</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">What the seller should do</div>
                      <div className="mt-1 text-muted-foreground">Use {creator.creatorName} as the proof layer for {runtimeSkuName(creator.linkedSku).toLowerCase()}, then route the launch through customer targeting before paid scale opens up.</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">Why this is credible</div>
                      <div className="mt-1 text-muted-foreground">{creator.recentProof || creator.audienceFit || 'PrimeOS already has enough signal to explain why this creator surfaced.'}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">What system connects next</div>
                      <div className="mt-1 text-muted-foreground">Launch Decisions turns this creator fit into an explicit launch thesis, then Demand owns execution and Customer/Finance close the loop.</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-lg border">
                  <CardHeader>
                    <CardTitle className="text-base">CTA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full justify-between">
                      <Link to={INTELLIGENCE_DECISIONS_HREF}>
                        Open Launch Decisions
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-between">
                      <Link to="/demand/content-creator-ops">
                        Open Content &amp; Creator Ops
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-between">
                      <Link to="/customer/crm-compact">
                        Open CRM Compact
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getLaunchRuntimeCta(plan: IntelligenceLaunchDecisionRecord) {
  if (plan.approvalStatus === 'approved') {
    return {
      href: '/demand/campaign-ops',
      label: 'Send approved launch to Campaign Ops',
      shortLabel: 'Send',
      detail: 'This launch is already approved and ready for demand execution.',
    };
  }

  if (plan.approvalStatus === 'review') {
    return {
      href: '/demand/content-creator-ops',
      label: 'Open Content & Creator Ops',
      shortLabel: 'Review',
      detail: 'This launch still needs execution context before it can move live.',
    };
  }

  if (plan.approvalStatus === 'hold') {
    return {
      href: '/customer/crm-compact',
      label: 'Re-check customer signal',
      shortLabel: 'Check',
      detail: 'This launch is on hold, so the best next step is validating the customer side again.',
    };
  }

  return {
    href: '/intelligence/creators',
    label: 'Inspect creator signal again',
    shortLabel: 'Inspect',
    detail: 'This launch is not approved, so PrimeOS routes the user back to the strongest upstream signal.',
  };
}

function CompactCreatorsRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: IntelligenceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const creators = useMemo(
    () => [...(data?.creators ?? [])].sort((left, right) => {
      const priorityDelta = creatorStatusPriority(left.status) - creatorStatusPriority(right.status);
      if (priorityDelta !== 0) return priorityDelta;
      return right.fitScore - left.fitScore;
    }),
    [data]
  );
  const topCreator = creators[0] ?? null;
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [isCreatorDialogOpen, setIsCreatorDialogOpen] = useState(false);

  useEffect(() => {
    if (!topCreator) {
      if (selectedCreatorId) setSelectedCreatorId('');
      return;
    }

    if (!creators.some((creator) => creator.id === selectedCreatorId)) {
      setSelectedCreatorId(topCreator.id);
    }
  }, [creators, selectedCreatorId, topCreator]);

  if (isLoading) return <IntelligenceRuntimeLoadingState label="creator intelligence" />;
  if (error) return <IntelligenceRuntimeErrorState title="Creator intelligence is unavailable" />;
  if (!topCreator) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No creator signals are available yet"
        description="Add creator proof first, then PrimeOS can recommend who should help sell the next product."
      />
    );
  }

  const selectedCreator = creators.find((creator) => creator.id === selectedCreatorId) ?? topCreator;
  const readyCount = creators.filter((creator) => ['shortlisted', 'approved'].includes(creator.status)).length;
  const averageFit = Math.round(creators.reduce((sum, creator) => sum + creator.fitScore, 0) / creators.length);
  const linkedSkuCount = new Set(creators.map((creator) => normalizeRuntimeSku(creator.linkedSku)).filter(Boolean)).size;
  const matchingCampaign = findCampaignBySku(snapshot, selectedCreator.linkedSku);
  const matchingForecast = findForecastBySku(snapshot, selectedCreator.linkedSku);
  const selectedCreatorProduct = findProductBySku(snapshot, selectedCreator.linkedSku);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border">
        <CardHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_170px] xl:items-stretch">
            <div className="min-w-0 xl:order-2">
              <Badge variant="outline">PrimeOS recommends</Badge>
              <CardTitle className="mt-3 text-2xl">Use {selectedCreator.creatorName} for {runtimeSkuName(selectedCreator.linkedSku)}</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Best creator fit right now: {humanizeIntelligenceValue(selectedCreator.primaryChannel)} proof, {selectedCreator.market} market relevance, and a clear route into the product already in focus.
              </p>
            </div>
            <RuntimeRecommendationVisual
              creator={selectedCreator}
              product={selectedCreatorProduct}
              productLabel={runtimeSkuLabel(selectedCreator.linkedSku)}
              variant="creator"
              eyebrow="Creator pick"
              className="xl:order-1"
            />
            <div className="rounded-2xl border bg-background/80 p-4 text-right shadow-sm xl:order-3">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Creator fit</div>
              <div className="mt-1 text-3xl font-semibold">{selectedCreator.fitScore}%</div>
              <Badge variant={runtimeStatusVariant(selectedCreator.status)} className="mt-2 capitalize">
                {humanizeIntelligenceValue(selectedCreator.status)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <RuntimeContextCard
              label="Product route"
              value={runtimeSkuLabel(selectedCreator.linkedSku)}
              detail={`${runtimeSkuLabel(selectedCreator.linkedSku)} on ${selectedCreator.primaryChannel} in ${selectedCreator.market}.`}
            />
            <RuntimeContextCard
              label="Audience fit"
              value={`${selectedCreator.fitScore}% creator fit`}
              detail={selectedCreator.audienceFit || 'Audience proof has not been attached yet.'}
            />
            <RuntimeContextCard
              label="Market fit"
              value={`${selectedCreator.market} launch route`}
              detail={selectedCreator.marketFit || 'Market proof has not been attached yet.'}
            />
            <RuntimeContextCard
              label="Commerce guardrail"
              value={matchingCampaign ? `${matchingCampaign.orders} orders` : 'Proof pending'}
              detail={selectedCreator.recentProof || (matchingForecast ? `${matchingForecast.ats} ATS currently covers ${matchingForecast.demand7d} projected 7-day demand for this SKU.` : 'Recent proof has not been attached yet.')}
            />
          </div>
          <div className="rounded-2xl border bg-muted/20 p-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next move</div>
            <div className="mt-2 text-sm font-medium">Review {selectedCreator.creatorName}'s proof, then send this creator route into Launch Decisions.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setIsCreatorDialogOpen(true)}>
              Open creator profile
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={INTELLIGENCE_DECISIONS_HREF}>
                Send to Launch Decisions
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/demand/content-creator-ops">
                Open Creator Ops
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Creator signals" value={creators.length} meta={`${readyCount} ready for launch review.`} icon={<CircleUserRound className="size-5" />} tone="info" />
        <SummaryMetricCard label="Best fit" value={`${selectedCreator.fitScore}%`} meta={selectedCreator.creatorName} icon={<Sparkles className="size-5" />} tone="success" />
        <SummaryMetricCard label="Average fit" value={`${averageFit}%`} meta="Overall creator quality in this pool." icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Products covered" value={linkedSkuCount} meta={runtimeSkuLabel(selectedCreator.linkedSku)} icon={<Globe className="size-5" />} tone="purple" />
      </div>

      <Card className="rounded-lg border">
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Compare creator options</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Pick another creator only if the product, market, or channel fit is stronger than the recommendation above.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsCreatorDialogOpen(true)}>
              Open recommended creator
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table variant="embedded">
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Fit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((creator) => (
                <TableRow key={creator.id} className={selectedCreator.id === creator.id ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-3 text-left"
                      onClick={() => {
                        setSelectedCreatorId(creator.id);
                        setIsCreatorDialogOpen(true);
                      }}
                    >
                      <RuntimeCreatorAvatar creator={creator} />
                      <div className="flex flex-col">
                        <span>{creator.creatorName}</span>
                        <span className="text-xs text-muted-foreground">{runtimeSkuLabel(creator.linkedSku)}</span>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>{creator.market}</TableCell>
                  <TableCell className="capitalize">{creator.primaryChannel}</TableCell>
                  <TableCell className="text-right">{creator.fitScore}%</TableCell>
                  <TableCell>
                    <Badge variant={runtimeStatusVariant(creator.status)} className="capitalize">
                      {humanizeIntelligenceValue(creator.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCreatorId(creator.id);
                          setIsCreatorDialogOpen(true);
                        }}
                      >
                        Open profile
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RuntimeCreatorProfileDialog
        creator={selectedCreator}
        open={isCreatorDialogOpen}
        onOpenChange={setIsCreatorDialogOpen}
        matchingCampaign={matchingCampaign}
        matchingForecast={matchingForecast}
      />
    </div>
  );
}

function CompactCustomersRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: IntelligenceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const customers = useMemo(
    () => [...(data?.customers ?? [])].sort((left, right) => right.potentialScore - left.potentialScore),
    [data]
  );
  const topCustomer = customers[0] ?? null;
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  useEffect(() => {
    if (!topCustomer) {
      if (selectedCustomerId) setSelectedCustomerId('');
      return;
    }

    if (!customers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(topCustomer.id);
    }
  }, [customers, selectedCustomerId, topCustomer]);

  if (isLoading) return <IntelligenceRuntimeLoadingState label="customer intelligence" />;
  if (error) return <IntelligenceRuntimeErrorState title="Customer intelligence is unavailable" />;
  if (!topCustomer) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No customer segments are available yet"
        description="Add customer trend signals first, then PrimeOS can recommend which demand lane to activate."
      />
    );
  }

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? topCustomer;
  const totalSegmentSize = customers.reduce((sum, customer) => sum + (customer.segmentSize ?? 0), 0);
  const matchingCampaign = findCampaignBySku(snapshot, selectedCustomer.recommendedProduct);
  const matchingForecast = findForecastBySku(snapshot, selectedCustomer.recommendedProduct);
  const selectedSegmentSize = selectedCustomer.segmentSize ?? 0;
  const selectedShare = totalSegmentSize ? Math.round((selectedSegmentSize / totalSegmentSize) * 100) : 0;
  const productRoute = runtimeSkuLabel(selectedCustomer.recommendedProduct);
  const selectedCustomerProduct = findProductBySku(snapshot, selectedCustomer.recommendedProduct);
  const selectedTrendCreator = findCreatorBySku(data?.creators, selectedCustomer.recommendedProduct);
  const intentNumbers = extractRuntimeNumbers(selectedCustomer.recentIntent);
  const actualIntent = intentNumbers[0] ?? Math.max(1, Math.round(selectedSegmentSize * 0.16));
  const conversionIntent = intentNumbers[1] ?? Math.max(1, Math.round(actualIntent * 0.18));
  const forecastDemand = matchingForecast?.demand7d ?? Math.max(1, Math.round(actualIntent * (selectedCustomer.potentialScore / 100)));
  const stockSignal = matchingForecast
    ? matchingForecast.risk === 'high'
      ? 'Stock guardrail'
      : 'Stock ready'
    : 'Stock pending';
  const selectedTrendProductName = selectedCustomerProduct?.name || runtimeSkuName(selectedCustomer.recommendedProduct);
  const selectedTrendProductImage = selectedCustomerProduct?.images?.[0];
  const stockCover = matchingForecast
    ? Math.min(100, Math.round((matchingForecast.ats / Math.max(matchingForecast.demand7d, 1)) * 100))
    : selectedCustomer.potentialScore;
  const visibleTrendLanes = customers.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RuntimeTrendKpiCard
          label="Live intent"
          value={formatCompactCount(actualIntent)}
          detail={`${selectedCustomer.market} buyers are actively revisiting or saving this lane.`}
          tone="emerald"
          icon={<ScanSearch className="size-6" />}
        />
        <RuntimeTrendKpiCard
          label="Conversion signals"
          value={formatCompactCount(conversionIntent)}
          detail="Carts, quote asks, and high-intent product returns."
          tone="rose"
          icon={<Sparkles className="size-6" />}
        />
        <RuntimeTrendKpiCard
          label="7d forecast"
          value={formatCompactCount(forecastDemand)}
          detail={matchingForecast ? `${matchingForecast.ats} ATS available right now.` : 'Projected from current signal velocity.'}
          tone="sky"
          icon={<TrendingUp className="size-6" />}
        />
        <RuntimeTrendKpiCard
          label="Stock cover"
          value={`${stockCover}%`}
          detail={matchingForecast ? `${matchingForecast.risk} inventory risk before scale.` : 'No stock guardrail linked yet.'}
          tone="amber"
          icon={<Gauge className="size-6" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden rounded-lg border">
          <CardHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
                  {selectedTrendProductImage ? (
                    <img src={selectedTrendProductImage} alt={selectedTrendProductName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="size-7" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <Badge variant="outline">PrimeOS market read</Badge>
                  <CardTitle className="mt-3 text-2xl">{selectedCustomer.segmentName}</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    PrimeOS sees this trend as the clearest demand lane now: {formatCompactCount(actualIntent)} live intent signals, {formatCompactCount(conversionIntent)} conversion signals, and a 7-day forecast of {formatCompactCount(forecastDemand)}.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge variant={runtimeStatusVariant(selectedCustomer.status)} className="capitalize">{humanizeIntelligenceValue(selectedCustomer.status)}</Badge>
                <Badge variant="outline">{selectedCustomer.potentialScore}% momentum</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedCustomer.market}</Badge>
              <Badge variant="outline">{humanizeIntelligenceValue(selectedCustomer.lifecycle)}</Badge>
              <Badge variant="outline">Product {productRoute}</Badge>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Intelligence readout</div>
              <p className="mt-3 text-lg font-semibold">
                Activate {selectedCustomer.segmentName.toLowerCase()} around {selectedTrendProductName.toLowerCase()}.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedCustomer.recentIntent || 'PrimeOS is waiting for stronger trend evidence on this segment.'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <RuntimeContextCard label="Buyer pool" value={formatCompactCount(selectedSegmentSize)} detail={`${selectedShare}% of tracked buyer volume.`} />
              <RuntimeContextCard label="Creator proof" value={selectedTrendCreator?.creatorName || 'Pending'} detail={selectedTrendCreator ? `${humanizeIntelligenceValue(selectedTrendCreator.primaryChannel)} proof layer is available.` : 'Attach creator proof before launch.'} />
              <RuntimeContextCard label="Next move" value="Launch route" detail={selectedCustomer.nextMove || 'Push this trend into Launch Decisions before budget moves.'} />
            </div>
          </CardContent>
        </Card>

        <RuntimeTrendForecastChart
          actualIntent={actualIntent}
          conversionIntent={conversionIntent}
          forecastDemand={forecastDemand}
          momentum={selectedCustomer.potentialScore}
          productRoute={productRoute}
          risk={matchingForecast?.risk}
        />
      </div>

      <Tabs defaultValue="signals" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-3xl grid-cols-3 rounded-2xl border bg-background p-1">
          <TabsTrigger value="signals" className="rounded-xl">Market signals</TabsTrigger>
          <TabsTrigger value="forecast" className="rounded-xl">Forecast</TabsTrigger>
          <TabsTrigger value="activation" className="rounded-xl">Activation guidance</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="mt-0">
          <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
            <Card className="rounded-lg border">
              <CardHeader>
                <CardTitle>Trend lanes</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Choose a lane only if it has stronger market heat or a cleaner launch route.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {visibleTrendLanes.map((customer) => {
                  const isSelected = selectedCustomer.id === customer.id;

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 ${isSelected ? 'border-primary/40 bg-primary/5' : 'bg-muted/10'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{customer.segmentName}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{runtimeSkuLabel(customer.recommendedProduct)}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold">{customer.potentialScore}%</div>
                          <div className="text-[11px] text-muted-foreground">{formatCompactCount(customer.segmentSize)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={customer.potentialScore} className="h-1.5 flex-1" />
                        <Badge variant={runtimeStatusVariant(customer.status)} className="shrink-0 capitalize">
                          {humanizeIntelligenceValue(customer.status)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <RuntimeTrendGeoMap
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomerId}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <RuntimeContextCard label="Market reality" value={formatCompactCount(actualIntent)} detail={`${formatCompactCount(conversionIntent)} of those signals are close to conversion.`} />
                <RuntimeContextCard label="Campaign signal" value={matchingCampaign ? matchingCampaign.name : 'Route pending'} detail={matchingCampaign ? `${matchingCampaign.leads} leads and ${matchingCampaign.orders} orders already sit on this SKU route.` : 'No live campaign has been linked to this trend yet.'} />
                <RuntimeContextCard label="CRM memory" value="Audience owned" detail="CRM Compact should hold the segment, owner, and next follow-up once this trend moves forward." />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-lg border lg:col-span-2">
              <CardHeader>
                <CardTitle>Forecast guardrail</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">PrimeOS checks whether the trend can scale without breaking stock or campaign quality.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <RuntimeContextCard label="Projected 7d demand" value={formatCompactCount(forecastDemand)} detail="Expected demand if this lane is activated now." />
                  <RuntimeContextCard label="ATS available" value={matchingForecast ? formatCompactCount(matchingForecast.ats) : 'Pending'} detail={stockSignal} />
                  <RuntimeContextCard label="Coverage" value={`${stockCover}%`} detail={matchingForecast ? `${matchingForecast.risk} risk before broader scale.` : 'Attach inventory to confirm scale.'} />
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stock cover</div>
                      <div className="mt-1 text-sm font-medium">{matchingForecast ? `${matchingForecast.ats} ATS vs ${matchingForecast.demand7d} forecast demand` : 'No live stock signal attached yet.'}</div>
                    </div>
                    <Badge variant={matchingForecast?.risk === 'high' ? 'destructive' : 'outline'} className="capitalize">{matchingForecast?.risk || 'pending'}</Badge>
                  </div>
                  <Progress value={stockCover} className="mt-4 h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border">
              <CardHeader>
                <CardTitle>Product route</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-36 overflow-hidden rounded-2xl border bg-muted/20">
                  {selectedTrendProductImage ? (
                    <img src={selectedTrendProductImage} alt={selectedTrendProductName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="size-8" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">{selectedTrendProductName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{productRoute}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activation" className="mt-0">
          <Card className="rounded-lg border">
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">PrimeOS recommendation</div>
                <p className="mt-3 text-xl font-semibold">Move this trend into Launch Decisions.</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedCustomer.nextMove || 'Push this trend into Launch Decisions before budget moves.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to={INTELLIGENCE_DECISIONS_HREF}>
                      Send to Launch Decisions
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/customer/crm-compact">Open CRM Compact</Link>
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <RuntimeContextCard label="Creator proof" value={selectedTrendCreator?.creatorName || 'Creator pending'} detail={selectedTrendCreator ? `${selectedTrendCreator.fitScore}% fit on ${humanizeIntelligenceValue(selectedTrendCreator.primaryChannel)}.` : 'Attach a creator before campaign execution.'} />
                <RuntimeContextCard label="Demand handoff" value="Campaign Ops" detail="Campaign Ops receives the product route, buyer lane, forecast guardrail, and CRM audience memory." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompactLaunchDecisionsRuntimePanel({
  data,
  isLoading,
  error,
  snapshot,
}: {
  data: IntelligenceControlPlaneSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  snapshot: PrimeSnapshot;
}) {
  const creatorLookup = useMemo(
    () => new Map((data?.creators ?? []).map((creator) => [normalizeRuntimeText(creator.creatorName), creator])),
    [data]
  );
  const customerLookup = useMemo(
    () => new Map((data?.customers ?? []).map((customer) => [normalizeRuntimeText(customer.segmentName), customer])),
    [data]
  );
  const launchDecisions = useMemo(() => [...(data?.launchDecisions ?? [])].sort((left, right) => {
    const leftPriority = launchDecisionPriority(left.approvalStatus);
    const rightPriority = launchDecisionPriority(right.approvalStatus);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return right.confidence - left.confidence;
  }), [data]);
  const topDecision = launchDecisions[0] ?? null;
  const [selectedDecisionId, setSelectedDecisionId] = useState('');

  useEffect(() => {
    if (!topDecision) {
      if (selectedDecisionId) setSelectedDecisionId('');
      return;
    }

    if (!launchDecisions.some((decision) => decision.id === selectedDecisionId)) {
      setSelectedDecisionId(topDecision.id);
    }
  }, [launchDecisions, selectedDecisionId, topDecision]);

  if (isLoading) return <IntelligenceRuntimeLoadingState label="launch decisions" />;
  if (error) return <IntelligenceRuntimeErrorState title="Launch decisions are unavailable" />;
  if (!topDecision) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No launch decisions are available yet"
        description="Add one launch candidate first, then PrimeOS can judge whether it should go, review, hold, or stop."
      />
    );
  }

  const selectedDecision = launchDecisions.find((decision) => decision.id === selectedDecisionId) ?? topDecision;
  const launchCta = getLaunchRuntimeCta(selectedDecision);
  const selectedDecisionCreator = creatorLookup.get(normalizeRuntimeText(selectedDecision.creatorName)) ?? null;
  const selectedDecisionCustomer = customerLookup.get(normalizeRuntimeText(selectedDecision.customerSegment)) ?? null;
  const matchingCampaign = findCampaignBySku(snapshot, selectedDecision.skuCode);
  const matchingForecast = findForecastBySku(snapshot, selectedDecision.skuCode);
  const selectedDecisionProduct = findProductBySku(snapshot, selectedDecision.skuCode);
  const creatorProofScore = selectedDecisionCreator?.fitScore ?? selectedDecision.confidence;
  const trendHeatScore = selectedDecisionCustomer?.potentialScore ?? Math.max(58, selectedDecision.confidence - 8);
  const skuReadinessScore = matchingForecast
    ? matchingForecast.risk === 'high'
      ? Math.max(42, Math.min(72, Math.round((matchingForecast.ats / Math.max(matchingForecast.demand7d, 1)) * 70)))
      : matchingForecast.risk === 'medium'
        ? 76
        : 91
    : matchingCampaign
      ? 82
      : 64;
  const opsGuardrailScore = Math.min(98, Math.max(50, selectedDecision.confidence + (matchingCampaign ? 4 : 0) - (selectedDecision.blocker ? 6 : 0)));
  const signalScores = [
    {
      label: 'Creator proof',
      value: creatorProofScore,
      detail: selectedDecisionCreator
        ? `${selectedDecision.creatorName} is carrying ${selectedDecisionCreator.fitScore}% fit on ${runtimeSkuLabel(selectedDecisionCreator.linkedSku)}.`
        : `${selectedDecision.creatorName} is attached, but PrimeOS has not matched the creator row yet.`,
    },
    {
      label: 'Trend heat',
      value: trendHeatScore,
      detail: selectedDecisionCustomer
        ? `${selectedDecision.customerSegment} has ${selectedDecisionCustomer.potentialScore}% momentum in ${selectedDecisionCustomer.market}.`
        : `${selectedDecision.customerSegment} is part of the decision, but trend detail is not linked yet.`,
    },
    {
      label: 'SKU readiness',
      value: skuReadinessScore,
      detail: matchingForecast
        ? `${matchingForecast.ats} ATS vs ${matchingForecast.demand7d} projected 7-day demand, ${matchingForecast.risk} risk.`
        : `${runtimeSkuLabel(selectedDecision.skuCode)} still needs a live COS guardrail.`,
    },
    {
      label: 'Ops / finance guardrail',
      value: opsGuardrailScore,
      detail: matchingCampaign
        ? `${matchingCampaign.orders} orders and ${currency.format(matchingCampaign.revenue)} already trace to adjacent demand.`
        : selectedDecision.blocker || 'PrimeOS is waiting for execution proof before calling this fully operational.',
    },
  ];
  const weakestSignal = signalScores.reduce((weakest, signal) => (signal.value < weakest.value ? signal : weakest), signalScores[0]);
  const decisionMode = selectedDecision.approvalStatus === 'approved'
    ? 'Go'
    : selectedDecision.approvalStatus === 'hold'
      ? 'Hold'
      : selectedDecision.approvalStatus === 'rejected'
        ? 'No-go'
        : 'Review';
  const decisionVerb = decisionMode === 'Go'
    ? 'Launch now'
    : decisionMode === 'Review'
      ? 'Review first'
      : decisionMode === 'Hold'
        ? 'Hold launch'
        : 'Do not launch';
  const decisionQuestion = decisionMode === 'Go'
    ? 'Ready to send into execution.'
    : decisionMode === 'Review'
      ? 'One signal needs human review before launch.'
      : decisionMode === 'Hold'
        ? 'Wait until the blocker is cleared.'
        : 'Keep this route out of execution.';
  const blockerCopy = selectedDecision.blocker || (weakestSignal.value < 75 ? weakestSignal.detail : 'No major blocker. Keep an eye on the weakest signal before scale.');
  const nextActionCopy = selectedDecision.approvalStatus === 'approved'
    ? launchCta.detail
    : selectedDecision.blocker
      ? `Clear blocker: ${selectedDecision.blocker}`
      : `Check ${weakestSignal.label.toLowerCase()} before sending to Campaign Ops.`;
  const evidenceCards = [
    {
      label: 'Creator proof',
      value: selectedDecision.creatorName,
      detail: selectedDecisionCreator
        ? `${selectedDecisionCreator.fitScore}% fit on ${humanizeIntelligenceValue(selectedDecisionCreator.primaryChannel)}.`
        : 'Creator is attached to the launch route.',
    },
    {
      label: 'Demand trend',
      value: selectedDecision.customerSegment,
      detail: selectedDecisionCustomer
        ? `${selectedDecisionCustomer.potentialScore}% momentum in ${selectedDecisionCustomer.market}.`
        : 'Customer trend is attached to the decision.',
    },
    {
      label: 'SKU guardrail',
      value: runtimeSkuLabel(selectedDecision.skuCode),
      detail: matchingForecast
        ? `${matchingForecast.ats} ATS vs ${matchingForecast.demand7d} forecast, ${matchingForecast.risk} risk.`
        : 'Inventory forecast is not linked yet.',
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border shadow-sm">
        <CardContent className="grid gap-5 p-4 xl:grid-cols-[280px_minmax(0,1fr)_210px] xl:items-stretch">
          <RuntimeRecommendationVisual
            creator={selectedDecisionCreator}
            product={selectedDecisionProduct}
            productLabel={runtimeSkuLabel(selectedDecision.skuCode)}
            variant="launch"
            eyebrow="Launch route"
            decisionMode={decisionMode}
            className="order-2 xl:order-1"
          />

          <div className="order-1 flex min-w-0 flex-col justify-center xl:order-2">
            <Badge variant="outline" className="w-fit">PrimeOS recommends</Badge>
            <CardTitle className="mt-3 text-3xl leading-tight">{decisionVerb}: {selectedDecision.decisionName}</CardTitle>
            <p className="mt-3 max-w-3xl text-base text-muted-foreground">
              {selectedDecision.whyThisLaunch || `${selectedDecision.creatorName} and ${selectedDecision.customerSegment} are the clearest current route into ${runtimeSkuName(selectedDecision.skuCode).toLowerCase()}.`}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {evidenceCards.map((evidence) => (
                <div key={evidence.label} className="rounded-2xl border bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{evidence.label}</div>
                  <div className="mt-2 line-clamp-2 text-sm font-semibold">{evidence.value}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{evidence.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-3 flex flex-col justify-between rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-4 text-center shadow-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Decision</div>
              <div className="mt-3 text-5xl font-semibold leading-none">{selectedDecision.confidence}%</div>
              <Badge variant={runtimeStatusVariant(selectedDecision.approvalStatus)} className="mt-3 capitalize">
                {humanizeIntelligenceValue(selectedDecision.approvalStatus)}
              </Badge>
              <p className="mx-auto mt-4 max-w-[12rem] text-sm text-muted-foreground">{decisionQuestion}</p>
            </div>
            <div className="mt-5 space-y-2">
              <Button asChild className="w-full px-3">
                <Link to={launchCta.href}>
                  {launchCta.shortLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/customer/crm-compact">Open CRM</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <Card className="rounded-lg border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">What to do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-primary/5 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-primary">Next action</div>
              <div className="mt-2 text-xl font-semibold">{decisionVerb}</div>
              <p className="mt-2 text-sm text-muted-foreground">{nextActionCopy}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Owner</div>
              <div className="mt-2 text-base font-semibold">{selectedDecision.owner || 'Launch owner needed'}</div>
              <p className="mt-1 text-sm text-muted-foreground">This person owns the next move, not another round of analysis.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Main risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-2xl border bg-muted/20 p-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Watch first</div>
                <div className="mt-2 text-xl font-semibold">{weakestSignal.label}</div>
              </div>
              <div className="text-2xl font-semibold">{weakestSignal.value}%</div>
            </div>
            <Progress value={weakestSignal.value} className="h-2" />
            <p className="text-sm text-muted-foreground">{blockerCopy}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Expected result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">If executed</div>
              <p className="mt-2 text-base font-semibold">{selectedDecision.expectedResponse || launchCta.detail}</p>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Campaign route</div>
              <div className="mt-2 text-sm font-semibold">{matchingCampaign ? matchingCampaign.name : runtimeSkuLabel(selectedDecision.skuCode)}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {matchingCampaign ? `${matchingCampaign.leads} leads, ${matchingCampaign.rfqs} RFQs, ${matchingCampaign.orders} orders.` : 'Campaign Ops receives the approved route and CRM audience.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Other launch candidates</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Keep the queue visible, but do not make the user hunt for the main answer.</p>
            </div>
            <Badge variant="outline">{launchDecisions.length} candidates</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {launchDecisions.map((decision) => (
            <button
              key={decision.id}
              type="button"
              onClick={() => setSelectedDecisionId(decision.id)}
              className={`rounded-2xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 ${selectedDecision.id === decision.id ? 'border-primary/40 bg-primary/5' : 'bg-muted/10'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{decision.decisionName}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{decision.creatorName} x {decision.customerSegment}</div>
                </div>
                <Badge variant={runtimeStatusVariant(decision.approvalStatus)} className="shrink-0 capitalize">
                  {humanizeIntelligenceValue(decision.approvalStatus)}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={decision.confidence} className="h-1.5 flex-1" />
                <span className="text-xs font-semibold">{decision.confidence}%</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IntelligencePanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = getPrimeSnapshot();
  const intelligenceControlQuery = useQuery({
    queryKey: ['prime-intelligence-control-plane'],
    queryFn: fetchIntelligenceControlPlane,
    staleTime: 5 * 1000,
    refetchInterval: 5 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: towerId === 'creators' || towerId === 'customers' || towerId === 'campaigns',
  });

  if (towerId === 'creators') {
    return (
      <CompactCreatorsRuntimePanel
        data={intelligenceControlQuery.data}
        isLoading={intelligenceControlQuery.isLoading}
        error={intelligenceControlQuery.error}
        snapshot={snapshot}
      />
    );
  }

  if (towerId === 'customers') {
    return (
      <CompactCustomersRuntimePanel
        data={intelligenceControlQuery.data}
        isLoading={intelligenceControlQuery.isLoading}
        error={intelligenceControlQuery.error}
        snapshot={snapshot}
      />
    );
  }

  if (towerId === 'campaigns') {
    return (
      <CompactLaunchDecisionsRuntimePanel
        data={intelligenceControlQuery.data}
        isLoading={intelligenceControlQuery.isLoading}
        error={intelligenceControlQuery.error}
        snapshot={snapshot}
      />
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
                  <p className="font-medium">{getSkuProductName(forecast.skuCode)}</p>
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
                  <TableCell>{getSkuLabel(campaign.skuCode)}</TableCell>
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

const towerJobDescriptions: Partial<Record<PrimeTowerId, { decide: string; handoff: string; handoffHref: string }>> = {
  creators: { decide: 'Which creator should help sell this product?', handoff: 'PrimeOS explains the fit and sends the best route into Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  customers: { decide: 'Pick the customer trend to activate now.', handoff: 'Send the trend into Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  campaigns: { decide: 'Launch, review, hold, or no-go?', handoff: 'If Go, send it to Campaign Ops. If not, clear the one blocker.', handoffHref: '/demand/campaign-ops' },
  analytics: { decide: 'Where is my funnel breaking and what is working?', handoff: 'Findings feed into Launch Decisions and AI Operator.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  attribution: { decide: 'Which channel is actually driving orders, not just clicks?', handoff: 'Attribution data guides approval inside Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  forecasting: { decide: 'Will my inventory survive the next 7 days of demand?', handoff: 'High-risk SKUs trigger throttle flags in Campaign Ops.', handoffHref: '/demand/campaign-ops' },
  voc: { decide: 'What are customers saying and how does it affect my next move?', handoff: 'VOC flags go to Campaign Ops and Service for action.', handoffHref: '/demand/campaign-ops' },
  alerts: { decide: 'What needs my attention right now across the entire system?', handoff: 'Each alert links to the responsible tower for resolution.', handoffHref: '/intelligence/ai-operator' },
  'ai-operator': { decide: 'What should the system do next based on everything it knows?', handoff: 'Recommendations route to the tower that owns the action.', handoffHref: '/overview' },
  'campaign-ops': { decide: 'What should the seller execute now: message, ad, SEO content, or stock task?', handoff: 'Executed actions create leads, RFQs, creator work, and Ecom guardrails.', handoffHref: '/demand/lead-response-capture' },
  'content-creator-ops': { decide: 'Which KOL, brief, live slot, or asset kit should be created now?', handoff: 'Approved proof feeds Campaign Ops, ads, SEO, and marketplace content.', handoffHref: '/demand/campaign-ops' },
  'lead-response-capture': { decide: 'Which buyer needs a reply, owner, phone follow-up, or CRM sync now?', handoff: 'Qualified intent becomes CRM memory, quote work, and repeat outreach.', handoffHref: '/customer/crm-compact' },
  'retargeting-outreach': { decide: 'Which warm buyer should receive a sequence, retargeting ad, offer, or suppression?', handoff: 'Recovered buyers move into CRM Compact and order loops.', handoffHref: '/customer/crm-compact' },
  'crm-compact': { decide: 'Which customer record needs follow-up, ownership, or service attention next?', handoff: 'Customer memory feeds Trends Intelligence for smarter targeting.', handoffHref: '/intelligence/trends' },
  service: { decide: 'Is this issue resolved and did it affect customer trust?', handoff: 'Resolution updates the CRM Compact timeline.', handoffHref: '/customer/crm-compact' },
  capital: { decide: 'Is this launch route operationally strong enough to justify capital?', handoff: 'PrimeOS turns the strongest readiness lane into a concrete offer review.', handoffHref: '/finance/capital-offers' },
  offers: { decide: 'Is this seller eligible for capital, and which offer should they request?', handoff: 'Approved requests flow back into Finance Health so repayment stays visible.', handoffHref: '/finance/health' },
  risk: { decide: 'What should this seller avoid or fix before asking for more capital?', handoff: 'Cleared eligibility blockers unlock safer Capital Offers.', handoffHref: '/finance/capital-offers' },
  settlement: { decide: 'Is seller finance healthy enough to keep scaling?', handoff: 'Health recommendations feed Demand, CRM, and the next capital decision.', handoffHref: '/finance/capital-offers' },
};

export function PrimeTowerPage({ towerId }: PrimeTowerPageProps) {
  const config = PRIME_TOWER_CONFIGS[towerId];
  const job = towerJobDescriptions[towerId];
  const snapshot = getPrimeSnapshot();
  const confidence = getTowerConfidence(towerId, snapshot);
  const evidence = getTowerEvidence(towerId, snapshot);
  const loop = getTowerLoop(towerId, job, snapshot);
  const registryItems = getTowerRegistryItems(towerId, snapshot);

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title={config.tower}
        description={config.promise}
        actions={(
          <Badge variant="outline">{config.area}</Badge>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <DecisionHeader
          eyebrow={`${config.area} operating workspace`}
          title={config.tower}
          description={job?.decide || config.promise}
          confidence={confidence}
          status={confidence >= 80 ? 'Ready' : confidence >= 65 ? 'Watch' : 'Needs action'}
          actions={(
            <>
              {job ? (
                <Button asChild>
                  <Link to={job.handoffHref}>
                    Open handoff
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link to="/overview">
                  Back to loop
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </>
          )}
          evidence={evidence}
        />

        <LinkedEntityStrip
          entities={[
            { label: 'Area', value: config.area, tone: 'purple' },
            { label: 'Tower', value: config.tower, tone: 'info' },
            { label: 'Orders', value: String(snapshot.orders.length), href: '/ecom/cos/oms', tone: 'success' },
            { label: 'Signals', value: String(snapshot.socialStreams.length + snapshot.vocInsights.length), href: '/intelligence/trends', tone: 'muted' },
          ]}
        />

        <OperatingLoop steps={loop} />

        {job ? (
          <HandoffRail
            from={config.tower}
            to={job.handoff}
            detail={config.promise}
            href={job.handoffHref}
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
          <EvidenceStack items={evidence} />
          <RegistryList items={registryItems} />
          <div className="grid gap-4">
            <OutcomePreview
              value={demandTowerIds.includes(towerId) ? snapshot.orders.length : intelligenceTowerIds.includes(towerId) ? snapshot.activationPlays.length : snapshot.customers.length}
              detail={demandTowerIds.includes(towerId) ? 'Orders read back from OMS after demand execution.' : intelligenceTowerIds.includes(towerId) ? 'Activation plays ready for operator handoff.' : 'Customer/account records available for operating context.'}
              tone={confidence >= 80 ? 'success' : 'info'}
            />
            <ActionSetupPanel
              title={job ? 'Continue the accountable handoff' : 'Return to the operating loop'}
              detail={job?.handoff || 'Use the overview to select the next owner workspace.'}
              actionLabel={job ? 'Open next tower' : 'Open overview'}
              href={job?.handoffHref || '/overview'}
            />
          </div>
        </section>

        {job ? (
          <Card className="rounded-lg border border-primary/20 bg-primary/5">
            <CardContent className="grid gap-3 p-4 text-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <span className="font-medium">You decide:</span>{' '}
                <span className="text-muted-foreground">{job.decide}</span>
              </div>
              <Link to={job.handoffHref} className="inline-flex items-center gap-1 text-primary hover:underline">
                {job.handoff} <ArrowRight className="size-3" />
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {financeTowerIds.includes(towerId) ? <FinancePanel towerId={towerId} /> : null}
        {demandTowerIds.includes(towerId) ? <DemandPanel towerId={towerId} /> : null}
        {towerId === 'crm-compact' || towerId === 'service' ? <CustomerPanel towerId={towerId} /> : null}
        {intelligenceTowerIds.includes(towerId) ? <IntelligencePanel towerId={towerId} /> : null}
      </div>
    </div>
  );
}
