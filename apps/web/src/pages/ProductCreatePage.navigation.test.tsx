// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'compact-product-navigation-test';
const labels = ['Overview', 'Product data', 'Pricing & Inventory', 'Channel listings', 'Activity history'];

async function mount(viewer = false) {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=product-data${viewer ? '&mode=viewer' : ''}`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  addProduct({ ...getProducts()[0], id, name: 'Compact navigation fixture', sku_code: 'COMPACT-NAV-TEST',
    category: '', categoryId: undefined, description: 'Shared product content.', retail_price: 100,
    price_currency: 'JPY', has_variants: false, product_type: 'single', variant_options: [], skus: [],
    localized_content: {}, inventory: {}, status: 'draft', import_source: undefined, import_sources: [],
    import_result: undefined, import_issues: [], revisions: [], channel_overrides: {}, channels: [], record_version: 1 });
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });

describe('Compact Product Master navigation', () => {
  it('shows exactly five destinations without group titles or help buttons', async () => {
    await mount();
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    expect(navigation.getAllByRole('button').map(button => button.textContent)).toEqual(labels);
    expect(navigation.queryByText('Product Master', { exact: true })).not.toBeInTheDocument();
    expect(navigation.queryByText('Shop listings', { exact: true })).not.toBeInTheDocument();
    expect(navigation.queryByRole('button', { name: /^About/ })).not.toBeInTheDocument();
    expect(navigation.getByRole('button', { name: 'Product data', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(navigation.getAllByRole('option').map(option => option.textContent)).toEqual(labels);
  });

  it('keeps desktop and mobile selection in sync without losing unsaved data', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    fireEvent.change(document.getElementById('product-name')!, { target: { value: 'Unsaved product name' } });
    fireEvent.click(navigation.getByRole('button', { name: 'Pricing & Inventory' }));
    expect(navigation.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('commerce');
    expect(navigation.getByRole('button', { name: 'Pricing & Inventory' })).toHaveAttribute('aria-current', 'page');
    expect(navigation.getByRole('button', { name: 'Product data' })).not.toHaveAttribute('aria-current');
    fireEvent.change(navigation.getByRole('combobox', { name: 'Product editor section' }), { target: { value: 'product-data' } });
    expect(document.getElementById('product-name')).toHaveValue('Unsaved product name');
    expect(navigation.getByRole('button', { name: 'Product data' })).toHaveAttribute('aria-current', 'page');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('keeps Activity history directly after Channel listings in the same uniform navigation list', async () => {
    await mount();
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    const buttons = navigation.getAllByRole('button');
    const list = buttons[0].parentElement;
    expect(list?.children).toHaveLength(5);
    for (const button of buttons) {
      expect(button.parentElement).toBe(list);
      expect(button.className).toBe(buttons[0].className);
    }
    const activity = navigation.getByRole('button', { name: 'Activity history' });
    expect(navigation.getByRole('button', { name: 'Channel listings' }).nextElementSibling).toBe(activity);
    fireEvent.click(activity);
    expect(activity).toHaveAttribute('aria-current', 'page');
    expect(navigation.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('activity');
  });

  it('keeps navigation available to read-only viewers without enabling editing', async () => {
    await mount(true);
    const before = JSON.stringify(getProductById(id));
    const navigation = within(screen.getByRole('navigation', { name: 'Product editor workspaces' }));
    for (const button of navigation.getAllByRole('button')) expect(button).toBeEnabled();
    fireEvent.click(navigation.getByRole('button', { name: 'Channel listings' }));
    expect(navigation.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('distribution');
    fireEvent.click(navigation.getByRole('button', { name: 'Product data' }));
    expect(document.getElementById('product-name')).toBeDisabled();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
});
