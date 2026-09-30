// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getProducts, updateProduct } from '@/lib/product-store';
import Warehouses from '@/pages/Warehouses';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock('@/lib/channel-integrations-api', () => ({ channelIntegrationsApi: { channels: vi.fn().mockResolvedValue({ data: [] }) } }));

function renderPage(path = '/warehouses') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Warehouses />
    </MemoryRouter>,
  );
}

describe('Warehouse & Inventory workspace', () => {
  afterEach(cleanup);

  it('renders the warehouse overview with settings kept secondary', async () => {
    renderPage();

    expect(screen.queryByRole('navigation', { name: 'Warehouse operations' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My warehouses' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Choose a warehouse' })).toBeInTheDocument();
    expect(screen.getByText('Advanced warehouse settings').closest('details')).not.toHaveAttribute('open');
    expect(await screen.findByText('0 linked shops across 0 sales channels')).toBeInTheDocument();
  });

  it('shows a simple product stock overview', () => {
    renderPage('/warehouse/stock');
    expect(screen.getByRole('heading', { name: 'My warehouses' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total across warehouses' })).toBeInTheDocument();
    expect(screen.getAllByText('Black Hardcover Notebook — Japanese Craft Paper').length).toBeGreaterThan(0);
    expect(screen.queryByText('Available to Promise')).not.toBeInTheDocument();
  });

  it('opens the stock transfer workflow from the page header', () => {
    renderPage('/warehouse/transfers');

    fireEvent.click(screen.getByRole('button', { name: 'Stock actions & history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transfer Stock' }));
    expect(screen.getByRole('heading', { name: 'Create Stock Transfer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Source Warehouse')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination Warehouse')).toBeInTheDocument();
  });

  it('updates the overview and records history after editing a warehouse row', async () => {
    const original = getProducts().find(product => !product.has_variants && typeof product.inventory.wh_crjp === 'number')!;
    try {
      renderPage();
      await screen.findByText('0 linked shops across 0 sales channels');
      fireEvent.change(screen.getByLabelText('Warehouse scope'), { target: { value: 'wh_crjp' } });
      const row = screen.getByRole('button', { name: original.name }).closest('tr')!;
      fireEvent.click(within(row).getByRole('button', { name: 'Adjust stock' }));
      expect(screen.getByRole('heading', { name: 'Adjust stock' })).toBeInTheDocument();
      expect(screen.getByLabelText('Warehouse')).toHaveValue('wh_crjp');
      expect(within(screen.getByRole('dialog')).getByLabelText('Product')).toHaveValue(original.id);
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: String(original.inventory.wh_crjp + 3) } });
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(within(row).getByText(String(original.inventory.wh_crjp + 3))).toBeInTheDocument();
      expect(getProducts().find(product => product.id === original.id)?.inventory_adjustments?.[0].reason).toBe('Physical stock count');
      fireEvent.click(screen.getByRole('button', { name: 'Stock actions & history' }));
      expect(screen.getByText('Physical stock count')).toBeInTheDocument();
    } finally { updateProduct(original.id, original); }
  });

  it('uses the same absolute-count form from New Adjustment and appends to history', async () => {
    const original = getProducts().find(product => !product.has_variants && typeof product.inventory.wh_crjp === 'number')!;
    try {
      renderPage();
      await screen.findByText('0 linked shops across 0 sales channels');
      fireEvent.click(screen.getByRole('button', { name: 'Stock actions & history' }));
      fireEvent.click(screen.getByRole('button', { name: 'New Adjustment' }));
      expect(screen.getByRole('heading', { name: 'Adjust stock' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Quantity Change')).not.toBeInTheDocument();
      expect(within(screen.getByRole('dialog')).getByLabelText('Product')).toHaveValue('');
      expect(screen.getByLabelText('Warehouse')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'wh_crjp' } });
      fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Product'), { target: { value: original.id } });
      fireEvent.change(screen.getByLabelText('New stock'), { target: { value: String(original.inventory.wh_crjp + 6) } });
      expect(screen.getByRole('button', { name: 'Record adjustment' })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Physical stock count' } });
      fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const updated = getProducts().find(product => product.id === original.id)!;
      expect(updated.inventory.wh_crjp).toBe(original.inventory.wh_crjp + 6);
      expect(updated.inventory_adjustments).toHaveLength((original.inventory_adjustments?.length ?? 0) + 1);
      expect(updated.inventory_adjustments?.[0]).toMatchObject({ before: original.inventory.wh_crjp, after: original.inventory.wh_crjp + 6, warehouseId: 'wh_crjp', sku: original.sku_code, reason: 'Physical stock count' });
      fireEvent.click(screen.getByRole('button', { name: 'Stock actions & history' }));
      expect(screen.getByText(`${original.inventory.wh_crjp} → ${original.inventory.wh_crjp + 6}`)).toBeInTheDocument();
    } finally { updateProduct(original.id, original); }
  });

  it('aligns only numeric adjustment columns to the right', () => {
    renderPage('/warehouses');
    fireEvent.click(screen.getByRole('button', { name: 'Stock actions & history' }));

    expect(screen.getByRole('columnheader', { name: 'Quantity Change' })).toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Reason' })).not.toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'Operator & Time' })).not.toHaveClass('text-right');
  });
  it('labels an initial count without pretending that unknown stock was zero', () => {
    const original = getProducts().find(product => !product.has_variants)!;
    try {
      updateProduct(original.id, { id: original.id, inventory_adjustments: [{ id: 'test-initial-count', warehouseId: 'wh_crjp', sku: original.sku_code, before: null, after: 5, reason: 'Physical stock count', createdAt: new Date().toISOString() }] });
      renderPage('/warehouses');
      fireEvent.click(screen.getByRole('button', { name: 'Stock actions & history' }));
      const row = screen.getByText('test-initial-count').closest('tr')!;
      expect(within(row).getByText('Initial count')).toBeInTheDocument();
      expect(within(row).getByText('Not recorded → 5')).toBeInTheDocument();
      expect(within(row).queryByText('+5')).not.toBeInTheDocument();
    } finally { updateProduct(original.id, original); }
  });
});
