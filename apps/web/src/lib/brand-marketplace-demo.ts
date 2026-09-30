import type { CatalogBrand } from './product-catalog-settings-store';

export type BrandMarketplace = 'amazon' | 'shopee' | 'lazada' | 'tiktok' | 'rakuten';

/** Local demo metadata, never marketplace verification or listing authorization. */
export interface BrandMappingSelection {
  value: string;
  name: string;
  scopeKey: string;
  source: 'demo-catalog';
}

export const brandMarketplaceExamples: Array<{
  channel: BrandMarketplace;
  label: string;
  market: string;
  shop: string;
  scopeKey: string;
  category?: string;
  kind: 'name' | 'catalog' | 'suggested_name';
}> = [
  { channel: 'amazon', label: 'Amazon', market: 'JP', shop: 'Prime Beauty Japan', scopeKey: 'demo:amazon:jp:prime-beauty', kind: 'name' },
  { channel: 'shopee', label: 'Shopee', market: 'VN', shop: 'Prime Beauty Official', scopeKey: 'demo:shopee:vn:prime-beauty:art-supplies', category: 'Art supplies', kind: 'catalog' },
  { channel: 'lazada', label: 'Lazada', market: 'MY', shop: 'Prime Flagship Store', scopeKey: 'demo:lazada:my:prime-flagship', kind: 'catalog' },
  { channel: 'tiktok', label: 'TikTok Shop', market: 'VN', shop: 'Prime Live Store', scopeKey: 'demo:tiktok:vn:prime-live', kind: 'catalog' },
  { channel: 'rakuten', label: 'Rakuten', market: 'JP', shop: 'Prime Beauty JP', scopeKey: 'demo:rakuten:jp:prime-beauty', kind: 'suggested_name' },
];

// Fictional catalog fixtures, not real marketplace brand identifiers.
// Missing TikTok entries deliberately demonstrate the no-result flow.
const sampleCatalog: Partial<Record<BrandMarketplace, Array<{ value: string; name: string }>>> = {
  shopee: [{ value: '1009234', name: 'CYBER RECORDS' }, { value: '1012045', name: 'Kuretake' }],
  lazada: [{ value: '20418', name: 'CYBER RECORDS' }, { value: '20445', name: 'Kuretake' }],
  tiktok: [{ value: '7083874871234567890', name: 'Kuretake' }],
};

export function searchDemoBrands(channel: BrandMarketplace, query: string) {
  const normalized = query.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return (sampleCatalog[channel] ?? []).filter(brand => `${brand.name}${brand.value}`.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').includes(normalized));
}

/** A draft suggestion only. Never a claim that RMS accepts this brand name. */
export function rakutenBrandSuggestion(brand: Pick<CatalogBrand, 'name' | 'mappings'> | undefined, fallback = '') {
  return brand?.mappings.rakuten?.trim() || brand?.name.trim() || fallback.trim();
}

export function getBrandMappingPresentation(brand: CatalogBrand, channel: BrandMarketplace) {
  const value = brand.mappings[channel]?.trim() ?? '';
  const example = brandMarketplaceExamples.find(item => item.channel === channel)!;
  const savedSelection = brand.mappingSelections?.[channel];
  const selection = savedSelection?.value === value && savedSelection.scopeKey === example.scopeKey ? savedSelection : undefined;
  // Only the original CYBER-RECORDS fixture receives illustrative responses.
  // An arbitrary ID, another brand or an edited name must never become approved.
  const originalFixture = brand.id === 'cyber-records' && brand.name === 'CYBER-RECORDS';
  const sampleShopee = originalFixture && channel === 'shopee' && value === '1009234';
  const approvalExample = originalFixture && channel === 'amazon' && value === 'CYBER RECORDS';
  const name = channel === 'rakuten' ? rakutenBrandSuggestion(brand) : selection?.name ?? (sampleShopee ? 'CYBER RECORDS' : example.kind === 'name' ? value : '');
  const state = channel === 'rakuten' ? 'unchecked'
    : !value ? 'unmapped'
      : approvalExample ? 'approval_required'
        : selection || sampleShopee ? 'selected'
          : example.kind === 'name' ? 'unchecked' : 'lookup';
  const labels = { unmapped: 'Not mapped', approval_required: 'Approval required', selected: 'Brand selected', unchecked: 'Not checked', lookup: 'Needs lookup' };
  // Keep legacy/empty data distinct internally, but give sellers one next step.
  const needsBrandSelection = example.kind === 'catalog' && (state === 'unmapped' || state === 'lookup');
  return { value, name, state, needsBrandSelection, label: needsBrandSelection ? 'Select brand' : labels[state] };
}

export function selectDemoBrand(brand: CatalogBrand, channel: BrandMarketplace, option: { value: string; name: string }): CatalogBrand {
  const scopeKey = brandMarketplaceExamples.find(item => item.channel === channel)!.scopeKey;
  return {
    ...brand,
    mappings: { ...brand.mappings, [channel]: option.value },
    mappingSelections: { ...brand.mappingSelections, [channel]: { ...option, scopeKey, source: 'demo-catalog' } },
  };
}

export function clearBrandMapping(brand: CatalogBrand, channel: BrandMarketplace): CatalogBrand {
  const mappings = { ...brand.mappings };
  const mappingSelections = { ...brand.mappingSelections };
  delete mappings[channel];
  delete mappingSelections[channel];
  return { ...brand, mappings, mappingSelections };
}
