import { describe, expect, it } from 'vitest';
import { buildIntelligenceWorkspace } from './intelligence-workspace';
import { getPrimeSnapshot } from './prime-data';

describe('intelligence workspace Phase 5 contracts', () => {
  it('keeps recommendation evidence tied to source owners instead of Prime AI', () => {
    const workspace = buildIntelligenceWorkspace(getPrimeSnapshot());
    const packages = workspace.packages.filter((item) => item.recommendationEvidence);

    expect(packages.length).toBeGreaterThan(0);
    expect(packages.every((item) => item.recommendationEvidence.confidence > 0)).toBe(true);
    expect(packages.every((item) => item.recommendationEvidence.evidenceItems.every((evidence) => evidence.owner !== 'Intelligence' || evidence.label === 'Market signal'))).toBe(true);
    expect(packages.every((item) => item.recommendationEvidence.confidenceReason.includes('Prime AI is not the source of truth'))).toBe(true);
  });

  it('builds a closed-loop outcome readback owned by execution domains', () => {
    const workspace = buildIntelligenceWorkspace(getPrimeSnapshot());
    const learned = workspace.packages.find((item) => item.actionOutcome);

    expect(learned).toBeTruthy();
    expect(learned?.feedback).toMatchObject({ actorRole: 'Demand operator', decision: 'sent_to_demand' });
    expect(learned?.actionOutcome).toMatchObject({ sourceOfTruthOwner: 'Demand', readModelOwner: 'Intelligence', outcomeType: 'campaign_created' });
    expect(learned?.actionOutcome?.metrics.map((metric) => metric.owner)).toEqual(expect.arrayContaining(['Demand', 'OMS']));
  });

  it('attaches signal lineage with source owner and audit ids to every signal', () => {
    const workspace = buildIntelligenceWorkspace(getPrimeSnapshot());
    const signals = workspace.packages.flatMap((item) => item.linkedSignals);

    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal.sourceOfTruthOwner)).toBe(true);
    expect(signals.every((signal) => signal.readModelOwner === 'Intelligence')).toBe(true);
    expect(signals.every((signal) => signal.lineage.inputs.length > 0)).toBe(true);
    expect(signals.every((signal) => signal.lineage.transforms.some((step) => step.step === 'recommend'))).toBe(true);
    expect(signals.every((signal) => signal.lineage.auditIds.length > 0)).toBe(true);
  });
});
