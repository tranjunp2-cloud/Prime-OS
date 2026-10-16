// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoDataModeProvider } from './DemoDataModeProvider';
import { WorkspaceDemoBoundary } from './WorkspaceDemoBoundary';
import { writeDemoDataMode } from '@/lib/demo-data-mode';

beforeEach(() => { localStorage.clear(); writeDemoDataMode('no-data'); });
afterEach(cleanup);
const childMounted = vi.fn();
function Child() { childMounted(); return <p>Populated child</p>; }
function mount(path: string) {
  childMounted.mockClear();
  return render(<MemoryRouter initialEntries={[path]}><DemoDataModeProvider><WorkspaceDemoBoundary><Child /></WorkspaceDemoBoundary></DemoDataModeProvider></MemoryRouter>);
}
describe('empty workspace coverage', () => {
  it.each([
    ['/finance/ops', 'No financial activity yet'],
    ['/finance/ops?view=collections', 'No receivables yet'],
    ['/finance/ops?view=forecast', 'No cash flow history yet'],
    ['/finance/ops?view=risk', 'No financial activity to review'],
    ['/system/invoices', 'No invoices yet'],
    ['/finance/invoices', 'No invoices yet'],
    ['/automation/scheduled-tasks', 'No scheduled tasks yet'],
    ['/automation/scheduled-tasks/old-task', 'No scheduled tasks yet'],
    ['/sales-channels/conversation-channels', 'No conversation channels connected'],
    ['/sales-channels/live-commerce', 'No live sessions yet'],
    ['/customer/service', 'No conversations yet'],
    ['/crm/operator', 'No conversations yet'],
    ['/customer/crm-compact', 'No conversations yet'],
    ['/prime-ai', 'No business insights yet'],
    ['/finance/fin-support', 'No financial assessment yet'],
    ['/crm/mdec', 'No business activity yet'],
    ['/ecom/commerce-surface', 'No commerce activity yet'],
    ['/warehouses/store-stock', 'No store stock yet'],
    ['/client-reports/pos-shifts', 'No shifts to review yet'],
    ['/products/existing-product/edit', 'No product selected'],
    ['/promotions/automatic', 'No automatic discounts data yet'],
    ['/promotions/flash-sale', 'No flash sales data yet'],
    ['/promotions/loyalty', 'No loyalty & membership data yet'],
    ['/promotions/analytics', 'No promotion analytics data yet'],
  ])('hides seeded content and keeps navigation working at %s', (path, title) => {
    mount(path);
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(screen.getByRole('button', { name: 'No data' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('link').every(link => link.getAttribute('href')?.startsWith('/'))).toBe(true);
    expect(childMounted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.getByText('Populated child')).toBeVisible();
  });
  it.each(['/settings/general', '/settings/team-access', '/settings/pricing-rules', '/faq', '/docs', '/billing', '/billing?tab=plans', '/billing?tab=requests', '/pos/hardware', '/products/new', '/customers', '/orders', '/marketing', '/promotions/discount-codes', '/builder/sites', '/inbox/conversation'])('retains configuration, creation flows, or native empty UI at %s', path => {
    mount(path);
    expect(screen.getByText('Populated child')).toBeVisible();
    expect(screen.queryByTestId('workspace-no-data')).not.toBeInTheDocument();
  });
  it('keeps finance tab navigation in the same empty mode', () => {
    mount('/finance/ops');
    fireEvent.click(screen.getByRole('link', { name: 'Collections' }));
    expect(screen.getByRole('heading', { name: 'No receivables yet' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveAttribute('aria-current', 'page');
    expect(childMounted).not.toHaveBeenCalled();
  });
  it.each(['/pos/setup', '/pos/products', '/pos/settings', '/pos/register', '/pos/shifts', '/pos/transactions', '/pos/returns', '/products/pos-assortment'])('allows POS setup, native empty states and legacy redirects at %s', path => {
    mount(path);
    expect(screen.getByText('Populated child')).toBeVisible();
    expect(screen.queryByTestId('workspace-no-data')).not.toBeInTheDocument();
  });
});
