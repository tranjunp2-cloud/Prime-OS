// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getActiveCatalogBrands, getProductCatalogSettings } from '@/lib/product-catalog-settings-store';
import ProductCategories from './ProductCategories';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

function mount() {
  render(<MemoryRouter initialEntries={['/products/brands']}><TooltipProvider><ProductCategories /></TooltipProvider></MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('brand catalog availability', () => {
  it('creates an Active brand available for product selection without verification', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Add Brand' }));
    const dialog = within(screen.getByRole('dialog', { name: 'New brand' }));
    expect(dialog.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: '  Everyday Brand  ' } });
    fireEvent.click(dialog.getByRole('button', { name: /^Save$/ }));

    expect(getActiveCatalogBrands().find(brand => brand.name === 'Everyday Brand')).toMatchObject({ status: 'Active', mappings: {}, source: 'internal' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Candidate|Unverified|Verify before publishing/i)).not.toBeInTheDocument();
  });

  it('keeps duplicate-name and URL validation when creating a brand', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Add Brand' }));
    const dialog = within(screen.getByRole('dialog', { name: 'New brand' }));
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: '  KURETAKE  ' } });
    expect(dialog.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(dialog.getByText(/A brand with this name already exists/)).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: 'Another Brand' } });
    fireEvent.change(dialog.getByLabelText('Website'), { target: { value: 'not-a-url' } });
    expect(dialog.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText('Website'), { target: { value: 'https://brand.example' } });
    expect(dialog.getByRole('button', { name: /^Save$/ })).toBeEnabled();
  });

  it('offers only internal availability states and preserves marketplace mappings', () => {
    const original = getProductCatalogSettings().brands.find(brand => brand.name === 'Mijello')!;
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Mijello' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Mijello' }));
    const status = dialog.getByLabelText('Status');
    expect(status).toHaveValue('Active');
    expect(within(status).getAllByRole('option').map(option => option.textContent)).toEqual(['Active', 'Inactive']);
    fireEvent.change(status, { target: { value: 'Inactive' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(getProductCatalogSettings().brands.find(brand => brand.id === original.id)).toEqual({ ...original, status: 'Inactive' });
    expect(getActiveCatalogBrands().some(brand => brand.id === original.id)).toBe(false);
  });

  it('uses theme-safe hover tints and still opens the selected brand mapping', () => {
    mount();
    const mapped = within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' });
    expect(mapped).toHaveClass('bg-emerald-500/10', 'hover:bg-emerald-500/20', 'text-emerald-800', 'dark:text-emerald-300');
    fireEvent.click(mapped);
    let dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    expect(dialog.getByRole('tab', { name: 'Channel mapping' })).toHaveAttribute('data-state', 'active');
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add Brand' }));
    dialog = within(screen.getByRole('dialog', { name: 'New brand' }));
    fireEvent.change(dialog.getByLabelText(/Canonical name/), { target: { value: 'Unmapped Brand' } });
    fireEvent.click(dialog.getByRole('button', { name: /^Save$/ }));
    const unmapped = within(screen.getByRole('row', { name: /Unmapped Brand/ })).getByRole('button', { name: '0/5 configured' });
    expect(unmapped).toHaveClass('bg-amber-500/10', 'hover:bg-amber-500/20', 'text-amber-800', 'dark:text-amber-300');
    fireEvent.click(unmapped);
    dialog = within(screen.getByRole('dialog', { name: 'Unmapped Brand' }));
    expect(dialog.getByRole('tab', { name: 'Channel mapping' })).toHaveAttribute('data-state', 'active');
  });

  it('shows realistic, explicitly simulated marketplace cases without an approval toggle', () => {
    mount();
    fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' }));
    const dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    expect(dialog.getByText('Demo only.')).toBeInTheDocument();
    const amazon = within(dialog.getByRole('region', { name: 'Amazon brand mapping' }));
    expect(amazon.getByText('Approval required')).toBeInTheDocument();
    fireEvent.click(amazon.getByRole('button', { name: 'How to resolve' }));
    expect(amazon.getByText(/Prime OS cannot approve it for you/)).toBeInTheDocument();
    fireEvent.click(amazon.getByRole('button', { name: 'Edit name' }));
    fireEvent.change(amazon.getByLabelText('Amazon brand name'), { target: { value: 'New name' } });
    expect(amazon.getByText('Not checked')).toBeInTheDocument();
    expect(amazon.queryByText('Approval required')).not.toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: /verify|approve|publish/i })).not.toBeInTheDocument();
  });

  it('shows the existing marketplace logos beside every channel name', () => {
    mount();
    fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' }));
    const dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    for (const label of ['Amazon', 'Shopee', 'Lazada', 'TikTok Shop', 'Rakuten']) {
      const region = dialog.getByRole('region', { name: `${label} brand mapping` });
      expect(within(region).getByRole('heading', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
      const logo = region.querySelector('svg[viewBox="0 0 48 48"]');
      expect(logo).toBeInTheDocument();
      expect(logo?.parentElement).toHaveClass('size-9', 'shrink-0');
      expect(logo?.parentElement).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('gives unmatched and empty mappings the same simple action without changing saved data', () => {
    const original = getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')!;
    mount();
    fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' }));
    const dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    for (const label of ['Lazada', 'TikTok Shop']) {
      const card = within(dialog.getByRole('region', { name: `${label} brand mapping` }));
      expect(card.getByText('Select brand')).toHaveClass('text-muted-foreground');
      expect(card.getByText(`Find and select your brand on ${label}.`)).toBeInTheDocument();
      expect(card.queryByText(/Needs lookup|Not mapped|Saved value|BR-20418|has not been matched/)).not.toBeInTheDocument();
      fireEvent.click(card.getByRole('button', { name: 'Find brand' }));
      expect(card.getByLabelText(`Search ${label} sample catalog`)).toHaveValue('CYBER-RECORDS');
      expect(card.queryByRole('button', { name: /Clear .* mapping/ })).not.toBeInTheDocument();
    }
    fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(getProductCatalogSettings().brands.find(brand => brand.id === original.id)).toEqual(original);
  });

  it('looks up the brand by name, saves its demo ID and context, and restores it on reopen', () => {
    mount();
    fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' }));
    let dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    let lazada = within(dialog.getByRole('region', { name: 'Lazada brand mapping' }));
    expect(lazada.getByText('Select brand')).toBeInTheDocument();
    fireEvent.click(lazada.getByRole('button', { name: 'Find brand' }));
    expect(lazada.queryByRole('textbox', { name: 'Brand ID' })).not.toBeInTheDocument();
    fireEvent.click(lazada.getByRole('button', { name: 'Select CYBER RECORDS for Lazada' }));
    expect(lazada.getByText('Brand ID: 20418')).toBeInTheDocument();
    expect(lazada.getByText('Brand selected')).toBeInTheDocument();
    // In-memory edits have not changed persisted mappings yet.
    expect(getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')!.mappings.lazada).toBe('BR-20418');
    fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
    const saved = getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')!;
    expect(saved.mappings.lazada).toBe('20418');
    expect(saved.mappingSelections?.lazada?.source).toBe('demo-catalog');
    expect(saved.status).toBe('Active');
    fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' }));
    dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    lazada = within(dialog.getByRole('region', { name: 'Lazada brand mapping' }));
    expect(lazada.getByText('Brand ID: 20418')).toBeInTheDocument();
  });

  it('explains missing catalog results, preserves legacy values, and discards cancelled edits', () => {
    mount();
    const original = getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')!;
    fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: '3/5 configured' }));
    const dialog = within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    const tiktok = within(dialog.getByRole('region', { name: 'TikTok Shop brand mapping' }));
    fireEvent.click(tiktok.getByRole('button', { name: 'Find brand' }));
    expect(tiktok.getByText('No brand found in this sample catalog')).toBeInTheDocument();
    expect(tiktok.getByText(/Do not choose “No Brand”/)).toBeInTheDocument();
    const shopee = within(dialog.getByRole('region', { name: 'Shopee brand mapping' }));
    fireEvent.click(shopee.getByRole('button', { name: 'Change' }));
    fireEvent.click(shopee.getByRole('button', { name: 'Clear Shopee mapping' }));
    expect(shopee.getByText('Select brand')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')).toEqual(original);
  });

  it('suggests a neutral Rakuten name, edits it in place, and persists only on save', () => {
    mount();
    const open = (count: number) => {
      fireEvent.click(within(screen.getByRole('row', { name: /CYBER-RECORDS/ })).getByRole('button', { name: `${count}/5 configured` }));
      return within(screen.getByRole('dialog', { name: 'CYBER-RECORDS' }));
    };
    let dialog = open(3);
    let rakuten = within(dialog.getByRole('region', { name: 'Rakuten brand mapping' }));
    expect(rakuten.getByText('CYBER-RECORDS')).toBeInTheDocument();
    expect(rakuten.getByText('From original brand name')).toBeInTheDocument();
    expect(rakuten.getByText('Not checked')).toHaveClass('text-muted-foreground');
    expect(rakuten.queryByText('Set in listing')).not.toBeInTheDocument();
    expect(rakuten.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
    expect(getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')!.mappings.rakuten).toBeUndefined();
    fireEvent.click(rakuten.getByRole('button', { name: 'Edit' }));
    expect(rakuten.getByLabelText('Rakuten brand name')).toHaveValue('CYBER-RECORDS');
    fireEvent.change(rakuten.getByLabelText('Rakuten brand name'), { target: { value: 'サイバーレコード' } });
    expect(rakuten.getByText('Not checked')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')).toMatchObject({ name: 'CYBER-RECORDS', status: 'Active', mappings: { rakuten: 'サイバーレコード' } });
    dialog = open(4);
    rakuten = within(dialog.getByRole('region', { name: 'Rakuten brand mapping' }));
    expect(rakuten.getByText('サイバーレコード')).toBeInTheDocument();
    fireEvent.click(rakuten.getByRole('button', { name: 'Edit' }));
    fireEvent.click(rakuten.getByRole('button', { name: 'Use original brand name' }));
    expect(rakuten.getByLabelText('Rakuten brand name')).toHaveValue('CYBER-RECORDS');
    expect(rakuten.getByText('Not checked')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(getProductCatalogSettings().brands.find(brand => brand.id === 'cyber-records')!.mappings.rakuten).toBe('サイバーレコード');
  });
});
