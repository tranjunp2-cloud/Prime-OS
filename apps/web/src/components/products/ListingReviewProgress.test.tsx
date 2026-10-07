// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { getProducts } from '@/lib/product-store';
import { createEmptyListingCatalog } from '@/lib/listing-intake-catalog';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { completeListingDetails } from '@/test/fixtures/complete-listing-details';
import { ProductListingIntake } from './ProductListingIntake';
import { ListingMasterReview } from './ListingMasterReview';

afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
function fixture() {
  const source = { ...getCatalogImportItems({ requireConfirmation: true }).find(item => item.variants === 1)!, id: 'progress-ui-source', listingId: 'progress-ui-listing', channelSku: 'PROGRESS-UI-SOURCE', variants: 1, variantItems: undefined, title: 'Progress UI product', image: '/test-front.jpg', images: [], description: '', confirmed: false, resolution: 'later' as const };
  return { source, catalog: createEmptyListingCatalog([source]) };
}

describe('Review progress recovery UI', () => {
  it('saves an incomplete Draft and resumes inline without navigating to Product Detail', () => {
    const { catalog } = fixture();
    const onOpenMaster = vi.fn();
    render(<ProductListingIntake catalog={catalog} onChanged={vi.fn()} onOpenMaster={onOpenMaster} stayInQueue />);
    click('Create Master');
    click('Save draft & link');
    expect(catalog.products()).toHaveLength(0);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('new Master stays Draft');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save draft & link' }));
    expect(catalog.products()[0].status).toBe('draft');
    expect(screen.getByRole('region', { name: 'Linked listings to finish' })).toHaveTextContent('description');
    expect(onOpenMaster).not.toHaveBeenCalled();
    click('Continue review');
    expect(screen.getByRole('region', { name: 'Complete Product Master' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save & activate Master' })).toBeDisabled();
    completeListingDetails();
    click('Save & activate Master');
    expect(catalog.products()).toHaveLength(1);
    expect(catalog.products()[0].status).toBe('published');
    expect(catalog.products()[0].channels).toHaveLength(1);
    expect(catalog.products()[0].channels[0].review_pending).toBeUndefined();
    expect(screen.queryByRole('region', { name: 'Linked listings to finish' })).not.toBeInTheDocument();
    expect(onOpenMaster).not.toHaveBeenCalled();
  });
  it('permits deferred linking for a 3-SKU listing and keeps the existing Active Master unchanged', () => {
    const { source } = fixture();
    const catalog = createEmptyListingCatalog([{ ...source, variants: 3, variantItems: [{ sku: 'SHOP-RED', label: 'Red' }, { sku: 'SHOP-GREEN', label: 'Green' }, { sku: 'SHOP-BLUE', label: 'Blue' }] }]);
    const master = { ...getProducts()[0], ...readyMasterFields(), id: 'ui-existing', sku_code: 'UI-EXISTING', has_variants: false, product_type: 'single' as const, status: 'published' as const, channels: [], skus: [] };
    catalog.add(master);
    const item = { ...catalog.listings()[0], suggestedProductId: master.id };
    catalog.saveListings([item]);
    const saved = vi.fn();
    render(<ListingMasterReview catalog={catalog} listings={[item]} initialMode="existing" onBack={vi.fn()} onSaved={saved} />);
    expect(screen.getByRole('button', { name: 'Link to this Master' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Set up SKUs & details' })).toBeEnabled();
    click('Link now, finish later'); click('Keep reviewing');
    expect(catalog.products()[0].channels).toHaveLength(0);
    click('Link now, finish later'); click('Link & save progress');
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ deferred: true }), false);
    expect(catalog.products()[0]).toMatchObject({ status: 'published', has_variants: false, skus: [] });
    expect(catalog.products()[0].channels[0].review_pending?.issues).toEqual(['3 SKUs need mapping']);
  });
  it('prefills actual source SKUs in inline setup without committing proposed Master changes', () => {
    const { source, catalog } = fixture();
    const master = { ...getProducts()[0], ...readyMasterFields(), id: 'ui-setup', sku_code: 'UI-SETUP', has_variants: false, product_type: 'single' as const, status: 'published' as const, channels: [], skus: [] };
    catalog.add(master);
    const item = { ...source, variants: 2, variantItems: [{ sku: 'ACTUAL-RED', label: 'Red' }, { sku: 'ACTUAL-BLUE', label: 'Blue' }], suggestedProductId: master.id };
    catalog.saveListings([item]);
    render(<ListingMasterReview catalog={catalog} listings={[item]} initialMode="existing" onBack={vi.fn()} onSaved={vi.fn()} />);
    click('Set up SKUs & details');
    expect(screen.getByRole('region', { name: 'Complete Product Master' })).toBeVisible();
    expect(screen.getAllByLabelText('Master variant SKU').map(input => (input as HTMLInputElement).value)).toEqual(['ACTUAL-RED', 'ACTUAL-BLUE']);
    expect(catalog.products()[0].skus).toEqual([]);
    expect(catalog.products()[0].channels).toEqual([]);
  });
});
