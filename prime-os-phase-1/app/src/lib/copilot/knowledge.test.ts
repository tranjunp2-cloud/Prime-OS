import { describe, expect, it } from 'vitest';
import { getKnowledgeResponse } from './knowledge';

describe('copilot knowledge pack', () => {
  it('answers assistant capability questions with SaaS guidance', () => {
    const response = getKnowledgeResponse('Assistant này làm được gì?');

    expect(response?.domain).toBe('saas');
    expect(response?.content).toContain('4 lớp việc chính');
    expect(response?.citations).toContain('Safety mode: read-only by default, no silent mutations');
  });

  it('redirects inventory-boundary questions to the dedicated module', () => {
    const response = getKnowledgeResponse('Inventory copilot xử lý ATS và tồn kho như thế nào?');

    expect(response?.domain).toBe('inventory_module_2');
    expect(response?.actions?.[0]).toMatchObject({
      type: 'navigate',
      url: '/inventory',
    });
    expect(response?.content).toContain('đẩy bạn sang luồng inventory chuyên dụng');
  });

  it('avoids hallucinating pricing answers when pricing docs are not loaded', () => {
    const response = getKnowledgeResponse('Gói Growth khác Enterprise ở điểm nào?');

    expect(response?.domain).toBe('saas');
    expect(response?.content).toContain('chưa được nạp vào runtime local này');
    expect(response?.citations).toContain('Pricing matrix is not loaded into the local app runtime');
  });
});
