// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ProductCategories from './ProductCategories';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';
import { addProduct, deleteProduct, getProductById, getProducts } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const ids = ['schema-empty', 'schema-filled'];
const seed = getProducts().find(product => !product.has_variants)!;

beforeEach(() => {
  localStorage.removeItem('prime-product-catalog-settings-v2');
  const settings = getProductCatalogSettings();
  const category = { ...settings.categories.find(item => item.id === 'books')!, id: 'schema-category', name: 'Schema category', parentId: null, attributes: [{ key: 'material', required: false }] };
  saveProductCatalogSettings({ ...settings, categories: [category] });
  ids.forEach((id, index) => addProduct({ ...seed, id, name: id, sku_code: id.toUpperCase(), category: category.name, categoryId: category.id, has_variants: false, variant_options: [], specifications: index ? [{ attributeKey: 'material', name: 'Material', value: 'Cotton' }] : [], import_result: undefined }));
});
afterEach(() => { cleanup(); ids.forEach(deleteProduct); localStorage.removeItem('prime-product-catalog-settings-v2'); });
function open(panel = 'general') {
  render(<MemoryRouter initialEntries={[`/products/categories?category=schema-category&panel=${panel}`]}><TooltipProvider><ProductCategories /></TooltipProvider></MemoryRouter>);
  return within(screen.getByRole('dialog', { name: 'Configure Category' }));
}

describe('category configuration review', () => {
  it('reviews real affected products before applying required changes, without touching listings', () => {
    const before = ids.map(id => getProductById(id));
    const drawer = open('attributes');
    fireEvent.click(drawer.getByRole('button', { name: 'Optional' }));
    fireEvent.click(drawer.getByRole('button', { name: 'Save Configuration' }));
    const review = within(screen.getByRole('dialog', { name: 'Review category impact' }));
    expect(review.getByText('2 Product Masters use this category directly.')).toBeInTheDocument();
    expect(review.getByText('1 Product Master will need additional data')).toBeInTheDocument();
    expect(review.getByText('Missing: Material')).toBeInTheDocument();
    expect(getProductCatalogSettings().categories[0].attributes[0].required).toBe(false);
    fireEvent.click(review.getByRole('button', { name: 'Back to editing' }));
    expect(getProductCatalogSettings().categories[0].attributes[0].required).toBe(false);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Configure Category' })).getByRole('button', { name: 'Save Configuration' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Review category impact' })).getByRole('button', { name: 'Confirm changes' }));
    expect(getProductCatalogSettings().categories[0].attributes[0].required).toBe(true);
    ids.forEach((id, index) => expect(getProductById(id)).toEqual(before[index]));
  });

  it('keeps IDs and product references stable when renamed', () => {
    const drawer = open();
    fireEvent.change(drawer.getByLabelText('Category name'), { target: { value: 'Renamed category' } });
    fireEvent.click(drawer.getByRole('button', { name: 'Save Configuration' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Review category impact' })).getByRole('button', { name: 'Confirm changes' }));
    expect(getProductCatalogSettings().categories[0]).toMatchObject({ id: 'schema-category', name: 'Renamed category' });
    expect(getProductById(ids[0])).toMatchObject({ categoryId: 'schema-category', category: 'Renamed category' });
    expect(JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((product: { id: string }) => product.id === ids[0]).categoryId).toBe('schema-category');
  });

  it('blocks renaming when ambiguous legacy references could be silently reassigned', () => {
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, categories: [...settings.categories, { ...settings.categories[0], id: 'duplicate-name', parentId: 'schema-category' }] });
    const legacyId = 'ambiguous-schema-legacy';
    addProduct({ ...seed, id: legacyId, category: 'Schema category', categoryId: undefined });
    try {
      const drawer = open();
      fireEvent.change(drawer.getByLabelText('Category name'), { target: { value: 'Renamed category' } });
      fireEvent.click(drawer.getByRole('button', { name: 'Save Configuration' }));
      const review = within(screen.getByRole('dialog', { name: 'Review category impact' }));
      expect(review.getByRole('alert')).toHaveTextContent('1 legacy products');
      expect(review.getByRole('button', { name: 'Confirm changes' })).toBeDisabled();
      expect(getProductById(legacyId)?.categoryId).toBeUndefined();
    } finally { deleteProduct(legacyId); }
  });
});
