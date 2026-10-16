// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'product-workspace-header-test';
const workspaces = [
  ['overview', 'Overview'], ['setup', 'Product setup'],
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
  it('expands readiness in its sidebar and navigates to a check without opening a drawer or saving', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    const sidebar = within(screen.getByTestId('product-editor-readiness'));
    fireEvent.click(sidebar.getByRole('button', { name: 'View all readiness checks' }));
    const allChecks = sidebar.getByRole('list', { name: 'All readiness checks' });
    expect(within(allChecks).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(within(allChecks).getByRole('button', { name: /Configure base price/ }));
    expect(screen.getByRole('combobox', { name: 'Product editor section' })).toHaveValue('setup');
    expect(sidebar.getByRole('button', { name: 'Hide readiness checks' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(sidebar.getByRole('button', { name: 'Hide readiness checks' }));
    expect(sidebar.queryByRole('list', { name: 'All readiness checks' })).not.toBeInTheDocument();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('renders the current overview values without saving edits or interpreting HTML as markup', async () => {
    updateProduct(id, { brand: 'Prime', description: '<p>Soft &amp; durable brushes</p>', images: ['/main.jpg'], image_alt_texts: ['Artist brushes'] });
    await mount();
    const before = JSON.stringify(getProductById(id));
    const summary = () => within(screen.getByTestId('product-overview-snapshot'));
    expect(summary().getByRole('img', { name: 'Artist brushes' })).toBeVisible();
    expect(summary().getByText('Soft & durable brushes')).toBeVisible();
    expect(summary().getByText('Prime', { exact: true })).toBeVisible();
    expect(summary().getByRole('button', { name: 'View Master stock' })).toHaveTextContent('Not recorded');
    fireEvent.click(summary().getByRole('button', { name: 'View product data' }));
    const descriptionEditor = document.getElementById('product-description')!;
    descriptionEditor.innerHTML = '<p>Updated product description</p>';
    fireEvent.input(descriptionEditor);
    selectWorkspace('overview');
    expect(summary().getByText('Updated product description')).toBeVisible();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('uses selected variant prices and count in the overview instead of the parent base price', async () => {
    updateProduct(id, { has_variants: true, product_type: 'variant', variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Blue', 'Red'] }], skus: ['Blue', 'Red'].map((color, index) => ({
      id: `overview-${color}`, sku_code: `OVERVIEW-${color.toUpperCase()}`, variation_name: color, status: 'active', weight_g: 0, units_per_carton: 1, price: 200 + index * 100, stock_by_location: {},
    })) });
    await mount();
    const summary = within(screen.getByTestId('product-overview-snapshot'));
    expect(summary.getByText('2 variant SKUs')).toBeVisible();
    expect(summary.getByRole('button', { name: 'View variant prices' })).toHaveTextContent('200–300 JPY');
  });

  it('keeps Overview headerless and embeds one shared heading in the other workspace cards', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    let headingClass: string | undefined;
    for (const [section, title] of workspaces) {
      selectWorkspace(section);
      if (section === 'overview') {
        expect(screen.queryByTestId('product-workspace-header')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Overview', exact: true })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Product summary' })).toBeVisible();
        expect(screen.getByTestId('product-editor-main').firstElementChild).toContainElement(screen.getByTestId('product-overview-snapshot'));
        continue;
      }
      const header = screen.getByTestId('product-workspace-header');
      const heading = screen.getByRole('heading', { name: title, exact: true, level: 2 });
      headingClass ??= heading.className;
      expect(heading.className).toBe(headingClass);
      expect(header).toContainElement(heading);
      expect(screen.getByTestId('product-editor-main').firstElementChild).toContainElement(header);
      expect(header.closest('fieldset')).toBeNull();
      expect(header.parentElement).toHaveClass('bg-card');
      expect(screen.getAllByRole('heading', { name: title, exact: true })).toHaveLength(1);
      expect(within(header).queryByRole('button', { name: /Save draft|Activate Master|Update Master/ })).not.toBeInTheDocument();
    }
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });

  it('keeps channel actions in the listing card header without changing incomplete-Master gating', async () => {
    await mount('section=distribution');
    const header = within(screen.getByTestId('product-workspace-header'));
    expect(header.getByRole('button', { name: 'Create listing' })).toBeDisabled();
    expect(header.getByRole('button', { name: 'Link existing listings' })).toBeEnabled();
    expect(within(document.getElementById('product-section-channels')!).getAllByRole('button', { name: 'Link existing listings' })).toHaveLength(1);
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
    expect(screen.queryByRole('button', { name: /demo events/i })).not.toBeInTheDocument();
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
