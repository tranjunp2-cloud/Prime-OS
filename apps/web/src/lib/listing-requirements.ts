import type { ChannelListing, ListingDraftValues } from './product-store';

/** Supplied by the channel/category schema, not inferred from the Master taxonomy. */
export interface ListingRequirements {
  channel: ChannelListing['channel'];
  category: string;
  revision: string;
  origin: 'provider' | 'prototype';
  fields: Array<{
    key: 'title' | 'description' | 'brand' | 'category' | 'images'
      | `shipping.${keyof NonNullable<ListingDraftValues['shipping']>}`
      | `channel_settings.${keyof NonNullable<ListingDraftValues['channel_settings']>}`;
    label: string;
    kind: 'text' | 'number' | 'images';
    minLength?: number;
    options?: string[];
  }>;
}
export const requirementValue = (values: ListingDraftValues, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, values);

/** An absent/outdated schema is unknown, never evidence of readiness. */
export function checkListingRequirements(channel: ChannelListing['channel'], schema: ListingRequirements | undefined, values: ListingDraftValues) {
  if (!schema || schema.channel !== channel || schema.category !== (values.category ?? '') || !schema.revision) {
    return { state: 'unchecked' as const, missing: [], message: 'Channel requirements not checked' };
  }
  const missing = schema.fields.filter(field => {
    const value = requirementValue(values, field.key);
    if (field.kind === 'images') return !Array.isArray(value) || !value.some(image => typeof image === 'string' && image.trim());
    if (field.kind === 'number') return value == null || !Number.isFinite(Number(value)) || Number(value) <= 0;
    const text = typeof value === 'string' ? value.trim() : '';
    return text.length < (field.minLength ?? 1) || Boolean(field.options && !field.options.includes(text));
  });
  return { state: missing.length ? 'blocked' as const : 'complete' as const, missing,
    message: missing.length ? `Missing: ${missing.map(field => field.label).join(', ')}` : 'Channel fields complete' };
}

export function patchRequirement(values: ListingDraftValues, path: string, value: string | number): ListingDraftValues {
  const [key, nested] = path.split('.');
  if (key === 'channel_settings' || key === 'shipping') return { ...values, [key]: { ...values[key], [nested]: value } };
  return { ...values, [key]: value };
}
