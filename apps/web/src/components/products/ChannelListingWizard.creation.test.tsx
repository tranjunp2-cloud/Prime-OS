// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Store } from 'lucide-react';
import { ChannelListingWizard, type ChannelWizardDraft } from './ChannelListingWizard';
import { freshChannelListingDrafts } from '@/lib/channel-listing-creation';
import { getProducts } from '@/lib/product-store';

const destinations = ['webstore', 'pos'].map(key => ({ key, label: key, account: key + ' shop', description: '', icon: Store, iconClassName: '', connectionStatus: 'connected' as const }));
function Harness({ onSubmitted = vi.fn(), onChange = vi.fn(), open = true, empty = false }) {
  const [drafts, setDrafts] = useState<Record<string, ChannelWizardDraft>>(() => {
    const initial = freshChannelListingDrafts(getProducts()[0]);
    return { ...initial,
      webstore: { ...initial.webstore, enabled: true, listing_sku: 'WEB', web_slug: '/test' },
      pos: { ...initial.pos, enabled: true, listing_sku: 'POS', pos_barcode: 'barcode' },
    };
  });
  return <ChannelListingWizard embedded open={open} channels={empty ? [] : destinations} drafts={drafts}
    masterSku="MASTER" productName="Test product" productCategory="Art" availableStock={12} imageCount={1} productType="single"
    onOpenChange={vi.fn()} onSubmitted={onSubmitted} onChange={(key, patch) => { onChange(key, patch); setDrafts(current => ({ ...current, [key]: { ...current[key], ...patch } })); }} />;
}
afterEach(cleanup);
describe('temporary creation selection', () => {
  it('prioritizes the shop name and uses channel logos consistently through setup and review', () => {
    render(<Harness />);
    const shop = screen.getByRole('button', { name: 'Select webstore shop · webstore' });
    const name = shop.querySelector('strong')!;
    expect(name).toHaveTextContent('webstore shop');
    expect(name).toHaveClass('break-words');
    expect(name.nextElementSibling).toHaveTextContent('webstore');
    // The shared channel logos have a 48px viewBox; generic Lucide store icons use 24px.
    expect(shop.querySelector('svg')).toHaveAttribute('viewBox', '0 0 48 48');
    expect(shop.querySelector('.lucide-store')).toBeNull();
    fireEvent.click(shop);
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 shop' }));
    expect(screen.getByRole('heading', { name: 'Set up webstore shop listing' })).toBeVisible();
    const nav = screen.getByRole('navigation', { name: 'Selected channel listings' });
    expect(nav.querySelector('strong')).toHaveTextContent('webstore shop');
    expect(nav.querySelector('svg')).toHaveAttribute('viewBox', '0 0 48 48');
    fireEvent.click(screen.getByRole('button', { name: 'Review new listings' }));
    const review = screen.getByRole('button', { name: /webstore shop.*WEB/ });
    expect(review.querySelector('strong')).toHaveTextContent('webstore shop');
    expect(review.querySelector('svg')).toHaveAttribute('viewBox', '0 0 48 48');
  });
  it('starts empty even when saved enabled flags are true, and selection never changes enabled', () => {
    const change = vi.fn(); render(<Harness onChange={change} />);
    expect(screen.getByRole('button', { name: 'Set up 0 shops' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Select webstore shop · webstore' }));
    expect(change.mock.calls[0][1]).not.toHaveProperty('enabled');
    fireEvent.click(screen.getByRole('button', { name: 'Select webstore shop · webstore' }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Set up 0 shops' })).toBeDisabled();
  });
  it('submits only selected new drafts and never sends a deselected draft', () => {
    const submit = vi.fn(); render(<Harness onSubmitted={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select webstore shop · webstore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select pos shop · pos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select webstore shop · webstore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 shop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review new listings' }));
    expect(screen.queryByText(/^(Link existing|Keep channel data|Existing listing)$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create 1 draft' }));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(Object.keys(submit.mock.calls[0][0])).toEqual(['pos']);
    expect(screen.getByText('Listing drafts created')).toBeVisible();
  });
  it('shows persistence errors and allows retry without pretending some shops failed remotely', () => {
    const submit = vi.fn().mockImplementationOnce(() => { throw new Error('Storage full'); });
    render(<Harness onSubmitted={submit} />);
    for (const key of ['webstore', 'pos']) fireEvent.click(screen.getByRole('button', { name: `Select ${key} shop · ${key}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up 2 shops' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review new listings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create 2 drafts' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
    expect(screen.queryByText('Listing drafts created')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create 2 drafts' }));
    expect(screen.getAllByText('Draft created')).toHaveLength(2);
    expect(screen.queryByText(/timed out|Retry/)).not.toBeInTheDocument();
  });
  it('resets selection on reopen and never submits on cancel', () => {
    const submit = vi.fn(); const view = render(<Harness onSubmitted={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select pos shop · pos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(submit).not.toHaveBeenCalled();
    view.rerender(<Harness onSubmitted={submit} open={false} />);
    view.rerender(<Harness onSubmitted={submit} />);
    expect(screen.getByRole('button', { name: 'Set up 0 shops' })).toBeDisabled();
  });
  it('explains the empty state with no available shops', () => {
    render(<Harness empty />);
    expect(screen.getByText('No shops available for a new listing')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Set up 0 shops' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });
});
