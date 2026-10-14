// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import SellerOnboardingDemo from './SellerOnboardingDemo';
import { defaultHomePath, freshSellerDemo, readSellerDemo, SELLER_DEMO_KEY } from '@/components/seller-onboarding/demo-state';
import { PrimeGrowthOSPage } from './prime/PrimeGrowthOSPage';
import { fetchGrowthOsSnapshot } from '@/lib/prime/growth-os';

vi.mock('@/lib/prime/growth-os', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/prime/growth-os')>(),
  fetchGrowthOsSnapshot: vi.fn(),
}));
function CurrentRoute() {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname}{location.search}</output>;
}
const mount = (returnTo?: string, url = '/demo/no-data') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[{ pathname: url.split('?')[0], search: url.includes('?') ? `?${url.split('?')[1]}` : '', state: { returnTo } }]}>
      <TooltipProvider><Routes>
        <Route path="/demo/no-data" element={<SellerOnboardingDemo />} />
        <Route path="/admin/dashboard" element={<PrimeGrowthOSPage />} />
      </Routes><CurrentRoute /></TooltipProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const setupOption = (name: string) => {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Sales setup options' }), { key: 'Enter' });
  return screen.getByRole('menuitem', { name });
};
const fill = (label: string, value: string) => fireEvent.change(screen.getByRole('textbox', { name: label, exact: true }), { target: { value } });

