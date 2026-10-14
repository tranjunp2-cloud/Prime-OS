// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoDataModeProvider } from '@/components/shared/DemoDataModeProvider';
import { WorkspaceDemoBoundary } from '@/components/shared/WorkspaceDemoBoundary';
import { DEMO_DATA_MODE_KEY, readDemoDataMode, writeDemoDataMode } from '@/lib/demo-data-mode';
import PrimeInboxWorkspace from './PrimeInboxWorkspace';

beforeEach(() => { localStorage.clear(); writeDemoDataMode('with-data'); });
afterEach(cleanup);
function mount(path = '/inbox/conversation?demo=no-data') {
  return render(<MemoryRouter initialEntries={[path]}><DemoDataModeProvider><WorkspaceDemoBoundary><Routes>
    <Route path="/inbox/conversation" element={<PrimeInboxWorkspace />} />
    <Route path="/customers" element={<h1>Customers</h1>} />
    <Route path="/sales-channels/connected-channels" element={<h1>Connected Channels</h1>} />
  </Routes></WorkspaceDemoBoundary></DemoDataModeProvider></MemoryRouter>);
}
describe('Prime Inbox page content', () => {
  it('keeps the shared page title, subtitle, and demo controls without sample conversations', () => {
    mount();
    const header = screen.getByRole('heading', { name: 'Prime Inbox' }).closest('header')!;
    expect(within(header).getByText('Manage customer conversations and follow-up work.')).toBeVisible();
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
    fireEvent.click(screen.getByRole('link', { name: 'Connect sales channel' }));
    expect(screen.getByRole('heading', { name: 'Connected Channels' })).toBeVisible();
    expect(readDemoDataMode()).toBe('no-data');
  });
  it('changes only the body when switching modes and preserves an unsent reply', () => {
    mount('/inbox/conversation');
    const header = screen.getByRole('heading', { name: 'Prime Inbox' }).closest('header')!;
    fireEvent.change(screen.getByPlaceholderText('Reply to customer...'), { target: { value: 'Keep this draft' } });
    for (let i = 0; i < 2; i++) {
      fireEvent.click(within(header).getByRole('button', { name: 'No data' }));
      expect(screen.getByRole('heading', { name: 'No conversations yet' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Prime Inbox' }).closest('header')).toBe(header);
      fireEvent.click(within(header).getByRole('button', { name: 'With data' }));
      expect(screen.queryByTestId('inbox-no-data')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Reply to customer...')).toHaveValue('Keep this draft');
    }
  });
  it('preserves the header when another browser tab changes the global mode', () => {
    mount();
    const header = screen.getByRole('heading', { name: 'Prime Inbox' }).closest('header')!;
    act(() => {
      localStorage.setItem(DEMO_DATA_MODE_KEY, 'with-data');
      window.dispatchEvent(new StorageEvent('storage', { key: DEMO_DATA_MODE_KEY, newValue: 'with-data' }));
    });
    expect(screen.getByPlaceholderText('Reply to customer...')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Prime Inbox' }).closest('header')).toBe(header);
  });
});
