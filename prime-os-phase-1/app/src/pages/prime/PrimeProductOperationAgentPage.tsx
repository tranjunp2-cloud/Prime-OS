import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  GripVertical,
  Info,
  Layers3,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Workflow,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import {
  OPERATING_COMMAND_PROMPTS,
  buildOperatingChatResolution,
  buildProductOperationAgentSeedData,
  moveOperatingCard,
  queueOperatingApproval,
  type OperatingAgentProposal,
  type OperatingApprovalState,
  type OperatingCard,
  type OperatingChatIntent,
  type OperatingChatResolution,
  type OperatingCommandResponse,
  type OperatingLaneId,
  type OperatingProposalStatus,
  type OperatingSeverity,
  type ProductOperationViewId,
  type QueueOperatingApprovalResult,
} from '@/lib/prime/product-operation-agent-seed-data';
import { cn } from '@/lib/utils';

const views: Array<{ id: ProductOperationViewId; label: string; icon: typeof Workflow; copy: string }> = [
  { id: 'command', label: 'Command Center', icon: Layers3, copy: 'Cross-suite operating load, risk, and commitments.' },
  { id: 'kanban', label: 'Operating Kanban', icon: Workflow, copy: 'Policy-backed work cards with owner and evidence.' },
  { id: 'queue', label: 'Agent Queue', icon: Bot, copy: 'Approve, reject, and route agent-prepared actions.' },
  { id: 'audit', label: 'Audit', icon: FileText, copy: 'Every recommendation and move remains inspectable.' },
];

const severityTone: Record<OperatingSeverity, string> = {
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  high: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200',
};

const approvalLabel: Record<OperatingApprovalState, string> = {
  approved: 'Approved',
  not_required: 'No approval',
  pending: 'Pending approval',
  rejected: 'Rejected',
};

const proposalLabel: Record<OperatingProposalStatus, string> = {
  approved: 'Approved',
  executed: 'Executed',
  needs_approval: 'Needs approval',
  ready: 'Ready',
  rejected: 'Rejected',
};

const terminalProposalStatuses = new Set<OperatingProposalStatus>(['approved', 'executed', 'rejected']);

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

