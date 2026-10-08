import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-warehouse-links-'));
process.env.PRIME_CHANNEL_STORE_PATH = path.join(directory, 'channels.json');
const { updateChannelWarehouse, listConnectedChannels, listChannelWarehouses } = await import('../src/channel-integrations.js');
after(() => fs.rmSync(directory, { recursive: true, force: true }));

test('shop linking persists its source without fabricating a sync or altering sync services', () => {
  const before = listConnectedChannels().find(item => item.platform === 'shopee');
  const warehouse = { id: 'wh-new-seller', name: 'Seller warehouse', code: 'SELLER-01', city: 'Singapore' };
  const saved = updateChannelWarehouse(before.id, { warehouse, expected_warehouse_id: before.physical_warehouse_id });
  assert.deepEqual(saved.warehouse, warehouse);
  assert.equal(saved.last_sync_at, before.last_sync_at);
  assert.deepEqual(saved.sync_services, before.sync_services);
  assert.deepEqual(listConnectedChannels().find(item => item.id === before.id).warehouse, warehouse);
  assert.ok(listChannelWarehouses().some(item => item.id === warehouse.id));
  assert.throws(() => updateChannelWarehouse(before.id, { warehouse, expected_warehouse_id: before.physical_warehouse_id }), /linked elsewhere/);
});

test('invalid warehouse and missing shop do not modify a connection', () => {
  const before = listConnectedChannels();
  assert.throws(() => updateChannelWarehouse(before[0].id, { warehouse: { id: 'x' } }), /valid warehouse/);
  assert.throws(() => updateChannelWarehouse('missing', { warehouse: {} }), /not found/);
  assert.deepEqual(listConnectedChannels(), before);
});
