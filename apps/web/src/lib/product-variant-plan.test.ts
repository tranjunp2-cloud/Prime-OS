import { describe, expect, it } from 'vitest';
import { automaticVariantGroups, planVariants, singleSkuForConversion, supportsVariantAttribute, variantArchiveBlock, variantCombinations } from './product-variant-plan';
import type { VariantGroup, VariantItem } from './product-master-readiness';
import { getProducts, type Product } from './product-store';

const color: VariantGroup = { id: 'color', attributeKey: 'color', name: 'Color', values: ['White', 'Black'] };
const size: VariantGroup = { id: 'size', attributeKey: 'size', name: 'Size', values: ['A4', 'A5'] };
const white: VariantItem = { id: 'sku-white', key: 'White', sku_code: 'OLD-WHITE', price: '42', stock: '7', stock_by_location: { wh: '7' }, image_url: '/white.jpg', selected: true, option_values: { color: 'White' } };
const plan = (overrides: Partial<Parameters<typeof planVariants>[0]> = {}) => planVariants({ groups: [color], previousGroups: [color], items: [white], parentSku: 'NOTE', basePrice: '30', ...overrides });

describe('explicit variant setup', () => {
  it('initializes at most two product attributes using only chosen values', () => {
    const groups = automaticVariantGroups([
      { key: 'material', name: 'Material', currentValues: [' Paper ', 'Paper', ''] },
      { key: 'color', name: 'Color', currentValues: ['White', 'Black'] },
      { key: 'size', name: 'Size', currentValues: ['S', 'M'] },
    ]);
    expect(groups.map(group => [group.attributeKey, group.values])).toEqual([['material', ['Paper']], ['color', ['White', 'Black']]]);
    expect(variantCombinations(groups).rows.map(row => row.key)).toEqual(['Paper / White', 'Paper / Black']);
  });
  it('does not invent values or make free text, measurements and numbers variant axes', () => {
    expect(automaticVariantGroups([])).toEqual([]);
    expect(variantCombinations(automaticVariantGroups([{ key: 'color', name: 'Color', currentValues: [] }])).rows).toEqual([]);
    for (const type of ['Text', 'Number', 'Rich text', 'Measurement set', 'Country selector']) expect(supportsVariantAttribute({ type })).toBe(false);
    for (const type of ['Single select', 'Multi-select', 'Enum', 'Array']) expect(supportsVariantAttribute({ type })).toBe(true);
  });
  it('does not create SKUs without explicitly selected axes', () => {
    expect(variantCombinations([]).rows).toEqual([]);
    expect(variantCombinations([{ ...color, values: [] }]).rows).toEqual([]);
  });
  it('supports a sparse matrix and does not copy stock to new SKUs', () => {
    const result = plan({ groups: [color, size], excluded: ['Black / A5'], assignments: { 'sku-white': 'White / A4' } });
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ ...white, key: 'White / A4', option_values: { color: 'White', size: 'A4' } });
    expect(result.items[1]).toMatchObject({ stock: '', stock_by_location: {} });
    expect(result.unresolved).toEqual([]);
  });
  it('retains identity when an axis display name or ordering changes', () => {
    const item = { ...white, key: 'White / A4', option_values: { color: 'White', size: 'A4' } };
    const result = plan({ items: [item], previousGroups: [color, size], groups: [size, { ...color, name: 'Màu sắc' }] });
    expect(result.items.find(next => next.id === white.id)).toMatchObject({ sku_code: 'OLD-WHITE', price: '42', key: 'A4 / White', stock_by_location: { wh: '7' } });
  });
  it('requires explicit mapping instead of losing an old SKU when values change', () => {
    expect(plan({ groups: [{ ...color, values: ['Ivory'] }] }).unresolved).toEqual([white]);
    const result = plan({ groups: [{ ...color, values: ['Ivory'] }], assignments: { 'sku-white': 'Ivory' } });
    expect(result.items[0]).toMatchObject({ id: white.id, key: 'Ivory', image_url: '/white.jpg', stock: '7' });
  });
  it('archives explicitly without deleting identity or historical data', () => {
    const result = plan({ groups: [{ ...color, values: ['Black'] }], assignments: { 'sku-white': '__archive' } });
    expect(result.items.find(item => item.id === white.id)).toEqual({ ...white, selected: false });
    expect(result.newlyArchived).toHaveLength(1);
    expect(variantArchiveBlock(white)).toContain('recorded stock');
  });
  it('detects assigning two old SKUs to one combination', () => {
    const result = plan({ items: [white, { ...white, id: 'second', key: 'Black', option_values: { color: 'Black' } }], assignments: { 'sku-white': 'White', second: 'White' } });
    expect(result.duplicateAssignments).toBe(true);
  });
  it('limits Cartesian expansion before allocating rows', () => {
    expect(variantCombinations([color, { ...size, values: Array.from({ length: 101 }, (_, index) => String(index)) }])).toEqual({ count: 202, rows: [] });
  });
  it('keeps a single SKU identity and warehouse counts for explicit conversion mapping', () => {
    const product: Product = { ...getProducts()[0], id: 'p', sku_code: 'NOTE', skus: [{ id: 'sku-1', sku_code: 'NOTE', variation_name: 'Default', weight_g: 0, units_per_carton: 1, status: 'active' }], retail_price: 25, inventory: { wh: 0 }, images: ['/cover.jpg'] };
    expect(singleSkuForConversion(product)).toMatchObject({ id: 'sku-1', sku_code: 'NOTE', stock_by_location: { wh: '0' }, option_values: {} });
  });
});
