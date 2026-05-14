import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_WORKSPACE_TABS,
  buildCampaignWorkspace,
  normalizeCampaignWorkspaceTab,
} from './campaign-workspace';
import { getPrimeSnapshot, type PrimeSnapshot } from './prime-data';

describe('campaign workspace read model', () => {
  it('builds the six Campaigns workspace tabs', () => {
    expect(CAMPAIGN_WORKSPACE_TABS.map((tab) => tab.id)).toEqual([
      'overview',
      'pipeline',
      'planner',
      'readiness',
      'execution-queue',
      'results',
    ]);
  });

  it('summarizes campaigns into pipeline, readiness, queue, and results rows', () => {
    const workspace = buildCampaignWorkspace(getPrimeSnapshot());

    expect(workspace.campaigns.length).toBeGreaterThan(0);
    expect(workspace.plannerDrafts).toHaveLength(workspace.campaigns.length);
    expect(workspace.results).toHaveLength(workspace.campaigns.length);
    expect(workspace.readinessChecks.length).toBeGreaterThan(workspace.campaigns.length);
    expect(workspace.summary.readiness).toBeGreaterThan(0);
    expect(workspace.summary.queuedActions).toBeGreaterThan(0);
  });

  it('keeps empty campaign snapshots renderable', () => {
    const snapshot = {
      ...getPrimeSnapshot(),
      campaigns: [],
      leads: [],
      rfqs: [],
      forecasts: [],
    } satisfies PrimeSnapshot;

    const workspace = buildCampaignWorkspace(snapshot);

    expect(workspace.selectedCampaignId).toBeNull();
    expect(workspace.summary.activeCampaigns).toBe(0);
    expect(workspace.summary.readiness).toBe(0);
    expect(workspace.executionActions).toEqual([]);
  });

  it('normalizes invalid tab values to overview', () => {
    expect(normalizeCampaignWorkspaceTab('pipeline')).toBe('pipeline');
    expect(normalizeCampaignWorkspaceTab('bad-tab')).toBe('overview');
    expect(normalizeCampaignWorkspaceTab(null)).toBe('overview');
  });
});
