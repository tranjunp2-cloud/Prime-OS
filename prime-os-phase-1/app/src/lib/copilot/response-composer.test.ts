import { describe, expect, it } from 'vitest';
import { deterministicCopilotComposer } from './response-composer';
import type { CopilotContextSummary, CopilotResponse } from '@/components/copilot/types';

const context: CopilotContextSummary = {
  domain: 'orders',
  title: 'Orders',
  description: 'Order workspace',
  citations: ['Current route: /orders'],
  quickPrompts: [],
};

describe('copilot response composer', () => {
  it('keeps the Phase 3 composer seam structured and deterministic', () => {
    const response: CopilotResponse = {
      domain: 'orders',
      intent: 'navigate',
      content: 'Có 3 đơn pending',
      actions: [{ type: 'navigate', label: 'Mở pending', url: '/orders?status=pending' }],
    };

    const content = deterministicCopilotComposer.compose({ response, context });

    expect(content).toContain('**Insight**');
    expect(content).toContain('**Recommendation**');
    expect(content).toContain('**Action**');
    expect(content).toContain('Mở pending');
  });
});
