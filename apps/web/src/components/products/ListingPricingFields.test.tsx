// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingPricingFields } from './ListingPricingFields';
import { PricingRuleDialog } from '@/components/settings/PricingRuleDialog';
import { PRICING_STORAGE_KEY, readPricing, savePricingRule, saveShopPricing, type ListingPricing, type PricingRule } from '@/lib/pricing-rules';

const rule: PricingRule = { id: 'fx-ui', name: 'JP to VN', code: '', baseCurrency: 'JPY', targetCurrency: 'VND', fxRate: 170, adjustmentPct: 0, marketplaceFeePct: 0, taxPct: 0, roundingIncrement: 1000, minPrice: 0, maxPrice: 0, fxValidityHours: 0, enabled: true, version: 0, rateUpdatedAt: new Date().toISOString() };
function Harness({ initial = {} }: { initial?: ListingPricing }) {
  const [draft, setDraft] = useState<ListingPricing>({ pricing_source: 'shop', pricing_shop_id: 'ui-shop', channel_currency: 'VND', ...initial });
  return <><ListingPricingFields draft={draft} basePrice={1000} baseCurrency="JPY" shopLabel="Test VN shop" onChange={patch => setDraft(current => ({ ...current, ...patch }))} /><output data-testid="saved-price">{draft.channel_price}</output></>;
}
beforeEach(() => { localStorage.removeItem(PRICING_STORAGE_KEY); });
afterEach(() => { cleanup(); localStorage.removeItem(PRICING_STORAGE_KEY); });
describe('listing pricing review', () => {
  it('requires confirmation and returns to review after the shared rule changes', () => {
    savePricingRule(rule); saveShopPricing({ shopId: 'ui-shop', label: 'Test VN', currency: 'VND', ruleId: rule.id });
    render(<Harness />);
    expect(screen.getByText('Proposed listing price')).toBeInTheDocument();
    expect(screen.getByText('170,000 VND')).toBeInTheDocument();
    expect(screen.queryByText(/Not set →/)).not.toBeInTheDocument();
    expect(screen.getByTestId('saved-price')).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm listing price' }));
    expect(screen.getByText('Confirmed listing draft price')).toBeInTheDocument();
    expect(screen.getByTestId('saved-price')).toHaveTextContent('170000');
    act(() => { savePricingRule({ ...readPricing().rules[0], fxRate: 180 }); });
    expect(screen.getByText(/170,000 VND → 180,000 VND/)).toBeInTheDocument();
    expect(screen.getByTestId('saved-price')).toHaveTextContent('170000');
  });
  it('shows an actionable error without a cross-currency rule, and supports an explicit manual price', () => {
    render(<Harness />);
    expect(screen.getByRole('alert')).toHaveTextContent('JPY → VND');
    expect(screen.queryByRole('button', { name: 'Confirm listing price' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter price in VND' }));
    fireEvent.change(screen.getByLabelText('Manual price (VND)'), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm listing price' }));
    expect(screen.getByTestId('saved-price')).toHaveTextContent('250000');
  });
  it('creates and assigns a rule inline without leaving listing setup or silently confirming its price', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up JPY → VND pricing' }));
    const shop = within(screen.getByRole('region', { name: 'Set up shop pricing' }));
    fireEvent.click(shop.getByRole('button', { name: 'Create pricing rule' }));
    const editor = within(screen.getByRole('dialog', { name: 'Create pricing rule' }));
    fireEvent.change(editor.getByLabelText('Rule name'), { target: { value: 'Inline rule' } });
    fireEvent.change(editor.getByLabelText(/Exchange rate/), { target: { value: '170' } });
    fireEvent.click(editor.getByRole('button', { name: 'Create rule' }));
    expect(readPricing().shops).toHaveLength(0);
    fireEvent.click(shop.getByRole('button', { name: 'Save shop pricing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readPricing().shops[0].ruleId).toBe(readPricing().rules[0].id);
    expect(screen.getByRole('button', { name: 'Confirm listing price' })).toBeEnabled();
    expect(screen.getByTestId('saved-price')).toBeEmptyDOMElement();
  });
  it('requires rule-edit review before writing, and cancellation preserves the old rule', () => {
    const stored = savePricingRule(rule); const onSaved = vi.fn();
    const { unmount } = render(<PricingRuleDialog rule={stored} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Exchange rate/), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review update' }));
    expect(screen.getByRole('dialog', { name: 'Review rule update' })).toBeInTheDocument();
    expect(readPricing().rules[0].fxRate).toBe(170);
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));
    expect(readPricing().rules[0].fxRate).toBe(170);
    fireEvent.click(screen.getByRole('button', { name: 'Review update' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rule update' }));
    expect(readPricing().rules[0].fxRate).toBe(180);
    expect(onSaved).toHaveBeenCalledOnce();
    unmount();
  });
  it('reports invalid rule inputs without writing the registry', () => {
    render(<PricingRuleDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a rule name');
    expect(readPricing().rules).toHaveLength(0);
  });
});
