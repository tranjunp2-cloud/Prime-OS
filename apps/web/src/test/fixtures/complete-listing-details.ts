import { fireEvent, screen } from '@testing-library/react';
import { readyMasterFields } from './listing-master';
import { getProductCatalogSettings } from '@/lib/product-catalog-settings-store';

export function loadMasterImages() {
  screen.getAllByRole('img', { name: /^Master image / }).forEach(image => fireEvent.load(image));
}
/** Enter required values via visible form controls, never bypass the production validation. */
export function completeListingDetails() {
  const fields = readyMasterFields();
  const category = screen.queryByLabelText('Master category *');
  if (category) fireEvent.change(category, { target: { value: fields.categoryId } });
  const description = screen.queryByLabelText('Product description *');
  if (description) fireEvent.change(description, { target: { value: fields.description } });
  for (const label of ['Base price', 'Package length (cm)', 'Package width (cm)', 'Package height (cm)', 'Package weight (g)']) {
    const input = screen.queryByLabelText(label + ' *');
    if (input) fireEvent.change(input, { target: { value: '123' } });
  }
  for (const attribute of getProductCatalogSettings().attributes) {
    const input = screen.queryByLabelText(attribute.name + ' *');
    if (input) fireEvent.change(input, { target: { value: attribute.options.split(',')[0]?.trim() || 'Verified value' } });
  }
  loadMasterImages();
}
