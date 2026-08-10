import { describe, expect, it } from 'vitest';
import { buildCrmDashboardSnapshot } from './crm-dashboard';
import { getPrimeSnapshot, type PrimeSnapshot } from './prime-data';

describe('crm dashboard read model', () => {
  it('summarizes all major CRM functions for the dashboard entry point', () => {
    const dashboard = buildCrmDashboardSnapshot(getPrimeSnapshot());

    expect(dashboard.title).toBe('CRM Dashboard');
    expect(dashboard.functions.map((item) => item.id)).toEqual([
      'mdec',
      'sources',
      'campaigns',
      'content-social',
      'leads-rfqs',
      're-engage',
    ]);
    expect(dashboard.functions.every((item) => item.href.startsWith('/crm'))).toBe(true);
    expect(dashboard.chartData).toHaveLength(dashboard.functions.length);
  });

  it('ranks an inventory guardrail as the first move when high risk stock exists', () => {
    const dashboard = buildCrmDashboardSnapshot(getPrimeSnapshot());

    expect(dashboard.nextMoves[0].severity).toBe('critical');
    expect(dashboard.nextMoves[0].href).toBe('/ecom/cos/inventory-brain');
    expect(dashboard.guardrailCount).toBeGreaterThan(0);
    expect(dashboard.guardrails.some((item) => item.label === 'Stock')).toBe(true);
  });

  it('keeps an empty snapshot renderable', () => {
    const snapshot = {
      ...getPrimeSnapshot(),
      campaigns: [],
      leads: [],
      rfqs: [],
      socialStreams: [],
      activationPlays: [],
      forecasts: [],
      tickets: [],
    } satisfies PrimeSnapshot;

    const dashboard = buildCrmDashboardSnapshot(snapshot);

    expect(dashboard.readiness).toBeGreaterThanOrEqual(35);
    expect(dashboard.nextMoves).toEqual([]);
    expect(dashboard.funnel.map((stage) => stage.value)).toEqual([0, 0, 0, 0, 0]);
    expect(dashboard.functions).toHaveLength(6);
  });
});
