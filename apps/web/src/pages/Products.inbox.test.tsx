// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { completeListingDetails } from '@/test/fixtures/complete-listing-details';
import Products from './Products';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { commitListingReviewProducts } from '@/lib/product-store';
import { addProduct, deleteProduct, getProducts } from '@/lib/product-store';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-product-channel-setup', () => ({ useProductChannelSetup: () => ({ snapshot: { status: 'loaded', channels: [] }, retry: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

let originalItems: CatalogImportItem[];
let originalIds: Set<string>;
let legacyFixtures: ReturnType<typeof getProducts>;
beforeEach(() => {
  localStorage.removeItem('prime-listing-review-guide-dismissed-v1');
  // This suite covers the new-listing inbox; existing-link migration has its own integration suite.
  legacyFixtures = structuredClone(getProducts().filter(product => product.import_result === 'needs_review'));
  commitListingReviewProducts(legacyFixtures.map(product => ({ ...product, import_result: undefined, import_issues: [] })));
  originalItems = getCatalogImportItems({ requireConfirmation: true });
  originalIds = new Set(getProducts().map(product => product.id));
  const sample = originalItems.find(item => item.variants === 1)!;
  saveCatalogImportItems(['a', 'b'].map(id => ({ ...sample, images: readyMasterFields().images, description: readyMasterFields().description, id: `inbox-${id}`, listingId: `inbox-listing-${id}`, title: 'Inbox test brush', channelSku: `INBOX-${id}`, suggestedProductId: undefined, resolvedProductId: undefined, confirmed: false, resolution: 'later', status: 'unmatched' })));
});
afterEach(() => {
  localStorage.removeItem('prime-listing-review-guide-dismissed-v1');
  commitListingReviewProducts(legacyFixtures);
  cleanup();
  getProducts().filter(product => !originalIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(originalItems);
});
function Path() { const location = useLocation(); return <output data-testid="path">{location.pathname}{location.search}</output>; }
function mount() { render(<MemoryRouter initialEntries={['/products/master-catalog']}><Path /><Products /></MemoryRouter>); }

describe('Product catalog listing inbox', () => {
  it('keeps the help CTA in the drawer header without a duplicate row above the table', async () => {
    localStorage.setItem('prime-listing-review-guide-dismissed-v1', '1');
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Review & link (2)' }));
    const header = within(screen.getByRole('group', { name: 'Listing review header' }));
    expect(header.getByRole('heading', { name: 'Review shop listings' })).toBeVisible();
    const help = header.getByRole('button', { name: 'How this works' });
    expect(help).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button', { name: 'How this works' })).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Listing review guide' })).not.toBeInTheDocument();
    expect(document.getElementById(help.getAttribute('aria-controls')!)).toHaveAttribute('hidden');
    fireEvent.click(help);
    expect(screen.getByRole('list', { name: 'Listing review steps' })).toBeVisible();
    expect(header.getByRole('button', { name: 'How this works' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(help).toHaveFocus());
    expect(screen.queryByRole('region', { name: 'Listing review guide' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose Master' })[0]);
    expect(screen.queryByRole('button', { name: 'How this works' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
    expect(within(screen.getByRole('group', { name: 'Listing review header' })).getByRole('button', { name: 'How this works' })).toHaveAttribute('aria-expanded', 'false');
    expect(getCatalogImportItems({ requireConfirmation: true }).every(item => !item.confirmed)).toBe(true);
  });
  it('Use existing Master returns to the finder in the same drawer and keeps Back to listings separate', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Review & link (2)' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose Master' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Create new Master' }));
    expect(screen.getByRole('dialog', { name: 'Create one Master' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Use existing Master' }));
    const finder = within(screen.getByRole('dialog', { name: 'Find a Product Master' }));
    expect(finder.getByRole('textbox', { name: /Search by/ })).toHaveFocus();
    expect(finder.getByRole('group', { name: 'Source listing' })).toHaveTextContent('INBOX-a');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('path')).toHaveTextContent('/products/master-catalog');
    expect(getProducts()).toHaveLength(originalIds.size);
    expect(getCatalogImportItems({ requireConfirmation: true }).every(item => !item.confirmed)).toBe(true);
    fireEvent.click(finder.getByRole('button', { name: 'Back to listings' }));
    expect(screen.getByRole('dialog', { name: 'Review shop listings' })).toBeVisible();
  });
  it('uses consistent sizing for the import, create and review actions', () => {
    mount();
    for (const name of ['Import products', 'Create Product Master', 'Review & link (2)']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('h-11', 'px-4', 'py-2', 'text-sm', 'font-medium', 'rounded-md', 'gap-2');
      expect(button).not.toHaveClass('h-9');
      expect(button.querySelector('svg')).toHaveClass('size-4');
    }
  });

  it('keeps a non-dismissible review banner in a consistent position while listings remain', async () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Product Masters' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Shop listings to review' })).toHaveTextContent('2 shop listings');
    expect(screen.queryByRole('button', { name: /^Listings to link/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide listing review banner' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Shop listings to review' })).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Active\s*\d+$/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'Brush' } });
    const reviewButton = screen.getByRole('button', { name: 'Review & link (2)' });
    reviewButton.focus();
    fireEvent.click(reviewButton);
    expect(screen.getByRole('dialog', { name: 'Review shop listings' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveValue('Brush');
    expect(screen.getByRole('button', { name: /^Active\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Shop listings to review' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Listings to link/ })).not.toBeInTheDocument();
    await waitFor(() => expect(reviewButton).toHaveFocus());
    expect(screen.getByTestId('path')).toHaveTextContent('/products/master-catalog');
  });

  it('creates a grouped Master in place, refreshes the table, and removes the empty queue entry point', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Review & link (2)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select visible shop listings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create one Master' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Create one Master' }));
    expect(dialog.getByRole('button', { name: 'Continue to details' })).toBeDisabled();
    fireEvent.click(dialog.getByRole('checkbox', { name: /I checked/ }));
    fireEvent.click(dialog.getByRole('button', { name: 'Continue to details' }));
    completeListingDetails(); fireEvent.click(screen.getByRole('button', { name: 'Create & activate Master' }));
    expect(screen.getByRole('dialog', { name: 'Review shop listings' })).toBeVisible();
    expect(screen.getByText('All listings reviewed')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View updated Master' })).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/products/master-catalog');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByRole('link', { name: 'Open Product Master details for Inbox test brush' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Shop listings to review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review & link|Listings to link/ })).not.toBeInTheDocument();
    const created = getProducts().find(product => !originalIds.has(product.id))!;
    expect(created.status).toBe('published');
    expect(created.channels).toHaveLength(2);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: /^Active\s*\d+$/ }));
    const activeRow = (await screen.findByRole('link', { name: 'Open Product Master details for Inbox test brush' })).closest('tr')!;
    expect(within(activeRow).getByText('Active')).toBeVisible();
    expect(within(activeRow).queryByRole('button', { name: 'Fix data for Inbox test brush' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')[1]).toBe(activeRow);
    expect(activeRow.querySelector('time')).toHaveAttribute('dateTime', created.updated_at);
    expect(activeRow.querySelector('time')?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(within(activeRow).getByText('Just updated')).toBeVisible();
  });

  it('shows no empty inbox tab, banner or button when there are no pending listings', () => {
    saveCatalogImportItems([]);
    mount();
    expect(screen.queryByRole('region', { name: 'Shop listings to review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review & link|Listings to link|Product Masters/ })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Catalog status' })).toBeVisible();
  });

  it('links to a seller-selected Master and refreshes the remaining count without navigating', async () => {
    const fixture = { ...getProducts()[0], ...readyMasterFields(), id: 'inbox-existing-target', name: 'Existing inbox target', sku_code: 'INBOX-EXISTING', status: 'draft' as const, product_type: 'single' as const, has_variants: false, skus: [], channels: [], inventory: { wh_crjp: 42 } };
    addProduct(fixture);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Review & link (2)' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose Master' })[0]);
    const dialog = within(screen.getByRole('dialog', { name: 'Find a Product Master' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(dialog.queryByRole('button', { name: /Confirm link/ })).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Compare with Existing inbox target' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const comparison = within(screen.getByRole('dialog', { name: 'Compare product details' }));
    expect(comparison.getByRole('button', { name: 'Link to this Master' })).toBeEnabled();
    expect(getProducts().find(product => product.id === fixture.id)?.channels).toHaveLength(0);
    fireEvent.click(comparison.getByRole('button', { name: 'Link to this Master' }));
    expect(screen.getByText('1 listing left to review')).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/products/master-catalog');
    expect(screen.getByRole('dialog', { name: 'Review shop listings' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'View updated Master' }));
    expect(screen.getByRole('button', { name: 'Review & link (1)' })).toBeVisible();
    await screen.findByRole('link', { name: 'Open Product Master details for Existing inbox target' });
    const updated = getProducts().find(product => product.id === fixture.id)!;
    expect(updated.channels).toHaveLength(1);
    expect(updated.inventory).toEqual({ wh_crjp: 42 });
    expect(updated.status).toBe('draft');
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
    const row = screen.getByRole('link', { name: 'Open Product Master details for Existing inbox target' }).closest('tr')!;
    expect(screen.getAllByRole('row')[1]).toBe(row);
    expect(within(row).getByText('Draft')).toBeVisible();
    expect(row.querySelector('time')).toHaveAttribute('dateTime', updated.updated_at);
  });

  it('moves data warnings out of product identity and exposes stock details by hover and click', async () => {
    const fixture = { ...getProducts()[0], id: 'compact-inbox-fixture', name: 'Compact inbox fixture', sku_code: 'COMPACT-INBOX', status: 'draft' as const, inventory: { wh_crjp: 12 }, has_variants: false, skus: [], import_result: 'needs_review' as const, import_issues: ['Check pack size'], import_sources: [], channels: [{ channel: 'shopee' as const, external_id: 'compact-fixture-listing', status: 'active' as const, listing_url: null, last_synced_at: null }] };
    addProduct(fixture);
    mount();
    const productLink = await screen.findByRole('link', { name: `Open Product Master details for ${fixture.name}` });
    const cells = within(productLink.closest('tr')!).getAllByRole('cell');
    expect(cells[1]).not.toHaveTextContent(/review|Incomplete|data issue/i);
    expect(cells[2]).not.toHaveTextContent('decision to review');
    expect(within(cells[7]).queryByRole('button', { name: /Review/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review & link (3)' })).toBeVisible();
    expect(cells[5]).not.toHaveTextContent(/processing/);
    const warning = within(cells[4]).getByRole('button', { name: /Show affected shops/ });
    expect(warning).not.toHaveClass('border');
    fireEvent.mouseEnter(warning);
    expect(screen.getByText('Shop stock needs attention')).toBeVisible();
    fireEvent.keyDown(screen.getByText('Shop stock needs attention'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Shop stock needs attention')).not.toBeInTheDocument());
    fireEvent.click(warning);
    expect(screen.getByText('Shop stock needs attention')).toBeVisible();
  });
});
