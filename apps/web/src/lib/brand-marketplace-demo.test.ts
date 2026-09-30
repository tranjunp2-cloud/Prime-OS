import { describe, expect, it } from 'vitest';
import { defaultCatalogBrands } from './product-catalog-settings-store';
import { clearBrandMapping, getBrandMappingPresentation, rakutenBrandSuggestion, searchDemoBrands, selectDemoBrand } from './brand-marketplace-demo';

const brand = defaultCatalogBrands.find(item => item.id === 'cyber-records')!;

describe('marketplace brand demo', () => {
  it('presents unknown saved IDs and empty catalog mappings as the same selection task', () => {
    expect(getBrandMappingPresentation(brand, 'lazada')).toMatchObject({ value: 'BR-20418', state: 'lookup', needsBrandSelection: true, label: 'Select brand' });
    expect(getBrandMappingPresentation(brand, 'tiktok')).toMatchObject({ value: '', state: 'unmapped', needsBrandSelection: true, label: 'Select brand' });
    expect(getBrandMappingPresentation(brand, 'shopee')).toMatchObject({ needsBrandSelection: false, label: 'Brand selected' });
    expect(getBrandMappingPresentation(brand, 'amazon')).toMatchObject({ needsBrandSelection: false, label: 'Approval required' });
  });

  it('suggests the original Rakuten brand without creating a mapping or approval', () => {
    expect(getBrandMappingPresentation(brand, 'rakuten')).toMatchObject({ name: 'CYBER-RECORDS', value: '', state: 'unchecked', label: 'Not checked' });
    expect(brand.mappings.rakuten).toBeUndefined();
    expect(rakutenBrandSuggestion(undefined, ' Product Brand ')).toBe('Product Brand');
    expect(rakutenBrandSuggestion({ ...brand, name: 'Renamed brand' })).toBe('Renamed brand');
  });

  it('preserves custom Rakuten names, falls back for blank overrides, and never approves them', () => {
    const custom = { ...brand, mappings: { ...brand.mappings, rakuten: ' サイバーレコード ' } };
    expect(rakutenBrandSuggestion(custom)).toBe('サイバーレコード');
    expect(getBrandMappingPresentation(custom, 'rakuten')).toMatchObject({ name: 'サイバーレコード', state: 'unchecked' });
    expect(rakutenBrandSuggestion({ ...brand, mappings: { rakuten: '  ' } })).toBe(brand.name);
    expect(rakutenBrandSuggestion(clearBrandMapping(custom, 'rakuten'))).toBe(brand.name);
  });

  it('separates a catalog selection from marketplace permission', () => {
    expect(getBrandMappingPresentation(brand, 'amazon').state).toBe('approval_required');
    expect(getBrandMappingPresentation(brand, 'shopee')).toMatchObject({ name: 'CYBER RECORDS', state: 'selected' });
    expect(getBrandMappingPresentation(brand, 'lazada')).toMatchObject({ value: 'BR-20418', state: 'lookup' });
    expect(brand.status).toBe('Active');
  });

  it('never treats arbitrary IDs, names or another brand as an approved match', () => {
    expect(getBrandMappingPresentation({ ...brand, mappings: { shopee: 'anything' } }, 'shopee').state).toBe('lookup');
    expect(getBrandMappingPresentation({ ...brand, mappings: { amazon: 'Edited name' } }, 'amazon').state).toBe('unchecked');
    expect(getBrandMappingPresentation({ ...brand, id: 'another-brand' }, 'shopee').state).toBe('lookup');
    expect(getBrandMappingPresentation({ ...brand, mappings: { shopee: '0' } }, 'shopee').value).toBe('0');
  });

  it('searches actual sample records, including a real empty-result state', () => {
    expect(searchDemoBrands('lazada', 'CYBER-RECORDS')).toEqual([{ value: '20418', name: 'CYBER RECORDS' }]);
    expect(searchDemoBrands('tiktok', 'CYBER RECORDS')).toEqual([]);
    expect(searchDemoBrands('shopee', 'Invented brand')).toEqual([]);
  });

  it('stores a name and scope with the selection without changing internal availability', () => {
    const selected = selectDemoBrand(brand, 'lazada', searchDemoBrands('lazada', 'cyber')[0]);
    expect(selected.mappings.lazada).toBe('20418');
    expect(selected.mappingSelections?.lazada).toMatchObject({ value: '20418', name: 'CYBER RECORDS', source: 'demo-catalog', scopeKey: 'demo:lazada:my:prime-flagship' });
    expect(selected.status).toBe('Active');
    expect(selected.mappings.amazon).toBe(brand.mappings.amazon);
    expect(brand.mappings.lazada).toBe('BR-20418');
    expect(getBrandMappingPresentation(selected, 'lazada').state).toBe('selected');
    expect(getBrandMappingPresentation({ ...selected, mappings: { ...selected.mappings, lazada: '999' } }, 'lazada').state).toBe('lookup');
    expect(getBrandMappingPresentation({ ...selected, mappingSelections: { lazada: { ...selected.mappingSelections!.lazada!, scopeKey: 'other-shop' } } }, 'lazada').state).toBe('lookup');
  });

  it('clears only the requested mapping and never changes a listing', () => {
    const selected = selectDemoBrand(brand, 'lazada', searchDemoBrands('lazada', 'cyber')[0]);
    const cleared = clearBrandMapping(selected, 'lazada');
    expect(cleared.mappings.lazada).toBeUndefined();
    expect(cleared.mappingSelections?.lazada).toBeUndefined();
    expect(cleared.mappings.amazon).toBe(brand.mappings.amazon);
    expect(cleared.status).toBe('Active');
  });
});
