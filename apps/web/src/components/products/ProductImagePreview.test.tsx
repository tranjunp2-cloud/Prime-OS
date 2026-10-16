// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductImagePreview } from './ProductImagePreview';

afterEach(cleanup);
const props = { name: 'Precision brush set', images: ['/main.jpg', '/side.jpg', '/pack.jpg'], imageAltTexts: ['Brushes in a case', 'Brush tips', 'Packaging'], onProductData: vi.fn() };
function mount(overrides: Partial<React.ComponentProps<typeof ProductImagePreview>> = {}) { return render(<ProductImagePreview {...props} {...overrides} />); }
describe('ProductImagePreview in the product header and overview', () => {
  it('shows one static header image with no click action, zoom affordance or focus target', () => {
    const onProductData = vi.fn();
    mount({ onProductData });
    const thumbnail = screen.getByTestId('product-header-image');
    const image = screen.getByRole('img', { name: 'Brushes in a case' });
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(image).toHaveAttribute('src', '/main.jpg');
    expect(image.closest('button, a, [tabindex]')).toBeNull();
    expect(thumbnail.querySelector('.lucide-zoom-in')).toBeNull();
    expect(thumbnail.textContent).toBe('');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    fireEvent.click(image);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onProductData).not.toHaveBeenCalled();
  });
  it('supports click and keyboard image navigation and restores focus without modifying media', async () => {
    const before = JSON.stringify(props.images);
    mount({ variant: 'overview' });
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
    mount({ variant: 'overview', images: ['/main.jpg'] });
    fireEvent.click(screen.getByRole('button', { name: 'View product images (1)' }));
    const gallery = within(screen.getByRole('dialog', { name: 'Product images' }));
    expect(gallery.getByRole('button', { name: 'Next image' })).toBeDisabled();
    expect(gallery.getByRole('button', { name: 'Previous image' })).toBeDisabled();
    expect(gallery.queryByRole('group', { name: 'Image thumbnails' })).not.toBeInTheDocument();
  });
  it('shows a fallback for a failed image without removing it from product data', () => {
    mount();
    fireEvent.error(screen.getByRole('img', { name: 'Brushes in a case' }));
    expect(screen.getByRole('img', { name: /Brushes in a case — image unavailable/ })).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('product-header-image')).not.toHaveAttribute('tabindex');
  });
  it('keeps the empty header image non-interactive too', () => {
    const onProductData = vi.fn();
    mount({ images: [], onProductData });
    fireEvent.click(screen.getByRole('img', { name: 'Precision brush set — no image' }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onProductData).not.toHaveBeenCalled();
  });
  it('opens product data for blank media without fabricating gallery images', () => {
    mount({ variant: 'overview', images: [' ', ''] });
    expect(screen.queryByRole('button', { name: /View product images/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View product media — no images' }));
    expect(props.onProductData).toHaveBeenCalledOnce();
  });
  it('provides a larger labeled overview preview that opens the complete gallery', () => {
    mount({ variant: 'overview' });
    const trigger = screen.getByRole('button', { name: 'View product images (3)' });
    expect(trigger).toHaveTextContent('View 3 images');
    expect(within(trigger).getAllByRole('img')).toHaveLength(1);
    fireEvent.click(trigger);
    expect(screen.getByRole('group', { name: 'Image thumbnails' })).toBeVisible();
    expect(screen.getByText('Image 1 of 3 · Main image')).toBeVisible();
  });
  it('labels unavailable overview images while retaining gallery access', () => {
    mount({ variant: 'overview' });
    fireEvent.error(screen.getByRole('img', { name: 'Brushes in a case' }));
    expect(screen.getByText('Image unavailable')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View product images (3)' })).toHaveTextContent('View 3 images');
  });
  it('shows a clear empty state in the overview', () => {
    mount({ variant: 'overview', images: [] });
    expect(screen.getByText('No images')).toBeVisible();
    expect(screen.getByText('View media')).toBeVisible();
  });
});
