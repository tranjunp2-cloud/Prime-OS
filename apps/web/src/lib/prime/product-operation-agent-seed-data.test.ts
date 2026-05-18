import { describe, expect, it } from 'vitest';

import { getPrimeSnapshot } from './prime-data';
import {
  buildOperatingChatResolution,
  buildOperatingCommandResponse,
  buildProductOperationAgentSeedData,
  moveOperatingCard,
  queueOperatingApproval,
  resolveOperatingChatIntent,
  resolveOperatingCommandId,
} from './product-operation-agent-seed-data';

describe('buildProductOperationAgentSeedData', () => {
  it('builds policy-backed operating cards from the Prime snapshot', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());

    expect(seed.lanes.map((lane) => lane.id)).toEqual([
      'signal',
      'triage',
      'decision',
      'in_progress',
      'waiting',
      'done',
      'learning',
    ]);
    expect(seed.cards.length).toBeGreaterThanOrEqual(5);
    expect(new Set(seed.cards.map((card) => card.sourceSuite)).size).toBeGreaterThanOrEqual(4);
    expect(seed.cards.every((card) => card.sourceRoute.startsWith('/'))).toBe(true);
    expect(seed.cards.every((card) => card.evidence.length > 0)).toBe(true);
    expect(seed.cards.every((card) => card.policyChecklist.length > 0)).toBe(true);
    expect(seed.cards.some((card) => card.approvalRequired && card.approvalState === 'pending')).toBe(true);
  });

  it('keeps metrics and proposal statuses consistent with cards', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());

    expect(seed.metrics.totalCards).toBe(seed.cards.length);
    expect(seed.metrics.pendingApprovals).toBe(seed.cards.filter((card) => card.approvalState === 'pending').length);
    expect(seed.metrics.highRisk).toBe(seed.cards.filter((card) => card.severity === 'high').length);
    expect(seed.metrics.suitesCovered).toBe(new Set(seed.cards.map((card) => card.sourceSuite)).size);
    expect(seed.proposals.every((proposal) => proposal.route.startsWith('/'))).toBe(true);
    expect(seed.proposals.some((proposal) => proposal.status === 'needs_approval')).toBe(true);
  });

  it('moves cards with an audit trail entry', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());
    const card = seed.cards[0];
    const moved = moveOperatingCard(seed.cards, card.id, 'done', 'Test operator');
    const movedCard = moved.find((item) => item.id === card.id);

    expect(movedCard?.laneId).toBe('done');
    expect(movedCard?.auditTrail[0]).toContain('Test operator moved card to Done');
  });

  it('resolves natural language commands to deterministic command ids', () => {
    expect(resolveOperatingCommandId('prepare the inventory risk packet')).toBe('risk_packet');
    expect(resolveOperatingCommandId('show waiting and blocked work')).toBe('blocked_work');
    expect(resolveOperatingCommandId('summarize the audit log')).toBe('audit_summary');
    expect(resolveOperatingCommandId('what needs approval today')).toBe('approval_sweep');
  });

  it('classifies real chat prompts without forcing unknown text into approval sweep', () => {
    expect(resolveOperatingChatIntent('hello')).toBe('greeting');
    expect(resolveOperatingChatIntent('xin chào')).toBe('greeting');
    expect(resolveOperatingChatIntent('prepare the inventory risk packet')).toBe('risk_packet');
    expect(resolveOperatingChatIntent('show waiting and blocked work')).toBe('blocked_work');
    expect(resolveOperatingChatIntent('summarize audit changes')).toBe('audit_summary');
    expect(resolveOperatingChatIntent('what needs approval today')).toBe('approval_sweep');
    expect(resolveOperatingChatIntent('tell me something cool')).toBe('clarify');
    expect(resolveOperatingChatIntent('approve all and update source records')).toBe('unsafe_mutation');
    expect(resolveOperatingChatIntent('approve this proposal')).toBe('unsafe_mutation');
  });

  it('builds governed command responses with source evidence and safe actions', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());
    const response = buildOperatingCommandResponse(seed.cards, seed.proposals, 'risk_packet');

    expect(response.focusCardId).toBeTruthy();
    expect(response.evidence.length).toBeGreaterThan(0);
    expect(response.policyChecks.length).toBeGreaterThan(0);
    expect(response.auditImplication).toContain('no');
    expect(response.actions.every((action) => action.route.startsWith('/'))).toBe(true);
    expect(response.actions.map((action) => action.label).join(' ')).not.toMatch(/execute|fix|apply|approve automatically/i);
  });

  it('builds non-command chat responses for greetings, unclear prompts, and unsafe mutations', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());

    const greeting = buildOperatingChatResolution(seed.cards, seed.proposals, 'hello');
    const unclear = buildOperatingChatResolution(seed.cards, seed.proposals, 'tell me something cool');
    const unsafe = buildOperatingChatResolution(seed.cards, seed.proposals, 'approve all and update source records');

    expect(greeting.intent).toBe('greeting');
    expect(greeting.title).not.toContain('approvals need operator attention');
    expect(unclear.intent).toBe('clarify');
    expect(unsafe.intent).toBe('unsafe_mutation');
    expect(unsafe.statusLabel).toBe('Blocked');
    expect(unsafe.auditImplication).toContain('No source system');
  });

  it('queues approval from chat without approving or duplicating queue work', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());
    const response = buildOperatingCommandResponse(seed.cards, seed.proposals, 'approval_sweep');
    const first = queueOperatingApproval(seed.cards, seed.proposals, response, 'Test chat');
    const second = queueOperatingApproval(first.cards, first.proposals, response, 'Test chat');
    const focusCard = first.cards.find((card) => card.id === response.focusCardId);

    expect(first.status).toBe('queued');
    expect(first.proposalId).toBeTruthy();
    expect(first.proposals.filter((proposal) => proposal.cardId === response.focusCardId).length).toBe(seed.proposals.filter((proposal) => proposal.cardId === response.focusCardId).length);
    expect(focusCard?.approvalState).toBe('pending');
    expect(focusCard?.auditTrail[0]).toContain('queued');
    expect(second.proposals.length).toBe(first.proposals.length);
    expect(second.status).toBe('already_queued');
    expect(second.cards.find((card) => card.id === response.focusCardId)?.auditTrail.filter((entry) => entry.includes('queued')).length).toBe(1);
  });

  it('blocks chat queue routing when the existing proposal has a terminal decision', () => {
    const seed = buildProductOperationAgentSeedData(getPrimeSnapshot());
    const response = buildOperatingCommandResponse(seed.cards, seed.proposals, 'approval_sweep');
    const terminalProposals = seed.proposals.map((proposal) => (proposal.id === response.focusProposalId ? { ...proposal, status: 'approved' as const } : proposal));
    const result = queueOperatingApproval(seed.cards, terminalProposals, response, 'Test chat');

    expect(result.status).toBe('blocked');
    expect(result.changed).toBe(false);
    expect(result.cards).toBe(seed.cards);
    expect(result.message).toContain('terminal queue decision');
  });
});
