import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleDollarSign, Gauge, Loader2, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchFinanceControlPlane, type CapitalOffersRecord, type CapitalReadinessRecord, type FinanceControlPlaneSnapshot, type RiskTrustRecord, type SettlementRepaymentRecord } from '@/lib/prime/finance-control-plane';
import { getPrimeSnapshot, getSkuCodeValue, getSkuLabel, getSkuProductName, type PrimeSnapshot, type PrimeTowerId } from '@/lib/prime/prime-data';
import { cn } from '@/lib/utils';
import { financeTowerIds } from './PrimeTowerPage.constants';

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
    <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
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
            <div key={`${step.label}-${index}`} className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
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
              className={`rounded-lg border p-4 text-left transition hover:border-primary/40 ${isSelected ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-background'}`}
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
          <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-5">
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
            { label: 'CRM proof', value: demandScore, detail: matchingCampaign ? `${matchingCampaign.leads} leads, ${matchingCampaign.rfqs} RFQs, ${matchingCampaign.orders} orders attached.` : 'CRM proof still needs Campaign Ops data.', tone: 'success' },
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
          { label: 'CRM', value: matchingCampaign ? `${matchingCampaign.name} is producing buyer proof` : 'CRM proof pending', icon: <Megaphone className="size-5" /> },
          { label: 'Finance', value: `${formatFinanceCurrency(totalFundingNeed)} total need across ${readinessRows.length} routes`, icon: <CircleDollarSign className="size-5" /> },
          { label: 'Next', value: readyCount > 0 ? 'Price the cleanest offer' : 'Clear the biggest blocker first', icon: <ArrowRight className="size-5" /> },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/finance/fin-support#lenders">Open Fin Support</Link></Button>
        <Button asChild variant="outline"><Link to="/finance/fin-support#blockers">Open blockers</Link></Button>
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
          <div className="rounded-lg border bg-gradient-to-br from-emerald-500/10 via-background to-primary/10 p-5">
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
                <Link to="/finance/fin-support#status">Check application status</Link>
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
        <DialogContent className="max-w-2xl rounded-lg">
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
          <div className="rounded-lg border bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
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
          <div className="rounded-lg border bg-gradient-to-br from-amber-500/10 via-background to-rose-500/10 p-5">
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
                <Link to="/finance/fin-support#lenders">Recheck lenders</Link>
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
        <DialogContent className="max-w-3xl rounded-lg">
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
              <div key={item} className="rounded-lg border bg-amber-500/10 p-4 text-sm leading-6">
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
          <div className="rounded-lg border bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10 p-5">
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
                <Link to="/finance/fin-support#funding-application-flow">Check funding support</Link>
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
        <DialogContent className="max-w-3xl rounded-lg">
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
              <div key={item} className="rounded-lg border bg-emerald-500/10 p-4 text-sm leading-6">
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

export function FinancePanel({ towerId }: { towerId: PrimeTowerId }) {
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


