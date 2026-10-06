// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductGettingStarted } from './ProductGettingStarted';
import type { ChannelSetupSnapshot } from '@/lib/product-onboarding';
import type { ConnectedChannelRecord } from '@/lib/channel-integrations-api';

afterEach(cleanup);
const callbacks = () => ({ onReview: vi.fn(), onImport: vi.fn(), onCreate: vi.fn(), onRetry: vi.fn(), onShops: vi.fn(), onConnect: vi.fn() });
const connected: ChannelSetupSnapshot = { status: 'loaded', channels: [{ id: 'shop-1', status: 'CONNECTED', synced_listings: 0 } as ConnectedChannelRecord] };
describe('Getting started guidance', () => {
  it('prioritizes shop review and gives each alternative its own working action', () => {
    const props = callbacks();
    render(<ProductGettingStarted {...props} snapshot={connected} pendingCount={4} />);
    const review = screen.getByRole('button', { name: 'Review 4 listings' });
    const importButton = screen.getByRole('button', { name: 'Import Excel / CSV' });
    expect(review.compareDocumentPosition(importButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeVisible();
    expect(within(screen.getByRole('button', { name: 'Create a new product' })).getByText('Create Product Master')).toBeVisible();
    fireEvent.click(review);
    expect(props.onReview).toHaveBeenCalledOnce();
    fireEvent.click(importButton);
    fireEvent.click(screen.getByRole('button', { name: 'Create a new product' }));
    expect(props.onImport).toHaveBeenCalledOnce();
    expect(props.onCreate).toHaveBeenCalledOnce();
    expect(importButton.tagName).toBe('BUTTON');
    expect(importButton.querySelector('button, a, input')).toBeNull();
    expect(importButton).toHaveAccessibleDescription('Add products from an existing file.');
    expect(importButton).toHaveClass('focus-visible:ring-2');
    expect(screen.queryByRole('button', { name: /Dismiss|Close/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Product setup steps' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('list', { name: 'Product setup steps' })).toHaveTextContent('3. Activate Master');
    expect(screen.getByText(/Creating or activating a Master never publishes/)).toBeVisible();
  });
  it('allows creation during loading and retry on failure, without showing an empty shop', () => {
    const props = callbacks();
    const { rerender } = render(<ProductGettingStarted {...props} snapshot={{ status: 'loading', channels: [] }} pendingCount={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking connected shops');
    expect(screen.getByRole('button', { name: 'Import Excel / CSV' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create a new product' })).toBeEnabled();
    expect(screen.queryByText(/Recommended/)).not.toBeInTheDocument();
    expect(screen.queryByText(/shops have no listings/)).not.toBeInTheDocument();
    rerender(<ProductGettingStarted {...props} snapshot={{ status: 'error', channels: [] }} pendingCount={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });
  it('offers connection setup only when there are no connected shops', () => {
    const props = callbacks();
    render(<ProductGettingStarted {...props} snapshot={{ status: 'loaded', channels: [] }} pendingCount={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect channel' }));
    expect(props.onConnect).toHaveBeenCalledOnce();
    expect(screen.getByText('Or start without a channel')).toBeVisible();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Excel / CSV' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create a new product' })).toBeEnabled();
  });
  it('does not recommend an unavailable review queue and uses a singular listing label', () => {
    const props = callbacks();
    const { rerender } = render(<ProductGettingStarted {...props} snapshot={{ status: 'loaded', channels: [] }} pendingCount={0} />);
    expect(screen.queryByRole('button', { name: /^Review/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Recommended/)).not.toBeInTheDocument();
    rerender(<ProductGettingStarted {...props} snapshot={connected} pendingCount={1} />);
    expect(screen.getByRole('button', { name: 'Review 1 listing' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '1 shop listing ready for review' })).toBeVisible();
  });
  it('shows only the supplied listing sources in the visual, without implying approval or automatic linking', () => {
    const { rerender } = render(<ProductGettingStarted {...callbacks()} snapshot={connected} pendingCount={4} sourceChannels={[{ key: 'shopee', label: 'Shopee' }, { key: 'amazon', label: 'Amazon' }]} />);
    expect(screen.getByRole('img', { name: 'Shopee, Amazon listings to Product Master' })).toBeVisible();
    expect(screen.queryByText(/Lazada/)).not.toBeInTheDocument();
    expect(screen.getByText('Review shop data, then link listings to a Master.')).toBeVisible();
    rerender(<ProductGettingStarted {...callbacks()} snapshot={connected} pendingCount={1} sourceChannels={[{ key: 'lazada', label: 'Lazada' }]} />);
    expect(screen.getByRole('img', { name: 'Lazada listings to Product Master' })).toBeVisible();
    expect(screen.queryByText(/Shopee|Amazon/)).not.toBeInTheDocument();
    expect(screen.getByText('1 listing')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Lazada listings to Product Master' }).querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')).not.toBeNull();
  });
  it('previews no channels without leaking saved listing counts or connected source logos', () => {
    render(<ProductGettingStarted {...callbacks()} snapshot={connected} preview="no-channels" pendingCount={21} sourceChannels={[{ key: 'shopee', label: 'Shopee' }]} />);
    expect(screen.getByRole('heading', { name: 'Connect your first channel' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Add your first shop connection' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Review/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/21|Shopee|Recommended/)).not.toBeInTheDocument();
  });
  it('distinguishes connected shops with no listings from a missing connection', () => {
    const { rerender } = render(<ProductGettingStarted {...callbacks()} snapshot={connected} pendingCount={0} />);
    expect(screen.getByText('No shop listings to review yet')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Connect channel' })).not.toBeInTheDocument();
    rerender(<ProductGettingStarted {...callbacks()} snapshot={{ status: 'loaded', channels: [{ ...connected.channels[0], status: 'INITIAL_SYNCING' }] }} pendingCount={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('Getting listings from your shops');
    expect(screen.getByRole('button', { name: 'Create a new product' })).toBeEnabled();
  });
});
