// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Store } from 'lucide-react';
import { ChannelListingEditorDrawer } from './ChannelListingEditorDrawer';
import type { ChannelWizardDraft } from './ChannelListingWizard';
import { listingEditorIssues, listingInventoryPreview } from './listing-editor-state';
import { PRICING_STORAGE_KEY } from '@/lib/pricing-rules';
import { getProducts, type ChannelListing } from '@/lib/product-store';

const channel = { key: 'webstore', label: 'PrimeWeb', account: 'Test shop', description: '', icon: Store, iconClassName: '' };
const blank = Object.fromEntries('title price_markup description listing_sku category fulfillment variant_scope listing_mode identifier condition stock_quantity warehouse brand shipping_option bullet_points search_terms preorder_days warranty certification video_url web_slug pos_barcode visibility sync_policy safety_buffer allocation_cap media_scope compliance_notes tax_code attribute_material attribute_color'.split(' ').map(key => [key, '']));
const draft = { ...blank, enabled: true, localized_content_confirmed: true, channel_currency: 'JPY', pricing_source: 'shop', pricing_shop_id: 'test-web', sync_policy: 'automatic', warehouse: 'all', media_scope: 'all' } as ChannelWizardDraft;
const sources = [{ value: 'all', label: 'All recorded stock locations', quantity: 12 }, { value: 'empty', label: 'Unrecorded warehouse', quantity: null }];
const defaultProps = { open: true, onOpenChange: vi.fn(), channel, draft, masterSku: 'TEST', productName: 'Test product', basePrice: 1000, baseCurrency: 'JPY', inventorySources: sources, masterPersisted: true, masterHasUnsavedChanges: false, masterDataComplete: true, onSaveMaster: vi.fn(() => true), onSave: vi.fn() };
beforeEach(() => { localStorage.removeItem(PRICING_STORAGE_KEY); Element.prototype.scrollIntoView = vi.fn(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); localStorage.removeItem(PRICING_STORAGE_KEY); });

