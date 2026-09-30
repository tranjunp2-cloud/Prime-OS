import { getProducts, type PricePolicy, type Product } from './product-store';

// Local prototype storage, like Product Master. No marketplace writes happen here.
export const PRICING_STORAGE_KEY = 'primeos.pricing-rules.v1';
export const PRICING_CHANGED = 'primeos:pricing-changed';
export const PRICING_CURRENCIES = ['JPY', 'USD', 'SGD', 'MYR', 'VND', 'EUR', 'GBP', 'THB', 'IDR', 'PHP', 'AUD', 'CNY', 'KRW', 'TWD'];
export interface PricingRule extends PricePolicy {
  baseCurrency: string;
  version: number;
  rateUpdatedAt: string;
  migratedFrom?: string;
}
export interface ShopPricing {
  shopId: string;
  label: string;
  currency: string;
  ruleId?: string;
}
export interface ListingPricing {
  pricing_shop_id?: string;
  pricing_shop_label?: string;
  pricing_source?: 'shop' | 'manual';
  manual_price?: string;
  channel_price?: number;
  channel_currency?: string;
  pricing_signature?: string;
}
interface Registry { rules: PricingRule[]; shops: ShopPricing[] }
export type PriceQuote = { amount: number; currency: string; signature: string; source: string; error?: never } | { error: string; amount?: never; currency: string; signature?: never; source?: never };

