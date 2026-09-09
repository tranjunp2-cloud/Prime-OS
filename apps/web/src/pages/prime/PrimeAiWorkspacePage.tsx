import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileText,
  Minimize2,
  PackageSearch,
  Paperclip,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type ScenarioId = 'invoice' | 'inventory' | 'revenue';
type ApprovalState = 'review' | 'approved' | 'dismissed';

const scenarios = {
  invoice: {
    id: 'invoice' as const,
    icon: FileText,
    label: 'Invoice follow-up',
    prompt: 'Which invoices are due this week, and what should I do first?',
    answer: 'Seven invoices worth RM 84,600 are due in the next 7 days. Three accounts represent 78% of the exposure. I recommend contacting Atelier Coffee first: its RM 28,400 invoice is due tomorrow and the account has responded well to WhatsApp reminders.',
    metrics: [
      ['Due this week', '7 invoices'],
      ['Total exposure', 'RM 84,600'],
      ['Highest priority', 'Atelier Coffee'],
    ],
    actionTitle: 'Send payment reminder to Atelier Coffee',
    actionDescription: 'Draft a WhatsApp reminder for INV-2026-084 · RM 28,400 · due tomorrow.',
    source: 'Invoice Management',
    updated: 'Synced 2 min ago',
  },
  inventory: {
    id: 'inventory' as const,
    icon: PackageSearch,
    label: 'Inventory risk',
    prompt: 'Show products at risk of stocking out before the weekend.',
    answer: 'Four active products may stock out before Saturday. Nordic Desk Lamp has the highest revenue risk: 18 units available, 11.4 units daily velocity, and replenishment is not expected for 5 days.',
    metrics: [
      ['At-risk products', '4 SKUs'],
      ['Revenue at risk', 'RM 31,200'],
      ['First stockout', '1.6 days'],
    ],
    actionTitle: 'Prepare an inventory transfer',
    actionDescription: 'Draft a transfer of 40 Nordic Desk Lamps from Central Hub to KL Store.',
    source: 'Inventory Brain',
    updated: 'Synced 4 min ago',
  },
  revenue: {
    id: 'revenue' as const,
    icon: CircleDollarSign,
    label: 'Revenue performance',
    prompt: 'Why did revenue decrease this week?',
    answer: 'Revenue is down 8.4% week over week. The main driver is a 14% conversion decline on the mobile storefront after shipping fees became visible later in checkout. Traffic and average order value remain stable.',
    metrics: [
      ['Revenue change', '−8.4%'],
      ['Mobile conversion', '−14.0%'],
      ['Traffic change', '+1.2%'],
    ],
    actionTitle: 'Create an investigation task',
    actionDescription: 'Draft a task for Commerce Ops to review mobile shipping-fee disclosure.',
    source: 'Performance + Checkout',
    updated: 'Synced 6 min ago',
  },
};

const history = [
  { title: 'Weekly revenue drivers', meta: 'Performance · 18 min ago' },
  { title: 'Overdue invoice summary', meta: 'Finance · Yesterday' },
  { title: 'Low-stock action plan', meta: 'Commerce · Yesterday' },
];

