// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import Products from './Products';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProducts, updateProduct, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-product-channel-setup', () => ({ useProductChannelSetup: () => ({ snapshot: { status: 'loaded', channels: [] }, retry: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

function Harness() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/products/master-catalog?q=')}>Reopen product list</button><Products /></>;
}

afterEach(cleanup);

describe('Product Master list default tab', () => {
  it('does not reopen onboarding after connecting a shop when Masters already exist', () => {
    const count = getProducts().length;
    render(<MemoryRouter initialEntries={['/products/master-catalog?getting-started=1']}><Products /></MemoryRouter>);
    expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(getProducts()).toHaveLength(count);
  });
  it('previews the first-use layout with in-place actions only and preserves existing products', () => {
    const productsBefore = JSON.stringify(getProducts());
    render(<MemoryRouter initialEntries={['/products/master-catalog?preview=first-product']}><Products /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Start your product catalog' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Import products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Product Master' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Excel / CSV' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create a new product' })).toBeEnabled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Catalog status' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Review \d+ listings?$/ }));
    expect(screen.getByRole('region', { name: 'Listings waiting for confirmation' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('heading', { name: 'Start your product catalog' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'With data' }));
    expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.stringify(getProducts())).toBe(productsBefore);
  });
  it('clears selected Master actions when entering listing review', () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all visible products' }));
    fireEvent.click(screen.getByRole('button', { name: /^Review & link/ }));
    expect(screen.getByRole('region', { name: 'Listings waiting for confirmation' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Validate' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
  });
  it('switches header demo modes repeatedly, resets filters, and keeps saved products intact', async () => {
    const productsBefore = JSON.stringify(getProducts());
    render(<MemoryRouter initialEntries={['/products/master-catalog?q=no-such-demo-product']}><Products /></MemoryRouter>);
    const demo = within(screen.getByRole('group', { name: 'Product demo mode' }));
    expect(screen.getByRole('heading', { name: 'Product Master' })).toBeVisible();
    expect(demo.getByRole('button', { name: 'With data' })).toHaveAttribute('aria-pressed', 'true');
    for (let count = 0; count < 2; count++) {
      fireEvent.click(demo.getByRole('button', { name: 'No products' }));
      expect(demo.getByRole('button', { name: 'No products' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('heading', { name: 'Start your product catalog' })).toBeVisible();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Import products' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create Product Master' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import Excel / CSV' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Create a new product' })).toBeEnabled();
      fireEvent.click(demo.getByRole('button', { name: 'With data' }));
      expect(demo.getByRole('button', { name: 'With data' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Import products' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Create Product Master' })).toBeEnabled();
      expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveValue('');
      expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
    }
    expect((await screen.findAllByRole('link', { name: /^Open Product Master details/ })).length).toBeGreaterThan(0);
    expect(JSON.stringify(getProducts())).toBe(productsBefore);
  });

  it('switches all three demos without changing products, imports or connections', () => {
    const productsBefore = JSON.stringify(getProducts());
    const importsBefore = JSON.stringify(getCatalogImportItems());
    const connect = vi.spyOn(channelIntegrationsApi, 'connect');
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    const demo = within(screen.getByRole('group', { name: 'Product demo mode' }));
    fireEvent.click(demo.getByRole('button', { name: 'No channels' }));
    expect(demo.getByRole('button', { name: 'No channels' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Connect your first channel' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Review \d/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Product Master' })).not.toBeInTheDocument();
    for (const [action, title] of [['Import Excel / CSV', 'Manual product import'], ['Create a new product', 'Create Product Master draft']]) {
      fireEvent.click(screen.getByRole('button', { name: action }));
      const dialog = screen.getByRole('dialog', { name: title });
      expect(dialog).toBeVisible();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    }
    fireEvent.click(demo.getByRole('button', { name: 'No products' }));
    expect(screen.getByRole('button', { name: /^Review \d+ listings?$/ })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Connect your first channel' })).not.toBeInTheDocument();
    fireEvent.click(demo.getByRole('button', { name: 'With data' }));
    expect(screen.getByRole('navigation', { name: 'Catalog status' })).toBeVisible();
    expect(JSON.stringify(getProducts())).toBe(productsBefore);
    expect(JSON.stringify(getCatalogImportItems())).toBe(importsBefore);
    expect(connect).not.toHaveBeenCalled();
    connect.mockRestore();
  });

  it('opens the existing channel picker in place and can cancel without connecting', async () => {
    const platforms = vi.spyOn(channelIntegrationsApi, 'platforms').mockResolvedValue({ data: [] });
    const warehouses = vi.spyOn(channelIntegrationsApi, 'warehouses').mockResolvedValue({ data: [] });
    const connect = vi.spyOn(channelIntegrationsApi, 'connect');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/products/master-catalog?preview=no-channels']}><Products /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Connect channel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect a store' });
    expect(dialog).toBeVisible();
    expect(platforms).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connect your first channel' })).toBeVisible();
    expect(connect).not.toHaveBeenCalled();
    platforms.mockRestore(); warehouses.mockRestore(); connect.mockRestore(); queryClient.clear();
  });

  it('does not add Product Master demo controls to the channel listings header', () => {
    render(<MemoryRouter initialEntries={['/products/channel-listings']}><Products /></MemoryRouter>);
    expect(screen.queryByRole('group', { name: 'Product demo mode' })).not.toBeInTheDocument();
  });
  it('opens All by default and reveals work filters only inside To do', () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    const all = screen.getByRole('button', { name: /^All\s*\d+$/ });
    expect(screen.getByRole('columnheader', { name: /^MASTER STATUS/ })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'About Master status' })).toHaveLength(1);
    expect(all).toHaveClass('text-primary');
    expect(screen.queryByRole('group', { name: 'To do filters' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^To do/ }));
    expect(screen.getByRole('group', { name: 'To do filters' })).toBeInTheDocument();
    fireEvent.click(all);
    expect(screen.queryByRole('group', { name: 'To do filters' })).not.toBeInTheDocument();
  });

  it('resets to All when entering the list with a new URL', () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Harness /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^To do/ }));
    expect(screen.getByRole('group', { name: 'To do filters' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen product list' }));
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveClass('text-primary');
    expect(screen.queryByRole('group', { name: 'To do filters' })).not.toBeInTheDocument();
  });
});

