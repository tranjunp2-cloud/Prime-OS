// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoDataModeProvider } from '@/components/shared/DemoDataModeProvider';
import { WorkspaceDemoBoundary } from '@/components/shared/WorkspaceDemoBoundary';
import { DEMO_DATA_MODE_KEY, readDemoDataMode, writeDemoDataMode } from '@/lib/demo-data-mode';
import PrimeInboxWorkspace from './PrimeInboxWorkspace';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-agent', workspace: 'test', role: 'admin', fullName: 'Test Agent' } }) }));

beforeEach(() => { localStorage.clear(); writeDemoDataMode('with-data'); });
afterEach(cleanup);
function mount(path = '/inbox/conversation?demo=no-data') {
  return render(<MemoryRouter initialEntries={[path]}><DemoDataModeProvider><WorkspaceDemoBoundary><Routes>
    <Route path="/inbox/conversation" element={<PrimeInboxWorkspace />} />
    <Route path="/customers" element={<h1>Customers</h1>} />
    <Route path="/sales-channels/conversation-channels" element={<h1>Conversation Channels</h1>} />
  </Routes></WorkspaceDemoBoundary></DemoDataModeProvider></MemoryRouter>);
}
describe('Prime CRM page content', () => {
  it('keeps compact prototype controls without sample conversations', () => {
    mount();
    const header = screen.getByRole('heading', { name: 'Prime CRM' }).closest('header')!;
    expect(within(header).getByText('Prototype · Replies are simulated')).toBeVisible();
    fireEvent.click(within(header).getByText('Demo options'));
    expect(within(header).getByRole('button', { name: 'No data' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'No conversations yet' })).toBeVisible();
    expect(screen.queryByText('WebSocket connected')).not.toBeInTheDocument();
    expect(screen.queryByText('Nguyen Minh Anh')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer information')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Reply to customer...')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-no-data')).not.toBeInTheDocument();
  });
  it('keeps channel setup reachable and in the same demo mode', () => {
    mount();
    fireEvent.click(screen.getByRole('link', { name: 'Connect conversation channel' }));
    expect(screen.getByRole('heading', { name: 'Conversation Channels' })).toBeVisible();
    expect(readDemoDataMode()).toBe('no-data');
  });
  it('changes only the body when switching modes and preserves an unsent reply', () => {
    mount('/inbox/conversation');
    const header = screen.getByRole('heading', { name: 'Prime CRM' }).closest('header')!;
    fireEvent.click(within(header).getByText('Demo options'));
    fireEvent.change(screen.getByPlaceholderText('Reply to customer...'), { target: { value: 'Keep this draft' } });
    for (let i = 0; i < 2; i++) {
      fireEvent.click(within(header).getByRole('button', { name: 'No data' }));
      expect(screen.getByRole('heading', { name: 'No conversations yet' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Prime CRM' }).closest('header')).toBe(header);
      fireEvent.click(within(header).getByRole('button', { name: 'With data' }));
      expect(screen.queryByTestId('inbox-no-data')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Reply to customer...')).toHaveValue('Keep this draft');
    }
  });
  it('preserves the header when another browser tab changes the global mode', () => {
    mount();
    const header = screen.getByRole('heading', { name: 'Prime CRM' }).closest('header')!;
    act(() => {
      localStorage.setItem(DEMO_DATA_MODE_KEY, 'with-data');
      window.dispatchEvent(new StorageEvent('storage', { key: DEMO_DATA_MODE_KEY, newValue: 'with-data' }));
    });
    expect(screen.getByPlaceholderText('Reply to customer...')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Prime CRM' }).closest('header')).toBe(header);
  });
});