export function shopPricingId(platform: string, account: string) {
  const key = ({ primeweb: 'webstore', website: 'webstore', primepos: 'pos', tiktok_shop: 'tiktok', 'tiktok shop': 'tiktok' } as Record<string, string>)[platform.toLowerCase()] ?? platform.toLowerCase();
  // Region suffixes are display metadata, not part of the shop name.
  return `${key}:${account.replace(/\s*·\s*(VN|MY|JP|US|SG)$/i, '').trim().toLowerCase()}`;
}
export function initialListingPricing(product: Product | null | undefined, key: string, account: string): ListingPricing {
  const stored = product?.channel_overrides?.[key as keyof NonNullable<Product['channel_overrides']>];
  const source = product?.import_sources?.find(item => item.channel === (key === 'webstore' ? 'website' : key));
  const defaults: Record<string, string> = { webstore: 'VND', pos: 'VND', shopee: 'VND', lazada: 'MYR', amazon: 'JPY', rakuten: 'JPY', tiktok: 'VND' };
  const currency = stored?.channel_currency || source?.currency || defaults[key] || product?.price_currency;
  const price = stored?.channel_price ?? source?.price;
  const legacyManual = stored?.listing_mode === 'manual' && stored.price_markup > 0 ? stored.price_markup : undefined;
  const legacyMarkup = stored?.price_markup && product && currency === product.price_currency ? product.retail_price * (1 + stored.price_markup / 100) : undefined;
  const preservedPrice = price ?? legacyManual ?? legacyMarkup;
  const label = stored?.pricing_shop_label || source?.store || account;
  return {
    pricing_shop_id: stored?.pricing_shop_id || shopPricingId(key, label), pricing_shop_label: label,
    pricing_source: stored?.pricing_source || (preservedPrice != null ? 'manual' : 'shop'),
    manual_price: stored?.manual_price ?? (preservedPrice != null ? String(preservedPrice) : undefined),
    channel_price: preservedPrice, channel_currency: currency, pricing_signature: stored?.pricing_signature,
  };
}
export function readPricing(): Registry {
  try {
    const value = JSON.parse(localStorage.getItem(PRICING_STORAGE_KEY) ?? 'null');
    if (Array.isArray(value?.rules) && Array.isArray(value?.shops)) return value;
  } catch { /* Empty registry on a fresh workspace. */ }
  return { rules: [], shops: [] };
}
function writePricing(registry: Registry) {
  localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(registry));
  window.dispatchEvent(new Event(PRICING_CHANGED));
}
export function migrateProductPricing() {
  const registry = readPricing();
  let changed = false;
  getProducts().forEach(product => (product.price_policies ?? []).forEach(policy => {
    const id = `legacy:${product.id}:${policy.id}`;
    if (registry.rules.some(rule => rule.id === id)) return;
    registry.rules.push({ ...policy, id, baseCurrency: product.price_currency, version: 1, rateUpdatedAt: product.updated_at, migratedFrom: product.sku_code });
    changed = true;
  }));
  // Preserve original per-product data and do not silently assign migrated rules to shops.
  if (changed) writePricing(registry);
}
export function validateRule(rule: PricingRule): string | null {
  if (!rule.name.trim()) return 'Enter a rule name.';
  if (!/^[A-Z]{3}$/.test(rule.baseCurrency) || !/^[A-Z]{3}$/.test(rule.targetCurrency)) return 'Choose both currencies.';
  if (!Number.isFinite(rule.fxRate) || rule.fxRate <= 0) return 'Exchange rate must be greater than zero.';
  if (rule.baseCurrency === rule.targetCurrency && rule.fxRate !== 1) return 'Use an exchange rate of 1 for the same currency.';
  const nonNegative = [rule.marketplaceFeePct, rule.taxPct, rule.roundingIncrement, rule.minPrice, rule.maxPrice, rule.fxValidityHours];
  if (nonNegative.some(value => !Number.isFinite(value) || value < 0)) return 'Fees, tax, rounding, limits and validity must be zero or greater.';
  if (!Number.isFinite(rule.adjustmentPct) || rule.adjustmentPct <= -100) return 'Adjustment must be greater than -100%.';
  if (rule.maxPrice > 0 && rule.minPrice > rule.maxPrice) return 'Maximum price must not be lower than minimum price.';
  if (!Number.isFinite(Date.parse(rule.rateUpdatedAt))) return 'Confirm the exchange rate before saving.';
  return null;
}
export function savePricingRule(rule: PricingRule) {
  const error = validateRule(rule);
  if (error) throw new Error(error);
  const registry = readPricing();
  const previous = registry.rules.find(item => item.id === rule.id);
  const saved = { ...rule, name: rule.name.trim(), version: (previous?.version ?? 0) + 1 };
  writePricing({ ...registry, rules: [...registry.rules.filter(item => item.id !== rule.id), saved] });
  return saved;
}
export function saveShopPricing(shop: ShopPricing) {
  const registry = readPricing();
  const rule = registry.rules.find(item => item.id === shop.ruleId);
  if (shop.ruleId && (!rule || !rule.enabled || rule.targetCurrency !== shop.currency)) throw new Error('Choose an active rule for the shop currency.');
  writePricing({ ...registry, shops: [...registry.shops.filter(item => item.shopId !== shop.shopId), shop] });
}
export function quoteListingPrice(base: number, baseCurrency: string, listing: ListingPricing, registry = readPricing(), now = Date.now()): PriceQuote {
  const shop = registry.shops.find(item => item.shopId === listing.pricing_shop_id);
  const currency = shop?.currency || listing.channel_currency || '';
  if (!currency) return { error: 'Choose the listing currency.', currency };
  if (listing.pricing_source === 'manual') {
    const amount = Number(listing.manual_price ?? listing.channel_price);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter a manual price greater than zero.', currency };
    if (shop && listing.channel_currency && listing.channel_currency !== shop.currency) return { error: 'Shop currency changed. Review the manual price in the new currency.', currency };
    return { amount, currency, signature: JSON.stringify(['manual', amount, currency]), source: 'Manual price' };
  }
  if (!Number.isFinite(base) || base <= 0) return { error: 'Complete the Product Master base price.', currency };
  const rule = registry.rules.find(item => item.id === shop?.ruleId);
  if (shop?.ruleId && !rule) return { error: 'The shop pricing rule is unavailable.', currency };
  if (!rule) {
    if (baseCurrency !== currency) return { error: `Set up a ${baseCurrency} → ${currency} rule or enter a manual price.`, currency };
    return { amount: base, currency, signature: JSON.stringify(['master', base, baseCurrency, listing.pricing_shop_id]), source: 'Product Master · same currency' };
  }
  const invalid = validateRule(rule);
  if (invalid) return { error: invalid, currency };
  if (!rule.enabled) return { error: 'The shop pricing rule is inactive. Choose another rule or use a manual price.', currency };
  if (rule.baseCurrency !== baseCurrency || rule.targetCurrency !== currency) return { error: `The shop rule does not support ${baseCurrency} → ${currency}.`, currency };
  if (rule.fxValidityHours > 0 && now > Date.parse(rule.rateUpdatedAt) + rule.fxValidityHours * 3600000) return { error: 'Exchange rate expired. Update the rule or use a manual price.', currency };
  let amount = base * rule.fxRate * (1 + rule.adjustmentPct / 100) * (1 + rule.marketplaceFeePct / 100) * (1 + rule.taxPct / 100);
  if (rule.roundingIncrement > 0) amount = Math.floor((amount + Number.EPSILON * amount) / rule.roundingIncrement) * rule.roundingIncrement;
  if (rule.minPrice > 0) amount = Math.max(amount, rule.minPrice);
  if (rule.maxPrice > 0) amount = Math.min(amount, rule.maxPrice);
  amount = Math.round(amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'The calculated price must be greater than zero. Review the rounding and limits.', currency };
  return { amount, currency, signature: JSON.stringify([rule.id, rule.version, base, baseCurrency, currency, amount, listing.pricing_shop_id]), source: rule.name };
}
export function pricingNeedsReview(listing: ListingPricing, quote: PriceQuote) {
  return Boolean(quote.error || listing.pricing_signature !== quote.signature || listing.channel_price !== quote.amount || listing.channel_currency !== quote.currency);
}
export function confirmedPricing(listing: ListingPricing, quote: PriceQuote): ListingPricing {
  if (quote.error) throw new Error(quote.error);
  return { ...listing, channel_price: quote.amount, channel_currency: quote.currency, pricing_signature: quote.signature };
}
export function ruleImpacts(rule: PricingRule) {
  const registry = readPricing();
  const next = { ...registry, rules: [...registry.rules.filter(item => item.id !== rule.id), { ...rule, version: (registry.rules.find(item => item.id === rule.id)?.version ?? 0) + 1 }] };
  return getProducts().flatMap(product => Object.entries(product.channel_overrides ?? {}).flatMap(([channel, listing]) => {
    const shop = registry.shops.find(item => item.shopId === listing.pricing_shop_id);
    if (!listing.enabled || listing.pricing_source !== 'shop' || shop?.ruleId !== rule.id) return [];
    return [{ productId: product.id, sku: product.sku_code, listingSku: listing.listing_sku || channel, shop: shop.label, current: listing.channel_price, currentCurrency: listing.channel_currency, next: quoteListingPrice(product.retail_price, product.price_currency, listing, next) }];
  }));
}
export const formatPrice = (amount?: number, currency?: string) => amount == null ? 'Not set' : `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency ?? ''}`;
