interface PriceSummaryInput {
  hasVariants: boolean;
  basePrice: string;
  variants: readonly { price: string; selected: boolean }[];
  currency: string;
  formatNumber: (value: number) => string;
}

/** Summarize the current editor values without substituting a parent price for missing variant prices. */
export function getOverviewPrice({ hasVariants, basePrice, variants, currency, formatNumber }: PriceSummaryInput) {
  const selected = variants.filter(item => item.selected);
  const amounts = (hasVariants ? selected.map(item => item.price) : [basePrice])
    .map(value => Number(value)).filter(value => Number.isFinite(value) && value > 0);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const missing = selected.length - amounts.length;
  return {
    value: amounts.length ? `${formatNumber(min)}${max !== min ? `–${formatNumber(max)}` : ''} ${currency}` : 'Not configured',
    note: hasVariants && selected.length === 0 ? 'No variant SKUs selected'
      : hasVariants && missing > 0 ? `${missing} of ${selected.length} variant prices missing` : undefined,
  };
}
