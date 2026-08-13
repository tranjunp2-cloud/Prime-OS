import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const STORE_PATH = path.resolve(process.env.PRIME_FEEDBACK_STORE_PATH || path.join('data', 'feedbacks.json'));
const TOPICS = new Set(['UI_UX', 'BUG', 'FEATURE_REQUEST', 'PERFORMANCE', 'GENERAL']);
const SENTIMENTS = new Set(['VERY_DISSATISFIED', 'DISSATISFIED', 'SATISFIED', 'VERY_SATISFIED']);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function ensureStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ feedbacks: [] }, null, 2));
}

function readStore() {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  return { feedbacks: Array.isArray(data.feedbacks) ? data.feedbacks : [] };
}

function writeStore(store) {
  ensureStore();
  const temporaryPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryPath, STORE_PATH);
}

export function createFeedback(payload, account) {
  const topic = String(payload.topic || 'GENERAL');
  const content = String(payload.content || '').trim();
  const sentiment = String(payload.sentiment_rating || 'SATISFIED');
  const pageUrl = String(payload.page_url || '').trim();
  const metadata = payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata) ? payload.metadata : {};

  if (!TOPICS.has(topic)) throw validationError('Invalid feedback topic.');
  if (!content) throw validationError('Feedback content is required.');
  if (content.length > 500) throw validationError('Feedback content must be 500 characters or fewer.');
  if (!SENTIMENTS.has(sentiment)) throw validationError('Invalid sentiment rating.');
  if (!pageUrl) throw validationError('page_url is required.');

  const feedback = {
    id: randomUUID(),
    user_id: account?.id ?? null,
    user_email: account?.email ?? '',
    topic,
    content,
    sentiment_rating: sentiment,
    page_url: pageUrl,
    metadata: {
      user_agent: String(metadata.user_agent || ''),
      screen_resolution: String(metadata.screen_resolution || ''),
      app_version: String(metadata.app_version || '1.0.0'),
    },
    created_at: new Date().toISOString(),
  };
  const store = readStore();
  store.feedbacks.unshift(feedback);
  writeStore(store);
  return feedback;
}

export function listFeedbacks() {
  return readStore().feedbacks;
}
