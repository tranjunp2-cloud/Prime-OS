// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getMasterMediaReadiness } from './product-master-media';
import { getStoredMasterReadiness } from './product-master-readiness';
import { getProducts } from './product-store';
import { readyMasterFields } from '@/test/fixtures/listing-master';

describe('Product Master single-image minimum', () => {
  it.each([
    { images: [], count: 0, ready: false },
    { images: ['', '  ', '\n'], count: 0, ready: false },
    { images: ['/cover.jpg'], count: 1, ready: true },
    { images: ['', ' /cover.jpg ', ' '], count: 1, ready: true },
    { images: ['/cover.jpg', '/detail.jpg', '/detail.jpg'], count: 3, ready: true },
  ])('checks media independently of Master activation for $images', ({ images, count, ready }) => {
    expect(getMasterMediaReadiness(images)).toEqual({ count, ready });
    const product = { ...getProducts()[0], ...readyMasterFields(), images, channels: [], channel_overrides: {} };
    expect(getStoredMasterReadiness(product).checks.find(check => check.id === 'media')).toBeUndefined();
    expect(getStoredMasterReadiness(product).ready).toBe(true);
    expect(product.images).toEqual(images);
  });

  it('does not bypass other required fields once an image is present', () => {
    const product = { ...getProducts()[0], ...readyMasterFields(), images: ['/cover.jpg'], description: '' };
    const readiness = getStoredMasterReadiness(product);
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toContain('Add a product description');
    expect(readiness.missing).not.toContain('Add at least 1 product image');
  });
});
