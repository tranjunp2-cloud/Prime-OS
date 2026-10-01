// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Products from './Products';
import { addProduct, deleteProduct, getProducts, type Product } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));
let products: Product[] = [];

beforeEach(() => {
  const base: Product = { ...getProducts()[0], id: '', name: '', sku_code: '', status: 'draft',
    channels: [], channel_overrides: {}, import_result: undefined, import_source: undefined,
    import_sources: [], import_issues: [], inventory: { wh_crjp: 100 }, revisions: [] };
  products = ['imported-live', 'local-draft', 'active-master', 'inactive'].map((key, index) => ({
    ...base, id: `listing-state-${key}`, name: `Listing state fixture ${key}`, sku_code: `STATE-${key}`,
    status: index === 2 ? 'published' as const : 'draft' as const,
    import_source: index === 0 ? 'Shopee · Existing store' : undefined,
    channels: [{ channel: 'shopee' as const, external_id: `SHO-${key}`, status: index === 0 ? 'active' as const : index === 3 ? 'inactive' as const : 'draft' as const, listing_url: null, last_synced_at: null }],
  }));
  products.forEach(addProduct);
});
afterEach(() => { cleanup(); products.forEach(product => deleteProduct(product.id)); });
async function mount() {
  render(<MemoryRouter initialEntries={['/products/master-catalog?q=Listing state fixture']}><Products /></MemoryRouter>);
  await screen.findByRole('link', { name: `Open Product Master details for ${products[0].name}` });
}
function row(index: number) { return within(screen.getByRole('link', { name: `Open Product Master details for ${products[index].name}` }).closest('tr')!); }

describe('seller-facing linked listing states', () => {
  it('keeps the original logo trigger, shop, SKU and stock while explaining a live listing with Draft Master', async () => {
    await mount();
    const trigger = row(0).getByRole('button', { name: /Shopee, Existing store, SKU SHO-imported-live, stock \d+ units, Live on channel, Master Draft, Not verified/ });
    act(() => trigger.focus());
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Existing store');
    expect(tooltip).toHaveTextContent('Shop SKU');
    expect(tooltip).toHaveTextContent('Listing stock');
    expect(tooltip).toHaveTextContent('Listing statusLive on channel');
    expect(tooltip).toHaveTextContent('Master statusDraft');
    expect(tooltip).toHaveTextContent('these statuses are independent');
    expect(tooltip).not.toHaveTextContent('Synced');
    expect(row(0).getByText('Draft', { exact: true })).toBeVisible();
  });

  it('shows an unsent listing as Draft, without a processing or fabricated stock warning', async () => {
    await mount();
    const trigger = row(1).getByRole('button', { name: /stock Not reported, Draft — not sent, Master Draft/ });
    expect(trigger.querySelector('.bg-slate-400')).not.toBeNull();
    expect(row(1).queryByRole('button', { name: /processing|Show affected shops/ })).not.toBeInTheDocument();
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent('This listing has not been sent to the channel.');
  });

  it('does not make a draft listing live when the Master is Active, or hide an inactive link', async () => {
    await mount();
    expect(row(2).getByText('Active', { exact: true })).toBeVisible();
    expect(row(2).getByRole('button', { name: /Draft — not sent, Master Active/ })).toBeVisible();
    expect(row(3).getByRole('button', { name: /Inactive, Master Draft/ })).toBeVisible();
  });
});
