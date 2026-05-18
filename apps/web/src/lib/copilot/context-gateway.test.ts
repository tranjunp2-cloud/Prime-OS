import { describe, expect, it } from 'vitest';
import { buildResponseGrounding, readContextSnapshot } from './context-gateway';
import type { CopilotContextSummary, CopilotResponse } from '@/components/copilot/types';

const routeContext: CopilotContextSummary = {
  domain: 'orders',
  title: 'Orders',
  description: 'Order workspace',
  citations: ['Current route: /orders', 'Source: order-store'],
  quickPrompts: [],
};

describe('copilot context gateway', () => {
  it('returns a read-only route snapshot with source metadata', () => {
    const snapshot = readContextSnapshot(routeContext);

    expect(snapshot.domain).toBe('orders');
    expect(snapshot.freshness).toBe('live_session');
    expect(snapshot.policyTags).toContain('context-read-only');
    expect(snapshot.citations).toContain('Source: order-store');
  });

  it('grounds draft responses with draft safety policy tags', () => {
    const response: CopilotResponse = {
      domain: 'product',
      intent: 'write_draft',
      content: 'Draft only',
    };

    const grounding = buildResponseGrounding(response, readContextSnapshot(routeContext));

    expect(grounding.sources).toContain('draft_prefill');
    expect(grounding.policyTags).toContain('draft-before-commit');
    expect(grounding.policyTags).toContain('frontend-read-only-default');
  });
});
