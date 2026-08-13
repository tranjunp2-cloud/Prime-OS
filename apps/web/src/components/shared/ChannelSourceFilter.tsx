import { Globe2, MessageSquare, ShoppingBag, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChannelSource = 'all' | 'primeweb' | 'pos' | 'shopee' | 'social';

const channelOptions = [
  { id: 'all', label: 'All Channels', icon: Globe2 },
  { id: 'primeweb', label: 'PrimeWeb', icon: Globe2 },
  { id: 'pos', label: 'POS Tân Bình', icon: Store },
  { id: 'shopee', label: 'Shopee', icon: ShoppingBag },
  { id: 'social', label: 'Social Chat', icon: MessageSquare },
] as const;

export function ChannelSourceFilter({ value, onChange, counts }: { value: ChannelSource; onChange: (value: ChannelSource) => void; counts?: Partial<Record<ChannelSource, number>> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Filter by source</div>
      <div className="flex gap-1 overflow-x-auto" role="radiogroup" aria-label="Filter by source channel">
        {channelOptions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              value === id ? 'bg-primary/10 font-semibold text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            {counts?.[id] !== undefined ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">{counts[id]}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
