import { ArrowRight, Building2, Clock3, FileCheck2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MyInvoisOrderReadiness } from '@/lib/prime/myinvois';
import { cn } from '@/lib/utils';

function stateClass(state: MyInvoisOrderReadiness['state']) {
  if (state === 'valid') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (state === 'submitted' || state === 'ready_to_submit' || state === 'draft') return 'border-primary/25 bg-primary/10 text-primary';
  if (state === 'cancelled' || state === 'credit_note_required' || state === 'invalid' || state === 'buyer_tin_invalid' || state === 'missing_buyer_tax_profile') {
    return 'border-destructive/25 bg-destructive/10 text-destructive';
  }
  return 'border-border bg-muted text-muted-foreground';
}

function detailRow(label: string, value: string) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function MyInvoisStatusPanel({ readiness }: { readiness: MyInvoisOrderReadiness }) {
  return (
    <Card className="rounded-lg border-border/70">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <ShieldCheck className="size-4" />
              Malaysia MyInvois
              <Badge variant="outline" className={cn('rounded-full', stateClass(readiness.state))}>
                {readiness.stateLabel}
              </Badge>
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{readiness.reason}</p>
          </div>
          <Badge variant="outline" className="rounded-full w-fit">{readiness.scopeLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {detailRow('Mode', readiness.mode.replace(/_/g, ' '))}
          {detailRow('Environment', readiness.environment.replace(/_/g, ' '))}
          {detailRow('Source code', readiness.sourceDocumentCode)}
          {detailRow('Total amount', `${readiness.currency} ${readiness.totalAmount.toLocaleString('en-US')}`)}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileCheck2 className="size-4" />
              Authority trace
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Submission UID</span>
                <span className="font-mono text-xs">{readiness.reference.submissionUid || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">UUID</span>
                <span className="font-mono text-xs">{readiness.reference.documentUuid || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Long ID</span>
                <span className="font-mono text-xs">{readiness.reference.longId || '-'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 className="size-4" />
              Timing
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Validated at</span>
                <span className="text-right text-xs font-mono">{readiness.reference.validatedAt || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Cancel window</span>
                <span className="text-right text-xs font-mono">{readiness.reference.cancellationWindowEndsAt || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Items</span>
                <span className="font-semibold">{readiness.itemCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="size-4" />
            Next action
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{readiness.nextAction}</p>
          {readiness.blockingFields.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {readiness.blockingFields.map((field) => (
                <Badge key={field} variant="outline" className="rounded-full border-destructive/20 bg-destructive/10 text-destructive">
                  <ShieldAlert className="mr-1 size-3" />
                  {field}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 rounded-lg">
            <Link to="/overview?module=connectors">
              Open connector
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Badge variant="outline" className="rounded-full">
            {readiness.notRequired ? 'Not required in this snapshot' : 'Tracked as invoice evidence'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
