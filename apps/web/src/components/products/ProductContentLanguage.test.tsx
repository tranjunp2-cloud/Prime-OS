// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductContentLanguage } from './ProductContentLanguage';
import { DEFAULT_ORG_LOCALES } from '@/lib/product-catalog-settings-store';

afterEach(cleanup);

describe('ProductContentLanguage', () => {
  it('uses explicit, neutral statuses and a single selected language', async () => {
    const onSelect = vi.fn();
    render(<ProductContentLanguage locales={DEFAULT_ORG_LOCALES} current="en-US" getStatus={item => item.isPrimary ? 'primary' : item.locale === 'ja-JP' ? 'complete' : item.locale === 'vi-VN' ? 'partial' : 'missing'} onSelect={onSelect} />);
    expect(screen.getByText('Translations: 1/3 complete')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Content: English' }), { key: 'ArrowDown' });
    expect(await screen.findByRole('menuitemradio', { name: 'English Primary' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: '日本語 Complete' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemradio', { name: 'Tiếng Việt In progress' })).toBeVisible();
    expect(screen.queryByText('Missing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Bahasa Melayu Not translated' }));
    expect(onSelect).toHaveBeenCalledWith('ms-MY');
  });

  it('handles organizations with only a primary language without a zero-denominator badge', () => {
    render(<ProductContentLanguage locales={DEFAULT_ORG_LOCALES.filter(item => item.isPrimary)} current="en-US" getStatus={() => 'primary'} onSelect={vi.fn()} />);
    expect(screen.getByText('Primary language only')).toBeVisible();
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });
});
