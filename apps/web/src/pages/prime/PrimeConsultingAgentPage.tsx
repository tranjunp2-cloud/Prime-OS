import { type ReactNode, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Bot, CheckCircle2, GripVertical, Info, Layers3, Rocket, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IntelligenceDragBoard } from '@/components/prime/IntelligenceDragBoard';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import {
  moveIntelligenceBoardCard,
  type DecisionPackage,
  type IntelligenceBoardLaneId,
  type IntelligenceBoardSnapshot,
} from '@/lib/prime/intelligence-workspace';
import { consultingAgentSeedData, type ConsultingKpiCard } from '@/lib/prime/consulting-agent-seed-data';
import { cn } from '@/lib/utils';

type ConsultingAgentTab = 'kpi' | 'signals' | 'launch';
type KpiLaneId = 'monitor' | 'review' | 'ready' | 'blocked';


const tabs: Array<{ id: ConsultingAgentTab; label: string; icon: typeof BarChart3; copy: string }> = [
  { id: 'kpi', label: 'KPI Dashboard', icon: BarChart3, copy: 'Kanban dashboard builder for consulting metrics.' },
  { id: 'signals', label: 'Signals Board', icon: ScanSearch, copy: 'Evidence triage from source-owned signals.' },
  { id: 'launch', label: 'Launch Decisions', icon: Rocket, copy: 'Go, review, hold, or no-go packages.' },
];

const kpiLanes: Array<{ id: KpiLaneId; label: string; detail: string }> = [
  { id: 'monitor', label: 'Monitor', detail: 'Track active consulting metrics.' },
  { id: 'review', label: 'Needs Review', detail: 'Operator or source owner check.' },
  { id: 'ready', label: 'Ready', detail: 'Decision-ready evidence.' },
  { id: 'blocked', label: 'Blocked', detail: 'Guardrail or source truth blocker.' },
];

