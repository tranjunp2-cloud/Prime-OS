// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListingReviewBanner } from './ListingReviewBanner';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
afterEach(cleanup);
const listing = (id: string, channel: CatalogImportItem['channel']) => ({ id, channel } as CatalogImportItem);
describe('Compact listing review banner', () => {
  it('is absent when the pending count is zero', () => {
    const { container } = render(<ListingReviewBanner listings={[]} onReview={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('shows unique actual sources and one non-dismissible action', () => {
    const onReview = vi.fn();
    render(<ListingReviewBanner listings={[listing('a', 'shopee'), listing('b', 'shopee'), listing('c', 'amazon')]} onReview={onReview} />);
    const banner = within(screen.getByRole('region', { name: 'Shop listings to review' }));
    expect(screen.getByRole('region', { name: 'Shop listings to review' })).toHaveTextContent('3 shop listings to review');
    expect(banner.getByText('Shopee, Amazon')).toBeVisible();
    expect(banner.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(banner.getByRole('button', { name: 'Review & link (3)' }));
    expect(onReview).toHaveBeenCalledOnce();
  });
  it('uses singular copy for one pending listing', () => {
    render(<ListingReviewBanner listings={[listing('a', 'lazada')]} onReview={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Shop listings to review' })).toHaveTextContent('1 shop listing to review');
  });
});
