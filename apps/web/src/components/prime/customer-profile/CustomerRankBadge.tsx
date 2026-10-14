import { AlertTriangle, Medal, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { rankLabels, rankSummary, type RankResult, type RankState } from '@/lib/customer-ranks';

const colors: Record<RankState, string> = {
  not_configured: 'border-border bg-muted/50 text-muted-foreground',
  unranked: 'border-border bg-muted text-muted-foreground',
  bronze: 'border-orange-600/25 bg-orange-500/10 text-orange-800 dark:text-orange-300',
  silver: 'border-slate-500/30 bg-slate-500/10 text-foreground',
  gold: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  vip: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

export function RankLabel({ rank }: { rank: RankState }) {
  const Icon = rank === 'vip' ? Star : Medal;
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium', colors[rank])}>
    {!['not_configured', 'unranked'].includes(rank) && <Icon className="size-3.5" aria-hidden="true" />}{rankLabels[rank]}
  </span>;
}

export function CustomerRankBadge({ rank, name, onClick }: { rank: RankResult; name: string; onClick: () => void }) {
  return <TooltipProvider delayDuration={150}><Tooltip>
    <TooltipTrigger asChild><button type="button" onClick={onClick} aria-label={`View ${name}'s rank: ${rankLabels[rank.key]}`} className="inline-flex min-h-11 items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <RankLabel rank={rank.key} />{rank.excluded.length > 0 && <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" aria-label="Some orders need data review" />}
    </button></TooltipTrigger>
    <TooltipContent className="max-w-72 leading-relaxed motion-reduce:animate-none">{rankSummary(rank)}</TooltipContent>
  </Tooltip></TooltipProvider>;
}
