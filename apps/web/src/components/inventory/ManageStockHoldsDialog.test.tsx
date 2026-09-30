// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useSyncExternalStore } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProducts } from '@/lib/product-store';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions, subscribeInventory, updatePosition, type InventoryPosition } from '@/lib/inventory-store';
import { getStockHoldHistory, STOCK_HOLD_STORAGE_KEY } from '@/lib/stock-hold-history';
import { WarehouseStockTable } from './WarehouseStockTable';
import { ManageStockHoldsDialog } from './ManageStockHoldsDialog';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const product = { ...getProducts()[0], id: 'hold-ui', name: 'Holds example', sku_code: 'HOLD-UI', has_variants: false, skus: [], inventory: { wh_crjp: 20, wh_rslsg: 20 } };
const position: InventoryPosition = { id: 'hold-ui-position', product_id: product.id, sku_id: `${product.id}_default`, warehouse_id: 'wh_crjp', on_hand: 20, reserved_unpaid: 2, reserved_paid: 3, allocated: 0, safety_stock: 2, campaign_lock: 0, unfulfillable: 1, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' };
beforeEach(() => { window.localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); clearInventoryStore(); addProduct(product); addInventoryPosition(position); addInventoryPosition({ ...position, id: 'singapore', warehouse_id: 'wh_rslsg' }); });
afterEach(() => { cleanup(); clearInventoryStore(); deleteProduct(product.id); window.localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); });
function Table() {
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  return <WarehouseStockTable products={[product]} positions={positions} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="wh_crjp" onShowAll={() => {}} />;
}
describe('manage stock holds', () => {
  it('opens from Actions, previews changes, updates table totals and preserves history', () => {
    render(<Table />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manage holds' }));
    expect(screen.getByLabelText('Warehouse')).toHaveValue('wh_crjp');
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'campaign_lock' } });
    fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('Add a note (optional)'));
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Launch campaign' } });
    const preview = within(screen.getByLabelText('Hold preview'));
    expect(preview.getByText('3 → 7')).toBeInTheDocument();
    expect(preview.getByText('12 → 8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save hold' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Other holds/ })).toHaveTextContent('7');
    expect(screen.getByRole('columnheader', { name: /^Available/ })).toHaveTextContent('8');
    expect(screen.getByRole('columnheader', { name: /^Stock/ })).toHaveTextContent('20');
    fireEvent.keyDown(screen.getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manage holds' }));
    fireEvent.click(screen.getByText('Hold history (1)'));
    expect(screen.getByText('Launch campaign')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'campaign_lock' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Release stock' }));
    fireEvent.change(screen.getByLabelText('Quantity to release'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Release stock' }));
    expect(screen.getByRole('columnheader', { name: /^Available/ })).toHaveTextContent('12');
    expect(getStockHoldHistory()).toHaveLength(2);
  });
  it('validates amounts, resets changes on warehouse selection and cancels without writing', () => {
    const close = vi.fn();
    render(<ManageStockHoldsDialog product={product} warehouseId="wh_crjp" onClose={close} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '13' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Only 12');
    expect(screen.getByRole('button', { name: 'Save hold' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_rslsg' } });
    expect(screen.getByLabelText('Quantity to hold')).toHaveValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    expect(getStockHoldHistory()).toHaveLength(0);
  });
  it('blocks a stale preview when order reservations change', () => {
    render(<ManageStockHoldsDialog product={product} warehouseId="wh_crjp" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Quantity to hold'), { target: { value: '2' } });
    act(() => updatePosition(position.id, { reserved_paid: 5 }));
    expect(screen.getByRole('alert')).toHaveTextContent('Stock changed');
    expect(screen.getByRole('button', { name: 'Save hold' })).toBeDisabled();
  });
  it('opens release when no ATP remains and keeps invalid warehouse choices disabled', () => {
    updatePosition(position.id, { safety_stock: 15, unfulfillable: 0 });
    render(<ManageStockHoldsDialog product={product} warehouseId="wh_crjp" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Release stock' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Hold stock' })).toBeDisabled();
    expect(screen.getByRole('option', { name: /Vietnam 3PL Partner/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Quantity to release'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Release stock' }));
    expect(getInventoryPositions()[0].safety_stock).toBe(13);
    expect(getStockHoldHistory()[0]).toMatchObject({ before: 15, after: 13 });
  });
});
