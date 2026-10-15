// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'product-workspace-header-test';
const workspaces = [
  ['overview', 'Overview'], ['product-data', 'Product data'], ['commerce', 'Pricing & Inventory'],
  ['distribution', 'Channel listings'], ['activity', 'Activity history'],
] as const;
async function mount(query = 'section=overview') {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?${query}`]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
function selectWorkspace(section: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Product editor section' }), { target: { value: section } });
}
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  addProduct({ ...getProducts()[0], id, name: 'Workspace header fixture', sku_code: 'HEADER-TEST',
    category: '', categoryId: undefined, description: '', retail_price: 100, price_currency: 'JPY',
    has_variants: false, product_type: 'single', variant_options: [], skus: [], images: [],
    localized_content: {}, inventory: {}, status: 'draft', import_source: undefined, import_sources: [],
    import_result: undefined, import_issues: [], revisions: [], channel_overrides: {}, channels: [], record_version: 1 });
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });

describe('Consistent Product Master workspace headers', () => {
  it('uses one shared heading outside the content cards and disabled fieldset in all five workspaces', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    let headingClass: string | undefined;
    for (const [section, title] of workspaces) {
      selectWorkspace(section);
      const header = screen.getByTestId('product-workspace-header');
      const heading = screen.getByRole('heading', { name: title, exact: true, level: 2 });
      headingClass ??= heading.className;
      expect(heading.className).toBe(headingClass);
      expect(header).toContainElement(heading);
      expect(screen.getByTestId('product-editor-main').firstElementChild).toContainElement(header);
      expect(header.closest('fieldset')).toBeNull();
      expect(screen.getAllByRole('heading', { name: title, exact: true })).toHaveLength(1);
      expect(within(header).queryByRole('button', { name: /Save draft|Activate Master|Update Master/ })).not.toBeInTheDocument();
    }
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('moves channel actions into the header without changing incomplete-Master gating', async () => {
    await mount('section=distribution');
    const header = within(screen.getByTestId('product-workspace-header'));
    expect(header.getByRole('button', { name: 'Create listing' })).toBeDisabled();
    expect(header.getByRole('button', { name: 'Link existing listings' })).toBeEnabled();
    expect(within(document.getElementById('product-section-channels')!).queryByRole('button', { name: 'Link existing listings' })).not.toBeInTheDocument();
    const before = JSON.stringify(getProductById(id));
    fireEvent.click(header.getByRole('button', { name: 'Link existing listings' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('keeps language selection scoped to Product data and Activity filters with the timeline', async () => {
    await mount('section=product-data');
    expect(within(screen.getByTestId('product-workspace-header')).getByRole('button', { name: 'Content: English' })).toBeEnabled();
    selectWorkspace('activity');
    const header = screen.getByTestId('product-workspace-header');
    expect(within(header).queryByRole('button', { name: /^Content:/ })).not.toBeInTheDocument();
    const filters = screen.getByRole('group', { name: 'Activity scope' });
    expect(header).not.toContainElement(filters);
    expect(header.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(filters).getByRole('button', { name: 'Listings', exact: true }));
    expect(screen.getByLabelText('Shop')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Show demo events' })).toBeEnabled();
  });

  it('does not expose write actions when a viewer visits the shared channel header', async () => {
    await mount('section=distribution&mode=viewer');
    const header = within(screen.getByTestId('product-workspace-header'));
    expect(header.getByRole('heading', { name: 'Channel listings' })).toBeVisible();
    expect(header.getByRole('button', { name: 'About channel listings' })).toBeEnabled();
    expect(header.queryByRole('button', { name: 'Create listing' })).not.toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'Link existing listings' })).not.toBeInTheDocument();
  });
});
