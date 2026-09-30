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
function setup(product = simple, location = warehouse, initializeLocation = false) {
  vi.spyOn(store, 'getProducts').mockReturnValue([product]);
  const update = vi.spyOn(store, 'updateProduct').mockImplementation(() => {});
  const saved = vi.fn();
  render(<AdjustWarehouseStockDialog target={{ product, warehouse: location }} products={[product]} warehouses={[location]} onClose={vi.fn()} onSaved={saved} initializeLocation={initializeLocation} />);
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
    expect(update).toHaveBeenCalledWith(simple.id, expect.objectContaining({ inventory: { wh_crjp: 10 }, inventory_adjustments: [expect.objectContaining({ before: 7, after: 10, reason: 'Physical stock count' })] }), { requirePersistence: true });
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
  it('requires a valid first count and a reason, and saves unknown-to-zero accurately', () => {
    const { update } = setup({ ...simple, inventory: {} }, warehouse, true);
    const save = screen.getByRole('button', { name: 'Save location & stock' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '0' } });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
    for (const value of ['', '-1', '0.5']) {
      fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value } });
      expect(save).toBeDisabled();
    }
    fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '0' } });
    expect(screen.getByText('Not recorded → 0 units · Initial count')).toBeInTheDocument();
    fireEvent.click(save);
    expect(update).toHaveBeenCalledWith(simple.id, expect.objectContaining({ inventory: { wh_crjp: 0 }, inventory_adjustments: [expect.objectContaining({ before: null, after: 0 })] }), { requirePersistence: true });
  });
  it('does not overwrite a location recorded while the add form was open', () => {
    const { update } = setup({ ...simple, inventory: {} }, warehouse, true);
    fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
    vi.mocked(store.getProducts).mockReturnValue([{ ...simple, inventory: { wh_crjp: 0 } }]);
    fireEvent.click(screen.getByRole('button', { name: 'Save location & stock' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Stock changed');
    expect(update).not.toHaveBeenCalled();
  });
  it('does not initialize external or already recorded locations', () => {
    setup({ ...simple, inventory: {} }, { id: 'wh_fbajp', name: 'Amazon' }, true);
    expect(screen.getByLabelText('Initial stock')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save location & stock' })).toBeDisabled();
    cleanup();
    setup({ ...simple, inventory: { wh_crjp: 0 } }, warehouse, true);
    expect(screen.getByRole('alert')).toHaveTextContent('Stock is already recorded');
    expect(screen.getByRole('button', { name: 'Save location & stock' })).toBeDisabled();
  });
  it('records the chosen variant only and keeps its initial audit balance unknown', () => {
    const product = { ...simple, has_variants: true, skus: [{ ...base.skus[0], id: 'a', sku_code: 'A', stock_by_location: {} }, { ...base.skus[0], id: 'b', sku_code: 'B', stock_by_location: { wh_crjp: 3 } }] };
    const { update, saved } = setup(product, warehouse, true);
    expect(screen.getByLabelText('Initial stock')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Variant SKU'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save location & stock' }));
    expect(update.mock.calls[0][1].skus?.map(sku => sku.stock_by_location?.wh_crjp)).toEqual([8, 3]);
    expect(update.mock.calls[0][1].inventory.wh_crjp).toBe(11);
    expect(update.mock.calls[0][1].inventory_adjustments?.[0]).toMatchObject({ sku: 'A', before: null, after: 8 });
    expect(saved).toHaveBeenCalledOnce();
  });
  it('switches from adjustment to initial stock inside the same dialog and reports save failures', () => {
    const { update, saved } = setup({ ...simple, inventory: {} });
    fireEvent.click(screen.getByRole('button', { name: 'Record initial stock' }));
    expect(screen.getByRole('heading', { name: 'Record initial stock' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Initial stock'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
    update.mockImplementation(() => { throw new Error('Storage is full'); });
    fireEvent.click(screen.getByRole('button', { name: 'Save location & stock' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Storage is full');
    expect(saved).not.toHaveBeenCalled();
    update.mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Save location & stock' }));
    expect(saved).toHaveBeenCalledOnce();
  });
});
