// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PrimeClientReportsPage } from './PrimeClientReportsPage';
import { PrimeGrowthOSPage } from './PrimeGrowthOSPage';
import { fallbackGrowthOsSnapshot, fetchGrowthOsSnapshot } from '@/lib/prime/growth-os';
import { defaultHomePath, rememberOverviewDemoMode } from '@/components/seller-onboarding/demo-state';

vi.mock('@/lib/prime/growth-os', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/prime/growth-os')>(),
  fetchGrowthOsSnapshot: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => localStorage.clear());
function Location() {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname}{location.search}</output>;
}
function mount(page: React.ReactNode, url: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><TooltipProvider>{page}</TooltipProvider><Location /></MemoryRouter></QueryClientProvider>);
}

describe('Overview no-data demos', () => {
  it('switches Analytics both ways while preserving other URL parameters', () => {
    mount(<PrimeClientReportsPage />, '/client-reports?source=review');
    expect(screen.getByText('₫4.82B')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'No data' }));
    expect(screen.getByRole('heading', { name: 'No analytics data yet' })).toBeVisible();
    expect(screen.queryByText('₫4.82B')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /trend chart/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Shopee Flagship')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CSV Export/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('source=review&demo=no-data');
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/admin/dashboard?demo=no-data');
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.getByText('₫4.82B')).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/client-reports?source=review');
  });

  it('opens Home directly in no-data mode without fetching the populated snapshot', () => {
    mount(<PrimeGrowthOSPage />, '/admin/dashboard?demo=no-data');
    expect(screen.getByRole('heading', { name: 'Sales setup' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'No data' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'No channels connected' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'View analytics' })).toHaveAttribute('href', '/client-reports?demo=no-data');
    expect(screen.queryByText('HydraGlow Essence 30ml')).not.toBeInTheDocument();
    expect(fetchGrowthOsSnapshot).not.toHaveBeenCalled();
  });
  it('remembers the explicit return to populated data without changing setup progress', () => {
    rememberOverviewDemoMode(true);
    mount(<PrimeClientReportsPage />, '/client-reports');
    expect(screen.getByRole('heading', { name: 'No analytics data yet' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.getByText('₫4.82B')).toBeVisible();
    expect(defaultHomePath()).toBe('/overview');
  });
});

it('opens each Home action in its current business screen with a distinct filter', async () => {
  vi.mocked(fetchGrowthOsSnapshot).mockResolvedValue(fallbackGrowthOsSnapshot);
  mount(<PrimeGrowthOSPage />, '/admin/dashboard');
  const targets = [
    ['Pending Confirmation', '/orders?status=pending'],
    ['Ready to Pack', '/orders?status=ready&orderStage=preparing'],
    ['Delivery Exceptions', '/orders?view=fulfillment&status=shipping&orderStage=failed'],
    ['Returned Orders', '/orders?view=returns&status=returns&orderStage=received'],
    ['Low Stock Items', '/warehouses?stock=low'],
    ['Out of Stock', '/warehouses?stock=empty'],
    ['Unlinked Contacts', '/inbox/guests?linked=unlinked'],
    ['Unassigned Conversations', '/inbox/conversation?assignee=unassigned'],
    ['Switch to PrimeWeb workspace', '/builder/sites'],
    ['Switch to POS workspace', '/pos/register'],
    ['Reconnect', '/sales-channels/connected-channels'],
  ];
  for (const [label, href] of targets) {
    expect(await screen.findByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
  }
});
