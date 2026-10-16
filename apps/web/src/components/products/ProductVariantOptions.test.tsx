// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductVariantOptions, type VariantMatrixDraft } from './ProductVariantOptions';
afterEach(cleanup);
const attributes = [{ key: 'material', name: 'Material', options: ['Paper', 'Cotton', 'Polyester'], currentValues: ['Cotton', 'Polyester'] }, { key: 'color', name: 'Color', options: ['White', 'Black'], currentValues: ['White'] }];
const props = { groups: [], items: [], attributes, parentSku: 'NOTE', basePrice: '20', disabled: false, onEditingChange: vi.fn(), renderMatrix: ({ items, onToggleCombination, onItemsChange }: VariantMatrixDraft) => <div>{items.map(item => <div key={item.key}><input type="checkbox" aria-label={'Include ' + item.key} checked={item.selected} onChange={event => onToggleCombination(item.key, event.target.checked)} /><input aria-label={'Price for ' + item.key} value={item.price} onChange={event => onItemsChange(items.map(row => row.key === item.key ? { ...row, price: event.target.value } : row))} /></div>)}</div>, onApply: vi.fn() };
describe('ProductVariantOptions', () => {
  it('generates combinations immediately after opting into variants without selecting catalog defaults', () => {
    const onApply = vi.fn(), onGroupsChange = vi.fn();
    render(<ProductVariantOptions {...props} autoInitialize onApply={onApply} onGroupsChange={onGroupsChange} />);
    expect(screen.getByLabelText('Price for Cotton / White')).toHaveValue('20');
    expect(screen.getByLabelText('Price for Polyester / White')).toHaveValue('20');
    expect(screen.queryByLabelText('Price for Paper / Black')).not.toBeInTheDocument();
    expect(onGroupsChange).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Array), expect.arrayContaining([
      expect.objectContaining({ key: 'Cotton / White', stock: '', stock_by_location: {} }),
      expect.objectContaining({ key: 'Polyester / White', stock: '', stock_by_location: {} }),
    ]));
  });
  it('retains the original single automatically only when its version is unambiguous', () => {
    const onApply = vi.fn();
    render(<ProductVariantOptions {...props} autoInitialize attributes={attributes.map(attribute => ({ ...attribute, currentValues: attribute.currentValues.slice(0, 1) }))}
      items={[{ id: 'old', key: 'Existing single SKU', sku_code: 'OLD', price: '45', image_url: '/old.jpg', stock: '5', stock_by_location: { wh: '5' }, selected: true, option_values: {} }]}
      onApply={onApply} />);
    expect(screen.getByLabelText('Price for Cotton / White')).toHaveValue('45');
    expect(screen.queryByLabelText('Keep SKU OLD as')).not.toBeInTheDocument();
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Array), [expect.objectContaining({ id: 'old', stock_by_location: { wh: '5' }, image_url: '/old.jpg', price: '45' })]);
  });
  it('shows the generated matrix but requires mapping for an ambiguous single', () => {
    const onApply = vi.fn(), pending = vi.fn();
    render(<ProductVariantOptions {...props} autoInitialize
      items={[{ id: 'old', key: 'Existing single SKU', sku_code: 'OLD', price: '45', image_url: '', stock: '5', stock_by_location: {}, selected: true, option_values: {} }]}
      onApply={onApply} onEditingChange={pending} />);
    expect(screen.getByLabelText('Price for Cotton / White')).toBeVisible();
    expect(pending).toHaveBeenLastCalledWith(true);
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Keep SKU OLD as'), { target: { value: 'Cotton / White' } });
    expect(pending).toHaveBeenLastCalledWith(false);
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Array), expect.arrayContaining([expect.objectContaining({ id: 'old', price: '45', stock: '5' }), expect.objectContaining({ key: 'Polyester / White', stock: '', stock_by_location: {} })]));
  });
  it('does not initialize for a viewer or overwrite a saved sparse matrix', () => {
    const onApply = vi.fn(), onGroupsChange = vi.fn();
    const view = render(<ProductVariantOptions {...props} disabled autoInitialize onApply={onApply} onGroupsChange={onGroupsChange} />);
    expect(onApply).not.toHaveBeenCalled();
    expect(onGroupsChange).not.toHaveBeenCalled();
    view.unmount();
    render(<ProductVariantOptions {...props} autoInitialize groups={[{ id: 'color', name: 'Color', attributeKey: 'color', values: ['White', 'Black'] }]}
      items={[{ id: 'old', key: 'White', sku_code: 'OLD', price: '45', image_url: '', stock: '5', stock_by_location: {}, selected: true, option_values: { color: 'White' } }]}
      onApply={onApply} onGroupsChange={onGroupsChange} />);
    expect(screen.getByLabelText('Price for White')).toHaveValue('45');
    expect(screen.queryByLabelText('Price for Black')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
    expect(onGroupsChange).not.toHaveBeenCalled();
  });
  it('explains missing selections and never invents values when auto-generating', () => {
    const onApply = vi.fn(), pending = vi.fn();
    render(<ProductVariantOptions {...props} autoInitialize attributes={[{ ...attributes[1], currentValues: [] }]} renderAttributes={() => <div>Attributes</div>}
      onApply={onApply} onEditingChange={pending} />);
    expect(screen.getByText('Select at least one value for Color to generate your SKUs.')).toBeVisible();
    expect(pending).toHaveBeenLastCalledWith(true);
    expect(onApply).not.toHaveBeenCalled();
  });
  it('enforces the combination cap before building or applying an automatic matrix', () => {
    const onApply = vi.fn();
    render(<ProductVariantOptions {...props} autoInitialize attributes={attributes.map((attribute, index) => ({ ...attribute, currentValues: Array.from({ length: index ? 12 : 17 }, (_, n) => String(n)) }))} onApply={onApply} />);
    expect(screen.getByRole('alert')).toHaveTextContent('204 combinations exceed the 200-combination limit.');
    expect(onApply).not.toHaveBeenCalled();
  });
  it('does not auto-promote descriptive attributes and reuses a single value only after explicit choice', () => {
    render(<ProductVariantOptions {...props} />);
    expect(screen.queryByRole('group', { name: 'Material variant values' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Variant option type'), { target: { value: 'color' } });
    expect(within(screen.getByRole('group', { name: 'Color variant values' })).getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Variant option type'), { target: { value: 'material' } });
    expect(within(screen.getByRole('group', { name: 'Material variant values' })).getByRole('button', { name: 'Cotton' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('applies only checked combinations without changing shared catalog data', () => {
    const onApply = vi.fn();
    render(<ProductVariantOptions {...props} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Variant option type'), { target: { value: 'color' } });
    fireEvent.click(screen.getByRole('button', { name: 'Black' }));
    fireEvent.click(screen.getByLabelText('Include Black'));
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Array), [expect.objectContaining({ key: 'White' })]);
    expect(screen.queryByRole('button', { name: 'Apply SKU setup' })).not.toBeInTheDocument();
  });
  it('keeps edited prices when toggling combinations and does not emit for viewers', () => {
    const onApply = vi.fn();
    const view = render(<ProductVariantOptions {...props} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Variant option type'), { target: { value: 'color' } });
    fireEvent.click(screen.getByRole('button', { name: 'Black' }));
    fireEvent.change(screen.getByLabelText('Price for Black'), { target: { value: '35' } });
    fireEvent.click(screen.getByLabelText('Include Black'));
    fireEvent.click(screen.getByLabelText('Include Black'));
    expect(screen.getByLabelText('Price for Black')).toHaveValue('35');
    view.unmount();
    onApply.mockClear();
    render(<ProductVariantOptions {...props} disabled onApply={onApply} />);
    expect(screen.queryByLabelText('Variant option type')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
  it('shows no premature mapping errors, then blocks saving until an ambiguous single is mapped', () => {
    const onApply = vi.fn(), pending = vi.fn();
    render(<ProductVariantOptions {...props} attributes={attributes.map(attribute => ({ ...attribute, currentValues: [] }))}
      items={[{ id: 'old', key: 'Existing single SKU', sku_code: 'OLD', price: '45', image_url: '', stock: '5', stock_by_location: {}, selected: true, option_values: {} }]}
      onApply={onApply} onEditingChange={pending} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Keep SKU OLD as')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Variant option type'), { target: { value: 'color' } });
    fireEvent.click(screen.getByRole('button', { name: 'Black' }));
    expect(pending).toHaveBeenLastCalledWith(true);
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Keep SKU OLD as'), { target: { value: 'Black' } });
    expect(pending).toHaveBeenLastCalledWith(false);
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Array), [expect.objectContaining({ id: 'old', stock: '5', price: '45' })]);
  });
});