function ProductOperationHeader({
  activeView,
  onChangeView,
}: {
  activeView: ProductOperationViewId
  onChangeView: (view: ProductOperationViewId) => void
}) {
  return (
    <div className="space-y-6 border-b pb-6">
      <div>
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="size-4 text-primary" /> Intelligence / Operation Agent
          </div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Operation Agent</h1>
        </div>
      </div>
      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-muted p-1">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              type="button"
              title={view.copy}
              onClick={() => onChangeView(view.id)}
              className={cn(
                'min-w-56 rounded-xl px-4 py-3 text-left transition-colors',
                activeView === view.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/60',
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Icon className="size-4" />
                {view.label}
                <InfoHint label={`${view.label} info`}>{view.copy}</InfoHint>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardDetailDialog({ card, onClose }: { card: OperatingCard | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(card)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-2xl">
        {card ? (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{card.sourceSuite}</Badge>
                <Badge variant="outline">{approvalLabel[card.approvalState]}</Badge>
                <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold capitalize', severityTone[card.severity])}>{card.severity}</span>
              </div>
              <DialogTitle className="text-2xl">{card.title}</DialogTitle>
              <DialogDescription>{card.businessImpact}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="font-semibold">Recommended action</div>
                <p className="mt-2 text-sm text-muted-foreground">{card.recommendedAction}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="font-semibold">Operating owner</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {card.owner} via {card.sourceOwner}
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="font-semibold">Evidence</div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {card.evidence.map((item) => (
                  <div key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="font-semibold">Policy checks</div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {card.policyChecklist.map((check) => (
                  <div key={check.label} className="flex items-center gap-2 rounded-lg border bg-background p-3">
                    {check.passed ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Clock3 className="size-4 text-amber-600" />}
                    <span className="text-muted-foreground">{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="font-semibold">Audit trail</div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {card.auditTrail.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
            <Button asChild className="w-full">
              <Link to={card.sourceRoute}>
                Open source route <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type OperatingChatMessageStatus = 'sent' | 'thinking' | 'ready' | 'blocked' | 'error';
type OperatingChatActionState = 'none' | 'queued' | 'prepared' | 'blocked';

interface OperatingChatMessage {
  id: string
  role: 'operator' | 'agent' | 'system'
  content: string
  createdAt: string
  status: OperatingChatMessageStatus
  intent?: OperatingChatIntent
  resolution?: OperatingChatResolution
  actionState?: OperatingChatActionState
}

const formatChatTime = () =>
  new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

function AgentResolutionCard({
  message,
  onPreparePacket,
  onQueueApproval,
}: {
  message: OperatingChatMessage
  onPreparePacket: (messageId: string, resolution: OperatingChatResolution) => void
  onQueueApproval: (messageId: string, resolution: OperatingChatResolution) => void
}) {
  const resolution = message.resolution;
  if (!resolution) return null;

  const response = resolution.response;
  const actionLocked = message.actionState === 'queued' || message.actionState === 'prepared';

  return (
    <div className={cn('rounded-2xl border p-4', resolution.intent === 'unsafe_mutation' ? 'border-amber-300 bg-amber-50/60' : 'bg-muted/30')}>
      <div className="flex flex-wrap items-center gap-2">
        {resolution.intent === 'unsafe_mutation' ? <AlertTriangle className="size-4 text-amber-600" /> : <Bot className="size-4 text-primary" />}
        <span className="font-semibold">Operation Agent</span>
        <Badge variant={resolution.intent === 'unsafe_mutation' ? 'outline' : response?.approvalState === 'pending' ? 'outline' : 'secondary'}>{resolution.statusLabel}</Badge>
        {message.actionState === 'queued' ? <Badge variant="secondary">Queued for approval</Badge> : null}
        {message.actionState === 'prepared' ? <Badge variant="secondary">Packet prepared</Badge> : null}
      </div>
      <h3 className="mt-4 text-xl font-semibold">{resolution.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{resolution.summary}</p>
      {response ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">Owner</div>
            <div className="mt-1 font-medium">{response.owner ?? 'Product operations'}</div>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">Source</div>
            <div className="mt-1 font-medium">{response.sourceSuite ?? 'PrimeOS'}</div>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">Approval</div>
            <div className="mt-1 font-medium">{response.approvalState ? approvalLabel[response.approvalState] : 'Audit-only'}</div>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {resolution.actions.map((action) => {
          const key = `${message.id}-${action.intent}-${action.label}`;
          if (action.intent === 'queue' && response) {
            return (
              <Button key={key} type="button" size="sm" disabled={actionLocked} onClick={() => onQueueApproval(message.id, resolution)}>
                {message.actionState === 'queued' ? 'Queued for approval' : action.label} <ArrowRight className="size-4" />
              </Button>
            );
          }

          if (action.intent === 'prepare') {
            return (
              <Button key={key} type="button" size="sm" variant={actionLocked ? 'secondary' : 'default'} disabled={actionLocked} onClick={() => onPreparePacket(message.id, resolution)}>
                {message.actionState === 'prepared' ? 'Packet prepared' : action.label} <ArrowRight className="size-4" />
              </Button>
            );
          }

          return (
            <Button key={key} asChild size="sm" variant="outline">
              <Link to={action.route}>
                {action.label} <ArrowRight className="size-4" />
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function CommandCenter({
  cards,
  proposals,
  onQueueApproval,
}: {
  cards: OperatingCard[]
  proposals: OperatingAgentProposal[]
  onQueueApproval: (response: OperatingCommandResponse) => QueueOperatingApprovalResult
}) {
  const [composerValue, setComposerValue] = useState('');
  const messageIdRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<OperatingChatMessage[]>(() => {
    const welcome = buildOperatingChatResolution(cards, proposals, 'hello');
    return [
      {
        id: 'agent-welcome',
        role: 'agent',
        content: welcome.summary,
        createdAt: formatChatTime(),
        status: 'ready',
        intent: 'greeting',
        resolution: welcome,
        actionState: 'none',
      },
    ];
  });

  const latestResolution = [...messages].reverse().find((message) => message.role === 'agent' && message.resolution)?.resolution ?? messages[0]?.resolution;
  const focusCard = latestResolution?.response?.focusCardId ? cards.find((card) => card.id === latestResolution.response?.focusCardId) : undefined;
  const urgentCards = cards.filter((card) => card.severity === 'high' || card.approvalState === 'pending').slice(0, 3);
  const suites = Array.from(new Set(cards.map((card) => card.sourceSuite)));
  const pendingApprovals = cards.filter((card) => card.approvalState === 'pending').length;
  const highRisk = cards.filter((card) => card.severity === 'high').length;
  const waiting = cards.filter((card) => card.laneId === 'waiting').length;
  const isThinking = messages.some((message) => message.status === 'thinking');
  const hasActionPreview = Boolean(latestResolution?.response);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const nextMessageId = (prefix: string) => {
    messageIdRef.current += 1;
    return `${prefix}-${messageIdRef.current}`;
  };

  const sendPrompt = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isThinking) {
      composerRef.current?.focus();
      return;
    }

    const operatorMessage: OperatingChatMessage = {
      id: nextMessageId('operator'),
      role: 'operator',
      content: trimmed,
      createdAt: formatChatTime(),
      status: 'sent',
      actionState: 'none',
    };
    const agentMessageId = nextMessageId('agent');
    const thinkingMessage: OperatingChatMessage = {
      id: agentMessageId,
      role: 'agent',
      content: 'Preparing governed response...',
      createdAt: formatChatTime(),
      status: 'thinking',
      actionState: 'none',
    };

    setMessages((current) => [...current, operatorMessage, thinkingMessage]);
    setComposerValue('');
    composerRef.current?.focus();

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const resolution = buildOperatingChatResolution(cards, proposals, trimmed);
      setMessages((current) =>
        current.map((message) =>
          message.id === agentMessageId
            ? {
                ...message,
                content: resolution.summary,
                status: resolution.intent === 'unsafe_mutation' ? 'blocked' : 'ready',
                intent: resolution.intent,
                resolution,
              }
            : message,
        ),
      );
    }, 350);
  };

  const handleSubmitCommand = () => {
    sendPrompt(composerValue);
  };

  const updateMessageActionState = (messageId: string, actionState: OperatingChatActionState) => {
    setMessages((current) => current.map((message) => (message.id === messageId ? { ...message, actionState } : message)));
  };

  const appendSystemMessage = (content: string) => {
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId('system'),
        role: 'system',
        content,
        createdAt: formatChatTime(),
        status: 'ready',
        actionState: 'none',
      },
    ]);
  };

  const handlePreparePacket = (messageId: string, resolution: OperatingChatResolution) => {
    updateMessageActionState(messageId, 'prepared');
    appendSystemMessage(`Packet prepared for review: ${resolution.title}. No source suite has been changed.`);
  };

  const handleQueueApproval = (messageId: string, resolution: OperatingChatResolution) => {
    if (!resolution.response) return;
    const result = onQueueApproval(resolution.response);
    updateMessageActionState(messageId, result.status === 'blocked' ? 'blocked' : 'queued');
    appendSystemMessage(result.message);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section data-testid="product-operation-command-chat" className="order-1 flex min-h-[calc(100dvh-220px)] min-w-0 flex-col rounded-2xl border bg-card xl:order-none xl:min-h-[680px]">
        <div className="border-b p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Agent command surface</div>
              <h2 className="mt-2 text-2xl font-semibold">Operation Agent</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <CheckCircle2 className="mr-1 size-3 text-emerald-600" />
                Agent ready
              </Badge>
              <Badge variant="outline">No source mutation</Badge>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {OPERATING_COMMAND_PROMPTS.map((command) => (
              <button
                key={command.id}
                type="button"
                disabled={isThinking}
                onClick={() => sendPrompt(command.prompt)}
                className="shrink-0 rounded-full border bg-background px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {command.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-relevant="additions" aria-busy={isThinking}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'min-w-0',
                message.role === 'operator' && 'ml-auto max-w-[94%] md:max-w-[82%]',
                message.role === 'agent' && 'mr-auto max-w-[96%] md:max-w-[92%]',
                message.role === 'system' && 'mx-auto max-w-[96%]',
              )}
            >
              {message.role === 'operator' ? (
                <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                  <div className="flex items-center justify-between gap-3 text-xs opacity-80">
                    <span>Operator</span>
                    <span>{message.createdAt}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap font-medium">{message.content}</div>
                </div>
              ) : null}

              {message.role === 'system' ? (
                <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Chat action
                    <span className="ml-auto text-xs font-normal text-muted-foreground">{message.createdAt}</span>
                  </div>
                  <div className="mt-1">{message.content}</div>
                </div>
              ) : null}

              {message.role === 'agent' && message.status === 'thinking' ? (
                <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Bot className="size-4 animate-pulse text-primary" />
                    Operation Agent
                    <Badge variant="outline">Thinking</Badge>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="h-3 w-2/3 rounded-full bg-muted" />
                    <div className="h-3 w-1/2 rounded-full bg-muted" />
                  </div>
                </div>
              ) : null}

              {message.role === 'agent' && message.status !== 'thinking' ? (
                <AgentResolutionCard message={message} onPreparePacket={handlePreparePacket} onQueueApproval={handleQueueApproval} />
              ) : null}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="sticky bottom-0 border-t bg-card/95 p-3 pr-24 backdrop-blur md:p-4 md:pr-36">
          <label className="sr-only" htmlFor="product-operation-command">
            Command composer
          </label>
          <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
            <Bot className="mb-2.5 size-4 shrink-0 text-primary" />
            <input ref={attachmentInputRef} className="sr-only" type="file" aria-label="Attach file" multiple />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Attach file"
              title="Attach file"
              onClick={() => attachmentInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <textarea
              ref={composerRef}
              id="product-operation-command"
              aria-label="Command composer"
              value={composerValue}
              onChange={(event) => setComposerValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmitCommand();
                }
              }}
              placeholder="Ask the Operation Agent to prepare, route, or summarize operating work..."
              className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/70"
              rows={1}
            />
            <Button
              type="button"
              size="sm"
              className="mb-0.5 h-9 shrink-0 rounded-xl px-3"
              disabled={!composerValue.trim() || isThinking}
              onClick={handleSubmitCommand}
            >
              <span className="hidden sm:inline">Send</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <aside data-testid="product-operation-command-inspector" className="order-2 space-y-4 xl:order-none">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Operating pulse</div>
              <h2 className="mt-2 text-xl font-semibold">Today load</h2>
            </div>
            <Badge variant="outline">{suites.length} suites</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="text-2xl font-semibold">{cards.length}</div>
              <div className="text-xs text-muted-foreground">Cards</div>
            </div>
            <div className="rounded-xl border bg-primary/5 p-3">
              <div className="text-2xl font-semibold">{pendingApprovals}</div>
              <div className="text-xs text-muted-foreground">Approvals</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
              <div className="text-2xl font-semibold text-rose-700">{highRisk}</div>
              <div className="text-xs text-muted-foreground">High risk</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="text-2xl font-semibold text-amber-700">{waiting}</div>
              <div className="text-xs text-muted-foreground">Waiting</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          {hasActionPreview ? (
            <>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Action preview</div>
                <h2 className="mt-2 text-xl font-semibold">{focusCard?.title ?? latestResolution?.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{latestResolution?.auditImplication}</p>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-muted/30 p-4">
                  <div className="font-semibold">Evidence</div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {(latestResolution?.evidence ?? []).slice(0, 3).map((item) => (
                      <div key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/30 p-4">
                  <div className="font-semibold">Policy checks</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(latestResolution?.policyChecks ?? []).slice(0, 2).map((check) => (
                      <div key={check.label} className="flex items-center gap-2 rounded-lg bg-background p-2">
                        {check.passed ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Clock3 className="size-4 text-amber-600" />}
                        <span className="text-muted-foreground">{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
            </>
          ) : (
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Agent status</div>
              <div className="mt-3 flex items-center gap-2">
                <Clock3 className="size-4 text-amber-600" />
                <span className="font-semibold">{latestResolution?.statusLabel ?? 'Ready'}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">No action is prepared yet. Pick a suggested prompt or ask for approvals, risk, blocked work, or audit changes.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="font-semibold">Urgent cards</div>
          <div className="mt-3 space-y-2">
            {urgentCards.map((card) => (
              <Link key={card.id} to="/intelligence/product-operation-agent?view=kanban" className="block rounded-lg border bg-background p-3 text-sm hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium line-clamp-2">{card.title}</div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', card.severity === 'high' ? 'bg-rose-100 text-rose-700' : card.laneId === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary')}>
                    {card.severity === 'high' ? 'Risk' : card.laneId === 'waiting' ? 'Blocked' : card.sourceSuite === 'Finance' ? 'Finance' : 'Approval'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{card.sourceSuite}</span>
                  <span>{approvalLabel[card.approvalState]}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function OperatingKanban({
  cards,
  lanes,
  onMoveCard,
  onOpenCard,
}: {
  cards: OperatingCard[]
  lanes: ReturnType<typeof buildProductOperationAgentSeedData>['lanes']
  onMoveCard: (cardId: string, laneId: OperatingLaneId) => void
  onOpenCard: (cardId: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1540px] grid-cols-7 gap-4">
        {lanes.map((lane) => {
          const laneCards = cards.filter((card) => card.laneId === lane.id);
          const limitReached = laneCards.length > lane.wipLimit;
          return (
            <div
              key={lane.id}
              className={cn('min-h-[540px] rounded-2xl border bg-card/80 p-3', limitReached && 'border-amber-500/70')}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onMoveCard(event.dataTransfer.getData('text/plain'), lane.id)}
            >
              <div className="rounded-xl border bg-background/90 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold">{lane.label}</h3>
                      <InfoHint label={`${lane.label} info`}>{lane.description}</InfoHint>
                    </div>
                  </div>
                  <Badge variant={limitReached ? 'destructive' : 'outline'}>{laneCards.length}/{lane.wipLimit}</Badge>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {laneCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    draggable
                    onClick={() => onOpenCard(card.id)}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
                    className="w-full cursor-pointer rounded-xl border bg-background p-4 text-left shadow-sm transition hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-semibold">{card.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{card.sourceSuite}</Badge>
                          <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold capitalize', severityTone[card.severity])}>
                            {card.severity}
                          </span>
                        </div>
                      </div>
                      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">{card.metricLabel}</div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <span>{card.owner}</span>
                        <span>{card.dueLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>{card.evidence.length} evidence</span>
                        <span>{approvalLabel[card.approvalState]}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {!laneCards.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Drop operating card here.</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentQueue({
  cards,
  proposals,
  onResolve,
}: {
  cards: OperatingCard[]
  proposals: OperatingAgentProposal[]
  onResolve: (proposalId: string, status: Extract<OperatingProposalStatus, 'approved' | 'rejected' | 'executed'>) => void
}) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const selectedProposal = proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;
  const selectedCard = selectedProposal ? cards.find((card) => card.id === selectedProposal.cardId) ?? null : null;

  const renderProposalActions = (proposal: OperatingAgentProposal) => {
    if (terminalProposalStatuses.has(proposal.status)) {
      return <Badge variant={proposal.status === 'rejected' ? 'destructive' : 'secondary'}>{proposalLabel[proposal.status]}</Badge>;
    }

    if (proposal.requiresApproval) {
      return (
        <>
          <Button
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onResolve(proposal.id, 'approved');
            }}
          >
            <CheckCircle2 className="size-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onResolve(proposal.id, 'rejected');
            }}
          >
            <XCircle className="size-4" /> Reject
          </Button>
        </>
      );
    }

    return (
      <Button
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onResolve(proposal.id, 'executed');
        }}
      >
        <ClipboardCheck className="size-4" /> Mark executed
      </Button>
    );
  };

  return (
    <>
      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-lg">
                Agent Queue
                <InfoHint label="Agent Queue list info">Click a row to inspect evidence, policy checks, and audit context.</InfoHint>
              </CardTitle>
            </div>
            <Badge variant="outline">{proposals.length} packets</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:grid md:grid-cols-[minmax(260px,1.35fr)_170px_120px_minmax(150px,0.8fr)_230px] md:gap-4">
            <div>Packet</div>
            <div>Agent</div>
            <div>Action</div>
            <div>Status</div>
            <div>Controls</div>
          </div>
          <div className="divide-y">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProposalId(proposal.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedProposalId(proposal.id);
                  }
                }}
                className="grid cursor-pointer gap-3 px-4 py-4 transition-colors hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30 md:grid-cols-[minmax(260px,1.35fr)_170px_120px_minmax(150px,0.8fr)_230px] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate font-semibold">{proposal.title}</div>
                    <InfoHint label={`${proposal.title} info`}>{proposal.summary}</InfoHint>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{proposal.route}</div>
                </div>
                <div className="text-sm">
                  <div className="md:hidden text-xs text-muted-foreground">Agent</div>
                  <div className="font-medium">{proposal.agentName}</div>
                </div>
                <div className="text-sm capitalize">
                  <div className="md:hidden text-xs text-muted-foreground">Action</div>
                  {proposal.actionType}
                </div>
                <div>
                  <Badge variant={proposal.status === 'rejected' ? 'destructive' : proposal.requiresApproval ? 'outline' : 'secondary'}>
                    {proposalLabel[proposal.status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                  {renderProposalActions(proposal)}
                  <Button asChild size="sm" variant="ghost">
                    <Link to={proposal.route}>
                      Open route <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedProposal)} onOpenChange={(open) => !open && setSelectedProposalId(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-2xl">
          {selectedProposal ? (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedProposal.status === 'rejected' ? 'destructive' : selectedProposal.requiresApproval ? 'outline' : 'secondary'}>
                    {proposalLabel[selectedProposal.status]}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">{selectedProposal.actionType}</Badge>
                  {selectedCard ? <Badge variant="outline">{selectedCard.sourceSuite}</Badge> : null}
                </div>
                <DialogTitle className="text-2xl">{selectedProposal.title}</DialogTitle>
                <DialogDescription>{selectedProposal.summary}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Agent</div>
                  <div className="mt-1 font-medium">{selectedProposal.agentName}</div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Route</div>
                  <div className="mt-1 truncate font-medium">{selectedProposal.route}</div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Approval</div>
                  <div className="mt-1 font-medium">{selectedProposal.requiresApproval ? 'Operator required' : 'Not required'}</div>
                </div>
              </div>

              {selectedCard ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">Evidence</h3>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {selectedCard.evidence.map((item) => (
                        <div key={item} className="rounded-lg border bg-muted/20 px-3 py-2">{item}</div>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">Policy checks</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {selectedCard.policyChecklist.map((check) => (
                        <div key={check.label} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                          {check.passed ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Clock3 className="size-4 text-amber-600" />}
                          <span>{check.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-xl border p-4 md:col-span-2">
                    <h3 className="font-semibold">Audit context</h3>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      {selectedCard.auditTrail.map((item) => (
                        <div key={item} className="rounded-lg border bg-muted/20 px-3 py-2">{item}</div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {renderProposalActions(selectedProposal)}
                <Button asChild variant="outline">
                  <Link to={selectedProposal.route}>
                    Open source route <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditView({
  cards,
  proposals,
}: {
  cards: OperatingCard[]
  proposals: OperatingAgentProposal[]
}) {
  const proposalEvents = proposals.map((proposal) => ({
    id: `${proposal.id}-${proposal.status}`,
    label: `${proposal.title}: ${proposalLabel[proposal.status]}`,
    actor: proposal.agentName,
    timestampLabel: 'Now',
  }));
  const cardAuditEvents = cards.flatMap((card) =>
    card.auditTrail.map((label, index) => ({
      id: `${card.id}-${index}-${label}`,
      label,
      actor: index === card.auditTrail.length - 1 ? card.sourceOwner : 'Operation Agent',
      timestampLabel: index === card.auditTrail.length - 1 ? `${card.ageHours}h ago` : 'Now',
    })),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Audit stream</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...proposalEvents, ...cardAuditEvents].slice(0, 24).map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="font-medium">{event.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {event.actor} · {event.timestampLabel}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Policy posture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cards.map((card) => {
            const failed = card.policyChecklist.filter((check) => !check.passed).length;
            return (
              <div key={card.id} className="rounded-xl border bg-muted/30 p-3 text-sm">
                <div className="font-medium line-clamp-2">{card.title}</div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{card.policyChecklist.length - failed}/{card.policyChecklist.length} checks</span>
                  <Badge variant={failed ? 'outline' : 'secondary'}>{failed ? 'Needs review' : 'Clean'}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export function PrimeProductOperationAgentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view') as ProductOperationViewId | null;
  const activeView: ProductOperationViewId = views.some((view) => view.id === requestedView) ? requestedView! : 'command';
  const seed = useMemo(() => buildProductOperationAgentSeedData(getPrimeSnapshot()), []);
  const [cards, setCards] = useState(seed.cards);
  const [proposals, setProposals] = useState(seed.proposals);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;

  const metrics = {
    totalCards: cards.length,
    pendingApprovals: cards.filter((card) => card.approvalState === 'pending').length,
    highRisk: cards.filter((card) => card.severity === 'high').length,
    waiting: cards.filter((card) => card.laneId === 'waiting').length,
    suitesCovered: new Set(cards.map((card) => card.sourceSuite)).size,
  };

  const handleMoveCard = (cardId: string, laneId: OperatingLaneId) => {
    if (!cardId) return;
    setCards((current) => moveOperatingCard(current, cardId, laneId));
  };

  const handleResolveProposal = (proposalId: string, status: Extract<OperatingProposalStatus, 'approved' | 'rejected' | 'executed'>) => {
    const proposal = proposals.find((item) => item.id === proposalId);
    if (!proposal || terminalProposalStatuses.has(proposal.status)) return;

    setProposals((current) => current.map((item) => (item.id === proposalId ? { ...item, status } : item)));
    setCards((current) =>
      current.map((card) =>
        card.id === proposal.cardId
          ? {
              ...card,
              approvalState: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : card.approvalState,
              auditTrail: [`${proposal.agentName} marked proposal ${proposalLabel[status]}.`, ...card.auditTrail],
            }
          : card,
      ),
    );
  };

  const handleQueueApprovalFromChat = (response: OperatingCommandResponse) => {
    const result = queueOperatingApproval(cards, proposals, response);
    setCards(result.cards);
    setProposals(result.proposals);
    return result;
  };

  return (
    <div className="min-h-full bg-muted/20">
      <main className="space-y-6 p-4 md:p-6">
        <ProductOperationHeader activeView={activeView} onChangeView={(view) => setSearchParams({ view })} />
        {activeView === 'command' ? null : (
          <div className="grid gap-4 md:grid-cols-5">
            <SummaryMetricCard
              label="Operating cards"
              value={metrics.totalCards}
              meta="Cross-suite commitments."
              metaTooltip="Cross-suite commitments."
              icon={<Layers3 className="size-5" />}
              tone="info"
            />
            <SummaryMetricCard
              label="Approvals"
              value={metrics.pendingApprovals}
              meta="Pending operator sign-off."
              metaTooltip="Pending operator sign-off."
              icon={<ShieldCheck className="size-5" />}
              tone="orange"
            />
            <SummaryMetricCard
              label="High risk"
              value={metrics.highRisk}
              meta="Expedite-class work."
              metaTooltip="Expedite-class work."
              icon={<AlertTriangle className="size-5" />}
              tone="danger"
            />
            <SummaryMetricCard
              label="Waiting"
              value={metrics.waiting}
              meta="Blocked operating items."
              metaTooltip="Blocked operating items."
              icon={<Clock3 className="size-5" />}
              tone="muted"
            />
            <SummaryMetricCard
              label="Suites"
              value={metrics.suitesCovered}
              meta="PrimeOS coverage."
              metaTooltip="PrimeOS coverage."
              icon={<Workflow className="size-5" />}
              tone="purple"
            />
          </div>
        )}
        <div className={activeView === 'command' ? 'block' : 'hidden'}>
          <CommandCenter cards={cards} proposals={proposals} onQueueApproval={handleQueueApprovalFromChat} />
        </div>
        {activeView === 'kanban' ? <OperatingKanban cards={cards} lanes={seed.lanes} onMoveCard={handleMoveCard} onOpenCard={setSelectedCardId} /> : null}
        {activeView === 'queue' ? <AgentQueue cards={cards} proposals={proposals} onResolve={handleResolveProposal} /> : null}
        {activeView === 'audit' ? <AuditView cards={cards} proposals={proposals} /> : null}
      </main>
      <CardDetailDialog card={selectedCard} onClose={() => setSelectedCardId(null)} />
    </div>
  );
}
