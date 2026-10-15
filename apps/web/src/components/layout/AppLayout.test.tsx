// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route } from 'react-router-dom';
import { DemoDataModeProvider } from '@/components/shared/DemoDataModeProvider';
import { readDemoDataMode, writeDemoDataMode } from '@/lib/demo-data-mode';
import PrimeInboxWorkspace from '@/pages/PrimeInboxWorkspace';
import { AppLayout } from './AppLayout';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en' }) }));
vi.mock('@/lib/demo-data-seeder', () => ({ seedDemoData: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./AppSidebar', () => ({ AppSidebar: () => <nav aria-label="Primary navigation" /> }));
vi.mock('./PrimeCommandPalette', () => ({ PrimeCommandPalette: () => null }));
vi.mock('@/components/copilot/GlobalCopilotWorkspace', () => ({
  GlobalCopilotWorkspace: ({ children }: { children: ReactNode }) => <div data-testid="shared-copilot-shell">{children}</div>,
}));
vi.mock('@/routes/PrimeRoutes', () => ({
  PrimeRoutes: () => <>
    <Route path="/inbox/conversation" element={<PrimeInboxWorkspace />} />
    <Route path="/admin/dashboard" element={<h1>Main overview</h1>} />
    <Route path="/builder/sites" element={<><h1>Websites</h1><Link to="/inbox/conversation">Open Inbox</Link></>} />
    <Route path="/pos/register" element={<h1>Register</h1>} />
  </>,
}));

beforeEach(() => { localStorage.clear(); writeDemoDataMode('with-data'); });
afterEach(cleanup);
function mount(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><DemoDataModeProvider><AppLayout /></DemoDataModeProvider></MemoryRouter>);
}
describe('shared workspace header', () => {
  it.each([
    ['/admin/dashboard', 'Main Workspace'],
    ['/builder/sites', 'PrimeWeb Workspace'],
    ['/pos/register', 'POS Workspace'],
    ['/inbox/conversation', 'Prime CRM Workspace'],
  ])('renders the same application toolbar and assistant shell at %s', async (path, name) => {
    mount(path);
    const header = await screen.findByRole('banner', { name: 'Application scope toolbar' });
    expect(within(header).getByRole('button', { name: `Switch workspace. Current workspace: ${name}` })).toBeVisible();
    expect(within(header).getByRole('button', { name: 'Open Prime AI' })).toBeVisible();
    expect(screen.getByTestId('shared-copilot-shell')).toContainElement(header);
    expect(screen.getByRole('main')).not.toContainElement(header);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Back to Main Workspace' }) !== null).toBe(path.startsWith('/inbox'));
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' }) !== null).toBe(!path.startsWith('/inbox'));
  });
  it('keeps the global toolbar stable while toggling demo mode and routes Back to the Main landing page', async () => {
    mount('/inbox/conversation?demo=no-data');
    const header = await screen.findByRole('banner', { name: 'Application scope toolbar' });
    const back = within(header).getByRole('link', { name: 'Back to Main Workspace' });
    const switcher = within(header).getByRole('button', { name: 'Switch workspace. Current workspace: Prime CRM Workspace' });
    expect(back.compareDocumentPosition(switcher) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(back).toHaveAttribute('href', '/admin/dashboard');
    expect(within(header).queryByRole('button', { name: 'No data' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.getByRole('banner', { name: 'Application scope toolbar' })).toBe(header);
    fireEvent.click(screen.getByRole('button', { name: 'No data' }));
    expect(screen.getByRole('heading', { name: 'No conversations yet' })).toBeVisible();
    expect(screen.getByRole('banner', { name: 'Application scope toolbar' })).toBe(header);
    fireEvent.click(back);
    expect(await screen.findByRole('heading', { name: 'Main overview' })).toBeVisible();
    expect(readDemoDataMode()).toBe('no-data');
  });
  it('reuses the same header DOM when entering Inbox from PrimeWeb', async () => {
    mount('/builder/sites');
    const header = await screen.findByRole('banner', { name: 'Application scope toolbar' });
    fireEvent.click(screen.getByRole('link', { name: 'Open Inbox' }));
    expect(screen.getByRole('banner', { name: 'Application scope toolbar' })).toBe(header);
    expect(within(header).getByRole('button', { name: 'Switch workspace. Current workspace: Prime CRM Workspace' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
  });
  it('dispatches the shared Prime AI action in Inbox', async () => {
    mount('/inbox/conversation?demo=no-data');
    const openAssistant = vi.fn();
    window.addEventListener('prime-ai:open', openAssistant);
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Open Prime AI' }));
      expect(openAssistant).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('prime-ai:open', openAssistant);
    }
  });
});
