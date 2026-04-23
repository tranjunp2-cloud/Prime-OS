import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BellRing,
  Bot,
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
  PanelsTopLeft,
  Phone,
  RadioTower,
  ScanSearch,
  Search,
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
  type FinanceControlPlaneSnapshot,
  type RiskTrustRecord,
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
const financeTowerIds: PrimeTowerId[] = ['capital', 'offers', 'risk', 'settlement'];

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
                emptyHref="/intelligence/customers"
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
      detail: 'Capital offers make funding concrete by showing the amount, provider, fee, and repayment model tied to a real launch path.',
    },
    risk: {
      label: 'Narrative role',
      detail: 'Risk and trust explain what a lender would worry about, what PrimeOS still trusts, and what the team should fix before scale.',
    },
    settlement: {
      label: 'Narrative role',
      detail: 'Settlement and repayment keep the capital loop closed by showing where money went, how it comes back, and whether collection is healthy.',
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
          <SummaryMetricCard label="Primary product" value={primaryCampaign ? getSkuLabel(primaryCampaign.skuCode) : 'COS product'} meta="Campaign ops stays anchored to real product and SKU context." icon={<ClipboardList className="size-5" />} tone="purple" />
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
              {snapshot.campaigns.slice(0, 4).map((campaign, index) => (
                <div key={`handoff-${campaign.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">{getSkuLabel(campaign.skuCode)}</p>
                  <p className="mt-2 text-muted-foreground">{[
                    `Live traffic is flowing into this SKU from ${campaign.channel}. ${campaign.leads} leads captured so far.`,
                    `This SKU has ${campaign.rfqs} open RFQs waiting for follow-up in Lead & Response Capture.`,
                    `${campaign.orders} orders traced back to this campaign. Fulfillment team can verify via OMS.`,
                    `Revenue proof: ${currency.format(campaign.revenue)} attributed to this product through demand execution.`,
                  ][index] || `Campaign is active against ${getSkuProductName(campaign.skuCode)} with ${campaign.traffic.toLocaleString()} traffic.`}</p>
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
          <SummaryMetricCard label="Creator briefs" value={snapshot.campaigns.length} meta="One brief per active campaign with SKU and channel context." icon={<MessageCircle className="size-5" />} tone="info" />
          <SummaryMetricCard label="Publishing queue" value={snapshot.socialStreams.length} meta="Content tasks scheduled across social and marketplace surfaces." icon={<RadioTower className="size-5" />} tone="success" />
          <SummaryMetricCard label="Assets pending" value={Math.max(1, snapshot.campaigns.length + 2)} meta="Creative and post approvals still in creator ops workflow." icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Livestream slots" value={Math.max(1, Math.min(snapshot.campaigns.length, 4))} meta="Reserved activation windows for creator-led launches." icon={<Bot className="size-5" />} tone="purple" />
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
                    <TableCell>{getSkuProductName(campaign.skuCode)} brief</TableCell>
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
          <SummaryMetricCard label="Retarget pools" value={snapshot.customers.length} meta="Audience sets built from customer lifecycle and campaign response." icon={<Target className="size-5" />} tone="info" />
          <SummaryMetricCard label="Outreach sequences" value={snapshot.activationPlays.length} meta="Active follow-up plays across owned and paid channels." icon={<Mail className="size-5" />} tone="success" />
          <SummaryMetricCard label="Promo pushes" value={snapshot.campaigns.filter((c) => c.status === 'active').length} meta="Offer pushes scheduled for recovery and reactivation." icon={<Megaphone className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Suppression rules" value={snapshot.activationPlays.length + 2} meta="Guardrails prevent duplicate or conflicting follow-up." icon={<BellRing className="size-5" />} tone="purple" />
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
        <SummaryMetricCard label="Primary product" value={primaryCampaign ? getSkuLabel(primaryCampaign.skuCode) : 'COS product'} meta="Demand is anchored to COS Product Master." icon={<Target className="size-5" />} tone="teal" />
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
                  <TableCell>{getSkuLabel(campaign.skuCode)}</TableCell>
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

function IntelligenceRuntimeLoadingState({ label }: { label: string }) {
  return (
    <Card className="rounded-lg border">
      <CardContent className="flex min-h-48 items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading {label} from the admin control plane...</span>
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
          PrimeOS expects admin-managed control-plane data here. Bring the backend control plane back online to restore this runtime view.
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
        <SummaryMetricCard label="CRM records" value={snapshot.customers.length} meta="Built from orders, leads, returns, and customer memory." icon={<HeartHandshake className="size-5" />} tone="success" />
        <SummaryMetricCard label="Revenue under memory" value={currency.format(snapshot.metrics.revenue)} meta="OMS revenue stays visible next to follow-up and lifecycle context." icon={<UserRoundCheck className="size-5" />} tone="info" className="md:col-span-2" />
        <SummaryMetricCard label="Open follow-up lanes" value={snapshot.customers.filter((customer) => customer.lifecycle !== 'retention').length} meta="These records still need attention, ownership, or service follow-up." icon={<ClipboardList className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>CRM workbench</CardTitle>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.customers.map((customer, index) => {
                  const owner = ['Mika Sato', 'Emi Tan', 'Bao Nguyen', 'Ken Mori'][index % 4];
                  const nextFollowUp = customer.lifecycle === 'lead'
                    ? 'Qualify for RFQ'
                    : customer.lifecycle === 'at-risk'
                      ? 'Recovery outreach'
                      : customer.totalOrders > 1
                        ? 'Repeat offer check'
                        : 'Lifecycle review';

                  return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        <span className="text-xs text-muted-foreground">{customer.company} · {customer.segment}</span>
                      </div>
                    </TableCell>
                    <TableCell className={statusTone(customer.lifecycle)}>{customer.lifecycle}</TableCell>
                    <TableCell>{owner}</TableCell>
                    <TableCell>{nextFollowUp}</TableCell>
                    <TableCell className="text-right">{currency.format(customer.totalRevenue)}</TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Relationship memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {snapshot.customers.slice(0, 4).map((customer, ci) => {
                const owner = ['Mika Sato', 'Emi Tan', 'Bao Nguyen', 'Ken Mori'][ci % 4];
                const nextFollowUp = customer.lifecycle === 'lead'
                  ? 'Qualify for RFQ'
                  : customer.lifecycle === 'at-risk'
                    ? 'Recovery outreach'
                    : customer.totalOrders > 1
                      ? 'Repeat offer check'
                      : 'Lifecycle review';

                return (
                <div key={customer.id} className="relative pb-6 last:pb-0">
                  {ci < Math.min(snapshot.customers.length, 4) - 1 ? (
                    <span className="absolute left-5 top-10 -ml-px h-full w-px bg-border" />
                  ) : null}
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted/40 text-xs font-semibold">
                      {customer.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                        <Badge variant="outline">{customer.lifecycle}</Badge>
                        <span className="text-xs text-muted-foreground">{customer.company}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {customer.timeline.slice(0, 4).map((entry, ei) => (
                          <div key={`${customer.id}-t-${ei}`} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                            <span className="text-muted-foreground">{entry}</span>
                          </div>
                        ))}
                      </div>
                      {customer.notes[0] ? (
                        <p className="mt-2 text-xs text-primary">{customer.notes[0]}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{customer.totalOrders} orders</span>
                        <span>·</span>
                        <span>{currency.format(customer.totalRevenue)}</span>
                        <span>·</span>
                        <span>Owner: {owner}</span>
                        <span>·</span>
                        <span>Next: {nextFollowUp}</span>
                        {customer.b2bAccount ? (
                          <>
                            <span>·</span>
                            <span>B2B: {customer.b2bAccount}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
  if (status === 'active') return 0;
  if (status === 'watch') return 1;
  if (status === 'paused') return 2;
  return 3;
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
  const readyCount = readinessRows.filter((row) => row.status === 'active' || row.readinessScore >= 80).length;
  const totalFundingNeed = readinessRows.reduce((sum, row) => sum + (row.fundingNeed ?? 0), 0);
  const averageReadiness = Math.round(readinessRows.reduce((sum, row) => sum + row.readinessScore, 0) / readinessRows.length);
  const matchingCampaign = findCampaignBySku(snapshot, selectedRow.linkedSku);
  const matchingForecast = findForecastBySku(snapshot, selectedRow.linkedSku);
  const relatedRisk = matchRiskRecordByKeyword(data?.riskTrust ?? [], selectedRow.market);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Capital programs" value={readinessRows.length} meta="Finance runtime reads only the readiness routes prepared in admin." icon={<CircleDollarSign className="size-5" />} tone="info" />
        <SummaryMetricCard label="Ready to fund" value={readyCount} meta="These rows already look strong enough to move into concrete offers." icon={<Sparkles className="size-5" />} tone="success" />
        <SummaryMetricCard label="Funding need" value={formatFinanceCurrency(totalFundingNeed)} meta="PrimeOS keeps the amount tied to a real launch instead of a generic loan request." icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Average readiness" value={`${averageReadiness}%`} meta={`${topRow.programName} is the strongest current finance route.`} icon={<Gauge className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Capital readiness roster</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">A compact runtime readout of launch routes that finance could credibly back.</p>
              </div>
              <Badge variant="outline">Admin-managed source</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Linked launch</TableHead>
                  <TableHead className="text-right">Need</TableHead>
                  <TableHead className="text-right">Readiness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readinessRows.slice(0, 6).map((row) => (
                  <TableRow key={row.id} className={selectedRow.id === row.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <button type="button" className="flex flex-col text-left" onClick={() => setSelectedRowId(row.id)}>
                        <span>{row.programName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{humanizeIntelligenceValue(row.status)}</span>
                      </button>
                    </TableCell>
                    <TableCell>{row.market}</TableCell>
                    <TableCell>{row.linkedLaunch || 'Launch route pending'}</TableCell>
                    <TableCell className="text-right">{formatFinanceCurrency(row.fundingNeed)}</TableCell>
                    <TableCell className="text-right">{row.readinessScore}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Prime finance thesis</CardTitle>
            <p className="text-sm text-muted-foreground">PrimeOS keeps finance simple here: why this route is fundable, which systems support it, and what should happen next.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended readiness lane</div>
              <div className="mt-2 text-lg font-semibold">{selectedRow.programName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedRow.linkedLaunch || 'Launch route pending'} · {selectedRow.market}
              </div>
              <p className="mt-3 text-sm font-medium">{selectedRow.readinessReason || 'This row already has enough operating proof to move into offer review.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RuntimeContextCard
                label="Launch decision"
                value={selectedRow.linkedLaunch || 'Launch link missing'}
                detail="Finance only becomes useful when the capital need is tied to a real launch rather than a vague business goal."
              />
              <RuntimeContextCard
                label="Funding need"
                value={formatFinanceCurrency(selectedRow.fundingNeed)}
                detail={`Next review ${formatFinanceDate(selectedRow.nextReview)} with ${selectedRow.owner}.`}
              />
              <RuntimeContextCard
                label="Demand proof"
                value={matchingCampaign ? `${matchingCampaign.leads} leads / ${matchingCampaign.orders} orders` : 'Demand proof still light'}
                detail={
                  matchingCampaign
                    ? `${matchingCampaign.name} already shows response against ${runtimeSkuName(selectedRow.linkedSku).toLowerCase()}, so the capital ask is grounded in market activity.`
                    : 'Campaign Ops has not attached enough commercial proof to this route yet.'
                }
              />
              <RuntimeContextCard
                label="Ecom / COS"
                value={matchingForecast ? `${matchingForecast.ats} ATS / ${matchingForecast.demand7d} 7d demand` : runtimeSkuLabel(selectedRow.linkedSku)}
                detail={
                  matchingForecast
                    ? matchingForecast.risk === 'high'
                      ? 'Inventory is still the key guardrail before this route should absorb more capital.'
                      : 'Stock and projected demand are aligned enough for finance to take this route seriously.'
                    : 'Inventory proof has not been attached yet.'
                }
              />
              <RuntimeContextCard
                label="CRM + Customer"
                value={`${snapshot.customers.length} customer profiles`}
                detail={`${currency.format(snapshot.customers.reduce((sum, customer) => sum + customer.totalRevenue, 0))} in CRM revenue gives finance a retention and repayment quality read, not just a one-time launch view.`}
              />
              <RuntimeContextCard
                label="Risk & trust"
                value={relatedRisk ? `${relatedRisk.trustScore}% trust score` : 'Risk review pending'}
                detail={relatedRisk?.topRisk || 'PrimeOS still needs a clearer risk lane before this route should scale.'}
              />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
              <div className="mt-2 text-sm font-medium">
                {readyCount > 0
                  ? `${readyCount} capital routes are strong enough to move into Capital Offers, and ${selectedRow.programName} is the clearest one to price now.`
                  : `${topRow.programName} is the strongest finance route, but it still needs more proof before a clean offer can be shown.`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/finance/capital-offers">Open Capital Offers</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/intelligence/launch-decisions">Open Launch Decisions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
  const activeOffers = offers.filter((offer) => offer.status === 'active').length;
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Active offers" value={activeOffers} meta="PrimeOS only shows priced routes that admin has already curated." icon={<ClipboardList className="size-5" />} tone="info" />
        <SummaryMetricCard label="Offer capacity" value={formatFinanceCurrency(totalOfferAmount)} meta="The amount stays tied to concrete launch routes and repayment logic." icon={<CircleDollarSign className="size-5" />} tone="success" />
        <SummaryMetricCard label="Average fee rate" value={`${averageFeeRate}%`} meta="Sellers can understand the cost of scale without opening an admin tool." icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Split-settlement lanes" value={splitSettlementOffers} meta="PrimeOS highlights offers that can repay directly from commerce flows." icon={<HeartHandshake className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Capital offers roster</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">A runtime view of which funding packages are actually on the table.</p>
              </div>
              <Badge variant="outline">Admin-managed source</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Offer</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Repayment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.slice(0, 6).map((offer) => (
                  <TableRow key={offer.id} className={selectedOffer.id === offer.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <button type="button" className="flex flex-col text-left" onClick={() => setSelectedOfferId(offer.id)}>
                        <span>{offer.offerName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{humanizeIntelligenceValue(offer.status)}</span>
                      </button>
                    </TableCell>
                    <TableCell>{offer.providerName}</TableCell>
                    <TableCell>{humanizeIntelligenceValue(offer.capitalType)}</TableCell>
                    <TableCell className="text-right">{formatFinanceCurrency(offer.amount)}</TableCell>
                    <TableCell>{humanizeIntelligenceValue(offer.repaymentModel)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Prime offer strip</CardTitle>
            <p className="text-sm text-muted-foreground">PrimeOS shows the financing option in plain operating terms: what it funds, who provides it, what it costs, and how repayment will work.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended offer</div>
              <div className="mt-2 text-lg font-semibold">{selectedOffer.offerName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedOffer.providerName} · {humanizeIntelligenceValue(selectedOffer.capitalType)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RuntimeContextCard
                label="Amount"
                value={formatFinanceCurrency(selectedOffer.amount)}
                detail={`${selectedOffer.termDays ?? 0} day term with ${selectedOffer.feeRate ?? 0}% fee rate.`}
              />
              <RuntimeContextCard
                label="Repayment"
                value={humanizeIntelligenceValue(selectedOffer.repaymentModel)}
                detail={relatedSettlement ? `${relatedSettlement.facilityName} already shows how this collection path will look after funding.` : 'Settlement configuration is still being attached in admin.'}
              />
              <RuntimeContextCard
                label="Linked launch"
                value={selectedOffer.linkedLaunch || 'Launch route pending'}
                detail="Offers stay grounded in a launch plan so finance feels like an operating tool, not a generic banking form."
              />
              <RuntimeContextCard
                label="Capital readiness"
                value={relatedReadiness ? `${relatedReadiness.readinessScore}% readiness` : 'Readiness lane pending'}
                detail={relatedReadiness?.readinessReason || 'PrimeOS still needs a stronger readiness thesis before this offer should be pushed harder.'}
              />
              <RuntimeContextCard
                label="Risk & trust"
                value={relatedRisk ? `${relatedRisk.trustScore}% trust score` : 'Risk review pending'}
                detail={relatedRisk?.topRisk || 'No risk lane is attached yet, so PrimeOS cannot fully explain the downside on this offer.'}
              />
              <RuntimeContextCard
                label="Commerce proof"
                value={`${currency.format(snapshot.metrics.revenue)} revenue`}
                detail={`${snapshot.metrics.leadToOrderRate}% lead-to-order and ${currency.format(snapshot.metrics.opportunityValue)} of open opportunity help explain why this financing path exists now.`}
              />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
              <div className="mt-2 text-sm font-medium">
                PrimeOS should move this offer into settlement review only after the team agrees the repayment path is realistic for the launch it is funding.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/finance/settlement-repayment">Open Settlement &amp; Repayment</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/finance/risk-trust">Open Risk &amp; Trust</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
    return <IntelligenceRuntimeLoadingState label="risk and trust" />;
  }

  if (error) {
    return <IntelligenceRuntimeErrorState title="Risk & trust is unavailable" />;
  }

  if (!topRisk) {
    return (
      <IntelligenceRuntimeEmptyState
        title="No risk lanes are available yet"
        description="Admin has not published any risk and trust rows into the finance control plane."
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Average trust" value={`${averageTrust}%`} meta="PrimeOS makes the finance trust posture visible without exposing admin CRUD." icon={<HeartHandshake className="size-5" />} tone="success" />
        <SummaryMetricCard label="High-severity lanes" value={highSeverityCount} meta="These are the finance routes most likely to make a lender pause." icon={<Gauge className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Fixes in motion" value={activeFixes} meta="Risk only helps if the team can see what needs to change next." icon={<ClipboardList className="size-5" />} tone="info" />
        <SummaryMetricCard label="Service pressure" value={openServiceCases} meta="Customer recovery quality still influences whether finance feels safe to scale." icon={<BellRing className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Risk &amp; trust roster</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">A simple seller-facing view of what finance still trusts and what would block scale.</p>
              </div>
              <Badge variant="outline">Admin-managed source</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Trust</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskRows.slice(0, 6).map((row) => (
                  <TableRow key={row.id} className={selectedRisk.id === row.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <button type="button" className="flex flex-col text-left" onClick={() => setSelectedRiskId(row.id)}>
                        <span>{row.profileName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{humanizeIntelligenceValue(row.status)}</span>
                      </button>
                    </TableCell>
                    <TableCell>{row.signalSource || 'Finance source pending'}</TableCell>
                    <TableCell className="text-right">{row.trustScore}%</TableCell>
                    <TableCell className="capitalize">{humanizeIntelligenceValue(row.severity)}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Prime trust strip</CardTitle>
            <p className="text-sm text-muted-foreground">PrimeOS turns finance risk into plain language: what could break, why it matters, and which team should clear it.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Top finance concern</div>
              <div className="mt-2 text-lg font-semibold">{selectedRisk.profileName}</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedRisk.signalSource || 'Signal source pending'} · {humanizeIntelligenceValue(selectedRisk.severity)} severity</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RuntimeContextCard
                label="Trust score"
                value={`${selectedRisk.trustScore}%`}
                detail={selectedRisk.topRisk || 'The main lender-facing risk has not been written yet.'}
              />
              <RuntimeContextCard
                label="Recommended fix"
                value={selectedRisk.owner}
                detail={selectedRisk.recommendedFix || 'Admin still needs to attach the clearest fix for this risk lane.'}
              />
              <RuntimeContextCard
                label="Capital readiness"
                value={relatedReadiness ? `${relatedReadiness.readinessScore}% readiness` : 'Readiness route pending'}
                detail={relatedReadiness?.linkedLaunch || 'Once readiness is linked, the seller can see which launch this risk is blocking.'}
              />
              <RuntimeContextCard
                label="Capital offers"
                value={relatedOffer ? relatedOffer.offerName : 'Offer route pending'}
                detail={relatedOffer ? `${formatFinanceCurrency(relatedOffer.amount)} at ${relatedOffer.feeRate ?? 0}% fee could move once this risk clears.` : 'No concrete offer is tied to this risk lane yet.'}
              />
              <RuntimeContextCard
                label="Settlement"
                value={relatedSettlement ? relatedSettlement.collectionMode || relatedSettlement.facilityName : 'Collection route pending'}
                detail={relatedSettlement ? `${formatFinanceCurrency(relatedSettlement.outstandingBalance)} is already exposed to this repayment path.` : 'No facility has been linked to this risk lane yet.'}
              />
              <RuntimeContextCard
                label="Customer + Service"
                value={`${openServiceCases} open service cases`}
                detail={`${snapshot.returnsCount} returns and ${openServiceCases} unresolved cases still shape how safe this business looks to finance.`}
              />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
              <div className="mt-2 text-sm font-medium">
                PrimeOS should push the seller back to the fix, not straight to funding, whenever the trust lane still has a high-severity blocker attached.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/finance/capital-readiness">Open Capital Readiness</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/finance/settlement-repayment">Open Settlement &amp; Repayment</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
    return <IntelligenceRuntimeErrorState title="Settlement & repayment is unavailable" />;
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Outstanding" value={formatFinanceCurrency(totalOutstanding)} meta="PrimeOS keeps the active finance exposure visible next to the operating system." icon={<CircleDollarSign className="size-5" />} tone="info" />
        <SummaryMetricCard label="Next due" value={formatFinanceCurrency(totalNextDue)} meta="The next repayment moment is explicit so finance does not feel hidden from operators." icon={<ClipboardList className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Collecting lanes" value={collectingCount} meta="These facilities are already repaying through live commerce or invoice flows." icon={<HeartHandshake className="size-5" />} tone="success" />
        <SummaryMetricCard label="Overdue lanes" value={overdueCount} meta="PrimeOS should surface collection stress before it becomes a trust problem." icon={<BellRing className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Settlement &amp; repayment roster</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">A compact runtime view of where capital was deployed and how PrimeOS expects it to come back.</p>
              </div>
              <Badge variant="outline">Admin-managed source</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Collection mode</TableHead>
                  <TableHead className="text-right">Next due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlementRows.slice(0, 6).map((row) => (
                  <TableRow key={row.id} className={selectedFacility.id === row.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <button type="button" className="flex flex-col text-left" onClick={() => setSelectedFacilityId(row.id)}>
                        <span>{row.facilityName}</span>
                        <span className="text-xs text-muted-foreground">{row.market}</span>
                      </button>
                    </TableCell>
                    <TableCell>{row.disbursementTarget || 'Target pending'}</TableCell>
                    <TableCell>{humanizeIntelligenceValue(row.collectionMode)}</TableCell>
                    <TableCell className="text-right">{formatFinanceCurrency(row.nextDueAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{humanizeIntelligenceValue(row.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Prime repayment strip</CardTitle>
            <p className="text-sm text-muted-foreground">PrimeOS makes the money loop visible: where funds went, what repays them, and which connected systems support the collection story.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected facility</div>
              <div className="mt-2 text-lg font-semibold">{selectedFacility.facilityName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedFacility.market} · {humanizeIntelligenceValue(selectedFacility.status)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RuntimeContextCard
                label="Disbursement target"
                value={selectedFacility.disbursementTarget || 'Target pending'}
                detail="Finance only works as an operating product when the seller can see exactly where the capital went."
              />
              <RuntimeContextCard
                label="Repayment source"
                value={selectedFacility.repaymentSource || 'Source pending'}
                detail={`${formatFinanceCurrency(selectedFacility.nextDueAmount)} due next on ${formatFinanceDate(selectedFacility.nextDueDate)}.`}
              />
              <RuntimeContextCard
                label="Collection mode"
                value={humanizeIntelligenceValue(selectedFacility.collectionMode)}
                detail={relatedOffer ? `${relatedOffer.offerName} already set this repayment model upstream.` : 'The pricing offer still needs to be linked more clearly to this collection path.'}
              />
              <RuntimeContextCard
                label="Outstanding balance"
                value={formatFinanceCurrency(selectedFacility.outstandingBalance)}
                detail="PrimeOS keeps the exposure visible so repayment is not treated as an invisible back-office issue."
              />
              <RuntimeContextCard
                label="Demand + revenue"
                value={`${currency.format(snapshot.metrics.revenue)} commerce revenue`}
                detail={`${snapshot.campaigns.length} campaigns, ${snapshot.leads.length} leads, and ${snapshot.orders.length} orders explain whether this facility can realistically collect on time.`}
              />
              <RuntimeContextCard
                label="Risk & trust"
                value={relatedRisk ? `${relatedRisk.trustScore}% trust score` : 'Risk lane pending'}
                detail={relatedRisk?.recommendedFix || 'Risk review should confirm this collection path still looks healthy.'}
              />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
              <div className="mt-2 text-sm font-medium">
                PrimeOS should treat repayment health as part of the same commerce loop, not as a separate finance dashboard the seller never understands.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/demand/campaign-ops">Open Campaign Ops</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/customer/crm-compact">Open CRM Compact</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
  size?: 'sm' | 'lg';
}) {
  const dimension = size === 'lg' ? 'size-14 text-base' : 'size-8 text-[10px]';

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
      <CardContent className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
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
            <div className="text-2xl font-bold">{(total / 1000).toFixed(1)}K</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">total</div>
          </div>
        </div>
        <div className="grid gap-3">
          {segments.map((segment) => (
            <div key={`${creator.id}-${segment.label}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${segment.color}`} />
                <span className="font-medium text-muted-foreground">{segment.label}</span>
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
        <div className="flex justify-between text-sm">
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
      <DialogContent className="max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creator.creatorName}</DialogTitle>
          <DialogDescription>Creator profile, channel footprint, audience analytics, and activation guidance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <RuntimeCreatorAvatar creator={creator} size="lg" />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-3xl font-semibold">{creator.creatorName}</h3>
                      <Badge variant="outline">{runtimeCreatorHandle(creator)}</Badge>
                      <Badge variant="outline">{humanizeIntelligenceValue(creator.primaryChannel)}</Badge>
                      <Badge variant="outline">{humanizeIntelligenceValue(creator.status)}</Badge>
                    </div>
                    <p className="max-w-2xl text-sm text-muted-foreground">{runtimeCreatorProfileSummary(creator)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{marketLabel}</Badge>
                      <Badge variant="outline">Product {runtimeSkuLabel(creator.linkedSku)}</Badge>
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
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to={INTELLIGENCE_DECISIONS_HREF}>Add to launch</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/demand/content-creator-ops">Open Creator Ops</Link>
                  </Button>
                </div>
              </div>
            </div>
            <RuntimeAudienceConnectionsCard creator={creator} />
          </div>

          <Tabs defaultValue="audience" className="space-y-4">
            <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
              <TabsTrigger value="proof">Recent posts</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="metrics">Key metrics</TabsTrigger>
              <TabsTrigger value="guidance">Activation guidance</TabsTrigger>
            </TabsList>

            <TabsContent value="proof" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1fr]">
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
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
      </DialogContent>
    </Dialog>
  );
}

function getLaunchRuntimeCta(plan: IntelligenceLaunchDecisionRecord) {
  if (plan.approvalStatus === 'approved') {
    return {
      href: '/demand/campaign-ops',
      label: 'Send approved launch to Campaign Ops',
      detail: 'This launch is already approved and ready for demand execution.',
    };
  }

  if (plan.approvalStatus === 'review') {
    return {
      href: '/demand/content-creator-ops',
      label: 'Open Content & Creator Ops',
      detail: 'This launch still needs execution context before it can move live.',
    };
  }

  if (plan.approvalStatus === 'hold') {
    return {
      href: '/customer/crm-compact',
      label: 'Re-check customer signal',
      detail: 'This launch is on hold, so the best next step is validating the customer side again.',
    };
  }

  return {
    href: '/intelligence/creators',
    label: 'Inspect creator signal again',
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
        title="No creator rows are available yet"
        description="Admin has not published creator records into the control plane, so PrimeOS has no creator intelligence to read."
      />
    );
  }

  const selectedCreator = creators.find((creator) => creator.id === selectedCreatorId) ?? topCreator;
  const readyCount = creators.filter((creator) => ['shortlisted', 'approved'].includes(creator.status)).length;
  const averageFit = Math.round(creators.reduce((sum, creator) => sum + creator.fitScore, 0) / creators.length);
  const linkedSkuCount = new Set(creators.map((creator) => normalizeRuntimeSku(creator.linkedSku)).filter(Boolean)).size;
  const matchingCampaign = findCampaignBySku(snapshot, selectedCreator.linkedSku);
  const matchingForecast = findForecastBySku(snapshot, selectedCreator.linkedSku);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Admin-managed creators" value={creators.length} meta="PrimeOS reads this creator pool in read-only mode from the control plane." icon={<CircleUserRound className="size-5" />} tone="info" />
        <SummaryMetricCard label="Launch-ready creators" value={readyCount} meta={`${topCreator.creatorName} currently leads the stack.`} icon={<Sparkles className="size-5" />} tone="success" />
        <SummaryMetricCard label="Average fit" value={`${averageFit}%`} meta="Creator fit stays visible without exposing admin CRUD." icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Linked products" value={linkedSkuCount} meta={`${runtimeSkuLabel(selectedCreator.linkedSku)} is the current proof route on this screen.`} icon={<Globe className="size-5" />} tone="purple" />
      </div>

      <Card className="rounded-lg border">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle>Creator intelligence roster</CardTitle>
                <Badge variant="outline">Admin-managed source</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Compact runtime view over the admin-managed creator source. Click any creator to open a deeper profile popup without crowding the main screen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreatorDialogOpen(true)}>
                Open recommended creator
              </Button>
              <Button asChild size="sm">
                <Link to={INTELLIGENCE_DECISIONS_HREF}>
                  Open Launch Decisions
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/demand/content-creator-ops">
                  Open Content &amp; Creator Ops
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-4">
            <RuntimeContextCard
              label="Recommended creator"
              value={selectedCreator.creatorName}
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
              label="Recent proof"
              value={matchingCampaign ? `${matchingCampaign.orders} orders` : 'Proof pending'}
              detail={selectedCreator.recentProof || (matchingForecast ? `${matchingForecast.ats} ATS currently covers ${matchingForecast.demand7d} projected 7-day demand for this SKU.` : 'Recent proof has not been attached yet.')}
            />
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
            <div className="mt-2 text-sm font-medium">
              {readyCount > 0
                ? `${readyCount} creator rows are already strong enough to feed Launch Decisions, while ${selectedCreator.creatorName} is the clearest current pick.`
                : `${selectedCreator.creatorName} is the best available creator signal right now.`}
            </div>
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
        description="Admin has not published customer segment rows into the control plane, so PrimeOS has nothing to activate here."
      />
    );
  }

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? topCustomer;
  const activeCount = customers.filter((customer) => ['active', 'testing'].includes(customer.status)).length;
  const totalSegmentSize = customers.reduce((sum, customer) => sum + (customer.segmentSize ?? 0), 0);
  const matchingCampaign = findCampaignBySku(snapshot, selectedCustomer.recommendedProduct);
  const matchingForecast = findForecastBySku(snapshot, selectedCustomer.recommendedProduct);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Trend lanes" value={customers.length} meta="PrimeOS reads trend opportunities from admin without exposing edit controls." icon={<HeartHandshake className="size-5" />} tone="info" />
        <SummaryMetricCard label="Buyers in play" value={formatCompactCount(totalSegmentSize || customers.length)} meta="Trend size stays visible so the seller knows this is real demand, not a vague score." icon={<UserRoundCheck className="size-5" />} tone="success" />
        <SummaryMetricCard label="Ready to activate" value={activeCount} meta={`${topCustomer.segmentName} is the strongest current customer trend.`} icon={<Sparkles className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Top momentum" value={`${topCustomer.potentialScore}%`} meta={`${runtimeSkuLabel(selectedCustomer.recommendedProduct)} is the strongest current product route tied to this trend stack.`} icon={<Globe className="size-5" />} tone="purple" />
      </div>

      <Card className="rounded-lg border">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle>Trend opportunity board</CardTitle>
                <Badge variant="outline">Admin-managed source</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">PrimeOS uses customer, lifecycle, and demand signals to show which trend the seller should act on now, and why.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to={INTELLIGENCE_DECISIONS_HREF}>Open Launch Decisions</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/customer/crm-compact">Open CRM Compact</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-4">
            <RuntimeContextCard
              label="Strongest trend"
              value={selectedCustomer.segmentName}
              detail={`${runtimeSkuLabel(selectedCustomer.recommendedProduct)} in ${selectedCustomer.market} is the strongest current route.`}
            />
            <RuntimeContextCard
              label="Why now"
              value={`${selectedCustomer.potentialScore}% momentum`}
              detail={selectedCustomer.recentIntent || 'PrimeOS is waiting for stronger trend evidence on this segment.'}
            />
            <RuntimeContextCard
              label="Best route"
              value={selectedCustomer.bestChannel || 'CRM Compact + Campaign Ops'}
              detail="This is the cleanest activation lane if the seller wants to move on this trend right away."
            />
            <RuntimeContextCard
              label="Business upside"
              value={matchingCampaign ? currency.format(matchingCampaign.revenue) : formatCompactCount(selectedCustomer.segmentSize)}
              detail={selectedCustomer.benefit || 'PrimeOS should make the business upside explicit before the seller commits spend.'}
            />
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Do this now</div>
            <div className="mt-2 text-sm font-medium">{selectedCustomer.nextMove || 'Push this trend into Launch Decisions before budget moves.'}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`rounded-2xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 ${selectedCustomer.id === customer.id ? 'border-primary/40 bg-primary/5' : 'bg-background'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{customer.segmentName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{runtimeSkuLabel(customer.recommendedProduct)} · {customer.market}</div>
                  </div>
                  <Badge variant={runtimeStatusVariant(customer.status)} className="capitalize">
                    {humanizeIntelligenceValue(customer.status)}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-2.5">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Profiles</div>
                    <div className="mt-1 text-sm font-medium">{formatCompactCount(customer.segmentSize)}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-2.5">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Potential</div>
                    <div className="mt-1 text-sm font-medium">{customer.potentialScore}%</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{customer.nextMove || 'PrimeOS is preparing the next move for this trend.'}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{humanizeIntelligenceValue(customer.lifecycle)}</Badge>
                  <Badge variant="outline">{customer.bestChannel || 'CRM + Demand'}</Badge>
                </div>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <RuntimeContextCard
              label="Campaign signal"
              value={matchingCampaign ? matchingCampaign.name : 'Route pending'}
              detail={matchingCampaign ? `${matchingCampaign.leads} leads and ${matchingCampaign.orders} orders already sit on this SKU route.` : 'No live campaign has been linked to this trend yet.'}
            />
            <RuntimeContextCard
              label="Ecom / COS"
              value={matchingForecast ? `${matchingForecast.ats} ATS / ${matchingForecast.demand7d} 7d demand` : runtimeSkuLabel(selectedCustomer.recommendedProduct)}
              detail={matchingForecast ? (matchingForecast.risk === 'high' ? 'Inventory is the main guardrail before this trend should scale harder.' : 'Stock and demand look compatible enough for a controlled activation.') : 'Ecom has not attached a live stock signal to this trend yet.'}
            />
            <RuntimeContextCard
              label="CRM handoff"
              value="Memory + ownership"
              detail="Once the trend is chosen, CRM Compact should hold the records, owner, follow-up, and service history that come next."
            />
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
            <div className="mt-2 text-sm font-medium">
              {activeCount > 0
                ? `${activeCount} trends are ready to flow into Launch Decisions, and ${selectedCustomer.segmentName} is the clearest one to move now.`
                : `${selectedCustomer.segmentName} is the best available customer trend right now.`}
            </div>
          </div>
        </CardContent>
      </Card>
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
        description="Admin has not prepared any launch decision rows, so PrimeOS has no approval stack to show."
      />
    );
  }

  const selectedDecision = launchDecisions.find((decision) => decision.id === selectedDecisionId) ?? topDecision;
  const approvedCount = launchDecisions.filter((decision) => decision.approvalStatus === 'approved').length;
  const reviewCount = launchDecisions.filter((decision) => decision.approvalStatus === 'review').length;
  const blockerCount = launchDecisions.filter((decision) => decision.blocker?.trim()).length;
  const averageConfidence = Math.round(launchDecisions.reduce((sum, decision) => sum + decision.confidence, 0) / launchDecisions.length);
  const launchCta = getLaunchRuntimeCta(selectedDecision);
  const selectedDecisionCreator = creatorLookup.get(normalizeRuntimeText(selectedDecision.creatorName)) ?? null;
  const matchingCampaign = findCampaignBySku(snapshot, selectedDecision.skuCode);
  const matchingForecast = findForecastBySku(snapshot, selectedDecision.skuCode);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMetricCard label="Launch packages" value={launchDecisions.length} meta="PrimeOS reads the admin-managed launch package stack in read-only mode." icon={<PanelsTopLeft className="size-5" />} tone="info" />
        <SummaryMetricCard label="Approved" value={approvedCount} meta={`${reviewCount} launch decisions are still waiting review.`} icon={<Sparkles className="size-5" />} tone="success" />
        <SummaryMetricCard label="Average confidence" value={`${averageConfidence}%`} meta={`${topDecision.decisionName} is the strongest launch package right now.`} icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Open blockers" value={blockerCount} meta="PrimeOS keeps blockers visible so launch approval feels operational, not abstract." icon={<Megaphone className="size-5" />} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-lg border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Launch package board</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Compact runtime approval view over the admin-managed launch package table.</p>
              </div>
              <Badge variant="outline">Admin-managed source</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table variant="embedded">
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {launchDecisions.slice(0, 6).map((decision) => (
                  <TableRow key={decision.id} className={selectedDecision.id === decision.id ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <button type="button" className="flex flex-col text-left" onClick={() => setSelectedDecisionId(decision.id)}>
                        <span>{decision.decisionName}</span>
                        <span className="text-xs text-muted-foreground">{decision.creatorName} x {decision.customerSegment}</span>
                      </button>
                    </TableCell>
                    <TableCell>{runtimeSkuLabel(decision.skuCode)}</TableCell>
                    <TableCell>{decision.creatorName}</TableCell>
                    <TableCell>{decision.customerSegment}</TableCell>
                    <TableCell className="text-right">{decision.confidence}%</TableCell>
                    <TableCell>
                      <Badge variant={runtimeStatusVariant(decision.approvalStatus)} className="capitalize">
                        {humanizeIntelligenceValue(decision.approvalStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Prime launch thesis</CardTitle>
            <p className="text-sm text-muted-foreground">PrimeOS keeps the creator, trend, SKU, channel logic, blocker, and owner visible so this feels like a real operating launch package.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommended launch package</div>
              <div className="mt-3 flex items-center gap-3">
                {selectedDecisionCreator ? <RuntimeCreatorAvatar creator={selectedDecisionCreator} /> : null}
                <div>
                  <div className="text-lg font-semibold">{selectedDecision.decisionName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {runtimeSkuLabel(selectedDecision.skuCode)} · {selectedDecision.creatorName} x {selectedDecision.customerSegment}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RuntimeContextCard
                label="Why this launch"
                value={`${selectedDecision.confidence}% confidence`}
                detail={selectedDecision.whyThisLaunch || `${selectedDecision.creatorName} and ${selectedDecision.customerSegment} currently form the clearest commercial route into ${runtimeSkuName(selectedDecision.skuCode).toLowerCase()}.`}
              />
              <RuntimeContextCard
                label="Blocker"
                value={humanizeIntelligenceValue(selectedDecision.approvalStatus)}
                detail={selectedDecision.blocker || 'No blocker is attached. PrimeOS can move this launch into execution.'}
              />
              <RuntimeContextCard
                label="Owner"
                value={selectedDecision.owner || 'Launch review owner'}
                detail="PrimeOS keeps ownership explicit so the seller team knows who should move the launch next."
              />
              <RuntimeContextCard
                label="Expected response"
                value={selectedDecision.approvalStatus === 'approved' ? 'Expected after go-live' : 'Expected after review clears'}
                detail={selectedDecision.expectedResponse || launchCta.detail}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RuntimeContextCard
                label="Campaign Ops"
                value={matchingCampaign ? matchingCampaign.name : launchCta.label}
                detail={matchingCampaign ? `${matchingCampaign.leads} leads, ${matchingCampaign.rfqs} RFQs, and ${matchingCampaign.orders} orders already sit on this SKU route.` : launchCta.detail}
              />
              <RuntimeContextCard
                label="Ecom / COS"
                value={matchingForecast ? `${matchingForecast.ats} ATS / ${matchingForecast.demand7d} 7d demand` : runtimeSkuLabel(selectedDecision.skuCode)}
                detail={matchingForecast ? (matchingForecast.risk === 'high' ? 'Inventory is the main guardrail before approving more scale on this launch.' : 'Ecom can currently support this launch without obvious stock pressure.') : 'No live inventory guardrail has been linked yet.'}
              />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runtime CTA</div>
              <div className="mt-2 text-sm font-medium">{launchCta.detail}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to={launchCta.href}>{launchCta.label}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/customer/crm-compact">Open CRM Compact</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
  creators: { decide: 'Which creators can help sell the products already sitting in my cart or launch basket best?', handoff: 'PrimeOS keeps creator proof, trend fit, Ecom guardrails, and launch CTA visible without exposing CRUD.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  customers: { decide: 'Which customer trend should I activate now, and why does PrimeOS think it matters?', handoff: 'PrimeOS turns trend size, signal evidence, channel fit, CRM context, and Ecom readiness into one next move.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  campaigns: { decide: 'Which creator + trend + SKU + channel package is strong enough to launch now?', handoff: 'Approved launch packages carry CRM, Ecom, and Finance context into Campaign Ops for execution.', handoffHref: '/demand/campaign-ops' },
  analytics: { decide: 'Where is my funnel breaking and what is working?', handoff: 'Findings feed into Launch Decisions and AI Operator.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  attribution: { decide: 'Which channel is actually driving orders, not just clicks?', handoff: 'Attribution data guides approval inside Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  forecasting: { decide: 'Will my inventory survive the next 7 days of demand?', handoff: 'High-risk SKUs trigger throttle flags in Campaign Ops.', handoffHref: '/demand/campaign-ops' },
  voc: { decide: 'What are customers saying and how does it affect my next move?', handoff: 'VOC flags go to Campaign Ops and Service for action.', handoffHref: '/demand/campaign-ops' },
  alerts: { decide: 'What needs my attention right now across the entire system?', handoff: 'Each alert links to the responsible tower for resolution.', handoffHref: '/intelligence/ai-operator' },
  'ai-operator': { decide: 'What should the system do next based on everything it knows?', handoff: 'Recommendations route to the tower that owns the action.', handoffHref: '/overview' },
  'campaign-ops': { decide: 'Are my campaigns running on schedule with the right assets?', handoff: 'Campaign traffic flows into Lead & Response Capture.', handoffHref: '/demand/lead-response-capture' },
  'content-creator-ops': { decide: 'Are creator briefs, bookings, and posts on track?', handoff: 'Published content drives traffic that enters Lead Capture.', handoffHref: '/demand/lead-response-capture' },
  'lead-response-capture': { decide: 'Which inbound responses are worth qualifying?', handoff: 'Qualified leads go to CRM Compact with full context.', handoffHref: '/customer/crm-compact' },
  'retargeting-outreach': { decide: 'Who should I follow up with and through which channel?', handoff: 'Converted contacts enter CRM Compact as retained customers.', handoffHref: '/customer/crm-compact' },
  'crm-compact': { decide: 'Which customer record needs follow-up, ownership, or service attention next?', handoff: 'Customer memory feeds Trends Intelligence for smarter targeting.', handoffHref: '/intelligence/customers' },
  service: { decide: 'Is this issue resolved and did it affect customer trust?', handoff: 'Resolution updates the CRM Compact timeline.', handoffHref: '/customer/crm-compact' },
  capital: { decide: 'Is this launch route operationally strong enough to justify capital?', handoff: 'PrimeOS turns the strongest readiness lane into a concrete offer review.', handoffHref: '/finance/capital-offers' },
  offers: { decide: 'Which capital package best fits the launch I want to scale?', handoff: 'PrimeOS checks repayment logic next so the offer stays realistic inside the commerce loop.', handoffHref: '/finance/settlement-repayment' },
  risk: { decide: 'What would make finance pause on this seller, launch, or repayment path?', handoff: 'The seller should fix trust blockers before pushing harder into funding.', handoffHref: '/finance/capital-readiness' },
  settlement: { decide: 'Where did the money go, how will it come back, and is collection healthy?', handoff: 'Repayment health flows back into Demand, CRM, and the next finance cycle.', handoffHref: '/demand/campaign-ops' },
};

export function PrimeTowerPage({ towerId }: PrimeTowerPageProps) {
  const config = PRIME_TOWER_CONFIGS[towerId];
  const job = towerJobDescriptions[towerId];

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
        {job ? (
          <Card className="rounded-lg border border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-medium">You decide:</span>{' '}
                <span className="text-muted-foreground">{job.decide}</span>
              </div>
              <Link to={job.handoffHref} className="inline-flex items-center gap-1 whitespace-nowrap text-primary hover:underline">
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
