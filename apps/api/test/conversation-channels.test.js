import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = mkdtempSync(path.join(tmpdir(), 'prime-conversation-channels-'));
process.env.PRIME_CHANNEL_STORE_PATH = path.join(directory, 'commerce-stores.json');
process.env.PRIME_CONVERSATION_CHANNELS_STORE_PATH = path.join(directory, 'conversation-sources.json');
const module = await import('../src/conversation-channels.js');

test('lists quick-linkable commerce stores and excludes an already linked store', () => {
  const stores = module.listQuickLinkableStores();
  assert.ok(stores.some((store) => store.id === 'channel_tiktok_shop'));
  assert.ok(stores.some((store) => store.id === 'channel_lazada'));
  assert.equal(stores.some((store) => store.id === 'channel_shopee'), false);
  assert.ok(stores.every((store) => store.oauth_reuse_available));
});

test('quick-link reuses a connected store and removes it from eligibility', () => {
  const created = module.connectConversationChannel({
    connection_type: 'QUICK_LINK',
    source_store_id: 'channel_tiktok_shop',
    platform: 'TIKTOK_SHOP_CHAT',
    display_name: 'Prime Live - TikTok Chat',
    routing: { strategy: 'ROUND_ROBIN', target_team_id: 'team_cs_01', sla_threshold_minutes: 10 },
    automation: { enable_welcome: true, welcome_message: 'Hello {{customer_name}}!', enable_ai_copilot: true, enable_ai_order_lookup: true },
  });
  assert.equal(created.connection_type, 'QUICK_LINK');
  assert.equal(created.status, 'CONNECTED');
  assert.equal(module.listQuickLinkableStores().some((store) => store.id === 'channel_tiktok_shop'), false);
});

test('standalone connection requires OAuth and test ping restores health', () => {
  assert.throws(() => module.connectConversationChannel({
    connection_type: 'STANDALONE_OAUTH',
    source_store_id: null,
    platform: 'INSTAGRAM_DIRECT',
    display_name: 'Prime Beauty Instagram',
    routing: { strategy: 'TEAM_QUEUE', target_team_id: 'team_social_cs', sla_threshold_minutes: 15 },
    automation: {},
  }), /OAuth/);

  const created = module.connectConversationChannel({
    connection_type: 'STANDALONE_OAUTH',
    source_store_id: null,
    platform: 'INSTAGRAM_DIRECT',
    display_name: 'Prime Beauty Instagram',
    auth_code: 'oauth_meta_test',
    sync_scopes: ['DMS', 'COMMENTS'],
    routing: { strategy: 'TEAM_QUEUE', target_team_id: 'team_social_cs', sla_threshold_minutes: 15 },
    automation: { enable_welcome: false, enable_ai_copilot: true, enable_ai_order_lookup: false },
  });
  const result = module.testConversationPing(created.id);
  assert.equal(result.channel.webhook_health, 'HEALTHY');
  assert.equal(result.test.ok, true);
});
