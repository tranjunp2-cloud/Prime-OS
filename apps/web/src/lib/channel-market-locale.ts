export type MarketLocalePolicy = 'exact' | 'primary_fallback';

export interface ChannelMarketLocale {
  channel: string;
  market: string;
  locale: string;
  localeLabel: string;
  policy: MarketLocalePolicy;
}

export const CHANNEL_MARKET_LOCALES: Record<string, ChannelMarketLocale> = {
  webstore: { channel: 'PrimeWeb', market: 'Vietnam storefront', locale: 'vi-VN', localeLabel: 'Tiếng Việt', policy: 'primary_fallback' },
  pos: { channel: 'PrimePOS', market: 'Vietnam retail', locale: 'vi-VN', localeLabel: 'Tiếng Việt', policy: 'primary_fallback' },
  shopee: { channel: 'Shopee', market: 'Vietnam', locale: 'vi-VN', localeLabel: 'Tiếng Việt', policy: 'exact' },
  lazada: { channel: 'Lazada', market: 'Malaysia', locale: 'ms-MY', localeLabel: 'Bahasa Melayu', policy: 'exact' },
  tiktok: { channel: 'TikTok Shop', market: 'Vietnam', locale: 'vi-VN', localeLabel: 'Tiếng Việt', policy: 'exact' },
  amazon: { channel: 'Amazon', market: 'Japan', locale: 'ja-JP', localeLabel: '日本語', policy: 'exact' },
  rakuten: { channel: 'Rakuten', market: 'Japan', locale: 'ja-JP', localeLabel: '日本語', policy: 'exact' },
  social: { channel: 'Social Inbox', market: 'Organization default', locale: 'en-US', localeLabel: 'English', policy: 'primary_fallback' },
};

export interface MarketLocaleIssue {
  field: 'name' | 'description';
  fieldLabel: string;
  locale: string;
  localeLabel: string;
  market: string;
  message: string;
}

export function getMarketLocaleIssues(
  channelKey: string,
  localizedContent: Record<string, { name?: string; description?: string } | undefined>,
  _channelOverrides?: { title?: string; description?: string },
): MarketLocaleIssue[] {
  const config = CHANNEL_MARKET_LOCALES[channelKey];
  if (!config || config.policy !== 'exact') return [];
  const localized = localizedContent[config.locale];
  const values = {
    name: localized?.name?.trim() || '',
    description: localized?.description?.trim() || '',
  };
  return (['name', 'description'] as const)
    .filter(field => !values[field])
    .map(field => ({
      field,
      fieldLabel: field === 'name' ? 'Product name' : 'Description',
      locale: config.locale,
      localeLabel: config.localeLabel,
      market: config.market,
      message: `Missing required ${field === 'name' ? 'product name' : 'description'} in ${config.locale}`,
    }));
}
