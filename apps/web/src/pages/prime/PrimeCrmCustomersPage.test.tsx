// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoOrders } from '../../../../../packages/order-workflow/demo-orders.js';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { PrimeCrmCustomersPage } from './PrimeCrmCustomersPage';
import { useAuth } from '@/contexts/AuthContext';
import { defaultRankConfig, rankSettingsKey, readRankSettings, saveRankSettings } from '@/lib/customer-ranks';
import { customerProfileDrafts, customerProfileKey, readCustomerProfile, saveCustomerProfile } from '@/lib/customer-profile-details';
import { customerGroupingKey, saveCustomerGroups } from '@/lib/customer-grouping-storage';

vi.mock('@/lib/orders-api', async original => ({ ...await original<typeof import('@/lib/orders-api')>(), ordersApi: { list: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
const sample = demoOrders()[0] as OrderRecord;
const records: OrderRecord[] = [
  { ...sample, id: 'order-a', orderKey: 'ORDER-A', canonicalStatus: 'closed', buyerSnapshot: { name: 'An Nguyen', email: 'an@example.com', phone: '0901234567', phoneCountry: 'VN' }, metadata: { ...sample.metadata, store: 'Shopee' } },
  { ...sample, id: 'order-b', orderKey: 'ORDER-B', canonicalStatus: 'shipped', buyerSnapshot: { name: 'Binh Tran', email: 'binh@example.com', phone: '0907654321', phoneCountry: 'VN' }, metadata: { ...sample.metadata, store: 'PrimeWeb' } },
];
beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'demo-user', workspace: 'Main', role: 'admin', fullName: 'Admin', email: 'admin@example.com' } } as ReturnType<typeof useAuth>);
  vi.mocked(ordersApi.list).mockResolvedValue({ data: records, canWrite: true });
});
const profileScope = JSON.stringify(['Main', 'demo-user']);
afterEach(() => { cleanup(); localStorage.clear(); ['customer-order-a', 'customer-order-b'].forEach(id => customerProfileDrafts.clear(customerProfileKey(profileScope, id))); vi.restoreAllMocks(); vi.resetAllMocks(); });
function Location() { const location = useLocation(); return <output aria-label="Current URL">{location.pathname}{location.search}</output>; }
function mount(url = '/customers') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter initialEntries={[url]}><PrimeCrmCustomersPage /><Location /></MemoryRouter></QueryClientProvider>);
}
function openRanks() { fireEvent.pointerDown(screen.getByRole('button', { name: /Filter by rank:/ }), { button: 0, ctrlKey: false }); }

