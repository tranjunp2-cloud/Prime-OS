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

  return `Tiếp tục trong ${context.title}`;
}

function summarizeRecommendationLine(response: CopilotResponse, context: CopilotContextSummary) {
  switch (response.intent) {
    case 'navigate':
      return `Mở đúng module hoặc queue liên quan trong ${context.title} để xử lý nhanh hơn`;
    case 'write_draft':
      return `Dùng draft an toàn trước, rồi mới xác nhận thực thi trong ${context.title}`;
    case 'clarify':
      return `Chốt một hướng cụ thể để mình giảm mơ hồ và trả lời sát hơn với ${context.title}`;
    default:
      if (response.entityRef?.label) {
        return `Đọc kỹ context của ${response.entityRef.label} rồi quyết định bước xử lý tiếp theo`;
      }
      return `Dùng phần context hiện tại của ${context.title} để chọn next best action phù hợp`;
  }
}

function toSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
