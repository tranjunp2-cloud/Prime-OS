// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LegacyEntityRedirect, LegacyPathRedirect } from './components/routing/LegacyEntityRedirect';

function LocationProbe() {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderRedirect(initialPath: string, routePath: string, basePath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={routePath} element={<LegacyEntityRedirect basePath={basePath} />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderPathRedirect(initialPath: string, routePath: string, to: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={routePath} element={<LegacyPathRedirect to={to} />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('legacy COS route redirects', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps legacy order detail links inside the Prime OS OMS route', async () => {
    renderRedirect('/orders/ord_123', '/orders/:id', '/ecom/cos/oms');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/oms/ord_123');
    });
  });

  it('keeps legacy fulfillment job links inside the Prime OS fulfillment route', async () => {
    renderRedirect('/fulfillment/jobs/job_123', '/fulfillment/jobs/:id', '/ecom/cos/fulfillment/jobs');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/fulfillment/jobs/job_123');
    });
  });

  it('keeps legacy return links inside the Prime OS returns route', async () => {
    renderRedirect('/returns/rma_123', '/returns/:id', '/ecom/cos/returns');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/returns/rma_123');
    });
  });

  it('keeps legacy product detail links inside the Prime OS product master route', async () => {
    renderRedirect('/products/prod_123', '/products/:id', '/ecom/cos/product-master');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/product-master/prod_123');
    });
  });

  it('keeps legacy product edit links inside the Prime OS product editor route', async () => {
    renderPathRedirect('/products/prod_123/edit', '/products/:id/edit', '/ecom/cos/product-master/:id/edit');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/product-master/prod_123/edit');
    });
  });

  it('keeps legacy product creation links inside Product Master and preserves query params', async () => {
    renderPathRedirect('/products/new?sku=CR-NEW-1', '/products/new', '/ecom/cos/product-master/new');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/product-master/new?sku=CR-NEW-1');
    });
  });

  it('keeps legacy product variant links inside product detail with variant context', async () => {
    renderPathRedirect('/products/prod_123/variants/sku_456', '/products/:id/variants/:sku', '/ecom/cos/product-master/:id?variant=:sku');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ecom/cos/product-master/prod_123?variant=sku_456');
    });
  });
});
