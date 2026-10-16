// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductContentLanguage } from './ProductContentLanguage';
import { DEFAULT_ORG_LOCALES } from '@/lib/product-catalog-settings-store';

afterEach(cleanup);

describe('ProductContentLanguage', () => {
  it('keeps the full language accessible while displaying a fixed-height single-line selector', () => {
    render(<ProductContentLanguage locales={DEFAULT_ORG_LOCALES} current="ms-MY" getStatus={() => 'missing'} onSelect={vi.fn()} />);
    const selector = screen.getByRole('button', { name: 'Content: Bahasa Melayu' });
    expect(selector).toHaveClass('h-11', 'whitespace-nowrap');
    expect(selector).not.toHaveClass('h-auto', 'whitespace-normal');
    expect(selector).toHaveClass('w-auto', 'max-w-full');
    expect(selector).not.toHaveClass('flex-1', 'w-full');
    expect(selector).toHaveAttribute('title', 'Content: Bahasa Melayu');
    expect(screen.getByText('Bahasa Melayu')).toHaveAttribute('lang', 'ms-MY');
    expect(screen.getByText('Editing Malay translation')).toHaveClass('truncate');
    expect(screen.getByRole('button', { name: 'About product data' }).parentElement).toContainElement(screen.getByRole('heading', { name: 'Product data' }));
  });

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
