import { describe, expect, it } from 'vitest';
import { createWebsite, hasChanges, publishSnapshot } from './store';
describe('PrimeWeb publication boundary', () => {
  it('isolates live pages, products and posts from draft edits until publication', () => {
    const site = publishSnapshot(createWebsite('My store', 'essential', ['p1']));
    site.draft.pages[0].blocks[1].title = 'Draft headline';
    site.draft.productIds.push('p2');
    site.draft.posts[0].content = 'Draft article';
    expect(site.published?.pages[0].blocks[1].title).toBe('Good things. Everyday.');
    expect(site.published?.productIds).toEqual(['p1']);
    expect(site.published?.posts[0].content).not.toBe('Draft article');
    expect(hasChanges(site)).toBe(true);
    const updated = publishSnapshot(site);
    expect(updated.published).toEqual(site.draft);
    expect(hasChanges(updated)).toBe(false);
  });
  it('creates independent sites', () => {
    const a = createWebsite('A'); const b = createWebsite('B', 'artisan');
    a.draft.pages[0].blocks.pop();
    expect(b.draft.pages[0].blocks).toHaveLength(6);
    expect(b.draft.productIds).toEqual([]);
    expect(b.published).toBeNull();
    expect(a.id).not.toBe(b.id);
  });
});
