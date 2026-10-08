// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LinkWarehouseShopsDrawer } from '@/components/inventory/LinkWarehouseShopsDrawer';
import { ConnectedChannelsPage } from '@/pages/SalesChannels';
import { ListingSyncConfiguration } from '@/components/products/ListingSyncConfiguration';
import { getProducts, type ChannelListing } from '@/lib/product-store';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';
import { warehouseDemoShops } from '@/test/fixtures/warehouse-shops';
import { useState } from 'react';
import type { MasterSyncPreference } from '@/lib/listing-master-sync';

let records = structuredClone(warehouseDemoShops);
const warehouse = { id: 'wh_crjp', name: 'CyberRecord Japan HQ', code: 'CR-JP', address: 'Tokyo' };
beforeEach(() => {
  records = structuredClone(warehouseDemoShops);
  vi.spyOn(channelIntegrationsApi, 'channels').mockImplementation(async () => ({ data: structuredClone(records) }));
  vi.spyOn(channelIntegrationsApi, 'linkWarehouse').mockImplementation(async (id, target, expected) => {
    const current = records.find(shop => shop.id === id)!;
    if (current.warehouse?.id !== expected) throw new Error('This shop was linked elsewhere. Reload shops.');
    records = records.map(shop => shop.id === id ? { ...shop, warehouse: target } : shop);
    return { data: structuredClone(records.find(shop => shop.id === id)!) };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('saves in Warehouses, reads the same setting in Sales Channels and persists a change back', async () => {
  const saved = vi.fn();
  const view = render(<LinkWarehouseShopsDrawer warehouse={warehouse} onSaved={saved} onClose={vi.fn()} />);
  await screen.findByRole('combobox', { name: 'Shop' });
  fireEvent.change(screen.getByLabelText('Shop'), { target: { value: 'channel_shopee' } });
  expect(screen.getByText('Affected listings')).toBeVisible();
  expect(screen.queryByText('HCM Central')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save default warehouse' }));
  await screen.findByText('Default warehouse saved for Prime Beauty Official.');
  expect(saved).toHaveBeenCalledOnce(); view.unmount();
  const channels = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ConnectedChannelsPage /></MemoryRouter></QueryClientProvider>);
  const button = await screen.findByRole('button', { name: 'Set default warehouse for Prime Beauty Official' });
  expect(button).toHaveTextContent('CyberRecord Japan HQ'); fireEvent.click(button);
  fireEvent.change(screen.getByRole('combobox', { name: 'Default warehouse' }), { target: { value: 'wh_rslsg' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save default warehouse' }));
  await screen.findByText('Default warehouse saved for Prime Beauty Official.');
  channels.unmount();
  render(<LinkWarehouseShopsDrawer warehouse={warehouse} onSaved={vi.fn()} onClose={vi.fn()} />);
  await screen.findByLabelText('Shop');
  fireEvent.change(screen.getByLabelText('Shop'), { target: { value: 'channel_shopee' } });
  await screen.findByText('Current default: Reseller Singapore');
  expect(channelIntegrationsApi.linkWarehouse).toHaveBeenNthCalledWith(1, 'channel_shopee', expect.objectContaining({ id: 'wh_crjp' }), 'wh_hcm_01');
  expect(channelIntegrationsApi.linkWarehouse).toHaveBeenNthCalledWith(2, 'channel_shopee', expect.objectContaining({ id: 'wh_rslsg' }), 'wh_crjp');
});

it('surfaces a stale save, reloads current settings, and cancel sends no write', async () => {
  const saved = vi.fn(), close = vi.fn();
  render(<LinkWarehouseShopsDrawer warehouse={warehouse} onSaved={saved} onClose={close} />);
  await screen.findByLabelText('Shop'); fireEvent.change(screen.getByLabelText('Shop'), { target: { value: 'channel_shopee' } });
  records = records.map(shop => shop.id === 'channel_shopee' ? { ...shop, warehouse: { ...shop.warehouse!, id: 'wh_rslsg', name: 'Reseller Singapore' } } : shop);
  fireEvent.click(screen.getByRole('button', { name: 'Save default warehouse' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('linked elsewhere');
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reload shops' }));
  await screen.findByText('Current default: Reseller Singapore');
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(close).toHaveBeenCalledOnce(); expect(channelIntegrationsApi.linkWarehouse).toHaveBeenCalledTimes(1);
});

it('lets a listing choose inheritance or an explicit warehouse without leaving the editor', async () => {
  const listing: ChannelListing = { channel: 'shopee', store_name: 'Prime Beauty Official', external_id: 'a', status: 'active', listing_url: null, last_synced_at: null };
  function Editor() {
    const [draft, setDraft] = useState<MasterSyncPreference>({ enabled: true, fields: ['inventory'], inventory: { warehouse_id: 'wh_crjp', safety_buffer: 2 } });
    return <><ListingSyncConfiguration field="inventory" master={{ ...getProducts()[0], channels: [listing], channel_overrides: {}, import_sources: [] }} listing={listing} draft={draft} onChange={patch => setDraft({ ...draft, ...patch })} /><output aria-label="Saved choice">{JSON.stringify(draft.inventory)}</output></>;
  }
  render(<Editor />);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Use shop default · Vietnam 3PL Partner' })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Stock source'), { target: { value: '__shop_default' } });
  expect(screen.getByLabelText('Saved choice')).toHaveTextContent('"source":"shop_default"');
  expect(screen.getByText(/Follows this shop’s default/)).toBeVisible();
  fireEvent.change(screen.getByLabelText('Stock source'), { target: { value: 'wh_rslsg' } });
  expect(screen.getByLabelText('Saved choice')).toHaveTextContent('"warehouse_id":"wh_rslsg"');
  expect(screen.getByLabelText('Saved choice')).not.toHaveTextContent('shop_default');
  expect(channelIntegrationsApi.linkWarehouse).not.toHaveBeenCalled();
});
