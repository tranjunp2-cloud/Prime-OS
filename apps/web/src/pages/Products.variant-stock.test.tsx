// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Products from './Products';
import { addProduct, deleteProduct, getProducts, updateProduct, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-product-channel-setup', () => ({ useProductChannelSetup: () => ({ snapshot: { status: 'loaded', channels: [] }, retry: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const id = 'catalog-variant-stock-test';
let product: Product;
function Path() { const location = useLocation(); return <output data-testid="path">{location.pathname}{location.search}</output>; }
function show() { render(<MemoryRouter initialEntries={[`/products/master-catalog?q=${id}`]}><Path /><Products /></MemoryRouter>); }
const panel = () => screen.getByRole('region', { name: `Variant stock for ${product.name}` });

beforeEach(() => {
  localStorage.removeItem('prime:demo-data-mode:v1');
  localStorage.removeItem('prime:overview-demo-mode');
  product = { ...getProducts()[0], id, name: id, sku_code: 'CATALOG-PARENT', status: 'published', has_variants: true, product_type: 'variant', inventory: { wh_crjp: 999 }, channels: [], channel_overrides: {}, import_result: undefined, import_sources: [], import_issues: [],
    skus: [
      { id: 'blue', sku_code: 'CATALOG-BLUE', variation_name: 'Blue / A5', status: 'active', weight_g: 0, units_per_carton: 1, stock_by_location: { wh_crjp: 100, wh_fbsmy: 17 } },
      { id: 'red', sku_code: 'CATALOG-RED', variation_name: 'Red / A5', status: 'active', weight_g: 0, units_per_carton: 1, stock_by_location: { wh_crjp: 0 } },
      { id: 'white', sku_code: 'CATALOG-WHITE', variation_name: 'White / A5', status: 'active', weight_g: 0, units_per_carton: 1 },
    ] };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); });

describe('inline catalog variant stock', () => {
  it('expands, drills into SKU warehouses and collapses without navigation or writes', async () => {
    show();
    const before = JSON.stringify(getProducts().find(item => item.id === id));
    const toggle = await screen.findByRole('button', { name: `Show 3 variants for ${id}` });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: `Variant stock for ${id}` })).not.toBeInTheDocument();
    const row = toggle.closest('tr')!;
    expect(within(row).getByText('117 · Partial')).toBeVisible();
    expect(within(row).getByText('1 variant out of stock')).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel()).toHaveAttribute('id', toggle.getAttribute('aria-controls'));
    expect(within(panel()).getByText('CATALOG-WHITE').closest('tr')).toHaveTextContent('Not recorded');
    expect(within(panel()).getByText('CATALOG-RED').closest('tr')).toHaveTextContent('Out of stock');
    const details = within(panel()).getByRole('button', { name: 'Stock by warehouse for CATALOG-BLUE' });
    fireEvent.click(details);
    const warehouses = within(panel()).getByRole('region', { name: 'Warehouses for CATALOG-BLUE' });
    expect(within(warehouses).getByText('100 units')).toBeVisible();
    expect(within(warehouses).getByText('17 units')).toBeVisible();
    expect(within(warehouses).getByText('Channel-managed')).toBeVisible();
    expect(within(panel()).queryByText('999')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent(`/products/master-catalog?q=${id}`);
    expect(JSON.stringify(getProducts().find(item => item.id === id))).toBe(before);
    fireEvent.click(toggle);
    expect(screen.queryByRole('region', { name: `Variant stock for ${id}` })).not.toBeInTheDocument();
  });
  it('opens the same panel from the total or warning and preserves an explicit edit link', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: `${id}: 117 · Partial recorded stock. View variant stock.` }));
    expect(within(panel()).getByRole('link', { name: 'Manage variants' })).toHaveAttribute('href', `/products/${id}/edit?section=setup&setupSection=sales`);
    fireEvent.click(screen.getByText('1 variant out of stock'));
    expect(screen.queryByRole('region', { name: `Variant stock for ${id}` })).not.toBeInTheDocument();
  });
  it('keeps variant stock accessible with hidden parent columns and correct table span', async () => {
    show();
    await screen.findByRole('button', { name: `Show 3 variants for ${id}` });
    fireEvent.click(await screen.findByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Master stock' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Base price' }));
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('button', { name: `Show 3 variants for ${id}` }));
    const parentTable = panel().closest('table')!;
    expect(panel().closest('td')).toHaveAttribute('colspan', String(parentTable.querySelector('thead tr')!.children.length));
    expect(within(panel()).getByText('CATALOG-BLUE')).toBeVisible();
  });
  it('does not mark an entirely unknown variant product as out of stock', async () => {
    updateProduct(id, { id, skus: product.skus.map(sku => ({ ...sku, stock_by_location: undefined })) });
    show();
    const toggle = await screen.findByRole('button', { name: `Show 3 variants for ${id}` });
    expect(within(toggle.closest('tr')!).getByText('Not recorded')).toBeVisible();
    expect(within(toggle.closest('tr')!).queryByText(/out of stock/i)).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(within(panel()).getAllByText('Not recorded')).toHaveLength(3);
  });
  it('finds an out-of-stock variant through the stock filter despite a positive parent total', async () => {
    show();
    await screen.findByRole('button', { name: `Show 3 variants for ${id}` });
    fireEvent.change(screen.getByLabelText('Stock status'), { target: { value: 'out-of-stock' } });
    expect(screen.getByRole('button', { name: `Show 3 variants for ${id}` })).toBeVisible();
    expect(screen.getByText('117 · Partial')).toBeVisible();
  });
  it('keeps empty variants discoverable and offers setup', async () => {
    updateProduct(id, { id, skus: [] }); show();
    fireEvent.click(await screen.findByRole('button', { name: `Show 0 variants for ${id}` }));
    expect(within(panel()).getByText('No variants yet. Add variant options in Product setup.')).toBeVisible();
    expect(within(panel()).getByRole('link', { name: 'Manage variants' })).toBeVisible();
  });
});
