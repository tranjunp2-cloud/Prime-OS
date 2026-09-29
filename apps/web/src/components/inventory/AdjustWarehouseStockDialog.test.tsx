// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as store from '@/lib/product-store';
import { AdjustWarehouseStockDialog } from './AdjustWarehouseStockDialog';
const base = store.getProducts()[0];
const warehouse = { id: 'wh_crjp', name: 'Japan HQ' };
const simple: store.Product = { ...base, has_variants: false, inventory: { wh_crjp: 7 }, inventory_adjustments: [] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(product = simple, location = warehouse) {
  vi.spyOn(store, 'getProducts').mockReturnValue([product]);
  const update = vi.spyOn(store, 'updateProduct').mockImplementation(() => {});
  const saved = vi.fn();
  render(<AdjustWarehouseStockDialog target={{ product, warehouse: location }} products={[product]} warehouses={[location]} onClose={vi.fn()} onSaved={saved} />);
  return { update, saved };
}
function fill(value: string) {
  fireEvent.change(screen.getByLabelText('New stock'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
}
describe('stock adjustments', () => {
  it('sets an absolute count and saves the reason with before/after', () => {
    const { update, saved } = setup();
    fill('10');
    expect(screen.getByText('7 → 10 units · Increase by 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
    expect(update).toHaveBeenCalledWith(simple.id, expect.objectContaining({ inventory: { wh_crjp: 10 }, inventory_adjustments: [expect.objectContaining({ before: 7, after: 10, reason: 'Physical stock count' })] }));
    expect(saved).toHaveBeenCalledOnce();
  });
  it('blocks negative, fractional and unchanged counts but allows zero', () => {
    setup();
    for (const value of ['-1', '1.5', '7', '']) { fill(value); expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled(); }
    fill('0');
    expect(screen.getByText('7 → 0 units · Decrease by 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeEnabled();
  });
  it('requires a child SKU and only changes that SKU', () => {
    const product = { ...simple, has_variants: true, skus: [{ ...base.skus[0], id: 'a', sku_code: 'A', variation_name: 'Blue', stock_by_location: { wh_crjp: 5 } }, { ...base.skus[0], id: 'b', sku_code: 'B', variation_name: 'Red', stock_by_location: { wh_crjp: 2 } }] };
    const { update } = setup(product);
    expect(screen.getByLabelText('New stock')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Variant SKU'), { target: { value: 'A' } });
    fill('8');
    fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
    expect(update.mock.calls[0][1].skus?.map(sku => sku.stock_by_location?.wh_crjp)).toEqual([8, 2]);
    expect(update.mock.calls[0][1].inventory).toEqual({ wh_crjp: 10 });
    expect(update.mock.calls[0][1].inventory_adjustments?.[0]).toMatchObject({ sku: 'A', before: 5, after: 8 });
  });
  it('clears the count and reason when the selected warehouse or product changes', () => {
    const product = { ...simple, inventory: { wh_crjp: 7, wh_rslsg: 3 } };
    const second = { ...simple, id: 'second', sku_code: 'SECOND', name: 'Second product', inventory: { wh_crjp: 2, wh_rslsg: 1 } };
    const update = vi.spyOn(store, 'updateProduct').mockImplementation(() => {});
    render(<AdjustWarehouseStockDialog target={{ product, warehouse }} products={[product, second]} warehouses={[warehouse, { id: 'wh_rslsg', name: 'Singapore' }]} onClose={vi.fn()} onSaved={vi.fn()} />);
    fill('10');
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_rslsg' } });
    expect(screen.getByLabelText('New stock')).toHaveValue(null);
    expect(screen.getByLabelText('Adjustment reason')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
    fill('5');
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'second' } });
    expect(screen.getByLabelText('New stock')).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
    expect(update).not.toHaveBeenCalled();
  });
  it('preserves a preselected child SKU and cancels without changing stock', () => {
    const product = { ...simple, has_variants: true, skus: [{ ...base.skus[0], id: 'a', sku_code: 'A', variation_name: 'Blue', stock_by_location: { wh_crjp: 5 } }] };
    const close = vi.fn();
    const update = vi.spyOn(store, 'updateProduct').mockImplementation(() => {});
    render(<AdjustWarehouseStockDialog target={{ product, warehouse, sku: 'A' }} products={[product]} warehouses={[warehouse]} onClose={close} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Variant SKU')).toHaveValue('A');
    fill('8');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });
  it('blocks external, unrecorded and stale stock', () => {
    const { update } = setup();
    fill('10');
    vi.mocked(store.getProducts).mockReturnValue([{ ...simple, inventory: { wh_crjp: 8 } }]);
    fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Stock changed');
    expect(update).not.toHaveBeenCalled();
    cleanup();
    setup(simple, { id: 'wh_fbajp', name: 'Amazon' });
    expect(screen.getByLabelText('New stock')).toBeDisabled();
    cleanup();
    setup({ ...simple, inventory: {} });
    expect(screen.getByRole('alert')).toHaveTextContent('No stock is recorded');
    expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
  });
});
