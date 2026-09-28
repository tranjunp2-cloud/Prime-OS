import { Lock, LockOpen, DatabaseZap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldSource = 'pim' | 'rakuten_import' | 'shopee_import' | 'amazon_import' | 'csv_import';

const SOURCE_LABELS: Record<FieldSource, string> = {
  pim: 'Direct PIM',
  rakuten_import: 'Rakuten import',
  shopee_import: 'Shopee import',
  amazon_import: 'Amazon import',
  csv_import: 'CSV import',
};

interface FieldProvenanceBadgeProps {
  source: FieldSource;
  confidence?: number;
  isProtected: boolean;
  onToggleProtect: () => void;
  className?: string;
}

export function FieldProvenanceBadge({
  source,
  confidence,
  isProtected,
  onToggleProtect,
  className,
}: FieldProvenanceBadgeProps) {
  if (source === 'pim' && !isProtected) return null;

  const isImport = source !== 'pim';
  const label = SOURCE_LABELS[source];

  return (
    <div className={cn('mt-1.5 flex items-center gap-1.5', className)}>
      {isProtected ? (
        <span className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors duration-150 motion-reduce:transition-none">
          <Lock className="size-3" />
          Protected from imported updates
        </span>
      ) : (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 motion-reduce:transition-none',
            isImport
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : 'border-border bg-muted/50 text-muted-foreground',
          )}
        >
          {isImport && <DatabaseZap className="size-3" />}
          {'Source: '}{label}{confidence !== undefined ? ' - ' + confidence + '%' : ''}
        </span>
      )}
      <button
        type="button"
        onClick={onToggleProtect}
        aria-label={isProtected ? 'Unlock this field' : 'Lock this field'}
        title={isProtected ? 'Unlock this field' : 'Lock this field'}
        className="rounded p-0.5 text-muted-foreground/60 transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {isProtected ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
      </button>
    </div>
  );
}
