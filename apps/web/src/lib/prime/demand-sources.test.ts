import { describe, expect, it } from 'vitest';
import { SOURCE_FUNCTION_CATALOG, buildDemandSources, buildDemandSourcesOverview } from './demand-sources';
import { getPrimeSnapshot } from './prime-data';

describe('Demand Sources read model', () => {
  it('derives a source registry from current PrimeOS snapshot records', () => {
    const snapshot = getPrimeSnapshot();
    const sources = buildDemandSources(snapshot);

    expect(sources.length).toBeGreaterThan(snapshot.socialStreams.length);
    expect(sources.every((source) => source.id && source.name && source.ownerLabel)).toBe(true);
    expect(sources.every((source) => source.qualityScore >= 0 && source.qualityScore <= 100)).toBe(true);
    expect(sources.some((source) => source.type === 'manual')).toBe(true);
    expect(sources.some((source) => source.linkedCampaignIds.length > 0)).toBe(true);
  });

  it('returns overview metrics that stay consistent with the registry', () => {
    const sources = buildDemandSources(getPrimeSnapshot());
    const overview = buildDemandSourcesOverview(sources);

    expect(overview.totalActiveSources).toBe(sources.filter((source) => source.status === 'active').length);
    expect(overview.totalLeads).toBe(sources.reduce((sum, source) => sum + source.leadCount, 0));
    expect(overview.totalRfqs).toBe(sources.reduce((sum, source) => sum + source.rfqCount, 0));
    expect(overview.averageQualityScore).toBeGreaterThan(0);
    expect(overview.topSource?.qualityScore).toBeGreaterThanOrEqual(overview.weakestSource?.qualityScore || 0);
  });

  it('defines the five source functions and their concrete child functions', () => {
    expect(SOURCE_FUNCTION_CATALOG.map((item) => item.id)).toEqual(['marketplace', 'social', 'ads', 'partner', 'manual']);
    expect(SOURCE_FUNCTION_CATALOG.every((item) => item.children.length === 5)).toBe(true);
    expect(SOURCE_FUNCTION_CATALOG.find((item) => item.id === 'marketplace')?.children).toContain('Rakuten');
    expect(SOURCE_FUNCTION_CATALOG.find((item) => item.id === 'manual')?.children).toContain('CSV upload');
  });
});
