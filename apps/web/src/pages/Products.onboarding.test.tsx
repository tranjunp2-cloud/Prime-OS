// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as productStore from '@/lib/product-store';
import Products from './Products';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-product-channel-setup', () => ({ useProductChannelSetup: () => ({ snapshot: { status: 'loaded', channels: [] }, retry: vi.fn() }) }));
vi.mock('@/lib/i18n/I18nContext', () => ({ useI18n: () => ({ locale: 'en-US', t: (key: string) => key }) }));

const sample = productStore.getProducts()[0];
const completedKey = 'prime-product-intro-completed-v1';
const dismissedKey = 'prime-product-guide-dismissed-v1';
let records: productStore.Product[] = [];
const page = () => <MemoryRouter initialEntries={['/products/master-catalog']}><Products /></MemoryRouter>;
beforeEach(() => {
  records = [];
  localStorage.removeItem(completedKey);
  localStorage.removeItem(dismissedKey);
  vi.spyOn(productStore, 'getProducts').mockImplementation(() => records);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.removeItem(completedKey);
  localStorage.removeItem(dismissedKey);
});

describe('First Product Master introduction', () => {
  it('hides duplicate header shortcuts while keeping working in-place actions', () => {
    render(page());
    expect(screen.getByRole('heading', { name: 'Start your product catalog' })).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Search products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Product workspace views' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import products', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Product Master', exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import Excel / CSV', exact: true }));
    expect(screen.getByRole('dialog', { name: 'Manual product import' })).toBeVisible();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create a new product', exact: true }));
    expect(screen.getByRole('dialog', { name: 'Create Product Master draft' })).toBeVisible();
    expect(localStorage.getItem(completedKey)).toBeNull();
    expect(records).toHaveLength(0);
  });

  it.each(['draft', 'published', 'archived'] as const)('hides the introduction when the first %s Master exists', status => {
    const { rerender } = render(page());
    records = [{ ...sample, status }];
    rerender(page());
    expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Catalog status' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(completedKey)).toBe('1');
  });

  it('cannot dismiss the empty state and ignores an old dismissal preference', () => {
    localStorage.setItem(dismissedKey, '1');
    render(page());
    expect(screen.queryByRole('button', { name: 'Dismiss getting started' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Start your product catalog' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Import Excel / CSV', exact: true })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create a new product', exact: true })).toBeEnabled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not repeat onboarding after all Masters have been removed', () => {
    records = [{ ...sample, status: 'draft' }];
    const { rerender } = render(page());
    records = [];
    rerender(page());
    expect(screen.getByRole('heading', { name: 'No Product Masters yet' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Import products', exact: true })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create Product Master', exact: true })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
  });

  it('does not confuse a filtered zero result with a first-use empty catalog', async () => {
    records = [{ ...sample, status: 'draft' }];
    render(page());
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'no-such-product-unique' } });
    expect(await screen.findByText('No products match this view')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Start your product catalog' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeEnabled();
  });
});