describe('SKU discovery from Product Master list', () => {
  const singleId = 'sku-discovery-single-test';
  const variantId = 'sku-discovery-variant-test';
  let single: Product;
  let variant: Product;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn();
    single = { ...getProducts().find(product => !product.has_variants)!, id: singleId, name: 'Single SKU discovery test', sku_code: 'SINGLE-DISCOVERY', has_variants: false, product_type: 'single', skus: [], channels: [], channel_overrides: {}, import_result: undefined, import_sources: [] };
    const sku = { price: 10, weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: { wh_crjp: 5 } };
    variant = { ...single, id: variantId, name: 'Variant SKU discovery test', sku_code: 'PARENT-DISCOVERY', has_variants: true, product_type: 'variant', variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Blue', 'Red'] }], skus: [{ ...sku, id: 'discovery-blue', sku_code: 'CHILD-ONLY-BLUE', variation_name: 'Blue' }, { ...sku, id: 'discovery-red', sku_code: 'CHILD-ONLY-RED', variation_name: 'Red' }] };
    addProduct(single);
    addProduct(variant);
  });

  afterEach(() => {
    deleteProduct(singleId);
    deleteProduct(variantId);
    vi.restoreAllMocks();
  });

  it('shows a plain variant-count link and no redundant SKU-count link for single products', async () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    const variantLink = await screen.findByRole('link', { name: `Manage 2 variants for ${variant.name}` });
    const singleRow = screen.getByRole('link', { name: `Open Product Master details for ${single.name}` }).closest('tr')!;
    expect(within(singleRow).getByText(single.sku_code)).toBeVisible();
    expect(within(singleRow).queryByRole('link', { name: /^Manage/ })).not.toBeInTheDocument();
    expect(within(singleRow).queryByText('1 SKU')).not.toBeInTheDocument();
    expect(variantLink).toHaveTextContent('2 variants');
    expect(variantLink).toHaveAttribute('href', `/products/${variantId}/edit?section=commerce`);
    expect(variantLink).toHaveClass('underline');
  });

  it('keeps a setup link with an accurate count for an empty variant product', async () => {
    updateProduct(variantId, { id: variantId, skus: [] });
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: `Manage 0 variants for ${variant.name}` })).toHaveTextContent('0 variants');
  });

  it('uses the singular label when a variant product has one variant', async () => {
    updateProduct(variantId, { id: variantId, skus: variant.skus.slice(0, 1) });
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: `Manage 1 variant for ${variant.name}` })).toHaveTextContent('1 variant');
  });

  it('finds the parent once by a child SKU, ignores case and spacing, and preserves Master searches', async () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    await screen.findByRole('link', { name: `Manage 2 variants for ${variant.name}` });
    const search = screen.getByRole('textbox', { name: 'Search products' });
    for (const query of ['  child-only-blue  ', 'ONLY-RED', 'CHILD-ONLY', 'PARENT-DISCOVERY', variant.name]) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.getAllByRole('link', { name: /^Open Product Master details for/ })).toHaveLength(1);
      expect(screen.getByRole('link', { name: `Manage 2 variants for ${variant.name}` })).toBeInTheDocument();
    }
    fireEvent.change(search, { target: { value: 'no-such-discovery-sku' } });
    expect(screen.getByText('No products match this view')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('link', { name: `Open Product Master details for ${single.name}` })).toBeInTheDocument();
  });

  it.each(['single', 'variant'] as const)('opens Pricing & Inventory for a %s product', async kind => {
    const product = kind === 'single' ? single : variant;
    function Path() { const location = useLocation(); return <output data-testid="sku-path">{location.pathname}{location.search}</output>; }
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Path /><Routes><Route path="/products/master-catalog" element={<Products />} /><Route path="/products/:id/edit" element={<ProductCreatePage />} /></Routes></MemoryRouter>);
    if (kind === 'variant') {
      fireEvent.click(await screen.findByRole('link', { name: `Manage 2 variants for ${product.name}` }));
    } else {
      fireEvent.click(await screen.findByRole('link', { name: `Open Product Master details for ${product.name}` }));
      fireEvent.click(screen.getByRole('button', { name: 'Manage pricing & stock' }));
    }
    expect(screen.getByTestId('sku-path')).toHaveTextContent(`/products/${product.id}/edit?section=commerce`);
    expect(screen.getByRole('button', { name: /^Pricing & Inventory/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Pricing & Inventory' })).toBeVisible();
    if (kind === 'variant') {
      expect(screen.getByRole('heading', { name: 'Variants' })).toBeVisible();
      expect(screen.getByRole('table', { name: 'Variant pricing matrix' })).toBeVisible();
      expect(screen.getByDisplayValue('CHILD-ONLY-BLUE')).toBeVisible();
    } else {
      expect(screen.getByText('SINGLE-DISCOVERY', { selector: 'span.break-all' })).toBeVisible();
      expect(screen.queryByRole('table', { name: 'Variant pricing matrix' })).not.toBeInTheDocument();
    }
  });
});
