import { fireEvent, screen, within } from '@testing-library/react';
import { readyMasterFields } from './listing-master';
import { getProductCatalogSettings } from '@/lib/product-catalog-settings-store';

export function loadMasterImages() {
  // Eager images stay mounted and load even when their review group is collapsed.
  screen.queryAllByAltText(/^Master image /).forEach(image => fireEvent.load(image));
}
export function applyListingSection() {
  const apply = screen.queryByRole('button', { name: 'Apply changes' }) ?? screen.queryByRole('button', { name: 'Apply to review' });
  if (apply) fireEvent.click(apply);
}
export function editListingSection(title: string) {
  const field = ({ 'Product essentials': 'Title', 'Variants, pricing & SKU mapping': 'Product structure', 'Pricing': 'Price', 'Description & images': 'Description' } as Record<string, string>)[title];
  const edit = screen.queryByRole('button', { name: `Edit ${title}` }) ?? (field ? screen.queryByRole('button', { name: `Edit Master ${field}` }) : null) ?? (title === 'Pricing' ? screen.queryByRole('button', { name: /^Edit Master price for/ }) : null);
  if (!edit) return;
  applyListingSection();
  fireEvent.click(edit);
}
/** Confirm the impact preview explicitly, just as a seller does. */
export function confirmListingSave(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  const summary = screen.queryByRole('dialog', { name: 'Review before saving' });
  if (summary) fireEvent.click(within(summary).getByRole('button', { name: label }));
}
export function chooseListingGroup(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}
/** Enter required values via visible form controls, never bypass the production validation. */
export function completeListingDetails() {
  if (screen.queryByRole('heading', { name: 'Review data for the new Master' })) {
    applyListingSection();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Master Description' }));
    const description = screen.getByLabelText('Product description *') as HTMLTextAreaElement;
    if (!description.value.trim()) fireEvent.change(description, { target: { value: readyMasterFields().description } });
    applyListingSection();
    return;
  }
  if (screen.queryByRole('button', { name: 'Edit Product essentials' }) || screen.queryByRole('button', { name: 'Apply changes' })) {
    applyListingSection();
    const fields = readyMasterFields();
    editListingSection('Product essentials');
    const category = screen.getByLabelText('Master category') as HTMLSelectElement;
    if (!category.value) fireEvent.change(category, { target: { value: fields.categoryId } });
    applyListingSection();
    editListingSection('Pricing');
    const price = screen.queryByRole('spinbutton', { name: 'Base price *' }) as HTMLInputElement | null;
    if (price && !(Number(price.value) > 0)) fireEvent.change(price, { target: { value: '123' } });
    applyListingSection();
    editListingSection('Category attributes');
    for (const attribute of getProductCatalogSettings().attributes) {
      const input = screen.queryByLabelText(attribute.name) as HTMLInputElement | null;
      if (input && !input.value) fireEvent.change(input, { target: { value: attribute.options.split(',')[0]?.trim() || 'Verified value' } });
    }
    applyListingSection();
    editListingSection('Description & images');
    const description = screen.getByLabelText('Product description *') as HTMLTextAreaElement;
    if (description.value.trim().length < 100) fireEvent.change(description, { target: { value: fields.description } });
    loadMasterImages();
    applyListingSection();
    editListingSection('Shipping package');
    for (const label of ['Package length (cm)', 'Package width (cm)', 'Package height (cm)', 'Package weight (g)']) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      if (!(Number(input.value) > 0)) fireEvent.change(input, { target: { value: '123' } });
    }
    applyListingSection();
    return;
  }
  const expand = screen.queryByRole('button', { name: 'Expand all sections' });
  if (expand) fireEvent.click(expand);
  const fields = readyMasterFields();
  const category = screen.queryByLabelText('Master category');
  if (category && !(category as HTMLSelectElement).value) fireEvent.change(category, { target: { value: fields.categoryId } });
  const description = screen.queryByLabelText('Product description *');
  if (description && (description as HTMLTextAreaElement).value.trim().length < 100) fireEvent.change(description, { target: { value: fields.description } });
  for (const label of ['Base price', 'Package length (cm)', 'Package width (cm)', 'Package height (cm)', 'Package weight (g)']) {
    const input = screen.queryByLabelText(label + ' *');
    if (input && !(Number((input as HTMLInputElement).value) > 0)) fireEvent.change(input, { target: { value: '123' } });
  }
  for (const attribute of getProductCatalogSettings().attributes) {
    const input = screen.queryByLabelText(attribute.name);
    if (input && !(input as HTMLInputElement).value) fireEvent.change(input, { target: { value: attribute.options.split(',')[0]?.trim() || 'Verified value' } });
  }
  loadMasterImages();
}
