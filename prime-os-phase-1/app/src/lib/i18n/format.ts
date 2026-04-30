import { DEFAULT_LOCALE, type Locale } from './dictionaries';

export function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template,
  );
}

export function getLocalizedCountryName(
  locale: Locale,
  countryCode: string,
  fallback?: string,
): string {
  try {
    const formatter = new Intl.DisplayNames([locale], { type: 'region' });
    return formatter.of(countryCode.toUpperCase()) || fallback || countryCode;
  } catch {
    return fallback || countryCode;
  }
}

export function formatLocalizedDateTime(
  locale: Locale,
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat(locale, options ?? {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options ?? {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

export function formatLocalizedDate(
  locale: Locale,
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat(locale, options ?? {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options ?? {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
}

export function formatLocalizedNumber(
  locale: Locale,
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  if (value == null || Number.isNaN(value)) return '—';

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
  }
}

export function formatLocalizedMoney(
  locale: Locale,
  amount: number | null | undefined,
  currency: string = 'JPY',
  options?: Intl.NumberFormatOptions,
): string {
  if (amount == null || Number.isNaN(amount)) return '—';

  const formatted = formatLocalizedNumber(locale, amount, {
    maximumFractionDigits: 0,
    ...options,
  });

  return `${formatted} ${currency}`;
}
