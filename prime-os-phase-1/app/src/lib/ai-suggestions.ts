// AI Suggestions — stub for AI-powered listing optimization

export interface AiSuggestion {
  id: string;
  field: string;
  type: 'improve_title' | 'optimize_price' | 'add_keywords' | 'fix_image' | 'suggest_bullet';
  confidence: number;
  currentValue?: string;
  suggestedValue: string;
  reason: string;
}

export interface AiSuggestionsResult {
  sku_id: string;
  channel: string;
  suggestions: AiSuggestion[];
}

export function getMockAiSuggestions(_skuId: string): AiSuggestion[] {
  return [];
}
