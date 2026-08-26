import type { CopilotDomain, CopilotIntent } from '@/components/copilot/types';

export interface CopilotEvalCase {
  id: string;
  locale: 'vi-VN' | 'en-US' | 'ja-JP';
  pathname: string;
  prompt: string;
  expectedDomain: CopilotDomain;
  expectedIntent: CopilotIntent;
  requiredPolicyTag?: string;
}

export const COPILOT_EVAL_MATRIX: CopilotEvalCase[] = [
  {
    id: 'vi-orders-pending',
    locale: 'vi-VN',
    pathname: '/orders',
    prompt: 'Cho mình danh sách order đang pending',
    expectedDomain: 'orders',
    expectedIntent: 'navigate',
    requiredPolicyTag: 'no-mutation',
  },
  {
    id: 'vi-product-draft-hitl',
    locale: 'vi-VN',
    pathname: '/products',
    prompt: 'Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001',
    expectedDomain: 'product',
    expectedIntent: 'write_draft',
    requiredPolicyTag: 'draft-before-commit',
  },
  {
    id: 'vi-inventory-boundary',
    locale: 'vi-VN',
    pathname: '/inventory',
    prompt: 'ATS và tồn kho khả dụng đang như nào?',
    expectedDomain: 'inventory_module_2',
    expectedIntent: 'policy_qa',
    requiredPolicyTag: 'no-mutation',
  },
  {
    id: 'en-capabilities',
    locale: 'en-US',
    pathname: '/orders',
    prompt: 'What can you help with?',
    expectedDomain: 'saas',
    expectedIntent: 'read',
    requiredPolicyTag: 'no-mutation',
  },
  {
    id: 'vi-product-attributes-explanation',
    locale: 'vi-VN',
    pathname: '/products/categories',
    prompt: 'attributes là gì?',
    expectedDomain: 'product',
    expectedIntent: 'explain_concept',
    requiredPolicyTag: 'no-mutation',
  },
  {
    id: 'en-product-category-explanation',
    locale: 'en-US',
    pathname: '/products/categories',
    prompt: 'What are product categories used for?',
    expectedDomain: 'product',
    expectedIntent: 'explain_concept',
    requiredPolicyTag: 'no-mutation',
  },
];
