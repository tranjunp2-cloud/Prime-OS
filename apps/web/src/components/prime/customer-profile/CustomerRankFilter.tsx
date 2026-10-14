import { ChevronDown, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { rankLabels, type RankState } from '@/lib/customer-ranks';
import { RankLabel } from './CustomerRankBadge';

export function CustomerRankFilter({ value, counts, onChange }: { value: string; counts: Partial<Record<RankState, number>>; onChange: (value: string) => void }) {
  const options: RankState[] = ['vip', 'gold', 'silver', 'bronze', 'unranked'];
  if (counts.not_configured || value === 'not_configured') options.push('not_configured');
  const total = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" aria-label={`Filter by rank: ${value === 'all' ? 'All ranks' : rankLabels[value as RankState]}`} className="h-11 w-full justify-between gap-2 font-normal sm:w-auto sm:min-w-48"><Medal className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="text-muted-foreground">Rank:</span>{value === 'all' ? <span>All ranks</span> : <RankLabel rank={value as RankState} />}<ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-60 max-w-[calc(100vw-32px)] p-1.5 motion-reduce:animate-none">
      <DropdownMenuRadioGroup value={value} onValueChange={onChange} aria-label="Filter by rank">
        <DropdownMenuRadioItem value="all" className="min-h-11 cursor-pointer gap-3 data-[state=checked]:bg-primary/10"><span>All ranks</span><span className="ml-auto tabular-nums text-muted-foreground">{total}</span></DropdownMenuRadioItem>
        <DropdownMenuSeparator />
        {options.map(rank => <DropdownMenuRadioItem key={rank} value={rank} textValue={rankLabels[rank]} className="min-h-11 cursor-pointer gap-3 data-[state=checked]:bg-primary/10"><RankLabel rank={rank} /><span className="ml-auto tabular-nums text-muted-foreground">{counts[rank] || 0}</span></DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator /><p className="px-2 py-2 text-xs leading-relaxed text-muted-foreground">Counts match your search and channel filter, across all pages.</p>
    </DropdownMenuContent>
  </DropdownMenu>;
}
