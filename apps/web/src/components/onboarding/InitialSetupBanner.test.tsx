// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { freshSellerDemo, SELLER_DEMO_KEY } from '@/components/seller-onboarding/demo-state';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';
import { getProducts } from '@/lib/product-store';
import { InitialSetupBanner } from './InitialSetupBanner';
import { SalesSetupSettings } from './SalesSetupSettings';

vi.mock('@/lib/product-store', () => ({ getProducts: vi.fn(() => []), isDemoProduct: (id: string) => id.startsWith('demo-') }));
vi.mock('@/lib/warehouse-store', () => ({ getWarehouses: () => [], savedWarehouses: () => [] }));
vi.mock('@/lib/shop-warehouse-settings', () => ({ canonicalShopWarehouseId: (id: string) => id }));
vi.mock('@/lib/channel-integrations-api', () => ({ channelIntegrationsApi: { channels: vi.fn() } }));
const products = vi.mocked(getProducts);
const channels = vi.mocked(channelIntegrationsApi.channels);
function mount(mode = 'no-data', settings = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/overview?demo=${mode}`]}><InitialSetupBanner />{settings && <SalesSetupSettings />}</MemoryRouter></QueryClientProvider>);
}
async function openOptions() {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Sales setup options' }), { key: 'Enter' });
  return screen.findByRole('menu');
}
function saveSetup(catalog = 'manual') { localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), catalog, name: 'Seller', completed: [0, 4], view: 'home' })); }
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); products.mockReturnValue([]); saveSetup(); });
afterEach(cleanup);

describe('Sales setup guidance', () => {
  it('ignores seeded data and simulated onboarding connections in no-data mode', async () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), catalog: 'channel', connected: ['Shopee'], completed: [0, 1, 4] }));
    products.mockReturnValue([{ id: 'demo-product' }] as ReturnType<typeof getProducts>);
    mount();
    expect(await screen.findByText('0 of 2 completed')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Connect channel' })).toHaveAttribute('href', '/sales-channels/connected-channels');
    expect(channels).not.toHaveBeenCalled();
    expect(screen.queryByText(/second.*channel/i)).not.toBeInTheDocument();
  });
  it('counts a newly saved product, but not the initial choice, on returning Home', async () => {
    const first = mount();
    expect(await screen.findByRole('link', { name: 'Add product' })).toHaveAttribute('href', '/products/new');
    first.unmount();
    products.mockReturnValue([{ id: 'seller-product' }] as ReturnType<typeof getProducts>);
    const emptyPreview = mount();
    expect(await screen.findByRole('link', { name: 'Add product' })).toBeVisible();
    expect(screen.queryByText('Complete', { exact: true })).not.toBeInTheDocument();
    emptyPreview.unmount();
    mount('with-data');
    expect(await screen.findByText('Complete', { exact: true })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Add product' })).not.toBeInTheDocument();
  });
  it('shows loading and errors without fake progress and recovers on retry', async () => {
    saveSetup('channel');
    let reject!: (error: Error) => void;
    channels.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    mount('with-data');
    expect(screen.getByRole('status')).toHaveTextContent('Checking your setup');
    expect(screen.queryByText(/of .* completed/)).not.toBeInTheDocument();
    reject(new Error('Offline'));
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t check your setup');
    channels.mockResolvedValue({ data: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('0 of 2 completed')).toBeVisible();
  });
  it('keeps the direct action accessible when collapsed and remembers the preference', async () => {
    const first = mount();
    await screen.findByRole('link', { name: 'Add product' });
    await openOptions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Collapse sales setup' }));
    expect(screen.getByRole('link', { name: 'Add product' })).toBeVisible();
    expect(screen.queryByText(/Create a Product Master/)).not.toBeInTheDocument();
    first.unmount(); mount();
    await openOptions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Expand sales setup' }));
    expect(await screen.findByText(/Create a Product Master/)).toBeVisible();
  });
  it('hides guidance from the secondary menu and restores it from Settings without clearing drafts', async () => {
    const saved = localStorage.getItem(SELLER_DEMO_KEY);
    mount('no-data', true);
    await screen.findByRole('link', { name: 'Add product' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Sales setup options' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hide from Home' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Sales setup' })).not.toBeInTheDocument());
    const toggle = screen.getByRole('switch', { name: 'Show sales setup on Home' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(await screen.findByRole('region', { name: 'Sales setup' })).toBeVisible();
    expect(localStorage.getItem(SELLER_DEMO_KEY)).toBe(saved);
  });
  it('keeps the checklist secondary and links optional workspace details to the missing step', async () => {
    mount();
    await screen.findByRole('link', { name: 'Add product' });
    const card = screen.getByRole('region', { name: 'Sales setup' });
    expect(within(card).getAllByRole('link')).toHaveLength(1);
    expect(within(card).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'View steps' })).not.toBeInTheDocument();
    await openOptions();
    expect(screen.getByRole('menuitem', { name: 'Continue workspace details' })).toHaveAttribute('href', '/demo/no-data?step=2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'View steps' }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('link', { name: 'Add product' })).toHaveAttribute('href', '/products/new');
  });
  it('offers optional starting points for exploration instead of an artificial completion count', async () => {
    saveSetup('later'); mount();
    expect(await screen.findByText('At your pace')).toBeVisible();
    expect(screen.queryByText(/of .* completed/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Explore products' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Sales setup' })).getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }));
    expect(await screen.findByRole('link', { name: 'Connect channel' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Add product' })).toBeVisible();
  });
});
