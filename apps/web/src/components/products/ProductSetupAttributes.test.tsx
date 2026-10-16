// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductSetupAttributes, type SetupAttribute } from './ProductSetupAttributes';
import type { CatalogAttribute } from '@/lib/product-catalog-settings-store';
import type { VariantGroup } from '@/lib/product-master-readiness';

const color: SetupAttribute = { id: 'color', key: 'color', name: 'Color', type: 'Single select', options: 'White, Black', unit: '', validation: '', description: '', categories: 1, isLocalizable: false, status: 'Active', source: 'internal', required: false };
const size: SetupAttribute = { ...color, id: 'size', key: 'size', name: 'Size', options: 'S, M, L' };
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
function mount({ available = [color, size], disabled = false }: { available?: CatalogAttribute[]; disabled?: boolean } = {}) {
  const add = vi.fn();
  function Editor() {
    const [attributes, setAttributes] = useState([color]);
    return <ProductSetupAttributes attributes={attributes} available={available} groups={[]} withVariants={false} disabled={disabled}
      getValue={() => ''} onValueChange={() => {}} onGroupsChange={() => {}} onRemove={() => {}}
      onAdd={attribute => { add(attribute); setAttributes(current => [...current, { ...attribute, required: false }]); }}
      renderControl={attribute => <input aria-label={`${attribute.name} value`} />} />;
  }
  render(<Editor />);
  return add;
}
const trigger = () => screen.getByRole('button', { name: 'Add attribute' });
function open() { fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); }
function create() { open(); fireEvent.click(screen.getByRole('menuitem', { name: 'Create new attribute' })); }

describe('direct Add attribute menu', () => {
  it('opens available choices directly, without an intermediate select field', () => {
    mount(); open();
    expect(screen.getByRole('menu', { name: 'Available attributes' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Size' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Color' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Create new attribute' })).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Add attribute' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Attribute name')).not.toBeInTheDocument();
  });
  it('adds an existing choice once, closes the menu and restores focus', async () => {
    const add = mount(); open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Size' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(size);
    expect(screen.getByLabelText('Size value')).toBeInTheDocument();
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    open(); expect(screen.queryByRole('menuitem', { name: 'Size' })).not.toBeInTheDocument();
  });
  it('dismisses with Escape without adding anything', async () => {
    const add = mount(); open();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });
  it('opens only the custom form, focuses the name and supports validation and cancel', async () => {
    const add = mount(); create();
    await waitFor(() => expect(screen.getByLabelText('Attribute name')).toHaveFocus());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add to product' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an attribute name.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(trigger()).toHaveFocus();
    expect(screen.queryByLabelText('Attribute name')).not.toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });
  it('creates a product-local attribute from the menu and returns to the trigger', async () => {
    const add = mount(); create();
    fireEvent.change(screen.getByLabelText('Attribute name'), { target: { value: '  Surface   finish ' } });
    fireEvent.keyDown(screen.getByLabelText('Attribute name'), { key: 'Enter' });
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: 'Surface finish', type: 'Multi-select' }));
    expect(screen.getByLabelText('Surface finish value')).toBeInTheDocument();
    await waitFor(() => expect(trigger()).toHaveFocus());
  });
  it('keeps creation available when every existing attribute has been added', async () => {
    const add = mount({ available: [color] }); create();
    fireEvent.change(screen.getByLabelText('Attribute name'), { target: { value: 'Finish' } });
    fireEvent.keyDown(screen.getByLabelText('Attribute name'), { key: 'Escape' });
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(add).not.toHaveBeenCalled();
  });
  it('has no add action for read-only products', () => {
    mount({ disabled: true });
    expect(screen.queryByRole('button', { name: 'Add attribute' })).not.toBeInTheDocument();
  });
});

