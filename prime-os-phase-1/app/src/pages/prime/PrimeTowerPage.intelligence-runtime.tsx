import { type ReactNode, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { ArrowRight, BadgeCheck, Bot, CheckCircle2, CircleUserRound, Gauge, Globe, ImagePlus, Instagram, Loader2, PackagePlus, PanelsTopLeft, Phone, Search, Send, Sparkles, Target, TrendingUp, Upload, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { getPrimeSnapshot, getSkuCodeValue, getSkuLabel, getSkuProductName, type PrimeSnapshot, type PrimeTowerId } from '@/lib/prime/prime-data';
import { fetchIntelligenceControlPlane, type IntelligenceControlPlaneSnapshot, type IntelligenceCreatorRecord, type IntelligenceCustomerRecord, type IntelligenceLaunchDecisionRecord } from '@/lib/prime/intelligence-control-plane';
import { getIntelligenceAssets, removeIntelligenceAsset, type IntelligenceAsset, uploadIntelligenceAsset } from '@/lib/prime/intelligence-assets';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/product-images';

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

export function runtimeStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
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
                      <Link to={DEMAND_CONTENT_SOCIAL_HREF}>Open Creator Ops</Link>
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
                      <Link to={DEMAND_CONTENT_SOCIAL_HREF}>
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
      href: DEMAND_CAMPAIGNS_HREF,
      label: 'Send approved launch to Campaign Ops',
      shortLabel: 'Send',
      detail: 'This launch is already approved and ready for demand execution.',
    };
  }

  if (plan.approvalStatus === 'review') {
    return {
      href: DEMAND_CONTENT_SOCIAL_HREF,
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
              <Link to={DEMAND_CONTENT_SOCIAL_HREF}>
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
  const seedLaunchDecisions = useMemo(() => buildSeedLaunchDecisions(snapshot), [snapshot]);
  const sourceLaunchDecisions = data?.launchDecisions?.length ? data.launchDecisions : seedLaunchDecisions;
  const launchDecisions = useMemo(() => [...sourceLaunchDecisions].sort((left, right) => {
    const leftPriority = launchDecisionPriority(left.approvalStatus);
    const rightPriority = launchDecisionPriority(right.approvalStatus);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return right.confidence - left.confidence;
  }), [sourceLaunchDecisions]);
  const isUsingSeedLaunchDecisions = !data?.launchDecisions?.length && seedLaunchDecisions.length > 0;
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
  if (error && !topDecision) return <IntelligenceRuntimeErrorState title="Launch decisions are unavailable" />;
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
        <CardContent className="grid gap-4 p-3 xl:grid-cols-[220px_minmax(0,1fr)_190px] xl:items-stretch">
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
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="w-fit">PrimeOS recommends</Badge>
              {isUsingSeedLaunchDecisions ? <Badge variant="secondary">Seeded from real products</Badge> : null}
            </div>
            <CardTitle className="mt-2 text-2xl leading-tight">{decisionVerb}: {selectedDecision.decisionName}</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {selectedDecision.whyThisLaunch || `${selectedDecision.creatorName} and ${selectedDecision.customerSegment} are the clearest current route into ${runtimeSkuName(selectedDecision.skuCode).toLowerCase()}.`}
            </p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {evidenceCards.map((evidence) => (
                <div key={evidence.label} className="rounded-2xl border bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{evidence.label}</div>
                  <div className="mt-1 line-clamp-1 text-xs font-semibold">{evidence.value}</div>
                  <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{evidence.detail}</div>
                </div>
              ))}
            </div>
            <div data-testid="launch-decision-state-board" className="mt-4 rounded-2xl border bg-muted/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Outcome feedback</div>
                <Badge variant="outline">Learning loop</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Demand owns execution, OMS owns order truth, and Intelligence reads the outcome back as future signal evidence.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">Decision: {humanizeIntelligenceValue(selectedDecision.approvalStatus)}</Badge>
                <Badge variant="outline">Confidence {selectedDecision.confidence}%</Badge>
                <Badge variant="outline">Owner {selectedDecision.owner || 'Launch owner needed'}</Badge>
              </div>
            </div>
          </div>

          <div className="order-3 flex flex-col justify-between rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-3 text-center shadow-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Decision</div>
              <div className="mt-2 text-4xl font-semibold leading-none">{selectedDecision.confidence}%</div>
              <Badge variant={runtimeStatusVariant(selectedDecision.approvalStatus)} className="mt-3 capitalize">
                {humanizeIntelligenceValue(selectedDecision.approvalStatus)}
              </Badge>
              <p className="mx-auto mt-3 max-w-[12rem] text-xs text-muted-foreground">{decisionQuestion}</p>
            </div>
            <div className="mt-4 space-y-2">
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
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
              <CardTitle className="text-lg">Decision queue</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Pick a launch candidate; the cockpit updates without leaving the page.</p>
            </div>
            <Badge variant="outline">{launchDecisions.length} candidates</Badge>
          </div>
        </CardHeader>
        <CardContent className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {launchDecisions.map((decision) => (
            <button
              key={decision.id}
              type="button"
              onClick={() => setSelectedDecisionId(decision.id)}
              aria-label={`Select launch decision ${decision.decisionName}`}
              aria-pressed={selectedDecision.id === decision.id}
              className={`w-full rounded-xl border border-l-4 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedDecision.id === decision.id ? 'border-primary/40 border-l-primary bg-primary/5' : 'border-l-transparent bg-muted/10'}`}
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

export function IntelligencePanel({ towerId }: { towerId: PrimeTowerId }) {
  const snapshot = useMemo(() => getPrimeSnapshot(), []);
  const intelligenceWorkspace = useMemo(() => buildIntelligenceWorkspace(snapshot), [snapshot]);
  const baseIntelligenceBoard = useMemo(() => buildIntelligenceBoard(intelligenceWorkspace), [intelligenceWorkspace]);
  const [intelligenceBoard, setIntelligenceBoard] = useState<IntelligenceBoardSnapshot>(baseIntelligenceBoard);
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

  useEffect(() => {
    setIntelligenceBoard((currentBoard) => {
      const currentCardsByPackage = new Map(currentBoard.cards.map((card) => [card.packageId, card]));
      return {
        ...baseIntelligenceBoard,
        cards: baseIntelligenceBoard.cards.map((card) => {
          const currentCard = currentCardsByPackage.get(card.packageId);
          return currentCard ? { ...card, laneId: currentCard.laneId, rank: currentCard.rank, boardRevision: currentBoard.boardRevision } : card;
        }),
        auditEvents: currentBoard.auditEvents,
        boardRevision: currentBoard.boardRevision,
      };
    });
  }, [baseIntelligenceBoard]);

  const handleIntelligenceBoardMove = (cardId: string, toLaneId: IntelligenceBoardLaneId, toRank: number) => {
    setIntelligenceBoard((currentBoard) => moveIntelligenceBoardCard(currentBoard, {
      id: `move-${cardId}-${Date.now()}`,
      cardId,
      toLaneId,
      toRank,
      actorId: 'prime-operator',
      actorRole: 'Intelligence operator',
      reason: 'Local board triage move.',
      createdAt: new Date().toISOString(),
      idempotencyKey: `local-${cardId}-${toLaneId}-${toRank}`,
      auditId: `audit-local-${cardId}-${toLaneId}`,
    }));
  };

  if (towerId === 'decision-hub') {
    return <IntelligenceDecisionHubPanel snapshot={snapshot} />;
  }

  if (towerId === 'signals') {
    return <IntelligenceSignalsPanel snapshot={snapshot} />;
  }

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
    const seedLaunchDecisions = buildSeedLaunchDecisions(snapshot);
    const boardLaunchDecisions = intelligenceControlQuery.data?.launchDecisions?.length
      ? intelligenceControlQuery.data.launchDecisions
      : seedLaunchDecisions;

    return (
      <div className="space-y-4">
        <IntelligenceDragBoard board={intelligenceBoard} onMoveCard={handleIntelligenceBoardMove} />
        <LaunchDecisionStateBoard decisions={boardLaunchDecisions} />
        <CompactLaunchDecisionsRuntimePanel
          data={intelligenceControlQuery.data}
          isLoading={intelligenceControlQuery.isLoading}
          error={intelligenceControlQuery.error}
          snapshot={snapshot}
        />
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
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-left font-medium">
                    <Link to={getProductMasterHref(forecast.skuId)}>{getSkuProductName(forecast.skuCode)}</Link>
                  </Button>
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
                  <TableCell>
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-left font-medium">
                      <Link to={getProductMasterHref(campaign.skuId, campaign.productId)}>{getSkuLabel(campaign.skuCode)}</Link>
                    </Button>
                  </TableCell>
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

export const towerJobDescriptions: Partial<Record<PrimeTowerId, { decide: string; handoff: string; handoffHref: string }>> = {
  'decision-hub': { decide: 'What should the operator act on today?', handoff: 'Open the strongest signal or decision package with evidence attached.', handoffHref: '/intelligence/signals' },
  signals: { decide: 'Which signals are real enough to become action?', handoff: 'Convert validated evidence into a launch, fix, follow-up, or suppression decision.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  creators: { decide: 'Which creator should help sell this product?', handoff: 'PrimeOS explains the fit and sends the best route into Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  customers: { decide: 'Pick the customer trend to activate now.', handoff: 'Send the trend into Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  campaigns: { decide: 'Launch, review, hold, or no-go?', handoff: 'If Go, send it to Campaign Ops. If not, clear the one blocker.', handoffHref: DEMAND_CAMPAIGNS_HREF },
  analytics: { decide: 'Where is my funnel breaking and what is working?', handoff: 'Findings feed into Launch Decisions and AI Operator.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  attribution: { decide: 'Which channel is actually driving orders, not just clicks?', handoff: 'Attribution data guides approval inside Launch Decisions.', handoffHref: INTELLIGENCE_DECISIONS_HREF },
  forecasting: { decide: 'Will my inventory survive the next 7 days of demand?', handoff: 'High-risk SKUs trigger throttle flags in Campaign Ops.', handoffHref: DEMAND_CAMPAIGNS_HREF },
  voc: { decide: 'What are customers saying and how does it affect my next move?', handoff: 'VOC flags go to Campaign Ops and Service for action.', handoffHref: DEMAND_CAMPAIGNS_HREF },
  alerts: { decide: 'What needs my attention right now across the entire system?', handoff: 'Each alert links to the responsible tower for resolution.', handoffHref: '/intelligence/ai-operator' },
  'ai-operator': { decide: 'What should the system do next based on everything it knows?', handoff: 'Recommendations route to the tower that owns the action.', handoffHref: '/overview' },
  'campaign-ops': { decide: 'What should the seller execute now: message, ad, SEO content, or stock task?', handoff: 'Executed actions create leads, RFQs, creator work, and Ecom guardrails.', handoffHref: DEMAND_LEADS_RFQS_HREF },
  'content-creator-ops': { decide: 'Which KOL, brief, live slot, or asset kit should be created now?', handoff: 'Approved proof feeds Campaign Ops, ads, SEO, and marketplace content.', handoffHref: DEMAND_CAMPAIGNS_HREF },
  'lead-response-capture': { decide: 'Which buyer needs a reply, owner, phone follow-up, or CRM sync now?', handoff: 'Qualified intent becomes CRM memory, quote work, and repeat outreach.', handoffHref: '/customer/crm-compact' },
  'retargeting-outreach': { decide: 'Which warm buyer should receive a sequence, retargeting ad, offer, or suppression?', handoff: 'Recovered buyers move into CRM Compact and order loops.', handoffHref: '/customer/crm-compact' },
    'crm-compact': { decide: 'Which account identity needs owner, contact, tags, or duplicate review first?', handoff: 'Customer Profile becomes the identity foundation for future Demand, Intelligence, Finance, and COS context.', handoffHref: '/intelligence/trends' },
  service: { decide: 'Is this issue resolved and did it affect customer trust?', handoff: 'Resolution updates the CRM Compact timeline.', handoffHref: '/customer/crm-compact' },
  capital: { decide: 'Is this route operationally strong enough to unlock funding support?', handoff: 'PrimeOS turns readiness proof into Fin Support lender routing.', handoffHref: '/finance/fin-support#funding-application-flow' },
  offers: { decide: 'Which partner lender is the best fit for this merchant?', handoff: 'Matched lenders, documents, and application status now live in Fin Support.', handoffHref: '/finance/fin-support#lenders' },
  risk: { decide: 'What should this merchant fix before submitting to lenders?', handoff: 'Cleared eligibility blockers unlock stronger Fin Support matching.', handoffHref: '/finance/fin-support#blockers' },
  settlement: { decide: 'Is settlement health strong enough for funding review?', handoff: 'Settlement evidence feeds document reuse and application tracking in Fin Support.', handoffHref: '/finance/fin-support#status' },
};
