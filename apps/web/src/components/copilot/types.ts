export type CopilotDomain =
  | 'dashboard'
  | 'product'
  | 'listing'
  | 'warehouse'
  | 'orders'
  | 'fulfillment'
  | 'returns'
  | 'inventory'
  | 'settings'
  | 'saas'
  | 'routing_config'
  | 'qc_support'
  | 'admin_integration'
  | 'inventory_module_2'
  | 'unknown';

export type CopilotIntent =
  | 'read'
  | 'explain_concept'
  | 'navigate'
  | 'write_draft'
  | 'write_commit_request'
  | 'troubleshooting'
  | 'policy_qa'
  | 'clarify';

export type RiskLevel = 'low' | 'medium' | 'high';
export type CopilotConfidenceBucket = 'high' | 'medium' | 'low';
export type CopilotGroundingSource = 'local_store' | 'route_context' | 'knowledge_base' | 'session_memory' | 'draft_prefill';

export type UserRole = 'owner_admin' | 'ops' | 'ba' | 'qc' | 'viewer';

export type SaasPlan = 'essential' | 'growth' | 'enterprise';

export interface UserContext {
  userId: string;
  role: UserRole;
  plan: SaasPlan;
  locale: 'vi-VN' | 'ja-JP' | 'en-US';
}

export interface ClassifiedIntent {
  domain: CopilotDomain;
  intent: CopilotIntent;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  redirectToInventoryCopilot?: boolean;
}

export interface CopilotQuickPrompt {
  label: string;
  prompt: string;
}

export interface CopilotEntityRef {
  entityType: 'order' | 'product' | 'warehouse' | 'fulfillment_job' | 'return';
  entityId: string;
  label: string;
}

export interface CopilotContextSummary {
  domain: CopilotDomain;
  title: string;
  description: string;
  insight?: string;
  citations: string[];
  quickPrompts: CopilotQuickPrompt[];
}

export interface GlobalCopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  domain?: CopilotDomain;
  intent?: CopilotIntent;
  actions?: GlobalCopilotAction[];
  draft?: DraftObject;
  citations?: string[];
  followUpPrompts?: CopilotQuickPrompt[];
  entityRef?: CopilotEntityRef;
  grounding?: CopilotGroundingMeta;
  debug?: CopilotDebugMeta;
}

export interface CopilotCommandRef {
  commandId: string;
  commandName: string;
  target: { entityType: string };
  risk: RiskLevel;
  requiresConfirmation: true;
  idempotencyKey: string;
  policyTags: string[];
}

export interface GlobalCopilotAction {
  type: 'navigate' | 'open_module' | 'confirm_draft' | 'cancel_draft' | 'copy';
  label: string;
  description?: string;
  url?: string;
  draftId?: string;
  value?: string;
  emphasis?: 'primary' | 'secondary';
  command?: CopilotCommandRef;
}

export interface DraftObject {
  draftType:
    | 'create_product'
    | 'update_product'
    | 'create_listing'
    | 'update_listing'
    | 'update_routing_config'
    | 'order_action'
    | 'seed_demo_data';
  tenantId: string;
  requestedBy: {
    userId: string;
    role: UserRole;
    plan: SaasPlan;
  };
  target: {
    entityType: string;
    entityId?: string;
  };
  changes: Record<string, unknown>;
  risk: RiskLevel;
  requiresConfirmation: true;
  guardrailsApplied: string[];
}

export interface GlobalCopilotState {
  isOpen: boolean;
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  pendingDraft: DraftObject | null;
}

export interface CopilotDebugMeta {
  selectedStrategy: string;
  confidenceBucket: CopilotConfidenceBucket;
  promptedClarify: boolean;
  fellBack: boolean;
  usedConversationMemory: boolean;
}

export interface CopilotGroundingMeta {
  sources: CopilotGroundingSource[];
  citations: string[];
  retrievedAt: string;
  freshness: 'live_session' | 'seed_snapshot' | 'static_knowledge' | 'unknown';
  confidence: CopilotConfidenceBucket;
  policyTags: string[];
}

export interface CopilotTelemetry {
  totalAssistantMessages: number;
  clarifyCount: number;
  fallbackCount: number;
  lastIntent?: CopilotIntent;
  lastStrategy?: string;
  lastConfidenceBucket?: CopilotConfidenceBucket;
}

export interface CopilotResponse {
  content: string;
  actions?: GlobalCopilotAction[];
  citations?: string[];
  domain?: CopilotDomain;
  intent?: CopilotIntent;
  followUpPrompts?: CopilotQuickPrompt[];
  entityRef?: CopilotEntityRef;
  grounding?: CopilotGroundingMeta;
  debug?: CopilotDebugMeta;
}

export interface QuickPromptCategory {
  domain: CopilotDomain;
  label: string;
  prompts: string[];
}
