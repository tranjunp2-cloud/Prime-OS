import { isSlaAtRisk, isSlaBreached } from '@/lib/sla-policy-types';

export type FulfillmentSlaState = 'none' | 'overdue' | 'at_risk' | 'normal';

const DEFAULT_AT_RISK_HOURS = 4;

export function getFulfillmentSlaState(
  deadline: string | Date | null | undefined,
  atRiskHours = DEFAULT_AT_RISK_HOURS,
): FulfillmentSlaState {
  if (!deadline) return 'none';
  if (isSlaBreached(deadline)) return 'overdue';
  if (isSlaAtRisk(deadline, atRiskHours)) return 'at_risk';
  return 'normal';
}

export function getFulfillmentSlaTextClassName(state: FulfillmentSlaState): string {
  switch (state) {
    case 'overdue':
      return 'font-semibold text-rose-700 dark:text-rose-300';
    case 'at_risk':
      return 'text-amber-700 dark:text-amber-300';
    default:
      return 'text-muted-foreground';
  }
}

export function formatFulfillmentDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isDateToday(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toDateString() === new Date().toDateString();
}
