// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import Warehouses from './Warehouses';
import * as warehouses from '@/lib/warehouse-store';
import { getProducts } from '@/lib/product-store';
import { getInventoryPositions } from '@/lib/inventory-store';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';

vi.mock('@/lib/channel-integrations-api', () => ({ channelIntegrationsApi: { channels: vi.fn().mockResolvedValue({ data: [] }) } }));
let originalWarehouseIds: Set<string>;
let savedWarehouses: string | null;
beforeEach(() => {
  localStorage.removeItem('prime:demo-data-mode:v1');
  localStorage.removeItem('prime:overview-demo-mode');
  originalWarehouseIds = new Set(warehouses.getWarehouses().map(w => w.id));
  savedWarehouses = localStorage.getItem(warehouses.WAREHOUSE_STORAGE_KEY);
  vi.mocked(channelIntegrationsApi.channels).mockClear().mockResolvedValue({ data: [] });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  warehouses.getWarehouses().filter(w => !originalWarehouseIds.has(w.id)).forEach(w => warehouses.deleteWarehouse(w.id));
  if (savedWarehouses === null) localStorage.removeItem(warehouses.WAREHOUSE_STORAGE_KEY);
  else localStorage.setItem(warehouses.WAREHOUSE_STORAGE_KEY, savedWarehouses);
});
function Location() {
  const location = useLocation(), navigate = useNavigate();
  return <><output aria-label="Current URL">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Browser back</button></>;
}
function mount(path = '/warehouses') { return render(<MemoryRouter initialEntries={[path]}><Warehouses /><Location /></MemoryRouter>); }

describe('warehouse demo modes and first warehouse', () => {
  it('shows an actionable empty state directly from the URL without requesting shop links', () => {
    mount('/warehouses?demo=no-data&warehouse=wh_crjp&sku=BRUSH');
    expect(screen.getByRole('button', { name: 'No data' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'No warehouses yet' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Add warehouse' })).toHaveLength(1);
    expect(within(screen.getByRole('list', { name: 'Warehouse setup steps' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('region', { name: 'Choose a warehouse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stock activity' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(channelIntegrationsApi.channels).not.toHaveBeenCalled();
  });
  it('switches and supports browser back without removing warehouses, stock or products', async () => {
    const before = JSON.stringify([warehouses.getWarehouses(), getProducts(), getInventoryPositions()]);
    mount('/warehouses?warehouse=wh_crjp&sku=BRUSH&origin=demo');
    expect(screen.getByRole('button', { name: 'With data' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'No data' }));
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/warehouses?origin=demo&demo=no-data');
    expect(screen.getByRole('heading', { name: 'No warehouses yet' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    await screen.findByRole('region', { name: 'Choose a warehouse' });
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/warehouses?origin=demo');
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(screen.getByRole('heading', { name: 'No warehouses yet' })).toBeVisible();
    expect(JSON.stringify([warehouses.getWarehouses(), getProducts(), getInventoryPositions()])).toBe(before);
  });
  it('cancels creation back to the empty state without writing a warehouse', () => {
    mount('/warehouses?demo=no-data');
    fireEvent.click(screen.getByRole('button', { name: 'Add warehouse' }));
    const dialog = screen.getByRole('dialog', { name: 'Add warehouse' });
    fireEvent.change(within(dialog).getByLabelText('Warehouse name'), { target: { value: 'Cancelled warehouse' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No warehouses yet' })).toBeVisible();
    expect(new Set(warehouses.getWarehouses().map(w => w.id))).toEqual(originalWarehouseIds);
    expect(localStorage.getItem(warehouses.WAREHOUSE_STORAGE_KEY)).toBe(savedWarehouses);
  });
  it('creates a warehouse from No data and opens its opening-stock setup in With data', async () => {
    mount('/warehouses?demo=no-data&sku=old');
    fireEvent.click(screen.getByRole('button', { name: 'Add warehouse' }));
    const dialog = screen.getByRole('dialog', { name: 'Add warehouse' });
    expect(within(dialog).getByRole('button', { name: 'Create warehouse' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Warehouse name'), { target: { value: 'First warehouse QA' } });
    fireEvent.change(within(dialog).getByLabelText('Warehouse code'), { target: { value: 'EMPTY-QA' } });
    fireEvent.change(within(dialog).getByLabelText('Address'), { target: { value: '12 Demo Street, HCM' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create warehouse' }));
    await screen.findByRole('heading', { name: 'Set up opening stock' });
    expect(screen.getByRole('button', { name: 'With data' })).toHaveAttribute('aria-pressed', 'true');
    const created = warehouses.getWarehouses().find(w => w.code === 'EMPTY-QA')!;
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(`/warehouses?warehouse=${created.id}`);
    expect(localStorage.getItem(warehouses.WAREHOUSE_STORAGE_KEY)).toContain('First warehouse QA');
    fireEvent.click(screen.getByRole('button', { name: 'Record opening stock' }));
    expect(await screen.findByRole('dialog', { name: 'Record opening stock' })).toBeVisible();
  });
  it('also handles a genuinely empty warehouse directory', async () => {
    vi.spyOn(warehouses, 'getWarehouses').mockReturnValue([]);
    mount();
    expect(screen.getByRole('heading', { name: 'No warehouses yet' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add warehouse' })).toBeEnabled();
    await waitFor(() => expect(channelIntegrationsApi.channels).not.toHaveBeenCalled());
  });
});
