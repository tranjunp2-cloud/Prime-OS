// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getProducts, type Product } from '@/lib/product-store';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { MASTER_MAPPING_TARGETS } from '@/lib/listing-field-mapping';
import { ListingFieldMappingRow } from './ListingFieldMappingRow';
afterEach(cleanup);
const source = { ...getCatalogImportItems({ requireConfirmation: true })[0], title: 'Shop title', modelNumber: 'Misclassified', mpn: 'Correct model', mappingFields: [{ key: 'mass', label: 'Parcel mass', value: 0.3, kind: 'weight' as const, unit: 'kg' }] };
function Harness({ field = 'model_number' }: { field?: string }) {
  const [baseline] = useState({ ...getProducts()[0], model_number: 'Original Master model', field_mappings: undefined });
  const [product, setProduct] = useState<Product>(baseline);
  return <><ListingFieldMappingRow product={product} baseline={baseline} sources={[source]} target={MASTER_MAPPING_TARGETS.find(target => target.key === field)!} onChange={setProduct} /><output data-testid="product">{JSON.stringify(product.field_mappings)}</output></>;
}
describe('Editable field mapping row', () => {
  it('keeps a legacy Master brand name when restoring a value without a catalog ID', () => {
    function LegacyBrandHarness() {
      const [baseline] = useState<Product>({ ...getProducts()[0], brand: 'Legacy brand', brandId: undefined, field_mappings: undefined });
      const [product, setProduct] = useState<Product>(baseline);
      return <><ListingFieldMappingRow product={product} baseline={baseline} sources={[source]} target={{ key: 'brandId', label: 'Brand', kind: 'text', options: [{ value: 'replacement', label: 'Replacement brand' }] }} onChange={setProduct} /><output>{product.brand}</output></>;
    }
    render(<LegacyBrandHarness />);
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'replacement' } });
    fireEvent.click(screen.getByRole('button', { name: 'Keep current Master value' }));
    expect(screen.getByRole('status')).toHaveTextContent('Legacy brand');
    expect(screen.getByRole('option', { name: 'Legacy brand (current)' })).toBeInTheDocument();
  });
  it('changes a source only after applying, supports manual edits, restores source, and keeps the original Master', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Model')).toHaveValue('Original Master model');
    fireEvent.click(screen.getByRole('button', { name: 'Change source for Model' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search source fields' }), { target: { value: 'Correct model' } });
    fireEvent.click(screen.getByRole('radio'));
    expect(screen.getByLabelText('Model')).toHaveValue('Original Master model');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('product')).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole('button', { name: 'Change source for Model' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search source fields' }), { target: { value: 'Correct model' } });
    fireEvent.click(screen.getByRole('radio')); fireEvent.click(screen.getByRole('button', { name: 'Use this source' }));
    expect(screen.getByLabelText('Model')).toHaveValue('Correct model');
    expect(screen.getByTestId('product')).toHaveTextContent('"fieldKey":"mpn"');
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Manual correction' } });
    expect(screen.getByText('Edited manually · original source unchanged')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Restore source value' }));
    expect(screen.getByLabelText('Model')).toHaveValue('Correct model');
    fireEvent.click(screen.getByRole('button', { name: 'Keep current Master value' }));
    expect(screen.getByLabelText('Model')).toHaveValue('Original Master model');
    expect(source.mpn).toBe('Correct model');
  });
  it('shows unit conversion and excludes incompatible fields from the source picker', () => {
    render(<Harness field="pkg_weight" />);
    fireEvent.click(screen.getByRole('button', { name: 'Change source for Package weight (g)' }));
    const panel = within(screen.getByRole('region', { name: 'Choose source for Package weight (g)' }));
    expect(panel.queryByText('Listing title')).not.toBeInTheDocument();
    fireEvent.click(panel.getByRole('radio', { name: /Parcel mass/ }));
    expect(panel.getByText('0.3 kg → 300 g')).toBeVisible();
    fireEvent.click(panel.getByRole('button', { name: 'Use this source' }));
    expect(screen.getByLabelText('Package weight (g)')).toHaveValue(300);
    expect(screen.getByTestId('product')).toHaveTextContent('"unit":"kg"');
  });
  it('requires an explicit allowed value for an enum and restores that reviewed value after manual editing', () => {
    function EnumHarness() {
      const [product, setProduct] = useState<Product>({ ...getProducts()[0], specifications: [], field_mappings: undefined });
      return <ListingFieldMappingRow product={product} sources={[{ ...source, mappingFields: [{ key: 'cover', label: 'Cover type', value: 'Hardcover', kind: 'text' }] }]} target={{ key: 'attribute:binding', label: 'Binding', kind: 'text', options: [{ value: 'hard', label: 'Hard cover' }, { value: 'soft', label: 'Soft cover' }] }} onChange={setProduct} />;
    }
    render(<EnumHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Change source for Binding' }));
    fireEvent.click(screen.getByRole('radio', { name: /Cover type/ }));
    expect(screen.getByRole('button', { name: 'Use this source' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Use this Master value'), { target: { value: 'hard' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this source' }));
    expect(screen.getByLabelText('Binding')).toHaveValue('hard');
    expect(screen.getByText('Hardcover → Hard cover')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Binding'), { target: { value: 'soft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore source value' }));
    expect(screen.getByLabelText('Binding')).toHaveValue('hard');
  });
});
