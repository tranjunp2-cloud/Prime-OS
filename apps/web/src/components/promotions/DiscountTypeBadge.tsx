import { Banknote, Gift, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DiscountType = 'fixed' | 'percentage' | 'buy_x_get_y';

const types = {
  fixed: { label: 'Fixed', icon: Banknote, color: 'bg-teal-500/[0.15] text-teal-700 dark:text-teal-300' },
  percentage: { label: 'Percentage', icon: Percent, color: 'bg-blue-500/[0.15] text-blue-700 dark:text-blue-400' },
  buy_x_get_y: { label: 'Buy X Get Y', icon: Gift, color: 'bg-violet-500/[0.15] text-violet-700 dark:text-violet-300' },
};

export function DiscountTypeBadge({ type }: { type: DiscountType }) {
  const { label, icon: Icon, color } = types[type];
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', color)}>
    <Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}
  </span>;
}
