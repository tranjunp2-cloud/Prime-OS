// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import Products from './Products';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { clearInventoryStore } from '@/lib/inventory-store';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
const id = 'lifecycle-ui-test';
let product: Product;
function mount(path = `/products/${id}/edit?section=distribution`) {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/products/:id/edit" element={<ProductCreatePage />} /><Route path="/products/master-catalog" element={<Products />} /></Routes></MemoryRouter>);
}
async function openMenu(name = 'Product actions') { fireEvent.keyDown(await screen.findByRole('button', { name }), { key: 'ArrowDown' }); }
beforeEach(() => {
  clearInventoryStore();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  product = { ...getProducts()[0], id, name: 'Disposable lifecycle fixture', sku_code: 'LIFECYCLE-UI', status: 'draft', has_variants: false, product_type: 'single', channels: [], channel_overrides: {}, inventory: {}, skus: [],
    inventory_adjustments: [], inventory_transfers: [], associations: [], revisions: [], import_result: undefined, images: [], description: '', record_version: 1 };
  addProduct(product);
});
afterEach(() => { cleanup(); deleteProduct(id); clearInventoryStore(); vi.restoreAllMocks(); });

describe('Product lifecycle UI', () => {
  it('allows deletion from detail, supports Cancel, then returns to the list after confirmation', async () => {
    mount(); await openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete permanently' }));
    let dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(product.name)).toBeVisible();
    expect(within(dialog).getByText(product.sku_code)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(getProductById(id)).toBeDefined();
    await openMenu(); fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete permanently' }));
    dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }));
    expect(getProductById(id)).toBeUndefined();
    expect(screen.getByRole('heading', { name: 'Product Master' })).toBeVisible();
  });
  it('uses the same deletion confirmation from the list', async () => {
    mount('/products/master-catalog'); await openMenu(`More actions for ${product.name}`);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete permanently' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete permanently' }));
    expect(getProductById(id)).toBeUndefined();
  });
  it.each(['detail', 'list'])('explains blocked deletion in the %s menu', async surface => {
    updateProduct(id, { id, inventory: { wh_crjp: 3 } });
    mount(surface === 'list' ? '/products/master-catalog' : undefined);
    await openMenu(surface === 'list' ? `More actions for ${product.name}` : 'Product actions');
    expect(await screen.findByRole('menuitem', { name: 'Delete permanently' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Stock or reserved quantities remain/)).toBeVisible();
  });
  it('rechecks dependencies when the user confirms deletion', async () => {
    mount(); await openMenu(); fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete permanently' }));
    updateProduct(id, { id, inventory: { wh_crjp: 2 } });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete permanently' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Stock or reserved');
    expect(getProductById(id)).toBeDefined();
  });
  it('shows Restore instead of readiness/publish prompts for Archived products', () => {
    updateProduct(id, { id, status: 'archived', import_result: 'published' });
    mount();
    expect(screen.getByRole('button', { name: 'Restore product' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Complete product' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Product readiness' })).not.toBeInTheDocument();
    expect(screen.queryByText('Complete required Master data before creating or publishing listings')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Product editor workspaces' })).getByRole('button', { name: /^Product data/ }));
    expect(screen.getByDisplayValue(product.name)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Restore product' }));
    expect(getProductById(id)?.status).toBe('draft');
    expect(screen.getByDisplayValue(product.name)).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Complete product' })).toBeVisible();
  });
  it('archives an Active product only after confirmation', async () => {
    updateProduct(id, { id, status: 'published' });
    mount(); await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Delete permanently' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive product' }));
    expect(getProductById(id)?.status).toBe('published');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive product' }));
    expect(getProductById(id)?.status).toBe('archived');
  });
  it('does not expose lifecycle actions to a viewer', () => {
    updateProduct(id, { id, status: 'archived' });
    mount(`/products/${id}/edit?mode=viewer`);
    expect(screen.queryByRole('button', { name: 'Product actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore product' })).not.toBeInTheDocument();
  });
});
