// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n/I18nContext';
import Warehouses from '@/pages/Warehouses';
import { addWarehouse, clearWarehouseStore, getWarehouses } from '@/lib/warehouse-store';

vi.mock('@/hooks/use-initial-loading', () => ({
  useInitialLoading: () => false,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

function renderWarehousesPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <Warehouses />
      </MemoryRouter>
    </I18nProvider>,
  );
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

describe('Warehouses page', () => {
  const seedSnapshot = JSON.parse(JSON.stringify(getWarehouses()));

  beforeEach(() => {
    cleanup();
    mockLocalStorage();
    localStorage.setItem('ech.locale', 'en-US');
    clearWarehouseStore();
    seedSnapshot.forEach((warehouse: typeof seedSnapshot[number]) => addWarehouse(warehouse));
  });

  afterEach(() => {
    cleanup();
    clearWarehouseStore();
    seedSnapshot.forEach((warehouse: typeof seedSnapshot[number]) => addWarehouse(warehouse));
  });

  it('saves edited warehouse values back into the table and humanizes capability badges', async () => {
    renderWarehousesPage();

    expect(await screen.findByText('Fulfillment By Shopee Malaysia')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit: fbs-my/i }));

    const codeInput = screen.getByLabelText(/code/i);
    const nameInput = screen.getByLabelText(/name/i);
    const capabilitiesInput = screen.getByLabelText(/capabilities/i);

    fireEvent.change(codeInput, { target: { value: 'SPX-MY' } });
    fireEvent.change(nameInput, { target: { value: 'Shopee Express Malaysia Hub' } });
    fireEvent.change(capabilitiesInput, { target: { value: 'pick_pack, same_day, cross_border' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const updatedCode = screen.getByText('SPX-MY');
    expect(updatedCode).toBeInTheDocument();
    expect(screen.getByText('Shopee Express Malaysia Hub')).toBeInTheDocument();

    const updatedRow = updatedCode.closest('tr');
    expect(updatedRow).not.toBeNull();

    const row = within(updatedRow as HTMLElement);
    expect(row.getByText('Pick & Pack')).toBeInTheDocument();
    expect(row.getByText('Same Day')).toBeInTheDocument();
    expect(row.getByText('Cross Border')).toBeInTheDocument();
  });
});
