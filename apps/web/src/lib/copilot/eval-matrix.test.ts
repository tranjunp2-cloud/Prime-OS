import { describe, expect, it } from 'vitest';
import { resolveCopilotResponse } from './context';
import { COPILOT_EVAL_MATRIX } from './eval-matrix';

describe('copilot eval matrix', () => {
  it.each(COPILOT_EVAL_MATRIX)('passes $id', (evalCase) => {
    const response = resolveCopilotResponse(evalCase.prompt, evalCase.pathname);

    expect(response.domain).toBe(evalCase.expectedDomain);
    expect(response.intent).toBe(evalCase.expectedIntent);
    if (evalCase.requiredPolicyTag) {
      expect(response.grounding?.policyTags).toContain(evalCase.requiredPolicyTag);
    }
  });
});
