import { describe, expect, it } from 'vitest';
import { buildBrandAiWorkspaceSnapshot, getBrandAiPackage } from './brand-ai-workspace';

describe('brand ai workspace read model', () => {
  it('builds reusable package metrics from seeded Branding Agent projects', () => {
    const snapshot = buildBrandAiWorkspaceSnapshot();

    expect(snapshot.metrics.activePackages).toBe(snapshot.packages.length);
    expect(snapshot.metrics.averageReadiness).toBeGreaterThan(70);
    expect(snapshot.metrics.reusableContext).toBeGreaterThan(0);
    expect(snapshot.registry.every((item) => item.route.startsWith('/intelligence/branding-agent/'))).toBe(true);
  });

  it('falls back to the primary package for unknown detail routes', () => {
    expect(getBrandAiPackage('missing-brand').id).toBe('venus-beauty');
  });
});
