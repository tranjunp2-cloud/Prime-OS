import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getChannelMeta } from '@/components/system/semantic-helpers';
import { ChannelMark } from '@/components/system/ChannelBrand';

interface ChannelBadgeProps {
  platform?: string;
  channel?: string;
  className?: string;
}

export function ChannelBadge({ platform, channel, className }: ChannelBadgeProps) {
  const value = platform ?? channel ?? 'unknown';
  const meta = getChannelMeta(value);
  const brandClasses = {
    amazon: 'border-amber-500/24 bg-amber-500/8 text-foreground dark:bg-amber-500/10',
    shopee: 'border-orange-500/28 bg-orange-500/10 text-foreground dark:bg-orange-500/12',
    rakuten: 'border-rose-500/28 bg-rose-500/10 text-foreground dark:bg-rose-500/12',
    website: 'border-border/70 bg-muted/60 text-foreground',
    tiktok: 'border-slate-900/15 bg-slate-950 text-white dark:border-slate-100/10 dark:bg-slate-100 dark:text-slate-950',
    manual: 'border-border/70 bg-muted/60 text-muted-foreground',
  } as const;
  const toneClassName = brandClasses[(value in brandClasses ? value : 'manual') as keyof typeof brandClasses];

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        toneClassName,
        className,
      )}
    >
      <ChannelMark channel={value} className="shrink-0" />
      <span>{meta.label}</span>
    </Badge>
  );
}
