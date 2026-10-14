// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { DemoDataModeProvider } from '@/components/shared/DemoDataModeProvider';
import { DemoDataModeToggle } from '@/components/shared/DemoDataModeToggle';
import { DEMO_DATA_MODE_KEY, readDemoDataMode, writeDemoDataMode } from '@/lib/demo-data-mode';
import { useDemoDataMode } from './use-demo-data-mode';

function Page() {
  const { mode } = useDemoDataMode();
  return <output aria-label="Page mode">{mode}</output>;
}
function Harness() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { noData } = useDemoDataMode();
  return <>
    <DemoDataModeToggle />
    <output aria-label="Current URL">{pathname}{search}</output>
    <button onClick={() => navigate('/orders')}>Orders</button>
    <button onClick={() => navigate('/customers')}>Customers</button>
    <button onClick={() => navigate(-1)}>Back</button>
    {/* Recreate page children just as the route-level empty boundary does. */}
    <Page key={`${pathname}:${noData}`} />
  </>;
}
function mount(path = '/customers') {
  return render(<MemoryRouter initialEntries={[path]}><DemoDataModeProvider><Harness /></DemoDataModeProvider></MemoryRouter>);
}
function externalMode(mode: 'no-data' | 'with-data') {
  act(() => {
    localStorage.setItem(DEMO_DATA_MODE_KEY, mode);
    window.dispatchEvent(new StorageEvent('storage', { key: DEMO_DATA_MODE_KEY, newValue: mode }));
  });
}
beforeEach(() => { localStorage.clear(); writeDemoDataMode('with-data'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); writeDemoDataMode('with-data'); });

describe('shared demo mode', () => {
  it('persists between routes, refreshes, and both directions without changing business data', () => {
    localStorage.setItem('saved-orders', '[{"id":"keep-me"}]');
    const first = mount('/customers?source=review&customer=old&rank-settings=1');
    fireEvent.click(screen.getByRole('button', { name: 'No data' }));
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/customers?source=review&demo=no-data');
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
    first.unmount();
    mount('/orders');
    expect(screen.getByRole('button', { name: 'No data' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Customers' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('with-data');
    expect(localStorage.getItem('saved-orders')).toBe('[{"id":"keep-me"}]');
  });
  it.each(['?demo=no-data', '?preview=no-channels', '?preview=first-product'])('adopts direct and legacy empty links: %s', query => {
    mount(`/products/master-catalog${query}`);
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
    expect(readDemoDataMode()).toBe('no-data');
    fireEvent.click(screen.getByRole('button', { name: 'Customers' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
  });
  it('honors an explicit populated link and browser back to an empty link', () => {
    mount('/orders?demo=no-data');
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('with-data');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
    cleanup();
    mount('/orders?demo=with-data');
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('with-data');
  });
  it('follows cross-tab changes even when the current URL and remounted children used an old mode', () => {
    mount('/orders?demo=no-data');
    externalMode('with-data');
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('with-data');
    expect(screen.getByRole('button', { name: 'With data' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/orders');
    expect(screen.getByLabelText('Current URL')).not.toHaveTextContent('demo=no-data');
    externalMode('no-data');
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' })));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
  });
  it('keeps the in-memory mode when storage writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'No data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('no-data');
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('with-data');
  });
  it('migrates the overview preference and safely ignores an invalid value', () => {
    localStorage.removeItem(DEMO_DATA_MODE_KEY);
    localStorage.setItem('prime:overview-demo-mode', 'no-data');
    expect(readDemoDataMode()).toBe('no-data');
    localStorage.setItem(DEMO_DATA_MODE_KEY, 'invalid');
    mount('/customers?demo=invalid');
    expect(screen.getByLabelText('Page mode')).toHaveTextContent('with-data');
  });
});
