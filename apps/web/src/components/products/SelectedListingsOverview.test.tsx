// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { SelectedListingsOverview } from './SelectedListingsOverview';

const base = getCatalogImportItems({ requireConfirmation: true })[0];
const listings = Array.from({ length: 6 }, (_, index) => ({ ...base, id: `overview-${index}`, title: `Selected product ${index + 1}`, storeName: `Shop ${index + 1}`, variants: 1 }));
afterEach(cleanup);

describe('Selected listings overview', () => {
  it('expands larger groups without losing the total selection', () => {
    render(<SelectedListingsOverview listings={listings} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('All 6 listings')).toBeVisible();
    const expand = screen.getByRole('button', { name: 'Show all 6 listings' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expand);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer listings' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
  it('keeps the current comparison visible beyond the initial four cards', () => {
    const onView = vi.fn();
    render(<SelectedListingsOverview listings={listings} activeIndex={4} reviewedIds={[listings[0].id]} onView={onView} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /View listing 5:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /View listing 1:/ })).toHaveTextContent('Reviewed');
    expect(screen.queryByRole('button', { name: /Show fewer/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /View listing 6:/ }));
    expect(onView).toHaveBeenCalledWith(5);
  });
  it('shows missing identity details explicitly and falls back from unavailable images', () => {
    render(<SelectedListingsOverview listings={[{ ...listings[0], image: '/unavailable.jpg', channelSku: '', brand: '', variants: 0 }]} />);
    expect(screen.getByText('SKU not provided')).toBeVisible();
    expect(screen.getByText('Brand not provided · SKU structure not recorded')).toBeVisible();
    fireEvent.error(screen.getByRole('presentation'));
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.getByText(listings[0].title)).toBeVisible();
  });
});
