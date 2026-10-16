import { useId, useState } from 'react';
import { ChevronDown, ChevronRight, CircleAlert, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import styles from './ProductReadinessCard.module.css';

interface ReadinessCheck {
  id: string;
  label: string;
  done: boolean;
  workspace: string;
}

interface Props {
  checks: ReadinessCheck[];
  isActive: boolean;
  onSelectCheck: (id: string) => void;
  /** Opens the separate checklist only from the compact mobile trigger. */
  onViewAll: () => void;
  compact?: boolean;
  expanded?: boolean;
}

/** The same readiness summary and shortcuts in Overview and all editing workspaces. */
export function ProductReadinessCard({ checks, isActive, onSelectCheck, onViewAll, compact = false, expanded = false }: Props) {
  const titleId = useId();
  const [showAll, setShowAll] = useState(false);
  const missing = checks.filter(check => !check.done);
  if (!checks.length) return null;
  const ready = missing.length === 0;
  const StatusIcon = ready ? CircleCheck : CircleAlert;
  const statusColor = ready ? 'text-emerald-700 dark:text-emerald-300' : isActive ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground';
  const complete = checks.length - missing.length;
  const progress = Math.round(complete / checks.length * 100);

  function renderCheck(check: ReadinessCheck, showStatus = false) {
    const CheckIcon = check.done ? CircleCheck : CircleAlert;
    return <li key={check.id}>
      <button type="button" onClick={() => onSelectCheck(check.id)} className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs leading-5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
        {showStatus
          ? <CheckIcon className={cn('mt-0.5 size-4 shrink-0', check.done ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')} aria-hidden="true" />
          : <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', isActive ? 'bg-amber-400' : 'bg-muted-foreground/60')} aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">{check.workspace}</span>{' '}
          <span className="block break-words font-medium text-foreground">{check.label}</span>
          {showStatus && <span className={cn('block text-xs', check.done ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>{check.done ? 'Complete' : 'Needs attention'}</span>}
        </span>
        <ChevronRight className="mt-2 size-3.5 shrink-0" aria-hidden="true" />
      </button>
    </li>;
  }

  if (compact) return <Button type="button" variant="outline" onClick={onViewAll}
    className={styles.compactButton} aria-haspopup="dialog" aria-expanded={expanded}
    aria-label={`Product readiness: ${complete} of ${checks.length} complete. View checks`}>
    <span className="text-xs font-medium">Readiness</span>
    <span className="flex items-center justify-center gap-1.5"><StatusIcon className={cn('size-3.5', statusColor)} aria-hidden="true" /><span className="text-xs font-semibold tabular-nums">{complete}/{checks.length}</span><ChevronRight className="size-3" aria-hidden="true" /></span>
  </Button>;

  return <Card role="region" aria-labelledby={titleId} data-complete={ready} className={cn(styles.root, 'min-w-0')}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <CardTitle id={titleId} className="flex items-center gap-2 text-sm"><StatusIcon className={cn('size-4 shrink-0', statusColor)} aria-hidden="true" />Product readiness</CardTitle>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{complete}/{checks.length}</span>
      </div>
      <p className={cn('text-xs leading-5', ready ? statusColor : 'text-muted-foreground')}>{ready ? 'Master details complete' : 'Complete the missing Master details.'}</p>
      <Progress value={progress} aria-valuenow={progress} className={cn('mt-2 h-1', ready && '[&>div]:bg-emerald-500')} aria-label={`${progress}% of product requirements complete`} />
    </CardHeader>
    <CardContent className="space-y-3">
      {ready && <p className="text-xs leading-5 text-muted-foreground">{isActive ? 'Master is active.' : 'Ready to activate.'} Channel readiness is checked separately.</p>}
      <Collapsible open={showAll} onOpenChange={setShowAll}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="min-h-11 w-full justify-between gap-2 whitespace-normal text-left">
            {showAll ? 'Hide readiness checks' : 'View all readiness checks'}
            <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none', showAll && 'rotate-180')} aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
        {!ready && !showAll && <ul className={cn(styles.checks, 'mt-2')} aria-label="Missing readiness checks">{missing.map(check => renderCheck(check))}</ul>}
        <CollapsibleContent>
          <ul className={cn(styles.checks, 'mt-2 border-t pt-2')} aria-label="All readiness checks">{checks.map(check => renderCheck(check, true))}</ul>
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>;
}
