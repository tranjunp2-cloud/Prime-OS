// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductActivityHistory } from './ProductActivityHistory';
import { getProducts, type Product } from '@/lib/product-store';
import { listingActivityKey, withProductActivity } from '@/lib/product-activity';

afterEach(cleanup);
function fixture() {
  const product: Product = { ...getProducts()[0], channels: [], activity: [], revisions: [{ id: 'revision-one', number: 1, createdAt: '2026-09-01T00:00:00Z', createdBy: 'Demo seller', summary: 'Master activated', status: 'published' }] };
  return withProductActivity(product, { ...product, channels: [
    { channel: 'amazon', external_id: 'A-1', store_name: 'Shop A', shop_sku: 'AMZ-1', status: 'draft', last_synced_at: null, listing_url: null },
    { channel: 'lazada', external_id: 'L-1', store_name: 'Shop B', shop_sku: 'LZD-1', status: 'draft', last_synced_at: null, listing_url: null },
  ] });
}
describe('Unified product activity history', () => {
  it('filters one listing even when another listing belongs to the same shop and channel', () => {
    const product = fixture();
    const next = withProductActivity(product, { ...product, channels: [...product.channels, { ...product.channels[0], external_id: 'A-2', shop_sku: 'AMZ-2' }] });
    render(<ProductActivityHistory product={next} initialListingKey={listingActivityKey(product.channels[0])} />);
    const timeline = within(screen.getByRole('list'));
    expect(timeline.getAllByRole('listitem')).toHaveLength(1);
    expect(timeline.getByText('AMZ-1')).toBeVisible();
    expect(timeline.queryByText('AMZ-2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Selected listing · Clear filter' }));
    expect(timeline.getAllByRole('listitem')).toHaveLength(3);
  });
  it('filters by Master, listings and individual shops', () => {
    render(<ProductActivityHistory product={fixture()} />);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Master' }));
    expect(screen.getByText('Master version v1 recorded')).toBeVisible();
    expect(screen.queryByText('Amazon · Shop A')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Listings' }));
    expect(screen.queryByText('Master version v1 recorded')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Shop'), { target: { value: JSON.stringify(['amazon', 'Shop A']) } });
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    expect(within(screen.getByRole('list')).getByText('Amazon · Shop A')).toBeVisible();
  });
  it('opens version metadata separately without restore or publication controls', () => {
    render(<ProductActivityHistory product={fixture()} />);
    fireEvent.click(screen.getByRole('button', { name: 'View version' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Master version v1' })).toBeVisible();
    expect(dialog.getByText('Master activated')).toBeVisible();
    expect(dialog.queryByRole('button', { name: /Restore|Publish/ })).not.toBeInTheDocument();
  });
  it('clearly labels and toggles demo events without changing product data', () => {
    const product = fixture(); const before = JSON.stringify(product);
    render(<ProductActivityHistory product={product} showDemoInitially />);
    expect(screen.getAllByText('Demo', { exact: true })).toHaveLength(3);
    expect(screen.getByText('Listing sync failed')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Hide demo events' }));
    expect(screen.queryByText('Listing sync failed')).not.toBeInTheDocument();
    expect(JSON.stringify(product)).toBe(before);
  });
  it('shows a useful empty state instead of inventing historic events', () => {
    render(<ProductActivityHistory product={{ ...fixture(), activity: [], revisions: [] }} />);
    expect(screen.getByText('No activity in this view')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Show demo events' })).toBeVisible();
  });
  it('opens scoped listing activity from a channel entry point', () => {
    render(<ProductActivityHistory product={fixture()} initialListingChannel="lazada" />);
    expect(screen.getByRole('button', { name: 'Listings' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    expect(within(screen.getByRole('list')).getByText('Lazada · Shop B')).toBeVisible();
  });
});
