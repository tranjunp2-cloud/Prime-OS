import type { AlertSeverity } from '@/lib/dashboard/types';

export type SemanticTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'purple'
  | 'teal'
  | 'orange'
  | 'indigo'
  | 'black';

export type StatusDomain =
  | 'product'
  | 'listing'
  | 'warehouse'
  | 'oms'
  | 'oms-lifecycle'
  | 'reservation'
  | 'fulfillment'
  | 'returns'
  | 'inventory'
  | 'shipment'
  | 'partner';

export type SlaState = 'overdue' | 'at_risk' | 'normal' | 'unknown' | 'none';

export interface SemanticMeta {
  label: string;
  className: string;
  tone?: SemanticTone;
}

export interface AlertSeverityMeta extends SemanticMeta {
  description: string;
  borderClassName: string;
  surfaceClassName: string;
  textClassName: string;
}

const TONE_CLASS_NAMES: Record<SemanticTone, string> = {
  success: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  warning: 'bg-amber-500/16 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
  danger: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
  info: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  muted: 'bg-muted text-muted-foreground',
  purple: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
  teal: 'bg-teal-500/14 text-teal-700 dark:bg-teal-500/18 dark:text-teal-300',
  orange: 'bg-orange-500/14 text-orange-800 dark:bg-orange-500/18 dark:text-orange-300',
  indigo: 'bg-indigo-500/14 text-indigo-700 dark:bg-indigo-500/18 dark:text-indigo-300',
  black: 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950',
};

const SURFACE_TONE_CLASS_NAMES: Record<SemanticTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
  warning: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/12 dark:text-amber-300',
  danger: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300',
  info: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300',
  muted: 'bg-muted/70 text-muted-foreground',
  purple: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/12 dark:text-violet-300',
  teal: 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/12 dark:text-teal-300',
  orange: 'bg-orange-500/10 text-orange-800 dark:bg-orange-500/12 dark:text-orange-300',
  indigo: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-300',
  black: 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950',
};

const BORDER_TONE_CLASS_NAMES: Record<SemanticTone, string> = {
  success: 'border-emerald-500/25 dark:border-emerald-400/20',
  warning: 'border-amber-500/28 dark:border-amber-400/24',
  danger: 'border-rose-500/28 dark:border-rose-400/24',
  info: 'border-sky-500/25 dark:border-sky-400/22',
  muted: 'border-border/70',
  purple: 'border-violet-500/25 dark:border-violet-400/22',
  teal: 'border-teal-500/25 dark:border-teal-400/22',
  orange: 'border-orange-500/25 dark:border-orange-400/22',
  indigo: 'border-indigo-500/25 dark:border-indigo-400/22',
  black: 'border-slate-950/15 dark:border-slate-100/15',
};

const TEXT_TONE_CLASS_NAMES: Record<SemanticTone, string> = {
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  info: 'text-sky-700 dark:text-sky-300',
  muted: 'text-muted-foreground',
  purple: 'text-violet-700 dark:text-violet-300',
  teal: 'text-teal-700 dark:text-teal-300',
  orange: 'text-orange-800 dark:text-orange-300',
  indigo: 'text-indigo-700 dark:text-indigo-300',
  black: 'text-foreground',
};

function toneMeta(label: string, tone: SemanticTone): SemanticMeta {
  return {
    label,
    tone,
    className: TONE_CLASS_NAMES[tone],
  };
}

