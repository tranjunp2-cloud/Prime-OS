// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PlanBillingPage from './PlanBillingPage';

function renderPage(route = '/billing') {
  return render(<MemoryRouter initialEntries={[route]}><PlanBillingPage /></MemoryRouter>);
}

afterEach(cleanup);

describe('Plan & Billing', () => {
  it('renders the current subscription overview', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Plan & Billing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prime OS Pro' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active');
  });

  it('opens plan comparison from the plans tab', () => {
    renderPage('/billing?tab=plans');
    fireEvent.click(screen.getByRole('button', { name: /compare all features/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /compare all plan features/i })).toBeInTheDocument();
  });

  it('submits a downgrade and shows it in request history', () => {
    renderPage('/billing?tab=plans');
    const downgradeButtons = screen.getAllByRole('button', { name: 'Downgrade' });
    fireEvent.click(downgradeButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    expect(screen.getByRole('tab', { name: /request history/i })).toHaveAttribute('data-state', 'active');
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });
});
