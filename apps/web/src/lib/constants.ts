/**
 * constants.ts — Single source of truth for shared UI constants
 * Import from here. Never redefine these in individual components.
 */

// ─── Channels ────────────────────────────────────────────────────────────────────

export const CHANNELS = ['rakuten', 'shopee', 'amazon', 'website', 'tiktok'] as const;
export type Channel = typeof CHANNELS[number];

export const CHANNEL_COLORS: Record<string, string> = {
  rakuten: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
  shopee:  'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300',
  amazon:  'bg-amber-500/16 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
  website: 'bg-muted text-muted-foreground',
  tiktok:  'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950',
};

export const CHANNEL_CONFIG = [
  {
    key: 'rakuten' as const,
    label: 'Rakuten',
    code: 'JP',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    placeholder: 'e.g. RMS-12345678',
  },
  {
    key: 'shopee' as const,
    label: 'Shopee',
    code: 'SG',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    placeholder: 'e.g. 123456789',
  },
  {
    key: 'amazon' as const,
    label: 'Amazon',
    code: 'US',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    placeholder: 'e.g. B0XXXXYYYY',
  },
  {
    key: 'website' as const,
    label: 'Website',
    code: 'WEB',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    placeholder: 'e.g. /products/sku-code',
  },
] as const;

// ─── Product ────────────────────────────────────────────────────────────────────

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  review:    'bg-amber-500/16 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
  published: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  archived:  'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  review:    'In Review',
  published: 'Published',
  archived:  'Archived',
};

export const PRODUCT_TYPE_COLORS: Record<string, string> = {
  single:  'bg-muted text-muted-foreground',
  variant: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  single:  'Single',
  variant: 'Variant',
};

// ─── Fulfillment / OMS ──────────────────────────────────────────────────────────

export const JOB_STATUS_COLORS: Record<string, string> = {
  pending:   'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  picking:   'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  packed:    'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
  shipped:   'bg-teal-500/14 text-teal-700 dark:bg-teal-500/18 dark:text-teal-300',
  done:      'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  cancelled: 'bg-destructive/10 text-destructive',
  exception: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
  observing: 'bg-cyan-500/14 text-cyan-700 dark:bg-cyan-500/18 dark:text-cyan-300',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  picking:   'Picking',
  packed:    'Packed',
  shipped:   'Shipped',
  done:      'Done',
  cancelled: 'Cancelled',
  exception: 'Exception',
  observing: 'Observing',
};

export const CARRIER_COLORS: Record<string, string> = {
  'Japan Post':     'bg-sky-500/10 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300',
  'Sagawa Express': 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300',
  'Yamato Transport': 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/12 dark:text-amber-300',
  'ECMS Express':   'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
};

export const CARRIER_LABELS: Record<string, string> = {
  japan_post:  'Japan Post',
  sagawa:      'Sagawa Express',
  yamato:      'Yamato Transport',
  ecms:        'ECMS Express',
  manual:      'Manual Entry',
};

// ─── Image helper ───────────────────────────────────────────────────────────────

/** Resolve product thumbnail — real local photo if available, else placeholder */
export function getProductImage(productId: string, asin?: string): string {
  return asin ? `/images/products/${asin}/1.jpg` : `https://picsum.photos/seed/${productId}/64/64`;
}