const statusRegistry: Record<StatusDomain, Record<string, SemanticMeta>> = {
  product: {
    draft: toneMeta('Draft', 'muted'),
    review: toneMeta('Review', 'warning'),
    published: toneMeta('Published', 'success'),
    archived: toneMeta('Archived', 'danger'),
  },
  listing: {
    draft: toneMeta('Draft', 'muted'),
    pending: toneMeta('Pending', 'warning'),
    active: toneMeta('Active', 'success'),
    published: toneMeta('Published', 'success'),
    paused: toneMeta('Paused', 'muted'),
    error: toneMeta('Error', 'danger'),
  },
  warehouse: {
    active: toneMeta('Active', 'success'),
    inactive: toneMeta('Inactive', 'muted'),
    syncing: toneMeta('Syncing', 'info'),
  },
  oms: {
    pending: toneMeta('Pending', 'warning'),
    ready_to_ship: toneMeta('Ready to Ship', 'info'),
    shipping: toneMeta('Shipping', 'orange'),
    completed: toneMeta('Completed', 'success'),
    cancelled: toneMeta('Cancelled', 'muted'),
    returned: toneMeta('Returned', 'danger'),
    created: toneMeta('Created', 'muted'),
    confirmed: toneMeta('Confirmed', 'info'),
    allocated: toneMeta('Allocated', 'info'),
    fulfillment_requested: toneMeta('Fulfillment Requested', 'warning'),
    shipped: toneMeta('Shipped', 'orange'),
    delivered: toneMeta('Delivered', 'success'),
    closed: toneMeta('Closed', 'success'),
    exception: toneMeta('Exception', 'danger'),
  },
  'oms-lifecycle': {
    captured: toneMeta('Captured', 'muted'),
    validated: toneMeta('Validated', 'info'),
    allocated: toneMeta('Allocated', 'info'),
    reserved: toneMeta('Reserved', 'indigo'),
    released_to_fulfillment: toneMeta('Released to Fulfillment', 'orange'),
    shipped: toneMeta('Shipped', 'teal'),
    delivered: toneMeta('Delivered', 'success'),
    closed: toneMeta('Closed', 'success'),
    cancelled: toneMeta('Cancelled', 'muted'),
    return_in_progress: toneMeta('Return in Progress', 'danger'),
  },
  reservation: {
    reserved: toneMeta('Reserved', 'purple'),
    released: toneMeta('Released', 'muted'),
    consumed: toneMeta('Consumed', 'success'),
    failed: toneMeta('Failed', 'danger'),
    expired: toneMeta('Expired', 'muted'),
  },
  fulfillment: {
    pending: toneMeta('Pending', 'info'),
    picking: toneMeta('Picking', 'info'),
    packed: toneMeta('Packed', 'purple'),
    shipped: toneMeta('Shipped', 'teal'),
    done: toneMeta('Done', 'success'),
    cancelled: toneMeta('Cancelled', 'muted'),
    exception: toneMeta('Exception', 'danger'),
    observing: toneMeta('Observing', 'info'),
  },
  returns: {
    requested: toneMeta('Requested', 'muted'),
    approved: toneMeta('Approved', 'info'),
    in_transit: toneMeta('In Transit', 'warning'),
    received: toneMeta('Received', 'indigo'),
    qc: toneMeta('QC', 'purple'),
    dispositioned: toneMeta('Dispositioned', 'orange'),
    completed: toneMeta('Completed', 'success'),
    cancelled: toneMeta('Cancelled', 'muted'),
    rejected: toneMeta('Rejected', 'danger'),
  },
  inventory: {
    healthy: toneMeta('Healthy', 'success'),
    low: toneMeta('Low', 'warning'),
    critical: toneMeta('Critical', 'danger'),
  },
  shipment: {
    draft: toneMeta('Draft', 'muted'),
    label_created: toneMeta('Label Created', 'info'),
    shipped: toneMeta('Shipped', 'teal'),
    delivered: toneMeta('Delivered', 'success'),
    failed: toneMeta('Failed', 'danger'),
  },
  partner: {
    active: toneMeta('Active', 'success'),
    inactive: toneMeta('Inactive', 'muted'),
    pending: toneMeta('Pending', 'warning'),
  },
};

const channelRegistry: Record<string, SemanticMeta> = {
  rakuten: toneMeta('Rakuten', 'danger'),
  shopee: toneMeta('Shopee', 'orange'),
  amazon: toneMeta('Amazon', 'warning'),
  website: toneMeta('Website', 'muted'),
  tiktok: toneMeta('TikTok', 'black'),
  manual: toneMeta('Manual', 'muted'),
};

