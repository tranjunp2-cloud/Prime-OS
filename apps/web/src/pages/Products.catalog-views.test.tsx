// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Products from './Products';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProducts, type Product } from '@/lib/product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from '@/lib/product-catalog-settings-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

let fixtures: Record<string, Product>;
const rowLink = (key: string) => screen.queryByRole('link', { name: `Open Product Master details for ${fixtures[key].name}` });
const tab = (label: string) => within(screen.getByRole('navigation', { name: 'Catalog status' })).getByRole('button', { name: new RegExp(`^${label}\\s*\\d+$`) });
const todoGroup = (label: string) => within(screen.getByRole('group', { name: 'To do filters' })).getByRole('button', { name: new RegExp(`^${label}\\s*\\d+$`) });
function openDrafts() { fireEvent.click(tab('To do')); fireEvent.click(todoGroup('Drafts')); }
function visibleProductHrefs() { return screen.getAllByRole('link', { name: /^Open Product Master details for/ }).map(link => link.getAttribute('href')); }
async function mount() {
  render(<MemoryRouter initialEntries={['/products/master-catalog?q=Catalog tab fixture']}><Routes><Route path="/products/master-catalog" element={<Products />} /><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
  await screen.findByRole('link', { name: `Open Product Master details for ${fixtures.ready.name}` });
}
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.removeItem('prime-product-catalog-settings-v2');
  const settings = getProductCatalogSettings();
  const category = { ...settings.categories[0], id: 'catalog-tab-fixture', name: 'Catalog fixture category', parentId: null, status: 'Active' as const, attributes: [] };
  saveProductCatalogSettings({ ...settings, categories: [...settings.categories, category] });
  const base: Product = { ...getProducts()[0], id: '', name: '', sku_code: '', category: category.name, categoryId: category.id,
    status: 'draft', has_variants: false, product_type: 'single', images: ['/one.jpg', '/two.jpg', '/three.jpg'],
    description: 'Complete catalog product description. '.repeat(5), retail_price: 1000, inventory: { wh_crjp: 100 },
    skus: [], variant_options: [], specifications: [], channels: [], channel_overrides: {},
    pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100,
    import_result: undefined, import_source: undefined, import_sources: [], import_issues: [], revisions: [] };
  const listing = { channel: 'shopee' as const, external_id: 'SHO-TAB-FIXTURE', status: 'active' as const, listing_url: null, last_synced_at: null };
  const cases: Record<string, Partial<Product>> = {
    ready: {}, missing: { images: ['/one.jpg'], inventory: { wh_crjp: 0 } },
    active: { status: 'published', import_result: 'published' },
    imported: { status: 'published', import_result: 'published', import_source: 'Shopee · Test Store VN', channels: [listing] },
    review: { status: 'review', import_result: 'needs_review', import_issues: ['Confirm mapping'] },
    archived: { status: 'archived', images: [], inventory: {}, import_result: 'incomplete', import_issues: ['Missing images'] },
    archivedStock: { status: 'archived', images: [], inventory: { wh_crjp: 4 }, channels: [listing] },
    archivedSync: { status: 'archived', images: [], channels: [{ ...listing, status: 'pending' }] },
    activeIssue: { status: 'published', channels: [{ ...listing, status: 'pending' }] },
    activeStock: { status: 'published', inventory: { wh_crjp: 4 }, channels: [listing] },
  };
  fixtures = Object.fromEntries(Object.entries(cases).map(([key, patch]) => {
    const product = { ...base, ...patch, id: `catalog-tab-${key}-${crypto.randomUUID()}`, name: `Catalog tab fixture ${key}`, sku_code: `CATALOG-TAB-${key}` };
    addProduct(product);
    return [key, product];
  }));
});
afterEach(() => { cleanup(); Object.values(fixtures).forEach(product => deleteProduct(product.id)); localStorage.removeItem('prime-product-catalog-settings-v2'); vi.restoreAllMocks(); });