describe('simplified Customers page', () => {
  it.each([0, 1, 2, 3, 4, 5])('opens the customer from cell %i, including cell whitespace, and shows their avatar', async cellIndex => {
    mount();
    const table = await screen.findByRole('table');
    const row = within(table).getByRole('button', { name: 'View customer An Nguyen' }).closest('tr')!;
    fireEvent.click(within(row).getAllByRole('cell')[cellIndex]);
    expect(await screen.findByRole('heading', { name: 'An Nguyen', level: 1 })).toHaveFocus();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/customers?customer=customer-order-a');
    const header = screen.getByLabelText('Customer profile header');
    expect(within(header).getByText('AN')).toHaveAttribute('aria-hidden', 'true');
    expect(within(header).getByText('an@example.com')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    expect(await screen.findByRole('table')).toBeVisible();
  });

  it('keeps the rank action independent of whole-row navigation', async () => {
    mount();
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /^View An Nguyen's rank:/ }));
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('customer=customer-order-a&section=rank');
    expect(screen.getByRole('region', { name: 'Customer rank' })).toHaveFocus();
  });

  it('opens a fresh demo with every rank populated and working detail/order screens without setup', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: demoOrders() as OrderRecord[], canWrite: true });
    mount();
    await screen.findByRole('table');
    expect(screen.queryByText('Not configured')).not.toBeInTheDocument();
    expect(screen.getByLabelText('44 customers')).toBeVisible();
    expect(screen.queryByText(/Grouped by buyer phone across channels/)).not.toBeInTheDocument();
    for (const rank of ['VIP', 'Gold', 'Silver', 'Bronze']) {
      openRanks();
      expect(screen.queryByRole('menuitemradio', { name: /Not configured/ })).not.toBeInTheDocument();
      expect(screen.getByRole('menuitemradio', { name: /Unranked/ })).toHaveTextContent('Unranked0');
      const option = screen.getByRole('menuitemradio', { name: new RegExp(`^${rank}`) });
      expect(option.textContent).toMatch(/[1-9]\d*$/);
      fireEvent.click(option);
      const table = screen.getByRole('table');
      fireEvent.click(within(table).getAllByRole('button', { name: /^View customer/ })[0]);
      expect(screen.getByRole('region', { name: 'Customer rank' })).toHaveTextContent(rank);
      expect(screen.getByLabelText('Email')).not.toHaveValue('Not provided');
      expect(screen.getByLabelText('Phone')).not.toHaveValue('Not provided');
      expect(screen.getByLabelText('Latest address')).not.toHaveValue('Not provided on the latest order');
      fireEvent.mouseDown(screen.getByRole('tab', { name: /Orders/ }), { button: 0, ctrlKey: false });
      expect(within(screen.getByRole('table')).getAllByRole('link', { name: /View order/ }).length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    expect(screen.queryByText(/Demo rank rules are already active/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prototype settings are saved in this browser/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Enable automatic ranking')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rank thresholds' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeDisabled();
    expect(localStorage.getItem(rankSettingsKey('Main'))).toBeNull();
  });

  it('keeps purchase metrics visible and reveals rank calculation only on demand', async () => {
    mount('/customers?customer=customer-order-a');
    const summary = await screen.findByRole('region', { name: 'Purchase summary' });
    for (const label of ['Total orders', 'Total spent', 'Completed rate', 'Cancelled rate']) {
      expect(within(summary).getByText(label)).toBeVisible();
    }
    const rank = screen.getByRole('region', { name: 'Customer rank' });
    const calculation = within(rank).getByText(/Recalculated when orders or profile grouping change/);
    expect(calculation).not.toBeVisible();
    fireEvent.click(within(rank).getByText('How rank is calculated'));
    expect(calculation).toBeVisible();
    fireEvent.click(within(rank).getByText('How rank is calculated'));
    expect(calculation).not.toBeVisible();
    fireEvent.click(within(summary).getByRole('button', { name: 'How total spent is calculated' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('differs from qualifying spend used for rank');
  });

  it('shows rank badges and faceted counts independent of the selected rank and pagination', async () => {
    const many = Array.from({ length: 18 }, (_, index) => ({ ...records[0], id: `many-${index}`, currencyCode: 'VND', totals: { subtotal: 100000, discount: 0, grandTotal: 100000 }, payment: { ...records[0].payment, state: 'Paid' }, buyerSnapshot: { name: `Person ${index}`, email: '', phone: '' }, metadata: { ...records[0].metadata, store: index < 16 ? 'Shopee' : 'PrimeWeb' } }));
    vi.mocked(ordersApi.list).mockResolvedValue({ data: many, canWrite: true });
    saveRankSettings('Main', defaultRankConfig, 0);
    mount(); await screen.findByRole('table');
    openRanks();
    expect(screen.getByRole('menuitemradio', { name: /All ranks/ })).toHaveTextContent('18');
    expect(screen.getByRole('menuitemradio', { name: /Bronze/ })).toHaveTextContent('18');
    expect(screen.getByRole('menuitemradio', { name: /VIP/ })).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('menuitemradio', { name: /VIP/ }));
    expect(screen.getByText('No matching customers')).toBeVisible();
    openRanks();
    expect(screen.getByRole('menuitemradio', { name: /All ranks/ })).toHaveTextContent('18');
    fireEvent.click(screen.getByRole('menuitemradio', { name: /All ranks/ }));
    fireEvent.change(screen.getByLabelText('Filter by sales channel'), { target: { value: 'Shopee' } });
    openRanks();
    expect(screen.getByRole('menuitemradio', { name: /All ranks/ })).toHaveTextContent('16');
  });

  it('saves a local display name and notes without changing order snapshots, then restores them on reload', async () => {
    const original = JSON.stringify(records);
    const view = mount('/customers?customer=customer-order-a');
    await screen.findByRole('heading', { name: 'An Nguyen', level: 1 });
    const initialUpdatedAt = within(screen.getByLabelText('Customer metadata')).getByText(/^Updated /).getAttribute('datetime');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Display name/), { target: { value: 'Demo VIP customer' } });
    fireEvent.change(screen.getByLabelText('Internal notes'), { target: { value: 'Demo: prefers email' } });
    expect(within(screen.getByLabelText('Customer profile header')).getByText('AN')).toBeVisible();
    expect(within(screen.getByLabelText('Customer metadata')).getByText(/^Updated /)).toHaveAttribute('datetime', initialUpdatedAt);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Profile changes saved in this browser. Original orders are unchanged.')).toBeVisible();
    expect(within(screen.getByLabelText('Customer profile header')).getByText('DV')).toBeVisible();
    expect(within(screen.getByLabelText('Customer metadata')).getByText(/^Updated /)).toHaveAttribute('datetime', readCustomerProfile(profileScope, 'customer-order-a').value.savedAt);
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(JSON.stringify(records)).toBe(original);
    fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    expect(within(screen.getByRole('table')).getByText('Demo VIP customer')).toBeVisible();
    view.unmount(); mount('/customers?customer=customer-order-a');
    expect(await screen.findByRole('heading', { name: 'Demo VIP customer' })).toBeVisible();
    expect(screen.getByLabelText('Internal notes')).toHaveValue('Demo: prefers email');
  });

  it('keeps edits across tabs and confirms before leaving without saving', async () => {
    mount('/customers?customer=customer-order-a');
    await screen.findByLabelText('Internal notes');
    fireEvent.change(screen.getByLabelText('Internal notes'), { target: { value: 'Unsaved demo note' } });
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Orders/ }), { button: 0, ctrlKey: false });
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Details' }), { button: 0, ctrlKey: false });
    expect(screen.getByLabelText('Internal notes')).toHaveValue('Unsaved demo note');
    fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Discard profile changes?');
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Internal notes')).toHaveValue('Unsaved demo note');
    fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByRole('table')).toBeVisible();
    expect(readCustomerProfile(profileScope, 'customer-order-a').value.notes).toBe('');
  });

  it('validates profile names, reports storage failures, and retains unsaved input', async () => {
    mount('/customers?customer=customer-order-a');
    const name = await screen.findByLabelText(/Display name/);
    fireEvent.change(name, { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('1–100 characters');
    expect(name).toHaveFocus();
    fireEvent.change(name, { target: { value: 'Demo name' } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota'); });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was changed');
    expect(name).toHaveValue('Demo name');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('protects another tab’s profile changes from a stale save', async () => {
    mount('/customers?customer=customer-order-a');
    fireEvent.change(await screen.findByLabelText('Internal notes'), { target: { value: 'My draft' } });
    saveCustomerProfile(profileScope, 'customer-order-a', { displayName: 'Other tab', notes: 'Already saved' }, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('another tab');
    expect(readCustomerProfile(profileScope, 'customer-order-a').value.notes).toBe('Already saved');
  });

  it('supports direct Orders links, search without a status filter and read-only profiles', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: records, canWrite: false });
    mount('/customers?customer=customer-order-a&tab=orders');
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('link', { name: 'View order ORDER-A' })).toBeVisible();
    expect(screen.queryByLabelText('Filter customer orders by status')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Status' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search customer orders'), { target: { value: 'none' } });
    expect(screen.getByText('No matching orders')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByLabelText('Search customer orders')).toHaveValue('');
    expect(screen.getByRole('table')).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Details' }), { button: 0, ctrlKey: false });
    expect(screen.getByLabelText('Internal notes')).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/Display name/)).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('handles an unknown customer without a blank screen', async () => {
    mount('/customers?customer=missing');
    expect(await screen.findByText('Customer unavailable')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    expect(await screen.findByRole('table')).toBeVisible();
  });

  it('shows channel logos with shop tooltips on focus and click without opening the customer', async () => {
    mount();
    const table = await screen.findByRole('table');
    const logo = within(table).getByRole('button', { name: 'Shopee: Prime Beauty Official' });
    expect(logo.querySelector('svg')).not.toBeNull();
    act(() => logo.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Prime Beauty Official');
    fireEvent.keyDown(logo, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    fireEvent.click(logo);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Shopee');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(/^\/customers$/);
    fireEvent.click(within(screen.getByRole('tooltip')).getByText('Prime Beauty Official'));
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(/^\/customers$/);
    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an order-based directory without the CRM tabs, account creation or KPI blocks', async () => {
    mount();
    expect(await screen.findByRole('table')).toBeVisible();
    for (const label of ['Customer', 'Phone', 'Channels', 'Orders', 'Rank', 'Last order']) expect(screen.getByRole('columnheader', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Total spent/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Identity Matching')).not.toBeInTheDocument();
    expect(screen.queryByText('Account Profile')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create account/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View orders' })).not.toBeInTheDocument();
  });

  it('filters by channel and contact, with a recoverable no-results state', async () => {
    mount();
    const table = await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Filter by sales channel'), { target: { value: 'Shopee' } });
    expect(within(table).getByText('An Nguyen')).toBeVisible();
    expect(within(table).queryByText('Binh Tran')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search customers' }), { target: { value: 'nobody' } });
    expect(screen.getByText('No matching customers')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(within(screen.getByRole('table')).getByText('Binh Tran')).toBeVisible();
  });

  it('previews all customers before applying ranks, then persists, filters and explains them', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: records.map(order => ({ ...order, source: 'manual' })), canWrite: true });
    mount();
    await screen.findByRole('table');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search customers' }), { target: { value: 'An Nguyen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    expect(screen.queryByRole('button', { name: 'Save & apply' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(screen.getByRole('region', { name: 'Rank change preview' })).toHaveTextContent('2 of 2 customers');
    fireEvent.click(screen.getByRole('button', { name: 'Save & apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(readRankSettings('Main').config).toEqual(defaultRankConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    openRanks();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Unranked/ }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Binh Tran')).toBeVisible();
    fireEvent.click(within(table).getByRole('button', { name: /View Binh Tran's rank/ }));
    expect(screen.getByRole('region', { name: 'Customer rank' })).toHaveTextContent('Qualifying spend');
    expect(screen.getByRole('region', { name: 'Customer detail', exact: true })).toHaveTextContent('Total spent');
  });

  it('disables saving unchanged rules, validates thresholds and invalidates the preview after edits', async () => {
    saveRankSettings('Main', defaultRankConfig, 0);
    mount();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeDisabled();
    const silver = screen.getByLabelText('Silver minimum spend (VND)');
    fireEvent.change(silver, { target: { value: '5000000' } });
    fireEvent.blur(screen.getByLabelText('Gold minimum spend (VND)'));
    expect(screen.getByText('Gold must be higher than Silver.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeDisabled();
    fireEvent.change(silver, { target: { value: '2000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(screen.getByRole('button', { name: 'Save & apply' })).toBeEnabled();
    fireEvent.change(silver, { target: { value: '3000000' } });
    expect(screen.queryByRole('button', { name: 'Save & apply' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Discard rank changes?');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(readRankSettings('Main').config).toEqual(defaultRankConfig);
  });

  it('does not claim success on a failed rank settings save', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: records.map(order => ({ ...order, source: 'manual' })), canWrite: true });
    mount();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota'); });
    fireEvent.click(screen.getByRole('button', { name: 'Save & apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was changed');
    expect(localStorage.getItem(rankSettingsKey('Main'))).toBeNull();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('allows read-only rank inspection but never editing', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'reader', workspace: 'Main', role: 'user' } } as ReturnType<typeof useAuth>);
    mount();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    expect(screen.queryByLabelText('Enable automatic ranking')).not.toBeInTheDocument();
    for (const rank of ['Silver', 'Gold', 'VIP']) expect(screen.getByLabelText(`${rank} minimum spend (VND)`)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Preview changes' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('View only');
  });

  it('keeps legacy disabled rules unchanged until thresholds are explicitly previewed and applied', async () => {
    const disabled = {...defaultRankConfig, enabled: false, silver: 2000000};
    saveRankSettings('Main', disabled, 0);
    mount();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    expect(screen.getByLabelText('Silver minimum spend (VND)')).toHaveValue(2000000);
    expect(screen.queryByLabelText('Enable automatic ranking')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(readRankSettings('Main').config).toEqual(disabled);
    fireEvent.click(screen.getByRole('button', { name: 'Rank settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(readRankSettings('Main').config).toEqual(disabled);
    fireEvent.click(screen.getByRole('button', { name: 'Save & apply' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(readRankSettings('Main').config).toEqual({...disabled, enabled: true});
  });

  it('opens a full detail page, switches to Orders with valid links, and returns to the filtered list', async () => {
    mount();
    const table = await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: 'An Nguyen' } });
    fireEvent.click(within(table).getByRole('button', { name: 'View customer An Nguyen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'An Nguyen', level: 1 })).toHaveFocus();
    const header = screen.getByLabelText('Customer profile header');
    expect(within(header).getByText('an@example.com')).toBeVisible();
    expect(within(header).getByText('customer-order-a').tagName).toBe('CODE');
    expect(within(header).getByText(/^Updated /).tagName).toBe('TIME');
    expect(within(header).queryByText(/From orders/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Latest address')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('customer=customer-order-a');
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Orders/ }), { button: 0, ctrlKey: false });
    expect(screen.getByRole('tab', { name: /Orders/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('table')).getByRole('link', { name: 'View order ORDER-A' })).toHaveAttribute('href', '/orders?order=order-a');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('tab=orders');
    fireEvent.click(screen.getByRole('button', { name: 'Back to customers' }));
    expect(screen.getByLabelText('Search customers')).toHaveValue('An Nguyen');
    expect(within(screen.getByRole('table')).queryByText('Binh Tran')).not.toBeInTheDocument();
  });

  it('keeps title/subtitle in no-data mode without fetching or showing redundant controls', async () => {
    mount('/customers?demo=no-data&source=review');
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeVisible();
    expect(screen.getByText('Customer contact details and purchase history, automatically collected from orders.')).toBeVisible();
    expect(screen.getByText('No customers yet')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Connect sales channel' })).toHaveAttribute('href', '/sales-channels/connected-channels');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(ordersApi.list).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(await screen.findByRole('table')).toBeVisible();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/customers?source=review');
    fireEvent.click(screen.getByRole('button', { name: 'No data' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No customers yet')).toBeVisible();
  });

  it('shows real empty orders as empty, not sample customer accounts', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [], canWrite: false });
    mount();
    expect(await screen.findByText('No customers yet')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows API failures honestly and retries without substituting demo data', async () => {
    vi.mocked(ordersApi.list).mockRejectedValueOnce(new Error('Unavailable'));
    mount();
    expect(await screen.findByText('Customers could not be loaded')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeVisible();
    expect(ordersApi.list).toHaveBeenCalledTimes(2);
  });

  it('keeps phone-grouped orders while removing matching and channel summary cards from detail', async () => {
    const shared = [records[0], { ...records[1], buyerSnapshot: { ...records[1].buyerSnapshot, phone: '+84901234567' } }];
    const before = JSON.stringify(shared);
    vi.mocked(ordersApi.list).mockResolvedValue({ data: shared, canWrite: true });
    mount();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(within(table).getByRole('button', { name: /^View customer/ }));
    expect(screen.queryByRole('region', { name: 'Profile matching' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Phone matching/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sales channels' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Separate orders' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Purchase summary' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Customer rank' })).toBeVisible();
    expect(screen.getByRole('tab', { name: /Orders/ })).toHaveTextContent('2');
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Orders/ }), { button: 0, ctrlKey: false });
    expect(within(screen.getByRole('table')).getAllByRole('link', { name: /View order/ })).toHaveLength(2);
    expect(within(screen.getByRole('table')).getByRole('button', { name: 'Shopee: Prime Beauty Official' })).toBeVisible();
    expect(JSON.stringify(shared)).toBe(before);
  });

  it('preserves existing phone separations when their UI is removed', async () => {
    const shared = [records[0], { ...records[1], buyerSnapshot: { ...records[1].buyerSnapshot, phone: '+84901234567' } }];
    const groups = { 'order-a': 'saved-group-a', 'order-b': 'saved-group-b' };
    saveCustomerGroups(profileScope, groups);
    vi.mocked(ordersApi.list).mockResolvedValue({ data: shared, canWrite: true });
    mount();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(within(table).getByRole('button', { name: 'View customer Binh Tran' }));
    expect(screen.getByRole('tab', { name: /Orders/ })).toHaveTextContent('1');
    expect(screen.queryByRole('button', { name: 'Undo phone separation' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(customerGroupingKey(profileScope))!)).toEqual(groups);
  });

  it('still refreshes saved grouping from another tab without exposing matching controls', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ data: [records[0], { ...records[1], buyerSnapshot: records[0].buyerSnapshot }], canWrite: false });
    mount();
    expect(within(await screen.findByRole('table')).getAllByRole('row')).toHaveLength(2);
    saveCustomerGroups(profileScope, { 'order-a': 'a', 'order-b': 'b' });
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: customerGroupingKey(profileScope) })));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
  });
});
