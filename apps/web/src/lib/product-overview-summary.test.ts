import { describe, expect, it } from 'vitest';
import { getOverviewPrice } from './product-overview-summary';

const defaults = { hasVariants: false, basePrice: '1980', variants: [], currency: 'JPY', formatNumber: (value: number) => value.toLocaleString('en-US') };
describe('product overview price summary', () => {
  it('formats the single product price and currency', () => {
    expect(getOverviewPrice(defaults)).toEqual({ value: '1,980 JPY', note: undefined });
  });
  it.each(['', '0', '-1', 'not a price', 'Infinity'])('does not invent a price for %j', basePrice => {
    expect(getOverviewPrice({ ...defaults, basePrice }).value).toBe('Not configured');
  });
  it('shows the range of selected variants, not the parent or unselected prices', () => {
    expect(getOverviewPrice({ ...defaults, hasVariants: true, variants: [
      { price: '4200', selected: true }, { price: '6300', selected: true }, { price: '90000', selected: false },
    ] })).toEqual({ value: '4,200–6,300 JPY', note: undefined });
  });
  it('shows one amount when every configured variant has the same price, noting missing prices', () => {
    expect(getOverviewPrice({ ...defaults, hasVariants: true, variants: [
      { price: '4200', selected: true }, { price: '', selected: true }, { price: '4200', selected: true },
    ] })).toEqual({ value: '4,200 JPY', note: '1 of 3 variant prices missing' });
  });
  it('distinguishes no selected variants from selected variants without prices', () => {
    expect(getOverviewPrice({ ...defaults, hasVariants: true })).toEqual({ value: 'Not configured', note: 'No variant SKUs selected' });
    expect(getOverviewPrice({ ...defaults, hasVariants: true, variants: [{ price: '', selected: true }] })).toEqual({ value: 'Not configured', note: '1 of 1 variant prices missing' });
  });
});
