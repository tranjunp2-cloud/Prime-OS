import type { ReactNode } from 'react';
import { ArrowRight, Clock, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/I18nContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple';

const toneClassMap: Record<Tone, string> = {
  default: 'border-primary/25 bg-primary/10 text-primary',
  success: 'border-emerald-700/25 bg-emerald-50 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-500/12 dark:text-emerald-200',
  warning: 'border-amber-700/25 bg-amber-50 text-amber-900 dark:border-amber-300/25 dark:bg-amber-500/12 dark:text-amber-200',
  danger: 'border-rose-700/25 bg-rose-50 text-rose-800 dark:border-rose-300/25 dark:bg-rose-500/12 dark:text-rose-200',
  info: 'border-sky-700/25 bg-sky-50 text-sky-800 dark:border-sky-300/25 dark:bg-sky-500/12 dark:text-sky-200',
  muted: 'border-border/70 bg-muted/35 text-muted-foreground',
  purple: 'border-primary/25 bg-primary/10 text-primary',
};

function getOperatingCopy(locale: string) {
  const copy = {
    'en-US': {
      decisionReadiness: 'Decision readiness',
      ready: 'Ready',
      watch: 'Watch',
      needsAction: 'Needs action',
      operatingLoop: 'Operating loop',
      loopPath: 'Signal to decision to action to outcome',
      open: 'Open',
      currentOwner: 'Current owner',
      nextHandoff: 'Next handoff',
      openHandoff: 'Open handoff',
      evidenceStack: 'Evidence stack',
      guardrail: 'Guardrail',
      outcomePreview: 'Outcome preview',
      nextOperatorAction: 'Next operator action',
      operatingRegistry: 'Operating registry',
    },
    'ja-JP': {
      decisionReadiness: '判断準備度',
      ready: '準備完了',
      watch: '要監視',
      needsAction: '対応が必要',
      operatingLoop: '運用ループ',
      loopPath: 'シグナルから判断、アクション、成果へ',
      open: '開く',
      currentOwner: '現在の担当',
      nextHandoff: '次の引き渡し',
      openHandoff: '引き渡しを開く',
      evidenceStack: 'エビデンススタック',
      guardrail: 'ガードレール',
      outcomePreview: '成果プレビュー',
      nextOperatorAction: '次のオペレーター操作',
      operatingRegistry: '運用レジストリ',
    },
    'vi-VN': {
      decisionReadiness: 'Mức sẵn sàng quyết định',
      ready: 'Sẵn sàng',
      watch: 'Cần theo dõi',
      needsAction: 'Cần xử lý',
      operatingLoop: 'Vòng vận hành',
      loopPath: 'Tín hiệu đến quyết định đến hành động đến kết quả',
      open: 'Mở',
      currentOwner: 'Chủ sở hữu hiện tại',
      nextHandoff: 'Bàn giao tiếp theo',
      openHandoff: 'Mở bàn giao',
      evidenceStack: 'Ngăn bằng chứng',
      guardrail: 'Rào chắn vận hành',
      outcomePreview: 'Xem trước kết quả',
      nextOperatorAction: 'Hành động tiếp theo',
      operatingRegistry: 'Sổ vận hành',
    },
  } as const;

  return copy[locale as keyof typeof copy] ?? copy['en-US'];
}

function localizeStatus(status: string | undefined, copy: ReturnType<typeof getOperatingCopy>) {
  if (!status) return status;
  if (status === 'Ready') return copy.ready;
  if (status === 'Watch') return copy.watch;
  if (status === 'Needs action') return copy.needsAction;
  return status;
}

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
            <span className="text-current">{entity.label}</span>
            <IdentifierText className="text-current">{entity.value}</IdentifierText>
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
  variant = 'default',
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  confidence?: number;
  status?: string;
  actions?: ReactNode;
  evidence?: EvidenceItem[];
  variant?: 'default' | 'compact';
  className?: string;
}) {
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);
  const confidenceValue = confidence ?? 72;
  const confidenceBadge = confidenceValue >= 75 ? copy.ready : copy.watch;
  const displayStatus = localizeStatus(status, copy);

  if (variant === 'compact') {
    return (
      <section data-testid="prime-tower-hero" className={cn('surface-solid overflow-hidden rounded-lg border border-primary/20', className)}>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-start lg:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{eyebrow}</Badge>
              {displayStatus ? <Badge>{displayStatus}</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">{title}</h1>
            <div className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">{description}</div>
            {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
          </div>

          <div className="rounded-lg border border-border/70 bg-[hsl(var(--surface-control))] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-metadata">{copy.decisionReadiness}</div>
                <div className="mt-1 text-3xl font-semibold tracking-normal">{confidenceValue}%</div>
              </div>
              <Badge variant={confidenceValue >= 75 ? 'default' : 'warning'}>{confidenceBadge}</Badge>
            </div>
            <Progress value={confidenceValue} className="mt-3 h-1.5" />
          </div>
        </div>

        {evidence?.length ? (
          <div className="grid gap-2 border-t border-border/70 p-4 pt-3 sm:grid-cols-3 lg:p-5 lg:pt-3">
            {evidence.slice(0, 3).map((item) => (
              <div key={item.label} className="rounded-md border border-border/60 bg-background/55 p-3">
                <div className="text-metadata">{item.label}</div>
                <div className="mt-1 text-sm font-semibold">{item.value}</div>
                {item.detail ? <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.detail}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section data-testid="prime-decision-header" className={cn('surface-solid overflow-hidden rounded-lg border border-primary/20', className)}>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{eyebrow}</Badge>
            {displayStatus ? <Badge>{displayStatus}</Badge> : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">{title}</h2>
          <div className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">{description}</div>
          {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="rounded-lg border border-border/70 bg-[hsl(var(--surface-control))] p-4">
          <div className="text-metadata">{copy.decisionReadiness}</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-4xl font-semibold tracking-normal">{confidenceValue}%</div>
            <Badge variant={confidenceValue >= 75 ? 'default' : 'warning'}>{confidenceBadge}</Badge>
          </div>
          <Progress value={confidenceValue} className="mt-3 h-1.5" />
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
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{copy.operatingLoop}</CardTitle>
          <Badge variant="outline">{copy.loopPath}</Badge>
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
                    {copy.open}
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
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <div className={cn('surface-solid rounded-lg border border-primary/20 p-3', className)}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
        <div>
          <div className="text-metadata">{copy.currentOwner}</div>
          <div className="mt-1 font-semibold">{from}</div>
        </div>
        <ArrowRight className="hidden size-4 text-primary md:block" />
        <div>
          <div className="text-metadata">{copy.nextHandoff}</div>
          <div className="mt-1 font-semibold">{to}</div>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={href}>{copy.openHandoff}</Link>
        </Button>
      </div>
    </div>
  );
}

export function EvidenceStack({ items, className }: { items: EvidenceItem[]; className?: string }) {
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{copy.evidenceStack}</CardTitle>
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
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <Card className={cn('border', toneClassMap[tone], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-metadata">{copy.guardrail}</div>
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
  label,
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
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <div className={cn('rounded-lg border p-4', toneClassMap[tone], className)}>
      <div className="text-metadata">{label ?? copy.outcomePreview}</div>
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
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <Card className={cn('border border-primary/20 bg-primary/5', className)}>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="text-metadata">{copy.nextOperatorAction}</div>
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
  const { locale } = useI18n();
  const copy = getOperatingCopy(locale);

  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{copy.operatingRegistry}</CardTitle>
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