describe('guided listing editor', () => {
  it('uses the unified policy instead of legacy automatic stock and inherited media controls', () => {
    const listing: ChannelListing = { channel: 'website', external_id: 'sync-linked', status: 'active', listing_url: null, last_synced_at: null };
    const master = { ...getProducts()[0], channels: [listing], product_type: 'single' as const, has_variants: false, skus: [], import_sources: [], channel_overrides: {} };
    const onConfigure = vi.fn();
    render(<ChannelListingEditorDrawer {...defaultProps} syncSettings={{ master, listing, preference: { enabled: false, fields: ['content', 'media', 'price', 'inventory', 'shipping'] }, onConfigure }} />);
    fireEvent.click(screen.getByRole('button', { name: /Price & inventory/ }));
    expect(screen.queryByText('Automatic sync', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Stock sync policy')).not.toBeInTheDocument();
    expect(screen.getByText('Independent shop data · Sync off')).toBeVisible();
    expect(screen.getByRole('option', { name: 'Calculate once from Master' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Variants & channel media' }));
    expect(screen.queryByLabelText('Media selection')).not.toBeInTheDocument();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Manage sync settings' }));
    expect(onConfigure).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Manage sync settings' }));
    expect(onConfigure).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });
  it('shows the same Master price and stock previews without writing calculated values to the draft', () => {
    const listing: ChannelListing = { channel: 'website', external_id: 'sync-linked', status: 'active', listing_url: null, last_synced_at: null };
    const master = { ...getProducts()[0], channels: [listing], product_type: 'single' as const, has_variants: false, skus: [], import_sources: [], channel_overrides: {}, retail_price: 700, price_currency: 'JPY', inventory: { wh_crjp: 14 } };
    render(<ChannelListingEditorDrawer {...defaultProps} syncSettings={{ master, listing, preference: { enabled: true, fields: ['price', 'inventory'], pricing: { currency: 'JPY' }, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 4, allocation_cap: 8 } }, onConfigure: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /Price & inventory/ }));
    expect(screen.getByText('700 JPY')).toBeVisible();
    expect(screen.getByText('8 units')).toBeVisible();
    expect(screen.queryByLabelText('Price source')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(defaultProps.onSave.mock.calls[0][0].stock_quantity).toBe('');
    expect(defaultProps.onSave.mock.calls[0][0].channel_price).toBeUndefined();
  });
  it('prefills an empty Rakuten brand and keeps edits local until the draft is saved', () => {
    render(<ChannelListingEditorDrawer {...defaultProps} channel={{ ...channel, key: 'rakuten', label: 'Rakuten' }} rakutenBrandName="サイバーレコード" />);
    fireEvent.click(screen.getByRole('button', { name: /Channel requirements/ }));
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('サイバーレコード');
    expect(screen.getByLabelText('Rakuten brand name')).toHaveAttribute('aria-invalid', 'false');
    fireEvent.change(screen.getByLabelText('Rakuten brand name'), { target: { value: 'Listing-only name' } });
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Listing-only name' }));
  });

  it('preserves a saved Rakuten name when the brand suggestion changes', () => {
    const props = { ...defaultProps, channel: { ...channel, key: 'rakuten', label: 'Rakuten' }, draft: { ...draft, brand: 'Saved listing brand' } };
    const { rerender } = render(<ChannelListingEditorDrawer {...props} rakutenBrandName="Suggested brand" />);
    fireEvent.click(screen.getByRole('button', { name: /Channel requirements/ }));
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('Saved listing brand');
    fireEvent.change(screen.getByLabelText('Rakuten brand name'), { target: { value: 'Current user edit' } });
    rerender(<ChannelListingEditorDrawer {...props} rakutenBrandName="Changed suggestion" />);
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('Current user edit');
  });

  it('prefills only empty identifiers, removes phantom readiness failures, and keeps inventory collapsed', () => {
    render(<ChannelListingEditorDrawer {...defaultProps} />);
    expect(screen.getByLabelText('PrimeWeb parent listing SKU *')).toHaveValue('WEB-TEST');
    expect(screen.getByLabelText('Storefront URL *')).toHaveValue('/products/test-product');
    expect(screen.queryByText(/Provider validation/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Readiness/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Price & inventory' }));
    expect(screen.getByText('12 units to send')).toBeInTheDocument();
    expect(screen.queryByLabelText('Safety buffer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm listing price' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review & publish' })).toBeEnabled();
  });
  it('counts actual blockers once and focuses the missing field without losing edits', () => {
    render(<ChannelListingEditorDrawer {...defaultProps} masterDataComplete={false} masterMissingItems={[{ id: 'media', label: 'Add at least 1 product image' }]} draft={{ ...draft, listing_sku: 'EXISTING', web_slug: '/existing', channel_currency: 'VND' }} />);
    expect(screen.getByLabelText('PrimeWeb parent listing SKU *')).toHaveValue('EXISTING');
    expect(screen.getByText('2 items to complete')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('SEO title'), { target: { value: 'Unsaved title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete next item' }));
    expect(screen.getByLabelText('Price source')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Enter price in VND' }));
    fireEvent.change(screen.getByLabelText('Manual price (VND)'), { target: { value: '250000' } });
    expect(screen.getByText('1 item to complete')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Listing', exact: true }));
    expect(screen.getByLabelText('SEO title')).toHaveValue('Unsaved title');
    fireEvent.click(screen.getByRole('button', { name: 'Complete next item' }));
    expect(screen.getByRole('heading', { name: 'Complete Product Master' })).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });
  it('highlights invalid inventory and preserves an explicit zero cap', () => {
    render(<ChannelListingEditorDrawer {...defaultProps} draft={{ ...draft, allocation_cap: '0' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Price & inventory' }));
    expect(screen.getByText('0 units to send')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust inventory' }));
    fireEvent.change(screen.getByLabelText('Safety buffer'), { target: { value: '-1' } });
    expect(screen.getByLabelText('Safety buffer')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('1 item to complete')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete next item' }));
    expect(screen.getByLabelText('Safety buffer')).toHaveFocus();
  });
  it('reviews and confirms once, explicitly saves the Master when needed, and never simulates a provider error', async () => {
    render(<ChannelListingEditorDrawer {...defaultProps} masterHasUnsavedChanges />);
    fireEvent.click(screen.getByRole('button', { name: 'Review & publish' }));
    expect(screen.getByText(/Confirming also saves your current Product Master edits/)).toBeInTheDocument();
    expect(screen.getByText(/Live publishing is not connected/)).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save reviewed draft' }));
    await waitFor(() => expect(defaultProps.onSave).toHaveBeenCalledOnce());
    expect(defaultProps.onSaveMaster).toHaveBeenCalledOnce();
    expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ channel_price: 1000, stock_quantity: '12', listing_sku: 'WEB-TEST' }));
    expect(screen.getByText('Reviewed draft saved. No update was sent to the channel.')).toBeInTheDocument();
    expect(screen.queryByText(/timed out|Provider validation passed/)).not.toBeInTheDocument();
  });
  it('requires review again if a source price changes, then displays only a real publish failure', async () => {
    const onPublish = vi.fn().mockRejectedValue(new Error('Channel rejected this request'));
    const { rerender } = render(<ChannelListingEditorDrawer {...defaultProps} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review & publish' }));
    rerender(<ChannelListingEditorDrawer {...defaultProps} basePrice={1200} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & publish' }));
    expect(onPublish).not.toHaveBeenCalled();
    expect(screen.getByText(/Source data changed. Review the updated values/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & publish' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Channel rejected this request'));
    expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ channel_price: 1200 }));
  });
  it('keeps the listing open while images are added to Master and updates blockers immediately', async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ChannelListingEditorDrawer {...defaultProps} masterDataComplete={false} masterMissingItems={[{ id: 'media', label: 'Add at least 1 product image' }]} onUploadMasterImage={upload} masterImages={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add images' }));
    expect(screen.getByText('0 images · 1 required · 9 max')).toBeVisible();
    await act(async () => fireEvent.change(screen.getByLabelText('Add Master images'), { target: { files: [new File(['image'], 'one.png', { type: 'image/png' })] } }));
    expect(upload).toHaveBeenCalledOnce(); expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
    rerender(<ChannelListingEditorDrawer {...defaultProps} masterImages={['one.png']} onUploadMasterImage={upload} />);
    expect(screen.getByText('1 image · 1 required · 9 max')).toBeVisible();
    expect(screen.getByText('Master requirements complete.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review & publish' })).toBeEnabled();
  });
});

describe('inventory preview validation', () => {
  it('uses only selected variant quantities and never treats unrecorded stock as zero', () => {
    const pool = [{ ...sources[0], byVariant: { a: 5, b: null } }];
    expect(listingInventoryPreview(draft, pool, ['a'], 'webstore').quantity).toBe(5);
    const missing = listingInventoryPreview(draft, pool, ['a', 'b'], 'webstore');
    expect(missing.quantity).toBeNull();
    expect(listingEditorIssues(draft, 'webstore', ['a', 'b'], undefined, missing).some(issue => issue.field === 'warehouse')).toBe(true);
  });
  it.each(['disabled', 'manual'])('respects the %s policy', policy => {
    const form = { ...draft, sync_policy: policy, stock_quantity: '0' };
    expect(listingInventoryPreview(form, sources, ['default'], 'webstore').quantity).toBe(policy === 'disabled' ? null : 0);
  });
  it('never sends Master inventory to Amazon FBA', () => {
    const form = { ...draft, fulfillment: 'FBA', warehouse: '' };
    const preview = listingInventoryPreview(form, [], ['default'], 'amazon');
    expect(preview.quantity).toBeNull();
    expect(listingEditorIssues(form, 'amazon', ['default'], undefined, preview).some(issue => issue.field === 'warehouse')).toBe(false);
  });
});
