import { useMemo, useState } from 'react';
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
  Instagram,
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
  TrendingUp,
  UserRoundCheck,
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

function CreatorIntelligencePanel() {
  const snapshot = getPrimeSnapshot();
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
                <CardTitle>Creator search and discovery</CardTitle>
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
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Filter logic</div>
                    <div className="text-xs text-muted-foreground">Query-builder framing inspired by creator intelligence tools.</div>
                  </div>
                  <Badge variant="outline">{filteredCreators.length} matches</Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="rounded-xl border bg-muted/20 px-4 py-3"><span className="text-muted-foreground">Where</span> engagement rate is above <span className="font-medium">5.0%</span> and fit score is above <span className="font-medium">80%</span></div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3"><span className="text-muted-foreground">And</span> platform focus is <span className="font-medium capitalize">{platformFilter === 'all' ? 'multi-platform' : platformFilter}</span> in <span className="font-medium capitalize">{marketFilter === 'all' ? 'all active markets' : marketFilter}</span></div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3"><span className="text-muted-foreground">Content where</span> style signals match <span className="font-medium">brand-safe commerce storytelling</span> and audience skews toward <span className="font-medium">{selectedCreator?.topFollowerSegment || 'high-intent shoppers'}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Visual review strip</div>
                    <div className="text-xs text-muted-foreground">Preview the content feel before opening the full profile.</div>
                  </div>
                  {selectedCreator ? <Badge>{selectedCreator.matchedPosts} matched posts</Badge> : null}
                </div>
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

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Selected creator snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCreator ? (
                <>
                  <div className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 md:flex-row md:items-start md:justify-between shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className={`flex size-20 items-center justify-center rounded-3xl border bg-gradient-to-br ${selectedCreator.avatarTone} text-lg font-semibold shadow-sm`}>
                        {initials(selectedCreator.name)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-2xl font-semibold">{selectedCreator.name}</h3>
                          {selectedCreator.verified ? <Badge variant="outline">verified</Badge> : null}
                          <Badge variant="outline">{selectedCreator.category}</Badge>
                          <Badge variant="outline">{selectedCreator.channel}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{selectedCreator.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline"><Globe className="mr-1 size-3" />{selectedCreator.country}</Badge>
                          <Badge variant="outline"><Heart className="mr-1 size-3" />Fit {selectedCreator.fitScore}%</Badge>
                          <Badge variant="outline">Authenticity {selectedCreator.authenticityScore}%</Badge>
                          <Badge variant="outline">Audience quality {selectedCreator.audienceQualityScore}%</Badge>
                          <Badge variant="outline">Primary SKU {selectedCreator.product}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm md:text-right">
                      <span className="font-medium">{(selectedCreator.followers / 1000).toFixed(1)}K followers</span>
                      <span className="text-muted-foreground">{selectedCreator.engagementRate.toFixed(1)}% engagement rate</span>
                      <span className="text-muted-foreground">{currency.format(selectedCreator.revenue)} revenue influenced</span>
                      <span className="text-muted-foreground">Top segment: {selectedCreator.topFollowerSegment}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-5">
                    <MetricPill label="Connections" value={`${(selectedCreator.followers / 1000).toFixed(1)}K`} />
                    <MetricPill label="Profile reach" value={`${(selectedCreator.reach / 1000000).toFixed(1)}M`} />
                    <MetricPill label="Active audience" value={`${selectedCreator.activeAudience}%`} />
                    <MetricPill label="Matched posts" value={String(selectedCreator.matchedPosts)} />
                    <MetricPill label="Authenticity" value={`${selectedCreator.authenticityScore}%`} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                    <AudienceDonutCard creator={selectedCreator} />
                    <Card className="rounded-2xl border bg-muted/10 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Audience engagement benchmark</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <DistributionCurveCard creator={selectedCreator} />
                        <p className="text-sm text-muted-foreground">Signal source: {selectedCreator.signal}</p>
                        <div className="rounded-lg border bg-background p-3 text-sm text-primary">{selectedCreator.recommendation}</div>
                        <Button className="w-full" onClick={() => setIsDialogOpen(true)}>Open full audience profile</Button>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Shortlist and compare queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        </div>
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
              {snapshot.campaigns.slice(0, 4).map((campaign, index) => (
                <div key={`handoff-${campaign.id}`} className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">{campaign.skuCode}</p>
                  <p className="mt-2 text-muted-foreground">{[
                    `Live traffic is flowing into this SKU from ${campaign.channel}. ${campaign.leads} leads captured so far.`,
                    `This SKU has ${campaign.rfqs} open RFQs waiting for follow-up in Lead & Response Capture.`,
                    `${campaign.orders} orders traced back to this campaign. Fulfillment team can verify via OMS.`,
                    `Revenue proof: ${currency.format(campaign.revenue)} attributed to this product through demand execution.`,
                  ][index] || `Campaign is active against ${campaign.skuCode} with ${campaign.traffic.toLocaleString()} traffic.`}</p>
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
            <CardTitle>Customer timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {snapshot.customers.slice(0, 4).map((customer, ci) => (
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
              ))}
            </div>
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
    const signalCompleteness = Math.min(98, 58 + snapshot.orders.length * 6);
    const lendingSteps = [
      { step: 1, title: 'Operating proof collected', done: snapshot.orders.length > 0, detail: `${snapshot.orders.length} orders, ${snapshot.customers.length} customers, ${snapshot.fulfillmentJobsCount} fulfillment jobs tracked in PrimeOS.` },
      { step: 2, title: 'Capital need identified', done: snapshot.campaigns.length > 0, detail: `${snapshot.campaigns.length} campaigns running require budget. RFQ pipeline shows ${currency.format(snapshot.metrics.opportunityValue)} in open opportunity.` },
      { step: 3, title: 'Risk profile assessed', done: serviceRisk <= 2, detail: `${serviceRisk} high-priority issues. Inventory pressure on ${snapshot.forecasts.filter((f) => f.risk !== 'low').length} SKUs. Trust score: ${Math.max(38, 84 - serviceRisk * 8)}%.` },
      { step: 4, title: 'Partner matched', done: false, detail: 'Ready to route application package to SMB bank, lender, or embedded finance partner.' },
    ];

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Signal completeness" value={`${signalCompleteness}%`} meta="How close the data is to a finance-grade application." icon={<TrendingUp className="size-5" />} tone="info" />
          <SummaryMetricCard label="Merchants in scope" value={snapshot.customers.length} meta="Profiles with operating and transaction evidence." icon={<HeartHandshake className="size-5" />} tone="success" />
          <SummaryMetricCard label="Capital need" value={currency.format(snapshot.metrics.opportunityValue)} meta="Open pipeline that requires working capital to convert." icon={<CircleDollarSign className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Application-ready" value={Math.min(snapshot.customers.length, 4)} meta="Cases that can be routed into partner discussion." icon={<ClipboardList className="size-5" />} tone="purple" />
        </div>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Lending flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {lendingSteps.map((item, index) => (
                <div key={item.step} className="relative pb-6 last:pb-0">
                  {index < lendingSteps.length - 1 ? (
                    <span className={`absolute left-5 top-10 -ml-px h-full w-px ${item.done ? 'bg-primary/40' : 'bg-border'}`} />
                  ) : null}
                  <div className="flex gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${item.done ? 'border-primary/40 bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground'}`}>
                      {item.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        {item.done ? <Badge variant="outline" className="text-emerald-600 dark:text-emerald-300">done</Badge> : <Badge variant="outline">pending</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Partner routing</CardTitle>
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
    return <CreatorIntelligencePanel />;
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

const towerJobDescriptions: Partial<Record<PrimeTowerId, { decide: string; handoff: string; handoffHref: string }>> = {
  creators: { decide: 'Which creators fit my products and are worth booking?', handoff: 'Shortlisted creators go to Content & Creator Ops for execution.', handoffHref: '/demand/content-creator-ops' },
  customers: { decide: 'Which customer segments should I target next and through which channel?', handoff: 'Selected segments go to Retargeting & Outreach for follow-up.', handoffHref: '/demand/retargeting-outreach' },
  campaigns: { decide: 'Which campaign plan should I launch first?', handoff: 'Approved plans go to Campaign Ops for live execution.', handoffHref: '/demand/campaign-ops' },
  analytics: { decide: 'Where is my funnel breaking and what is working?', handoff: 'Findings feed into Campaign Planner and AI Operator.', handoffHref: '/intelligence/campaigns' },
  attribution: { decide: 'Which channel is actually driving orders, not just clicks?', handoff: 'Attribution data guides budget decisions in Campaign Planner.', handoffHref: '/intelligence/campaigns' },
  forecasting: { decide: 'Will my inventory survive the next 7 days of demand?', handoff: 'High-risk SKUs trigger throttle flags in Campaign Ops.', handoffHref: '/demand/campaign-ops' },
  voc: { decide: 'What are customers saying and how does it affect my next move?', handoff: 'VOC flags go to Campaign Ops and Service for action.', handoffHref: '/demand/campaign-ops' },
  alerts: { decide: 'What needs my attention right now across the entire system?', handoff: 'Each alert links to the responsible tower for resolution.', handoffHref: '/intelligence/ai-operator' },
  'ai-operator': { decide: 'What should the system do next based on everything it knows?', handoff: 'Recommendations route to the tower that owns the action.', handoffHref: '/overview' },
  'campaign-ops': { decide: 'Are my campaigns running on schedule with the right assets?', handoff: 'Campaign traffic flows into Lead & Response Capture.', handoffHref: '/demand/lead-response-capture' },
  'content-creator-ops': { decide: 'Are creator briefs, bookings, and posts on track?', handoff: 'Published content drives traffic that enters Lead Capture.', handoffHref: '/demand/lead-response-capture' },
  'lead-response-capture': { decide: 'Which inbound responses are worth qualifying?', handoff: 'Qualified leads go to CRM Compact with full context.', handoffHref: '/customer/crm-compact' },
  'retargeting-outreach': { decide: 'Who should I follow up with and through which channel?', handoff: 'Converted contacts enter CRM Compact as retained customers.', handoffHref: '/customer/crm-compact' },
  'crm-compact': { decide: 'What do I know about this customer and what should I do next?', handoff: 'Customer history feeds Intelligence for smarter targeting.', handoffHref: '/intelligence/customers' },
  service: { decide: 'Is this issue resolved and did it affect customer trust?', handoff: 'Resolution updates the CRM Compact timeline.', handoffHref: '/customer/crm-compact' },
  capital: { decide: 'Is my operating performance strong enough to approach a finance partner?', handoff: 'Readiness data goes to Lending & Partner Flow.', handoffHref: '/finance/lending' },
  lending: { decide: 'Which finance partner fits my growth need?', handoff: 'Application packages are backed by Risk & Trust scoring.', handoffHref: '/finance/risk' },
  risk: { decide: 'What are the risks a lender would see in my business?', handoff: 'Trust scores feed back into Capital Readiness for the full picture.', handoffHref: '/finance/capital' },
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