function InfoHint({ children, label = 'More information' }: { children: ReactNode; label?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            aria-label={label}
          >
            <Info className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function toneClass(tone: ConsultingKpiCard['tone']) {
  return {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-200',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    red: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-200',
    purple: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-200',
  }[tone];
}

function statusLabel(status: DecisionPackage['status']) {
  return status.replaceAll('_', ' ');
}

function decisionLane(item: DecisionPackage) {
  if (item.status === 'blocked') return 'No-go';
  if (item.status === 'review_needed') return 'Review';
  if (item.status === 'ready_for_crm' || item.status === 'sent_to_crm') return 'Go';
  return 'Hold';
}

function ConsultingHeader({ activeTab, onChangeTab }: { activeTab: ConsultingAgentTab; onChangeTab: (tab: ConsultingAgentTab) => void }) {
  return (
    <div className="space-y-6 border-b pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground"><Sparkles className="size-4 text-primary" /> Intelligence / Consulting Agent</div>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Consulting Agent</h1>
            <InfoHint label="Consulting Agent info">One product for KPI dashboarding, signal intelligence, and launch decisions. Reads evidence across PrimeOS; source systems keep ownership.</InfoHint>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            Boundary protected
            <InfoHint label="Boundary protected info">Board moves create triage/audit state only — no CRM/COS/Finance mutation.</InfoHint>
          </div>
        </div>
      </div>
      <div className="flex max-w-full gap-2 overflow-x-auto rounded-lg bg-muted p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" title={tab.copy} onClick={() => onChangeTab(tab.id)} className={cn('min-w-56 rounded-lg px-4 py-3 text-left transition-colors', activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/60')}>
              <div className="flex items-center gap-2 font-semibold"><Icon className="size-4" />{tab.label}<InfoHint label={`${tab.label} info`}>{tab.copy}</InfoHint></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function KpiCardDetails({ card, packages }: { card: ConsultingKpiCard; packages: DecisionPackage[] }) {
  const linkedPackages = packages.filter((item) => card.sourcePackageIds.includes(item.id));
  const fallbackPackages = linkedPackages.length ? linkedPackages : packages.slice(0, 3);
  const lane = kpiLanes.find((item) => item.id === card.laneId);

  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">KPI card detail</div>
          <div className="mt-2 flex items-center gap-2">
            <DialogTitle className="text-2xl">{card.title}</DialogTitle>
            <InfoHint label={`${card.title} info`}>{card.detail}</InfoHint>
          </div>
          <DialogDescription className="sr-only">{card.detail}</DialogDescription>
        </div>
        <Badge variant="outline">{lane?.label || card.laneId}</Badge>
      </div>
        <div className={cn('inline-flex rounded-lg border px-4 py-2 text-3xl font-bold', toneClass(card.tone))}>{card.value}</div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="font-semibold">Source owners</div>
          <div className="mt-2 flex flex-wrap gap-2">{card.sourceOwnerIds.length ? card.sourceOwnerIds.map((owner) => <Badge key={owner} variant="secondary">{owner}</Badge>) : <span className="text-muted-foreground">No owner linked</span>}</div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="font-semibold">Linked consulting packages</div>
          <div className="mt-3 space-y-3">
            {fallbackPackages.map((item) => (
              <div key={item.id} className="rounded-lg border bg-background p-3">
                <div className="font-medium line-clamp-2">{item.title}</div>
                <div className="mt-2 flex items-center gap-2"><Progress value={item.confidence} className="h-1.5" /><span className="text-xs font-semibold">{item.confidence}%</span></div>
                <div className="mt-2 text-xs text-muted-foreground">{item.nextOwner} · {statusLabel(item.status)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="font-semibold">Recommended operator action</div>
          <p className="mt-2 text-muted-foreground">Review evidence, move card to the correct KPI lane, then open linked package before handoff.</p>
        </div>
    </div>
  );
}

function KpiDashboard({ seed }: { seed: typeof consultingAgentSeedData }) {
  const { workspace, board, metrics } = seed;
  const [cards, setCards] = useState(() => seed.kpiCards);
  const [selectedCardId, setSelectedCardId] = useState(seed.kpiCards[0]?.id || '');
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [audit, setAudit] = useState<string[]>([]);
  const detailCard = cards.find((card) => card.id === detailCardId) || null;
  const cardsByLane = (laneId: KpiLaneId) => cards.filter((card) => card.laneId === laneId);
  const moveCard = (cardId: string, laneId: KpiLaneId) => {
    setCards((current) => current.map((card) => card.id === cardId ? { ...card, laneId } : card));
    const card = cards.find((item) => item.id === cardId);
    setAudit((current) => [`${card?.title || cardId} moved to ${kpiLanes.find((lane) => lane.id === laneId)?.label}`, ...current].slice(0, 4));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryMetricCard label="Packages" value={metrics.packages} meta="Consulting decision packages." metaTooltip="Consulting decision packages." icon={<Bot className="size-5" />} tone="purple" />
        <SummaryMetricCard label="Ready" value={metrics.readyForCrm} meta="Ready for owner handoff." metaTooltip="Ready for owner handoff." icon={<CheckCircle2 className="size-5" />} tone="success" />
        <SummaryMetricCard label="Blocked" value={metrics.blocked} meta="Guardrail protected." metaTooltip="Guardrail protected." icon={<ShieldCheck className="size-5" />} tone="orange" />
        <SummaryMetricCard label="Moves" value={audit.length} meta="Local KPI board audit." metaTooltip="Local KPI board audit." icon={<Layers3 className="size-5" />} tone="info" />
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[1040px] grid-cols-4 gap-4">
          {kpiLanes.map((lane) => {
            const laneCards = cardsByLane(lane.id);
            return (
              <div key={lane.id} className="min-h-[420px] rounded-lg border bg-card/80 p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveCard(event.dataTransfer.getData('text/plain'), lane.id)}>
                <div className="rounded-lg border bg-background/90 p-3">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-1.5"><h3 className="font-semibold">{lane.label}</h3><InfoHint label={`${lane.label} info`}>{lane.detail}</InfoHint></div><Badge variant="outline">{laneCards.length}</Badge></div>
                </div>
                <div className="mt-3 space-y-3">
                  {laneCards.map((card) => <div key={card.id} draggable onClick={() => setSelectedCardId(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} className={cn('cursor-pointer rounded-lg border bg-background p-4 text-left shadow-sm transition hover:border-primary/50', selectedCardId === card.id && 'border-primary ring-1 ring-primary/30')}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5"><div className="truncate font-semibold">{card.title}</div><InfoHint label={`${card.title} info`}>{card.detail}</InfoHint></div><div className={cn('mt-3 inline-flex rounded-lg border px-3 py-1 text-2xl font-bold', toneClass(card.tone))}>{card.value}</div></div><GripVertical className="size-4 shrink-0 text-muted-foreground" /></div><Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={(event) => { event.stopPropagation(); setSelectedCardId(card.id); setDetailCardId(card.id); }}>Open details</Button></div>)}
                  {!laneCards.length ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Drop KPI card here.</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Dialog open={Boolean(detailCard)} onOpenChange={(open) => !open && setDetailCardId(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-lg">
          {detailCard ? <KpiCardDetails card={detailCard} packages={workspace.packages} /> : null}
        </DialogContent>
      </Dialog>
      {audit.length ? <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Move audit preview</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground">{audit.map((item) => <div key={item}>{item}</div>)}</CardContent></Card> : null}
    </div>
  );
}

function SignalsBoard({ board, onMoveCard }: { board: IntelligenceBoardSnapshot; onMoveCard: (cardId: string, toLaneId: IntelligenceBoardLaneId, toRank: number) => void }) {
  return <IntelligenceDragBoard board={board} onMoveCard={onMoveCard} />;
}

function LaunchDecisions({ packages }: { packages: DecisionPackage[] }) {
  const [selectedId, setSelectedId] = useState(packages[0]?.id || '');
  const selected = packages.find((item) => item.id === selectedId) || packages[0];
  const grouped = ['Go', 'Review', 'Hold', 'No-go'].map((lane) => ({ lane, items: packages.filter((item) => decisionLane(item) === lane) }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {grouped.map((group) => <Card key={group.lane} className="rounded-lg"><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">{group.lane}</CardTitle><Badge variant={group.lane === 'No-go' ? 'destructive' : 'outline'}>{group.items.length}</Badge></div></CardHeader><CardContent className="space-y-3">{group.items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn('w-full rounded-lg border p-3 text-left hover:bg-muted/50', selected?.id === item.id && 'border-primary bg-primary/10')}><div className="font-semibold line-clamp-2">{item.title}</div><div className="mt-2 flex items-center gap-2"><Progress value={item.confidence} className="h-1.5" /><span className="text-xs font-semibold">{item.confidence}%</span></div><div className="mt-2 text-xs text-muted-foreground">{item.nextOwner} · {statusLabel(item.status)}</div></button>)}{!group.items.length ? <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No packages.</div> : null}</CardContent></Card>)}
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>{selected?.title || 'Select a decision'}</CardTitle>
            {selected ? <InfoHint label={`${selected.title} info`}>{selected.finding}</InfoHint> : null}
          </div>
        </CardHeader>
        {selected ? <CardContent className="space-y-4 text-sm"><div className="flex flex-wrap gap-2"><Badge>{decisionLane(selected)}</Badge><Badge variant="outline">{selected.nextOwner}</Badge><Badge variant={selected.riskLevel === 'high' ? 'destructive' : 'secondary'}>{selected.riskLevel}</Badge></div><div className="rounded-lg border bg-muted/30 p-3"><div className="font-semibold">Evidence</div><div className="mt-2 text-muted-foreground">{selected.recommendationEvidence.confidenceReason}</div></div><div className="rounded-lg border bg-muted/30 p-3"><div className="font-semibold">Handoff</div><div className="mt-2 text-muted-foreground">{selected.handoffPayload.objective}</div></div><Button asChild className="w-full"><Link to={selected.handoffPayload.targetRoute}>Open owner route <ArrowRight className="size-4" /></Link></Button></CardContent> : null}
      </Card>
    </div>
  );
}

export function PrimeConsultingAgentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as ConsultingAgentTab | null;
  const activeTab: ConsultingAgentTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab! : 'kpi';
  const seed = useMemo(() => consultingAgentSeedData, []);
  const { workspace } = seed;
  const [board, setBoard] = useState(seed.board);

  const handleMoveCard = (cardId: string, toLaneId: IntelligenceBoardLaneId, toRank: number) => {
    setBoard((current) => moveIntelligenceBoardCard(current, { id: `consulting-${cardId}-${Date.now()}`, cardId, toLaneId, toRank, actorId: 'prime-operator', actorRole: 'Consulting Agent operator', reason: 'Consulting Agent local triage move.', createdAt: new Date().toISOString(), idempotencyKey: `consulting-${cardId}-${toLaneId}-${toRank}`, auditId: `audit-consulting-${cardId}-${toLaneId}` }));
  };

  return (
    <div className="min-h-full bg-muted/20">
      <main className="space-y-6 p-4 md:p-6">
        <ConsultingHeader activeTab={activeTab} onChangeTab={(tab) => setSearchParams({ tab })} />
        {activeTab === 'kpi' ? <KpiDashboard seed={{ ...seed, board }} /> : null}
        {activeTab === 'signals' ? <SignalsBoard board={board} onMoveCard={handleMoveCard} /> : null}
        {activeTab === 'launch' ? <LaunchDecisions packages={workspace.packages} /> : null}
      </main>
    </div>
  );
}
