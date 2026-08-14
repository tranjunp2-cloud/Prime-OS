import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = mkdtempSync(path.join(tmpdir(), 'prime-live-commerce-'));
process.env.PRIME_LIVE_COMMERCE_STORE_PATH = path.join(directory, 'store.json');
const module = await import('../src/live-commerce.js');

test('live commerce summary and filters expose seeded operational data', () => {
  const summary = module.getLiveSessionSummary();
  assert.equal(summary.active_sessions, 1);
  assert.equal(summary.allocated_stock, 1660);
  assert.equal(summary.sold_percentage, 56);
  assert.equal(module.listLiveSessions({ status: 'LIVE' }).data.length, 1);
});

test('session creation reserves ATP and rejects over-allocation', () => {
  const before = module.getLiveCommerceOptions('wh_d1_01').inventory.find((item) => item.sku_id === 'PRM-LIP-02');
  const created = module.createLiveSession({ title: 'New Product Live', channel_id: 'tiktok_vn_01', host_name: 'Mai Tran', warehouse_id: 'wh_d1_01', scheduled_start_at: new Date(Date.now() + 3600000).toISOString(), duration_hours: 2, auto_release_policy: 'IMMEDIATE_ON_END', enable_safety_buffer: true, allocated_items: [{ sku_id: 'PRM-LIP-02', allocated_qty: 20, live_price: 149000 }] });
  assert.equal(created.allocated_qty, 20);
  const after = module.getLiveCommerceOptions('wh_d1_01').inventory.find((item) => item.sku_id === 'PRM-LIP-02');
  assert.equal(after.available_atp, before.available_atp - 20);
  assert.throws(() => module.createLiveSession({ title: 'Invalid', channel_id: 'tiktok_vn_01', host_name: 'Mai Tran', warehouse_id: 'wh_d1_01', scheduled_start_at: new Date(Date.now() + 3600000).toISOString(), duration_hours: 2, auto_release_policy: 'IMMEDIATE_ON_END', allocated_items: [{ sku_id: 'PRM-LIP-02', allocated_qty: 9999, live_price: 1 }] }), /exceeds available ATP/);
});

test('live stock top-up and end-session release update inventory', () => {
  const before = module.getLiveCommerceOptions('wh_hcm_01').inventory.find((item) => item.sku_id === 'PRM-SRM-01').available_atp;
  const toppedUp = module.topUpLiveSession('live_88_beauty', { sku_id: 'PRM-SRM-01', additional_qty: 10 });
  assert.equal(toppedUp.allocated_qty, 810);
  assert.equal(module.getLiveCommerceOptions('wh_hcm_01').inventory.find((item) => item.sku_id === 'PRM-SRM-01').available_atp, before - 10);
  const ended = module.endLiveSession('live_88_beauty');
  assert.equal(ended.status, 'ENDED');
  assert.equal(ended.release_status, 'RELEASED');
});