describe('Seller first-time demo', () => {
  it('validates, completes all five steps and keeps the workspace empty', () => {
    mount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: /Welcome to/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to workspace with data' })).toHaveAttribute('href', '/overview');
    click('Continue');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a workspace name');
    fill('Workspace name', 'Review store');
    click('Continue');
    fireEvent.click(screen.getByLabelText('Shopee'));
    click('Continue');
    expect(screen.getByRole('alert')).toHaveTextContent('Connect each selected channel');
    click('Connect demo store');
    click('Continue');
    fill('Selling name', 'Review seller');
    fill('Contact email', 'review@example.com');
    click('Continue');
    fill('Stock location name', 'Main warehouse');
    fill('Address', 'Demo address');
    click('Continue');
    click('Open workspace');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/admin/dashboard?demo=no-data');
    expect(screen.getByRole('heading', { name: 'Home: Omnichannel Overview' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Sales setup' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'No data', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Operations Pipeline' })).toHaveTextContent('No activity yet');
    expect(screen.queryByText('HydraGlow Essence 30ml')).not.toBeInTheDocument();
    expect(fetchGrowthOsSnapshot).not.toHaveBeenCalled();
    expect(readSellerDemo().completed).toHaveLength(5);
    fireEvent.click(setupOption('Review workspace details'));
    expect(screen.getByRole('heading', { name: 'Start your catalog' })).toBeVisible();
    expect(readSellerDemo().name).toBe('Review store');
  });
  it('resumes after a remount and resets only its own storage', () => {
    localStorage.setItem('existing-product-data', 'unchanged');
    const first = mount();
    fill('Workspace name', 'Saved workspace');
    click('Continue');
    first.unmount();
    mount();
    expect(screen.getByRole('heading', { name: 'Where do you sell?' })).toBeVisible();
    click('Go to workspace');
    fireEvent.click(setupOption('Continue workspace details'));
    expect(screen.getByRole('heading', { name: 'Where do you sell?' })).toBeVisible();
    click('Restart demo');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restart demo' }));
    expect(screen.getByRole('textbox', { name: 'Workspace name' })).toHaveValue('');
    expect(localStorage.getItem('existing-product-data')).toBe('unchanged');
  });
  it('invalidates a completed step when required fields are cleared', () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Shop', completed: [0] }));
    mount();
    fill('Workspace name', '');
    click('Go to workspace');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a workspace name');
    expect(readSellerDemo().completed).not.toContain(0);
    expect(screen.getByRole('heading', { name: 'Confirm your workspace' })).toBeVisible();
  });
  it('recovers safely from invalid saved progress', () => {
    localStorage.setItem(SELLER_DEMO_KEY, '{broken');
    expect(readSellerDemo()).toEqual(freshSellerDemo());
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), step: 12 }));
    expect(readSellerDemo()).toEqual(freshSellerDemo());
  });
  it.each(['later', 'manual', 'channel'])('opens the empty Home for the %s catalog choice', (catalog) => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Shop', completed: [0], step: 4, catalog, connected: ['Shopee'] }));
    mount();
    click('Open workspace');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/admin/dashboard?demo=no-data');
    expect(screen.getByRole('heading', { name: 'Sales setup' })).toBeVisible();
    expect(fetchGrowthOsSnapshot).not.toHaveBeenCalled();
    expect(readSellerDemo().catalog).toBe(catalog);
  });
  it('returns to populated data when opened from the empty Home', () => {
    mount('/admin/dashboard?demo=no-data&source=review');
    expect(screen.getByRole('link', { name: 'Back to workspace with data' })).toHaveAttribute('href', '/admin/dashboard?source=review');
  });
  it('requires only a valid workspace to enter Home and keeps the remaining steps deferred', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Set up later' })).not.toBeInTheDocument();
    click('Go to workspace');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a workspace name');
    fireEvent.click(screen.getByRole('button', { name: /Your catalog/ }));
    expect(screen.getByRole('heading', { name: 'Confirm your workspace' })).toBeVisible();
    fill('Workspace name', 'Minimal workspace');
    click('Go to workspace');
    expect(screen.getByRole('heading', { name: 'Sales setup' })).toBeVisible();
    expect(readSellerDemo().completed).toEqual([0]);
    expect(readSellerDemo().deferred).toEqual([1, 2, 3, 4]);
    expect(defaultHomePath()).toBe('/admin/dashboard?demo=no-data');
    expect(setupOption('Continue workspace details')).toHaveAttribute('href', '/demo/no-data?step=2');
  });
  it('defers a step without validation or completion and resumes the first missing step from Home', () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Shop', step: 1, completed: [0, 2, 3], business: 'Shop', email: 'seller@example.com', warehouse: 'Main', address: 'Demo address' }));
    const first = mount();
    fireEvent.click(screen.getByLabelText('Shopee'));
    click('Set up later');
    expect(screen.getByRole('heading', { name: 'Set up your selling profile' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const deferredStep = screen.getByRole('button', { name: /Markets & channels.*Set up later/ });
    expect(within(deferredStep).queryByLabelText('Completed')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    first.unmount();
    mount();
    expect(screen.getByRole('button', { name: /Markets & channels.*Set up later/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Your catalog/ }));
    click('Open workspace');
    expect(screen.getByRole('heading', { name: 'Sales setup' })).toBeVisible();
    fireEvent.click(setupOption('Continue workspace details'));
    expect(screen.getByRole('heading', { name: 'Where do you sell?' })).toBeVisible();
    expect(screen.getByLabelText('Shopee')).toBeChecked();
    click('Connect demo store');
    click('Continue');
    expect(readSellerDemo().deferred).toEqual([]);
    expect(readSellerDemo().completed).toHaveLength(5);
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/demo/no-data?step=3');
  });
  it.each([2, 3, 4])('allows deferring optional step %i with missing or invalid details', (step) => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Shop', step, completed: [0], email: 'invalid', catalog: 'channel' }));
    mount();
    click('Set up later');
    expect(readSellerDemo().completed).toEqual([0]);
    expect(readSellerDemo().deferred).toContain(step);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    if (step === 4) expect(screen.getByLabelText('Current URL')).toHaveTextContent('/admin/dashboard?demo=no-data');
    else expect(readSellerDemo().step).toBe(step + 1);
  });
  it('returns to empty Home after a new visit without reopening onboarding', () => {
    const first = mount();
    fill('Workspace name', 'Returning seller');
    click('Go to workspace');
    first.unmount();
    mount(undefined, '/admin/dashboard');
    expect(screen.getByRole('heading', { name: 'Home: Omnichannel Overview' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Sales setup' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Confirm your workspace' })).not.toBeInTheDocument();
    expect(fetchGrowthOsSnapshot).not.toHaveBeenCalled();
  });
  it('preserves older progress and upgrades it without inventing deferred or completed steps', () => {
    const { deferred: _deferred, ...legacy } = freshSellerDemo();
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...legacy, name: 'Existing seller', completed: [0, 2, 3, 4], step: 4 }));
    mount(undefined, '/demo/no-data?step=2');
    expect(screen.getByRole('heading', { name: 'Where do you sell?' })).toBeVisible();
    expect(readSellerDemo().completed).toEqual([0, 2, 3, 4]);
    expect(readSellerDemo().deferred).toEqual([]);
  });
  it('searches, saves and removes additional markets while allowing setup later', () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Global seller', step: 1, completed: [0, 1], currency: 'USD' }));
    const first = mount();
    click('Additional markets');
    expect(screen.getByRole('checkbox', { name: 'Vietnam', exact: true })).toBeDisabled();
    fill('Search markets', 'unlisted market');
    expect(screen.getByText('No markets found. Try another country name.')).toBeVisible();
    fill('Search markets', 'jp');
    expect(screen.queryByRole('checkbox', { name: 'Singapore', exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Japan', exact: true }));
    fill('Search markets', '');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Singapore', exact: true }));
    click('Done');
    expect(screen.queryByRole('textbox', { name: 'Search markets' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeVisible();
    expect(readSellerDemo()).toMatchObject({ additionalMarkets: ['Japan', 'Singapore'], currency: 'USD', channels: [], connected: [], completed: [0] });
    first.unmount();
    mount();
    expect(screen.getByRole('button', { name: 'Remove Singapore' })).toBeVisible();
    click('Set up later');
    click('Go to workspace');
    fireEvent.click(setupOption('Continue workspace details'));
    expect(screen.getByRole('button', { name: 'Remove Japan' })).toBeVisible();
    click('Remove Japan');
    expect(readSellerDemo().additionalMarkets).toEqual(['Singapore']);
    expect(screen.getByRole('button', { name: 'Additional markets', exact: true })).toHaveFocus();
    click('Additional markets');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Singapore', exact: true }));
    click('Done');
    expect(screen.queryByRole('list', { name: 'Selected additional markets' })).not.toBeInTheDocument();
    click('Continue');
    expect(screen.getByRole('heading', { name: 'Set up your selling profile' })).toBeVisible();
  });
  it('prevents a selected additional market from duplicating the new primary market', () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Global seller', step: 1, currency: 'USD', additionalMarkets: ['Singapore', 'Japan'], channels: ['Shopee'], connected: ['Shopee'] }));
    mount();
    fireEvent.change(screen.getByLabelText('Primary market', { exact: true }), { target: { value: 'Singapore' } });
    expect(readSellerDemo()).toMatchObject({ market: 'Singapore', additionalMarkets: ['Japan'], currency: 'USD', channels: ['Shopee'], connected: ['Shopee'] });
    expect(screen.queryByRole('button', { name: 'Remove Singapore' })).not.toBeInTheDocument();
    click('Additional markets');
    expect(screen.getByRole('checkbox', { name: 'Singapore', exact: true })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Singapore', exact: true })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Vietnam', exact: true })).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Japan', exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Japan', exact: true }));
    expect(readSellerDemo().additionalMarkets).toEqual(['Japan']);
  });
  it('migrates saved progress without additional markets and normalizes duplicate selections', () => {
    const { additionalMarkets: _additionalMarkets, ...legacy } = freshSellerDemo();
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...legacy, name: 'Existing seller', step: 1, completed: [0] }));
    expect(readSellerDemo()).toMatchObject({ name: 'Existing seller', step: 1, completed: [0], additionalMarkets: [] });
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...legacy, name: 'Existing seller', additionalMarkets: ['Vietnam', 'Japan', 'Japan', ' Singapore ', ''] }));
    expect(readSellerDemo().additionalMarkets).toEqual(['Japan', 'Singapore']);
  });
});
