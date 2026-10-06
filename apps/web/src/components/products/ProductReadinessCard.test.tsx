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
});
