// Global Copilot types — referenced by domain-router.ts and response-templates.ts

export type CopilotDomain =
  | 'oms'
  | 'inventory'
  | 'fulfillment'
  | 'returns'
  | 'settings'
  | 'unknown'
  | 'inventory_module_2'
  | 'product'
  | 'listing'
  | 'orders'
  | 'warehouse'
  | 'admin_integration'
  | 'qc_support';

export type CopilotIntent =
  | 'query'
  | 'action'
  | 'navigation'
  | 'unknown'
  | 'troubleshooting'
  | 'write_draft'
  | 'write_commit_request'
  | 'policy_qa'
  | 'read';

export interface ClassifiedIntent {
  domain: CopilotDomain;
  intent: CopilotIntent;
  confidence: number;
  keywords: string[];
  riskLevel?: string;
  requiresConfirmation?: boolean;
  redirectToInventoryCopilot?: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GlobalCopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  domain?: CopilotDomain;
  confidence?: number;
}

export interface GlobalCopilotAction {
  type: 'navigate' | 'create_order' | 'update_status' | 'create_return';
  label: string;
  params?: Record<string, string>;
  url?: string;
}
