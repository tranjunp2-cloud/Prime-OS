import { describe, expect, it } from 'vitest';
import { buildIntelligenceBoard, buildIntelligenceWorkspace, moveIntelligenceBoardCard } from './intelligence-workspace';
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
    expect(learned?.feedback).toMatchObject({ actorRole: 'CRM operator', decision: 'sent_to_crm' });
    expect(learned?.actionOutcome).toMatchObject({ sourceOfTruthOwner: 'CRM', readModelOwner: 'Intelligence', outcomeType: 'campaign_created' });
    expect(learned?.actionOutcome?.metrics.map((metric) => metric.owner)).toEqual(expect.arrayContaining(['CRM', 'OMS']));
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

  it('builds an Intelligence-owned board projection without taking source truth ownership', () => {
    const workspace = buildIntelligenceWorkspace(getPrimeSnapshot());
    const board = buildIntelligenceBoard(workspace);

    expect(board).toMatchObject({ id: 'intelligence-area-board', area: 'Intelligence Area', readModelOwner: 'Intelligence' });
    expect(board.lanes.map((lane) => lane.id)).toEqual(['collect', 'understand', 'predict', 'recommend', 'act_automate']);
    expect(board.cards).toHaveLength(workspace.packages.length);
    expect(board.cards.every((card) => card.readModelOwner === 'Intelligence')).toBe(true);
    expect(board.cards.every((card) => card.sourceOfTruthOwner)).toBe(true);
    expect(board.cards.every((card) => card.linkedEntities.length > 0)).toBe(true);
    expect(board.cards.every((card) => card.evidenceIds.length > 0)).toBe(true);
  });

  it('moves board cards with audit events while preserving domain-owned status fields', () => {
    const workspace = buildIntelligenceWorkspace(getPrimeSnapshot());
    const board = buildIntelligenceBoard(workspace);
    const sourceCard = board.cards[0];
    const movedBoard = moveIntelligenceBoardCard(board, {
      id: 'move-001',
      cardId: sourceCard.id,
      toLaneId: 'act_automate',
      toRank: 0,
      actorId: 'operator-001',
      actorRole: 'Intelligence operator',
      reason: 'Ready for owner handoff draft.',
      createdAt: 'now',
      idempotencyKey: 'move-001-key',
      auditId: 'audit-move-001',
    });

    const movedCard = movedBoard.cards.find((card) => card.id === sourceCard.id);

    expect(movedCard).toMatchObject({ laneId: 'act_automate', displayStatus: sourceCard.displayStatus, sourceOfTruthOwner: sourceCard.sourceOfTruthOwner });
    expect(movedBoard.boardRevision).toBe(board.boardRevision + 1);
    expect(movedBoard.auditEvents).toHaveLength(1);
    expect(movedBoard.auditEvents[0]).toMatchObject({
      eventType: 'IntelligenceBoardCardMoved',
      fromLaneId: sourceCard.laneId,
      toLaneId: 'act_automate',
      boardRevisionBefore: board.boardRevision,
      boardRevisionAfter: board.boardRevision + 1,
    });
    expect(movedBoard.auditEvents[0].linkedSourceEntities.length).toBeGreaterThan(0);
  });
});