const priorityRegistry: Record<string, SemanticMeta> = {
  critical: toneMeta('Critical', 'danger'),
  express: toneMeta('Express', 'orange'),
  standard: toneMeta('Standard', 'muted'),
  normal: toneMeta('Normal', 'muted'),
};

const slaRegistry: Record<SlaState, SemanticMeta> = {
  overdue: toneMeta('SLA Breached', 'danger'),
  at_risk: toneMeta('SLA At Risk', 'warning'),
  normal: toneMeta('On Track', 'muted'),
  unknown: toneMeta('No SLA', 'muted'),
  none: toneMeta('No SLA', 'muted'),
};

const alertSeverityRegistry: Record<AlertSeverity, AlertSeverityMeta> = {
  CRITICAL: {
    label: 'Critical',
    description: 'Requires immediate action to prevent SLA or data synchronization impact.',
    tone: 'danger',
    className: TONE_CLASS_NAMES.danger,
    borderClassName: BORDER_TONE_CLASS_NAMES.danger,
    surfaceClassName: 'bg-rose-500/8 dark:bg-rose-500/10',
    textClassName: TEXT_TONE_CLASS_NAMES.danger,
  },
  WARNING: {
    label: 'Warning',
    description: 'Review soon to prevent this warning from becoming critical.',
    tone: 'warning',
    className: TONE_CLASS_NAMES.warning,
    borderClassName: BORDER_TONE_CLASS_NAMES.warning,
    surfaceClassName: 'bg-amber-500/8 dark:bg-amber-500/10',
    textClassName: TEXT_TONE_CLASS_NAMES.warning,
  },
  INFO: {
    label: 'Info',
    description: 'Operational information that needs review but does not block the current flow.',
    tone: 'info',
    className: TONE_CLASS_NAMES.info,
    borderClassName: BORDER_TONE_CLASS_NAMES.info,
    surfaceClassName: 'bg-sky-500/8 dark:bg-sky-500/10',
    textClassName: TEXT_TONE_CLASS_NAMES.info,
  },
};

function toTitleLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSemanticToneClassName(tone: SemanticTone) {
  return TONE_CLASS_NAMES[tone];
}

export function getSemanticSurfaceToneClassName(tone: SemanticTone) {
  return SURFACE_TONE_CLASS_NAMES[tone];
}

export function getSemanticBorderToneClassName(tone: SemanticTone) {
  return BORDER_TONE_CLASS_NAMES[tone];
}

export function getSemanticTextToneClassName(tone: SemanticTone) {
  return TEXT_TONE_CLASS_NAMES[tone];
}

export function getStatusMeta(domain: StatusDomain, status: string): SemanticMeta {
  const domainMap = statusRegistry[domain];
  return domainMap?.[status] ?? {
    label: toTitleLabel(status),
    className: TONE_CLASS_NAMES.muted,
    tone: 'muted',
  };
}

export function getChannelMeta(channel: string): SemanticMeta {
  return channelRegistry[channel] ?? {
    label: toTitleLabel(channel),
    className: TONE_CLASS_NAMES.muted,
    tone: 'muted',
  };
}

export function getPriorityMeta(priority: string): SemanticMeta {
  return priorityRegistry[priority] ?? {
    label: toTitleLabel(priority),
    className: TONE_CLASS_NAMES.muted,
    tone: 'muted',
  };
}

export function getSlaMeta(state: SlaState): SemanticMeta {
  return slaRegistry[state] ?? slaRegistry.unknown;
}

export function getAlertSeverityMeta(severity: AlertSeverity): AlertSeverityMeta {
  return alertSeverityRegistry[severity];
}

export function getSlaTextClassName(state: SlaState): string {
  switch (state) {
    case 'overdue':
      return 'font-semibold text-rose-700 dark:text-rose-300';
    case 'at_risk':
      return 'text-amber-700 dark:text-amber-300';
    default:
      return 'text-muted-foreground';
  }
}

export function getActiveFilterPillClassName() {
  return 'border-primary bg-primary/10 text-primary ring-2 ring-primary/70';
}

export function getInactiveFilterPillClassName() {
  return 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground';
}
