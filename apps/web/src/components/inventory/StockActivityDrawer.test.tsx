// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockActivityDrawer } from './StockActivityDrawer';
import { getProducts } from '@/lib/product-store';
import { recordStockHoldChange, STOCK_HOLD_STORAGE_KEY } from '@/lib/stock-hold-history';
const product = { ...getProducts()[0], id: 'activity-ui', name: 'Brush Set', sku_code: 'BRUSH', inventory_transfers: [], inventory_adjustments: Array.from({ length: 61 }, (_, index) => ({ id: `activity-${String(index).padStart(3, '0')}`, warehouseId: 'wh_crjp', sku: 'BRUSH', before: index, after: index + 1, reason: 'Physical stock count', createdAt: new Date(Date.now() - index * 1000).toISOString() })) };
const warehouses = [{ id: 'wh_crjp', name: 'Japan' }, { id: 'wh_rslsg', name: 'Singapore' }];
const props = { open: true, onOpenChange: vi.fn(), products: [product], warehouses, onNewAction: vi.fn() };
afterEach(() => { cleanup(); localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); vi.clearAllMocks(); });
describe('Stock activity drawer', () => {
  it('renders one page, expands details by keyboard and preserves filters across reopening', () => {
    const view = render(<StockActivityDrawer {...props} />);
    expect(screen.getByLabelText('Activity results')).toHaveTextContent('1–25 of 61');
    expect(screen.getAllByRole('button', { name: /^View activity/ })).toHaveLength(25);
    const row = screen.getByRole('button', { name: 'View activity activity-000' }).closest('tr')!;
    expect(screen.queryByText('Physical stock count')).not.toBeInTheDocument();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(within(screen.getByLabelText('Details for activity activity-000')).getByText('Physical stock count')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByLabelText('Activity results')).toHaveTextContent('26–50 of 61');
    expect(screen.queryByLabelText('Details for activity activity-000')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search stock activity'), { target: { value: 'activity-060' } });
    expect(screen.getByLabelText('Activity results')).toHaveTextContent('1–1 of 1');
    view.rerender(<StockActivityDrawer {...props} open={false} />);
    view.rerender(<StockActivityDrawer {...props} />);
    expect(screen.getByLabelText('Search stock activity')).toHaveValue('activity-060');
    expect(screen.getByRole('button', { name: 'View activity activity-060' })).toBeInTheDocument();
  });
  it('keeps incompatible filters after saving and explicitly reveals the new activity on request', () => {
    const view = render(<StockActivityDrawer {...props} />);
    fireEvent.change(screen.getByLabelText('Activity type'), { target: { value: 'adjustment' } });
    recordStockHoldChange({ id: 'new-hold', productId: product.id, skuId: 'brush', sku: 'BRUSH', warehouseId: 'wh_crjp', kind: 'safety_stock', before: 0, after: 2, note: 'Buffer', createdAt: new Date().toISOString() });
    view.rerender(<StockActivityDrawer {...props} products={[{ ...product }]} recentId="new-hold" />);
    expect(screen.getByText('Saved. The new activity is outside these filters.')).toBeVisible();
    expect(screen.getByLabelText('Activity type')).toHaveValue('adjustment');
    fireEvent.click(screen.getByRole('button', { name: 'Show new activity' }));
    expect(screen.getByLabelText('Activity type')).toHaveValue('all');
    const row = screen.getByRole('button', { name: 'View activity new-hold' }).closest('tr')!;
    expect(within(row).getByText('New')).toBeInTheDocument();
    expect(within(row).getByText('units held')).toBeInTheDocument();
  });
  it('offers all three actions in one menu and handles empty and invalid date results', () => {
    render(<StockActivityDrawer {...props} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'New action' }), { key: 'Enter' });
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manage holds' }));
    expect(props.onNewAction).toHaveBeenCalledWith('holds');
    fireEvent.change(screen.getByLabelText('Activity warehouse'), { target: { value: 'wh_rslsg' } });
    expect(screen.getByText('No activity matches these filters')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText('Activity results')).toHaveTextContent('1–25 of 61');
    fireEvent.change(screen.getByLabelText('Activity period'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-02' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an end date');
  });
});
