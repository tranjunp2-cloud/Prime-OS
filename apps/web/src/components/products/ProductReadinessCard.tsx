import { useId } from 'react';
import { ChevronRight, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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
  onViewAll: () => void;
}

/** The same readiness summary and shortcuts in Overview and all editing workspaces. */
export function ProductReadinessCard({ checks, isActive, onSelectCheck, onViewAll }: Props) {
  const titleId = useId();
  const missing = checks.filter(check => !check.done);
  if (!missing.length) return null;
  const complete = checks.length - missing.length;
  const progress = Math.round(complete / checks.length * 100);

  return <Card role="region" aria-labelledby={titleId} className="min-w-0">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <CardTitle id={titleId} className="flex items-center gap-2 text-sm"><CircleAlert className={cn('size-4 shrink-0', isActive ? 'text-amber-500' : 'text-muted-foreground')} aria-hidden="true" />Product readiness</CardTitle>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{complete}/{checks.length}</span>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Complete the missing Master details.</p>
      <Progress value={progress} aria-valuenow={progress} className="mt-3 h-1.5" aria-label={`${progress}% of product requirements complete`} />
    </CardHeader>
    <CardContent className="space-y-3">
      <ul className="space-y-1">{missing.map(check => <li key={check.id}>
        <button type="button" onClick={() => onSelectCheck(check.id)} className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs leading-5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', isActive ? 'bg-amber-400' : 'bg-muted-foreground/60')} aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase tracking-wide text-primary">{check.workspace}</span>{' '}<span className="block break-words">{check.label}</span></span>
          <ChevronRight className="mt-2 size-3.5 shrink-0" aria-hidden="true" />
        </button>
      </li>)}</ul>
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onViewAll}>View all readiness checks</Button>
    </CardContent>
  </Card>;
}
