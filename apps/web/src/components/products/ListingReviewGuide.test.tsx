// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingReviewGuide } from './ListingReviewGuide';

const key = 'prime-listing-review-guide-dismissed-v1';
beforeEach(() => localStorage.removeItem(key));
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.removeItem(key); });

describe('First-visit listing review guide', () => {
  it('explains the purpose, actions, outcomes and shop-data boundary without blocking review', () => {
    render(<ListingReviewGuide hasListings />);
    expect(screen.getByRole('heading', { name: 'One product, all its shop listings' })).toBeVisible();
    expect(screen.getByText(/A listing is a product in a shop/)).toBeVisible();
    const steps = within(screen.getByRole('list', { name: 'Listing review steps' })).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('same product');
    expect(steps[1]).toHaveTextContent('Review suggestion');
    expect(steps[1]).toHaveTextContent('Choose Master');
    expect(steps[2]).toHaveTextContent('status and details stay unchanged');
    expect(steps[2]).toHaveTextContent('complete required details to make it Active');
    expect(screen.getByText(/Shop data, stock and sync stay unchanged/)).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(key)).toBeNull();
  });
  it('remembers explicit dismissal and always allows reopening', () => {
    const { unmount } = render(<ListingReviewGuide hasListings />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.getByRole('button', { name: 'How this works' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe('1');
    unmount();
    render(<ListingReviewGuide hasListings />);
    const reopen = screen.getByRole('button', { name: 'How this works' });
    expect(reopen).toHaveAttribute('aria-controls');
    fireEvent.click(reopen);
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Listing review steps' })).toBeVisible();
  });
  it('keeps help available without expanding it over an empty queue', () => {
    render(<ListingReviewGuide hasListings={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'How this works' }));
    expect(screen.getByRole('list', { name: 'Listing review steps' })).toBeVisible();
  });
  it('can collapse and reopen even when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    render(<ListingReviewGuide hasListings />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    fireEvent.click(screen.getByRole('button', { name: 'How this works' }));
    expect(screen.getByRole('list', { name: 'Listing review steps' })).toBeVisible();
  });
});
