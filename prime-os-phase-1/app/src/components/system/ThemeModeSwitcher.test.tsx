// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeModeSwitcher } from '@/components/system/ThemeModeSwitcher';
import { I18nProvider } from '@/lib/i18n/I18nContext';

const STORAGE_KEY = 'test-theme-mode';

function mockMatchMedia(prefersDark: boolean) {
  const listeners = new Set<() => void>();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_event: string, callback: () => void) => listeners.add(callback),
      removeEventListener: (_event: string, callback: () => void) => listeners.delete(callback),
      addListener: (callback: () => void) => listeners.add(callback),
      removeListener: (callback: () => void) => listeners.delete(callback),
      dispatchEvent: () => true,
    })),
  });
}

function mockLocalStorage() {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: storage,
  });
}

function renderSwitcher() {
  return render(
    <I18nProvider>
      <ThemeProvider defaultTheme="dark" storageKey={STORAGE_KEY}>
        <ThemeModeSwitcher />
      </ThemeProvider>
    </I18nProvider>,
  );
}

function renderCompactSwitcher() {
  return render(
    <I18nProvider>
      <ThemeProvider defaultTheme="dark" storageKey={STORAGE_KEY}>
        <ThemeModeSwitcher compact />
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe('ThemeModeSwitcher', () => {
  beforeEach(() => {
    cleanup();
    mockLocalStorage();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    mockMatchMedia(false);
  });

  it('defaults to dark theme', () => {
    renderSwitcher();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('normalizes legacy system preference back to dark', () => {
    localStorage.setItem(STORAGE_KEY, 'system');
    renderSwitcher();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(screen.queryByRole('radio', { name: /system/i })).not.toBeInTheDocument();
  });

  it('persists explicit theme selection to localStorage', () => {
    renderSwitcher();

    fireEvent.click(screen.getAllByRole('radio', { name: /light mode/i })[0]);

    expect(document.documentElement).toHaveClass('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');

    fireEvent.click(screen.getAllByRole('radio', { name: /dark mode/i })[0]);

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('renders compact mode as a single switch without visible text labels', () => {
    renderCompactSwitcher();

    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.queryByText(/light mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dark mode/i)).not.toBeInTheDocument();
  });

  it('toggles between dark and light in compact mode', () => {
    renderCompactSwitcher();

    fireEvent.click(screen.getByRole('switch'));

    expect(document.documentElement).toHaveClass('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });
});
