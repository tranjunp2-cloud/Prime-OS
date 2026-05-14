import { describe, expect, it } from 'vitest';
import {
  buildMarketplaceSourceSnapshot,
  getMarketplaceSourcePage,
  getMarketplaceSourcePageHref,
} from './marketplace-source';
import { getPrimeSnapshot, type PrimeSnapshot } from './prime-data';

describe('marketplace source read model', () => {
  it('defaults unknown page state to overview and builds compatible hrefs', () => {
    expect(getMarketplaceSourcePage(null)).toBe('overview');
    expect(getMarketplaceSourcePage('unknown')).toBe('overview');
    expect(getMarketplaceSourcePage('accounts')).toBe('accounts');
    expect(getMarketplaceSourcePageHref('detail', 'source_1')).toBe('/demand/sources?function=marketplace&page=detail&sourceId=source_1');
  });

  it('filters to marketplace sources and aggregates overview metrics', () => {
    const marketplace = buildMarketplaceSourceSnapshot(getPrimeSnapshot());

    expect(marketplace.sources.length).toBeGreaterThan(0);
    expect(marketplace.sources.every((source) => source.type === 'marketplace')).toBe(true);
    expect(marketplace.overview.totalMarketplaceSources).toBe(marketplace.sources.length);
    expect(marketplace.overview.totalMarketplaceLeads).toBeGreaterThan(0);
    expect(marketplace.overview.totalRfqs).toBeGreaterThan(0);
    expect(marketplace.overview.marketplaceSourceQualityScore).toBeGreaterThan(0);
  });

  it('creates accounts, demand signals, inquiry, attribution, and data-health rows', () => {
    const marketplace = buildMarketplaceSourceSnapshot(getPrimeSnapshot(), 'data-health');

    expect(marketplace.accounts.map((account) => account.marketplace)).toEqual([
      'Amazon',
      'Rakuten',
      'Shopee',
      'TikTok Shop',
      'Other marketplaces',
    ]);
    expect(marketplace.demandSignals.length).toBeGreaterThan(marketplace.sources.length);
    expect(marketplace.skuSignals.length).toBeGreaterThan(0);
    expect(marketplace.inquiries.length).toBeGreaterThan(0);
    expect(marketplace.attribution.length).toBe(marketplace.sources.length);
    expect(marketplace.dataHealth.length).toBe(marketplace.accounts.length);
    expect(marketplace.dataHealth.some((item) => item.status !== 'healthy')).toBe(true);
  });

  it('keeps an empty marketplace snapshot renderable', () => {
    const emptySnapshot = {
      ...getPrimeSnapshot(),
      socialStreams: [],
      campaigns: [],
      leads: [],
      rfqs: [],
    } satisfies PrimeSnapshot;
    const marketplace = buildMarketplaceSourceSnapshot(emptySnapshot);

    expect(marketplace.sources).toEqual([]);
    expect(marketplace.overview.totalMarketplaceSources).toBe(0);
    expect(marketplace.overview.topDemandMarketplace).toBe('None');
    expect(marketplace.accounts).toHaveLength(5);
    expect(marketplace.dataHealth).toHaveLength(5);
  });
});
