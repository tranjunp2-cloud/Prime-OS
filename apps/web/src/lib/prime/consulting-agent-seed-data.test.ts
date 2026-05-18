import { describe, expect, it } from 'vitest';
import { buildConsultingAgentSeedData } from './consulting-agent-seed-data';
import { getPrimeSnapshot } from './prime-data';

describe('Consulting Agent seed data', () => {
  it('derives KPI, signals, and launch data from PrimeOS intelligence workspace records', () => {
    const seed = buildConsultingAgentSeedData(getPrimeSnapshot());
    const packageIds = new Set(seed.workspace.packages.map((item) => item.id));

    expect(seed.workspace.packages.length).toBeGreaterThan(0);
    expect(seed.board.cards).toHaveLength(seed.workspace.packages.length);
    expect(seed.launchPackages).toHaveLength(seed.workspace.packages.length);
    expect(seed.kpiCards.length).toBeGreaterThanOrEqual(4);
    expect(seed.kpiCards.every((card) => card.sourcePackageIds.every((id) => packageIds.has(id)))).toBe(true);
  });

  it('keeps Consulting Agent metrics consistent with generated records', () => {
    const seed = buildConsultingAgentSeedData(getPrimeSnapshot());
    const sourceOwners = new Set(seed.board.cards.map((card) => card.sourceOfTruthOwner));
    const averageConfidence = Math.round(seed.workspace.packages.reduce((sum, item) => sum + item.confidence, 0) / seed.workspace.packages.length);

    expect(seed.metrics.packages).toBe(seed.workspace.packages.length);
    expect(seed.metrics.readyForDemand).toBe(seed.workspace.stats.readyForDemand);
    expect(seed.metrics.blocked).toBe(seed.workspace.stats.blocked);
    expect(seed.metrics.sourceOwners).toBe(sourceOwners.size);
    expect(seed.metrics.averageConfidence).toBe(averageConfidence);
  });
});
