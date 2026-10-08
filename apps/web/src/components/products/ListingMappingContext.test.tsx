// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { getProducts } from '@/lib/product-store';
import { ListingMappingContext } from './ListingMappingContext';

const base = getCatalogImportItems({ requireConfirmation: true })[0];
const listings = Array.from({ length: 6 }, (_, index) => ({ ...base, id: `context-${index}`, title: `Selected product ${index + 1}`, storeName: `Shop ${index + 1}`, variants: 1 }));
const master = getProducts()[0];
const props = { listings, activeIndex: 0, reviewedIds: [], master, masterImage: null, onView: vi.fn(), onChangeMaster: vi.fn(), onCreateMaster: vi.fn() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Shared listing mapping context', () => {
  it('distinguishes the current listing, unchecked listings and unsaved checks from the shared destination', () => {
    render(<ListingMappingContext {...props} activeIndex={1} reviewedIds={[listings[0].id]} />);
    expect(screen.getByRole('region', { name: '6 listings to 1 Product Master' })).toBeVisible();
    expect(screen.getByText('Viewing 2 of 6')).toBeVisible();
    expect(screen.getByRole('button', { name: /View listing 1:/ })).toHaveTextContent('Checked · not saved');
    expect(screen.getByRole('button', { name: /View listing 2:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /View listing 2:/ })).toHaveTextContent('Checking now');
    expect(screen.getByRole('button', { name: /View listing 3:/ })).toHaveTextContent('To check');
    const destination = within(screen.getByRole('group', { name: 'Shared destination Master' }));
    expect(destination.getByText(master.name)).toBeVisible();
    expect(destination.getByText('For all 6 listings')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /View listing 3:/ }));
    expect(props.onView).toHaveBeenCalledWith(2);
    expect(props.onChangeMaster).not.toHaveBeenCalled();
    expect(props.onCreateMaster).not.toHaveBeenCalled();
  });

  it('shows the current listing beyond the preview and keeps all listings reachable', () => {
    render(<ListingMappingContext {...props} activeIndex={5} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: /View listing 6:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /View listing 5:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 6 listings' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Show fewer listings' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer listings' }));
    expect(screen.getByRole('button', { name: /View listing 6:/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('scopes destination actions to all listings and explains the reset without running it', () => {
    render(<ListingMappingContext {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'About Changing the shared Master' }));
    expect(screen.getByRole('dialog', { name: 'Changing the shared Master help' })).toHaveTextContent('previous check marks and SKU mapping choices are cleared');
    expect(props.onChangeMaster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close Changing the shared Master help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change Master for all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create a new Master for all' }));
    expect(props.onChangeMaster).toHaveBeenCalledOnce();
    expect(props.onCreateMaster).toHaveBeenCalledOnce();
  });

  it('keeps listing identity readable when images or metadata are missing', () => {
    render(<ListingMappingContext {...props} listings={[{ ...listings[0], image: '/missing-image.jpg', channelSku: '', brand: '', variants: 0 }]} />);
    expect(screen.getByText('SKU not provided')).toBeVisible();
    expect(screen.getByText('Brand not provided · SKU structure unknown')).toBeVisible();
    fireEvent.error(screen.getByRole('presentation'));
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.getByText(listings[0].title)).toBeVisible();
  });
});
