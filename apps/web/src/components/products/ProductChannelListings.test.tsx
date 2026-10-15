// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductChannelListings, type ProductChannelListingRow } from './ProductChannelListings';
import { ListingRowActions } from './ListingRowActions';

afterEach(cleanup);

describe('Responsive channel listing content', () => {
  it('keeps each shop, its values, sync control and actions together in the same accessible row', () => {
    const onManage = vi.fn();
    const onSync = vi.fn();
    const rows: ProductChannelListingRow[] = ['Shopee flagship shop', 'Amazon second shop'].map((shop, index) => ({
      id: `listing-${index}`, channelKey: index ? 'amazon' : 'shopee', channelLabel: index ? 'Amazon' : 'Shopee',
      shop, sku: `SHOP-${index}`, price: `${3200 + index} JPY`, stock: `${15 + index} units`,
      context: 'Channel requirements not checked',
      status: <button onClick={() => onSync(shop)}>Sync off</button>,
      actions: <ListingRowActions label={shop} canWrite onManage={() => onManage(shop)} onActivity={vi.fn()} onUnlink={vi.fn()} />,
    }));
    render(<ProductChannelListings rows={rows} />);
    const table = within(screen.getByRole('table', { name: 'Channel listings' }));
    expect(table.getAllByRole('columnheader')).toHaveLength(5);
    const rendered = table.getAllByRole('row').slice(1);
    expect(rendered).toHaveLength(2);
    rendered.forEach((row, index) => {
      const cells = within(row);
      expect(cells.getAllByRole('cell')).toHaveLength(5);
      expect(cells.getByText(rows[index].shop, { exact: false })).toBeVisible();
      expect(cells.getByText(`${3200 + index} JPY`)).toBeVisible();
      expect(cells.getByText(`${15 + index} units`)).toBeVisible();
      expect(cells.getByText('Channel requirements not checked')).toBeVisible();
      fireEvent.click(cells.getByRole('button', { name: 'Sync off' }));
      expect(onSync).toHaveBeenLastCalledWith(rows[index].shop);
      fireEvent.click(cells.getByRole('button', { name: 'Manage listing' }));
      expect(onManage).toHaveBeenLastCalledWith(rows[index].shop);
    });
  });

  it('preserves full long identifiers and the read-only action without duplicating the listing for mobile', () => {
    const shop = 'A very long shop name across multiple marketplaces and international regions';
    const sku = 'LONG-SHOP-SKU-'.repeat(12);
    render(<ProductChannelListings rows={[{
      id: 'long', channelKey: 'shopee', channelLabel: 'Shopee', shop, sku, newlyLinked: true,
      price: 'Not recorded', stock: 'Not recorded', status: <button disabled>Sync off</button>,
      actions: <ListingRowActions label={shop} canWrite={false} onManage={vi.fn()} onActivity={vi.fn()} onUnlink={vi.fn()} />,
    }]} />);
    expect(screen.getAllByText(sku)).toHaveLength(1);
    expect(screen.getByText(/Newly linked/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View listing' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sync off' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Manage listing' })).not.toBeInTheDocument();
  });
});
