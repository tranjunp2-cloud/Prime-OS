// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, type Product } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
const id = 'category-safety-master';
const seed = getProducts().find(product => !product.has_variants)!;
const catalogSession = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'user', canWrite: true }));
vi.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => ({ session: catalogSession }) }));
let product: Product;

async function mount() {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?section=product-data`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
function chooseCategory(name: string) {
  fireEvent.click(document.getElementById('product-category-trigger')!);
  const dialog = within(screen.getByRole('dialog', { name: 'Select product category' }));
  fireEvent.change(dialog.getByPlaceholderText('Search categories...'), { target: { value: name } });
  fireEvent.click(dialog.getByRole('button', { name: new RegExp(` / .*${name}`) }));
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm Category' }));
  return within(screen.getByRole('dialog', { name: 'Review category change' }));
}
beforeEach(() => {
  catalogSession.role = 'admin'; catalogSession.canWrite = true;
  localStorage.removeItem('prime-product-catalog-settings-v2');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  const settings = getProductCatalogSettings();
  const category = settings.categories.find(item => item.id === 'books')!;
  const material = { ...settings.attributes[0], key: 'material', name: 'Material', type: 'Single-line text', options: '', validation: '' };
  const voltage = { ...material, id: 'voltage', key: 'voltage', name: 'Voltage' };
  saveProductCatalogSettings({ ...settings, attributes: [material, voltage], categories: [
    { ...category, id: 'tools', name: 'Tools', parentId: null, attributes: [{ key: 'material', required: true }] },
    { ...category, id: 'devices', name: 'Devices', parentId: null, attributes: [{ key: 'voltage', required: true }] },
  ] });
  product = { ...seed, id, name: 'Category safety product', sku_code: 'CATEGORY-SAFETY', category: 'Tools', categoryId: 'tools',
    has_variants: false, product_type: 'single', variant_options: [], skus: [], status: 'draft', import_result: undefined, import_issues: [], revisions: [], record_version: 1,
    specifications: [{ attributeKey: 'material', name: 'Material', value: 'Cotton' }, { name: 'Legacy note', value: 'Keep this value' }],
    localized_content: { 'ja-JP': { name: '日本語', description: '', attributeValues: { material: '綿' } } },
    channel_overrides: { shopee: { enabled: true, title: 'Live title', description: 'Live content', listing_sku: 'LIVE-SKU', price_markup: 0 } },
    channels: [{ channel: 'shopee', external_id: 'LIVE-SKU', status: 'active', listing_url: null, last_synced_at: '2026-09-01' }],
  };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); localStorage.removeItem('prime-product-catalog-settings-v2'); vi.restoreAllMocks(); });

describe('Master category change review', () => {
  it('edits and adds attribute values in place, persisting only this product after Save', async () => {
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, attributes: settings.attributes.map(attribute => attribute.key === 'material' ? { ...attribute, type: 'Multi-select', options: 'Cotton, Paper' } : attribute) });
    const catalogBefore = JSON.stringify(getProductCatalogSettings());
    await mount();
    expect(screen.queryByRole('button', { name: 'Manage attribute setup' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Changes open in Catalog Setup/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved title stays here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Material value' }));
    fireEvent.change(screen.getByLabelText('New material value'), { target: { value: 'Bamboo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('button', { name: 'Bamboo', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByDisplayValue('Unsaved title stays here')).toBeVisible();
    expect(getProductById(id)?.specifications).toEqual(product.specifications);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
    expect(getProductById(id)).toMatchObject({ name: 'Unsaved title stays here', has_variants: false, variant_options: [], channels: product.channels });
    expect(getProductById(id)?.specifications).toContainEqual({ attributeKey: 'material', name: 'Material', value: 'Cotton, Bamboo' });
    expect(JSON.stringify(getProductCatalogSettings())).toBe(catalogBefore);
    cleanup(); await mount();
    expect(screen.getByRole('button', { name: 'Bamboo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows exact added, retained and missing fields; cancel leaves data untouched', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    const dialog = chooseCategory('Devices');
    expect(dialog.getByText('Fields added')).toBeInTheDocument();
    expect(dialog.getByText('No longer applicable — values kept')).toBeInTheDocument();
    expect(dialog.getByText(/Cotton/)).toBeInTheDocument();
    expect(dialog.getByText('1 required field to complete')).toBeInTheDocument();
    expect(dialog.getAllByText('Voltage').length).toBeGreaterThan(0);
    expect(JSON.stringify(getProductById(id))).toBe(before);
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(document.getElementById('product-category-trigger')).toHaveTextContent('Tools');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('preserves values and translations after switch, save, remount and switch back', async () => {
    await mount();
    fireEvent.click(chooseCategory('Devices').getByRole('button', { name: 'Apply to draft' }));
    expect(getProductById(id)?.categoryId).toBe('tools');
    expect(screen.getByText('Saved values outside this category (2)')).toBeInTheDocument();
    // The existing one-action readiness flow saves an incomplete draft before showing its checklist.
    fireEvent.click(screen.getByRole('button', { name: 'Complete product' }));
    const saved = getProductById(id)!;
    expect(saved.categoryId).toBe('devices');
    expect(saved.specifications).toEqual(expect.arrayContaining(product.specifications!));
    expect(saved.localized_content).toEqual(product.localized_content);
    expect(saved.channels).toEqual(product.channels);
    expect(saved.channel_overrides?.shopee).toMatchObject({ title: 'Live title', description: 'Live content', listing_sku: 'LIVE-SKU' });
    cleanup(); await mount();
    expect(screen.getByText('Saved values outside this category (2)')).toBeInTheDocument();
    fireEvent.click(chooseCategory('Tools').getByRole('button', { name: 'Apply to draft' }));
    expect(screen.getByDisplayValue('Cotton')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete product' }));
    expect(getProductById(id)?.categoryId).toBe('tools');
    expect(getProductById(id)?.specifications?.filter(spec => spec.attributeKey === 'material')).toHaveLength(1);
  });

  it('retains values when an assignment is removed while the editor is open', async () => {
    await mount();
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, categories: settings.categories.map(category => category.id === 'tools' ? { ...category, attributes: [] } : category) });
    fireEvent(window, new Event('focus'));
    expect(screen.getByText('Saved values outside this category (2)')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Updated product title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete product' }));
    expect(getProductById(id)?.specifications).toEqual(expect.arrayContaining(product.specifications!));
  });

  it('handles an empty category catalog without offering fake fallback categories', async () => {
    saveProductCatalogSettings({ ...getProductCatalogSettings(), categories: [] });
    await mount();
    expect(screen.getByText('Saved values outside this category (2)')).toBeInTheDocument();
    fireEvent.click(document.getElementById('product-category-trigger')!);
    const dialog = within(screen.getByRole('dialog', { name: 'Select product category' }));
    expect(dialog.getByRole('button', { name: 'Confirm Category' })).toBeDisabled();
    expect(dialog.queryByText('Fashion')).not.toBeInTheDocument();
  });

  it('creates from an empty search, selects the new category and stages it only after review', async () => {
    await mount();
    fireEvent.change(screen.getByDisplayValue(product.name), { target: { value: 'Unsaved product title' } });
    const savedBefore = JSON.stringify(getProductById(id));
    fireEvent.click(document.getElementById('product-category-trigger')!);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search categories' }), { target: { value: 'Sketchbooks' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create “Sketchbooks”' }));
    const creator = within(screen.getByRole('dialog', { name: 'Create product category' }));
    expect(creator.getByLabelText(/Category name/)).toHaveValue('Sketchbooks');
    expect(creator.getByLabelText(/Parent category/)).toHaveValue('tools');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(creator.getByText(/Add description/));
    fireEvent.change(creator.getByLabelText('Description'), { target: { value: 'Drawing notebooks' } });
    fireEvent.click(creator.getByRole('button', { name: 'Create & select' }));
    const created = getProductCatalogSettings().categories.find(category => category.name === 'Sketchbooks')!;
    expect(created).toMatchObject({ parentId: 'tools', description: 'Drawing notebooks', attributes: [] });
    expect(JSON.stringify(getProductById(id))).toBe(savedBefore);
    expect(screen.getByRole('status')).toHaveTextContent('shared catalog');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Category' }));
    expect(screen.getByRole('dialog', { name: 'Review category change' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Apply to draft' }));
    expect(screen.getByDisplayValue('Unsaved product title')).toBeInTheDocument();
    expect(document.getElementById('product-category-trigger')).toHaveTextContent('Sketchbooks');
    expect(getProductById(id)?.categoryId).toBe('tools');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(getProductById(id)).toMatchObject({ categoryId: created.id, name: 'Unsaved product title', channels: product.channels, localized_content: product.localized_content });
  });

  it('back and cancel do not create a category or change the product draft', async () => {
    await mount();
    const before = JSON.stringify(getProductCatalogSettings());
    fireEvent.click(document.getElementById('product-category-trigger')!);
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));
    fireEvent.change(screen.getByLabelText(/Category name/), { target: { value: 'Not saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(JSON.stringify(getProductCatalogSettings())).toBe(before);
    expect(document.getElementById('product-category-trigger')).toHaveTextContent('Tools');
  });

  it('keeps the shared category if product selection is cancelled after creation', async () => {
    await mount();
    fireEvent.click(document.getElementById('product-category-trigger')!);
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));
    fireEvent.change(screen.getByLabelText(/Category name/), { target: { value: 'Shared category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create & select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getProductCatalogSettings().categories.some(category => category.name === 'Shared category')).toBe(true);
    expect(document.getElementById('product-category-trigger')).toHaveTextContent('Tools');
    expect(getProductById(id)?.categoryId).toBe('tools');
  });

  it('rejects duplicate names inline and supports creating the first root category', async () => {
    saveProductCatalogSettings({ ...getProductCatalogSettings(), categories: [] });
    await mount();
    fireEvent.click(document.getElementById('product-category-trigger')!);
    fireEvent.click(screen.getByRole('button', { name: 'Create your first category' }));
    expect(screen.getByLabelText(/Parent category/)).toHaveValue('');
    fireEvent.change(screen.getByLabelText(/Category name/), { target: { value: 'First category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create & select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));
    fireEvent.change(screen.getByLabelText(/Parent category/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Category name/), { target: { value: ' first category ' } });
    fireEvent.blur(screen.getByLabelText(/Category name/));
    expect(screen.getByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('button', { name: 'Create & select' })).toBeDisabled();
    expect(getProductCatalogSettings().categories).toHaveLength(1);
  });

  it('does not offer catalog creation to a product editor without admin access', async () => {
    catalogSession.role = 'user';
    await mount();
    fireEvent.click(document.getElementById('product-category-trigger')!);
    expect(screen.queryByRole('button', { name: 'Create category' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search categories' }), { target: { value: 'Nothing here' } });
    expect(screen.getByText(/Ask an Admin/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Create “/ })).not.toBeInTheDocument();
  });

  it('keeps form input and permits retry after a category persistence failure', async () => {
    await mount();
    fireEvent.click(document.getElementById('product-category-trigger')!);
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));
    fireEvent.change(screen.getByLabelText(/Category name/), { target: { value: 'Retry category' } });
    const write = Storage.prototype.setItem;
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'prime-product-catalog-settings-v2') throw new Error('Storage unavailable. Try again.');
      write.call(this, key, value);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create & select' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
    expect(screen.getByLabelText(/Category name/)).toHaveValue('Retry category');
    expect(screen.getByRole('button', { name: 'Create & select' })).toBeEnabled();
    expect(getProductCatalogSettings().categories.some(category => category.name === 'Retry category')).toBe(false);
    failure.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Create & select' }));
    expect(screen.getByRole('dialog', { name: 'Select product category' })).toBeVisible();
    expect(getProductCatalogSettings().categories.filter(category => category.name === 'Retry category')).toHaveLength(1);
  });
});
