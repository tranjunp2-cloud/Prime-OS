// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getProducts, updateProduct } from '@/lib/product-store';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions, updatePosition } from '@/lib/inventory-store';
import Warehouses from '@/pages/Warehouses';
import { getStockHoldHistory, STOCK_HOLD_STORAGE_KEY } from '@/lib/stock-hold-history';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock('@/lib/channel-integrations-api', () => ({ channelIntegrationsApi: { channels: vi.fn().mockResolvedValue({ data: [] }) } }));

function renderPage(path = '/warehouses') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Warehouses />
    </MemoryRouter>,
  );
}

describe('Warehouse & Inventory workspace', () => {
  afterEach(cleanup);

  it('renders the warehouse overview with settings kept secondary', async () => {
    renderPage();

    expect(screen.queryByRole('navigation', { name: 'Warehouse operations' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My warehouses' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Choose a warehouse' })).toBeInTheDocument();
    expect(screen.getByText('Advanced warehouse settings').closest('details')).not.toHaveAttribute('open');
    expect(await screen.findByText('0 shops · 0 channels')).toBeInTheDocument();
  });

  it('shows a simple product stock overview', () => {
    renderPage('/warehouse/stock');
    expect(screen.getByRole('heading', { name: 'My warehouses' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Stock/ })).toBeInTheDocument();
    expect(screen.getAllByText('Black Hardcover Notebook — Japanese Craft Paper').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: /^Available \(ATP\)/ })).toBeInTheDocument();
  });

  it('opens the stock transfer workflow from the page header', () => {
    renderPage('/warehouse/transfers');

    fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'New action' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Transfer stock' }));
    expect(screen.getByRole('heading', { name: 'Create Stock Transfer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Source Warehouse')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination Warehouse')).toBeInTheDocument();
  });

  it('returns to filtered activity after a transfer and retains the audit record after remounting', () => {
    const original = getProducts().find(product => !product.has_variants && product.inventory.wh_crjp > 5)!;
    try {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      fireEvent.change(screen.getByLabelText('Activity type'), { target: { value: 'transfer' } });
      fireEvent.keyDown(screen.getByRole('button', { name: 'New action' }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Transfer stock' }));
      fireEvent.change(screen.getByLabelText('Source Warehouse'), { target: { value: 'wh_crjp' } });
      fireEvent.change(screen.getByLabelText('Destination Warehouse'), { target: { value: 'wh_rslsg' } });
      fireEvent.change(screen.getByLabelText('Product or SKU'), { target: { value: original.sku_code } });
      fireEvent.change(screen.getByLabelText('Transfer Quantity'), { target: { value: '2' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Transfer' }));
      expect(screen.getByRole('heading', { name: 'Stock activity' })).toBeInTheDocument();
      expect(screen.getByLabelText('Activity type')).toHaveValue('transfer');
      const saved = getProducts().find(product => product.id === original.id)!;
      const record = saved.inventory_transfers![0];
      expect(saved.inventory.wh_crjp).toBe(original.inventory.wh_crjp - 2);
      expect(saved.inventory.wh_rslsg).toBe((original.inventory.wh_rslsg ?? 0) + 2);
      expect(screen.getByRole('button', { name: `View activity ${record.id}` })).toBeInTheDocument();
      expect(screen.getByText('New', { exact: true })).toBeVisible();
      cleanup();
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      fireEvent.click(screen.getByRole('button', { name: `View activity ${record.id}` }));
      expect(within(screen.getByLabelText(`Details for activity ${record.id}`)).getByText(/Completed/)).toBeVisible();
    } finally { updateProduct(original.id, original); }
  });

  it('creates a hold from activity and returns on cancel without creating another record', () => {
    const original = getProducts().find(product => !product.has_variants && product.skus.length <= 1 && product.inventory.wh_crjp > 10)!;
    localStorage.removeItem(STOCK_HOLD_STORAGE_KEY);
    addInventoryPosition({ id: 'activity-hold', product_id: original.id, sku_id: original.skus[0]?.id ?? `${original.id}_default`, warehouse_id: 'wh_crjp', on_hand: original.inventory.wh_crjp, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: new Date().toISOString() });
    try {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      fireEvent.keyDown(screen.getByRole('button', { name: 'New action' }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Manage holds' }));
      fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Product'), { target: { value: original.id } });
      fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_crjp' } });
      fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '2' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save hold' }));
      expect(screen.getByRole('heading', { name: 'Stock activity' })).toBeInTheDocument();
      expect(getStockHoldHistory()).toHaveLength(1);
      const id = getStockHoldHistory()[0].id;
      expect(screen.getByRole('button', { name: `View activity ${id}` })).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Activity type'), { target: { value: 'hold' } });
      fireEvent.keyDown(screen.getByRole('button', { name: 'New action' }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Manage holds' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByLabelText('Activity type')).toHaveValue('hold');
      expect(getStockHoldHistory()).toHaveLength(1);
    } finally { cleanup(); clearInventoryStore(); localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); }
  });

  it('updates the overview and records history after editing a warehouse row', async () => {
    const original = getProducts().find(product => !product.has_variants && typeof product.inventory.wh_crjp === 'number')!;
    try {
      renderPage();
      await screen.findByText('0 shops · 0 channels');
      fireEvent.change(screen.getByLabelText('Warehouse scope'), { target: { value: 'wh_crjp' } });
      const row = screen.getByRole('button', { name: original.name }).closest('tr')!;
      fireEvent.keyDown(within(row).getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Adjust stock' }));
      expect(screen.getByRole('heading', { name: 'Adjust stock' })).toBeInTheDocument();
      expect(screen.getByLabelText('Warehouse')).toHaveValue('wh_crjp');
      expect(within(screen.getByRole('dialog')).getByLabelText('Product')).toHaveValue(original.id);
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: String(original.inventory.wh_crjp + 3) } });
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(within(row).getByText(String(original.inventory.wh_crjp + 3))).toBeInTheDocument();
      expect(getProducts().find(product => product.id === original.id)?.inventory_adjustments?.[0].reason).toBe('Physical stock count');
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      const recordId = getProducts().find(product => product.id === original.id)!.inventory_adjustments![0].id;
      fireEvent.click(screen.getByRole('button', { name: `View activity ${recordId}` }));
      expect(screen.getByText('Physical stock count')).toBeInTheDocument();
    } finally { updateProduct(original.id, original); }
  });

  it('uses the same absolute-count form from New Adjustment and appends to history', async () => {
    const original = getProducts().find(product => !product.has_variants && typeof product.inventory.wh_crjp === 'number')!;
    try {
      renderPage();
      await screen.findByText('0 shops · 0 channels');
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      fireEvent.keyDown(screen.getByRole('button', { name: 'New action' }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Adjust stock' }));
      expect(screen.getByRole('heading', { name: 'Adjust stock' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Quantity Change')).not.toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByLabelText('Product')).toHaveValue('');
      expect(screen.getByLabelText('Warehouse')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_crjp' } });
      fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Product'), { target: { value: original.id } });
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: String(original.inventory.wh_crjp + 6) } });
      expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
      expect(screen.getByRole('heading', { name: 'Stock activity' })).toBeInTheDocument();
      const updated = getProducts().find(product => product.id === original.id)!;
      expect(updated.inventory.wh_crjp).toBe(original.inventory.wh_crjp + 6);
      expect(updated.inventory_adjustments).toHaveLength((original.inventory_adjustments?.length ?? 0) + 1);
      expect(updated.inventory_adjustments?.[0]).toMatchObject({ before: original.inventory.wh_crjp, after: original.inventory.wh_crjp + 6, warehouseId: 'wh_crjp', sku: original.sku_code, reason: 'Physical stock count' });
      expect(screen.getByText(`${original.inventory.wh_crjp} → ${original.inventory.wh_crjp + 6}`)).toBeInTheDocument();
    } finally { updateProduct(original.id, original); }
  });

  it('records a first count from an unrecorded row through Actions', async () => {
    const original = getProducts().find(product => !product.has_variants)!;
    const inventory = { ...original.inventory };
    delete inventory.wh_crjp;
    try {
      updateProduct(original.id, { id: original.id, inventory });
      renderPage();
      await screen.findByText('0 shops · 0 channels');
      fireEvent.change(screen.getByLabelText('Warehouse scope'), { target: { value: 'wh_crjp' } });
      const row = screen.getByRole('button', { name: original.name }).closest('tr')!;
      fireEvent.keyDown(within(row).getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
      expect(screen.queryByRole('menuitem', { name: 'Adjust stock' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Record initial stock' }));
      expect(screen.getByLabelText('Warehouse')).toHaveValue('wh_crjp');
      fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save location & stock' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(within(row).getByText('5')).toBeInTheDocument();
      expect(getProducts().find(product => product.id === original.id)?.inventory_adjustments?.[0]).toMatchObject({ before: null, after: 5, warehouseId: 'wh_crjp' });
    } finally { updateProduct(original.id, original); }
  });

  it('aligns only numeric adjustment columns to the right', () => {
    renderPage('/warehouses');
    fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));

    expect(screen.getByRole('columnheader', { name: 'Change' })).toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Activity / Product' })).not.toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Time' })).not.toHaveClass('text-right');
  });
  it('records, adjusts, holds and releases a variant from row actions with auditable history', () => {
    const original = getProducts().find(product => product.has_variants && product.skus.length > 1)!;
    const sku = original.skus[0];
    clearInventoryStore();
    localStorage.removeItem(STOCK_HOLD_STORAGE_KEY);
    updateProduct(original.id, { ...original, inventory: {}, skus: original.skus.map(item => ({ ...item, stock_by_location: {} })), inventory_adjustments: [] });
    // Existing reservation data can be reconciled when the first physical count is recorded.
    addInventoryPosition({ id: 'variant-flow', product_id: original.id, sku_id: sku.id, warehouse_id: 'wh_crjp', on_hand: 0, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: new Date().toISOString() });
    try {
      renderPage();
      fireEvent.change(screen.getByLabelText('Warehouse scope'), { target: { value: 'wh_crjp' } });
      fireEvent.click(screen.getByRole('button', { name: `Expand ${original.name}` }));
      const actions = () => screen.getByRole('button', { name: `Actions for ${sku.sku_code} at CyberRecord Japan HQ` });
      const openAction = (name: string) => {
        fireEvent.keyDown(actions(), { key: 'Enter' });
        fireEvent.click(screen.getByRole('menuitem', { name }));
      };
      openAction('Record initial stock');
      expect(screen.getByLabelText('Variant SKU')).toHaveValue(sku.sku_code);
      expect(within(screen.getByRole('dialog')).getByLabelText('Product')).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save location & stock' }));
      expect(getProducts().find(item => item.id === original.id)!.inventory.wh_crjp).toBe(10);
      openAction('Adjust stock');
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: '8' } });
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
      openAction('Manage holds');
      expect(screen.getByLabelText('Variant SKU')).toHaveValue(sku.sku_code);
      fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save hold' }));
      expect(getInventoryPositions()[0]).toMatchObject({ on_hand: 8, safety_stock: 3 });
      expect(within(actions().closest('tr')!).getByRole('button', { name: /Stock breakdown/ })).toHaveTextContent('5');
      openAction('Manage holds');
      fireEvent.click(screen.getByRole('radio', { name: 'Release stock' }));
      fireEvent.change(screen.getByLabelText('Quantity to release'), { target: { value: '2' } });
      fireEvent.click(screen.getByRole('button', { name: 'Release stock' }));
      expect(getInventoryPositions()[0]).toMatchObject({ on_hand: 8, safety_stock: 1 });
      expect(within(actions().closest('tr')!).getByRole('button', { name: /Stock breakdown/ })).toHaveTextContent('7');
      openAction('Adjust stock');
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: '99' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      const saved = getProducts().find(item => item.id === original.id)!;
      expect(saved.inventory.wh_crjp).toBe(8);
      expect(saved.skus.slice(1).every(item => item.stock_by_location?.wh_crjp === undefined)).toBe(true);
      expect(saved.inventory_adjustments?.map(item => [item.before, item.after])).toEqual([[10, 8], [null, 10]]);
      expect(getStockHoldHistory().map(item => [item.before, item.after])).toEqual([[3, 1], [0, 3]]);
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      expect(screen.getAllByRole('button', { name: /^View activity/ }).length).toBeGreaterThanOrEqual(4);
    } finally { cleanup(); updateProduct(original.id, original); clearInventoryStore(); localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); }
  });
  it('recalculates ATP after a count adjustment and live hold changes without clearing holds', async () => {
    const original = getProducts().find(product => !product.has_variants && product.skus.length <= 1 && product.inventory.wh_crjp > 10)!;
    const count = original.inventory.wh_crjp;
    addInventoryPosition({ id: 'atp-live-test', product_id: original.id, sku_id: original.skus[0]?.id ?? `${original.id}_default`, warehouse_id: 'wh_crjp', on_hand: count, reserved_unpaid: 2, reserved_paid: 3, allocated: 1, safety_stock: 2, campaign_lock: 0, unfulfillable: 0, inbound: 50, outbound: 0, return_pending: 0, version: 1, updated_at: new Date().toISOString() });
    try {
      renderPage();
      await screen.findByText('0 shops · 0 channels');
      fireEvent.change(screen.getByLabelText('Warehouse scope'), { target: { value: 'wh_crjp' } });
      const row = screen.getByRole('button', { name: original.name }).closest('tr')!;
      expect(within(row).getByRole('button', { name: /Stock breakdown/ })).toHaveTextContent(String(count - 8));
      fireEvent.keyDown(within(row).getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Adjust stock' }));
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: String(count + 3) } });
      expect(screen.getByText(`Available to sell (ATP): ${count - 8} → ${count - 5}`)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
      expect(within(row).getByRole('button', { name: /Stock breakdown/ })).toHaveTextContent(String(count - 5));
      expect(getInventoryPositions()[0]).toMatchObject({ on_hand: count + 3, reserved_unpaid: 2, reserved_paid: 3, allocated: 1 });
      act(() => updatePosition('atp-live-test', { reserved_unpaid: 4 }));
      expect(within(row).getByRole('button', { name: /Stock breakdown/ })).toHaveTextContent(String(count - 7));
    } finally {
      cleanup();
      clearInventoryStore();
      updateProduct(original.id, original);
    }
  });
  it('labels an initial count without pretending that unknown stock was zero', () => {
    const original = getProducts().find(product => !product.has_variants)!;
    try {
      updateProduct(original.id, { id: original.id, inventory_adjustments: [{ id: 'test-initial-count', warehouseId: 'wh_crjp', sku: original.sku_code, before: null, after: 5, reason: 'Physical stock count', createdAt: new Date().toISOString() }] });
      renderPage('/warehouses');
      fireEvent.click(screen.getByRole('button', { name: 'Stock activity' }));
      const row = screen.getByRole('button', { name: 'View activity test-initial-count' }).closest('tr')!;
      expect(within(row).getByText('Initial count')).toBeInTheDocument();
      expect(within(row).getByText('Not recorded → 5')).toBeInTheDocument();
      expect(within(row).queryByText('+5')).not.toBeInTheDocument();
    } finally { updateProduct(original.id, original); }
  });
});
