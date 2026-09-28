// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ORG_LOCALES, saveOrgLocaleConfig } from './product-catalog-settings-store';
import { canonicalizeLocale, resolveLocalizedValue, validateAttributeLocale } from './locale-utils';

describe('locale utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    saveOrgLocaleConfig(DEFAULT_ORG_LOCALES);
  });

  it('canonicalizes underscore and mixed-case locale tags', () => {
    expect(canonicalizeLocale('en_US')).toBe('en-US');
    expect(canonicalizeLocale('JA-jp')).toBe('ja-JP');
  });

  it('rejects the four invalid attribute-locale combinations', () => {
    expect(validateAttributeLocale('material', false, 'ja-JP')?.code).toBe('NOT_LOCALIZABLE');
    expect(validateAttributeLocale('care_instructions', true, null)?.code).toBe('NO_LOCALE_PROVIDED');
    expect(validateAttributeLocale('care_instructions', true, 'not_a_locale')?.code).toBe('INVALID_BCP47');
    expect(validateAttributeLocale('care_instructions', true, 'fr-FR')?.code).toBe('LOCALE_NOT_ENABLED');
  });

  it('accepts enabled organization locales', () => {
    expect(validateAttributeLocale('care_instructions', true, 'ja-JP')).toBeNull();
    expect(validateAttributeLocale('care_instructions', true, 'vi-VN')).toBeNull();
  });

  it('resolves exact, legacy, language-only, and primary fallbacks', () => {
    const content = {
      'en-US': { name: 'Notebook', description: 'English description', attributeValues: { care_instructions: 'Keep dry' } },
      ja: { name: 'ノート', description: '', attributeValues: {} },
      vi_VN: { name: 'Sổ tay', description: 'Mô tả', attributeValues: {} },
    };

    expect(resolveLocalizedValue(content, 'vi-VN', 'name')).toBe('Sổ tay');
    expect(resolveLocalizedValue(content, 'ja-JP', 'name')).toBe('ノート');
    expect(resolveLocalizedValue(content, 'ja-JP', 'description')).toBe('English description');
    expect(resolveLocalizedValue(content, 'ja-JP', 'care_instructions')).toBe('Keep dry');
  });
});
