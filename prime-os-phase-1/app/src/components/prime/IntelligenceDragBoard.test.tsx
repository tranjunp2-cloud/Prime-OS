// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IntelligenceDragBoard } from './IntelligenceDragBoard';
import { buildIntelligenceBoard, buildIntelligenceWorkspace } from '@/lib/prime/intelligence-workspace';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';

afterEach(() => cleanup());

function buildBoardFixture() {
  return buildIntelligenceBoard(buildIntelligenceWorkspace(getPrimeSnapshot()));
}

describe('IntelligenceDragBoard', () => {
  it('renders lanes and cards with source ownership boundary copy', () => {
    const board = buildBoardFixture();

    render(<IntelligenceDragBoard board={board} />);

    expect(screen.getByTestId('intelligence-drag-board')).toBeTruthy();
    expect(screen.getByText('Signal → decision board')).toBeTruthy();
    expect(screen.getByText(/Source truth remains owned by Demand, Customer, Ecom \/ COS, and Finance/i)).toBeTruthy();
    expect(screen.getByText('Open intelligence work')).toBeTruthy();
    expect(screen.getByText('Boundary protected')).toBeTruthy();
    expect(screen.getByText('Move audit preview')).toBeTruthy();
    board.lanes.forEach((lane) => expect(screen.getByText(lane.label)).toBeTruthy());
    expect(screen.getAllByText('Source truth').length).toBeGreaterThan(0);
  });

  it('moves a card through a drop target callback', () => {
    const board = buildBoardFixture();
    const onMoveCard = vi.fn();
    const sourceCard = board.cards[0];
    const targetLane = board.lanes.find((lane) => lane.id !== sourceCard.laneId) ?? board.lanes[0];

    render(<IntelligenceDragBoard board={board} onMoveCard={onMoveCard} />);

    fireEvent.drop(screen.getByTestId(`intelligence-board-lane-${targetLane.id}`), {
      dataTransfer: { getData: (type: string) => (type === 'text/plain' ? sourceCard.id : '') },
    });

    expect(onMoveCard).toHaveBeenCalledTimes(1);
    expect(onMoveCard).toHaveBeenCalledWith(sourceCard.id, targetLane.id, expect.any(Number));
  });

  it('opens a detail sheet with evidence, source owner, and impact context', async () => {
    const board = buildBoardFixture();
    const sourceCard = board.cards[0];

    render(<IntelligenceDragBoard board={board} />);

    fireEvent.click(screen.getAllByRole('button', { name: /open details/i })[0]);

    expect(await screen.findByTestId('intelligence-board-detail')).toBeTruthy();
    expect(screen.getAllByText(sourceCard.sourceOfTruthOwner).length).toBeGreaterThan(0);
    expect(screen.getByText('Business impact')).toBeTruthy();
    expect(screen.getByText('Evidence and guardrails')).toBeTruthy();
    expect(screen.getByText('Linked source entities')).toBeTruthy();
    expect(screen.getByText('Audit preview')).toBeTruthy();
    expect(screen.getByText(/Board lane is Intelligence triage only/i)).toBeTruthy();
  });

  it('reorders draggable lane tabs locally', () => {
    const board = buildBoardFixture();
    render(<IntelligenceDragBoard board={board} />);

    const orderedBefore = screen.getAllByRole('region', { name: /cards|exceptions/i }).map((region) => region.getAttribute('aria-label'));
    expect(orderedBefore[0]).toContain('Collect');

    fireEvent.drop(screen.getByTestId('intelligence-board-lane-recommend'), {
      dataTransfer: { getData: (type: string) => (type === 'application/x-prime-lane' ? 'collect' : '') },
    });

    const orderedAfter = screen.getAllByRole('region', { name: /cards|exceptions/i }).map((region) => region.getAttribute('aria-label'));
    expect(orderedAfter[0]).toContain('Understand');
    expect(orderedAfter[2]).toContain('Collect');
  });
});
