import { describe, expect, it } from 'vitest';
import { CHANNEL_MARKET_LOCALES, getMarketLocaleIssues } from './channel-market-locale';

describe('channel market locale mapping', () => {
  it('maps marketplace connections to their market locale', () => {
    expect(CHANNEL_MARKET_LOCALES.amazon.locale).toBe('ja-JP');
    expect(CHANNEL_MARKET_LOCALES.shopee.locale).toBe('vi-VN');
    expect(CHANNEL_MARKET_LOCALES.lazada.locale).toBe('ms-MY');
  });

  it('requires exact localized name and description for marketplace listings', () => {
    const issues = getMarketLocaleIssues('lazada', {
      'ms-MY': { name: 'Buku nota', description: '' },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ field: 'description', locale: 'ms-MY', market: 'Malaysia' });
  });

  it('does not treat canonical channel copy as a market translation', () => {
    const issues = getMarketLocaleIssues('amazon', {}, { title: 'English title', description: 'English description' });
    expect(issues.map(issue => issue.field)).toEqual(['name', 'description']);
  });

  it('allows primary fallback for owned surfaces', () => {
    expect(getMarketLocaleIssues('webstore', {})).toEqual([]);
  });
});
