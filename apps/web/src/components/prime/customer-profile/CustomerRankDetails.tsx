import { ChevronDown } from 'lucide-react';
import { rankCalculationDescription, rankLabels, rankSummary, type RankResult } from '@/lib/customer-ranks';
import { customerMoney } from '@/lib/order-customers';
import { RankLabel } from './CustomerRankBadge';

export function CustomerRankDetails({ rank }: { rank: RankResult }) {
  return <section aria-label="Customer rank" tabIndex={-1} data-customer-rank className="scroll-mt-6 space-y-2 rounded-xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Customer rank</h2><RankLabel rank={rank.key} /></div>
    {rank.key === 'not_configured' ? <p className="text-sm text-muted-foreground">{rankSummary(rank)}</p> : <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><p className="text-xs text-muted-foreground">Qualifying spend</p><p className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{customerMoney(rank.amount, rank.currency)}</p></div>
      <p className="text-xs text-muted-foreground">{rank.key === 'unranked' ? 'No qualifying spend yet.' : rank.next ? `${customerMoney(rank.next.remaining, rank.currency)} more to ${rankLabels[rank.next.key]}.` : 'Highest rank reached.'}</p>
      <details className="group border-t">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">How rank is calculated<ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
        <p className="text-xs leading-relaxed text-muted-foreground">{rankCalculationDescription} {rank.qualifyingOrders} qualifying order(s). Recalculated when orders or profile grouping change.{rank.key === 'unranked' ? ' Pending, cancelled and fully refunded orders do not earn a rank.' : ''}</p>
      </details>
      {rank.excluded.length > 0 && <details className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><summary className="cursor-pointer font-medium">{rank.excluded.length} order(s) need data review</summary><p className="mt-2 text-xs">Excluded from this calculation. Rank may be understated.</p><ul className="mt-2 space-y-2 text-xs">{rank.excluded.map(item => <li key={item.orderId} className="break-words">{item.orderId}: {item.reason}</li>)}</ul></details>}
    </>}
  </section>;
}
