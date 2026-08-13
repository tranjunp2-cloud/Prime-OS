import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type FeedbackTopic = 'UI_UX' | 'BUG' | 'FEATURE_REQUEST' | 'PERFORMANCE' | 'GENERAL';
export type SentimentRating = 'VERY_DISSATISFIED' | 'DISSATISFIED' | 'SATISFIED' | 'VERY_SATISFIED';

export interface FeedbackPayload {
  topic: FeedbackTopic;
  content: string;
  sentiment_rating: SentimentRating;
  page_url: string;
  metadata: {
    user_agent: string;
    screen_resolution: string;
    app_version: string;
  };
}

export async function submitFeedback(payload: FeedbackPayload) {
  const headers = createPrimeAuthHeaders();
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}/api/v1/system/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Unable to submit feedback.');
  return body as { success: true; message: string };
}
