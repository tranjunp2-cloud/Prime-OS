import { buildIntelligenceBoard, buildIntelligenceWorkspace, type DecisionPackage, type IntelligenceBoardSnapshot, type IntelligenceWorkspaceSnapshot } from './intelligence-workspace';
import { getPrimeSnapshot, type PrimeSnapshot } from './prime-data';

export type ConsultingAgentTabId = 'kpi' | 'signals' | 'launch';
export type ConsultingKpiLaneId = 'monitor' | 'review' | 'ready' | 'blocked';

export type ConsultingKpiCard = {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  laneId: ConsultingKpiLaneId;
  sourcePackageIds: string[];
  sourceOwnerIds: string[];
};

export type ConsultingAgentSeedData = {
  workspace: IntelligenceWorkspaceSnapshot;
  board: IntelligenceBoardSnapshot;
  kpiCards: ConsultingKpiCard[];
  launchPackages: DecisionPackage[];
  metrics: {
    packages: number;
    readyForCrm: number;
    blocked: number;
    sourceOwners: number;
    averageConfidence: number;
  };
};

const sourceOwnersFromBoard = (board: IntelligenceBoardSnapshot) => Array.from(new Set(board.cards.map((card) => card.sourceOfTruthOwner)));

export function buildConsultingAgentSeedData(snapshot: PrimeSnapshot): ConsultingAgentSeedData {
  const workspace = buildIntelligenceWorkspace(snapshot);
  const board = buildIntelligenceBoard(workspace);
  const sourceOwners = sourceOwnersFromBoard(board);
  const highRiskCards = board.cards.filter((card) => card.exceptionLevel === 'high');
  const averageConfidence = Math.round(workspace.packages.reduce((sum, item) => sum + item.confidence, 0) / Math.max(workspace.packages.length, 1));
  const packageIds = workspace.packages.map((item) => item.id);

  const kpiCards: ConsultingKpiCard[] = [
    {
      id: 'consulting-kpi-decision-readiness',
      title: 'Decision readiness',
      value: `${averageConfidence}%`,
      detail: 'Average confidence across consulting packages.',
      tone: 'blue',
      laneId: 'monitor',
      sourcePackageIds: packageIds,
      sourceOwnerIds: sourceOwners,
    },
    {
      id: 'consulting-kpi-source-owners',
      title: 'Source owners',
      value: String(sourceOwners.length).padStart(2, '0'),
      detail: 'CRM, Customer, COS, Finance boundaries protected.',
      tone: 'purple',
      laneId: 'monitor',
      sourcePackageIds: packageIds,
      sourceOwnerIds: sourceOwners,
    },
    {
      id: 'consulting-kpi-needs-review',
      title: 'Needs review',
      value: String(workspace.stats.needsReview).padStart(2, '0'),
      detail: 'Packages waiting for operator validation.',
      tone: 'amber',
      laneId: 'review',
      sourcePackageIds: workspace.packages.filter((item) => item.status === 'review_needed').map((item) => item.id),
      sourceOwnerIds: sourceOwners,
    },
    {
      id: 'consulting-kpi-high-risk',
      title: 'High-risk signals',
      value: String(highRiskCards.length).padStart(2, '0'),
      detail: 'Guardrails blocking automated handoff.',
      tone: 'red',
      laneId: highRiskCards.length ? 'blocked' : 'monitor',
      sourcePackageIds: highRiskCards.map((card) => card.packageId),
      sourceOwnerIds: Array.from(new Set(highRiskCards.map((card) => card.sourceOfTruthOwner))),
    },
    {
      id: 'consulting-kpi-ready-demand',
      title: 'Ready for CRM',
      value: String(workspace.stats.readyForCrm).padStart(2, '0'),
      detail: 'Evidence can be sent to owning tower.',
      tone: 'green',
      laneId: 'ready',
      sourcePackageIds: workspace.packages.filter((item) => item.status === 'ready_for_crm').map((item) => item.id),
      sourceOwnerIds: sourceOwners,
    },
    {
      id: 'consulting-kpi-learned-outcomes',
      title: 'Outcome learned',
      value: String(workspace.stats.learned).padStart(2, '0'),
      detail: 'Readback loops attached to recommendations.',
      tone: 'green',
      laneId: 'ready',
      sourcePackageIds: workspace.packages.filter((item) => item.status === 'outcome_learned').map((item) => item.id),
      sourceOwnerIds: sourceOwners,
    },
  ];

  return {
    workspace,
    board,
    kpiCards,
    launchPackages: workspace.packages,
    metrics: {
      packages: workspace.packages.length,
      readyForCrm: workspace.stats.readyForCrm,
      blocked: workspace.stats.blocked,
      sourceOwners: sourceOwners.length,
      averageConfidence,
    },
  };
}

export const consultingAgentSeedData = buildConsultingAgentSeedData(getPrimeSnapshot());
