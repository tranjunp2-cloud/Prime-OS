// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getCatalogImportItems } from './catalog-import-store';
import { getProducts } from './product-store';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { createEmptyListingCatalog } from './listing-intake-catalog';
import { confirmListingIntake, pendingMappingReviews, snapshotListingMatch, snapshotListingSource } from './product-listing-intake';
import { completionFields } from './listing-master-completion';
import { convertField, fieldMappingErrors, initialFieldMappings, importedFieldCandidates, mappingDecision, MASTER_MAPPING_TARGETS, writeMappedField } from './listing-field-mapping';

const target = (key: string) => MASTER_MAPPING_TARGETS.find(field => field.key === key)!;
function fixture() {
  const source = { ...getCatalogImportItems({ requireConfirmation: true }).find(item => item.variants === 1)!, id: 'field-source', listingId: 'field-listing', title: 'Original listing title', description: readyMasterFields().description, modelNumber: 'Wrong model', mpn: 'ACTUAL-MODEL', variantItems: undefined, confirmed: false, resolution: 'later' as const,
    mappingFields: [{ key: 'package_mass', label: 'Package mass', value: 0.3, kind: 'weight' as const, unit: 'kg' }] };
  const master = { ...getProducts()[0], ...readyMasterFields(), id: 'field-master', name: 'Existing Master', has_variants: false, product_type: 'single' as const, status: 'published' as const, sku_code: 'FIELD-MASTER', skus: [], channels: [], import_result: undefined, import_issues: [], field_mappings: undefined, inventory: { wh_crjp: 42 } };
  return { source, master };
}
describe('Review field mapping', () => {
  it('records the chosen source, original value and conversion without changing imported data', () => {
    const { source, master } = fixture();
    const original = structuredClone(source);
    const field = importedFieldCandidates([source]).find(field => field.key === 'provider:package_mass')!;
    const result = convertField(field, target('pkg_weight'), 'JPY');
    expect(result).toEqual({ value: 300, transform: '0.3 kg → 300 g' });
    const next = writeMappedField(master, target('pkg_weight'), result.value, mappingDecision(field, result.value, 'source', result.transform));
    expect(next.pkg_weight).toBe(300);
    expect(next.field_mappings?.pkg_weight.source).toMatchObject({ fieldKey: 'provider:package_mass', rawValue: 0.3, unit: 'kg', listingId: source.listingId });
    expect(source).toEqual(original);
    expect(next.inventory).toEqual(master.inventory);
    expect(convertField(field, target('name'), 'JPY').error).toContain('text field');
  });
  it('requires explicit taxonomy/value conversion and prevents unreviewed currency conversion', () => {
    const { source } = fixture();
    const fields = importedFieldCandidates([{ ...source, price: 10, currency: 'USD' }]);
    expect(convertField(fields.find(field => field.key === 'channelCategory')!, target('categoryId'), 'JPY').error).toContain('taxonomies');
    expect(convertField(fields.find(field => field.key === 'price')!, target('retail_price'), 'JPY').error).toContain('No automatic currency conversion');
    expect(convertField(fields.find(field => field.key === 'title')!, { key: 'attribute:material', label: 'Material', kind: 'text', options: [{ value: 'Paper', label: 'Paper' }] }, 'JPY').error).toContain('allowed Master value');
  });
  it('never claims an unchanged existing value came from an equal listing value', () => {
    const { source, master } = fixture();
    expect(master.field_mappings).toBeUndefined();
    expect(initialFieldMappings({ ...master, name: source.title }, source).name.source?.fieldKey).toBe('title');
  });
  it('maps multi-select values only when every option is allowed', () => {
    const { source } = fixture();
    const field = importedFieldCandidates([source]).find(field => field.key === 'title')!;
    const multiTarget = { key: 'attribute:material', label: 'Material', kind: 'text' as const, multiple: true, options: [{ value: 'Paper', label: 'Paper' }, { value: 'Cotton', label: 'Cotton' }] };
    expect(convertField({ ...field, value: 'paper, cotton' }, multiTarget, 'JPY').value).toBe('Paper, Cotton');
    expect(convertField({ ...field, value: 'Paper, Unknown' }, multiTarget, 'JPY').error).toContain('allowed Master value');
  });
  it('rejects stale selected source data before committing a new mapped value', () => {
    const { source, master } = fixture();
    const field = importedFieldCandidates([source]).find(field => field.key === 'mpn')!;
    const mapped = writeMappedField(master, target('model_number'), field.value, mappingDecision(field, field.value, 'source'));
    expect(fieldMappingErrors(mapped, [{ ...source, mpn: 'Changed MPN' }], master).join(' ')).toContain('Source for Manufacturer part number changed');
    const manual = writeMappedField(mapped, target('model_number'), 'Seller checked', { ...mapped.field_mappings!.model_number, mode: 'manual', value: 'Seller checked' });
    expect(fieldMappingErrors(manual, [{ ...source, mpn: 'Changed MPN' }], master)).toEqual([]);
  });
  it('persists proposed field changes in a deferred existing link and applies only on explicit completion', () => {
    const { source, master } = fixture();
    const catalog = createEmptyListingCatalog([source]); catalog.add(master);
    const item = catalog.listings()[0];
    const field = importedFieldCandidates([item]).find(field => field.key === 'mpn')!;
    const proposal = writeMappedField(master, target('model_number'), field.value, mappingDecision(field, field.value, 'source'));
    confirmListingIntake([item.id], { productId: master.id, defer: true, completion: completionFields(proposal), reviewed: [snapshotListingMatch(item, master)] }, catalog);
    const saved = catalog.products()[0];
    expect(saved.model_number).toBe(master.model_number);
    expect(saved.channels[0].review_pending?.master_draft?.field_mappings?.model_number.source?.fieldKey).toBe('mpn');
    const review = pendingMappingReviews(catalog.products(), catalog.listings())[0];
    expect(review.mappingFields).toEqual(source.mappingFields);
    confirmListingIntake([review.id], { productId: master.id, completion: completionFields(proposal), reviewed: [snapshotListingMatch(review, saved)] }, catalog);
    expect(catalog.products()[0].model_number).toBe('ACTUAL-MODEL');
    expect(catalog.products()[0].field_mappings?.model_number.source?.rawValue).toBe('ACTUAL-MODEL');
    expect(catalog.products()[0].inventory).toEqual(master.inventory);
    expect(catalog.products()[0].channels[0].shop_snapshot?.identifiers?.model).toBe('Wrong model');
  });
  it('keeps provenance and provider fields when creating a Draft and recovering without the import queue', () => {
    const { source, master } = fixture();
    const catalog = createEmptyListingCatalog([source]); const item = catalog.listings()[0];
    const field = importedFieldCandidates([item]).find(field => field.key === 'provider:package_mass')!;
    const proposal = writeMappedField(master, target('pkg_weight'), 300, mappingDecision(field, 300, 'source', '0.3 kg → 300 g'));
    confirmListingIntake([item.id], { name: item.title, sku: 'FIELD-DRAFT', sourceId: item.id, defer: true, completion: completionFields(proposal), reviewedSources: [snapshotListingSource(item)] }, catalog);
    catalog.saveListings([]);
    const review = pendingMappingReviews(catalog.products(), [])[0];
    expect(review.mappingFields).toEqual(source.mappingFields);
    expect(catalog.products()[0].field_mappings?.pkg_weight.transform).toBe('0.3 kg → 300 g');
    expect(catalog.products()[0].channels[0].master_data_sync).toBeUndefined();
  });
});
