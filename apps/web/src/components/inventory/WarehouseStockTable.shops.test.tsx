// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getProducts, type Product, type ChannelListing } from '@/lib/product-store';
import type { ConnectedChannelRecord } from '@/lib/channel-integrations-api';
import { WarehouseStockTable } from './WarehouseStockTable';

afterEach(cleanup);
const warehouses = [{ id: 'wh_crjp', name: 'Japan HQ' }, { id: 'wh_3plvn', name: 'Vietnam' }];
const shops: ConnectedChannelRecord[] = [
  { id: 'a', platform: 'amazon', name: 'Amazon', store_name: 'Amazon shop', region: 'JP', type: 'Marketplace', status: 'SYNC_ERROR', synced_listings: 0, sync_progress: 100, errors: 1, last_sync_at: '', warehouse: { ...warehouses[0], code: 'JP', city: '' }, sync_services: { stock: false, orders: true, price: true } },
  { id: 'b', platform: 'shopee', name: 'Shopee', store_name: 'Shopee shop', region: 'VN', type: 'Marketplace', status: 'CONNECTED', synced_listings: 0, sync_progress: 100, errors: 0, last_sync_at: '', warehouse: { ...warehouses[1], code: 'VN', city: '' }, sync_services: { stock: true, orders: true, price: true } },
];
const link = (channel: ChannelListing['channel'], store_name: string, id: string): ChannelListing => ({ channel, store_name, external_id: id, status: 'active', listing_url: null, last_synced_at: null });
const base = { ...getProducts()[0], has_variants: false, skus: [], channel_overrides: {}, import_sources: [] };
const products: Product[] = [
  { ...base, id: 'mixed', name: 'Mixed product', sku_code: 'MIXED', inventory: { wh_crjp: 7, wh_3plvn: 4 }, channels: [link('amazon', 'Amazon shop', 'a-1'), link('shopee', 'Shopee shop', 'b-1')] },
  { ...base, id: 'other', name: 'Other warehouse product', sku_code: 'OTHER', inventory: { wh_crjp: 3 }, channels: [link('shopee', 'Shopee shop', 'b-2')] },
  { ...base, id: 'unknown', name: 'Unknown source product', sku_code: 'UNKNOWN', inventory: { wh_crjp: 2 }, channels: [link('amazon', '', 'unknown')] },
];
const props = { products, shops, warehouses, onShowAll: () => {} };

describe('warehouse-scoped shop UI', () => {
  it('distinguishes overview listing channels from shop counts at a single warehouse', () => {
    const view = render(<WarehouseStockTable {...props} warehouseId="" />);
    expect(screen.getByRole('columnheader', { name: 'Listed on' })).toBeVisible();
    expect(screen.getByLabelText('Listing channel')).toBeEnabled();
    expect(screen.getByRole('row', { name: /Mixed product/ })).toHaveTextContent('2 channels');
    view.rerender(<WarehouseStockTable {...props} warehouseId="wh_crjp" />);
    expect(screen.getByRole('columnheader', { name: 'Shops using this warehouse' })).toBeVisible();
    const row = screen.getByRole('row', { name: /Mixed product/ });
    expect(row).toHaveTextContent('1 shop');
    expect(row).not.toHaveTextContent('Shopee');
    expect(screen.getByRole('row', { name: /Other warehouse product/ })).toHaveTextContent('No shops currently using');
    expect(screen.getByRole('row', { name: /Unknown source product/ })).toHaveTextContent('Shop source unconfirmed');
    const filter = within(screen.getByLabelText('Shop using this warehouse'));
    expect(filter.getByRole('option', { name: 'Amazon shop · Amazon' })).toBeInTheDocument();
    expect(filter.queryByRole('option', { name: /Shopee/ })).not.toBeInTheDocument();
  });
  it('shows the exact shop and disabled sync in a drawer without expanding the row', () => {
    render(<WarehouseStockTable {...props} products={[{ ...products[0], has_variants: true, skus: [{ id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', weight_g: 0, units_per_carton: 1, status: 'active', stock_by_location: { wh_crjp: 7 } }] }]} warehouseId="wh_crjp" />);
    const row = screen.getByRole('button', { name: 'Mixed product', exact: true }).closest('tr')!;
    fireEvent.click(screen.getByRole('button', { name: 'Shops using Japan HQ for Mixed product' }));
    const drawer = within(screen.getByRole('dialog'));
    expect(drawer.getByText('Amazon shop')).toBeVisible();
    expect(drawer.queryByText('Shopee shop')).not.toBeInTheDocument();
    expect(drawer.getByText(/Shop stock sync:/)).toHaveTextContent('Disabled');
    expect(drawer.getByText('Listing stock sync: Not configured')).toBeVisible();
    expect(drawer.getByText(/Sync needs attention/)).toBeVisible();
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(drawer.getByRole('button', { name: 'Close' }));
    expect(row).toHaveAttribute('aria-expanded', 'false');
  });
  it('filters products and totals by the confirmed shop and resets shop scope when changing warehouses', () => {
    const view = render(<WarehouseStockTable {...props} warehouseId="wh_crjp" />);
    fireEvent.change(screen.getByLabelText('Shop using this warehouse'), { target: { value: 'a' } });
    expect(screen.getByRole('columnheader', { name: /^Product/ })).toHaveTextContent('1 product');
    expect(screen.getByRole('columnheader', { name: /^Stock/ })).toHaveTextContent('7');
    expect(screen.queryByRole('button', { name: 'Unknown source product', exact: true })).not.toBeInTheDocument();
    view.rerender(<WarehouseStockTable {...props} warehouseId="wh_3plvn" />);
    expect(screen.getByLabelText('Shop using this warehouse')).toHaveValue('all');
    expect(screen.getByRole('option', { name: 'Shopee shop · Shopee' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Amazon shop · Amazon' })).not.toBeInTheDocument();
  });
  it('keeps loading and failed shop data distinct from no shop sources', () => {
    const view = render(<WarehouseStockTable {...props} products={[products[0]]} warehouseId="wh_crjp" shopLinksState="loading" />);
    expect(screen.getByLabelText('Shop using this warehouse')).toBeDisabled();
    expect(screen.getByRole('row', { name: /Mixed product/ })).toHaveTextContent('Loading shops…');
    view.rerender(<WarehouseStockTable {...props} products={[products[0]]} warehouseId="wh_crjp" shopLinksState="error" />);
    expect(screen.getByRole('row', { name: /Mixed product/ })).toHaveTextContent('Shops unavailable');
    expect(screen.queryByText('No shops currently using')).not.toBeInTheDocument();
  });
});
