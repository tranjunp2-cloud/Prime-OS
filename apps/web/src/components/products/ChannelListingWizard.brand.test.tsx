// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Store } from 'lucide-react';
import { ChannelListingWizard, type ChannelWizardDraft } from './ChannelListingWizard';

function Harness({ brand = '', enabled = true }: { brand?: string; enabled?: boolean }) {
  const fields = 'title price_markup description listing_sku category fulfillment variant_scope listing_mode identifier condition stock_quantity warehouse brand shipping_option bullet_points search_terms preorder_days warranty certification video_url web_slug pos_barcode visibility sync_policy safety_buffer allocation_cap media_scope compliance_notes tax_code attribute_material attribute_color';
  const [draft, setDraft] = useState<ChannelWizardDraft>({ ...Object.fromEntries(fields.split(' ').map(key => [key, ''])), enabled, brand, localized_content_confirmed: true, title: 'Listing title', description: 'Listing description', listing_sku: 'RKT-TEST', category: 'Art supplies', identifier: '4901234567890' } as ChannelWizardDraft);
  return <ChannelListingWizard open embedded channels={[{ key: 'rakuten', label: 'Rakuten', account: 'Test shop', description: '', icon: Store, iconClassName: '', connectionStatus: 'connected' }]} drafts={{ rakuten: draft }} rakutenBrandName="サイバーレコード" onChange={(_channel, patch) => setDraft(current => ({ ...current, ...patch }))} onOpenChange={vi.fn()} masterSku="TEST" productName="Test product" productCategory="Art supplies" availableStock={10} imageCount={3} productType="single" />;
}

afterEach(cleanup);
describe('Rakuten listing brand suggestion', () => {
  it('prefills a selected empty draft and allows editing without a fake authorization blocker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Test shop · Rakuten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 shop' }));
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('サイバーレコード');
    fireEvent.change(screen.getByLabelText('Rakuten brand name'), { target: { value: 'Listing-only name' } });
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('Listing-only name');
    expect(screen.getByRole('button', { name: 'Review new listings' })).toBeEnabled();
    expect(screen.queryByText(/Approval required|Set in listing/)).not.toBeInTheDocument();
  });

  it('does not overwrite an existing listing name', () => {
    render(<Harness brand="Existing listing name" />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Test shop · Rakuten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 shop' }));
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('Existing listing name');
  });

  it('prefills the name when a new channel is selected', () => {
    render(<Harness enabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Test shop · Rakuten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up 1 shop' }));
    expect(screen.getByLabelText('Rakuten brand name')).toHaveValue('サイバーレコード');
  });
});
