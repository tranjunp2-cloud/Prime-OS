// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductOverviewSnapshot } from './ProductOverviewSnapshot';

afterEach(cleanup);
const props: React.ComponentProps<typeof ProductOverviewSnapshot> = {
  name: 'Precision brush set', images: ['/main.jpg', '/side.jpg', '/pack.jpg'], imageAltTexts: ['Brushes in a case', 'Brush tips', 'Packaging'],
  brand: 'Da Vinci', category: 'Art Supplies', productStructure: '4 variants', stock: '12', price: '4,900 JPY', listingCount: 5, channelCount: 3,
  imported: true, source: 'Amazon · Prime Beauty US', translations: [{ locale: 'ja-JP', label: '日本語', status: 'complete' }, { locale: 'vi-VN', label: 'Tiếng Việt', status: 'partial' }, { locale: 'th-TH', label: 'ไทย', status: 'missing' }],
  onCommerce: vi.fn(), onListings: vi.fn(), onProductData: vi.fn(), onSelectLocale: vi.fn(),
};
function mount(overrides: Partial<typeof props> = {}) { return render(<ProductOverviewSnapshot {...props} {...overrides} />); }

describe('ProductOverviewSnapshot', () => {
  it('keeps the product image, identity, operational metrics and supporting context visible', () => {
    mount();
    expect(screen.getByRole('heading', { level: 2, name: props.name })).toBeVisible();
    expect(screen.getByRole('region', { name: props.name })).toBeVisible();
    expect(screen.queryByText('Product overview')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Brushes in a case' })).toBeVisible();
    expect(screen.getByText('3 images')).toBeVisible();
    expect(screen.getByText('Da Vinci · Art Supplies')).toBeVisible();
    expect(screen.getByText('4 variants')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View Master stock' })).toHaveTextContent('12 units');
    expect(screen.getByRole('button', { name: 'View base price' })).toHaveTextContent('4,900 JPY');
    expect(screen.getByRole('button', { name: 'View linked listings' })).toHaveTextContent('5 · 3 channels');
    expect(screen.getByRole('button', { name: 'Translations: 1 of 3 complete' })).toBeVisible();
    expect(screen.getByText('Source: Amazon · Prime Beauty US')).toBeVisible();
  });
  it('updates the heading with the current product name and handles unnamed drafts', () => {
    const { rerender } = mount();
    const name = 'Traditional Japanese Precision Tailoring Set';
    rerender(<ProductOverviewSnapshot {...props} name={name} />);
    expect(screen.getByRole('heading', { level: 2, name })).toBeVisible();
    expect(screen.queryByRole('heading', { name: props.name })).not.toBeInTheDocument();
    rerender(<ProductOverviewSnapshot {...props} name="   " />);
    expect(screen.getByRole('heading', { level: 2, name: 'Untitled Product Master' })).toBeVisible();
  });
  it('supports click and keyboard image navigation and restores focus without modifying media', async () => {
    const before = JSON.stringify(props.images);
    mount();
    const trigger = screen.getByRole('button', { name: 'View product images (3)' });
    trigger.focus();
    fireEvent.click(trigger);
    const gallery = screen.getByRole('dialog', { name: 'Product images' });
    const view = within(gallery);
    expect(view.getByRole('button', { name: 'Previous image' })).toBeDisabled();
    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(view.getByRole('img', { name: 'Brush tips' })).toHaveAttribute('src', '/side.jpg');
    expect(view.getByText('Image 2 of 3')).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Show image 3' }));
    expect(view.getByRole('button', { name: 'Next image' })).toBeDisabled();
    fireEvent.keyDown(gallery, { key: 'ArrowLeft' });
    expect(view.getByRole('button', { name: 'Show image 2' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(gallery, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(JSON.stringify(props.images)).toBe(before);
  });
  it('handles a single image with no unnecessary thumbnails or enabled next action', () => {
    mount({ images: ['/main.jpg'] });
    fireEvent.click(screen.getByRole('button', { name: 'View product images (1)' }));
    const gallery = within(screen.getByRole('dialog', { name: 'Product images' }));
    expect(gallery.getByRole('button', { name: 'Next image' })).toBeDisabled();
    expect(gallery.getByRole('button', { name: 'Previous image' })).toBeDisabled();
    expect(gallery.queryByRole('group', { name: 'Image thumbnails' })).not.toBeInTheDocument();
  });
  it('does not turn blank image slots into gallery items or fabricate empty metadata', () => {
    const onProductData = vi.fn();
    mount({ images: [' ', ''], brand: '', category: '', source: '', translations: [], onProductData });
    expect(screen.getByText('No images')).toBeVisible();
    expect(screen.queryByRole('button', { name: /View product images/ })).not.toBeInTheDocument();
    expect(screen.getByText('Brand not set · Category not set')).toBeVisible();
    expect(screen.getByText('Source: Not recorded')).toBeVisible();
    expect(screen.getByText('Primary language only')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'View product media — no images' }));
    expect(onProductData).toHaveBeenCalledOnce();
  });
  it('shows a fallback for a failed image without removing it from product data', () => {
    mount();
    fireEvent.error(screen.getByRole('img', { name: 'Brushes in a case' }));
    expect(screen.getByRole('img', { name: /Brushes in a case — image unavailable/ })).toBeVisible();
    expect(screen.getByText('3 images')).toBeVisible();
  });
  it('exposes accurate language status and opens only the language the user selects', () => {
    const onSelectLocale = vi.fn();
    mount({ onSelectLocale });
    fireEvent.click(screen.getByRole('button', { name: 'Translations: 1 of 3 complete' }));
    const translation = within(screen.getByRole('dialog', { name: 'Translation progress' }));
    expect(translation.getByText(/Optional for Master activation/)).toBeVisible();
    fireEvent.click(translation.getByRole('button', { name: 'Tiếng Việt partial' }));
    expect(onSelectLocale).toHaveBeenCalledWith('vi-VN');
  });
  it('keeps the source explanation and any outstanding review path available', () => {
    const onReviewImportedLinks = vi.fn();
    mount({ onReviewImportedLinks });
    fireEvent.click(screen.getByRole('button', { name: 'Product source' }));
    const source = within(screen.getByRole('dialog', { name: 'Product source' }));
    expect(source.getByText('Source: Amazon · Prime Beauty US')).toBeVisible();
    fireEvent.click(source.getByRole('button', { name: 'Review shop links in inbox' }));
    expect(onReviewImportedLinks).toHaveBeenCalledOnce();
  });
});
