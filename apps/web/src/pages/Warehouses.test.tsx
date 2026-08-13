// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Warehouses from '@/pages/Warehouses';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));

function renderPage(path = '/warehouse/mapping') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Warehouses />
    </MemoryRouter>,
  );
}

describe('Warehouse & Inventory workspace', () => {
  afterEach(cleanup);

  it('renders mapping content without duplicating sidebar navigation', () => {
    renderPage();

    expect(screen.queryByRole('navigation', { name: 'Warehouse operations' })).not.toBeInTheDocument();
    expect(screen.getByText('Channel warehouse mapping')).toBeInTheDocument();
  });

  it('shows detailed stock states and warehouse details', () => {
    renderPage('/warehouse/stock');

    expect(screen.getByText('Available to Promise')).toBeInTheDocument();
    expect(screen.getByText('Damaged / Quarantine')).toBeInTheDocument();
    expect(screen.getByText('Compact Smart Lamp')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'What does Available to Promise mean?' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'What does ATP mean?' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'HCM Central Warehouse' })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Stock breakdown')).toBeInTheDocument();
    expect(screen.getByText('Recent inventory activity')).toBeInTheDocument();
  });

  it('opens the stock transfer workflow from the page header', () => {
    renderPage('/warehouse/transfers');

    fireEvent.click(screen.getByRole('button', { name: 'Transfer Stock' }));
    expect(screen.getByRole('heading', { name: 'Create Stock Transfer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Source Warehouse')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination Warehouse')).toBeInTheDocument();
  });

  it('aligns only numeric adjustment columns to the right', () => {
    renderPage('/warehouse/adjustments');

    expect(screen.getByRole('columnheader', { name: 'Quantity Change' })).toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Reason' })).not.toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Operator & Time' })).not.toHaveClass('text-right');
  });
});
