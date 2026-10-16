// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductListingIntake } from './ProductListingIntake';
import { createEmptyListingCatalog } from '@/lib/listing-intake-catalog';
import { getCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { getProducts, type Product } from '@/lib/product-store';
import { readyMasterFields } from '@/test/fixtures/listing-master';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
beforeEach(() => localStorage.setItem('prime-listing-review-guide-dismissed-v1', '1'));
afterEach(() => { cleanup(); localStorage.removeItem('prime-listing-review-guide-dismissed-v1'); });

function master(id: string): Product {
  return { ...getProducts()[0], ...readyMasterFields(), id, name: `Master ${id}`, sku_code: `MASTER-${id}`, brand: 'Notebook brand',
    gtin: '', has_variants: false, product_type: 'single', skus: [], channels: [], import_sources: [], status: 'draft', import_result: undefined };
}

function listing(id: string, suggestedProductId?: string): CatalogImportItem {
  const sample = getCatalogImportItems({ requireConfirmation: true }).find(item => item.variants === 1)!;
  return { ...sample, id, listingId: `group-${id}`, title: `Notebook ${id}`, channelSku: `SHOP-${id}`, storeName: `Shop ${id}`,
    brand: 'Notebook brand', gtin: '', description: readyMasterFields().description, images: readyMasterFields().images,
    suggestedProductId, resolvedProductId: undefined, confirmed: false, existingLinkReview: undefined,
    resolution: 'later', status: suggestedProductId ? 'suggested' : 'unmatched', confidence: 90 };
}

function setup(sources: CatalogImportItem[], masters = [master('one')]) {
  const catalog = createEmptyListingCatalog(sources);
  masters.forEach(product => catalog.add(product));
  catalog.saveListings(sources);
  const onChanged = vi.fn();
  render(<ProductListingIntake catalog={catalog} onChanged={onChanged} onOpenMaster={vi.fn()} stayInQueue onCloseQueue={vi.fn()} />);
  return { catalog, onChanged };
}

describe('Shared suggested Master groups', () => {
  it('shows direct Link and Create actions and reviews only checked listings, not the whole suggested group', () => {
    const { catalog, onChanged } = setup([listing('a', 'one'), listing('b', 'one'), listing('c', 'one')]);
    const before = { products: catalog.products(), listings: catalog.listings() };
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select listing SHOP-a from Shop a' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select listing SHOP-b from Shop b' }));
    const footer = within(screen.getByRole('group', { name: 'Listing review footer' }));
    expect(footer.getByRole('button', { name: 'Link to one Master' })).toBeEnabled();
    expect(footer.getByRole('button', { name: 'Create one Master' })).toBeEnabled();
    expect(footer.getAllByRole('button', { name: /^(Create one Master|Link to one Master)$/ }).map(button => button.textContent)).toEqual(['Create one Master', 'Link to one Master']);
    expect(footer.queryByRole('button', { name: /Review selected|Group as one product/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Review separately' })).not.toBeInTheDocument();
    expect(footer.getByText(/All 2 selected listings will use one Master/)).toBeVisible();
    fireEvent.click(footer.getByRole('button', { name: 'Link to one Master' }));
    expect(screen.getByRole('group', { name: 'Shared destination Master' })).toHaveTextContent('Master one');
    expect(screen.getByRole('columnheader', { name: /Shop a/ })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: /Shop b/ })).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: /Shop c/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /I reviewed all 2 listings/ })).not.toBeChecked();
    expect(catalog.products()).toEqual(before.products);
    expect(catalog.listings()).toEqual(before.listings);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('asks for a destination when checked listings have different suggested Masters', () => {
    const { catalog, onChanged } = setup([listing('a', 'one'), listing('b', 'two')], [master('one'), master('two')]);
    const before = catalog.products();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select visible shop listings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Link to one Master' }));
    expect(screen.getByRole('region', { name: 'Find a Product Master' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Selected listings 2' })).toHaveTextContent('SHOP-a');
    expect(screen.getByRole('region', { name: 'Selected listings 2' })).toHaveTextContent('SHOP-b');
    expect(screen.queryByRole('group', { name: 'Shared destination Master' })).not.toBeInTheDocument();
    expect(catalog.products()).toEqual(before);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('keeps only Create and Link actions and restores focus after returning from creation', async () => {
    const { onChanged } = setup([listing('a', 'one'), listing('b', 'one')]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select visible shop listings' }));
    const footer = within(screen.getByRole('group', { name: 'Listing review footer' }));
    expect(footer.getAllByRole('button').map(button => button.textContent)).toEqual(['Clear selection', 'Create one Master', 'Link to one Master']);
    expect(footer.queryByRole('button', { name: 'More selected listing actions' })).not.toBeInTheDocument();
    const create = footer.getByRole('button', { name: 'Create one Master' });
    create.focus(); fireEvent.click(create);
    expect(screen.getByRole('region', { name: 'Create one Master' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Skip for now' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create one Master' })).toHaveFocus());
    expect(screen.getByText('2 selected')).toBeVisible();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('groups non-adjacent listings by Master ID while keeping three data columns and individual checkboxes', () => {
    setup([listing('a', 'one'), listing('b', 'two'), listing('c', 'one'), listing('d'), listing('e')], [master('one'), master('two')]);
    const table = screen.getByRole('table', { name: 'Shop listings and suggested Masters' });
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['', 'Listing', 'Shop', 'Product Master']);
    expect(within(table).getAllByRole('checkbox')).toHaveLength(6);
    const group = screen.getByRole('button', { name: 'Review 2 listings' }).closest('tbody')!;
    expect(within(group).getAllByRole('row')).toHaveLength(2);
    expect(within(group).getByText('Master one')).toBeVisible();
    expect(within(group).getByText('Master one').closest('td')).toHaveAttribute('rowspan', '2');
    expect(within(group).getAllByRole('checkbox').map(box => box.getAttribute('aria-label'))).toEqual(['Select listing SHOP-a from Shop a', 'Select listing SHOP-c from Shop c']);
    expect(screen.getAllByText('Master one')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Review suggestion' }).closest('tbody')).toHaveTextContent('Master two');
    const unmatched = screen.getAllByRole('button', { name: 'Choose Master' });
    expect(unmatched).toHaveLength(2);
    expect(unmatched[0].closest('tbody')).not.toBe(unmatched[1].closest('tbody'));
  });

  it('does not merge different Masters with the same name and SKU', () => {
    setup([listing('a', 'one'), listing('b', 'two')], [master('one'), { ...master('one'), id: 'two' }]);
    expect(screen.queryByRole('button', { name: 'Review 2 listings' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Review suggestion' })).toHaveLength(2);
  });

  it('opens the whole group for comparison without saving, and restores keyboard focus on return', async () => {
    const { catalog, onChanged } = setup([listing('a', 'one'), listing('b', 'one')]);
    const before = { products: catalog.products(), listings: catalog.listings() };
    const action = screen.getByRole('button', { name: 'Review 2 listings' });
    action.focus(); fireEvent.click(action);
    expect(screen.getByRole('group', { name: 'Shared destination Master' })).toHaveTextContent('Master one');
    expect(screen.getByRole('columnheader', { name: /Shop a/ })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: /Shop b/ })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /I reviewed all 2 listings/ })).not.toBeChecked();
    expect(catalog.products()).toEqual(before.products);
    expect(catalog.listings()).toEqual(before.listings);
    expect(onChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review 2 listings' })).toHaveFocus());
  });

  it('rebuilds groups after search and filters without reviewing hidden group members', () => {
    const primary = master('one');
    setup([{ ...listing('a', 'one'), channelSku: primary.sku_code, confidence: 99 }, listing('b', 'one'), listing('c', 'one')], [primary]);
    expect(screen.getByRole('button', { name: 'Review 3 listings' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Needs review/ }));
    expect(screen.getByRole('button', { name: 'Review 2 listings' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Review 2 listings' }));
    expect(screen.queryByRole('columnheader', { name: /Shop a/ })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Shop b/ })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: /Shop c/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shop listings' }), { target: { value: 'Shop b' } });
    expect(screen.queryByRole('button', { name: 'Review 2 listings' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review suggestion' }));
    expect(screen.getByRole('columnheader', { name: /Shop b/ })).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: /Shop c/ })).not.toBeInTheDocument();
  });

  it('keeps selection independent from grouping and retains hidden selections in the footer', () => {
    setup([listing('a', 'one'), listing('b', 'one'), listing('c')]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select listing SHOP-a from Shop a' }));
    expect(screen.getByRole('checkbox', { name: 'Select listing SHOP-b from Shop b' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select visible shop listings' })).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByRole('button', { name: 'Review 2 listings' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Listing review footer' })).toHaveTextContent('1 selected');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shop listings' }), { target: { value: 'Shop b' } });
    expect(screen.getByText('1 outside this view')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Review suggestion' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select visible shop listings' }));
    expect(screen.getByRole('button', { name: 'Link to one Master' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByRole('button', { name: 'Review suggestion' })).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shop listings' }), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Review 2 listings' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Select visible shop listings' })).not.toBeChecked();
  });
});
