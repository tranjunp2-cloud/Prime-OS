import { createPrimeAuthHeaders, getPrimeAuthToken, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type GrowthStatus = 'active' | 'watch' | 'ready' | 'needs_approval' | 'approved' | 'new' | 'qualified' | 'engaged' | 'proposal' | 'confirmed' | 'processing' | 'pending' | 'requested' | 'in_progress' | 'connected' | 'setup_required' | 'tested' | 'disconnected';

export interface GrowthMetricSet {
  totalLeads: number;
  qualifiedLeads: number;
  engagedLeads: number;
  convertedCustomers: number;
  conversionRate: number;
  revenueMtd: number;
  serviceBookings: number;
  repeatRevenueRate: number;
  revenueGap: number;
  aiActionsCompleted: number;
}

export interface GrowthModule {
  id: string;
  label: string;
  promise: string;
  status: GrowthStatus;
  color: 'blue' | 'green' | 'pink' | 'orange' | 'purple' | 'teal' | 'violet';
  href: string;
  kpi: string;
  work: string[];
}

export interface GrowthProblem {
  id: string;
  title: string;
  detail: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GrowthFunnelStep {
  id: string;
  label: string;
  count: number;
  rate: number;
  description: string;
}

export interface GrowthLoopStep {
  id: string;
  label: string;
  description: string;
}

export interface GrowthCompetitor {
  type: string;
  examples: string;
  strength: string;
  limitation: string;
  primeDifference: string;
}

export interface GrowthLead {
  id: string;
  company: string;
  contact: string;
  source: string;
  stage: GrowthStatus;
  score: number;
  value: number;
  nextAction: string;
  owner: string;
  dueAt: string;
  lastActivity?: string;
}

export interface GrowthOrder {
  id: string;
  customer: string;
  type: string;
  status: GrowthStatus;
  paymentStatus: string;
  value: number;
  owner: string;
}

export interface GrowthBooking {
  id: string;
  customer: string;
  service: string;
  status: GrowthStatus;
  staff: string;
  scheduledAt: string;
  value: number;
}

export interface GrowthConnector {
  id: string;
  provider: string;
  name: string;
  category: string;
  status: GrowthStatus;
  syncHealth: number;
  lastSync: string;
  direction: 'one_way' | 'two_way';
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  environment: string;
  setupMode: string;
  webhookUrl: string;
  accountRef: string;
  credentialStatus: 'missing' | 'validated' | 'configured' | 'removed';
  maskedCredential: string | null;
  connectedAt: string | null;
  lastTestAt: string | null;
  capabilities: string[];
  requiredFields: string[];
  priorityTier?: 'P0' | 'P1' | 'P2' | 'P3';
  priorityWave?: string;
  businessUseCase?: string;
  credentialHint?: string;
  setupChecklist?: string[];
  adapterProfile?: {
    adapterKey: string;
    eventFamilies: string[];
    requiredScopes: string[];
    webhookEvents: string[];
    testStrategy: string;
    supportsWebhook: boolean;
    supportsOutbound: boolean;
    webhookSecurity?: {
      mode: string;
      description: string;
      header?: string;
      alternateHeaders?: string[];
      field?: string;
      algorithm?: string;
      format?: string;
      required: boolean;
    };
    oauth?: {
      provider: string;
      authorizationUrl: string;
      tokenUrl?: string;
      pkce: boolean;
      scopeSeparator?: string;
      scopes: string[];
      authorizationParams?: Record<string, string>;
    };
    probe?: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      successPath?: string | null;
      description: string;
      probeAdapter?: string;
    };
  };
  credentialMeta?: {
    appId?: string;
    tokenLast4?: string;
    verifyTokenLast4?: string;
  } | null;
  _connectProbe?: {
    ok: boolean;
    httpStatus?: number;
    latencyMs?: number;
    expectedPath?: string | null;
    expectedMatched?: boolean;
    description?: string;
    reason?: string;
    detail?: string;
  };
}

export interface GrowthConnectorReadinessBucket {
  id: string;
  label: string;
  tier?: 'P0' | 'P1' | 'P2' | 'P3' | string | null;
  total: number;
  connected: number;
  tested: number;
  setupRequired: number;
  disconnected: number;
  watch: number;
  genericAdapters: number;
  oauth: number;
  webhook: number;
  probe: number;
  outbound: number;
  coverage: number;
  nextProviders: string[];
}

export interface GrowthConnectorNextSetup {
  provider: string;
  name: string;
  category: string;
  status: GrowthStatus;
  priorityTier: 'P0' | 'P1' | 'P2' | 'P3' | string;
  priorityWave: string;
  setupMode: string;
  requiredFields: string[];
  adapterKey: string;
  needsWebhook: boolean;
  needsOAuth: boolean;
  canProbe: boolean;
}

export interface GrowthConnectorReadinessSummary extends GrowthConnectorReadinessBucket {
  tiers: GrowthConnectorReadinessBucket[];
  categories: GrowthConnectorReadinessBucket[];
  waves: GrowthConnectorReadinessBucket[];
  nextSetup: GrowthConnectorNextSetup[];
}

export interface GrowthConnectorSetupPayload {
  accountRef: string;
  appId: string;
  accessToken: string;
  webhookUrl: string;
  verifyToken: string;
  environment?: string;
}

export interface GrowthConnectorReadinessCheck {
  key: string;
  label: string;
  status: string;
  detail: string;
}

export interface GrowthConnectorOAuthStartPayload {
  accountRef: string;
  appId: string;
  redirectUri: string;
  clientSecret?: string;
  tokenUrl?: string;
  scopes?: string[];
}

export interface GrowthConnectorOAuthSession {
  id: string;
  state: string;
  connectorId: string;
  provider: string;
  adapterKey: string;
  oauthProvider: string;
  accountRef: string;
  appId: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl?: string;
  scopes: string[];
  pkce: boolean;
  status: 'pending' | 'authorization_code_received' | 'token_exchanged' | 'token_exchange_failed' | 'revoked' | 'failed' | 'expired' | string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string | null;
  error?: string | null;
  authorizationCodeLast4?: string | null;
  tokenExchangeStatus?: 'not_started' | 'in_progress' | 'complete' | 'failed' | string;
  tokenType?: string | null;
  accessTokenLast4?: string | null;
  refreshTokenLast4?: string | null;
  tokenExpiresAt?: string | null;
  scopeGranted?: string | null;
  revocationUrl?: string | null;
  revocationStatus?: 'not_started' | 'provider_revoked' | 'local_only' | 'failed' | string;
  revokedAt?: string | null;
}

export interface GrowthConnectorProbeResult {
  ok: boolean;
  checkedAt: string;
  connectorId: string;
  provider: string;
  adapterKey: string;
  probe?: string;
  status: 'ready' | 'watch' | string;
  httpStatus: number;
  latencyMs: number;
  expectedPath?: string | null;
  expectedMatched: boolean;
  responseSummary: {
    keys?: string[];
    type?: string;
  };
}

export interface GrowthConnectorTestResult {
  ok: boolean;
  checkedAt: string;
  connector: GrowthConnector;
  adapterProfile?: GrowthConnector['adapterProfile'];
  readinessChecks?: GrowthConnectorReadinessCheck[];
  result: {
    provider: GrowthConnector['provider'];
    direction: GrowthConnector['direction'];
    inbound: boolean;
    outbound: boolean;
    webhookUrl: string;
    accountRef: string;
  };
  liveProbe?: {
    attempted: boolean;
    ok: boolean;
    reason?: string;
    detail?: string;
    httpStatus?: number;
    latencyMs?: number;
    expectedPath?: string | null;
    expectedMatched?: boolean;
    source?: string;
    description?: string;
    responseKeys?: string[];
  };
}

export interface GrowthConnectorWebhookEvent {
  id: string;
  connectorId: string;
  provider: string;
  category: string;
  adapterKey: string;
  webhookSecurityMode?: string;
  signatureStatus?: 'verified' | 'not_required' | string;
  domainRoute?: 'message' | 'order' | 'payment' | 'workflow' | 'compliance' | 'analytics' | 'connector' | string;
  domainEventId?: string;
  domainRecordId?: string;
  eventType: string;
  externalEventId: string;
  status: string;
  receivedAt: string;
  sourceIp: string;
  payloadPreview: string;
}

export type GrowthConnectorDomain = 'message' | 'order' | 'payment' | 'workflow' | 'compliance' | 'analytics' | 'connector' | string;
export type GrowthConnectorDomainEventStatus = 'routed' | 'retry_pending' | 'dead_letter' | 'requeued' | string;

export interface GrowthConnectorDomainEvent {
  id: string;
  technicalEventId: string;
  domainRecordId?: string;
  connectorId: string;
  provider: string;
  category: string;
  adapterKey: string;
  domain: GrowthConnectorDomain;
  eventType: string;
  externalEventId: string;
  status: GrowthConnectorDomainEventStatus;
  receivedAt: string;
  routedAt?: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  lastError?: string | null;
  deadLetteredAt?: string | null;
  requeuedAt?: string | null;
  payload: Record<string, unknown>;
}

export interface GrowthConnectorDomainEventSummary {
  total: number;
  routed: number;
  retryPending: number;
  deadLetter: number;
  byStatus: Record<string, number>;
  byDomain: Record<string, number>;
}

export interface GrowthConnectorDomainEventsResponse {
  events: GrowthConnectorDomainEvent[];
  summary: GrowthConnectorDomainEventSummary;
}

export interface GrowthConnectorDomainRecord {
  id: string;
  domainEventId: string;
  technicalEventId: string;
  connectorId: string;
  provider: string;
  category: string;
  adapterKey: string;
  domain: GrowthConnectorDomain;
  eventType: string;
  externalEventId: string;
  externalRef: string;
  status: string;
  amount?: number | null;
  currency?: string;
  payload: Record<string, unknown>;
  firstSeenAt: string;
  updatedAt: string;
  threadRef?: string;
  actorRef?: string;
  textPreview?: string;
  orderRef?: string;
  skuRef?: string;
  paymentRef?: string;
  workflowRef?: string;
  action?: string;
  documentRef?: string;
  accountRef?: string;
  metricRef?: string;
}

export interface GrowthConnectorDomainRecordSummary {
  total: number;
  byDomain: Record<string, number>;
}

export interface GrowthConnectorDomainRecordsResponse {
  records: GrowthConnectorDomainRecord[];
  summary: GrowthConnectorDomainRecordSummary;
}

export interface GrowthConnectorSampleWebhookResponse {
  ok: boolean;
  connectorId: string;
  provider: string;
  adapterKey: string;
  signatureMode: string;
  signedHeader: string;
  event: GrowthConnectorWebhookEvent;
  payloadPreview: string;
}

export interface ConnectorHealthItem {
  connectorId: string;
  provider: string;
  name: string;
  category: string;
  status: GrowthStatus;
  syncHealth: number;
  credentialStatus: string;
  lastProbeAt: string | null;
  lastProbeStatus: string;
  lastProbeHttpStatus: number;
  lastProbeSource: string;
  hasCredential: boolean;
  hasOAuth: boolean;
  hasGatewayProbe: boolean;
  hasWebhook: boolean;
  webhookSignatureMode: string;
  credentialHealth: 'healthy' | 'unhealthy' | 'missing_credential' | 'not_monitored' | 'stale' | 'error' | 'unknown';
  credentialHealthCheckedAt: string | null;
  credentialHealthMessage: string | null;
  priorityTier: string;
  priorityWave: string;
}

export interface ConnectorHealthResponse {
  connectors: ConnectorHealthItem[];
  stats: {
    total: number;
    byHealth: Record<string, number>;
    monitorRunning: boolean;
    intervalMs: number;
    lastFullScan: string;
  };
}

export interface WorkerQueueStats {
  stats: {
    total: number;
    activeJobs: number;
    maxConcurrency: number;
    byStatus: Record<string, number>;
    running: boolean;
  };
  deadLetters: Array<{
    id: string;
    type: string;
    status: string;
    attemptCount: number;
    lastError: string | null;
    createdAt: string;
    deadLetteredAt: string | null;
  }>;
}

export interface GrowthAiAction {
  id: string;
  title: string;
  module: string;
  recommendation: string;
  confidence: number;
  status: GrowthStatus;
}

export interface GrowthPackage {
  id: string;
  name: string;
  price: number | null;
  users: number | null;
  summary: string;
  features: string[];
}

export interface GrowthOsSnapshot {
  metrics: GrowthMetricSet;
  modules: GrowthModule[];
  problemCards: GrowthProblem[];
  funnel: GrowthFunnelStep[];
  journeyLoop: GrowthLoopStep[];
  competitors: GrowthCompetitor[];
  leads: GrowthLead[];
  commerceOrders: GrowthOrder[];
  serviceBookings: GrowthBooking[];
  connectors: GrowthConnector[];
  connectorReadiness?: GrowthConnectorReadinessSummary;
  aiActions: GrowthAiAction[];
  packages: GrowthPackage[];
  updatedAt: string;
}

const defaultConnectorRequiredFields = ['accountRef', 'accessToken'];

function createFallbackConnector({
  provider,
  name,
  category,
  status = 'setup_required',
  syncHealth = 0,
  lastSync = 'Not connected',
  direction = 'two_way',
  inboundEnabled = true,
  outboundEnabled = true,
  environment = 'production',
  setupMode = 'API credentials + webhook',
  webhookUrl,
  accountRef = '',
  credentialStatus = 'missing',
  maskedCredential = null,
  connectedAt = null,
  lastTestAt = null,
  capabilities = ['inbound_messages', 'outbound_messages', 'lead_capture', 'webhook_sync'],
  requiredFields = defaultConnectorRequiredFields,
}: {
  provider: string;
  name: string;
  category: string;
  status?: GrowthStatus;
  syncHealth?: number;
  lastSync?: string;
  direction?: GrowthConnector['direction'];
  inboundEnabled?: boolean;
  outboundEnabled?: boolean;
  environment?: string;
  setupMode?: string;
  webhookUrl?: string;
  accountRef?: string;
  credentialStatus?: GrowthConnector['credentialStatus'];
  maskedCredential?: string | null;
  connectedAt?: string | null;
  lastTestAt?: string | null;
  capabilities?: string[];
  requiredFields?: string[];
}): GrowthConnector {
  return {
    id: `connector_${provider.replace(/[^a-z0-9]+/g, '_')}`,
    provider,
    name,
    category,
    status,
    syncHealth,
    lastSync,
    direction,
    inboundEnabled,
    outboundEnabled,
    environment,
    setupMode,
    webhookUrl: webhookUrl || `https://api.primeos.local/webhooks/connectors/${provider}`,
    accountRef,
    credentialStatus,
    maskedCredential,
    connectedAt,
    lastTestAt,
    capabilities,
    requiredFields,
  };
}

export const fallbackGrowthOsSnapshot: GrowthOsSnapshot = {
  metrics: {
    totalLeads: 1258,
    qualifiedLeads: 342,
    engagedLeads: 1000,
    convertedCustomers: 300,
    conversionRate: 30,
    revenueMtd: 285420,
    serviceBookings: 186,
    repeatRevenueRate: 38,
    revenueGap: 71480,
    aiActionsCompleted: 42,
  },
  modules: [
    { id: 'lead-demand', label: 'Lead / CRM', promise: 'Capture all lead sources', status: 'active', color: 'blue', href: '/crm', kpi: '1,258 new leads', work: ['PrimeWeb forms', 'Ads and social', 'Offline and partner leads'] },
    { id: 'crm-follow-up', label: 'CRM & Follow-up', promise: 'Convert leads to customers', status: 'active', color: 'green', href: '/customer/crm-compact', kpi: '342 qualified leads', work: ['Pipeline stages', 'Smart reminders', 'Lead scoring'] },
    { id: 'commerce', label: 'Commerce', promise: 'Sell products and manage transactions', status: 'watch', color: 'pink', href: '/overview?module=cos', kpi: '$285K MTD revenue', work: ['Product sets', 'Live commerce allocation', 'Orders', 'Payment status'] },
    { id: 'service', label: 'Service', promise: 'Bookings, appointments, consultation', status: 'active', color: 'orange', href: '/customer/service', kpi: '186 bookings', work: ['Service packages', 'Staff and resources', 'Service records'] },
    { id: 'integration', label: 'Connectors', promise: 'External platform and compliance connections', status: 'active', color: 'purple', href: '/overview?module=connectors', kpi: '42 connectors', work: ['Connector groups', 'Credential setup', 'Sync monitoring'] },
    { id: 'dashboard', label: 'Dashboard', promise: 'Visibility and performance', status: 'active', color: 'teal', href: '/growth/dashboard', kpi: '6 live KPIs', work: ['Revenue', 'Conversion', 'Retention'] },
    { id: 'ai-agent', label: 'AI Agent', promise: 'Ask, analyze, execute', status: 'active', color: 'violet', href: '/intelligence/consulting-agent?tab=kpi', kpi: '42 actions', work: ['Natural language query', 'Suggested actions', 'Approved automation'] },
  ],
  problemCards: [
    { id: 'scattered-leads', title: 'Leads Are Scattered', detail: 'Ads, website, social, chat, offline, and partners are stored in different places.', impact: 'Lower conversion', severity: 'high' },
    { id: 'inconsistent-follow-up', title: 'Inconsistent Follow-up', detail: 'Slow manual follow-up causes leads to lose interest and move to competitors.', impact: 'Higher acquisition cost', severity: 'high' },
    { id: 'weak-crm-data', title: 'Weak CRM Data', detail: 'Incomplete profiles, missing interaction history, and unstructured data limit conversion.', impact: 'Poor sales context', severity: 'medium' },
    { id: 'disconnected-ops', title: 'Disconnected Teams & Operations', detail: 'Marketing, sales, service, commerce, and finance use different tools and processes.', impact: 'Operational delay', severity: 'high' },
  ],
  funnel: [
    { id: 'generated', label: 'Lead Generated', count: 1258, rate: 100, description: 'From ads, website, social, chat, events, and partners.' },
    { id: 'qualified', label: 'Lead Qualified', count: 342, rate: 27, description: 'Interested, potential, and worth following up.' },
    { id: 'engaged', label: 'Engaged & Followed Up', count: 1000, rate: 79, description: 'Conversations, meetings, proposals, and reminders.' },
    { id: 'converted', label: 'Converted to Customer', count: 300, rate: 30, description: 'Deals won, purchases made, or services booked.' },
    { id: 'retained', label: 'Retain & Re-engage', count: 114, rate: 38, description: 'Repeat purchases, referrals, and long-term growth.' },
  ],
  journeyLoop: [
    { id: 'attract', label: 'Attract', description: 'Capture leads from all channels and campaigns.' },
    { id: 'convert', label: 'Convert', description: 'Qualify, engage, and convert leads to customers.' },
    { id: 'delight', label: 'Delight', description: 'Deliver great experiences with service, support, and value.' },
    { id: 'retain', label: 'Retain', description: 'Build loyalty and keep customers coming back.' },
    { id: 'grow', label: 'Grow', description: 'Increase upsell, cross-sell, referrals, and lifetime value.' },
  ],
  competitors: [
    { type: 'CRM', examples: 'Salesforce, HubSpot, Zoho CRM', strength: 'Manages sales pipeline, customer data, and activities.', limitation: 'Lacks operations, service, commerce, and AI across the full journey.', primeDifference: 'Connects lead, sales, service, commerce, operations, reporting, and AI in one platform.' },
    { type: 'ERP', examples: 'SAP, Oracle, NetSuite', strength: 'Manages operations, finance, inventory, procurement, and HR.', limitation: 'Heavy, expensive, and not focused on customer growth.', primeDifference: 'Modular, growth-focused, easier to adopt, and connected with customer-facing systems.' },
    { type: 'Booking Tool', examples: 'Calendly, Acuity, SimplyBook.me', strength: 'Excellent at appointment and schedule management.', limitation: 'Limited CRM, follow-up, conversion, and lifecycle management.', primeDifference: 'Booking connects with CRM, follow-up, payments, and customer journey.' },
  ],
  leads: [
    { id: 'lead_001', company: 'DataPro Systems', contact: 'Sarah Lee', source: 'PrimeWeb', stage: 'proposal', score: 92, value: 25500, nextAction: 'Send revised proposal', owner: 'Alex Johnson', dueAt: 'Today 14:00' },
    { id: 'lead_002', company: 'Bright Solutions', contact: 'Minh Tran', source: 'Facebook Ads', stage: 'qualified', score: 86, value: 18200, nextAction: 'Discovery call', owner: 'Sarah Lee', dueAt: 'Today 16:30' },
    { id: 'lead_003', company: 'TechNova Ltd.', contact: 'Michael Chen', source: 'Partner', stage: 'engaged', score: 78, value: 19200, nextAction: 'Share implementation plan', owner: 'Alex Johnson', dueAt: 'Tomorrow 10:00' },
  ],
  commerceOrders: [
    { id: 'ord_001', customer: 'Global Corp.', type: 'Product', status: 'confirmed', paymentStatus: 'paid', value: 35000, owner: 'Operation Team' },
    { id: 'ord_002', customer: 'Peak Performance', type: 'Product', status: 'processing', paymentStatus: 'partial', value: 28500, owner: 'Operation Team' },
    { id: 'ord_003', customer: 'SecureOps', type: 'Product', status: 'pending', paymentStatus: 'unpaid', value: 22000, owner: 'Sales Team' },
  ],
  serviceBookings: [
    { id: 'book_001', customer: 'Visionary Inc.', service: 'Growth Consultation', status: 'confirmed', staff: 'Consulting Team', scheduledAt: 'Today 15:00', value: 1800 },
    { id: 'book_002', customer: 'Alpha Industries', service: 'Implementation Workshop', status: 'requested', staff: 'Unassigned', scheduledAt: 'Tomorrow 09:30', value: 4200 },
    { id: 'book_003', customer: 'GreenTech Co.', service: 'CRM Cleanup Sprint', status: 'in_progress', staff: 'Service Team', scheduledAt: 'Now', value: 2600 },
  ],
  connectors: [
    createFallbackConnector({ provider: 'whatsapp', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'WhatsApp', category: 'Messaging', setupMode: 'API credentials + webhook' }),
    createFallbackConnector({ provider: 'messenger', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Messenger', category: 'Messaging', setupMode: 'Page token + webhook' }),
    createFallbackConnector({ provider: 'wechat', requiredFields: ['accountRef', 'appId', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'WeChat', category: 'Messaging', setupMode: 'Official Account API' }),
    createFallbackConnector({ provider: 'telegram', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Telegram', category: 'Messaging', setupMode: 'Bot token + webhook' }),
    createFallbackConnector({ provider: 'line', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'LINE', category: 'Messaging', setupMode: 'Channel token + webhook' }),
    createFallbackConnector({ provider: 'zalo', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Zalo', category: 'Messaging', setupMode: 'Official Account API' }),
    createFallbackConnector({ provider: 'viber', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Viber', category: 'Messaging', setupMode: 'Bot API + webhook' }),
    createFallbackConnector({ provider: 'gmail', requiredFields: ['accountRef', 'appId', 'accessToken'], name: 'Gmail', category: 'Email', setupMode: 'OAuth client + mailbox sync' }),
    createFallbackConnector({ provider: 'outlook', requiredFields: ['accountRef', 'appId', 'accessToken'], name: 'Outlook', category: 'Email', setupMode: 'Microsoft OAuth + mailbox sync' }),
    createFallbackConnector({ provider: 'facebook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Facebook', category: 'Social', setupMode: 'Page token + webhook' }),
    createFallbackConnector({ provider: 'instagram', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Instagram', category: 'Social', setupMode: 'Business account + token' }),
    createFallbackConnector({ provider: 'tiktok', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'TikTok', category: 'Social', setupMode: 'Business API + webhook' }),
    createFallbackConnector({ provider: 'linkedin', requiredFields: ['accountRef', 'accessToken', 'webhookUrl'], name: 'LinkedIn', category: 'Social', setupMode: 'Organization API + webhook' }),
    createFallbackConnector({ provider: 'x', requiredFields: ['accountRef', 'accessToken', 'webhookUrl'], name: 'X', category: 'Social', setupMode: 'API key + webhook' }),
    createFallbackConnector({ provider: 'youtube', requiredFields: ['accountRef', 'appId', 'accessToken'], name: 'YouTube', category: 'Social', setupMode: 'OAuth client + channel sync' }),
    createFallbackConnector({ provider: 'meta_ads', name: 'Meta Ads', category: 'Ads', direction: 'one_way', outboundEnabled: false, setupMode: 'Marketing API token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createFallbackConnector({ provider: 'google_ads', name: 'Google Ads', category: 'Ads', direction: 'one_way', outboundEnabled: true, setupMode: 'OAuth client + developer token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import'], requiredFields: ['accountRef', 'appId', 'accessToken', 'verifyToken'] }),
    createFallbackConnector({ provider: 'tiktok_ads', name: 'TikTok Ads', category: 'Ads', direction: 'one_way', outboundEnabled: false, setupMode: 'Business API token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createFallbackConnector({ provider: 'linkedin_ads', name: 'LinkedIn Ads', category: 'Ads', direction: 'one_way', outboundEnabled: false, setupMode: 'Marketing API token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createFallbackConnector({ provider: 'hubspot', requiredFields: ['accountRef', 'accessToken', 'webhookUrl'], name: 'HubSpot', category: 'CRM', setupMode: 'Private app token + webhook', capabilities: ['contacts_sync', 'deals_sync', 'timeline_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'salesforce', requiredFields: ['accountRef', 'accessToken'], name: 'Salesforce', category: 'CRM', setupMode: 'Connected app OAuth', capabilities: ['contacts_sync', 'deals_sync', 'timeline_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'zoho_crm', requiredFields: ['accountRef', 'accessToken', 'webhookUrl'], name: 'Zoho CRM', category: 'CRM', setupMode: 'OAuth client + webhook', capabilities: ['contacts_sync', 'deals_sync', 'timeline_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'shopify', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Shopify', category: 'Commerce', setupMode: 'Admin API token + webhook', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'woocommerce', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'WooCommerce', category: 'Commerce', setupMode: 'REST key + webhook', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'shopee', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Shopee', category: 'Commerce', setupMode: 'Partner API credentials', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'lazada', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Lazada', category: 'Commerce', setupMode: 'Seller API credentials', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'amazon', requiredFields: ['accountRef', 'appId', 'accessToken', 'verifyToken'], name: 'Amazon', category: 'Commerce', setupMode: 'Selling Partner API', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'tiktok_shop', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'TikTok Shop', category: 'Commerce', setupMode: 'Shop API credentials', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'myinvois', requiredFields: ['accountRef', 'appId', 'accessToken', 'verifyToken'], name: 'Malaysia MyInvois', category: 'Compliance', direction: 'one_way', inboundEnabled: false, outboundEnabled: true, environment: 'sandbox', setupMode: 'Taxpayer credentials + certificate vault', capabilities: ['tin_validation', 'document_submission', 'submission_polling', 'document_cancel', 'credit_note_flow'] }),
    createFallbackConnector({ provider: 'stripe', name: 'Stripe', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'Restricted key + webhook', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createFallbackConnector({ provider: 'paypal', name: 'PayPal', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'REST app credentials', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'appId', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createFallbackConnector({ provider: 'vnpay', name: 'VNPay', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'Merchant credentials + IPN', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createFallbackConnector({ provider: 'momo', name: 'MoMo', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'Partner credentials + IPN', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createFallbackConnector({ provider: 'google_analytics', name: 'Google Analytics', category: 'Analytics', direction: 'one_way', outboundEnabled: false, setupMode: 'OAuth client + property sync', capabilities: ['analytics_sync', 'conversion_import'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createFallbackConnector({ provider: 'search_console', name: 'Search Console', category: 'Analytics', direction: 'one_way', outboundEnabled: false, setupMode: 'OAuth client + property sync', capabilities: ['analytics_sync'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createFallbackConnector({ provider: 'mixpanel', name: 'Mixpanel', category: 'Analytics', direction: 'one_way', outboundEnabled: false, setupMode: 'Service account token', capabilities: ['analytics_sync'] }),
    createFallbackConnector({ provider: 'google_sheets', name: 'Google Sheets', category: 'Productivity', direction: 'one_way', outboundEnabled: false, setupMode: 'OAuth client + sheet sync', capabilities: ['sheet_sync', 'lead_import'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createFallbackConnector({ provider: 'airtable', name: 'Airtable', category: 'Productivity', direction: 'one_way', outboundEnabled: false, setupMode: 'Personal access token', capabilities: ['table_sync', 'lead_import'] }),
    createFallbackConnector({ provider: 'slack', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'], name: 'Slack', category: 'Productivity', setupMode: 'Bot token + event webhook', capabilities: ['notifications', 'lead_alerts', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'notion', name: 'Notion', category: 'Productivity', direction: 'one_way', outboundEnabled: false, setupMode: 'Integration token', capabilities: ['database_sync'], requiredFields: ['accountRef', 'accessToken'] }),
    createFallbackConnector({ provider: 'zapier', requiredFields: ['accountRef', 'webhookUrl', 'verifyToken'], name: 'Zapier', category: 'Automation', setupMode: 'Webhook endpoint', capabilities: ['workflow_trigger', 'webhook_sync'] }),
    createFallbackConnector({ provider: 'make', requiredFields: ['accountRef', 'webhookUrl'], name: 'Make', category: 'Automation', setupMode: 'Webhook endpoint', capabilities: ['workflow_trigger', 'webhook_sync'] }),
  ],
  aiActions: [
    { id: 'ai_001', title: 'Prioritize 24 high-score leads', module: 'CRM & Sales', recommendation: 'Assign same-day follow-up to leads with score above 85 and value above $15K.', confidence: 91, status: 'ready' },
    { id: 'ai_002', title: 'Reconnect cold proposal leads', module: 'AI Agent', recommendation: 'Send personalized re-engagement message to 18 proposal leads with no activity in 7 days.', confidence: 84, status: 'needs_approval' },
    { id: 'ai_003', title: 'Fix WhatsApp sync mapping', module: 'Integration', recommendation: 'Normalize phone fields before import to reduce duplicate lead creation.', confidence: 79, status: 'needs_approval' },
  ],
  packages: [
    { id: 'free-trial', name: 'Free / Trial', price: 0, users: 2, summary: 'Demo access and small-seller evaluation.', features: ['Basic CRM', 'Product list', 'Limited dashboard', 'Demo connectors'] },
    { id: 'starter', name: 'Starter', price: 49, users: 3, summary: 'For SME sellers starting structured commerce ops.', features: ['Product master', 'Basic inventory', 'Order sync', 'Basic CRM'] },
    { id: 'growth', name: 'Growth', price: 199, users: 10, summary: 'For multi-channel sellers running campaigns and live commerce.', features: ['Marketplace integration', 'Product sets', 'Live commerce allocation', 'Campaign inventory', 'Advanced dashboard'] },
    { id: 'pro-enterprise', name: 'Pro / Enterprise', price: null, users: null, summary: 'For brands, agencies, and KOL networks that need scale and governance.', features: ['AI agent', 'Advanced reporting', 'Custom integration', 'Approval flow', 'Priority support'] },
  ],
  updatedAt: '2026-06-04T04:40:00.000Z',
};

async function requestGrowthOs(path: string, init?: RequestInit) {
  const backendBase = resolvePrimeBackendBase();
  const response = await fetch(`${backendBase}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || `PrimeOS Growth API failed: ${response.status}`);
  }

  return response.json();
}

function createGrowthJsonHeaders(token: string) {
  const headers = createPrimeAuthHeaders(token);
  headers.set('Content-Type', 'application/json');
  return headers;
}

export async function fetchGrowthOsSnapshot(): Promise<GrowthOsSnapshot> {
  try {
    return await requestGrowthOs('/api/public/growth-os');
  } catch {
    return fallbackGrowthOsSnapshot;
  }
}

export async function createGrowthLead(payload: Pick<GrowthLead, 'company' | 'contact' | 'source'> & Partial<GrowthLead>) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to create a lead.');
  }

  return requestGrowthOs('/api/growth-os/leads', {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthLead>;
}

export async function updateGrowthLeadStage(
  leadId: string,
  payload: { stage: GrowthStatus; nextAction?: string; dueAt?: string },
) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to move a lead stage.');
  }

  return requestGrowthOs(`/api/growth-os/leads/${encodeURIComponent(leadId)}/stage`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthLead>;
}

export async function logGrowthLeadFollowUp(
  leadId: string,
  payload: { note?: string; nextAction?: string; dueAt?: string } = {},
) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to log follow-up.');
  }

  return requestGrowthOs(`/api/growth-os/leads/${encodeURIComponent(leadId)}/follow-up`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthLead>;
}

export async function testGrowthConnector(connectorId: string, payload: GrowthConnectorSetupPayload) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to test a connector.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/test`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthConnectorTestResult>;
}

export async function probeGrowthConnector(connectorId: string, payload: { state?: string } = {}) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to run connector probes.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/probe`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthConnectorProbeResult>;
}

export async function startGrowthConnectorOAuthSetup(connectorId: string, payload: GrowthConnectorOAuthStartPayload) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to start OAuth setup.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/oauth/start`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthConnectorOAuthSession>;
}

export async function fetchGrowthConnectorOAuthSession(connectorId: string, state: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to view OAuth setup status.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/oauth/sessions/${encodeURIComponent(state)}`, {
    headers: createPrimeAuthHeaders(token),
  }) as Promise<GrowthConnectorOAuthSession>;
}

export async function refreshGrowthConnectorOAuthToken(connectorId: string, state: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to refresh OAuth tokens.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/oauth/sessions/${encodeURIComponent(state)}/refresh`, {
    method: 'POST',
    headers: createPrimeAuthHeaders(token),
  }) as Promise<{ ok: boolean; connector: GrowthConnector; session: GrowthConnectorOAuthSession }>;
}

export async function revokeGrowthConnectorOAuthToken(connectorId: string, state: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to revoke OAuth tokens.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/oauth/sessions/${encodeURIComponent(state)}/revoke`, {
    method: 'POST',
    headers: createPrimeAuthHeaders(token),
  }) as Promise<{ ok: boolean; providerCalled: boolean; connector: GrowthConnector; session: GrowthConnectorOAuthSession }>;
}

export async function connectGrowthConnector(connectorId: string, payload: GrowthConnectorSetupPayload) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to connect a channel.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/connect`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthConnector>;
}

export async function disconnectGrowthConnector(connectorId: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to disconnect a channel.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/disconnect`, {
    method: 'POST',
    headers: createPrimeAuthHeaders(token),
  }) as Promise<GrowthConnector>;
}

export async function fetchGrowthConnectorEvents(connectorId: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to view connector events.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/events`, {
    headers: createPrimeAuthHeaders(token),
  }) as Promise<{ events: GrowthConnectorWebhookEvent[] }>;
}

export async function createGrowthConnectorSampleWebhook(connectorId: string, payload: { domain?: string } = {}) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to generate connector sample webhooks.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/sample-webhook`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<GrowthConnectorSampleWebhookResponse>;
}

export async function fetchGrowthConnectorDomainEvents(connectorId: string, filters: { domain?: string; status?: string } = {}) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to view connector domain events.');
  }

  const params = new URLSearchParams();
  if (filters.domain && filters.domain !== 'all') params.set('domain', filters.domain);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  const query = params.toString();

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/domain-events${query ? `?${query}` : ''}`, {
    headers: createPrimeAuthHeaders(token),
  }) as Promise<GrowthConnectorDomainEventsResponse>;
}

export async function fetchGrowthConnectorDomainRecords(connectorId: string, filters: { domain?: string } = {}) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to view connector domain records.');
  }

  const params = new URLSearchParams();
  if (filters.domain && filters.domain !== 'all') params.set('domain', filters.domain);
  const query = params.toString();

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/domain-records${query ? `?${query}` : ''}`, {
    headers: createPrimeAuthHeaders(token),
  }) as Promise<GrowthConnectorDomainRecordsResponse>;
}

export async function retryGrowthConnectorDomainEvent(connectorId: string, eventId: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to retry connector domain events.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/domain-events/${encodeURIComponent(eventId)}/retry`, {
    method: 'POST',
    headers: createPrimeAuthHeaders(token),
  }) as Promise<{ event: GrowthConnectorDomainEvent }>;
}

export async function deadLetterGrowthConnectorDomainEvent(connectorId: string, eventId: string, reason = 'Marked from connector console.') {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to dead-letter connector domain events.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/domain-events/${encodeURIComponent(eventId)}/dead-letter`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify({ reason }),
  }) as Promise<{ event: GrowthConnectorDomainEvent }>;
}

export async function requeueGrowthConnectorDomainEvent(connectorId: string, eventId: string, reason = 'Requeued from connector console.') {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to requeue connector domain events.');
  }

  return requestGrowthOs(`/api/growth-os/connectors/${encodeURIComponent(connectorId)}/domain-events/${encodeURIComponent(eventId)}/requeue`, {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify({ reason }),
  }) as Promise<{ event: GrowthConnectorDomainEvent }>;
}

export async function approveGrowthAiAction(actionId: string) {
  const token = getPrimeAuthToken();
  if (!token) {
    throw new Error('Login is required to approve AI actions.');
  }

  return requestGrowthOs(`/api/growth-os/ai-actions/${actionId}/approve`, {
    method: 'POST',
    headers: createPrimeAuthHeaders(token),
  }) as Promise<GrowthAiAction>;
}

export async function fetchConnectorHealth() {
  try {
    return await requestGrowthOs('/api/growth-os/connectors/health') as ConnectorHealthResponse;
  } catch {
    return { connectors: [], stats: { total: 0, byHealth: {}, monitorRunning: false, intervalMs: 0, lastFullScan: '' } };
  }
}

export async function fetchWorkerQueueStats() {
  const token = getPrimeAuthToken();
  if (!token) throw new Error('Login required.');
  return requestGrowthOs('/api/admin/worker-queue', {
    headers: createPrimeAuthHeaders(token),
  }) as Promise<WorkerQueueStats>;
}

export async function requeueWorkerDeadLetter(jobId?: string) {
  const token = getPrimeAuthToken();
  if (!token) throw new Error('Login required.');
  return requestGrowthOs('/api/admin/worker-queue/dead-letters/requeue', {
    method: 'POST',
    headers: createGrowthJsonHeaders(token),
    body: JSON.stringify({ jobId }),
  }) as Promise<{ ok: boolean; requeued?: number; job?: unknown }>;
}
