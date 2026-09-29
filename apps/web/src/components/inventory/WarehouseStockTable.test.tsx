// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProducts, type Product } from '@/lib/product-store';
import { WarehouseStockTable } from './WarehouseStockTable';
const warehouses = [{ id: 'north', name: 'North' }, { id: 'south', name: 'South' }];
const base = getProducts()[0];
const products: Product[] = [{ ...base, id: 'shirt', name: 'Shirt', sku_code: 'SHIRT', has_variants: true, inventory: { north: 999 }, skus: [{ ...base.skus[0], id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', stock_by_location: { north: 5, south: 2 } }, { ...base.skus[0], id: 'red', sku_code: 'RED', variation_name: 'Red', stock_by_location: { north: 0 } }] }, { ...base, id: 'hat', name: 'Hat', sku_code: 'HAT', has_variants: false, inventory: { north: 0 } }];
afterEach(cleanup);
describe('warehouse table', () => {
  it('opens an edit for the exact warehouse without toggling the product row', () => {
    const onAdjustStock = vi.fn();
    const product = { ...products[1], inventory: { wh_crjp: 7, wh_fbajp: 2 } };
    const locations = [{ id: 'wh_crjp', name: 'Japan' }, { id: 'wh_fbajp', name: 'Amazon', external: true }];
    render(<WarehouseStockTable products={[product]} warehouses={locations} warehouseId="" onShowAll={() => {}} onAdjustStock={onAdjustStock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Hat' }));
    expect(screen.getAllByRole('button', { name: 'Adjust stock' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Adjust stock' }));
    expect(onAdjustStock).toHaveBeenCalledWith({ product, warehouse: locations[0], sku: undefined });
    expect(screen.getByRole('button', { name: 'Collapse Hat' })).toBeInTheDocument();
  });
  it('groups each master once across warehouses and expands distribution', () => {
    render(<WarehouseStockTable products={products} warehouses={warehouses} warehouseId="" onShowAll={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Shirt' })).toHaveLength(1);
    expect(within(screen.getByRole('table')).getByText('7')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('999')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Shirt' }));
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(screen.getAllByText('Partial data').length).toBeGreaterThan(0);
  });
  it('toggles details from row cells, the product name, arrow and keyboard without double toggling', () => {
    render(<WarehouseStockTable products={products} warehouses={warehouses} warehouseId="" onShowAll={() => {}} />);
    const row = screen.getByRole('button', { name: 'Shirt' }).closest('tr')!;
    fireEvent.click(within(row).getByText('7'));
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('South')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Shirt' }));
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Expand Shirt' }));
    expect(row).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(row, { key: ' ' });
    expect(row).toHaveAttribute('aria-expanded', 'true');
  });
  it('hides zero and unrecorded warehouses by default but lets users reveal them', () => {
    const simple = { ...products[1], inventory: { north: 7, south: 0 } };
    render(<WarehouseStockTable products={[simple]} warehouses={[...warehouses, { id: 'unknown', name: 'Unknown' }]} warehouseId="" onShowAll={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Hat' }));
    expect(screen.getByText('North')).toBeInTheDocument();
    expect(screen.queryByText('South')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
    expect(screen.getByText('1 warehouses with stock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show other warehouses (2)' }));
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Out of stock')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Not recorded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show only warehouses with stock' }));
    expect(screen.queryByText('South')).not.toBeInTheDocument();
  });
  it('clears criteria without changing warehouse scope', () => {
    const onShowAll = vi.fn();
    render(<WarehouseStockTable products={products} warehouses={warehouses} warehouseId="north" onShowAll={onShowAll} />);
    fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'empty' } });
    expect(screen.queryByRole('button', { name: 'Shirt' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onShowAll).not.toHaveBeenCalled();
    expect(within(screen.getByRole('table')).getByText('5')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'SHIRT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Shirt SHIRT' }));
    fireEvent.click(screen.getByRole('button', { name: 'View this product in all warehouses' }));
    expect(onShowAll).toHaveBeenCalledOnce();
  });
  it('shows absent inventory as not recorded rather than out of stock', () => {
    render(<WarehouseStockTable products={products} warehouses={warehouses} warehouseId="south" onShowAll={() => {}} />);
    fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'untracked' } });
    expect(screen.getByRole('button', { name: 'Hat' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Not recorded')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Out of stock')).not.toBeInTheDocument();
  });
});
