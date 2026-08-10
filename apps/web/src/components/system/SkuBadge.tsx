import { cn } from '@/lib/utils';

interface SkuBadgeProps {
  sku: string | null | undefined;
  tone?: 'default' | 'variant';
  size?: 'default' | 'compact';
  className?: string;
}

function splitSkuParts(sku: string) {
  const segments = sku.split('-').filter(Boolean);

  if (segments.length <= 4) {
    return { primary: sku, secondary: null as string | null };
  }

  return {
    primary: segments.slice(0, -1).join('-'),
    secondary: segments.at(-1) ?? null,
  };
}

export function SkuBadge({
  sku,
  tone = 'default',
  size = 'default',
  className,
}: SkuBadgeProps) {
  const value = sku?.trim();

  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const { primary, secondary } = splitSkuParts(value);
  const toneClasses = tone === 'variant'
    ? {
        shell: 'border-sky-500/18 bg-sky-500/8 text-sky-800 dark:border-sky-500/18 dark:bg-sky-500/10 dark:text-sky-100',
        secondary: 'border-sky-500/24 bg-sky-500/14 text-sky-700 dark:text-sky-300',
      }
    : {
        shell: 'border-border/80 bg-background/75 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        secondary: 'border-primary/18 bg-primary/10 text-primary',
      };

  const sizeClasses = size === 'compact'
    ? {
        shell: 'min-w-[116px] max-w-[148px] rounded-lg px-2 py-1.5',
        primary: 'text-[10px] tracking-[0.11em]',
        secondary: 'rounded px-1.5 py-0.5 text-[9px] tracking-[0.16em]',
      }
    : {
        shell: 'min-w-[132px] max-w-[168px] rounded-lg px-2.5 py-2',
        primary: 'text-[11px] tracking-[0.12em]',
        secondary: 'rounded-md px-1.5 py-0.5 text-[10px] tracking-[0.18em]',
      };

  return (
    <div
      title={value}
      className={cn(
        'inline-flex border',
        'transition-colors',
        sizeClasses.shell,
        toneClasses.shell,
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className={cn('truncate font-mono font-medium uppercase leading-none', sizeClasses.primary)}>
          {primary}
        </div>
        {secondary && (
          <div
            className={cn(
              'inline-flex w-fit border font-mono font-semibold uppercase leading-none',
              sizeClasses.secondary,
              toneClasses.secondary,
            )}
          >
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}
