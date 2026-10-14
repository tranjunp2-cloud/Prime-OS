// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from './AppSidebar';

vi.mock('./SidebarUserFooter', () => ({ SidebarUserFooter: () => null }));
afterEach(cleanup);

it('opens Warehouses directly without the four-item warehouse submenu', () => {
  render(<MemoryRouter initialEntries={['/warehouses']}><TooltipProvider><AppSidebar /></TooltipProvider></MemoryRouter>);
  const link = screen.getByRole('link', { name: 'Warehouses' });
  expect(link).toHaveAttribute('href', '/warehouses');
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('button', { name: 'Warehouses' })).not.toBeInTheDocument();
  for (const label of ['My warehouses', 'Stock Levels', 'Stock Transfers', 'Stock Adjustments']) {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
});

it('opens Sales Channels directly without a submenu', () => {
  render(<MemoryRouter initialEntries={['/sales-channels/connected-channels']}><TooltipProvider><AppSidebar /></TooltipProvider></MemoryRouter>);
  const link = screen.getByRole('link', { name: 'Sales Channels' });
  expect(link).toHaveAttribute('href', '/sales-channels/connected-channels');
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('button', { name: 'Open Sales Channels' })).not.toBeInTheDocument();
  expect(screen.queryByText('Connected Channels')).not.toBeInTheDocument();
  expect(screen.queryByText('Live Commerce')).not.toBeInTheDocument();
  expect(screen.queryByText('Conversation Channels')).not.toBeInTheDocument();
});
