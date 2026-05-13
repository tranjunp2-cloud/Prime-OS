import { describe, expect, it } from 'vitest';
import { getPrimeFlowsForRoute, primeFlowRegistry } from './prime-flow-registry';

describe('primeFlowRegistry', () => {
  it('preserves core Prime OS cross-area flows', () => {
    expect(primeFlowRegistry.map((flow) => flow.id)).toEqual([
      'campaign-to-lead',
      'rfq-to-order',
      'order-to-fulfillment',
      'return-to-refund',
      'forecast-to-replenishment',
      'receivable-readiness',
    ]);
  });

  it('keeps each flow linked to routes and entities', () => {
    expect(primeFlowRegistry.every((flow) => flow.routes.length > 0 && flow.entities.length > 0 && flow.steps.length > 0)).toBe(true);
  });

  it('finds flows for existing Prime OS routes', () => {
    expect(getPrimeFlowsForRoute('/ecom/cos/oms').map((flow) => flow.id)).toEqual(['rfq-to-order', 'order-to-fulfillment', 'receivable-readiness']);
    expect(getPrimeFlowsForRoute('/finance/fin-support').map((flow) => flow.id)).toEqual(['order-to-fulfillment', 'receivable-readiness']);
  });
});
