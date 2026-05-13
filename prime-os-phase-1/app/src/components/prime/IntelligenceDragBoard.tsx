import { useMemo, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bot, Clock, ExternalLink, GripVertical, Info, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { IntelligenceBoardAuditEvent, IntelligenceBoardCard, IntelligenceBoardLaneId, IntelligenceBoardSnapshot } from '@/lib/prime/intelligence-workspace';

type IntelligenceDragBoardProps = {
  board: IntelligenceBoardSnapshot;
  onMoveCard?: (cardId: string, toLaneId: IntelligenceBoardLaneId, toRank: number) => void;
  onSelectCard?: (card: IntelligenceBoardCard) => void;
  className?: string;
};

const laneToneClasses: Record<IntelligenceBoardLaneId, string> = {
  collect: 'border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10',
  understand: 'border-slate-500/30 bg-slate-50/70 dark:bg-slate-500/10',
  predict: 'border-orange-500/30 bg-orange-50/70 dark:bg-orange-500/10',
  recommend: 'border-violet-500/30 bg-violet-50/70 dark:bg-violet-500/10',
  act_automate: 'border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10',
};

const riskToneClasses: Record<IntelligenceBoardCard['exceptionLevel'], string> = {
  low: 'border-emerald-700/25 bg-emerald-50 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-500/12 dark:text-emerald-200',
  medium: 'border-amber-700/25 bg-amber-50 text-amber-900 dark:border-amber-300/25 dark:bg-amber-500/12 dark:text-amber-200',
  high: 'border-rose-700/25 bg-rose-50 text-rose-800 dark:border-rose-300/25 dark:bg-rose-500/12 dark:text-rose-200',
};

function formatStatus(status: string) {
  return status.replaceAll('_', ' ');
}

function cardCountLabel(count: number) {
  return count === 1 ? '1 card' : `${count} cards`;
}

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

export function IntelligenceDragBoard({ board, onMoveCard, onSelectCard, className }: IntelligenceDragBoardProps) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedLaneId, setDraggedLaneId] = useState<IntelligenceBoardLaneId | null>(null);
  const [activeLaneId, setActiveLaneId] = useState<IntelligenceBoardLaneId | null>(null);
  const [laneOrder, setLaneOrder] = useState<IntelligenceBoardLaneId[]>(() => board.lanes.map((lane) => lane.id));
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = board.cards.find((card) => card.id === selectedCardId) ?? null;
  const selectedCardAuditEvents = selectedCard ? board.auditEvents.filter((event) => event.cardId === selectedCard.id) : [];
  const highExceptionCount = board.cards.filter((card) => card.exceptionLevel === 'high').length;
  const sourceOwnerCount = new Set(board.cards.map((card) => card.sourceOfTruthOwner)).size;
  const orderedLanes = useMemo(() => {
    const lanesById = new Map(board.lanes.map((lane) => [lane.id, lane]));
    const ordered = laneOrder.flatMap((laneId) => {
      const lane = lanesById.get(laneId);
      return lane ? [lane] : [];
    });
    const missing = board.lanes.filter((lane) => !laneOrder.includes(lane.id));
    return ordered.concat(missing);
  }, [board.lanes, laneOrder]);
  const cardsByLane = useMemo(() => {
    return board.lanes.reduce<Record<IntelligenceBoardLaneId, IntelligenceBoardCard[]>>((acc, lane) => {
      acc[lane.id] = board.cards
        .filter((card) => card.laneId === lane.id)
        .sort((left, right) => left.rank - right.rank);
      return acc;
    }, {} as Record<IntelligenceBoardLaneId, IntelligenceBoardCard[]>);
  }, [board.cards, board.lanes]);

  const moveCard = (cardId: string, toLaneId: IntelligenceBoardLaneId) => {
    const toRank = cardsByLane[toLaneId]?.length ?? 0;
    onMoveCard?.(cardId, toLaneId, toRank);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, cardId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, laneId: IntelligenceBoardLaneId) => {
    event.preventDefault();
    const draggedLane = event.dataTransfer.getData('application/x-prime-lane') as IntelligenceBoardLaneId;
    if (draggedLane) {
      setLaneOrder((currentOrder) => {
        const nextOrder = currentOrder.filter((id) => id !== draggedLane);
        const targetIndex = Math.max(0, nextOrder.indexOf(laneId));
        nextOrder.splice(targetIndex, 0, draggedLane);
        return nextOrder;
      });
      setDraggedLaneId(null);
      setActiveLaneId(null);
      return;
    }
    const cardId = event.dataTransfer.getData('text/plain') || draggedCardId;
    if (cardId) moveCard(cardId, laneId);
    setDraggedCardId(null);
    setActiveLaneId(null);
  };

  const handleKeyMove = (event: KeyboardEvent<HTMLButtonElement>, card: IntelligenceBoardCard, direction: -1 | 1) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const currentIndex = board.lanes.findIndex((lane) => lane.id === card.laneId);
    const targetLane = board.lanes[currentIndex + direction];
    if (targetLane) moveCard(card.id, targetLane.id);
  };

  const openCard = (card: IntelligenceBoardCard) => {
    setSelectedCardId(card.id);
    onSelectCard?.(card);
  };

  const handleLaneDragStart = (event: DragEvent<HTMLButtonElement>, laneId: IntelligenceBoardLaneId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-prime-lane', laneId);
    setDraggedLaneId(laneId);
  };

  return (
    <section className={cn('rounded-3xl border bg-card/80 p-4 shadow-sm', className)} aria-label="Intelligence Area board" data-testid="intelligence-drag-board">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Intelligence projection</div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Signal → decision board</h2>
            <InfoHint label="Signal decision board info">Drag cards across Intelligence lanes to update triage state only. Source truth remains owned by Demand, Customer, Ecom / COS, and Finance.</InfoHint>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{board.cards.length} cards</Badge>
          <Badge variant={highExceptionCount > 0 ? 'destructive' : 'outline'}>{highExceptionCount} high risk</Badge>
          <Badge variant="outline">{sourceOwnerCount} source owners</Badge>
          <Badge variant="outline">Revision {board.boardRevision}</Badge>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <BoardSummaryMetric label="Open intelligence work" value={`${board.cards.length}`} detail="Active cards in the Intelligence read-model board." />
        <BoardSummaryMetric label="Boundary protected" value={`${sourceOwnerCount}`} detail="Source owners remain separate from Intelligence triage." />
        <BoardSummaryMetric label="Move audit preview" value={`${board.auditEvents.length}`} detail="Local moves recorded before backend persistence." />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1180px] grid-cols-5 gap-3">
          {orderedLanes.map((lane) => {
            const laneCards = cardsByLane[lane.id] ?? [];
            const exceptionCount = laneCards.filter((card) => card.exceptionLevel === 'high').length;

            return (
              <div
                key={lane.id}
                className={cn('min-h-[360px] rounded-2xl border p-3 transition-colors', laneToneClasses[lane.id], activeLaneId === lane.id ? 'ring-2 ring-primary/70' : '', draggedLaneId === lane.id ? 'opacity-70 ring-2 ring-primary' : '')}
                data-testid={`intelligence-board-lane-${lane.id}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setActiveLaneId(lane.id);
                }}
                onDragLeave={() => setActiveLaneId(null)}
                onDrop={(event) => handleDrop(event, lane.id)}
                role="region"
                aria-label={`${lane.label}, ${cardCountLabel(laneCards.length)}, ${exceptionCount} exceptions`}
              >
                <div className="sticky top-0 z-10 rounded-xl border bg-background/90 p-3 backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => handleLaneDragStart(event, lane.id)}
                          onDragEnd={() => {
                            setDraggedLaneId(null);
                            setActiveLaneId(null);
                          }}
                          className="inline-flex items-center gap-2 rounded-md text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Drag ${lane.label} tab`}
                        >
                          <GripVertical className="size-3.5 text-muted-foreground" />
                          {lane.label}
                        </button>
                        <InfoHint label={`${lane.label} info`}>{lane.purpose}</InfoHint>
                      </div>
                    </div>
                    <Badge variant={exceptionCount > 0 ? 'destructive' : 'outline'}>{laneCards.length}</Badge>
                  </div>
                </div>

                <div className="mt-3 space-y-3" role={laneCards.length > 0 ? 'list' : undefined} aria-label={laneCards.length > 0 ? `${lane.label} cards` : undefined}>
                  {laneCards.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground" role="presentation">Drop Intelligence work here.</div>
                  ) : null}
                  {laneCards.map((card) => {
                    const currentIndex = board.lanes.findIndex((item) => item.id === card.laneId);
                    const canMoveLeft = currentIndex > 0;
                    const canMoveRight = currentIndex < board.lanes.length - 1;

                    return (
                      <Card key={card.id} className={cn('border bg-background/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', draggedCardId === card.id ? 'opacity-60 ring-2 ring-primary' : '')} role="listitem">
                        <CardHeader className="space-y-3 p-3 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <Badge variant="outline" className="max-w-full truncate">{card.tower}</Badge>
                              <CardTitle className="line-clamp-2 text-sm leading-snug">{card.title}</CardTitle>
                            </div>
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => handleDragStart(event, card.id)}
                              onDragEnd={() => {
                                setDraggedCardId(null);
                                setActiveLaneId(null);
                              }}
                              onClick={() => openCard(card)}
                              className="rounded-md border bg-muted/40 p-1.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Drag or open ${card.title}`}
                            >
                              <GripVertical className="size-4" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 p-3 pt-0 text-xs">
                          <div className="flex flex-wrap gap-2">
                            <span className={cn('rounded-full border px-2 py-0.5 capitalize', riskToneClasses[card.exceptionLevel])}>{card.exceptionLevel}</span>
                            <Badge variant="secondary" className="capitalize">{formatStatus(card.displayStatus)}</Badge>
                          </div>

                          <div className="rounded-xl border bg-muted/20 p-3">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <Bot className="size-3.5" />
                              {card.floor}
                            </div>
                            <p className="mt-1 line-clamp-2 text-muted-foreground">{card.nextAction}</p>
                          </div>

                          <div className="grid gap-2 text-muted-foreground">
                            <div className="flex items-center justify-between gap-2">
                              <span>Owner</span>
                              <span className="font-medium text-foreground">{card.owner}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>Source truth</span>
                              <span className="font-medium text-foreground">{card.sourceOfTruthOwner}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>Impact</span>
                              <span className="max-w-[9rem] truncate font-medium text-foreground">{card.businessImpact.value}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t pt-2 text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {card.freshnessAt}</span>
                            <span className="inline-flex items-center gap-1"><ShieldAlert className="size-3" /> {card.guardrails.length} guardrails</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button type="button" aria-label={`Move ${card.title} left`} variant="outline" size="sm" disabled={!canMoveLeft} onKeyDown={(event) => handleKeyMove(event, card, -1)} onClick={() => canMoveLeft && moveCard(card.id, board.lanes[currentIndex - 1].id)}>
                              <ArrowLeft className="size-3" /> Move
                            </Button>
                            <Button type="button" data-testid={canMoveRight ? 'move-card-right' : undefined} aria-label={`Move ${card.title} right`} variant="outline" size="sm" disabled={!canMoveRight} onKeyDown={(event) => handleKeyMove(event, card, 1)} onClick={() => canMoveRight && moveCard(card.id, board.lanes[currentIndex + 1].id)}>
                              Move <ArrowRight className="size-3" />
                            </Button>
                          </div>
                          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => openCard(card)}>
                            Open details <ExternalLink className="size-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Sheet open={Boolean(selectedCard)} onOpenChange={(open) => !open && setSelectedCardId(null)}>
        <SheetContent className="overflow-y-auto sm:w-[34rem]">
          {selectedCard ? <IntelligenceBoardDetail card={selectedCard} boardRevision={board.boardRevision} auditEvents={selectedCardAuditEvents} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function BoardSummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="flex items-center gap-1.5">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <InfoHint label={`${label} info`}>{detail}</InfoHint>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function IntelligenceBoardDetail({ card, boardRevision, auditEvents }: { card: IntelligenceBoardCard; boardRevision: number; auditEvents: IntelligenceBoardAuditEvent[] }) {
  return (
    <div className="space-y-5" data-testid="intelligence-board-detail">
      <SheetHeader>
        <SheetDescription>{card.tower} · {card.floor}</SheetDescription>
        <SheetTitle>{card.title}</SheetTitle>
      </SheetHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">{formatStatus(card.displayStatus)}</Badge>
        <span className={cn('rounded-full border px-3 py-1 text-xs capitalize', riskToneClasses[card.exceptionLevel])}>{card.exceptionLevel} exception</span>
        <Badge variant="outline">Confidence {card.confidence}%</Badge>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Next operator action</div>
        <p className="mt-2 text-sm font-medium">{card.nextAction}</p>
        <p className="mt-2 text-xs text-muted-foreground">Board lane is Intelligence triage only. Source truth remains with {card.sourceOfTruthOwner}.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailMetric label="Owner" value={card.owner} />
        <DetailMetric label="Next owner" value={card.nextOwner} />
        <DetailMetric label="Source truth" value={card.sourceOfTruthOwner} />
        <DetailMetric label="Read model" value={card.readModelOwner} />
        <DetailMetric label="Freshness" value={card.freshnessAt} />
        <DetailMetric label="Revision" value={`${boardRevision}`} />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Business impact</h3>
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-semibold">{card.businessImpact.value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{card.businessImpact.label}</div>
          <p className="mt-2 text-xs text-muted-foreground">{card.businessImpact.rationale}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Evidence and guardrails</h3>
        <div className="space-y-2">
          {card.evidenceIds.map((evidenceId) => (
            <div key={evidenceId} className="rounded-xl border bg-muted/20 px-3 py-2 text-sm">Evidence: {evidenceId}</div>
          ))}
          {card.guardrails.map((guardrail) => (
            <div key={`${guardrail.owner}-${guardrail.message}`} className="rounded-xl border bg-background px-3 py-2 text-sm">
              <div className="font-medium">{guardrail.owner}</div>
              <p className="text-muted-foreground">{guardrail.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Linked source entities</h3>
        <div className="space-y-2">
          {card.linkedEntities.map((entity) => (
            <div key={`${entity.owner}-${entity.type}-${entity.id}`} className="rounded-xl border px-3 py-2 text-xs">
              <div className="font-medium text-foreground">{entity.owner}</div>
              <div className="mt-1 text-muted-foreground">{entity.type}: {entity.id}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Audit preview</h3>
        {auditEvents.length > 0 ? (
          <div className="space-y-2">
            {auditEvents.map((event) => (
              <div key={event.id} className="rounded-xl border bg-muted/20 px-3 py-2 text-xs">
                <div className="font-medium text-foreground">{event.actorRole}</div>
                <div className="mt-1 text-muted-foreground">Moved {formatStatus(event.fromLaneId)} → {formatStatus(event.toLaneId)} · {event.auditId}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">No local move events yet. First drag/drop will create a preview audit record.</div>
        )}
      </section>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
