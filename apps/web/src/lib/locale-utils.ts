/**
 * locale-utils.ts
 * Locale validation and resolution utilities for Product Master content.
 *
 * Implements the 4-case attribute locale validation from spec:
 *   1. isLocalizable=false + locale provided → NOT_LOCALIZABLE
 *   2. isLocalizable=true  + no locale      → NO_LOCALE_PROVIDED
 *   3. locale invalid BCP-47               → INVALID_BCP47
 *   4. locale valid but org-disabled       → LOCALE_NOT_ENABLED
 *
 * And the read fallback chain:
 *   exact → underscore-legacy → language-only → en-US
 */

import { getActiveOrgLocales } from './product-catalog-settings-store';
import type { LocalizedProductContent } from './product-store';

// ─── Canonicalize ──────────────────────────────────────────────────────────────

/**
 * Canonicalize a raw locale string.
 * Spec: normalize _ → - first, then pass through Intl.getCanonicalLocales.
 * Never throws — returns normalized string on any failure.
 *
 * Examples:
 *   'en_US' → 'en-US'
 *   'ja_JP' → 'ja-JP'
 *   'EN-us' → 'en-US'
 */
export function canonicalizeLocale(raw: string): string {
  const normalized = raw.replace(/_/g, '-');
  try {
    return Intl.getCanonicalLocales(normalized)[0] ?? normalized;
  } catch {
    return normalized;
  }
}

// ─── Validation ────────────────────────────────────────────────────────────────

export type LocaleValidationError =
  | { code: 'NOT_LOCALIZABLE';    message: string }
  | { code: 'NO_LOCALE_PROVIDED'; message: string }
  | { code: 'INVALID_BCP47';      message: string }
  | { code: 'LOCALE_NOT_ENABLED'; message: string };

/**
 * Validate the 4 locale constraint cases described in spec §5.2.
 *
 * @param attributeKey  - The attribute code shown in error messages.
 * @param isLocalizable - Whether the attribute supports per-locale values.
 * @param locale        - The locale being written, or null if none was provided.
 * @returns             - A typed error object, or null if valid.
 */
export function validateAttributeLocale(
  attributeKey: string,
  isLocalizable: boolean,
  locale: string | null,
): LocaleValidationError | null {
  // Case 1: attribute is NOT localizable but a locale was given
  if (!isLocalizable && locale) {
    return {
      code: 'NOT_LOCALIZABLE',
      message: `"${attributeKey}" is not localizable and cannot receive a locale`,
    };
  }

  // Case 2: attribute IS localizable but no locale was provided
  if (isLocalizable && !locale) {
    return {
      code: 'NO_LOCALE_PROVIDED',
      message: `"${attributeKey}" requires an enabled organization locale`,
    };
  }

  if (locale) {
    // Case 3: locale is not a valid BCP-47 tag
    let isValidBcp47 = true;
    try {
      Intl.getCanonicalLocales(locale);
    } catch {
      isValidBcp47 = false;
    }
    if (!isValidBcp47) {
      return {
        code: 'INVALID_BCP47',
        message: `"${locale}" is not a valid BCP-47 locale`,
      };
    }

    // Case 4: locale is valid BCP-47 but org has not enabled it
    const canonical = canonicalizeLocale(locale);
    const activeLocales = getActiveOrgLocales().map(l => l.locale);
    if (!activeLocales.includes(canonical)) {
      return {
        code: 'LOCALE_NOT_ENABLED',
        message: `"${canonical}" is not enabled for this organization`,
      };
    }
  }

  return null;
}

// ─── Fallback Chain ────────────────────────────────────────────────────────────

/**
 * Resolve a localized field value using the spec fallback chain:
 *   1. Exact match            (e.g. 'ja-JP')
 *   2. Underscore legacy      (e.g. 'ja_JP')
 *   3. Language-only          (e.g. 'ja')
 *   4. Primary locale en-US   (then 'en_US' as last resort)
 *
 * @param content - The product's localized_content map.
 * @param locale  - The desired locale (BCP-47).
 * @param field   - 'name' | 'description' | attributeKey string.
 */
export function resolveLocalizedValue(
  content: Partial<Record<string, LocalizedProductContent>>,
  locale: string,
  field: 'name' | 'description' | string,
): string {
  const get = (loc: string): string | undefined => {
    const entry = content[loc];
    if (!entry) return undefined;
    if (field === 'name') return entry.name?.trim() || undefined;
    if (field === 'description') return entry.description?.trim() || undefined;
    return entry.attributeValues?.[field]?.trim() || undefined;
  };

  // 1. Exact
  const exact = get(locale);
  if (exact) return exact;

  // 2. Underscore legacy (ja-JP → ja_JP)
  const underscored = locale.replace(/-/g, '_');
  const legacy = get(underscored);
  if (legacy) return legacy;

  // 3. Language-only (ja-JP → ja)
  const languageOnly = locale.split('-')[0];
  const langOnlyVal = get(languageOnly);
  if (langOnlyVal) return langOnlyVal;

  // 4. Fallback: en-US then en_US
  return get('en-US') ?? get('en_US') ?? '';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when the given string is a syntactically valid BCP-47 locale.
 * Does NOT check whether the locale is enabled in the org.
 */
export function isValidBcp47(locale: string): boolean {
  try {
    Intl.getCanonicalLocales(locale);
    return true;
  } catch {
    return false;
  }
}
