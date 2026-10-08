// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProducts, type Product } from '@/lib/product-store';
import type { InventoryPosition } from '@/lib/inventory-store';
import { WarehouseStockTable } from './WarehouseStockTable';
const warehouses = [{ id: 'north', name: 'North' }, { id: 'south', name: 'South' }];
const base = getProducts()[0];
const products: Product[] = [{ ...base, id: 'shirt', name: 'Shirt', sku_code: 'SHIRT', has_variants: true, inventory: { north: 999 }, skus: [{ ...base.skus[0], id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', stock_by_location: { north: 5, south: 2 } }, { ...base.skus[0], id: 'red', sku_code: 'RED', variation_name: 'Red', stock_by_location: { north: 0 } }] }, { ...base, id: 'hat', name: 'Hat', sku_code: 'HAT', has_variants: false, inventory: { north: 0 } }];
const pendingPosition = (product: Product, warehouseId: string, skuId = product.skus[0]?.id ?? `${product.id}_default`): InventoryPosition => ({ id: 'pending', product_id: product.id, sku_id: skuId, warehouse_id: warehouseId, on_hand: 0, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0, inbound: 4, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-10-08T00:00:00Z' });
afterEach(cleanup);
describe('warehouse table', () => {
  it('opens an edit for the exact warehouse without toggling the product row', () => {
    const onAdjustStock = vi.fn();
    const product = { ...products[1], inventory: { wh_crjp: 7, wh_fbajp: 2 } };
    const locations = [{ id: 'wh_crjp', name: 'Japan' }, { id: 'wh_fbajp', name: 'Amazon', external: true }];
    render(<WarehouseStockTable products={[product]} warehouses={locations} warehouseId="" onShowAll={() => {}} onAdjustStock={onAdjustStock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Hat' }));
    expect(screen.queryByRole('button', { name: 'Adjust stock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions for Hat at Amazon' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Hat at Japan' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Adjust stock' }));
    expect(onAdjustStock).toHaveBeenCalledWith({ product, warehouse: locations[0], sku: undefined });
    expect(screen.getByRole('button', { name: 'Collapse Hat' })).toBeInTheDocument();
  });
  it('offers initial stock for missing counts and keeps confirmed zero editable', () => {
    const onAdjustStock = vi.fn();
    const locations = [{ id: 'wh_crjp', name: 'Japan' }];
    const product = { ...products[1], inventory: {} };
    const view = render(<WarehouseStockTable products={[product]} positions={[pendingPosition(product, 'wh_crjp')]} warehouses={locations} warehouseId="wh_crjp" onShowAll={() => {}} onAdjustStock={onAdjustStock} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
    expect(screen.queryByRole('menuitem', { name: 'Adjust stock' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Record opening stock' }));
    expect(onAdjustStock).toHaveBeenCalledWith({ product, warehouse: locations[0], initializeLocation: true });
    const empty = { ...product, inventory: { wh_crjp: 0 } };
    view.rerender(<WarehouseStockTable products={[empty]} warehouses={locations} warehouseId="wh_crjp" onShowAll={() => {}} onAdjustStock={onAdjustStock} />);
    expect(within(screen.getByRole('table')).getByText('Out of stock')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
    expect(screen.queryByRole('menuitem', { name: 'Record opening stock' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Adjust stock' }));
    expect(onAdjustStock).toHaveBeenLastCalledWith({ product: empty, warehouse: locations[0], sku: undefined });
  });
  it('does not silently choose a warehouse when adjusting a combined product row', () => {
    const onAdjustStock = vi.fn();
    const product = { ...products[1], inventory: { wh_crjp: 7, wh_rslsg: 2 } };
    render(<WarehouseStockTable products={[product]} warehouses={[{ id: 'wh_crjp', name: 'Japan' }, { id: 'wh_rslsg', name: 'Singapore' }]} warehouseId="" onShowAll={() => {}} onAdjustStock={onAdjustStock} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Hat' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Adjust stock' }));
    expect(onAdjustStock).toHaveBeenCalledWith({ product, warehouse: undefined, sku: undefined });
    expect(screen.getByRole('button', { name: 'Expand Hat' })).toBeInTheDocument();
  });
  it('offers initial stock for unrecorded variants at parent and SKU level without unusable holds', () => {
    const onAdjustStock = vi.fn();
    const locations = [{ id: 'wh_crjp', name: 'Japan' }];
    const product = { ...products[0], skus: products[0].skus.map(sku => ({ ...sku, stock_by_location: {} })) };
    render(<WarehouseStockTable products={[product]} positions={[pendingPosition(product, 'wh_crjp', 'blue')]} warehouses={locations} warehouseId="wh_crjp" onShowAll={() => {}} onAdjustStock={onAdjustStock} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Shirt at Japan' }), { key: 'Enter' });
    expect(screen.queryByRole('menuitem', { name: 'Adjust stock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Manage holds' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Record opening stock' }));
    expect(onAdjustStock).toHaveBeenLastCalledWith({ product, warehouse: locations[0], sku: undefined, initializeLocation: true });
    fireEvent.click(screen.getByRole('button', { name: 'Expand Shirt' }));
    expect(screen.queryByText('RED')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for BLUE at Japan' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Record opening stock' }));
    expect(onAdjustStock).toHaveBeenLastCalledWith({ product, warehouse: locations[0], sku: 'BLUE', initializeLocation: true });
  });
  it('does not offer holds for a known count with missing reservation data', () => {
    render(<WarehouseStockTable products={[{ ...products[1], inventory: { wh_crjp: 10 } }]} positions={[]} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="wh_crjp" onShowAll={() => {}} onAdjustStock={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
    expect(screen.getByRole('menuitem', { name: 'Adjust stock' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Manage holds' })).not.toBeInTheDocument();
  });
  it('groups each master once across warehouses and expands distribution', () => {
    render(<WarehouseStockTable products={products} warehouses={warehouses} warehouseId="" onShowAll={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Shirt' })).toHaveLength(1);
    expect(screen.getByRole('columnheader', { name: /^Product/ })).toHaveTextContent('2 products');
    expect(within(screen.getByRole('columnheader', { name: /^Stock/ })).getByText('7')).toBeInTheDocument();
    expect(within(screen.getByRole('table').querySelector('tbody')!).getByText('7')).toBeInTheDocument();
    expect(within(screen.getByRole('table').querySelector('tbody')!).queryByText('999')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Shirt' }));
    expect(within(screen.getByRole('columnheader', { name: /^Stock/ })).getByText('7')).toBeInTheDocument();
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(screen.queryByText(/partial total/i)).not.toBeInTheDocument();
    expect(screen.getByRole('table').querySelector('sup')).toBeNull();
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
  it('shows related warehouses including zero and hides unrelated locations', () => {
    const simple = { ...products[1], inventory: { north: 7, south: 0 } };
    render(<WarehouseStockTable products={[simple]} positions={[]} warehouses={[...warehouses, { id: 'unknown', name: 'Unknown' }]} warehouseId="" onShowAll={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Hat' }));
    expect(screen.getByText('North')).toBeInTheDocument();
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
    expect(screen.getByLabelText('1 warehouse with stock')).toBeInTheDocument();
    expect(within(screen.getByRole('table').querySelector('tbody')!).getByText('Out of stock')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Show other warehouses/ })).not.toBeInTheDocument();
  });
  it('clears criteria without changing warehouse scope', () => {
    const onShowAll = vi.fn();
    render(<WarehouseStockTable products={products} warehouses={warehouses} warehouseId="north" onShowAll={onShowAll} />);
    fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'empty' } });
    expect(screen.queryByRole('button', { name: 'Shirt' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onShowAll).not.toHaveBeenCalled();
    expect(within(screen.getByRole('table').querySelector('tbody')!).getByText('5')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'SHIRT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Shirt SHIRT' }));
    fireEvent.click(screen.getByRole('button', { name: 'View this product in all warehouses' }));
    expect(onShowAll).toHaveBeenCalledOnce();
  });
  it('retains incoming inventory with an unknown count rather than showing out of stock', () => {
    render(<WarehouseStockTable products={products} positions={[pendingPosition(products[1], 'south')]} warehouses={warehouses} warehouseId="south" onShowAll={() => {}} />);
    fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'untracked' } });
    expect(screen.getByRole('button', { name: 'Hat' })).toBeInTheDocument();
    expect(screen.getByText('Incoming stock · Count not recorded')).toBeVisible();
    expect(within(screen.getByRole('table').querySelector('tbody')!).getByLabelText('Not recorded')).toBeInTheDocument();
    expect(within(screen.getByRole('table').querySelector('tbody')!).queryByTitle('Out of stock')).not.toBeInTheDocument();
  });
});

it('opens focused read-only order and hold breakdowns without expanding the product', () => {
  const product = { ...products[1], skus: [], inventory: { wh_crjp: 20 } };
  const positions = [{ id: 'pos', product_id: product.id, sku_id: `${product.id}_default`, warehouse_id: 'wh_crjp', on_hand: 20, reserved_unpaid: 2, reserved_paid: 3, allocated: 1, safety_stock: 3, campaign_lock: 2, unfulfillable: 1, inbound: 30, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' }];
  render(<WarehouseStockTable products={[product]} positions={positions} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="" onShowAll={() => {}} />);
  const row = screen.getByRole('button', { name: 'Hat' }).closest('tr')!;
  fireEvent.click(within(row).getByRole('button', { name: 'Order holds for Hat' }));
  let detail = within(screen.getByRole('dialog'));
  expect(detail.getByRole('heading', { name: 'Held for orders' })).toBeInTheDocument();
  expect(detail.getByText('Paid order holds')).toBeInTheDocument();
  expect(detail.queryByText('Safety stock')).not.toBeInTheDocument();
  expect(detail.queryByRole('button', { name: 'Manage holds' })).not.toBeInTheDocument();
  fireEvent.click(detail.getByRole('button', { name: 'Close' }));
  expect(row).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(within(row).getByRole('button', { name: 'Other holds for Hat' }));
  detail = within(screen.getByRole('dialog'));
  expect(detail.getByText('Safety stock')).toBeInTheDocument();
  expect(detail.getByText('Campaign holds')).toBeInTheDocument();
  expect(detail.queryByText('Paid order holds')).not.toBeInTheDocument();
  fireEvent.click(detail.getByRole('button', { name: 'Manage holds' }));
  expect(screen.getByRole('heading', { name: 'Manage holds' })).toBeInTheDocument();
  expect(screen.getByLabelText('Warehouse')).toHaveValue('wh_crjp');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('heading', { name: 'Other holds' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(row).toHaveAttribute('aria-expanded', 'false');
});

it('leaves zero holds as plain numbers and still offers Manage holds in Actions', () => {
  const product = { ...products[1], skus: [], inventory: { wh_crjp: 20 } };
  const positions = [{ id: 'zero', product_id: product.id, sku_id: `${product.id}_default`, warehouse_id: 'wh_crjp', on_hand: 20, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' }];
  render(<WarehouseStockTable products={[product]} positions={positions} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="wh_crjp" onShowAll={() => {}} />);
  expect(screen.queryByRole('button', { name: /^Order holds for/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Other holds for/ })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('button', { name: /^Actions for/ }), { key: 'Enter' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Manage holds' }));
  expect(screen.getByRole('heading', { name: 'Manage holds' })).toBeInTheDocument();
});

it('shows ATP separately, explains deductions and filters unavailable ATP without treating missing data as zero', () => {
  const known = { ...products[1], skus: [], inventory: { wh_crjp: 10 } };
  const unknown = { ...known, id: 'missing', name: 'Missing ATP' };
  const positions = [{ id: 'pos', product_id: known.id, sku_id: `${known.id}_default`, warehouse_id: 'wh_crjp', on_hand: 10, reserved_unpaid: 4, reserved_paid: 2, allocated: 0, safety_stock: 3, campaign_lock: 0, unfulfillable: 1, inbound: 30, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' }];
  render(<WarehouseStockTable products={[known, unknown]} positions={positions} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="wh_crjp" onShowAll={() => {}} />);
  const row = screen.getByRole('button', { name: 'Hat' }).closest('tr')!;
  expect(within(row).getByText('10')).toBeInTheDocument();
  expect(within(row).getByText('6')).toBeInTheDocument();
  expect(within(row).getByText('4')).toBeInTheDocument();
  expect(within(row).getByRole('button', { name: /Stock breakdown/ })).toHaveTextContent('0');
  expect(within(row).queryByText('Out of stock')).not.toBeInTheDocument();
  fireEvent.click(within(row).getByRole('button', { name: /Stock breakdown/ }));
  const detail = within(screen.getByRole('dialog'));
  expect(detail.getByText('Unpaid order holds')).toBeInTheDocument();
  expect(detail.getByText('Incoming · not included in ATP')).toBeInTheDocument();
  expect(detail.getByText('30')).toBeInTheDocument();
  fireEvent.click(detail.getByRole('button', { name: 'Close' }));
  fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'no-atp' } });
  expect(screen.getByRole('columnheader', { name: /^Product/ })).toHaveTextContent('1 product');
  expect(within(screen.getByRole('columnheader', { name: /^Stock/ })).getByText('10')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hat' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Missing ATP' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'unknown-atp' } });
  expect(screen.getByRole('button', { name: 'Missing ATP' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hat' })).not.toBeInTheDocument();
});

it('keeps catalog-only products out of search and filters and offers opening setup', () => {
  const catalog = { ...products[1], id: 'catalog', name: 'Catalog only', sku_code: 'CATALOG', skus: [], inventory: {} };
  const setup = vi.fn();
  render(<WarehouseStockTable products={[...products, catalog]} positions={[]} warehouses={warehouses} warehouseId="north" onShowAll={() => {}} onRecordOpeningStock={setup} />);
  expect(screen.getByRole('columnheader', { name: /^Product/ })).toHaveTextContent('2 products');
  fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'CATALOG' } });
  expect(screen.queryByRole('button', { name: /Catalog only/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Matching products')).not.toBeInTheDocument();
  expect(screen.getByText('No warehouse products match')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Record opening stock' }));
  expect(setup).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'untracked' } });
  expect(screen.queryByRole('button', { name: /Catalog only/ })).not.toBeInTheDocument();
});

it('limits a searched product distribution and expanded variants to related locations', () => {
  render(<WarehouseStockTable products={products} positions={[]} warehouses={[...warehouses, { id: 'unused', name: 'Unused' }]} warehouseId="" initialSearch="SHIRT" onShowAll={() => {}} />);
  expect(screen.getByRole('columnheader', { name: /^Warehouse/ })).toHaveTextContent('2 warehouses');
  expect(screen.queryByText('Unused')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Expand South' }));
  expect(screen.getByText('BLUE')).toBeVisible();
  expect(screen.queryByText('RED')).not.toBeInTheDocument();
});

it('shows actual order references and preserves unverified legacy holds without inventing a shop', () => {
  const product = { ...products[1], skus: [], inventory: { wh_crjp: 8 }, channels: [] };
  const position = { ...pendingPosition(product, 'wh_crjp'), on_hand: 8, inbound: 0, reserved_paid: 2, order_holds: [{ orderId: 'order-1', orderNumber: 'ORDER-TEST-1', lineId: 'line-1', source: 'Manual order', state: 'reserved_paid' as const, quantity: 2 }] };
  const view = render(<WarehouseStockTable products={[product]} positions={[position]} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="wh_crjp" onShowAll={() => {}} />);
  expect(screen.getByText('No shops currently using')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Order holds for Hat at Japan' }));
  expect(within(screen.getByRole('dialog')).getByText('ORDER-TEST-1')).toBeVisible();
  expect(within(screen.getByRole('dialog')).getByText('Manual order · Reserved')).toBeVisible();
  expect(within(screen.getByRole('dialog')).getByText('2 units')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  view.rerender(<WarehouseStockTable products={[product]} positions={[{ ...position, reserved_paid: 3 }]} warehouses={[{ id: 'wh_crjp', name: 'Japan' }]} warehouseId="wh_crjp" onShowAll={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Order holds for Hat at Japan' }));
  expect(within(screen.getByRole('dialog')).queryByText('ORDER-TEST-1')).not.toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByText(/Order references are unavailable for these 3 units/)).toBeVisible();
});
