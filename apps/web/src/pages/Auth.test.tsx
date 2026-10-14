// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/lib/i18n/I18nContext';
import { clearPrimeAuthToken, setPrimeAuthToken, type PrimeSession } from '@/lib/prime/backend-auth';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { freshSellerDemo, readSellerDemo, rememberOverviewDemoMode, SELLER_DEMO_KEY } from '@/components/seller-onboarding/demo-state';
import Auth from './Auth';
import SellerOnboardingDemo from './SellerOnboardingDemo';

vi.mock('@/lib/demo-data-seeder', () => ({ seedDemoData: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const session: PrimeSession = {
  role: 'user', roleLabel: 'Seller', description: '', canReset: false, canWrite: true,
  visibleResources: ['*'], writableResources: ['*'], hiddenResources: [], resourcePermissions: {},
  account: { id: 'seller-onboarding-test', role: 'user', fullName: 'Seller', email: 'seller@example.com' },
};
const fetchMock = vi.fn();

function CurrentRoute() {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname}{location.search}</output>;
}
function mount() {
  return render(<I18nProvider><AuthProvider><MemoryRouter initialEntries={['/auth']}>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/demo/no-data" element={<SellerOnboardingDemo />} />
      <Route path="/admin/dashboard" element={<h1>Empty Home</h1>} />
      <Route path="/overview" element={<h1>Populated Home</h1>} />
    </Routes>
    <CurrentRoute />
  </MemoryRouter></AuthProvider></I18nProvider>);
}
function submitLogin() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'seller@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearPrimeAuthToken();
  vi.stubEnv('VITE_PRIME_PROTOTYPE', 'false');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token: 'test-token', session }) });
  vi.mocked(seedDemoData).mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); clearPrimeAuthToken(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Sign-in to seller onboarding', () => {
  it('opens onboarding before Home and lets a new seller defer optional steps', async () => {
    // A previous demo-mode choice alone must not bypass first-time setup.
    rememberOverviewDemoMode(false);
    mount();
    submitLogin();
    expect(await screen.findByRole('heading', { name: 'Confirm your workspace' })).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/demo/no-data');
    expect(seedDemoData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace name' }), { target: { value: 'New seller workspace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go to workspace' }));
    expect(await screen.findByRole('heading', { name: 'Empty Home' })).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/admin/dashboard?demo=no-data');
  });

  it('opens empty Home after minimum setup, even when optional details were interrupted', async () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Global seller', step: 1, completed: [0], additionalMarkets: ['Japan'] }));
    mount();
    submitLogin();
    expect(await screen.findByRole('heading', { name: 'Empty Home' })).toBeVisible();
    expect(readSellerDemo().additionalMarkets).toEqual(['Japan']);
    expect(seedDemoData).not.toHaveBeenCalled();
  });

  it('takes a returning seller straight to Home and preserves deferred details', async () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Returning seller', view: 'home', completed: [0], deferred: [1, 2, 3, 4] }));
    rememberOverviewDemoMode(true);
    mount();
    submitLogin();
    expect(await screen.findByRole('heading', { name: 'Empty Home' })).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/admin/dashboard?demo=no-data');
    expect(readSellerDemo().deferred).toEqual([1, 2, 3, 4]);
    expect(seedDemoData).not.toHaveBeenCalled();
  });

  it('also opens onboarding for a restored session without workspace setup', async () => {
    setPrimeAuthToken('restored-test-token');
    fetchMock.mockResolvedValue({ ok: true, json: async () => session });
    mount();
    expect(await screen.findByRole('heading', { name: 'Confirm your workspace' })).toBeVisible();
    expect(seedDemoData).not.toHaveBeenCalled();
  });

  it('keeps Home when an existing session is restored instead of treating it as a new login', async () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Returning seller', view: 'home', completed: [0], deferred: [1, 2, 3, 4] }));
    rememberOverviewDemoMode(true);
    setPrimeAuthToken('restored-test-token');
    fetchMock.mockResolvedValue({ ok: true, json: async () => session });
    mount();
    expect(await screen.findByRole('heading', { name: 'Empty Home' })).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/admin/dashboard?demo=no-data');
    expect(screen.queryByRole('heading', { name: 'Confirm your workspace' })).not.toBeInTheDocument();
  });

  it('stays on login when authentication fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: 'Invalid credentials' }) });
    mount();
    submitLogin();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/auth');
    expect(screen.queryByRole('heading', { name: 'Confirm your workspace' })).not.toBeInTheDocument();
    expect(seedDemoData).not.toHaveBeenCalled();
  });

  it.each([false, true])('opens Home after completed setup with no-data mode %s without clearing saved data', async (noData) => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Returning seller', view: 'home', step: 4, completed: [0, 1, 2, 3, 4], additionalMarkets: ['Japan'], business: 'Global seller', email: 'seller@example.com', warehouse: 'Main warehouse', address: 'Saved address' }));
    rememberOverviewDemoMode(noData);
    mount();
    submitLogin();
    expect(await screen.findByRole('heading', { name: noData ? 'Empty Home' : 'Populated Home' })).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(noData ? '/admin/dashboard?demo=no-data' : '/overview');
    expect(readSellerDemo()).toMatchObject({ name: 'Returning seller', completed: [0, 1, 2, 3, 4], additionalMarkets: ['Japan'], business: 'Global seller', email: 'seller@example.com', warehouse: 'Main warehouse', address: 'Saved address' });
    expect(seedDemoData).not.toHaveBeenCalled();

  });
});