export default function PrimeAiWorkspacePage() {
  const navigate = useNavigate();
  const [scenarioId, setScenarioId] = useState<ScenarioId>('invoice');
  const [prompt, setPrompt] = useState(scenarios.invoice.prompt);
  const [submittedPrompt, setSubmittedPrompt] = useState(scenarios.invoice.prompt);
  const [approval, setApproval] = useState<ApprovalState>('review');
  const [isThinking, setIsThinking] = useState(false);
  const scenario = scenarios[scenarioId];

  const status = useMemo(() => {
    if (approval === 'approved') return { label: 'Approved', icon: CheckCircle2, className: 'border-success/30 bg-success/10 text-success' };
    if (approval === 'dismissed') return { label: 'Dismissed', icon: RotateCcw, className: 'border-border bg-muted text-muted-foreground' };
    return { label: 'Needs approval', icon: ShieldCheck, className: 'border-warning/35 bg-warning/10 text-foreground' };
  }, [approval]);

  const selectScenario = (id: ScenarioId) => {
    setScenarioId(id);
    setPrompt(scenarios[id].prompt);
    setSubmittedPrompt(scenarios[id].prompt);
    setApproval('review');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isThinking) return;
    setIsThinking(true);
    setApproval('review');
    window.setTimeout(() => {
      setSubmittedPrompt(prompt.trim());
      setIsThinking(false);
    }, 650);
  };

  const StatusIcon = status.icon;
  const ActionIcon = scenario.icon;

  const minimizeToPanel = () => {
    const returnLocation = window.sessionStorage.getItem('prime-ai.return-location') || '/overview';
    navigate(returnLocation);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('prime-ai:open')), 0);
  };

  return (
    <main className="min-h-full bg-background" aria-labelledby="prime-ai-title">
      <header className="border-b bg-card px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm" aria-hidden="true">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 id="prime-ai-title" className="truncate text-lg font-semibold tracking-tight">Prime AI</h1>
                <Badge variant="secondary" className="hidden sm:inline-flex">Prototype</Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">Your AI operating partner across PrimeOS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-11" onClick={minimizeToPanel} aria-label="Minimize to side panel" title="Minimize to side panel">
              <Minimize2 className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" className="min-h-11 gap-2" aria-label="Change Prime AI workspace">
              All business data <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r bg-card p-4 lg:block" aria-label="Prime AI conversations">
          <Button className="min-h-11 w-full justify-start gap-2" onClick={() => selectScenario('invoice')}>
            <Sparkles className="size-4" aria-hidden="true" /> New conversation
          </Button>
          <div className="mt-6">
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent</p>
            <nav className="mt-2 space-y-1">
              {history.map((item) => (
                <button key={item.title} type="button" className="min-h-11 w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.meta}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-6 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-primary" />Safe by design</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Prime AI can analyze and prepare drafts. You approve every business change.</p>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8" aria-label="Prime AI conversation">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">Good morning, Alex</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-3xl">What would you like to improve today?</h2>
              <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Suggested questions">
                {(Object.keys(scenarios) as ScenarioId[]).map((id) => {
                  const item = scenarios[id];
                  const Icon = item.icon;
                  return (
                    <button key={id} type="button" onClick={() => selectScenario(id)} aria-pressed={scenarioId === id} className={cn('flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', scenarioId === id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}>
                      <Icon className="size-4" aria-hidden="true" />{item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5" aria-live="polite" aria-busy={isThinking}>
              <div className="flex justify-end gap-3">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">{submittedPrompt}</div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><UserRound className="size-4" aria-hidden="true" /></div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bot className="size-4" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">Prime AI <Badge variant="outline" className="font-normal">AI-generated</Badge></div>
                  {isThinking ? (
                    <div className="space-y-3" aria-label="Prime AI is analyzing">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" /><div className="h-4 w-5/6 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded-lg bg-muted" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-6 text-foreground">{scenario.answer}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {scenario.metrics.map(([label, value]) => (
                          <div key={label} className="rounded-lg border bg-card p-3 shadow-sm">
                            <p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-success" />Based on verified PrimeOS data</span>
                        <span aria-hidden="true">·</span><span>{scenario.updated}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="size-10" aria-label="Helpful response"><ThumbsUp className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-10" aria-label="Not helpful response"><ThumbsDown className="size-4" /></Button>
                        <Button variant="ghost" size="sm" className="min-h-10 gap-2"><RotateCcw className="size-4" />Regenerate</Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={submit} className="sticky bottom-0 mt-8 bg-background/95 pb-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <label htmlFor="prime-ai-prompt" className="sr-only">Ask Prime AI</label>
              <div className="rounded-xl border bg-card p-2 shadow-[var(--shadow-panel)] focus-within:ring-2 focus-within:ring-ring">
                <Textarea id="prime-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about revenue, customers, orders, inventory or invoices…" className="min-h-[76px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Attach context"><Paperclip className="size-4" /></Button>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">Review before sending</span>
                    <Button type="submit" size="icon" className="size-10" disabled={!prompt.trim() || isThinking} aria-label="Send message"><Send className="size-4" /></Button>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">Prime AI can make mistakes. Review evidence and approve changes before execution.</p>
            </form>
          </div>
        </section>

        <aside className="border-t bg-card p-4 xl:border-l xl:border-t-0" aria-label="Prime AI action review">
          <div className="mx-auto max-w-3xl xl:sticky xl:top-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Action review</h2>
              <Badge variant="outline" className={cn('gap-1.5', status.className)}><StatusIcon className="size-3.5" />{status.label}</Badge>
            </div>
            <Card className="mt-3 shadow-sm">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><ActionIcon className="size-4" /></div>
                <div><CardTitle className="text-base leading-6">{scenario.actionTitle}</CardTitle><p className="mt-1 text-sm leading-5 text-muted-foreground">{scenario.actionDescription}</p></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Source</span><span className="text-right font-medium">{scenario.source}</span></div>
                  <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Created by</span><span className="font-medium">Prime AI</span></div>
                  <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Execution</span><span className="font-medium">After approval</span></div>
                </div>
                {approval === 'review' ? (
                  <div className="grid gap-2">
                    <Button className="min-h-11 gap-2" onClick={() => setApproval('approved')}><ShieldCheck className="size-4" />Approve action</Button>
                    <Button variant="outline" className="min-h-11" onClick={() => setApproval('dismissed')}>Dismiss</Button>
                  </div>
                ) : approval === 'approved' ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm"><p className="font-medium text-success">Action approved</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Prototype only—no external system was changed.</p></div>
                ) : (
                  <Button variant="outline" className="min-h-11 w-full gap-2" onClick={() => setApproval('review')}><RotateCcw className="size-4" />Restore draft</Button>
                )}
              </CardContent>
            </Card>

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence</h3>
              <button type="button" className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-2"><FileText className="size-4 text-primary" />View source records</span><ExternalLink className="size-4 text-muted-foreground" />
              </button>
              <div className="mt-2 flex items-center gap-2 px-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{scenario.updated}</div>
            </div>

            <div className="mt-5 rounded-lg border p-3">
              <p className="text-sm font-medium">Next best question</p>
              <button type="button" className="mt-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-muted px-3 text-left text-xs leading-5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setPrompt(`Explain the evidence behind this ${scenario.label.toLowerCase()} recommendation.`)}>
                Explain the evidence behind this recommendation <ArrowRight className="size-4 shrink-0" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
