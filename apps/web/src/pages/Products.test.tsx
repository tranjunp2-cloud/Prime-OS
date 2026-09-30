// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Products from './Products';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProducts, updateProduct, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

function Harness() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/products/master-catalog?q=')}>Reopen product list</button><Products /></>;
}

afterEach(cleanup);

describe('Product Master list default tab', () => {
  it('opens All by default and still allows switching to Needs attention', () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>);
    const all = screen.getByRole('button', { name: /^All\s*\d+$/ });
    expect(all).toHaveClass('text-primary');
    expect(screen.queryByText('Priority queue')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Needs attention/ }));
    expect(screen.getByText('Priority queue')).toBeInTheDocument();
    fireEvent.click(all);
    expect(screen.queryByText('Priority queue')).not.toBeInTheDocument();
  });

  it('resets to All when entering the list with a new URL', () => {
    render(<MemoryRouter initialEntries={['/products/master-catalog']}><Harness /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^Needs attention/ }));
    expect(screen.getByText('Priority queue')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen product list' }));
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveClass('text-primary');
    expect(screen.queryByText('Priority queue')).not.toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: 'Variants', exact: true })).toBeVisible();
      expect(screen.getByRole('table', { name: 'Variant pricing matrix' })).toBeVisible();
      expect(screen.getByDisplayValue('CHILD-ONLY-BLUE')).toBeVisible();
    } else {
      expect(screen.getByText('SINGLE-DISCOVERY', { selector: 'span.break-all' })).toBeVisible();
      expect(screen.queryByRole('table', { name: 'Variant pricing matrix' })).not.toBeInTheDocument();
    }
  });
});
