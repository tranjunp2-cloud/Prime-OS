// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductOverviewSnapshot } from './ProductOverviewSnapshot';

afterEach(cleanup);
const props: React.ComponentProps<typeof ProductOverviewSnapshot> = {
  name: 'Precision brush set', sku: 'BRUSH-12', category: 'Art Supplies', brand: 'Prime', description: 'A set of twelve artist brushes in a travel case.',
  hasVariants: false, variantCount: 0, images: ['/main.jpg', '/side.jpg'], imageAltTexts: ['Brushes in a case', 'Brush tips'],
  stock: '12', price: '4,900 JPY', listingCount: 5, channelCount: 3,
  imported: true, source: 'Amazon · Prime Beauty US', translations: [{ locale: 'ja-JP', label: '日本語', status: 'complete' }, { locale: 'vi-VN', label: 'Tiếng Việt', status: 'partial' }, { locale: 'th-TH', label: 'ไทย', status: 'missing' }],
  onCommerce: vi.fn(), onProductData: vi.fn(), onListings: vi.fn(), onSelectLocale: vi.fn(),
};
function mount(overrides: Partial<typeof props> = {}) { return render(<ProductOverviewSnapshot {...props} {...overrides} />); }

describe('ProductOverviewSnapshot', () => {
  it('shows the main image, labeled identity, short description and operational metrics together', () => {
    mount();
    const summary = within(screen.getByRole('region', { name: 'Product summary' }));
    expect(summary.queryByRole('heading')).not.toBeInTheDocument();
    expect(summary.getByRole('img', { name: 'Brushes in a case' })).toHaveAttribute('src', '/main.jpg');
    expect(summary.getByText('View 2 images')).toBeVisible();
    for (const value of ['Master SKU', 'BRUSH-12', 'Category', 'Art Supplies', 'Brand', 'Prime', 'Product type', 'Single product', '1 sellable SKU', props.description]) {
      expect(summary.getByText(value)).toBeVisible();
    }
    expect(summary.getByRole('button', { name: 'View Master stock' })).toHaveTextContent('12 units');
    expect(summary.getByRole('button', { name: 'View base price' })).toHaveTextContent('4,900 JPY');
    expect(summary.getByRole('button', { name: 'View linked listings' })).toHaveTextContent('5 listings · 3 channels');
    expect(summary.getByRole('button', { name: 'Translations: 1 of 3 complete' })).toBeVisible();
  });
  it('keeps the three operational metrics connected to their workspaces', () => {
    const onCommerce = vi.fn();
    const onListings = vi.fn();
    mount({ onCommerce, onListings });
    fireEvent.click(screen.getByRole('button', { name: 'View Master stock' }));
    fireEvent.click(screen.getByRole('button', { name: 'View base price' }));
    fireEvent.click(screen.getByRole('button', { name: 'View linked listings' }));
    expect(onCommerce).toHaveBeenCalledTimes(2);
    expect(onListings).toHaveBeenCalledOnce();
  });
  it('does not fabricate missing identity, media, inventory or source context', () => {
    mount({ source: '', translations: [], sku: '', brand: '', category: '', description: '', images: [], stockRecorded: false });
    expect(screen.getByText('Not assigned')).toBeVisible();
    expect(screen.getAllByText('Not provided')).toHaveLength(3);
    expect(screen.getByText('No images')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View Master stock' })).toHaveTextContent('Not recorded');
    expect(screen.getByText('Source: Not recorded')).toBeVisible();
    expect(screen.getByText('Primary language only')).toBeVisible();
  });
  it('shows variants with a price range and missing-price note', () => {
    mount({ hasVariants: true, variantCount: 3, price: '4,200–6,300 JPY', priceNote: '1 of 3 variant prices missing' });
    expect(screen.getByText('3 variant SKUs')).toBeVisible();
    const price = screen.getByRole('button', { name: 'View variant prices' });
    expect(price).toHaveTextContent('4,200–6,300 JPY');
    expect(price).toHaveTextContent('1 of 3 variant prices missing');
    expect(screen.queryByRole('button', { name: 'View base price' })).not.toBeInTheDocument();
  });
  it('opens product data to see full details or add missing images', () => {
    const onProductData = vi.fn();
    mount({ images: [], onProductData });
    fireEvent.click(screen.getByRole('button', { name: 'View product data' }));
    fireEvent.click(screen.getByRole('button', { name: 'View product media — no images' }));
    expect(onProductData).toHaveBeenCalledTimes(2);
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