describe('attribute removal and requirements', () => {
  function editor({ required = false, groups = [] as VariantGroup[], disabled = false } = {}) {
    const onRemove = vi.fn(), onGroupsChange = vi.fn(), onValueChange = vi.fn();
    render(<ProductSetupAttributes attributes={[{ ...color, required }]} available={[color]} groups={groups} withVariants={groups.length > 0} disabled={disabled}
      getValue={() => 'White'} onValueChange={onValueChange} onGroupsChange={onGroupsChange} onRemove={onRemove} onAdd={() => {}}
      renderControl={attribute => <input aria-label={`${attribute.name} value`} />} />);
    return { onRemove, onGroupsChange, onValueChange };
  }
  const group: VariantGroup = { id: 'color-group', name: 'Color', attributeKey: 'color', values: ['White', 'Black'] };

  it('removes a descriptive attribute directly without modifying the variant matrix', () => {
    const { onRemove, onGroupsChange } = editor();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Color attribute' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(color);
    expect(onGroupsChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('explains an explicit category requirement and does not offer removal', () => {
    const { onRemove } = editor({ required: true });
    expect(screen.getByText('Required by category')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Remove Color attribute' })).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
  it('cancels variant removal without changing attributes, values or groups', async () => {
    const { onRemove, onGroupsChange, onValueChange } = editor({ groups: [group] });
    const remove = screen.getByRole('button', { name: 'Remove Color attribute' });
    fireEvent.click(remove);
    expect(screen.getByRole('alertdialog', { name: 'Remove Color?' })).toBeVisible();
    expect(screen.getByText(/This is your only variant attribute/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(remove).toHaveFocus());
    expect(onRemove).not.toHaveBeenCalled();
    expect(onGroupsChange).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('removes a variant attribute only after confirmation, leaving the other axis intact', () => {
    const sizeGroup: VariantGroup = { id: 'size-group', name: 'Size', attributeKey: 'size', values: ['S', 'M'] };
    const { onRemove, onGroupsChange } = editor({ groups: [group, sizeGroup] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Color attribute' }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove attribute' }));
    expect(onGroupsChange).toHaveBeenCalledExactlyOnceWith([sizeGroup]);
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(color);
  });
  it('also confirms changing an axis to a common attribute without removing that attribute', () => {
    const { onRemove, onGroupsChange, onValueChange } = editor({ groups: [group] });
    fireEvent.click(screen.getByLabelText('Create variants from Color'));
    expect(onGroupsChange).not.toHaveBeenCalled();
    expect(screen.getByText('Choose one shared color value after continuing.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Use as shared attribute' }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(color, '');
    expect(onGroupsChange).toHaveBeenCalledExactlyOnceWith([]);
    expect(onRemove).not.toHaveBeenCalled();
  });
  it('offers no remove control in read-only mode', () => {
    editor({ groups: [group], disabled: true });
    expect(screen.queryByRole('button', { name: 'Remove Color attribute' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Create variants from Color')).toBeDisabled();
  });
});

describe('automatic role for newly added attributes', () => {
  function mountVariant(initialGroups: VariantGroup[]) {
    const onGroupsChange = vi.fn();
    const note = { ...color, id: 'note', key: 'note', name: 'Note', type: 'Text' };
    function Editor() {
      const [attributes, setAttributes] = useState([color]);
      const [groups, setGroups] = useState(initialGroups);
      return <ProductSetupAttributes attributes={attributes} available={[color, size, note]} groups={groups} withVariants disabled={false}
        getValue={() => ''} onValueChange={() => {}} onGroupsChange={next => { onGroupsChange(next); setGroups(next); }} onRemove={() => {}}
        onAdd={attribute => setAttributes(current => [...current, { ...attribute, required: false }])}
        renderControl={attribute => <input aria-label={`${attribute.name} value`} />} />;
    }
    render(<Editor />);
    return onGroupsChange;
  }
  const colorGroup = { id: 'color', attributeKey: 'color', name: 'Color', values: ['White'] };
  it('adds a choice attribute to the matrix without a second checkbox click', () => {
    const changed = mountVariant([colorGroup]); open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Size' }));
    expect(screen.getByLabelText('Create variants from Size')).toBeChecked();
    expect(changed).toHaveBeenCalledWith([colorGroup, expect.objectContaining({ attributeKey: 'size', values: [] })]);
  });
  it('keeps descriptive text shared and never silently drops an existing axis at the limit', () => {
    const changed = mountVariant([colorGroup, { id: 'material', attributeKey: 'material', name: 'Material', values: ['Paper'] }]);
    open(); fireEvent.click(screen.getByRole('menuitem', { name: 'Size' }));
    expect(screen.getByLabelText('Create variants from Size')).not.toBeChecked();
    expect(screen.getByLabelText('Create variants from Size')).toBeDisabled();
    expect(changed).not.toHaveBeenCalled();
    open(); fireEvent.click(screen.getByRole('menuitem', { name: 'Note' }));
    expect(screen.queryByLabelText('Create variants from Note')).not.toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });
});