describe('Seller catalog tabs and scoped filters', () => {
  it('shows the deduplicated union and accurate counts across overlapping To do filters', async () => {
    await mount(); fireEvent.click(tab('To do'));
    expect(visibleProductHrefs()).toHaveLength(7);
    expect(rowLink('ready')).toBeVisible(); expect(rowLink('activeIssue')).toBeVisible();
    expect(rowLink('active')).not.toBeInTheDocument(); expect(rowLink('archived')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: '' } });
    const all = visibleProductHrefs();
    expect(new Set(all).size).toBe(all.length);
    expect(tab('To do')).toHaveTextContent(`To do${all.length}`);
    expect(todoGroup('All items')).toHaveTextContent(`All items${all.length}`);
    fireEvent.click(todoGroup('With issues'));
    const issues = visibleProductHrefs();
    expect(todoGroup('With issues')).toHaveTextContent(`With issues${issues.length}`);
    expect(rowLink('ready')).not.toBeInTheDocument();
    fireEvent.click(todoGroup('Drafts'));
    const drafts = visibleProductHrefs();
    expect(todoGroup('Drafts')).toHaveTextContent(`Drafts${drafts.length}`);
    expect(new Set(all)).toEqual(new Set([...issues, ...drafts]));
    expect(all.length).toBeLessThan(issues.length + drafts.length);
  });

  it('prioritizes stock and sync issues before routine drafts and preserves Active in To do', async () => {
    await mount(); fireEvent.click(tab('To do'));
    const hrefs = visibleProductHrefs();
    const position = (key: string) => hrefs.indexOf(`/products/${fixtures[key].id}/edit`);
    expect(position('activeStock')).toBeLessThan(position('activeIssue'));
    expect(position('activeIssue')).toBeLessThan(position('review'));
    expect(position('review')).toBeLessThan(position('missing'));
    expect(position('missing')).toBeLessThan(position('ready'));
    expect(within(rowLink('activeIssue')!.closest('tr')!).getByText('Active', { exact: true })).toBeVisible();
    const draftRow = within(rowLink('ready')!.closest('tr')!);
    expect(draftRow.getByText('Draft', { exact: true })).toBeVisible();
    expect(draftRow.queryByRole('button', { name: /data issue|Incomplete|Show affected shops/ })).not.toBeInTheDocument();
    expect(todoGroup('Drafts').className).not.toMatch(/amber|rose/);
    fireEvent.click(todoGroup('With issues'));
    fireEvent.change(screen.getByLabelText('Issue type'), { target: { value: 'stock' } });
    expect(rowLink('activeStock')).toBeVisible();
    expect(rowLink('missing')).not.toBeInTheDocument();
    fireEvent.click(tab('Active'));
    expect(rowLink('activeIssue')).toBeVisible();
    expect(getProducts().find(product => product.id === fixtures.activeIssue.id)!.status).toBe('published');
  });

  it('reveals only relevant controls and clears conflicting filters and selections across groups', async () => {
    await mount(); fireEvent.click(tab('To do'));
    expect(screen.queryByLabelText('Issue type')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Draft readiness')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product status'), { target: { value: 'published' } });
    fireEvent.click(screen.getByRole('checkbox', { name: `Select ${fixtures.activeIssue.name}` }));
    fireEvent.click(todoGroup('Drafts'));
    expect(rowLink('ready')).toBeVisible();
    expect(screen.queryByLabelText('Product status')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Draft readiness'), { target: { value: 'ready' } });
    fireEvent.click(todoGroup('With issues'));
    expect(screen.queryByLabelText('Draft readiness')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Issue type')).toHaveValue('all');
    expect(screen.getByRole('checkbox', { name: `Select ${fixtures.activeIssue.name}` })).toHaveAttribute('aria-checked', 'false');
    fireEvent.change(screen.getByLabelText('Issue type'), { target: { value: 'sync' } });
    expect(rowLink('activeIssue')).toBeVisible(); expect(rowLink('missing')).not.toBeInTheDocument();
    fireEvent.click(todoGroup('Drafts'));
    expect(screen.getByLabelText('Draft readiness')).toHaveValue('all');
    expect(rowLink('missing')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(tab('To do')).toHaveAttribute('aria-pressed', 'true');
    expect(todoGroup('All items')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Draft readiness')).not.toBeInTheDocument();
  });

  it('defaults to All with four tabs, merging attention and drafts without changing lifecycle counts', async () => {
    await mount();
    const nav = within(screen.getByRole('navigation', { name: 'Catalog status' }));
    expect(nav.getAllByRole('button')).toHaveLength(4);
    expect(tab('All')).toHaveAttribute('aria-pressed', 'true');
    expect(nav.queryByRole('button', { name: /^Ready|^Imported|^Draft|^Needs attention/ })).not.toBeInTheDocument();
    expect(tab('To do')).not.toHaveTextContent('⚠');
    expect(screen.queryByRole('group', { name: 'To do filters' })).not.toBeInTheDocument();
    const products = getProducts();
    expect(tab('All')).toHaveTextContent(`All${products.length}`);
    expect(tab('Active')).toHaveTextContent(`Active${products.filter(product => product.status === 'published').length}`);
    expect(tab('Archived')).toHaveTextContent(`Archived${products.filter(product => product.status === 'archived').length}`);
    expect(screen.getAllByRole('link', { name: /^Open Product Master details for/ })).toHaveLength(10);
  });

  it('Active includes published Masters even without listings and excludes all drafts', async () => {
    await mount(); fireEvent.click(tab('Active'));
    expect(rowLink('active')).toBeVisible(); expect(rowLink('imported')).toBeVisible();
    for (const key of ['ready', 'missing', 'review', 'archived']) expect(rowLink(key)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Product status')).not.toBeInTheDocument();
    expect(within(rowLink('active')!.closest('tr')!).queryByRole('button', { name: /^Imported/ })).not.toBeInTheDocument();
  });

  it('Draft filters ready-to-publish and missing fields with no published or review false positives', async () => {
    await mount(); openDrafts();
    expect(screen.getAllByRole('link', { name: /^Open Product Master details for/ })).toHaveLength(3);
    expect(within(rowLink('review')!.closest('tr')!).getByText('Draft', { exact: true })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Draft readiness'), { target: { value: 'ready' } });
    expect(rowLink('ready')).toBeVisible(); expect(rowLink('missing')).not.toBeInTheDocument(); expect(rowLink('review')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Draft readiness'), { target: { value: 'incomplete' } });
    expect(rowLink('missing')).toBeVisible(); expect(rowLink('ready')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove readiness filter' }));
    expect(screen.getByLabelText('Draft readiness')).toHaveValue('all');
    fireEvent.click(tab('Active'));
    expect(screen.queryByLabelText('Draft readiness')).not.toBeInTheDocument();
  });

  it('combines imported source with lifecycle, search and clear-all without changing listings', async () => {
    await mount(); fireEvent.click(tab('Active'));
    const listingControl = within(rowLink('imported')!.closest('tr')!).getByRole('button', { name: /Shopee, Test Store VN, SKU SHO-TAB-FIXTURE, stock.*Open Channel Listings/ }).getAttribute('aria-label');
    fireEvent.change(screen.getByLabelText('Product source'), { target: { value: 'imported' } });
    expect(rowLink('imported')).toBeVisible(); expect(rowLink('active')).not.toBeInTheDocument();
    expect(within(rowLink('imported')!.closest('tr')!).getByRole('button', { name: listingControl! })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Product source'), { target: { value: 'manual' } });
    expect(rowLink('active')).toBeVisible(); expect(rowLink('imported')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByLabelText('Product source')).toHaveValue('all');
    expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveValue('');
    expect(tab('Active')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears conflicting status and bulk selection when changing tabs', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Product status'), { target: { value: 'draft' } });
    expect(rowLink('review')).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: `Select ${fixtures.ready.name}` }));
    fireEvent.click(tab('Active'));
    expect(rowLink('active')).toBeVisible();
    openDrafts();
    expect(screen.getByRole('checkbox', { name: `Select ${fixtures.ready.name}` })).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps operational listing alerts on Archived but excludes missing Master data', async () => {
    await mount(); fireEvent.click(tab('To do')); fireEvent.click(todoGroup('With issues'));
    expect(rowLink('archived')).not.toBeInTheDocument();
    expect(rowLink('archivedStock')).toBeVisible(); expect(rowLink('archivedSync')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Issue type'), { target: { value: 'incomplete' } });
    expect(rowLink('missing')).toBeVisible(); expect(rowLink('archivedStock')).not.toBeInTheDocument(); expect(rowLink('archivedSync')).not.toBeInTheDocument();
    fireEvent.click(tab('Archived'));
    for (const key of ['archived', 'archivedStock', 'archivedSync']) {
      expect(rowLink(key)).toBeVisible();
      expect(within(rowLink(key)!.closest('tr')!).queryByText(/incomplete|missing/i)).not.toBeInTheDocument();
    }
  });

  it('opens a Ready to publish draft with the same readiness result in detail', async () => {
    await mount(); openDrafts();
    fireEvent.change(screen.getByLabelText('Draft readiness'), { target: { value: 'ready' } });
    fireEvent.click(rowLink('ready')!);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
    expect(screen.getByRole('progressbar', { name: '100% of product requirements complete' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish product' })).toBeEnabled();
  });

  it('refreshes readiness when returning after catalog requirements change', async () => {
    await mount(); openDrafts();
    fireEvent.change(screen.getByLabelText('Draft readiness'), { target: { value: 'ready' } });
    expect(rowLink('ready')).toBeVisible();
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, categories: settings.categories.map(category => category.id === fixtures.ready.categoryId ? { ...category, status: 'Inactive' } : category) });
    fireEvent(window, new Event('focus'));
    expect(rowLink('ready')).not.toBeInTheDocument();
    expect(screen.getByText('No products match this view')).toBeVisible();
  });
});
