export const DISPLAY_PLACEHOLDER = '—';

export function toOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toDisplayText(value: string | null | undefined, fallback: string = DISPLAY_PLACEHOLDER) {
  return toOptionalText(value) ?? fallback;
}

export function toDisplayDate(value: string | null | undefined, locale: string = 'en-US') {
  if (!value) return DISPLAY_PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DISPLAY_PLACEHOLDER;
  return date.toLocaleDateString(locale);
}

export function toDisplayDateTime(value: string | null | undefined, locale: string = 'en-US') {
  if (!value) return DISPLAY_PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DISPLAY_PLACEHOLDER;
  return date.toLocaleString(locale);
}

export function toDisplayMoney(amount: number | null | undefined, currency: string = 'JPY', locale: string = 'en-US') {
  if (amount == null) return DISPLAY_PLACEHOLDER;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

export function joinText(parts: Array<string | null | undefined>, separator: string = ', ') {
  const values = parts
    .map((part) => toOptionalText(part))
    .filter((part): part is string => Boolean(part));

  return values.length > 0 ? values.join(separator) : null;
}
