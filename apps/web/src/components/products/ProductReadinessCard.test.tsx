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
    expect(onViewAll).toHaveBeenCalledOnce();
  });
  it('disappears when requirements become complete and returns if a detail becomes missing', () => {
    const props = { isActive: true, onSelectCheck: vi.fn(), onViewAll: vi.fn() };
    const { rerender } = render(<ProductReadinessCard {...props} checks={checks} />);
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: true }))} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    rerender(<ProductReadinessCard {...props} checks={checks} />);
    expect(screen.getByText('Complete required attributes: Material')).toBeVisible();
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
  it('updates compact progress and hides the trigger once all requirements are complete', () => {
    const props = { isActive: true, compact: true, onSelectCheck: vi.fn(), onViewAll: vi.fn() };
    const { rerender } = render(<ProductReadinessCard {...props} checks={checks} />);
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: false }))} />);
    expect(screen.getByRole('button', { name: 'Product readiness: 0 of 7 complete. View checks' })).toBeVisible();
    rerender(<ProductReadinessCard {...props} checks={checks.map(check => ({ ...check, done: true }))} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
