// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Store } from 'lucide-react';
import { ChannelListingWizard, type ChannelWizardDraft } from './ChannelListingWizard';
import { PRICING_STORAGE_KEY } from '@/lib/pricing-rules';

function Harness() {
  const blank = Object.fromEntries('title price_markup description listing_sku category fulfillment variant_scope listing_mode identifier condition stock_quantity warehouse brand shipping_option bullet_points search_terms preorder_days warranty certification video_url web_slug pos_barcode visibility sync_policy safety_buffer allocation_cap media_scope compliance_notes tax_code attribute_material attribute_color'.split(' ').map(key => [key, '']));
  const [draft, setDraft] = useState<ChannelWizardDraft>({ ...blank, enabled: true, localized_content_confirmed: true, listing_sku: 'WEB-TEST', web_slug: '/products/test', channel_currency: 'JPY', pricing_source: 'shop', pricing_shop_id: 'test-web', sync_policy: 'automatic' } as ChannelWizardDraft);
  return <ChannelListingWizard open embedded channels={[{ key: 'webstore', label: 'PrimeWeb', account: 'Test shop', description: '', icon: Store, iconClassName: '', connectionStatus: 'connected' }]} drafts={{ webstore: draft }} onChange={(_channel, patch) => setDraft(current => ({ ...current, ...patch }))} onOpenChange={vi.fn()} masterSku="TEST" productName="Test product" productCategory="Books" availableStock={10} imageCount={3} productType="single" basePrice={1000} baseCurrency="JPY" />;
}
afterEach(() => { cleanup(); localStorage.removeItem(PRICING_STORAGE_KEY); });
describe('wizard price gate', () => {
  it('blocks review until price confirmation, then shows the actual price in final review', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 channel' }));
    expect(screen.getByRole('button', { name: 'Review channel changes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm listing price' }));
    expect(screen.getByRole('button', { name: 'Review channel changes' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Review channel changes' }));
    expect(screen.getByText('1,000 JPY')).toBeInTheDocument();
  });
});
