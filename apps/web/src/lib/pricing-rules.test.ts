// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addProduct, deleteProduct, getProductById, getProducts } from './product-store';
import { confirmedPricing, initialListingPricing, migrateProductPricing, PRICING_STORAGE_KEY, pricingNeedsReview, quoteListingPrice, readPricing, ruleImpacts, savePricingRule, saveShopPricing, shopPricingId, validateRule, type ListingPricing, type PricingRule } from './pricing-rules';

export const ruleFixture = (): PricingRule => ({ id: 'test-fx', name: 'Japan to Vietnam', code: 'JP-VN', baseCurrency: 'JPY', targetCurrency: 'VND', fxRate: 170, adjustmentPct: 10, marketplaceFeePct: 0, taxPct: 0, roundingIncrement: 1000, minPrice: 0, maxPrice: 0, fxValidityHours: 0, enabled: true, version: 1, rateUpdatedAt: '2026-09-30T00:00:00Z' });
const listing: ListingPricing = { pricing_source: 'shop', pricing_shop_id: 'shop-vn', channel_currency: 'VND' };
const seed = getProducts()[0];
beforeEach(() => { localStorage.removeItem(PRICING_STORAGE_KEY); });
afterEach(() => { deleteProduct('pricing-test'); localStorage.removeItem(PRICING_STORAGE_KEY); });
function setup(rule = ruleFixture()) {
  savePricingRule(rule);
  saveShopPricing({ shopId: 'shop-vn', label: 'Shopee · Test shop', currency: 'VND', ruleId: rule.id });
}
describe('shared shop pricing', () => {
  it('calculates FX, adjustment and rounding, then requires explicit confirmation', () => {
    setup(); const quote = quoteListingPrice(1000, 'JPY', listing);
    expect(quote.amount).toBe(187000);
    expect(pricingNeedsReview(listing, quote)).toBe(true);
    expect(pricingNeedsReview(confirmedPricing(listing, quote), quote)).toBe(false);
    expect(listing.channel_price).toBeUndefined();
  });
  it('does not copy the numeric master price across currencies without a rule', () => {
    expect(quoteListingPrice(1000, 'JPY', listing).error).toContain('JPY → VND');
    expect(() => confirmedPricing(listing, quoteListingPrice(1000, 'JPY', listing))).toThrow();
  });
  it('uses master price only for matching currencies', () => {
    expect(quoteListingPrice(1000, 'JPY', { channel_currency: 'JPY' }).amount).toBe(1000);
  });
  it('manual listing price takes precedence and does not require master FX', () => {
    setup(); const manual = { ...listing, pricing_source: 'manual' as const, manual_price: '250000' };
    expect(quoteListingPrice(0, 'USD', manual).amount).toBe(250000);
    expect(quoteListingPrice(0, 'USD', { ...manual, manual_price: '' }).error).toContain('manual price');
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid manual price %s', value => {
    expect(quoteListingPrice(1000, 'JPY', { ...listing, pricing_source: 'manual', manual_price: String(value) }).error).toBeTruthy();
  });
  it('requires manual-price review after shop currency changes', () => {
    saveShopPricing({ shopId: 'shop-vn', label: 'Test', currency: 'USD' });
    expect(quoteListingPrice(1000, 'JPY', { ...listing, pricing_source: 'manual', manual_price: '250000' }).error).toContain('currency changed');
  });
  it('blocks missing, disabled, mismatched and expired rules', () => {
    const rule = ruleFixture(); const registry = { rules: [rule], shops: [{ shopId: 'shop-vn', label: 'Test', currency: 'VND', ruleId: rule.id }] };
    expect(quoteListingPrice(1000, 'JPY', listing, { ...registry, rules: [] }).error).toContain('unavailable');
    expect(quoteListingPrice(1000, 'JPY', listing, { ...registry, rules: [{ ...rule, enabled: false }] }).error).toContain('inactive');
    expect(quoteListingPrice(1000, 'USD', listing, registry).error).toContain('does not support');
    expect(quoteListingPrice(1000, 'JPY', listing, { ...registry, rules: [{ ...rule, fxValidityHours: 1 }] }, Date.parse('2026-09-30T02:00:00Z')).error).toContain('expired');
  });
  it('does not leak a rule between shops on the same platform', () => {
    setup();
    expect(quoteListingPrice(1000, 'JPY', { ...listing, pricing_shop_id: 'another-vn-shop' }).error).toBeTruthy();
    expect(shopPricingId('amazon', 'Prime Beauty US')).not.toBe(shopPricingId('amazon', 'Prime Beauty Japan'));
    expect(shopPricingId('Shopee', 'Prime Beauty Official')).toBe(shopPricingId('shopee', 'Prime Beauty Official · VN'));
  });
  it('applies guardrails after rounding and validates bounds', () => {
    setup({ ...ruleFixture(), minPrice: 200000 });
    expect(quoteListingPrice(1000, 'JPY', listing).amount).toBe(200000);
    setup({ ...ruleFixture(), maxPrice: 180000 });
    expect(quoteListingPrice(1000, 'JPY', listing).amount).toBe(180000);
    expect(validateRule({ ...ruleFixture(), minPrice: 200, maxPrice: 100 })).toContain('Maximum');
    expect(validateRule({ ...ruleFixture(), fxRate: 0 })).toContain('Exchange rate');
    expect(validateRule({ ...ruleFixture(), adjustmentPct: -100 })).toContain('Adjustment');
  });
  it('invalidates confirmation on rule or Master price changes without changing the stored price', () => {
    setup(); const approved = confirmedPricing(listing, quoteListingPrice(1000, 'JPY', listing));
    savePricingRule({ ...readPricing().rules[0], fxRate: 180 });
    expect(pricingNeedsReview(approved, quoteListingPrice(1000, 'JPY', approved))).toBe(true);
    expect(pricingNeedsReview(approved, quoteListingPrice(1100, 'JPY', approved))).toBe(true);
    expect(approved.channel_price).toBe(187000);
  });
  it('previews affected listings while excluding manual prices and makes no product writes', () => {
    setup(); const approved = confirmedPricing(listing, quoteListingPrice(1000, 'JPY', listing));
    addProduct({ ...seed, id: 'pricing-test', retail_price: 1000, price_currency: 'JPY', channel_overrides: {
      shopee: { ...approved, enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'VN-SKU' },
      amazon: { ...approved, pricing_source: 'manual', enabled: true, title: '', description: '', price_markup: 0 },
    } });
    expect(ruleImpacts({ ...readPricing().rules[0], fxRate: 180 })).toMatchObject([{ listingSku: 'VN-SKU', current: 187000, next: { amount: 198000 } }]);
    savePricingRule({ ...readPricing().rules[0], fxRate: 180 });
    expect(getProductById('pricing-test')?.channel_overrides?.shopee?.channel_price).toBe(187000);
  });
  it('migrates legacy rules once, preserves original data and never auto-assigns them', () => {
    addProduct({ ...seed, id: 'pricing-test', price_currency: 'JPY', price_policies: [ruleFixture()] });
    migrateProductPricing(); migrateProductPricing();
    expect(readPricing().rules.filter(rule => rule.id === 'legacy:pricing-test:test-fx')).toHaveLength(1);
    expect(readPricing().shops).toEqual([]);
    expect(getProductById('pricing-test')?.price_policies).toHaveLength(1);
  });
  it('preserves imported price and actual shop, never assumes another shop on the platform', () => {
    const product = { ...seed, channel_overrides: {}, import_sources: [{ channel: 'amazon' as const, store: 'US Store', currency: 'USD', price: 34, brand: '' }] };
    expect(initialListingPricing(product, 'amazon', 'Japan Store')).toMatchObject({ pricing_shop_id: 'amazon:us store', channel_price: 34, channel_currency: 'USD', pricing_source: 'manual' });
  });
});
