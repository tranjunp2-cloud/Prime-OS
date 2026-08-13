import type { CopilotContextSummary, CopilotResponse } from '@/components/copilot/types';

export interface CopilotComposerInput {
  response: CopilotResponse;
  context: CopilotContextSummary;
}

export interface CopilotComposer {
  compose(input: CopilotComposerInput): string;
}

export const deterministicCopilotComposer: CopilotComposer = {
  compose({ response, context }) {
    const insight = response.content.trim();
    const recommendation = summarizeRecommendationLine(response, context);
    const action = summarizeActionLine(response, context);

    return [
      '**Insight**',
      toSentence(insight),
      '',
      '**Recommendation**',
      toSentence(recommendation),
      '',
      '**Action**',
      toSentence(action),
    ].join('\n');
  },
};

function summarizeActionLine(response: CopilotResponse, context: CopilotContextSummary) {
  if (response.actions?.length) {
    return response.actions.slice(0, 2).map((action) => action.label).join(' · ');
  }

  if (response.followUpPrompts?.length) {
    return response.followUpPrompts.slice(0, 2).map((prompt) => prompt.label).join(' · ');
  }

  return `Continue in ${context.title}`;
}

function summarizeRecommendationLine(response: CopilotResponse, context: CopilotContextSummary) {
  switch (response.intent) {
    case 'navigate':
      return `Open the relevant module or queue in ${context.title}`;
    case 'write_draft':
      return `Review the safe draft before confirming the action in ${context.title}`;
    case 'clarify':
      return `Choose a specific direction to get a more relevant answer for ${context.title}`;
    default:
      if (response.entityRef?.label) {
        return `Review the context for ${response.entityRef.label} before choosing the next action`;
      }
      return `Use the current ${context.title} context to choose the next best action`;
  }
}

function toSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
