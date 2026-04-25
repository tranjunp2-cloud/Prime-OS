import type { ReactNode } from 'react';
import { ArrowRight, Clock, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple';

const toneClassMap: Record<Tone, string> = {
  default: 'border-primary/25 bg-primary/10 text-primary',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  muted: 'border-border/70 bg-muted/35 text-muted-foreground',
  purple: 'border-primary/25 bg-primary/10 text-primary',
};

export type OperatingLoopStep = {
  label: string;
  title: string;
  detail: string;
  href?: string;
  tone?: Tone;
};

export type EvidenceItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
};

export type RegistryItem = {
  id: string;
  label: string;
  title: string;
  detail?: string;
  meta?: string;
  href?: string;
  tone?: Tone;
};

export function IdentifierText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-identifier text-identifier', className)}>{children}</span>;
}

export function OwnerSlaBadge({
  owner,
  sla,
  className,
}: {
  owner: string;
  sla?: string;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex min-h-7 items-center gap-2 rounded-md border border-border/70 bg-muted/35 px-2 text-xs text-muted-foreground', className)}>
      <span className="font-medium text-foreground">{owner}</span>
      {sla ? (
        <>
          <span className="h-3 w-px bg-border" />
          <Clock className="size-3" />
          <span>{sla}</span>
        </>
      ) : null}
    </div>
  );
}

export function LinkedEntityStrip({
  entities,
  className,
}: {
  entities: Array<{ label: string; value: string; href?: string; tone?: Tone }>;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {entities.map((entity) => {
        const content = (
          <>
            <span className="text-muted-foreground">{entity.label}</span>
            <IdentifierText>{entity.value}</IdentifierText>
          </>
        );
        const classes = cn('inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 text-xs', toneClassMap[entity.tone || 'muted']);

        return entity.href ? (
          <Link key={`${entity.label}-${entity.value}`} to={entity.href} className={cn(classes, 'transition-colors hover:border-primary/45 hover:text-primary')}>
            <Link2 className="size-3" />
            {content}
          </Link>
        ) : (
          <span key={`${entity.label}-${entity.value}`} className={classes}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function DecisionHeader({
  eyebrow,
  title,
  description,
  confidence,
  status,
  actions,
  evidence,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  confidence?: number;
  status?: string;
  actions?: ReactNode;
  evidence?: EvidenceItem[];
  className?: string;
}) {
  return (
    <section className={cn('surface-solid overflow-hidden rounded-lg border border-primary/20', className)}>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{eyebrow}</Badge>
            {status ? <Badge>{status}</Badge> : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">{title}</h2>
          <div className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">{description}</div>
          {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="rounded-lg border border-border/70 bg-[hsl(var(--surface-control))] p-4">
          <div className="text-metadata">Decision readiness</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-4xl font-semibold tracking-normal">{confidence ?? 72}%</div>
            <Badge variant={(confidence ?? 72) >= 75 ? 'default' : 'warning'}>{(confidence ?? 72) >= 75 ? 'Ready' : 'Watch'}</Badge>
          </div>
          <Progress value={confidence ?? 72} className="mt-3 h-1.5" />
          {evidence?.length ? (
            <div className="mt-4 grid gap-2">
              {evidence.slice(0, 3).map((item) => (
                <div key={item.label} className="rounded-md border border-border/60 bg-background/55 p-2">
                  <div className="text-metadata">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold">{item.value}</div>
                  {item.detail ? <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function OperatingLoop({ steps, className }: { steps: OperatingLoopStep[]; className?: string }) {
  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Operating loop</CardTitle>
          <Badge variant="outline">Signal to decision to action to outcome</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-4">
          {steps.map((step, index) => {
            const node = (
              <div className={cn('group h-full rounded-lg border p-3 transition-colors', toneClassMap[step.tone || 'muted'], step.href && 'hover:border-primary/45')}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-metadata">{step.label}</span>
                  <span className="font-identifier text-[10px]">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">{step.title}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                {step.href ? (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                ) : null}
              </div>
            );

            return step.href ? <Link key={`${step.label}-${step.title}`} to={step.href}>{node}</Link> : <div key={`${step.label}-${step.title}`}>{node}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function HandoffRail({
  from,
  to,
  detail,
  href,
  className,
}: {
  from: string;
  to: string;
  detail: string;
  href: string;
  className?: string;
}) {
  return (
    <div className={cn('surface-solid rounded-lg border border-primary/20 p-3', className)}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
        <div>
          <div className="text-metadata">Current owner</div>
          <div className="mt-1 font-semibold">{from}</div>
        </div>
        <ArrowRight className="hidden size-4 text-primary md:block" />
        <div>
          <div className="text-metadata">Next handoff</div>
          <div className="mt-1 font-semibold">{to}</div>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={href}>Open handoff</Link>
        </Button>
      </div>
    </div>
  );
}

export function EvidenceStack({ items, className }: { items: EvidenceItem[]; className?: string }) {
  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Evidence stack</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => (
          <div key={item.label} className={cn('rounded-lg border p-3', toneClassMap[item.tone || 'muted'])}>
            <div className="text-metadata">{item.label}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{item.value}</div>
            {item.detail ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function GuardrailCard({
  title,
  detail,
  status = 'Watch',
  tone = 'warning',
  action,
  className,
}: {
  title: string;
  detail: ReactNode;
  status?: string;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border', toneClassMap[tone], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-metadata">Guardrail</div>
            <div className="mt-1 font-semibold text-foreground">{title}</div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</div>
          </div>
          <Badge variant={tone === 'danger' ? 'destructive' : tone === 'warning' ? 'warning' : 'outline'}>{status}</Badge>
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function OutcomePreview({
  label = 'Outcome preview',
  value,
  detail,
  tone = 'success',
  className,
}: {
  label?: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border p-4', toneClassMap[tone], className)}>
      <div className="text-metadata">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {detail ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export function ActionSetupPanel({
  title,
  detail,
  actionLabel,
  href,
  className,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  className?: string;
}) {
  return (
    <Card className={cn('border border-primary/20 bg-primary/5', className)}>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="text-metadata">Next operator action</div>
          <div className="mt-1 font-semibold">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <Button asChild size="sm">
          <Link to={href}>
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function RegistryList({ items, className }: { items: RegistryItem[]; className?: string }) {
  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Operating registry</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/65 p-0">
        {items.map((item) => {
          const row = (
            <div className="grid gap-2 px-4 py-3 transition-colors hover:bg-[hsl(var(--surface-row-hover))] md:grid-cols-[120px_minmax(0,1fr)_160px] md:items-center">
              <Badge variant="outline" className="w-fit">{item.label}</Badge>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{item.title}</div>
                {item.detail ? <div className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</div> : null}
              </div>
              <div className="flex items-center justify-between gap-2 md:justify-end">
                {item.meta ? <span className="text-xs text-muted-foreground">{item.meta}</span> : null}
                {item.href ? <ArrowRight className="size-3.5 text-primary" /> : null}
              </div>
            </div>
          );

          return item.href ? <Link key={item.id} to={item.href}>{row}</Link> : <div key={item.id}>{row}</div>;
        })}
      </CardContent>
    </Card>
  );
}
