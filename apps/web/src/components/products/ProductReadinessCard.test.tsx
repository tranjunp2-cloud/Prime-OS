// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductReadinessCard } from './ProductReadinessCard';

afterEach(cleanup);
const checks = [
  ...['identity', 'media', 'content', 'category', 'price', 'shipping'].map(id => ({ id, label: `Complete ${id}`, done: true, workspace: 'Product data' })),
  { id: 'attributes', label: 'Complete required attributes: Material', done: false, workspace: 'Product data' },
];

describe('Shared Product readiness card', () => {
  it.each([false, true])('shows progress and the specific missing detail without an activation instruction (active=%s)', isActive => {
    const onSelectCheck = vi.fn();
    const onViewAll = vi.fn();
    render(<ProductReadinessCard checks={checks} isActive={isActive} onSelectCheck={onSelectCheck} onViewAll={onViewAll} />);
    const card = within(screen.getByRole('region', { name: 'Product readiness' }));
    expect(card.getByText('6/7')).toBeVisible();
    expect(card.getByRole('progressbar', { name: '86% of product requirements complete' })).toHaveAttribute('aria-valuenow', '86');
    expect(card.getAllByRole('listitem')).toHaveLength(1);
    expect(card.queryByText(/activate/i)).not.toBeInTheDocument();
    fireEvent.click(card.getByRole('button', { name: 'Product data Complete required attributes: Material' }));
    expect(onSelectCheck).toHaveBeenCalledWith('attributes');
    fireEvent.click(card.getByRole('button', { name: 'View all readiness checks' }));
    expect(onViewAll).not.toHaveBeenCalled();
    const allChecks = card.getByRole('list', { name: 'All readiness checks' });
    expect(within(allChecks).getAllByRole('listitem')).toHaveLength(7);
    expect(within(allChecks).getAllByText('Complete', { exact: true })).toHaveLength(6);
    expect(within(allChecks).getByText('Needs attention')).toBeVisible();
    expect(card.queryByRole('list', { name: 'Missing readiness checks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps a compact completed card in place and returns to the checklist for missing details', () => {
    const props = { isActive: true, onSelectCheck: vi.fn(), onViewAll: vi.fn() };
    const { rerender } = render(<ProductReadinessCard {...props} checks={checks} />);
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: true }))} />);
    expect(screen.getByRole('region', { name: 'Product readiness' })).toHaveAttribute('data-complete', 'true');
    expect(screen.getByText('Master details complete')).toBeVisible();
    expect(screen.getByText(/Channel readiness is checked separately/)).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View all readiness checks' }));
    const toggle = screen.getByRole('button', { name: 'Hide readiness checks' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const content = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(content).toContainElement(screen.getByRole('list', { name: 'All readiness checks' }));
    expect(screen.getAllByText('Complete', { exact: true })).toHaveLength(7);
    expect(props.onViewAll).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('View all readiness checks');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    rerender(<ProductReadinessCard {...props} checks={checks} />);
    expect(screen.getByText('Complete required attributes: Material')).toBeVisible();
  });
  it('keeps all checks live while expanded and preserves shortcuts without opening a drawer', () => {
    const props = { isActive: false, onSelectCheck: vi.fn(), onViewAll: vi.fn() };
    const { rerender } = render(<ProductReadinessCard {...props} checks={checks} />);
    fireEvent.click(screen.getByRole('button', { name: 'View all readiness checks' }));
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: true }))} />);
    const allChecks = within(screen.getByRole('list', { name: 'All readiness checks' }));
    expect(allChecks.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(allChecks.getAllByText('Complete', { exact: true })).toHaveLength(7);
    fireEvent.click(allChecks.getByRole('button', { name: /Complete required attributes: Material/ }));
    expect(props.onSelectCheck).toHaveBeenCalledWith('attributes');
    expect(props.onViewAll).not.toHaveBeenCalled();
  });
  it('does not render an empty card when there are no requirements', () => {
    render(<ProductReadinessCard checks={[]} isActive={false} onSelectCheck={vi.fn()} onViewAll={vi.fn()} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
  it('shows a compact progress trigger that opens the checks without repeating the checklist', () => {
    const onViewAll = vi.fn();
    const props = { checks, isActive: false, compact: true, onSelectCheck: vi.fn(), onViewAll };
    const { rerender } = render(<ProductReadinessCard {...props} />);
    const trigger = screen.getByRole('button', { name: 'Product readiness: 6 of 7 complete. View checks' });
    expect(trigger).toHaveTextContent('Readiness6/7');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(onViewAll).toHaveBeenCalledOnce();
    expect(props.onSelectCheck).not.toHaveBeenCalled();
    rerender(<ProductReadinessCard {...props} expanded />);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
  it('keeps the compact trigger available after all requirements are complete', () => {
    const props = { isActive: true, compact: true, onSelectCheck: vi.fn(), onViewAll: vi.fn() };
    const { rerender } = render(<ProductReadinessCard {...props} checks={checks} />);
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: false }))} />);
    expect(screen.getByRole('button', { name: 'Product readiness: 0 of 7 complete. View checks' })).toBeVisible();
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: true }))} />);
    expect(screen.getByRole('button', { name: 'Product readiness: 7 of 7 complete. View checks' })).toBeVisible();
  });
});
