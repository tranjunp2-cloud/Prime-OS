// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShopListingEditor } from './ShopListingEditor';
import { getProducts, type ChannelListing } from '@/lib/product-store';

afterEach(cleanup);
const listing: ChannelListing = { channel: 'amazon', external_id: 'one', store_name: 'Shop A', shop_sku: 'SKU-A', status: 'active', publication_unconfirmed: true, listing_url: null, last_synced_at: null,
  shop_snapshot: { channel: 'amazon', store_name: 'Shop A', listing_id: 'one', shop_sku: 'SKU-A', title: 'Listing title A', description: 'Shop description', brand: 'Shop brand', category: 'Shop category', images: ['/one.jpg'], price: { amount: 29, currency: 'USD' }, stock: 0, recorded_at: '' } };
function mount(extra: Partial<ChannelListing> = {}, saveError?: string) {
  const target = { ...listing, ...extra };
  const product = { ...getProducts()[0], name: 'Never prefill me', status: 'draft' as const, images: ['/master.jpg'], channels: [target], channel_overrides: {}, import_sources: [] };
  const onSave = vi.fn(() => { if (saveError) throw new Error(saveError); }), onClose = vi.fn();
  render(<ShopListingEditor product={product} listing={target} channelLabel="Amazon" onSave={onSave} onClose={onClose} restoreFocus={vi.fn()} />);
  return { onSave, onClose };
}
function chooseSource(group: string, follow: boolean) {
  fireEvent.click(within(screen.getByRole('radiogroup', { name: `${group} data source` })).getByRole('radio', { name: follow ? 'Follow Master' : 'Edit independently' }));
}
describe('Existing listing editor', () => {
  it('keeps one shared listing header above every tab and review, without repeating the summary in the form', () => {
    mount();
    const summary = screen.getByRole('region', { name: 'Listing summary' });
    expect(summary).toHaveTextContent('Listing title A');
    expect(summary).toHaveTextContent('Shop A · Amazon');
    expect(summary).toHaveTextContent('SKU: SKU-A');
    expect(summary).toHaveTextContent('1 SKU · 1 image');
    expect(summary.compareDocumentPosition(screen.getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const name of ['Content', 'Images', 'Price & stock', 'Shipping', 'Channel details']) {
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(screen.getAllByRole('region', { name: 'Listing summary' })).toHaveLength(1);
      expect(within(screen.getByRole('tabpanel')).queryByRole('region', { name: 'Listing summary' })).not.toBeInTheDocument();
      expect(summary).toBeVisible();
    }
    expect(within(screen.getByRole('tabpanel')).getByText('Listing ID')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Updated title' } });
    expect(summary).toHaveTextContent('Updated title');
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(summary).toBeVisible();
    expect(screen.getAllByRole('img', { name: 'Listing thumbnail' })).toHaveLength(1);
  });
  it('keeps channel details in the same editor and review flow without changing SKU identity', () => {
    const { onSave } = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Channel details' }));
    expect(screen.getByRole('heading', { name: 'SKU mapping' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search terms'), { target: { value: 'Tailoring scissors' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(screen.getByText('Search terms: Tailoring scissors')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ channel_settings: { search_terms: 'Tailoring scissors' } }, expect.any(String));
  });
  it('prefills own content, price and zero stock; reviews only changed fields', () => {
    const { onSave } = mount();
    expect(screen.getByLabelText('Listing title')).toHaveValue('Listing title A');
    expect(screen.queryByDisplayValue('Never prefill me')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Independent title' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    expect(screen.getByLabelText('Shop stock')).toHaveValue(0);
    expect(screen.getByLabelText('Listing price')).toHaveValue(29);
    expect(screen.getByLabelText('Currency')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Listing price'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Review listing changes' })).toHaveTextContent('29 USD');
    expect(screen.getByText('35 USD')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));
    expect(screen.getByLabelText('Listing price')).toHaveValue(35);
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ title: 'Independent title', price: { amount: 35, currency: 'USD' } }, expect.any(String));
  });
  it('allows independent images and has an explicit discard path', () => {
    const { onClose, onSave } = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/listing.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('img', { name: 'Listing image 2' })).toHaveAttribute('src', 'https://example.com/listing.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ images: ['/one.jpg', 'https://example.com/listing.jpg'] }, expect.any(String));
  });
  it('does not gate listing updates on missing creation fields or incomplete Master', () => {
    const { onSave } = mount({ shop_snapshot: undefined, reported_stock: undefined });
    expect(screen.getByLabelText('Listing title')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Local brand' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ brand: 'Local brand' }, expect.any(String));
  });
  it('locks only synced groups; other fields remain editable', () => {
    mount({ master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } });
    expect(screen.getByLabelText('Listing title')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Listing title')).toHaveValue('Listing title A');
    expect(screen.getByLabelText('Shop category')).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    expect(screen.getByLabelText('Listing price')).toBeEnabled();
    expect(screen.getByLabelText('Shop stock')).toBeEnabled();
    expect(screen.queryByRole('button', { name: /sync settings/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Following Master: Content, Images');
  });
  it('has one source choice per group and a read-only summary, without a second sync-settings action', () => {
    mount({ master_data_sync: { enabled: true, fields: ['content', 'media', 'price', 'inventory', 'shipping'], updated_at: '' } });
    for (const [tab, messages] of [
      ['Content', ['Product content']], ['Images', ['Images']],
      ['Price & stock', ['Selling price', 'Stock']], ['Shipping', ['Shipping & compliance']], ['Channel details', []],
    ] as const) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(screen.queryByRole('button', { name: /sync settings/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Change sync settings' })).not.toBeInTheDocument();
      for (const label of messages) {
        const choices = within(screen.getByRole('radiogroup', { name: `${label} data source` }));
        expect(choices.getByRole('radio', { name: 'Follow Master' })).toBeChecked();
        expect(choices.getByRole('radio', { name: 'Edit independently' })).not.toBeChecked();
      }
    }
  });
  it('preserves unsaved independent edits when toggling sources and cancels without writing', () => {
    const { onClose, onSave } = mount();
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Unsaved listing title' } });
    chooseSource('Product content', true);
    expect(screen.getByLabelText('Listing title')).toHaveAttribute('readonly');
    chooseSource('Product content', false);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Listing title')).toHaveValue('Unsaved listing title');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
  it('keeps group changes pending, preserves its values, and saves edits and opt-out together', () => {
    const { onSave } = mount({ master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } });
    chooseSource('Product content', false);
    chooseSource('Product content', true);
    expect(screen.getByLabelText('Listing title')).toHaveAttribute('readonly');
    chooseSource('Product content', false);
    expect(screen.getByLabelText('Listing title')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Listing title')).toHaveValue('Listing title A');
    expect(screen.getByRole('status')).toHaveTextContent('Following Master: Images');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Independent title' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));
    expect(screen.getByRole('radio', { name: 'Follow Master' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(screen.getByRole('region', { name: 'Data source changes' })).toHaveTextContent('Product content: Follow Master → Independent');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
    expect(screen.getByLabelText('Listing title')).toHaveValue('Independent title');
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ title: 'Independent title', description: 'Shop description', brand: 'Shop brand' }, expect.any(String), expect.objectContaining({ preference: expect.objectContaining({ enabled: true, fields: ['media'] }), reviewedPlan: expect.any(String), masterSnapshot: expect.any(String) }));
  });
  it('can cancel an unsaved opt-out without editing values or changing saved preferences', () => {
    const saved = { enabled: true, fields: ['content' as const], updated_at: '' };
    const { onSave, onClose } = mount({ master_data_sync: saved });
    chooseSource('Product content', false);
    expect(screen.getByRole('button', { name: 'Review changes' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    expect(saved).toEqual({ enabled: true, fields: ['content'], updated_at: '' });
  });
  it('reviews current and Master values before resuming and excludes abandoned independent edits', () => {
    const { onSave } = mount();
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: 'Unsaved independent title' } });
    chooseSource('Product content', true);
    expect(screen.getByLabelText('Listing title')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Shop category'), { target: { value: 'Local category' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));
    chooseSource('Images', true);
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    const review = within(screen.getByRole('region', { name: 'Data source changes' }));
    expect(review.getByText('Listing title A')).toBeVisible();
    expect(review.getByText('Never prefill me')).toBeVisible();
    expect(review.queryByText('Unsaved independent title')).not.toBeInTheDocument();
    expect(review.getAllByRole('img').map(image => image.getAttribute('src'))).toEqual(['/one.jpg', '/master.jpg']);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ category: 'Local category' }, expect.any(String), expect.objectContaining({ preference: expect.objectContaining({ fields: ['content', 'media'] }), reviewedPlan: expect.any(String) }));
  });
  it('exposes pricing and warehouse settings in their groups and blocks incomplete configuration', () => {
    const { onSave } = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    chooseSource('Selling price', true);
    expect(screen.getByLabelText('Listing currency')).toHaveValue('USD');
    expect(screen.getByLabelText('Pricing rule')).toBeVisible();
    chooseSource('Selling price', false);
    chooseSource('Stock', true);
    expect(screen.getByLabelText('Amazon fulfillment')).toBeVisible();
    expect(screen.getByLabelText('Stock source')).toBeVisible();
    expect(screen.getByLabelText('Safety buffer')).toHaveValue(0);
    expect(screen.getByLabelText('Allocation cap (optional)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(screen.queryByRole('region', { name: 'Review listing changes' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert').some(alert => alert.textContent?.includes('Confirm Amazon fulfillment'))).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
    chooseSource('Stock', false);
    expect(screen.getByRole('button', { name: 'Review changes' })).toBeDisabled();
  });
  it('supports multiple pending groups and retains edits after a failed save', () => {
    const { onSave } = mount({ master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '' } }, 'Storage full');
    chooseSource('Product content', false);
    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));
    chooseSource('Images', false);
    expect(screen.getByRole('img', { name: 'Listing image 1' })).toHaveAttribute('src', '/one.jpg');
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/two.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ images: ['/one.jpg', 'https://example.com/two.jpg'] }), expect.any(String), expect.objectContaining({ preference: expect.objectContaining({ enabled: false, fields: [] }) }));
    expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));
    expect(screen.getByRole('img', { name: 'Listing image 2' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('All groups independent');
  });
  it('validates changed numbers, keeps user inputs after failure, and does not claim a remote update', () => {
    const { onSave } = mount({}, 'Storage full');
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    fireEvent.change(screen.getByLabelText('Shop stock'), { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('whole number');
    expect(screen.getByLabelText('Shop stock')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Shop stock')).toHaveAccessibleDescription(screen.getByRole('alert').textContent!);
    fireEvent.change(screen.getByLabelText('Shop stock'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
    expect(screen.getByText('Local draft only. No update is sent to the shop.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));
    expect(screen.getByLabelText('Shop stock')).toHaveValue(8);
  });
  it('supports keyboard tab navigation and dirty-close cancellation', () => {
    const { onClose, onSave } = mount();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Content' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Images' })).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/pending.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
  it('shows full recorded shipping, channel details and per-SKU data, without filling missing prices with totals', () => {
    mount({ shop_snapshot: { ...listing.shop_snapshot!, shipping: { length: 20, width: 14, height: 3, weight: 230, country: 'JP' },
      identifiers: { gtin: '123456', mpn: 'MPN-A' }, channel_settings: { condition: 'New', search_terms: 'Tailoring tools' },
      variant_count: 2, variant_items: [{ sku: 'A', label: 'Small', price: { amount: 0, currency: 'USD' }, stock: 0 }, { sku: 'B', label: 'Large' }] } });
    fireEvent.click(screen.getByRole('tab', { name: 'Shipping' }));
    expect(screen.getByLabelText('Weight (g)')).toHaveValue(230);
    expect(screen.getByLabelText('Length (cm)')).toHaveValue(20);
    fireEvent.click(screen.getByRole('tab', { name: 'Channel details' }));
    expect(screen.getByText('123456')).toBeVisible();
    expect(screen.getByLabelText('Condition')).toHaveValue('New');
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    expect(screen.getByRole('table')).toHaveTextContent('Small');
    expect(screen.getByRole('table')).toHaveTextContent('0 USD');
    expect(screen.getByRole('table')).toHaveTextContent('Not recorded');
    expect(screen.getByLabelText('Listing price')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review changes' })).toBeDisabled();
  });
  it('populates a known legacy demo completely, but saves only the edited nested field', () => {
    const target: ChannelListing = { channel: 'website', external_id: 'WEB-CR-TAI-BSZ', status: 'active', listing_url: null, last_synced_at: null };
    const product = { ...getProducts()[0], id: 'prod_005', sku_code: 'CR-TAI-BSZ', name: 'Saved Master name', description: 'Saved Master description', images: ['/master.jpg'],
      channels: [target], import_sources: [], channel_overrides: { webstore: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'WEB-CR-TAI-BSZ', listing_mode: 'master' as const, media_scope: 'all' as const } } };
    const onSave = vi.fn();
    render(<ShopListingEditor product={product} listing={target} channelLabel="PrimeWeb" onSave={onSave} onClose={vi.fn()} restoreFocus={vi.fn()} />);
    for (const tab of ['Content', 'Images', 'Price & stock', 'Shipping', 'Channel details']) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(within(screen.getByRole('tabpanel')).queryByText(/^(Demo|Master preview|Saved setting|Local draft)$/)).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
    expect(screen.getByLabelText('Listing title')).toHaveValue('Traditional Japanese Precision Tailoring Set');
    expect(screen.getByLabelText('Listing title')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Listing title')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Description')).not.toHaveValue('');
    expect(screen.getByLabelText('Shop category')).not.toHaveValue('');
    expect(screen.getByRole('region', { name: 'Listing summary' })).toHaveTextContent('1 SKU · 3 images');
    expect(screen.queryByText(/fields are sample values/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));
    expect(screen.getByRole('img', { name: 'Listing image 1' })).toHaveAttribute('src', '/images/products/B0FH6LHSXD/1.jpg');
    expect(screen.getByRole('img', { name: 'Listing image 3' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Price & stock' }));
    expect(screen.getByLabelText('Shop stock')).toHaveValue(24);
    fireEvent.click(screen.getByRole('tab', { name: 'Shipping' }));
    expect(screen.getByLabelText('Weight (g)')).toHaveValue(160);
    fireEvent.change(screen.getByLabelText('Weight (g)'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Channel details' }));
    expect(screen.getByLabelText('Sales visibility')).toHaveValue('Visible in online store');
    fireEvent.change(screen.getByLabelText('Color / pattern'), { target: { value: 'Red' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save listing changes' }));
    expect(onSave).toHaveBeenCalledWith({ shipping: { weight: 200 }, channel_settings: { attribute_color: 'Red' } }, expect.any(String));
  });
});
