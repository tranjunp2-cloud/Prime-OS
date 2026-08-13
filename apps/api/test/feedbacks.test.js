import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';

process.env.PRIME_FEEDBACK_STORE_PATH = path.join(os.tmpdir(), `primeos-feedbacks-${process.pid}-${Date.now()}.json`);
const { createFeedback, listFeedbacks } = await import('../src/feedbacks.js');

test('creates feedback with authenticated identity and technical metadata', () => {
  const created = createFeedback({
    topic: 'UI_UX',
    content: 'The catalog filtering experience is clear.',
    sentiment_rating: 'SATISFIED',
    page_url: 'https://primeos.local/products/master-catalog',
    metadata: { user_agent: 'Test Browser', screen_resolution: '1920x1080', app_version: '1.0.0' },
  }, { id: 'user_001', email: 'admin@primeos.local' });

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(created.user_id, 'user_001');
  assert.equal(created.user_email, 'admin@primeos.local');
  assert.equal(created.metadata.screen_resolution, '1920x1080');
  assert.equal(listFeedbacks()[0].content, created.content);
});

test('rejects invalid enum values and content over 500 characters', () => {
  assert.throws(() => createFeedback({ topic: 'INVALID', content: 'Feedback', sentiment_rating: 'SATISFIED', page_url: 'https://primeos.local' }, null), /Invalid feedback topic/);
  assert.throws(() => createFeedback({ topic: 'GENERAL', content: 'x'.repeat(501), sentiment_rating: 'SATISFIED', page_url: 'https://primeos.local' }, null), /500 characters/);
});
