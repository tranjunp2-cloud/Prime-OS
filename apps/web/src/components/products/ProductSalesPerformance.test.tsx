// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSalesPerformance } from './ProductSalesPerformance';
import { getProducts, type Product } from '@/lib/product-store';
import { demoProductSales, summarizeProductSales, type ProductSalesData } from '@/lib/product-sales-performance';

const now = new Date('2026-10-05T12:00:00Z');
const product: Product = { ...getProducts()[0], id: 'sales-fixture', name: 'Brush set', sku_code: 'BRUSH', status: 'draft', channels: ['amazon', 'shopee', 'lazada'].map((channel, index) => ({ channel: channel as 'amazon' | 'shopee' | 'lazada', external_id: `listing-${index}`, store_name: `Shop ${index + 1}`, status: 'active', listing_url: null, last_synced_at: null })) };
afterEach(cleanup);
function mount(props: Partial<React.ComponentProps<typeof ProductSalesPerformance>> = {}) {
  return render(<ProductSalesPerformance product={product} onReviewChannels={vi.fn()} now={now} {...props} />);
}

describe('ProductSalesPerformance', () => {
  it('shows missing data honestly and never defaults to fabricated sales for a new Master', () => {
    mount();
    expect(screen.getByText('Sales data unavailable')).toBeVisible();
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sales summary')).not.toBeInTheDocument();
    expect(screen.getByText('0/3 shops with complete period data')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Preview demo' })).toBeEnabled();
  });
  it('offers a channel-listings path when no shops are linked', () => {
    const onReviewChannels = vi.fn();
    mount({ product: { ...product, channels: [] }, onReviewChannels });
    expect(screen.getByText('No linked shops yet')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Preview demo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View channel listings' }));
    expect(onReviewChannels).toHaveBeenCalledOnce();
  });
  it('labels all examples and supports 7/30/90 days without mutating a draft Master', () => {
    const before = JSON.stringify(product);
    mount({ showDemoInitially: true });
    expect(screen.getByText('Demo data')).toBeVisible();
    expect(screen.getByLabelText('Sales period')).toHaveValue('30');
    const thirtyDays = screen.getByLabelText('Sales summary').textContent;
    fireEvent.change(screen.getByLabelText('Sales period'), { target: { value: '7' } });
    expect(screen.getByLabelText('Sales period')).toHaveValue('7');
    expect(screen.getByLabelText('Sales summary').textContent).not.toBe(thirtyDays);
    fireEvent.change(screen.getByLabelText('Sales period'), { target: { value: '90' } });
    expect(screen.getByLabelText('Sales period')).toHaveValue('90');
    fireEvent.click(screen.getByRole('button', { name: 'Hide demo' }));
    expect(screen.getByText('Sales data unavailable')).toBeVisible();
    expect(JSON.stringify(product)).toBe(before);
  });
  it('drills into the selected product/shop/period, loads more and restores focus', async () => {
    mount({ showDemoInitially: true });
    const trigger = screen.getByRole('button', { name: 'View orders for Shop 2' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = within(await screen.findByRole('dialog', { name: 'Demo orders' }));
    expect(dialog.getByText(/Shop 2 · Brush set/)).toBeVisible();
    expect(dialog.getByText(/Illustrative orders, not records/)).toBeVisible();
    const list = dialog.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    expect(list.textContent).not.toContain('DEMO-1-');
    fireEvent.click(dialog.getByRole('button', { name: 'Load more orders' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(40);
    fireEvent.click(dialog.getByRole('button', { name: 'Back to overview' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it.each([1, 3])('shows real zero rather than missing data for %s shops, without claiming a winner', count => {
    const fixture = { ...product, channels: product.channels.slice(0, count) };
    const data: ProductSalesData = { ...demoProductSales(fixture, now), demo: false, lines: [] };
    mount({ product: fixture, data, showDemoInitially: true }); // A real adapter always takes precedence over a demo preference.
    expect(screen.getByText(/No completed sales in this period/)).toBeVisible();
    expect(screen.queryByText('Sales data unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
    expect(screen.queryByText(/Top-selling shop|tied for first/)).not.toBeInTheDocument();
    expect(screen.queryByText(/100.0%/)).not.toBeInTheDocument();
  });
  it('labels partial coverage and excludes unrankable shops from interaction', () => {
    const data = demoProductSales(product, now);
    data.shops[1].coveredFrom = '2026-10-01T00:00:00Z';
    data.shops[2].coveredFrom = null;
    mount({ data });
    expect(screen.getByText(/Partial coverage/)).toBeVisible();
    expect(screen.getByText('1/3 shops with complete period data')).toBeVisible();
    expect(screen.getByText(/Incomplete period/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'View orders for Shop 2' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View orders for Shop 1' })).toBeEnabled();
  });
  it('makes metric definitions available on click without hover', () => {
    mount({ showDemoInitially: true });
    const trigger = screen.getByText('How sales are counted');
    fireEvent.click(trigger);
    const help = within(screen.getByRole('dialog', { name: 'Sales definitions and coverage' }));
    expect(help.getByText(/returns are not deducted/)).toBeVisible();
    expect(help.getByText('30 completed days · UTC')).toBeVisible();
    expect(help.getByText(/Illustrative sales and orders only/)).toBeVisible();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('shows the precise sales timestamp inline and distinguishes demo snapshots from real syncs', () => {
    const data = demoProductSales(product, now);
    const view = mount({ data });
    expect(screen.getByLabelText('Sales data freshness')).toHaveTextContent('Demo snapshot: 05 Oct 2026, 00:00 UTC');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<ProductSalesPerformance product={product} data={{ ...data, demo: false }} now={now} onReviewChannels={vi.fn()} />);
    expect(screen.getByLabelText('Sales data freshness')).toHaveTextContent('Updated: 05 Oct 2026, 00:00 UTC');
    expect(screen.getByLabelText('Sales data freshness').querySelector('time')).toHaveAttribute('datetime', '2026-10-05T00:00:00.000Z');
  });
  it('shows every shop and all shop metrics directly in Overview, without a view-all step', async () => {
    const manyShops = { ...product, channels: [...product.channels, ...product.channels.map((listing, index) => ({ ...listing, store_name: `Extra shop ${index}`, external_id: `extra-${index}` }))] };
    const data = demoProductSales(manyShops, now);
    const summary = summarizeProductSales(manyShops.id, data, 30, now);
    mount({ product: manyShops, data });
    const overview = within(screen.getByRole('region', { name: 'Sales performance' }));
    expect(overview.getAllByRole('button', { name: /^View orders for/ })).toHaveLength(6);
    expect(overview.getByLabelText('Sales summary')).toHaveTextContent(summary.units.toLocaleString('en-US'));
    expect(overview.queryByRole('button', { name: /^View all shops/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const table = within(overview.getByRole('table', { name: /^All 6 shops/ }));
    expect(table.getAllByRole('columnheader')).toHaveLength(5);
    expect(table.getByRole('columnheader', { name: 'Units sold' })).toHaveAttribute('aria-sort', 'descending');
    for (const shop of summary.rows) {
      const row = within(table.getByRole('button', { name: `View orders for ${shop.name}` }).closest('tr')!);
      const cells = row.getAllByRole('cell');
      expect(cells[0]).toHaveTextContent(shop.name);
      expect(cells[1]).toHaveTextContent(shop.units.toLocaleString('en-US'));
      expect(cells[2]).toHaveTextContent(shop.orders.toLocaleString('en-US'));
      expect(cells[3]).toHaveTextContent(`${(shop.units / summary.units * 100).toFixed(1)}%`);
      if (shop.change !== null) expect(cells[4]).toHaveTextContent(`${shop.change.toFixed(1)}%`);
    }
    const lastShop = summary.rows[5];
    const trigger = table.getByRole('button', { name: `View orders for ${lastShop.name}` });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = within(screen.getByRole('dialog', { name: 'Demo orders' }));
    expect(dialog.getByText(new RegExp(`${lastShop.name} · Brush set`))).toBeVisible();
    expect(dialog.queryByRole('button', { name: 'All shops' })).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Back to overview' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps tied winners accurate without repeating a top-selling summary', () => {
    const data = demoProductSales(product, now);
    data.lines = data.shops.map((shop, index) => ({ id: `tie-${index}`, orderId: `order-${index}`, productId: product.id, shopId: shop.id, listingId: 'tie', sku: 'BRUSH', quantity: 5, completedAt: '2026-10-01T12:00:00Z', status: 'completed' as const }));
    mount({ data });
    expect(screen.getByText('3 shops tied for first · 5 units each')).toBeVisible();
    expect(screen.queryByText('Top-selling shop')).not.toBeInTheDocument();
  });
  it('shows one shop once, without a ranking, duplicate totals, share or view-all action', async () => {
    const fixture = { ...product, channels: product.channels.slice(0, 1) };
    const before = JSON.stringify(fixture);
    mount({ product: fixture, showDemoInitially: true });
    expect(screen.getByRole('heading', { name: 'Linked shop' })).toBeVisible();
    expect(screen.getAllByText('Shop 1', { exact: true })).toHaveLength(1);
    expect(screen.queryByText('Top-selling shop')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Top shops' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    expect(screen.queryByText(/100.0%/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^View all shops/ })).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'View orders for Shop 1' });
    trigger.focus();
    fireEvent.click(trigger);
    const orders = within(screen.getByRole('dialog', { name: 'Demo orders' }));
    expect(orders.getByRole('list')).toBeVisible();
    expect(orders.getByText('units sold vs. prior 30 days')).toBeVisible();
    expect(orders.queryByRole('button', { name: 'All shops' })).not.toBeInTheDocument();
    fireEvent.click(orders.getByRole('button', { name: 'Back to overview' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(JSON.stringify(fixture)).toBe(before);
  });
  it.each([2, 3])('shows all %s shops once with no unnecessary view-all action', count => {
    const fixture = { ...product, channels: product.channels.slice(0, count) };
    mount({ product: fixture, showDemoInitially: true });
    expect(screen.getByRole('heading', { name: 'Sales by shop' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^View orders for/ })).toHaveLength(count);
    for (let index = 1; index <= count; index++) expect(screen.getAllByText(`Shop ${index}`, { exact: true })).toHaveLength(1);
    expect(screen.queryByText('Top-selling shop')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^View all shops/ })).not.toBeInTheDocument();
  });
  it.each(['missing', 'partial'])('keeps one-shop %s coverage distinct from zero and does not offer unavailable orders', coverage => {
    const fixture = { ...product, channels: product.channels.slice(0, 1) };
    const data = demoProductSales(fixture, now);
    data.shops[0].coveredFrom = coverage === 'partial' ? '2026-10-01T00:00:00Z' : null;
    mount({ product: fixture, data });
    expect(screen.getByText('Sales data unavailable')).toBeVisible();
    expect(screen.getByText(coverage === 'partial' ? 'Amazon · Incomplete period' : 'Amazon · Not synced')).toBeVisible();
    expect(screen.queryByLabelText('Sales summary')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^View orders for|^View all shops/ })).not.toBeInTheDocument();
  });
  it('keeps unsynced shops visible beyond the former preview limit without inventing zero values', () => {
    const fixture = { ...product, channels: [...product.channels, ...product.channels.map((listing, index) => ({ ...listing, store_name: `Unsynced ${index}`, external_id: `unsynced-${index}` }))] };
    mount({ product: fixture });
    const table = within(screen.getByRole('table', { name: /^All 6 shops/ }));
    expect(table.getAllByRole('row')).toHaveLength(7);
    expect(table.getAllByText('Not synced')).toHaveLength(6);
    expect(table.queryByRole('button', { name: /^View orders for/ })).not.toBeInTheDocument();
    for (const row of table.getAllByRole('row').slice(1)) {
      const cells = within(row).getAllByRole('cell');
      expect(cells[1]).toHaveTextContent('—');
      expect(cells[2]).toHaveTextContent('—');
    }
    expect(screen.queryByRole('button', { name: /^View all shops/ })).not.toBeInTheDocument();
  });
  it('keeps shop headings and row comparison labels plain while retaining metric help', () => {
    mount({ showDemoInitially: true });
    expect(within(screen.getByRole('heading', { name: 'Sales by shop' })).queryByRole('button')).not.toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(within(table.getByRole('columnheader', { name: 'Shop', exact: true })).queryByRole('button')).not.toBeInTheDocument();
    expect(within(table.getByRole('columnheader', { name: 'vs. prior 30d' })).queryByRole('button')).not.toBeInTheDocument();
    expect(table.queryByRole('button', { name: /^vs\. prior/ })).not.toBeInTheDocument();
    for (const label of ['Units sold', 'Orders', 'Share']) {
      expect(within(table.getByRole('columnheader', { name: label, exact: true })).getByRole('button', { name: label, exact: true })).toBeInTheDocument();
    }
    expect(within(screen.getByLabelText('Sales summary')).getByRole('button', { name: 'vs. prior 30 days' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sales period'), { target: { value: '7' } });
    expect(table.getByRole('columnheader', { name: 'vs. prior 7d' })).toBeInTheDocument();
    expect(table.queryByRole('button', { name: /^vs\. prior/ })).not.toBeInTheDocument();
  });
  it('explains totals, shop columns and the selected comparison period without changing sales data', async () => {
    const before = JSON.stringify(product);
    mount({ showDemoInitially: true });
    const summary = within(screen.getByLabelText('Sales summary'));
    fireEvent.click(summary.getByRole('button', { name: 'Units sold', exact: true }));
    let help = within(screen.getByRole('dialog', { name: 'Units sold explained' }));
    expect(help.getByText(/A pack counts as one unit/)).toBeVisible();
    expect(help.getByText(/returns are not deducted/)).toBeVisible();
    fireEvent.click(help.getByRole('button', { name: 'Close Units sold help' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const table = within(screen.getByRole('table'));
    fireEvent.click(within(table.getByRole('columnheader', { name: 'Share' })).getByRole('button', { name: 'Share' }));
    help = within(screen.getByRole('dialog', { name: 'Share explained' }));
    expect(help.getByText(/40 of 100 units is 40%/)).toBeVisible();
    fireEvent.click(help.getByRole('button', { name: 'Close Share help' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Sales period'), { target: { value: '7' } });
    fireEvent.click(summary.getByRole('button', { name: 'vs. prior 7 days' }));
    help = within(screen.getByRole('dialog', { name: 'vs. prior 7 days explained' }));
    expect(help.getByText(/immediately preceding 7 days/)).toBeVisible();
    expect(help.getByText(/previous period had zero sales/)).toBeVisible();
    expect(JSON.stringify(product)).toBe(before);
  });
});
