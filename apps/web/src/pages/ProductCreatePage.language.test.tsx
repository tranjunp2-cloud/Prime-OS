// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'content-language-placement-test';
async function mount(query = 'section=product-data') {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?${query}`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
async function selectLanguage(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: /^Content:/ }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('menuitemradio', { name: new RegExp(name) }));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  addProduct({ ...getProducts()[0], id, name: 'Content language fixture', sku_code: 'LANGUAGE-TEST', category: '', categoryId: undefined,
    description: 'Primary English description.', retail_price: 100, price_currency: 'JPY', has_variants: false, product_type: 'single', variant_options: [], skus: [],
    localized_content: {}, inventory: {}, status: 'draft', import_source: undefined, import_sources: [], import_result: undefined, import_issues: [],
    revisions: [], channel_overrides: {}, channels: [], record_version: 1 });
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });

describe('Product data content language', () => {
  it('places the language toolbar above the fields, never in the global header or other workspaces', async () => {
    await mount();
    const main = screen.getByTestId('product-editor-main');
    const toolbar = screen.getByRole('region', { name: 'Product content language' });
    expect(main.firstElementChild).toContainElement(toolbar);
    expect(within(screen.getByTestId('product-editor-header')).queryByRole('button', { name: /^Content:/ })).not.toBeInTheDocument();
    expect(toolbar).toHaveTextContent('Translations: 0/3 complete');
    expect(screen.getByRole('button', { name: 'Activate Master', exact: true })).toBeEnabled();
    const before = JSON.stringify(getProductById(id));
    for (const section of ['commerce', 'distribution', 'activity', 'overview']) {
      fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: section } });
      expect(screen.queryByRole('region', { name: 'Product content language' })).not.toBeInTheDocument();
    }
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('retains unsaved translations across languages and tabs without replacing primary content, price or currency', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    await selectLanguage('日本語');
    expect(screen.getByText('Editing Japanese translation')).toBeVisible();
    expect(document.getElementById('product-name')).toHaveValue('Content language fixture');
    expect(document.getElementById('product-name')).toHaveAttribute('readonly');
    fireEvent.change(document.getElementById('localized-product-name')!, { target: { value: '日本語の商品名' } });
    await selectLanguage('Tiếng Việt');
    expect(document.getElementById('localized-product-name')).toHaveValue('');
    await selectLanguage('日本語');
    expect(document.getElementById('localized-product-name')).toHaveValue('日本語の商品名');
    fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: 'commerce' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: 'product-data' } });
    expect(screen.getByRole('button', { name: 'Content: 日本語' })).toBeVisible();
    expect(document.getElementById('localized-product-name')).toHaveValue('日本語の商品名');
    expect(JSON.stringify(getProductById(id))).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
    await waitFor(() => expect(getProductById(id)?.localized_content?.['ja-JP']?.name).toBe('日本語の商品名'));
    expect(getProductById(id)).toMatchObject({ name: 'Content language fixture', description: 'Primary English description.', retail_price: 100, price_currency: 'JPY', status: 'draft', channels: [] });
  });

  it('allows read-only viewers to select a language without enabling edits', async () => {
    await mount('section=product-data&mode=viewer');
    const before = JSON.stringify(getProductById(id));
    expect(screen.getByRole('button', { name: 'Content: English' })).toBeEnabled();
    await selectLanguage('日本語');
    expect(screen.getByText('Viewing Japanese translation')).toBeVisible();
    expect(document.getElementById('localized-product-name')).toBeDisabled();
    expect(document.getElementById('localized-product-description')).not.toHaveAttribute('contenteditable', 'true');
    expect(screen.queryByRole('button', { name: 'Save draft', exact: true })).not.toBeInTheDocument();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('keeps the Overview translation shortcut connected to Product data', async () => {
    await mount('section=overview');
    fireEvent.click(screen.getByRole('button', { name: 'Translations: 0 of 3 complete' }));
    fireEvent.click(screen.getByRole('button', { name: /日本語/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Content: 日本語' })).toBeVisible());
    expect(screen.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('product-data');
    expect(screen.getByText('Editing Japanese translation')).toBeVisible();
  });
});
