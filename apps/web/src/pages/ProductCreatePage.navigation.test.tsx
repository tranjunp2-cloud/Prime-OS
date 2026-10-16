// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProductCreatePage from './ProductCreatePage';
import { addProduct, deleteProduct, getProductById, getProducts } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
const id = 'setup-navigation-test';
const singleTitle = 'Attributes, pricing & inventory';
const variantTitle = 'Variants, pricing & inventory';
const cardTitles = ['Basic information', 'Product images', singleTitle, 'Dimensions & shipping', 'Customs information'];
function Location() { return <output data-testid="route">{useLocation().search}</output>; }
async function frame() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); }); }
async function mount(query = 'section=setup') {
  render(<MemoryRouter initialEntries={[`/products/${id}/edit?${query}`]}><Routes><Route path="/products/:id/edit" element={<><ProductCreatePage /><Location /></>} /></Routes></MemoryRouter>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
}
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  addProduct({ ...getProducts()[0], id, name: 'Navigation fixture', sku_code: 'SETUP-NAV', has_variants: false, product_type: 'single', skus: [], variant_options: [],
    status: 'draft', revisions: [], import_result: undefined, import_sources: [], channels: [], channel_overrides: {}, country_of_origin: '', hs_code: '', record_version: 1 });
});
afterEach(() => { cleanup(); deleteProduct(id); vi.restoreAllMocks(); });

describe('Product setup section navigation', () => {
  it('uses the five card titles instead of internal form subsections without saving the form', async () => {
    await mount();
    const before = JSON.stringify(getProductById(id));
    fireEvent.change(document.getElementById('product-name')!, { target: { value: 'Unsaved navigation edit' } });
    const links = within(screen.getByRole('list', { name: 'Product setup sections' }));
    expect(links.getAllByRole('button').map(button => button.textContent)).toEqual(cardTitles);
    for (const button of links.getAllByRole('button')) {
      expect(document.getElementById(button.getAttribute('aria-controls')!)?.querySelector('[data-setup-title]')?.textContent).toBe(button.textContent);
    }
    fireEvent.click(links.getByRole('button', { name: singleTitle }));
    await frame();
    expect(document.getElementById('product-section-pricing')).toHaveFocus();
    expect(links.getByRole('button', { name: singleTitle })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByTestId('route')).toHaveTextContent('section=setup&setupSection=sales');
    expect(screen.getByDisplayValue('Unsaved navigation edit')).toBeInTheDocument();
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('opens collapsed shipping and compliance when selected, including from a deep link', async () => {
    await mount('section=setup&setupSection=shipping');
    expect(document.querySelector('#product-section-shipping details')).toHaveAttribute('open');
    expect(document.getElementById('product-section-shipping')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Jump to Product setup section'), { target: { value: 'trade' } });
    await frame();
    expect(document.getElementById('product-section-more')).toHaveFocus();
    expect(within(document.getElementById('product-section-more')!).getByRole('button', { expanded: true })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });
  it('keeps section navigation available in view mode and removes it outside setup', async () => {
    await mount('section=setup&mode=viewer');
    fireEvent.change(screen.getByLabelText('Jump to Product setup section'), { target: { value: 'media' } });
    await frame();
    expect(document.getElementById('product-media-panel')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product editor section'), { target: { value: 'overview' } });
    expect(screen.queryByRole('list', { name: 'Product setup sections' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Jump to Product setup section')).not.toBeInTheDocument();
    expect(screen.getByTestId('route')).not.toHaveTextContent('setupSection');
  });
  it('matches the full card title after switching product type, keeping options and the matrix together', async () => {
    await mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Product with variants' }));
    const links = within(screen.getByRole('list', { name: 'Product setup sections' }));
    await waitFor(() => expect(links.getAllByRole('button').map(button => button.textContent)).toEqual(cardTitles.map(title => title === singleTitle ? variantTitle : title)));
    expect(document.querySelector('#product-section-pricing [data-setup-title]')).toHaveTextContent(variantTitle);
    expect(screen.getByRole('option', { name: variantTitle })).toBeInTheDocument();
    fireEvent.click(links.getByRole('button', { name: variantTitle }));
    await frame();
    expect(document.getElementById('product-section-pricing')).toHaveFocus();
    const setup = within(screen.getByRole('region', { name: 'Attributes and SKU matrix' }));
    expect(setup.getByText('Your SKU matrix updates automatically as you select values.')).toBeVisible();
    expect(setup.getByRole('heading', { name: /SKU matrix/ })).toBeVisible();
  });
  it.each(['structure', 'attributes', 'pricing'])('preserves old %s section links at the Sales card', async section => {
    await mount(`section=setup&setupSection=${section}`);
    expect(document.getElementById('product-section-pricing')).toHaveFocus();
    expect(within(screen.getByRole('list', { name: 'Product setup sections' })).getByRole('button', { name: singleTitle })).toHaveAttribute('aria-current', 'location');
  });
});
