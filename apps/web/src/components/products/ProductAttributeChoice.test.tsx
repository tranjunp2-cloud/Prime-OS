// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductAttributeChoice } from './ProductAttributeChoice';
import type { CatalogAttribute } from '@/lib/product-catalog-settings-store';

const attribute: CatalogAttribute & { required: boolean } = { id: 'color', key: 'color', name: 'Color', type: 'Single select', options: 'White, Black', unit: '', validation: '', description: '', categories: 1, isLocalizable: false, status: 'Active', source: 'internal', required: false };
afterEach(cleanup);
function mount({ type = 'Single select', initial = 'White', disabled = false } = {}) {
  const change = vi.fn();
  function Editor() {
    const [value, setValue] = useState(initial);
    return <ProductAttributeChoice attribute={{ ...attribute, type }} value={value} disabled={disabled} onChange={next => { change(next); setValue(next); }} />;
  }
  render(<Editor />);
  return change;
}
function enter(value: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add Color value' }));
  fireEvent.change(screen.getByLabelText('New color value'), { target: { value } });
}
describe('Product-only inline attribute choices', () => {
  it('adds and selects a normalized value without changing the catalog definition', () => {
    const change = mount();
    enter('  Cloud   Blue  ');
    expect(screen.getByText('This product only. Saved with the product.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(change).toHaveBeenLastCalledWith('Cloud Blue');
    expect(screen.getByRole('combobox', { name: 'Color' })).toHaveValue('Cloud Blue');
    expect(attribute.options).toBe('White, Black');
    expect(screen.queryByLabelText('New color value')).not.toBeInTheDocument();
  });
  it('reuses an existing option ignoring case and whitespace, without duplicating it', () => {
    const change = mount();
    enter(' black ');
    fireEvent.keyDown(screen.getByLabelText('New color value'), { key: 'Enter' });
    expect(change).toHaveBeenLastCalledWith('Black');
    expect(screen.getAllByRole('option', { name: 'Black', exact: true })).toHaveLength(1);
  });
  it.each(['Multi-select', 'Array'])('preserves other selections and allows removing a custom %s value', type => {
    const change = mount({ type });
    enter('Blue');
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(change).toHaveBeenLastCalledWith('White, Blue');
    expect(screen.getByRole('button', { name: 'Blue', exact: true })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Blue', exact: true }));
    expect(change).toHaveBeenLastCalledWith('White');
  });
  it('shows imported/custom single values on remount instead of an empty select', () => {
    mount({ type: 'Enum', initial: 'Cloud White' });
    expect(screen.getByRole('combobox', { name: 'Color' })).toHaveValue('Cloud White');
    expect(screen.getByRole('option', { name: 'Cloud White' })).toBeInTheDocument();
  });
  it('validates empty and comma-separated additions inline without updating the product', () => {
    const change = mount();
    enter(' ');
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value.');
    fireEvent.change(screen.getByLabelText('New color value'), { target: { value: 'Blue, Red' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('without commas');
    expect(change).not.toHaveBeenCalled();
  });
  it('cancels with either Cancel or Escape without changing the selected value', () => {
    const change = mount();
    enter('Blue'); fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    enter('Red'); fireEvent.keyDown(screen.getByLabelText('New color value'), { key: 'Escape' });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Color' })).toHaveValue('White');
  });
  it.each(['Single select', 'Multi-select'])('has no add action and disables %s controls for viewers', type => {
    mount({ type, disabled: true });
    expect(screen.queryByRole('button', { name: 'Add Color value' })).not.toBeInTheDocument();
    expect(type === 'Single select' ? screen.getByRole('combobox') : screen.getByRole('button', { name: 'White' })).toBeDisabled();
  });
});
