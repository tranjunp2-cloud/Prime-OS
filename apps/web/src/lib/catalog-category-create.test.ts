// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canCreateCatalogCategory, categoryCreateErrors, categoryCreationParents, createCatalogCategory } from './catalog-category-create';
import { getProductCatalogSettings, saveProductCatalogSettings } from './product-catalog-settings-store';

const admin = { role: 'admin' as const, canWrite: true };
const input = { name: 'New category', parentId: null, description: '' };
beforeEach(() => {
  localStorage.clear();
  const settings = getProductCatalogSettings();
  const base = settings.categories[0];
  saveProductCatalogSettings({ ...settings, categories: [
    { ...base, id: 'root', name: 'Office', parentId: null },
    { ...base, id: 'branch', name: 'Paper', parentId: 'root' },
    { ...base, id: 'leaf', name: 'Books', parentId: 'branch' },
    { ...base, id: 'inactive', name: 'Archived', parentId: null, status: 'Inactive' },
    { ...base, id: 'hidden-child', name: 'Hidden', parentId: 'inactive' },
  ] });
});
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('quick category creation', () => {
  it('requires an authenticated admin with write access at mutation time', () => {
    for (const session of [undefined, null, { role: 'user' as const, canWrite: true }, { role: 'admin' as const, canWrite: false }]) {
      expect(Boolean(canCreateCatalogCategory(session))).toBe(false);
      expect(() => createCatalogCategory(input, session)).toThrow(/Admin/);
    }
    expect(canCreateCatalogCategory(admin)).toBe(true);
  });
  it('offers only active parents that keep the tree within three levels', () => {
    expect(categoryCreationParents(getProductCatalogSettings().categories)).toEqual([{ id: 'root', label: 'Office' }, { id: 'branch', label: 'Office / Paper' }]);
    for (const parentId of ['leaf', 'inactive', 'hidden-child', 'missing']) expect(() => createCatalogCategory({ ...input, parentId }, admin)).toThrow(/active parent/);
  });
  it('blocks empty or duplicate names including inactive siblings, but permits another branch', () => {
    for (const name of ['', '  ', ' office ', 'ＯＦＦＩＣＥ', 'Archived']) expect(categoryCreateErrors({ ...input, name }, getProductCatalogSettings().categories).name).toBeTruthy();
    expect(createCatalogCategory({ ...input, name: 'Books', parentId: 'root' }, admin).name).toBe('Books');
  });
  it('creates an active category without inheriting attributes or claiming marketplace mappings', () => {
    const created = createCatalogCategory({ name: '  New   Paper ', parentId: 'branch', description: ' Notes ' }, admin);
    expect(created).toMatchObject({ name: 'New Paper', parentId: 'branch', description: 'Notes', status: 'Active', source: 'internal', attributes: [], mappings: { amazon: 'needs_review', shopee: 'needs_review' } });
    expect(getProductCatalogSettings().categories.find(category => category.id === created.id)).toEqual(created);
  });
  it('rechecks latest data and preserves independent catalog edits', () => {
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, brands: [], categories: [...settings.categories, { ...settings.categories[0], id: 'other', name: 'Just created', parentId: null }] });
    createCatalogCategory(input, admin);
    expect(getProductCatalogSettings().brands).toEqual([]);
    expect(getProductCatalogSettings().categories.some(category => category.id === 'other')).toBe(true);
    expect(() => createCatalogCategory(input, admin)).toThrow(/already exists/);
  });
  it('does not report success if persistence fails', () => {
    const before = localStorage.getItem('prime-product-catalog-settings-v2');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => createCatalogCategory(input, admin)).toThrow('Storage full');
    expect(localStorage.getItem('prime-product-catalog-settings-v2')).toBe(before);
  });
});
