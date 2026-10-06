// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProductDialog } from './CreateProductDialog';
import { getProductCatalogSettings, saveProductCatalogSettings, type CatalogCategory } from '@/lib/product-catalog-settings-store';

const initialSettings = getProductCatalogSettings();
const category = (id: string, name: string, parentId: string | null = null, status: CatalogCategory['status'] = 'Active'): CatalogCategory => ({
  ...initialSettings.categories[0], id, name, parentId, status, attributes: [],
});
const categories = [category('art', 'Art'), category('office', 'Office'), category('art-tools', 'Tools', 'art'), category('office-tools', 'Tools', 'office'), category('hidden', 'Retired category', null, 'Inactive')];

beforeEach(() => {
  saveProductCatalogSettings({ ...initialSettings, categories });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); saveProductCatalogSettings(initialSettings); vi.unstubAllGlobals(); });

function fillIdentity() {
  fireEvent.change(screen.getByLabelText(/Master SKU/), { target: { value: ' new-001 ' } });
  fireEvent.change(screen.getByLabelText(/Product name/), { target: { value: ' New product ' } });
}
function selectCategory(path = 'Art / Tools') {
  fireEvent.click(screen.getByRole('combobox', { name: /Category/ }));
  fireEvent.click(screen.getByRole('option', { name: path }));
}

describe('Create Product Master category', () => {
  it('keeps the entered form and reports an unsuccessful save instead of claiming success', () => {
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={[]} onConfirm={() => { throw new Error('Storage unavailable'); }} />);
    fillIdentity();
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
    expect(screen.getByLabelText(/Product name/)).toHaveValue(' New product ');
  });
  it('generates an unused SKU and offers an existing product without forcing reuse', () => {
    const onOpenExisting = vi.fn();
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={['PRD-0001']} existingProducts={[{ id: 'existing', name: 'Blue notebook', sku_code: 'BOOK-1' }]} onOpenExisting={onOpenExisting} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate SKU' }));
    expect(screen.getByLabelText(/Master SKU/)).toHaveValue('PRD-0002');
    fireEvent.change(screen.getByLabelText(/Product name/), { target: { value: 'Blue note' } });
    fireEvent.click(screen.getByRole('button', { name: /Blue notebook/ }));
    expect(onOpenExisting).toHaveBeenCalledWith('existing');
  });
  it('searches active category paths and saves the selected ID, not an ambiguous name', () => {
    const onConfirm = vi.fn();
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={[]} onConfirm={onConfirm} />);
    fillIdentity();
    fireEvent.click(screen.getByRole('combobox', { name: /Category/ }));
    expect(screen.queryByRole('option', { name: 'Retired category' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Search categories' }), { target: { value: 'Office Tools' } });
    expect(screen.queryByRole('option', { name: 'Art / Tools' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Office / Tools' }));
    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveTextContent('Office / Tools');
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(onConfirm).toHaveBeenCalledWith({ sku: 'NEW-001', name: 'New product', productType: 'single', category: 'Tools', categoryId: 'office-tools' });
  });

  it('allows a draft without category and supports clearing a selection', () => {
    const onConfirm = vi.fn();
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={[]} onConfirm={onConfirm} />);
    fillIdentity();
    selectCategory();
    fireEvent.click(screen.getByRole('button', { name: 'Clear category' }));
    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveTextContent('Select category');
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ category: '', categoryId: undefined }));
  });

  it('keeps entered identity when search has no results', () => {
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={[]} onConfirm={vi.fn()} />);
    fillIdentity();
    fireEvent.click(screen.getByRole('combobox', { name: /Category/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Search categories' }), { target: { value: 'nonexistent' } });
    expect(screen.getByText('No categories found.')).toBeVisible();
    expect(screen.getByLabelText(/Master SKU/)).toHaveValue(' NEW-001 ');
    expect(screen.getByLabelText(/Product name/)).toHaveValue(' New product ');
  });

  it('does not invent categories or block draft creation when no active categories exist', () => {
    saveProductCatalogSettings({ ...initialSettings, categories: [] });
    const onConfirm = vi.fn();
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={[]} onConfirm={onConfirm} />);
    fillIdentity();
    expect(screen.getByRole('combobox', { name: /Category/ })).toBeDisabled();
    expect(screen.getByText(/No active categories yet/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it.each(['inactive', 'removed'])('requires a new choice if the selected category becomes %s before saving', state => {
    const onConfirm = vi.fn();
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={[]} onConfirm={onConfirm} />);
    fillIdentity();
    selectCategory();
    saveProductCatalogSettings({ ...initialSettings, categories: state === 'removed' ? categories.filter(item => item.id !== 'art-tools') : categories.map(item => item.id === 'art-tools' ? { ...item, status: 'Inactive' } : item) });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This category is no longer available.');
    fireEvent.click(screen.getByRole('button', { name: 'Clear category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('resets category together with identity when the dialog is closed and reopened', () => {
    const props = { onOpenChange: vi.fn(), existingSkus: [], onConfirm: vi.fn() };
    const { rerender } = render(<CreateProductDialog {...props} open />);
    fillIdentity();
    selectCategory();
    rerender(<CreateProductDialog {...props} open={false} />);
    rerender(<CreateProductDialog {...props} open />);
    expect(screen.getByRole('combobox', { name: /Category/ })).toHaveTextContent('Select category');
    expect(screen.getByLabelText(/Master SKU/)).toHaveValue('');
    expect(screen.getByLabelText(/Product name/)).toHaveValue('');
  });

  it('preserves duplicate SKU validation with a category selected', () => {
    const onConfirm = vi.fn();
    render(<CreateProductDialog open onOpenChange={vi.fn()} existingSkus={['new-001']} onConfirm={onConfirm} />);
    fillIdentity();
    selectCategory();
    fireEvent.click(screen.getByRole('button', { name: 'Create draft & continue' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This Master SKU already exists.');
  });
});
