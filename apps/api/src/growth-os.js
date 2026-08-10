import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { emit, on } from './event-bus.js';
import { enqueue } from './worker-queue.js';

const now = '2026-06-04T04:40:00.000Z';
const defaultConnectorRequiredFields = ['accountRef', 'accessToken'];
const CONNECTORS_STORE_PATH = path.resolve(process.env.PRIME_CONNECTORS_STORE_PATH || path.join('data', 'connectors.json'));
const CONNECTOR_EVENTS_STORE_PATH = path.resolve(process.env.PRIME_CONNECTOR_EVENTS_STORE_PATH || path.join('data', 'connector-webhook-events.json'));
const CONNECTOR_DOMAIN_EVENTS_STORE_PATH = path.resolve(process.env.PRIME_CONNECTOR_DOMAIN_EVENTS_STORE_PATH || path.join('data', 'connector-domain-events.json'));
const CONNECTOR_DOMAIN_RECORDS_STORE_PATH = path.resolve(process.env.PRIME_CONNECTOR_DOMAIN_RECORDS_STORE_PATH || path.join('data', 'connector-domain-records.json'));
const CONNECTOR_OAUTH_SESSIONS_STORE_PATH = path.resolve(process.env.PRIME_CONNECTOR_OAUTH_SESSIONS_STORE_PATH || path.join('data', 'connector-oauth-sessions.json'));
const CONNECTOR_CREDENTIAL_VAULT_STORE_PATH = path.resolve(process.env.PRIME_CONNECTOR_CREDENTIAL_VAULT_STORE_PATH || path.join('data', 'connector-credential-vault.json'));
const CONNECTOR_DOMAIN_EVENT_MAX_ATTEMPTS = Math.max(1, Number(process.env.PRIME_CONNECTOR_DOMAIN_EVENT_MAX_ATTEMPTS || 3) || 3);
const CONNECTOR_OAUTH_SESSION_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.PRIME_CONNECTOR_OAUTH_SESSION_TTL_MS || 15 * 60 * 1000) || 15 * 60 * 1000);
const DEFAULT_CONNECTOR_WORKSPACE_ID = process.env.PRIME_WORKSPACE_ID || 'ws_primeos_local';

const defaultConnectorReadiness = {
  priorityTier: 'P3',
  priorityWave: 'Wave 4 - Long tail',
  businessUseCase: 'Available through the generic connector setup flow.',
  credentialHint: 'Account reference and access token or API key.',
  setupChecklist: ['Collect account reference', 'Add access credential', 'Run test connection', 'Connect when validated'],
};
const connectorDomainRecordNames = ['message', 'order', 'payment', 'workflow', 'compliance', 'analytics', 'connector'];

const connectorReadinessByProvider = {
  whatsapp: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Messaging and social capture',
    businessUseCase: 'Primary customer chat and lead capture channel for BD demos.',
    credentialHint: 'Business account ID, permanent access token, webhook callback URL.',
    setupChecklist: ['Confirm Meta business and phone number', 'Create webhook callback', 'Add permanent token', 'Test inbound and outbound message events'],
  },
  messenger: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Messaging and social capture',
    businessUseCase: 'Facebook page inbox, lead capture, and campaign response routing.',
    credentialHint: 'Page ID, page access token, webhook callback URL.',
    setupChecklist: ['Confirm page admin access', 'Generate page token', 'Subscribe page webhook', 'Test message and lead events'],
  },
  instagram: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Messaging and social capture',
    businessUseCase: 'Instagram DM/comment capture for creator and live commerce flows.',
    credentialHint: 'Business account ID and long-lived token.',
    setupChecklist: ['Confirm business account', 'Link page permissions', 'Add long-lived token', 'Test media/message sync'],
  },
  facebook: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Messaging and social capture',
    businessUseCase: 'Facebook page, comment, lead, and campaign response capture.',
    credentialHint: 'Page ID, page token, webhook callback URL.',
    setupChecklist: ['Confirm page admin access', 'Create webhook subscription', 'Add token', 'Test page events'],
  },
  tiktok: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Messaging and social capture',
    businessUseCase: 'TikTok social signals, creator campaign proof, and live selling demand signals.',
    credentialHint: 'Business account reference, API token, webhook callback URL.',
    setupChecklist: ['Confirm business app access', 'Add API token', 'Configure webhook', 'Test social event pull'],
  },
  zalo: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Messaging and social capture',
    businessUseCase: 'Vietnam customer chat and official account lead capture.',
    credentialHint: 'Official Account ID and access token.',
    setupChecklist: ['Confirm OA admin access', 'Generate OA token', 'Map customer identity fields', 'Test inbound chat events'],
  },
  shopee: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Commerce and live selling',
    businessUseCase: 'Marketplace order, customer, product, and campaign stock sync.',
    credentialHint: 'Seller/shop reference and partner access token.',
    setupChecklist: ['Confirm seller account', 'Collect partner credentials', 'Map shop ID', 'Test orders and product sync'],
  },
  lazada: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Commerce and live selling',
    businessUseCase: 'Marketplace order, customer, product, and campaign stock sync.',
    credentialHint: 'Seller account reference and seller API token.',
    setupChecklist: ['Confirm seller account', 'Collect seller API credential', 'Map product identifiers', 'Test order sync'],
  },
  tiktok_shop: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Commerce and live selling',
    businessUseCase: 'TikTok Shop live selling order and stock allocation sync.',
    credentialHint: 'Shop account reference and shop API token.',
    setupChecklist: ['Confirm shop access', 'Collect shop API credential', 'Map SKUs', 'Test order and inventory sync'],
  },
  shopify: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Commerce and live selling',
    businessUseCase: 'Owned storefront order, customer, product, and webhook sync.',
    credentialHint: 'Shop domain/account reference, admin API token, webhook URL.',
    setupChecklist: ['Confirm store admin access', 'Create admin API token', 'Configure order/product webhooks', 'Test product and order sync'],
  },
  stripe: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Payments',
    businessUseCase: 'Payment proof, settlement status, refund visibility, and finance handoff.',
    credentialHint: 'Stripe account reference, restricted key, webhook URL.',
    setupChecklist: ['Create restricted key', 'Configure webhook endpoint', 'Select payment/refund events', 'Test payment sync'],
  },
  vnpay: {
    priorityTier: 'P0',
    priorityWave: 'Wave 1 - Payments',
    businessUseCase: 'Vietnam payment status and IPN proof for OMS release.',
    credentialHint: 'Merchant reference, merchant secret/API key, IPN URL.',
    setupChecklist: ['Confirm merchant account', 'Add merchant credential', 'Configure IPN callback', 'Test payment notification'],
  },
  line: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Regional messaging',
    businessUseCase: 'LINE chat and campaign response for Japan/SEA customers.',
    credentialHint: 'Channel ID, channel access token, webhook URL.',
    setupChecklist: ['Create LINE channel', 'Add channel token', 'Configure webhook', 'Test message events'],
  },
  telegram: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Regional messaging',
    businessUseCase: 'Bot-based chat support and internal demo inbox.',
    credentialHint: 'Bot username/account reference and bot token.',
    setupChecklist: ['Create bot', 'Add bot token', 'Map bot identity', 'Test inbound and outbound messages'],
  },
  gmail: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Email and productivity',
    businessUseCase: 'Lead, support, and proposal mailbox sync.',
    credentialHint: 'Mailbox reference and OAuth access credential.',
    setupChecklist: ['Create OAuth client', 'Grant mailbox scope', 'Add token', 'Test mailbox sync'],
  },
  outlook: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Email and productivity',
    businessUseCase: 'Microsoft mailbox sync for enterprise accounts.',
    credentialHint: 'Mailbox reference and Microsoft OAuth credential.',
    setupChecklist: ['Create Microsoft app', 'Grant Graph scopes', 'Add token', 'Test mailbox sync'],
  },
  google_sheets: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Email and productivity',
    businessUseCase: 'Import/export lightweight sales, product, and operations sheets.',
    credentialHint: 'Sheet/workspace reference and OAuth token.',
    setupChecklist: ['Create OAuth client', 'Grant Sheets scope', 'Map spreadsheet', 'Test sheet read/write'],
  },
  slack: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Email and productivity',
    businessUseCase: 'Ops alerts and approval notifications into team channels.',
    credentialHint: 'Workspace/channel reference, bot token, event webhook URL.',
    setupChecklist: ['Create Slack app', 'Install bot token', 'Configure event webhook', 'Test alert delivery'],
  },
  paypal: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Payments and compliance',
    businessUseCase: 'Payment and refund sync for international sellers.',
    credentialHint: 'PayPal merchant reference and REST app credential.',
    setupChecklist: ['Create REST app', 'Add credential', 'Configure webhook', 'Test payment sync'],
  },
  momo: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Payments and compliance',
    businessUseCase: 'Vietnam wallet payment proof and IPN release signal.',
    credentialHint: 'Partner reference and partner credential.',
    setupChecklist: ['Confirm partner account', 'Add credential', 'Configure IPN', 'Test payment notification'],
  },
  myinvois: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Payments and compliance',
    businessUseCase: 'Malaysia e-invoice compliance readiness and finance proof.',
    credentialHint: 'Taxpayer TIN/entity reference, client ID, client secret or certificate reference.',
    setupChecklist: ['Confirm taxpayer entity', 'Prepare sandbox credentials', 'Store certificate reference', 'Test submission status callback'],
  },
  meta_ads: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Ads and analytics',
    businessUseCase: 'Campaign spend, lead capture, and conversion import for Meta.',
    credentialHint: 'Ad account reference and Marketing API token.',
    setupChecklist: ['Confirm ad account access', 'Add marketing token', 'Map campaign IDs', 'Test campaign sync'],
  },
  tiktok_ads: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Ads and analytics',
    businessUseCase: 'TikTok ad campaign and conversion signal sync.',
    credentialHint: 'Advertiser account reference and Business API token.',
    setupChecklist: ['Confirm advertiser account', 'Add business token', 'Map campaign IDs', 'Test campaign sync'],
  },
  google_analytics: {
    priorityTier: 'P1',
    priorityWave: 'Wave 2 - Ads and analytics',
    businessUseCase: 'Owned-site performance and conversion analytics.',
    credentialHint: 'GA property reference and OAuth credential.',
    setupChecklist: ['Confirm GA property', 'Create OAuth client', 'Add token', 'Test analytics sync'],
  },
  woocommerce: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Commerce expansion',
    businessUseCase: 'Owned storefront sync for WordPress commerce sellers.',
    credentialHint: 'Store URL/account reference, REST key, webhook URL.',
    setupChecklist: ['Confirm store admin access', 'Create REST key', 'Configure webhook', 'Test order/product sync'],
  },
  amazon: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Commerce expansion',
    businessUseCase: 'Amazon seller product and order sync for expansion markets.',
    credentialHint: 'Seller account reference and Selling Partner API token.',
    setupChecklist: ['Confirm seller access', 'Add SP-API credential', 'Map marketplace', 'Test order sync'],
  },
  youtube: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Content and ads expansion',
    businessUseCase: 'Video/channel performance for creator proof.',
    credentialHint: 'Channel reference and OAuth token.',
    setupChecklist: ['Create OAuth client', 'Grant channel scope', 'Add token', 'Test channel sync'],
  },
  google_ads: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Content and ads expansion',
    businessUseCase: 'Google campaign spend, conversion, and lead source sync.',
    credentialHint: 'Customer account reference, OAuth credential, developer token.',
    setupChecklist: ['Confirm manager/customer account', 'Add OAuth credential', 'Map developer token as app ID', 'Test campaign sync'],
  },
  linkedin_ads: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Content and ads expansion',
    businessUseCase: 'B2B paid campaign and lead source sync.',
    credentialHint: 'Ad account reference and Marketing API token.',
    setupChecklist: ['Confirm ad account access', 'Add marketing token', 'Map campaigns', 'Test lead sync'],
  },
  notion: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Productivity expansion',
    businessUseCase: 'Sync lightweight implementation notes or partner databases.',
    credentialHint: 'Workspace/database reference and integration token.',
    setupChecklist: ['Create integration', 'Share database', 'Add token', 'Test database sync'],
  },
  zapier: {
    priorityTier: 'P2',
    priorityWave: 'Wave 3 - Productivity expansion',
    businessUseCase: 'Generic workflow handoff for quick client pilots.',
    credentialHint: 'Zap/workspace reference and webhook endpoint.',
    setupChecklist: ['Create Zap webhook', 'Copy endpoint', 'Map event payload', 'Test workflow trigger'],
  },
  wechat: {
    priorityTier: 'P3',
    priorityWave: 'Wave 4 - Regional expansion',
    businessUseCase: 'WeChat official account messaging for China-facing use cases.',
    credentialHint: 'Official account reference and API token.',
    setupChecklist: ['Confirm official account', 'Add token', 'Map identity fields', 'Test message sync'],
  },
  viber: {
    priorityTier: 'P3',
    priorityWave: 'Wave 4 - Regional expansion',
    businessUseCase: 'Additional regional messaging support.',
    credentialHint: 'Bot account reference and bot token.',
    setupChecklist: ['Create bot', 'Add token', 'Map webhook if available', 'Test message sync'],
  },
};

const connectorPriorityTierOrder = ['P0', 'P1', 'P2', 'P3'];
const connectorPriorityTierLabels = {
  P0: 'Do first',
  P1: 'Do second',
  P2: 'Expansion',
  P3: 'Long tail',
};
const connectorPriorityWaveOrder = [
  'Wave 1 - Messaging and social capture',
  'Wave 1 - Commerce and live selling',
  'Wave 1 - Payments',
  'Wave 2 - Regional messaging',
  'Wave 2 - Email and productivity',
  'Wave 2 - Payments and compliance',
  'Wave 2 - Ads and analytics',
  'Wave 3 - Commerce expansion',
  'Wave 3 - Content and ads expansion',
  'Wave 3 - Productivity expansion',
  'Wave 4 - Regional expansion',
  'Wave 4 - Long tail',
];

const defaultConnectorAdapterProfile = {
  adapterKey: 'generic_rest_connector',
  eventFamilies: ['setup_check', 'sync_ping'],
  requiredScopes: ['account_reference', 'credential_validation'],
  webhookEvents: ['connector.ping'],
  testStrategy: 'Validate setup fields and store encrypted demo credential. Provider API calls require a provider adapter.',
  supportsWebhook: false,
  supportsOutbound: false,
  webhookSecurity: {
    mode: 'none',
    description: 'No provider-specific webhook signature configured.',
    required: false,
  },
};

const webhookSecurityProfiles = {
  metaHubSignature: {
    mode: 'meta_hub_signature',
    description: 'GET hub challenge plus X-Hub-Signature-256 HMAC-SHA256 validation.',
    header: 'x-hub-signature-256',
    algorithm: 'sha256',
    format: 'hex_prefixed',
    required: true,
  },
  stripeSignature: {
    mode: 'stripe_signature',
    description: 'Stripe-Signature timestamped HMAC-SHA256 validation.',
    header: 'stripe-signature',
    algorithm: 'sha256',
    format: 'stripe_v1',
    required: true,
  },
  shopifyHmac: {
    mode: 'shopify_hmac',
    description: 'X-Shopify-Hmac-Sha256 base64 HMAC-SHA256 validation.',
    header: 'x-shopify-hmac-sha256',
    algorithm: 'sha256',
    format: 'base64',
    required: true,
  },
  woocommerceHmac: {
    mode: 'woocommerce_hmac',
    description: 'X-WC-Webhook-Signature base64 HMAC-SHA256 validation with the WooCommerce webhook secret.',
    header: 'x-wc-webhook-signature',
    algorithm: 'sha256',
    format: 'base64',
    required: true,
  },
  commerceHmac: {
    mode: 'commerce_hmac_sha256',
    description: 'Provider webhook HMAC-SHA256 validation for commerce payloads.',
    header: 'x-primeos-signature',
    alternateHeaders: ['x-shopee-signature', 'x-lazada-signature', 'x-tts-signature'],
    algorithm: 'sha256',
    format: 'hex',
    required: true,
  },
  socialHmac: {
    mode: 'social_hmac_sha256',
    description: 'Provider webhook HMAC-SHA256 validation for social payloads.',
    header: 'x-primeos-signature',
    alternateHeaders: ['x-zalo-signature', 'x-tiktok-signature'],
    algorithm: 'sha256',
    format: 'hex',
    required: true,
  },
  lineHmac: {
    mode: 'line_hmac_sha256',
    description: 'X-Line-Signature base64 HMAC-SHA256 validation with the LINE channel secret.',
    header: 'x-line-signature',
    algorithm: 'sha256',
    format: 'base64',
    required: true,
  },
  slackSignature: {
    mode: 'slack_signature',
    description: 'X-Slack-Signature HMAC-SHA256 validation over version, timestamp, and raw body.',
    header: 'x-slack-signature',
    timestampHeader: 'x-slack-request-timestamp',
    algorithm: 'sha256',
    format: 'slack_v0',
    required: true,
  },
  telegramSecretToken: {
    mode: 'shared_secret_header',
    description: 'X-Telegram-Bot-Api-Secret-Token shared secret validation.',
    header: 'x-telegram-bot-api-secret-token',
    format: 'plaintext_header',
    required: true,
  },
  momoHmac: {
    mode: 'payment_hmac_sha256',
    description: 'Payment provider HMAC-SHA256 validation for IPN payloads.',
    header: 'x-primeos-signature',
    alternateHeaders: ['x-momo-signature'],
    algorithm: 'sha256',
    format: 'hex',
    required: true,
  },
  providerApiSignature: {
    mode: 'provider_api_signature',
    description: 'Provider API signature verification required when the production adapter is enabled.',
    required: false,
  },
  optionalWebhookSecret: {
    mode: 'optional_webhook_secret',
    description: 'Optional shared secret or provider signature check to be enforced by the production adapter.',
    required: false,
  },
  vnpayIpn: {
    mode: 'vnpay_ipn_hash',
    description: 'VNPay IPN vnp_SecureHash HMAC-SHA512 validation over sorted vnp_ fields.',
    field: 'vnp_SecureHash',
    algorithm: 'sha512',
    format: 'vnpay_query_hash',
    required: true,
  },
};

const oauthProfiles = {
  google: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revocationUrl: 'https://oauth2.googleapis.com/revoke',
    pkce: true,
    scopeSeparator: ' ',
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  microsoft: {
    provider: 'microsoft',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    pkce: true,
    scopeSeparator: ' ',
    authorizationParams: {
      response_mode: 'query',
    },
  },
  slack: {
    provider: 'slack',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    revocationUrl: 'https://slack.com/api/auth.revoke',
    pkce: false,
    scopeSeparator: ',',
  },
  notion: {
    provider: 'notion',
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    pkce: false,
    scopeSeparator: ' ',
    authorizationParams: {
      owner: 'user',
    },
  },
  linkedin: {
    provider: 'linkedin',
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    revocationUrl: 'https://www.linkedin.com/oauth/v2/revoke',
    pkce: true,
    scopeSeparator: ' ',
  },
};

function createOAuthProfile(provider, scopes = [], overrides = {}) {
  const profile = oauthProfiles[provider];
  if (!profile) return null;
  return {
    ...profile,
    ...overrides,
    scopes,
    authorizationParams: {
      ...(profile.authorizationParams || {}),
      ...(overrides.authorizationParams || {}),
    },
  };
}

function createProbeProfile({ method = 'GET', url, headers = {}, body = null, successPath = null, description, probeAdapter = 'generic_rest' }) {
  return { method, url, headers, body, successPath, description, probeAdapter };
}

const connectorAdapterProfilesByProvider = {
  whatsapp: {
    adapterKey: 'meta_whatsapp_cloud',
    eventFamilies: ['message', 'lead', 'delivery'],
    requiredScopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
    webhookEvents: ['messages', 'message_template_status_update', 'phone_number_name_update'],
    testStrategy: 'Validate business account, token shape, webhook URL, and required Meta messaging scopes.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.metaHubSignature,
    probe: createProbeProfile({
      url: 'meta_graph://whatsapp/{accountRef}',
      successPath: 'id',
      description: 'Calls Facebook Graph API v21.0 to verify WhatsApp business account token and access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  messenger: {
    adapterKey: 'meta_messenger_page',
    eventFamilies: ['message', 'lead', 'comment'],
    requiredScopes: ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement'],
    webhookEvents: ['messages', 'messaging_postbacks', 'leadgen', 'feed'],
    testStrategy: 'Validate page reference, page token, webhook URL, and page subscription readiness.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.metaHubSignature,
    probe: createProbeProfile({
      url: 'meta_graph://messenger/{accountRef}',
      successPath: 'id',
      description: 'Calls Facebook Graph API v21.0 to verify Messenger page token and page access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  facebook: {
    adapterKey: 'meta_facebook_page',
    eventFamilies: ['lead', 'comment', 'page_event'],
    requiredScopes: ['pages_manage_metadata', 'pages_read_engagement', 'leads_retrieval'],
    webhookEvents: ['leadgen', 'feed', 'mention'],
    testStrategy: 'Validate page reference, page token, webhook URL, and lead/comment subscriptions.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.metaHubSignature,
    probe: createProbeProfile({
      url: 'meta_graph://facebook/{accountRef}',
      successPath: 'id',
      description: 'Calls Facebook Graph API v21.0 to verify Facebook page token and page access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  instagram: {
    adapterKey: 'meta_instagram_business',
    eventFamilies: ['message', 'comment', 'media'],
    requiredScopes: ['instagram_basic', 'instagram_manage_messages', 'pages_show_list'],
    webhookEvents: ['messages', 'comments', 'mentions'],
    testStrategy: 'Validate business account reference, token, and Instagram graph permissions.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.metaHubSignature,
    probe: createProbeProfile({
      url: 'meta_graph://instagram/{accountRef}',
      successPath: 'id',
      description: 'Calls Facebook Graph API v21.0 to verify Instagram business account token and access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  tiktok: {
    adapterKey: 'tiktok_business_social',
    eventFamilies: ['social_signal', 'creator_signal', 'live_signal'],
    requiredScopes: ['business_account.read', 'video.list', 'comment.list'],
    webhookEvents: ['comment.created', 'live.event', 'creator.signal'],
    testStrategy: 'Validate business account reference, token, webhook URL, and social signal scopes.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.socialHmac,
  },
  zalo: {
    adapterKey: 'zalo_official_account',
    eventFamilies: ['message', 'lead', 'profile'],
    requiredScopes: ['oa.message', 'oa.profile'],
    webhookEvents: ['user_send_text', 'follow', 'unfollow'],
    testStrategy: 'Validate Official Account reference, token, and OA message permission.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.socialHmac,
    probe: createProbeProfile({
      url: 'zalo_oa://getprofile/{accountRef}',
      successPath: 'data',
      description: 'Calls Zalo Official Account API getprofile to verify OA token and access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  shopee: {
    adapterKey: 'shopee_partner',
    eventFamilies: ['order', 'product', 'inventory', 'customer'],
    requiredScopes: ['shop_info', 'orders', 'products', 'logistics'],
    webhookEvents: ['order_status_update', 'item_update', 'inventory_update'],
    testStrategy: 'Validate shop reference, partner credential, product/order scopes, and SKU mapping readiness.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.commerceHmac,
    probe: createProbeProfile({
      url: 'shopee_partner://shop/get_profile/{accountRef}',
      successPath: 'data',
      description: 'Calls Shopee Partner API shop/get_profile to verify partner token and shop access (HMAC-signed).',
      probeAdapter: 'connector_gateway',
    }),
  },
  lazada: {
    adapterKey: 'lazada_seller',
    eventFamilies: ['order', 'product', 'inventory', 'customer'],
    requiredScopes: ['seller_info', 'orders', 'products', 'fulfillment'],
    webhookEvents: ['order_status_update', 'product_update', 'stock_update'],
    testStrategy: 'Validate seller reference, seller credential, order/product scopes, and SKU mapping readiness.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.commerceHmac,
    probe: createProbeProfile({
      url: 'lazada_seller://seller/get/{accountRef}',
      successPath: 'data',
      description: 'Calls Lazada Seller API seller/get to verify seller token and access (HMAC-signed).',
      probeAdapter: 'connector_gateway',
    }),
  },
  tiktok_shop: {
    adapterKey: 'tiktok_shop',
    eventFamilies: ['order', 'product', 'inventory', 'live_session'],
    requiredScopes: ['shop.info', 'order.list', 'product.list', 'inventory.update'],
    webhookEvents: ['order_status_update', 'product_update', 'stock_update'],
    testStrategy: 'Validate shop reference, shop token, order/product scopes, and live allocation mapping.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.commerceHmac,
    probe: createProbeProfile({
      url: 'tiktok_shop://authorization/shops/{accountRef}',
      successPath: 'data',
      description: 'Calls TikTok Shop API authorization/shops to verify shop token and access (HMAC-signed).',
      probeAdapter: 'connector_gateway',
    }),
  },
  shopify: {
    adapterKey: 'shopify_admin',
    eventFamilies: ['order', 'product', 'inventory', 'customer'],
    requiredScopes: ['read_orders', 'read_products', 'read_inventory', 'read_customers'],
    webhookEvents: ['orders/create', 'orders/paid', 'products/update', 'inventory_levels/update'],
    testStrategy: 'Validate store reference, admin token, webhook URL, and admin API scopes.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.shopifyHmac,
    probe: createProbeProfile({
      url: 'shopify_admin://shop.json/{accountRef}',
      successPath: 'shop',
      description: 'Calls Shopify Admin API shop.json to verify store token and admin scope access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  stripe: {
    adapterKey: 'stripe_payments',
    eventFamilies: ['payment', 'refund', 'dispute'],
    requiredScopes: ['payment_intents.read', 'charges.read', 'refunds.read'],
    webhookEvents: ['payment_intent.succeeded', 'charge.refunded', 'charge.dispute.created'],
    testStrategy: 'Validate account reference, restricted key, webhook URL, and payment/refund event subscription.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.stripeSignature,
    probe: createProbeProfile({
      url: 'stripe://v1/balance',
      successPath: 'available',
      description: 'Calls Stripe API v1/balance to verify restricted key and payment account access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  vnpay: {
    adapterKey: 'vnpay_ipn',
    eventFamilies: ['payment', 'refund'],
    requiredScopes: ['merchant_ipn'],
    webhookEvents: ['payment.completed', 'payment.failed', 'refund.updated'],
    testStrategy: 'Validate merchant reference, credential, IPN URL, and payment notification signature readiness.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.vnpayIpn,
    probe: createProbeProfile({
      url: 'vnpay://ipn_readiness/{accountRef}',
      successPath: null,
      description: 'VNPay does not expose a query API. IPN readiness is validated through generated signed sample webhooks and signature hash verification.',
      probeAdapter: 'connector_gateway',
    }),
  },
  line: {
    adapterKey: 'line_messaging_channel',
    eventFamilies: ['message', 'follow', 'profile'],
    requiredScopes: ['message.read', 'message.write', 'profile.read'],
    webhookEvents: ['message', 'follow', 'unfollow', 'postback'],
    testStrategy: 'Validate channel reference, channel access token, webhook URL, and LINE channel secret for signed callbacks.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.lineHmac,
    probe: createProbeProfile({
      url: 'line_bot://bot/info',
      successPath: 'userId',
      description: 'Calls LINE Messaging API bot/info to verify channel access token and bot profile.',
      probeAdapter: 'connector_gateway',
    }),
  },
  telegram: {
    adapterKey: 'telegram_bot',
    eventFamilies: ['message', 'command', 'callback_query'],
    requiredScopes: ['bot_token', 'webhook_secret_token'],
    webhookEvents: ['message', 'edited_message', 'callback_query'],
    testStrategy: 'Validate bot token shape, webhook URL, and Telegram secret token header readiness.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.telegramSecretToken,
  },
  gmail: {
    adapterKey: 'google_gmail_oauth',
    eventFamilies: ['mailbox', 'thread', 'lead'],
    requiredScopes: ['gmail.readonly', 'gmail.modify'],
    webhookEvents: ['history.watch', 'message.created'],
    testStrategy: 'Validate OAuth client reference, mailbox reference, token shape, and mailbox sync scope plan.',
    supportsWebhook: false,
    supportsOutbound: false,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('google', ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify']),
    probe: createProbeProfile({
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      successPath: 'emailAddress',
      description: 'Calls Gmail users.me.profile to confirm mailbox token and Gmail scope.',
    }),
  },
  outlook: {
    adapterKey: 'microsoft_graph_mail',
    eventFamilies: ['mailbox', 'thread', 'lead'],
    requiredScopes: ['Mail.Read', 'Mail.ReadWrite', 'offline_access'],
    webhookEvents: ['message.created', 'message.updated'],
    testStrategy: 'Validate Microsoft app reference, mailbox reference, token shape, and Graph mailbox scopes.',
    supportsWebhook: false,
    supportsOutbound: false,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('microsoft', ['offline_access', 'https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Mail.ReadWrite']),
    probe: createProbeProfile({
      url: 'https://graph.microsoft.com/v1.0/me/messages?$top=1',
      successPath: 'value',
      description: 'Calls Microsoft Graph messages with Mail.Read scope.',
    }),
  },
  google_sheets: {
    adapterKey: 'google_sheets_oauth',
    eventFamilies: ['sheet', 'row', 'lead_import'],
    requiredScopes: ['spreadsheets.readonly', 'spreadsheets'],
    webhookEvents: ['sheet.sync_requested'],
    testStrategy: 'Validate OAuth client reference, spreadsheet reference, token shape, and read/write scope plan.',
    supportsWebhook: false,
    supportsOutbound: true,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('google', ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/spreadsheets']),
    probe: createProbeProfile({
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{accountRef}?fields=spreadsheetId,properties.title',
      successPath: 'spreadsheetId',
      description: 'Calls Sheets spreadsheets.get to verify spreadsheet access.',
    }),
  },
  slack: {
    adapterKey: 'slack_bot_events',
    eventFamilies: ['notification', 'approval', 'lead_alert'],
    requiredScopes: ['chat:write', 'channels:read', 'commands'],
    webhookEvents: ['event_callback', 'slash_command', 'interactive_component'],
    testStrategy: 'Validate workspace/channel reference, bot token, event webhook URL, and Slack signing secret.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.slackSignature,
    oauth: createOAuthProfile('slack', ['chat:write', 'channels:read', 'commands']),
    probe: createProbeProfile({
      url: 'https://slack.com/api/auth.test',
      successPath: 'ok',
      description: 'Calls Slack auth.test to verify bot token/workspace access.',
    }),
  },
  paypal: {
    adapterKey: 'paypal_rest_webhooks',
    eventFamilies: ['payment', 'refund', 'dispute'],
    requiredScopes: ['payments.read', 'refunds.read', 'webhook.verify'],
    webhookEvents: ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.REFUNDED', 'CUSTOMER.DISPUTE.CREATED'],
    testStrategy: 'Validate merchant reference, REST app credential, webhook URL, and webhook ID for provider API signature verification.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.providerApiSignature,
    probe: createProbeProfile({
      url: 'paypal_rest://v1/identity/oauth2/userinfo',
      successPath: 'user_id',
      description: 'Calls PayPal REST API userinfo to verify REST app credential and merchant identity (auto-detects sandbox).',
      probeAdapter: 'connector_gateway',
    }),
  },
  momo: {
    adapterKey: 'momo_partner_ipn',
    eventFamilies: ['payment', 'refund'],
    requiredScopes: ['partner_ipn', 'payment_status'],
    webhookEvents: ['payment.completed', 'payment.failed', 'refund.updated'],
    testStrategy: 'Validate partner reference, partner credential, IPN URL, and HMAC signature secret readiness.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.momoHmac,
    probe: createProbeProfile({
      url: 'momo://ipn_readiness/{accountRef}',
      successPath: null,
      description: 'MoMo does not expose a query API. Partner IPN readiness is validated through generated signed sample webhooks and HMAC signature verification.',
      probeAdapter: 'connector_gateway',
    }),
  },
  myinvois: {
    adapterKey: 'malaysia_myinvois_compliance',
    eventFamilies: ['tin_validation', 'document_submission', 'submission_status'],
    requiredScopes: ['einvoice.submit', 'einvoice.status', 'taxpayer.validate'],
    webhookEvents: ['submission.accepted', 'submission.rejected', 'document.cancelled'],
    testStrategy: 'Validate taxpayer reference, sandbox client credential, certificate reference, and submission status polling plan.',
    supportsWebhook: false,
    supportsOutbound: true,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
  },
  meta_ads: {
    adapterKey: 'meta_marketing_api',
    eventFamilies: ['campaign', 'lead', 'conversion'],
    requiredScopes: ['ads_read', 'leads_retrieval', 'business_management'],
    webhookEvents: ['leadgen', 'ad_account_update'],
    testStrategy: 'Validate ad account reference, Marketing API token, webhook URL, and leadgen subscription readiness.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.metaHubSignature,
    probe: createProbeProfile({
      url: 'meta_ads://me/adaccounts',
      successPath: 'data',
      description: 'Calls Facebook Graph API me/adaccounts to verify Marketing API token and ad account access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  tiktok_ads: {
    adapterKey: 'tiktok_ads_business_api',
    eventFamilies: ['campaign', 'lead', 'conversion'],
    requiredScopes: ['advertiser.read', 'campaign.read', 'report.read'],
    webhookEvents: ['lead.created', 'campaign.updated', 'conversion.synced'],
    testStrategy: 'Validate advertiser reference, Business API token, webhook URL, and conversion signal scope plan.',
    supportsWebhook: true,
    supportsOutbound: false,
    webhookSecurity: webhookSecurityProfiles.socialHmac,
    probe: createProbeProfile({
      url: 'tiktok_ads://oauth2/advertiser/get/',
      successPath: 'data',
      description: 'Calls TikTok Business API advertiser/get to verify advertiser token and ad account access.',
      probeAdapter: 'connector_gateway',
    }),
  },
  google_analytics: {
    adapterKey: 'google_analytics_data_api',
    eventFamilies: ['analytics', 'conversion', 'traffic_source'],
    requiredScopes: ['analytics.readonly'],
    webhookEvents: ['property.sync_requested'],
    testStrategy: 'Validate GA property reference, OAuth client reference, token shape, and reporting scope plan.',
    supportsWebhook: false,
    supportsOutbound: false,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('google', ['https://www.googleapis.com/auth/analytics.readonly']),
    probe: createProbeProfile({
      method: 'POST',
      url: 'https://analyticsdata.googleapis.com/v1beta/properties/{accountRef}:runReport',
      body: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      },
      successPath: 'metadata',
      description: 'Calls GA Data runReport to verify analytics property access.',
    }),
  },
  wechat: {
    adapterKey: 'wechat_official_account',
    eventFamilies: ['message', 'follow', 'profile'],
    requiredScopes: ['official_account.message', 'official_account.user'],
    webhookEvents: ['text', 'event.subscribe', 'event.unsubscribe'],
    testStrategy: 'Validate official account reference, app credential, callback URL, and server verification token readiness.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.optionalWebhookSecret,
  },
  viber: {
    adapterKey: 'viber_bot_api',
    eventFamilies: ['message', 'conversation_started', 'delivery'],
    requiredScopes: ['bot.send_message', 'bot.receive_message'],
    webhookEvents: ['message', 'conversation_started', 'delivered', 'seen'],
    testStrategy: 'Validate bot reference, bot token, webhook URL, and callback secret readiness.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.optionalWebhookSecret,
  },
  youtube: {
    adapterKey: 'youtube_data_api',
    eventFamilies: ['channel', 'video', 'comment', 'analytics'],
    requiredScopes: ['youtube.readonly', 'yt-analytics.readonly'],
    webhookEvents: ['channel.sync_requested', 'video.list_requested'],
    testStrategy: 'Validate channel reference, OAuth client reference, access token, and channel/analytics scope plan.',
    supportsWebhook: false,
    supportsOutbound: false,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('google', ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly']),
    probe: createProbeProfile({
      url: 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      successPath: 'items',
      description: 'Calls YouTube channels.list mine=true to verify channel token access.',
    }),
  },
  google_ads: {
    adapterKey: 'google_ads_api',
    eventFamilies: ['campaign', 'lead', 'conversion', 'spend'],
    requiredScopes: ['adwords'],
    webhookEvents: ['campaign.sync_requested', 'conversion.upload_requested'],
    testStrategy: 'Validate customer account reference, OAuth client reference, refresh/access token, and developer token.',
    supportsWebhook: false,
    supportsOutbound: true,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('google', ['https://www.googleapis.com/auth/adwords']),
    probe: createProbeProfile({
      url: 'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
      successPath: 'resourceNames',
      description: 'Calls Google Ads listAccessibleCustomers to verify Ads API token access.',
    }),
  },
  linkedin_ads: {
    adapterKey: 'linkedin_marketing_api',
    eventFamilies: ['campaign', 'lead', 'conversion', 'report'],
    requiredScopes: ['r_ads', 'rw_ads', 'r_ads_reporting', 'r_organization_social'],
    webhookEvents: ['lead.sync_requested', 'campaign.report_requested'],
    testStrategy: 'Validate ad account reference, app reference, Marketing API token, and reporting scope plan.',
    supportsWebhook: false,
    supportsOutbound: false,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('linkedin', ['r_ads', 'rw_ads', 'r_ads_reporting', 'r_organization_social']),
    probe: createProbeProfile({
      url: 'https://api.linkedin.com/v2/adAccounts?q=search',
      successPath: 'elements',
      description: 'Calls LinkedIn Marketing adAccounts search to verify marketing API access.',
    }),
  },
  woocommerce: {
    adapterKey: 'woocommerce_rest',
    eventFamilies: ['order', 'product', 'inventory', 'customer'],
    requiredScopes: ['read_orders', 'read_products', 'read_customers'],
    webhookEvents: ['order.created', 'order.updated', 'product.updated', 'customer.created'],
    testStrategy: 'Validate store URL, REST API credential, webhook URL, and WooCommerce webhook secret.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.woocommerceHmac,
  },
  amazon: {
    adapterKey: 'amazon_selling_partner_api',
    eventFamilies: ['order', 'product', 'inventory', 'settlement'],
    requiredScopes: ['orders.read', 'inventory.read', 'catalog.read', 'notifications.read'],
    webhookEvents: ['ORDER_CHANGE', 'ANY_OFFER_CHANGED', 'FEED_PROCESSING_FINISHED'],
    testStrategy: 'Validate seller reference, SP-API app reference, LWA refresh/access credential, and notification destination plan.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.providerApiSignature,
  },
  notion: {
    adapterKey: 'notion_integration',
    eventFamilies: ['database', 'page', 'implementation_note'],
    requiredScopes: ['database.read', 'database.write', 'page.read'],
    webhookEvents: ['database.sync_requested'],
    testStrategy: 'Validate workspace/database reference, integration token, and shared database access.',
    supportsWebhook: false,
    supportsOutbound: true,
    webhookSecurity: defaultConnectorAdapterProfile.webhookSecurity,
    oauth: createOAuthProfile('notion', []),
    probe: createProbeProfile({
      url: 'https://api.notion.com/v1/users/me',
      headers: { 'Notion-Version': '2022-06-28' },
      successPath: 'id',
      description: 'Calls Notion users.me to verify integration token access.',
    }),
  },
  zapier: {
    adapterKey: 'zapier_webhook',
    eventFamilies: ['workflow_trigger', 'lead_handoff', 'ops_handoff'],
    requiredScopes: ['webhook.invoke'],
    webhookEvents: ['zap.triggered', 'zap.failed'],
    testStrategy: 'Validate Zap webhook endpoint, workspace reference, and optional shared secret handoff.',
    supportsWebhook: true,
    supportsOutbound: true,
    webhookSecurity: webhookSecurityProfiles.optionalWebhookSecret,
  },
};

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function deriveEncryptionKey() {
  const secret = process.env.PRIME_SESSION_SECRET || 'prime-os-local-dev-session-secret-change-me';
  const salt = 'primeos-connector-credential-salt-2026';
  return scryptSync(secret, salt, KEY_LENGTH);
}

function encryptCredential(plaintext) {
  if (!plaintext) return null;
  const key = deriveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64url'),
    data: encrypted.toString('base64url'),
    tag: authTag.toString('base64url'),
  };
}

export function decryptCredential(encrypted) {
  if (!encrypted || !encrypted.data) return null;
  try {
    const key = deriveEncryptionKey();
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(encrypted.iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.data, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

function getConnectorWorkspaceId(_connector = null) {
  return DEFAULT_CONNECTOR_WORKSPACE_ID;
}

function loadConnectorCredentialVault() {
  try {
    if (!fs.existsSync(CONNECTOR_CREDENTIAL_VAULT_STORE_PATH)) return [];
    const raw = fs.readFileSync(CONNECTOR_CREDENTIAL_VAULT_STORE_PATH, 'utf-8');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((entry) => entry?.id && entry?.connectorId && entry?.type && entry?.encryptedCredential)
      .slice(0, 1000);
  } catch (error) {
    console.error('[growth-os] Failed to load connector credential vault: ' + error.message);
    return [];
  }
}

function saveConnectorCredentialVault() {
  try {
    const dir = path.dirname(CONNECTOR_CREDENTIAL_VAULT_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONNECTOR_CREDENTIAL_VAULT_STORE_PATH, JSON.stringify(connectorCredentialVault.slice(0, 1000), null, 2), 'utf-8');
  } catch (error) {
    console.error('[growth-os] Failed to save connector credential vault: ' + error.message);
  }
}

function migrateConnectorCredentialMetaToVault(connector) {
  const meta = connector.credentialMeta || {};
  let migrated = false;
  const migrations = [
    { encryptedKey: 'encryptedToken', refKey: 'tokenRef', type: 'access_token' },
    { encryptedKey: 'encryptedRefreshToken', refKey: 'refreshTokenRef', type: 'oauth_refresh_token' },
    { encryptedKey: 'encryptedVerifyToken', refKey: 'verifyTokenRef', type: 'webhook_secret' },
    { encryptedKey: 'encryptedClientSecret', refKey: 'clientSecretRef', type: 'oauth_client_secret' },
  ];

  for (const migration of migrations) {
    if (meta[migration.refKey] || !meta[migration.encryptedKey]) continue;
    const value = decryptCredential(meta[migration.encryptedKey]);
    if (!value) continue;
    meta[migration.refKey] = storeConnectorCredential({
      connector,
      type: migration.type,
      value,
      environment: connector.environment,
      sessionId: meta.oauthStateLast4 || null,
    });
    delete meta[migration.encryptedKey];
    migrated = true;
  }

  if (migrated) {
    meta.vaultWorkspaceId = getConnectorWorkspaceId(connector);
    connector.credentialMeta = meta;
  }
}

function findCredentialVaultEntry(ref) {
  if (!ref) return null;
  return connectorCredentialVault.find((entry) => entry.id === ref && entry.status !== 'revoked') || null;
}

function storeConnectorCredential({ connector, type, value, environment, sessionId = null }) {
  if (!value) return null;
  const timestamp = new Date().toISOString();
  const workspaceId = getConnectorWorkspaceId(connector);
  const existing = connectorCredentialVault.find((entry) => (
    entry.workspaceId === workspaceId &&
    entry.connectorId === connector.id &&
    entry.type === type &&
    entry.environment === (environment || connector.environment || 'production') &&
    (entry.sessionId || null) === (sessionId || null) &&
    entry.status !== 'revoked'
  ));
  const entry = existing || {
    id: `ccv_${Date.now().toString(36)}_${connectorCredentialVault.length + 1}`,
    workspaceId,
    connectorId: connector.id,
    provider: connector.provider,
    environment: environment || connector.environment || 'production',
    type,
    sessionId,
    createdAt: timestamp,
    status: 'active',
  };

  entry.encryptedCredential = encryptCredential(value);
  entry.last4 = String(value).slice(-4);
  entry.updatedAt = timestamp;
  entry.status = 'active';

  if (!existing) {
    connectorCredentialVault.unshift(entry);
    if (connectorCredentialVault.length > 1000) {
      connectorCredentialVault.length = 1000;
    }
  }
  saveConnectorCredentialVault();
  return entry.id;
}

function decryptVaultCredential(ref) {
  const entry = findCredentialVaultEntry(ref);
  return entry ? decryptCredential(entry.encryptedCredential) : null;
}

function revokeVaultCredential(ref, timestamp = new Date().toISOString()) {
  const entry = findCredentialVaultEntry(ref);
  if (!entry) return false;
  entry.status = 'revoked';
  entry.revokedAt = timestamp;
  entry.encryptedCredential = null;
  saveConnectorCredentialVault();
  return true;
}

function getSessionCredential(session, type) {
  const refByType = {
    accessToken: session?.accessTokenRef,
    refreshToken: session?.refreshTokenRef,
    clientSecret: session?.clientSecretRef,
    codeVerifier: session?.codeVerifierRef,
  };
  const encryptedByType = {
    accessToken: session?.encryptedAccessToken,
    refreshToken: session?.encryptedRefreshToken,
    clientSecret: session?.encryptedClientSecret,
    codeVerifier: session?.encryptedCodeVerifier,
  };
  return decryptVaultCredential(refByType[type]) || decryptCredential(encryptedByType[type]);
}

export function getConnectorCredential(connector, type) {
  const meta = connector?.credentialMeta || {};
  const refByType = {
    accessToken: meta.tokenRef,
    refreshToken: meta.refreshTokenRef,
    verifyToken: meta.verifyTokenRef,
    clientSecret: meta.clientSecretRef,
  };
  const encryptedByType = {
    accessToken: meta.encryptedToken,
    refreshToken: meta.encryptedRefreshToken,
    verifyToken: meta.encryptedVerifyToken,
    clientSecret: meta.encryptedClientSecret,
  };
  return decryptVaultCredential(refByType[type]) || decryptCredential(encryptedByType[type]);
}

export function getConnectorAccessToken(connector) {
  return getConnectorCredential(connector, 'accessToken');
}

function maskCredential(value) {
  if (!value || value.length < 4) return '****';
  return `****${value.slice(-4)}`;
}

function sanitizeConnectorForResponse(connector) {
  const copy = JSON.parse(JSON.stringify(connector));
  if (copy.credentialMeta) {
    delete copy.credentialMeta.encryptedToken;
    delete copy.credentialMeta.encryptedRefreshToken;
    delete copy.credentialMeta.encryptedVerifyToken;
    delete copy.credentialMeta.encryptedClientSecret;
    delete copy.credentialMeta.rawAccessToken;
    delete copy.credentialMeta.tokenRef;
    delete copy.credentialMeta.refreshTokenRef;
    delete copy.credentialMeta.verifyTokenRef;
    delete copy.credentialMeta.clientSecretRef;
  }
  return copy;
}

export function getConnectorAdapterProfile(provider) {
  return connectorAdapterProfilesByProvider[provider] || defaultConnectorAdapterProfile;
}

function createConnector({
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
}) {
  const readiness = connectorReadinessByProvider[provider] || defaultConnectorReadiness;
  const adapterProfile = getConnectorAdapterProfile(provider);

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
    priorityTier: readiness.priorityTier,
    priorityWave: readiness.priorityWave,
    businessUseCase: readiness.businessUseCase,
    credentialHint: readiness.credentialHint,
    setupChecklist: readiness.setupChecklist,
    adapterProfile,
  };
}

const growthOsState = {
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
    {
      id: 'lead-crm',
      label: 'Lead / CRM',
      promise: 'Capture all lead sources',
      status: 'active',
      color: 'blue',
      href: '/crm',
      kpi: '1,258 new leads',
      work: ['PrimeWeb forms', 'Ads and social', 'Offline and partner leads'],
    },
    {
      id: 'crm-follow-up',
      label: 'CRM & Follow-up',
      promise: 'Convert leads to customers',
      status: 'active',
      color: 'green',
      href: '/customer/crm-compact',
      kpi: '342 qualified leads',
      work: ['Pipeline stages', 'Smart reminders', 'Lead scoring'],
    },
    {
      id: 'commerce',
      label: 'Commerce',
      promise: 'Sell products and manage transactions',
      status: 'watch',
      color: 'pink',
      href: '/overview?module=cos',
      kpi: '$285K MTD revenue',
      work: ['Product sets', 'Live commerce allocation', 'Orders', 'Payment status'],
    },
    {
      id: 'service',
      label: 'Service',
      promise: 'Bookings, appointments, consultation',
      status: 'active',
      color: 'orange',
      href: '/customer/service',
      kpi: '186 bookings',
      work: ['Service packages', 'Staff and resources', 'Service records'],
    },
    {
      id: 'integration',
      label: 'Connectors',
      promise: 'External platform and compliance connections',
      status: 'active',
      color: 'purple',
      href: '/overview?module=connectors',
      kpi: '42 connectors',
      work: ['Credential setup', 'Sync monitoring', 'Compliance rails'],
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      promise: 'Visibility and performance',
      status: 'active',
      color: 'teal',
      href: '/growth/dashboard',
      kpi: '6 live KPIs',
      work: ['Revenue', 'Conversion', 'Retention'],
    },
    {
      id: 'ai-agent',
      label: 'AI Agent',
      promise: 'Ask, analyze, execute',
      status: 'active',
      color: 'violet',
      href: '/intelligence/consulting-agent?tab=kpi',
      kpi: '42 actions',
      work: ['Natural language query', 'Suggested actions', 'Approved automation'],
    },
  ],
  problemCards: [
    {
      id: 'scattered-leads',
      title: 'Leads Are Scattered',
      detail: 'Ads, website, social, chat, offline, and partners are stored in different places.',
      impact: 'Lower conversion',
      severity: 'high',
    },
    {
      id: 'inconsistent-follow-up',
      title: 'Inconsistent Follow-up',
      detail: 'Slow manual follow-up causes leads to lose interest and move to competitors.',
      impact: 'Higher acquisition cost',
      severity: 'high',
    },
    {
      id: 'weak-crm-data',
      title: 'Weak CRM Data',
      detail: 'Incomplete profiles, missing interaction history, and unstructured data limit conversion.',
      impact: 'Poor sales context',
      severity: 'medium',
    },
    {
      id: 'disconnected-ops',
      title: 'Disconnected Teams & Operations',
      detail: 'Marketing, sales, service, commerce, and finance use different tools and processes.',
      impact: 'Operational delay',
      severity: 'high',
    },
    {
      id: 'limited-visibility',
      title: 'Lack of Visibility & Analytics',
      detail: 'Management cannot see the full funnel, conversion performance, or ROI.',
      impact: 'Missed decisions',
      severity: 'medium',
    },
    {
      id: 'poor-experience',
      title: 'Poor Customer Experience',
      detail: 'Customers repeat information, wait too long, and receive inconsistent service.',
      impact: 'Lower retention',
      severity: 'medium',
    },
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
    {
      type: 'CRM',
      examples: 'Salesforce, HubSpot, Zoho CRM',
      strength: 'Manages sales pipeline, customer data, and activities.',
      limitation: 'Focuses only on sales and marketing. Lacks operations, service, commerce, and AI across the full journey.',
      primeDifference: 'Connects lead, sales, service, commerce, operations, reporting, and AI in one platform.',
    },
    {
      type: 'ERP',
      examples: 'SAP, Oracle, NetSuite',
      strength: 'Manages internal operations, finance, inventory, procurement, and HR.',
      limitation: 'Heavy, complex, expensive, and not focused on lead generation or customer growth.',
      primeDifference: 'More modular, growth-focused, easy to adopt, and connected with customer-facing systems.',
    },
    {
      type: 'Booking Tool',
      examples: 'Calendly, Acuity, SimplyBook.me',
      strength: 'Excellent at appointment and schedule management.',
      limitation: 'Limited CRM, follow-up, marketing, conversion, and lifecycle management.',
      primeDifference: 'Booking is connected with CRM, follow-up, payments, and customer journey.',
    },
    {
      type: 'E-commerce Tool',
      examples: 'Shopify, WooCommerce, Magento',
      strength: 'Strong in online store, product, and transaction management.',
      limitation: 'Weak in lead nurturing, relationship management, service workflow, and retention.',
      primeDifference: 'Sales and transactions connect with CRM, segmentation, service, and retention.',
    },
  ],
  leads: [
    {
      id: 'lead_004',
      company: 'Acme Corporation',
      contact: 'Olivia Martin',
      source: 'PrimeWeb',
      stage: 'new',
      score: 68,
      value: 0,
      nextAction: 'Qualify lead',
       owner: 'CRM Team',
       dueAt: 'Today 11:30',
      lastActivity: 'Website form submitted',
    },
    {
      id: 'lead_005',
      company: 'NextGen Co.',
      contact: 'Daniel Kim',
      source: 'Manual Import',
      stage: 'new',
      score: 64,
      value: 0,
       nextAction: 'Confirm buying intent',
       owner: 'CRM Team',
       dueAt: 'Today 13:00',
      lastActivity: 'Imported from event list',
    },
    {
      id: 'lead_001',
      company: 'DataPro Systems',
      contact: 'Sarah Lee',
      source: 'PrimeWeb',
      stage: 'proposal',
      score: 92,
      value: 25500,
      nextAction: 'Send revised proposal',
      owner: 'Alex Johnson',
      dueAt: 'Today 14:00',
      lastActivity: 'Proposal reviewed',
    },
    {
      id: 'lead_002',
      company: 'Bright Solutions',
      contact: 'Minh Tran',
      source: 'Facebook Ads',
      stage: 'qualified',
      score: 86,
      value: 18200,
      nextAction: 'Discovery call',
      owner: 'Sarah Lee',
      dueAt: 'Today 16:30',
      lastActivity: 'Facebook message replied',
    },
    {
      id: 'lead_003',
      company: 'TechNova Ltd.',
      contact: 'Michael Chen',
      source: 'Partner',
      stage: 'engaged',
      score: 78,
      value: 19200,
      nextAction: 'Share implementation plan',
      owner: 'Alex Johnson',
      dueAt: 'Tomorrow 10:00',
      lastActivity: 'Partner referral received',
    },
    {
      id: 'lead_006',
      company: 'Alpha Industries',
      contact: 'Emma Brown',
      source: 'LinkedIn Ads',
      stage: 'qualified',
      score: 82,
      value: 15000,
      nextAction: 'Send package options',
      owner: 'Sarah Lee',
      dueAt: 'Tomorrow 09:00',
      lastActivity: 'Qualification completed',
    },
    {
      id: 'lead_007',
      company: 'Visionary Inc.',
      contact: 'Noah Wilson',
      source: 'Partner',
      stage: 'qualified',
      score: 76,
      value: 8300,
      nextAction: 'Confirm decision process',
      owner: 'Sales Team',
      dueAt: 'Tomorrow 11:00',
      lastActivity: 'Discovery notes added',
    },
    {
      id: 'lead_008',
      company: 'Strive Group',
      contact: 'Sophia Davis',
      source: 'PrimeWeb',
      stage: 'qualified',
      score: 80,
      value: 12500,
      nextAction: 'Schedule demo',
      owner: 'Sarah Lee',
      dueAt: 'Tomorrow 14:30',
      lastActivity: 'Lead score updated',
    },
    {
      id: 'lead_009',
      company: 'GreenTech Co.',
      contact: 'Liam Garcia',
      source: 'Google Ads',
      stage: 'engaged',
      score: 74,
      value: 18200,
      nextAction: 'Share ROI estimate',
      owner: 'Alex Johnson',
      dueAt: 'Today 15:30',
      lastActivity: 'Meeting completed',
    },
    {
      id: 'lead_010',
      company: 'InnovateX',
      contact: 'Ava Martinez',
      source: 'PrimeWeb',
      stage: 'engaged',
      score: 88,
      value: 30000,
      nextAction: 'Prepare executive summary',
      owner: 'Sales Team',
      dueAt: 'Tomorrow 15:00',
      lastActivity: 'Buying committee mapped',
    },
    {
      id: 'lead_011',
      company: 'CloudWare Inc.',
      contact: 'James Miller',
      source: 'Referral',
      stage: 'proposal',
      score: 84,
      value: 19500,
      nextAction: 'Review contract terms',
      owner: 'Alex Johnson',
      dueAt: 'Today 17:00',
      lastActivity: 'Proposal sent',
    },
    {
      id: 'lead_012',
      company: 'SecureOps',
      contact: 'Mia Anderson',
      source: 'Outbound',
      stage: 'proposal',
      score: 87,
      value: 22000,
      nextAction: 'Confirm security requirements',
      owner: 'Sarah Lee',
      dueAt: 'Tomorrow 16:00',
      lastActivity: 'Security questionnaire received',
    },
    {
      id: 'lead_013',
      company: 'Global Corp.',
      contact: 'Ethan Taylor',
      source: 'PrimeWeb',
      stage: 'confirmed',
      score: 95,
      value: 35000,
      nextAction: 'Handoff to COS',
      owner: 'Operation Team',
      dueAt: 'Done',
      lastActivity: 'Deal won',
    },
    {
      id: 'lead_014',
      company: 'Peak Performance',
      contact: 'Charlotte Moore',
      source: 'Partner',
      stage: 'confirmed',
      score: 91,
      value: 28500,
      nextAction: 'Create onboarding plan',
      owner: 'Operation Team',
      dueAt: 'Done',
      lastActivity: 'Deal won',
    },
    {
      id: 'lead_015',
      company: 'Momentum Ltd.',
      contact: 'Lucas Thomas',
      source: 'LinkedIn Ads',
      stage: 'confirmed',
      score: 89,
      value: 26000,
      nextAction: 'Schedule kickoff',
      owner: 'Service Team',
      dueAt: 'Done',
      lastActivity: 'Deal won',
    },
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
    createConnector({ provider: 'whatsapp', name: 'WhatsApp', category: 'Messaging', setupMode: 'API credentials + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'messenger', name: 'Messenger', category: 'Messaging', setupMode: 'Page token + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'wechat', name: 'WeChat', category: 'Messaging', setupMode: 'Official Account API', requiredFields: ['accountRef', 'appId', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'telegram', name: 'Telegram', category: 'Messaging', setupMode: 'Bot token + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'line', name: 'LINE', category: 'Messaging', setupMode: 'Channel token + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'zalo', name: 'Zalo', category: 'Messaging', setupMode: 'Official Account API', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'viber', name: 'Viber', category: 'Messaging', setupMode: 'Bot API + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'gmail', name: 'Gmail', category: 'Email', setupMode: 'OAuth client + mailbox sync', requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'outlook', name: 'Outlook', category: 'Email', setupMode: 'Microsoft OAuth + mailbox sync', requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'facebook', name: 'Facebook', category: 'Social', setupMode: 'Page token + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'instagram', name: 'Instagram', category: 'Social', setupMode: 'Business account + token', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'tiktok', name: 'TikTok', category: 'Social', setupMode: 'Business API + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'linkedin', name: 'LinkedIn', category: 'Social', setupMode: 'Organization API + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl'] }),
    createConnector({ provider: 'x', name: 'X', category: 'Social', setupMode: 'API key + webhook', requiredFields: ['accountRef', 'accessToken', 'webhookUrl'] }),
    createConnector({ provider: 'youtube', name: 'YouTube', category: 'Social', setupMode: 'OAuth client + channel sync', requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'meta_ads', name: 'Meta Ads', category: 'Ads', direction: 'one_way', outboundEnabled: false, setupMode: 'Marketing API token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'google_ads', name: 'Google Ads', category: 'Ads', direction: 'one_way', outboundEnabled: true, setupMode: 'OAuth client + developer token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import'], requiredFields: ['accountRef', 'appId', 'accessToken', 'verifyToken'] }),
    createConnector({ provider: 'tiktok_ads', name: 'TikTok Ads', category: 'Ads', direction: 'one_way', outboundEnabled: false, setupMode: 'Business API token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'linkedin_ads', name: 'LinkedIn Ads', category: 'Ads', direction: 'one_way', outboundEnabled: false, setupMode: 'Marketing API token', capabilities: ['campaign_sync', 'lead_capture', 'conversion_import'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'hubspot', name: 'HubSpot', category: 'CRM', setupMode: 'Private app token + webhook', capabilities: ['contacts_sync', 'deals_sync', 'timeline_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl'] }),
    createConnector({ provider: 'salesforce', name: 'Salesforce', category: 'CRM', setupMode: 'Connected app OAuth', capabilities: ['contacts_sync', 'deals_sync', 'timeline_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken'] }),
    createConnector({ provider: 'zoho_crm', name: 'Zoho CRM', category: 'CRM', setupMode: 'OAuth client + webhook', capabilities: ['contacts_sync', 'deals_sync', 'timeline_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl'] }),
    createConnector({ provider: 'shopify', name: 'Shopify', category: 'Commerce', setupMode: 'Admin API token + webhook', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'woocommerce', name: 'WooCommerce', category: 'Commerce', setupMode: 'REST key + webhook', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'shopee', name: 'Shopee', category: 'Commerce', setupMode: 'Partner API credentials', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'lazada', name: 'Lazada', category: 'Commerce', setupMode: 'Seller API credentials', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'amazon', name: 'Amazon', category: 'Commerce', setupMode: 'Selling Partner API', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'], requiredFields: ['accountRef', 'appId', 'accessToken', 'verifyToken'] }),
    createConnector({ provider: 'tiktok_shop', name: 'TikTok Shop', category: 'Commerce', setupMode: 'Shop API credentials', capabilities: ['orders_sync', 'customers_sync', 'product_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'myinvois', name: 'Malaysia MyInvois', category: 'Compliance', direction: 'one_way', inboundEnabled: false, outboundEnabled: true, environment: 'sandbox', setupMode: 'Taxpayer credentials + certificate vault', capabilities: ['tin_validation', 'document_submission', 'submission_polling', 'document_cancel', 'credit_note_flow'], requiredFields: ['accountRef', 'appId', 'accessToken', 'verifyToken'] }),
    createConnector({ provider: 'stripe', name: 'Stripe', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'Restricted key + webhook', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'paypal', name: 'PayPal', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'REST app credentials', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'appId', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'vnpay', name: 'VNPay', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'Merchant credentials + IPN', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'momo', name: 'MoMo', category: 'Payments', direction: 'one_way', outboundEnabled: false, setupMode: 'Partner credentials + IPN', capabilities: ['payments_sync', 'refunds_sync', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'google_analytics', name: 'Google Analytics', category: 'Analytics', direction: 'one_way', outboundEnabled: false, setupMode: 'OAuth client + property sync', capabilities: ['analytics_sync', 'conversion_import'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'search_console', name: 'Search Console', category: 'Analytics', direction: 'one_way', outboundEnabled: false, setupMode: 'OAuth client + property sync', capabilities: ['analytics_sync'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'mixpanel', name: 'Mixpanel', category: 'Analytics', direction: 'one_way', outboundEnabled: false, setupMode: 'Service account token', capabilities: ['analytics_sync'] }),
    createConnector({ provider: 'google_sheets', name: 'Google Sheets', category: 'Productivity', direction: 'one_way', outboundEnabled: false, setupMode: 'OAuth client + sheet sync', capabilities: ['sheet_sync', 'lead_import'], requiredFields: ['accountRef', 'appId', 'accessToken'] }),
    createConnector({ provider: 'airtable', name: 'Airtable', category: 'Productivity', direction: 'one_way', outboundEnabled: false, setupMode: 'Personal access token', capabilities: ['table_sync', 'lead_import'] }),
    createConnector({ provider: 'slack', name: 'Slack', category: 'Productivity', setupMode: 'Bot token + event webhook', capabilities: ['notifications', 'lead_alerts', 'webhook_sync'], requiredFields: ['accountRef', 'accessToken', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'notion', name: 'Notion', category: 'Productivity', direction: 'one_way', outboundEnabled: false, setupMode: 'Integration token', capabilities: ['database_sync'], requiredFields: ['accountRef', 'accessToken'] }),
    createConnector({ provider: 'zapier', name: 'Zapier', category: 'Automation', setupMode: 'Webhook endpoint', capabilities: ['workflow_trigger', 'webhook_sync'], requiredFields: ['accountRef', 'webhookUrl', 'verifyToken'] }),
    createConnector({ provider: 'make', name: 'Make', category: 'Automation', setupMode: 'Webhook endpoint', capabilities: ['workflow_trigger', 'webhook_sync'], requiredFields: ['accountRef', 'webhookUrl'] }),
  ],
  aiActions: [
    {
      id: 'ai_001',
      title: 'Prioritize 24 high-score leads',
      module: 'CRM & Sales',
      recommendation: 'Assign same-day follow-up to leads with score above 85 and value above $15K.',
      confidence: 91,
      status: 'ready',
    },
    {
      id: 'ai_002',
      title: 'Reconnect cold proposal leads',
      module: 'AI Agent',
      recommendation: 'Send personalized re-engagement message to 18 proposal leads with no activity in 7 days.',
      confidence: 84,
      status: 'needs_approval',
    },
    {
      id: 'ai_003',
      title: 'Fix WhatsApp sync mapping',
      module: 'Integration',
      recommendation: 'Normalize phone fields before import to reduce duplicate lead creation.',
      confidence: 79,
      status: 'needs_approval',
    },
  ],
  packages: [
    { id: 'free-trial', name: 'Free / Trial', price: 0, users: 2, summary: 'Demo access and small-seller evaluation.', features: ['Basic CRM', 'Product list', 'Limited dashboard', 'Demo connectors'] },
    { id: 'starter', name: 'Starter', price: 49, users: 3, summary: 'For SME sellers starting structured commerce ops.', features: ['Product master', 'Basic inventory', 'Order sync', 'Basic CRM'] },
    { id: 'growth', name: 'Growth', price: 199, users: 10, summary: 'For multi-channel sellers running campaigns and live commerce.', features: ['Marketplace integration', 'Product sets', 'Live commerce allocation', 'Campaign inventory', 'Advanced dashboard'] },
    { id: 'pro-enterprise', name: 'Pro / Enterprise', price: null, users: null, summary: 'For brands, agencies, and KOL networks that need scale and governance.', features: ['AI agent', 'Advanced reporting', 'Custom integration', 'Approval flow', 'Priority support'] },
  ],
  updatedAt: now,
};

function loadConnectorState() {
  try {
    if (fs.existsSync(CONNECTORS_STORE_PATH)) {
      const raw = fs.readFileSync(CONNECTORS_STORE_PATH, 'utf-8');
      const saved = JSON.parse(raw);
      for (const savedConnector of saved) {
        const existing = growthOsState.connectors.find(
          (c) => c.id === savedConnector.id
        );
        if (existing) {
          existing.status = savedConnector.status;
          existing.syncHealth = savedConnector.syncHealth;
          existing.lastSync = savedConnector.lastSync;
          existing.accountRef = savedConnector.accountRef;
          existing.webhookUrl = savedConnector.webhookUrl;
          existing.credentialStatus = savedConnector.credentialStatus;
          existing.maskedCredential = savedConnector.maskedCredential;
          existing.connectedAt = savedConnector.connectedAt;
          existing.lastTestAt = savedConnector.lastTestAt;
          existing.credentialMeta = savedConnector.credentialMeta;
          migrateConnectorCredentialMetaToVault(existing);
        }
      }
      console.log('[growth-os] Loaded ' + saved.length + ' persisted connector(s)');
    }
  } catch (error) {
    console.error('[growth-os] Failed to load connector state: ' + error.message);
  }
}

function saveConnectorState() {
  try {
    const dir = path.dirname(CONNECTORS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const toSave = growthOsState.connectors
      .filter((c) => c.status === 'connected' || c.status === 'tested')
      .map((c) => ({
        id: c.id,
        status: c.status,
        syncHealth: c.syncHealth,
        lastSync: c.lastSync,
        accountRef: c.accountRef,
        webhookUrl: c.webhookUrl,
        credentialStatus: c.credentialStatus,
        maskedCredential: c.maskedCredential,
        connectedAt: c.connectedAt,
        lastTestAt: c.lastTestAt,
        credentialMeta: c.credentialMeta,
      }));
    fs.writeFileSync(CONNECTORS_STORE_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (error) {
    console.error('[growth-os] Failed to save connector state: ' + error.message);
  }
}

function loadConnectorWebhookEvents() {
  try {
    if (!fs.existsSync(CONNECTOR_EVENTS_STORE_PATH)) return [];
    const raw = fs.readFileSync(CONNECTOR_EVENTS_STORE_PATH, 'utf-8');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((event) => event?.id && event?.connectorId)
      .slice(0, 500);
  } catch (error) {
    console.error('[growth-os] Failed to load connector webhook events: ' + error.message);
    return [];
  }
}

function saveConnectorWebhookEvents() {
  try {
    const dir = path.dirname(CONNECTOR_EVENTS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONNECTOR_EVENTS_STORE_PATH, JSON.stringify(connectorWebhookEvents.slice(0, 500), null, 2), 'utf-8');
  } catch (error) {
    console.error('[growth-os] Failed to save connector webhook events: ' + error.message);
  }
}

function loadConnectorDomainEvents() {
  try {
    if (!fs.existsSync(CONNECTOR_DOMAIN_EVENTS_STORE_PATH)) return [];
    const raw = fs.readFileSync(CONNECTOR_DOMAIN_EVENTS_STORE_PATH, 'utf-8');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((event) => event?.id && event?.connectorId && event?.domain)
      .map((event) => normalizeConnectorDomainEvent(event))
      .slice(0, 500);
  } catch (error) {
    console.error('[growth-os] Failed to load connector domain events: ' + error.message);
    return [];
  }
}

function saveConnectorDomainEvents() {
  try {
    const dir = path.dirname(CONNECTOR_DOMAIN_EVENTS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONNECTOR_DOMAIN_EVENTS_STORE_PATH, JSON.stringify(connectorDomainEvents.slice(0, 500), null, 2), 'utf-8');
  } catch (error) {
    console.error('[growth-os] Failed to save connector domain events: ' + error.message);
  }
}

function createEmptyConnectorDomainRecords() {
  return connectorDomainRecordNames.reduce((records, domain) => {
    records[domain] = [];
    return records;
  }, {});
}

function loadConnectorDomainRecords() {
  try {
    if (!fs.existsSync(CONNECTOR_DOMAIN_RECORDS_STORE_PATH)) return createEmptyConnectorDomainRecords();
    const raw = fs.readFileSync(CONNECTOR_DOMAIN_RECORDS_STORE_PATH, 'utf-8');
    const saved = JSON.parse(raw);
    const records = createEmptyConnectorDomainRecords();
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return records;
    for (const domain of connectorDomainRecordNames) {
      const rows = Array.isArray(saved[domain]) ? saved[domain] : [];
      records[domain] = rows
        .filter((record) => record?.id && record?.connectorId && record?.domainEventId)
        .slice(0, 500);
    }
    return records;
  } catch (error) {
    console.error('[growth-os] Failed to load connector domain records: ' + error.message);
    return createEmptyConnectorDomainRecords();
  }
}

function saveConnectorDomainRecords() {
  try {
    const dir = path.dirname(CONNECTOR_DOMAIN_RECORDS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const toSave = createEmptyConnectorDomainRecords();
    for (const domain of connectorDomainRecordNames) {
      toSave[domain] = (connectorDomainRecords[domain] || []).slice(0, 500);
    }
    fs.writeFileSync(CONNECTOR_DOMAIN_RECORDS_STORE_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (error) {
    console.error('[growth-os] Failed to save connector domain records: ' + error.message);
  }
}

function normalizeConnectorOAuthSession(session = {}) {
  return {
    ...session,
    status: session.status || 'pending',
    createdAt: session.createdAt || new Date().toISOString(),
    expiresAt: session.expiresAt || new Date(Date.now() + CONNECTOR_OAUTH_SESSION_TTL_MS).toISOString(),
    completedAt: session.completedAt || null,
    error: session.error || null,
    authorizationCodeLast4: session.authorizationCodeLast4 || null,
    tokenExchangeStatus: session.tokenExchangeStatus || 'not_started',
    tokenType: session.tokenType || null,
    accessTokenLast4: session.accessTokenLast4 || null,
    refreshTokenLast4: session.refreshTokenLast4 || null,
    tokenExpiresAt: session.tokenExpiresAt || null,
    scopeGranted: session.scopeGranted || null,
    revocationUrl: session.revocationUrl || null,
    revocationStatus: session.revocationStatus || 'not_started',
    revokedAt: session.revokedAt || null,
  };
}

function loadConnectorOAuthSessions() {
  try {
    if (!fs.existsSync(CONNECTOR_OAUTH_SESSIONS_STORE_PATH)) return [];
    const raw = fs.readFileSync(CONNECTOR_OAUTH_SESSIONS_STORE_PATH, 'utf-8');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((session) => session?.state && session?.connectorId)
      .map((session) => normalizeConnectorOAuthSession(session))
      .slice(0, 200);
  } catch (error) {
    console.error('[growth-os] Failed to load connector OAuth sessions: ' + error.message);
    return [];
  }
}

function saveConnectorOAuthSessions() {
  try {
    const dir = path.dirname(CONNECTOR_OAUTH_SESSIONS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONNECTOR_OAUTH_SESSIONS_STORE_PATH, JSON.stringify(connectorOAuthSessions.slice(0, 200), null, 2), 'utf-8');
  } catch (error) {
    console.error('[growth-os] Failed to save connector OAuth sessions: ' + error.message);
  }
}

const connectorCredentialVault = loadConnectorCredentialVault();
loadConnectorState();

const connectorWebhookEvents = loadConnectorWebhookEvents();
const connectorDomainEvents = loadConnectorDomainEvents();
const connectorDomainRecords = loadConnectorDomainRecords();
const connectorOAuthSessions = loadConnectorOAuthSessions();

function normalizeConnectorDomainEvent(event = {}) {
  const maxAttempts = Number(event.maxAttempts || CONNECTOR_DOMAIN_EVENT_MAX_ATTEMPTS);
  const attemptCount = Number(event.attemptCount || (event.status ? 1 : 0));
  return {
    ...event,
    status: event.status || 'routed',
    attemptCount,
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 3,
    lastAttemptAt: event.lastAttemptAt || event.routedAt || event.receivedAt || null,
    nextRetryAt: event.nextRetryAt || null,
    lastError: event.lastError || null,
    deadLetteredAt: event.deadLetteredAt || null,
    requeuedAt: event.requeuedAt || null,
  };
}

function createConnectorReadinessBucket({ id, label, tier = null }) {
  return {
    id,
    label,
    tier,
    total: 0,
    connected: 0,
    tested: 0,
    setupRequired: 0,
    disconnected: 0,
    watch: 0,
    genericAdapters: 0,
    oauth: 0,
    webhook: 0,
    probe: 0,
    outbound: 0,
    coverage: 0,
    nextProviders: [],
  };
}

function getConnectorReadinessTier(connector = {}) {
  return connector.priorityTier || connectorReadinessByProvider[connector.provider]?.priorityTier || defaultConnectorReadiness.priorityTier;
}

function getConnectorReadinessWave(connector = {}) {
  return connector.priorityWave || connectorReadinessByProvider[connector.provider]?.priorityWave || defaultConnectorReadiness.priorityWave;
}

function getConnectorReadinessWaveRank(wave) {
  const index = connectorPriorityWaveOrder.indexOf(wave);
  return index >= 0 ? index : 99;
}

function addConnectorToReadinessBucket(bucket, connector, adapterProfile) {
  const status = String(connector.status || 'setup_required');
  bucket.total += 1;
  if (status === 'connected') bucket.connected += 1;
  if (status === 'tested') bucket.tested += 1;
  if (status === 'setup_required') bucket.setupRequired += 1;
  if (status === 'disconnected') {
    bucket.disconnected += 1;
    bucket.setupRequired += 1;
  }
  if (status === 'watch') bucket.watch += 1;
  if (adapterProfile.adapterKey === defaultConnectorAdapterProfile.adapterKey) bucket.genericAdapters += 1;
  if (adapterProfile.oauth) bucket.oauth += 1;
  if (adapterProfile.supportsWebhook) bucket.webhook += 1;
  if (adapterProfile.probe) bucket.probe += 1;
  if (adapterProfile.supportsOutbound || connector.outboundEnabled) bucket.outbound += 1;
  if (status !== 'connected' && bucket.nextProviders.length < 6) {
    bucket.nextProviders.push(connector.name || connector.provider);
  }
}

function finalizeConnectorReadinessBucket(bucket) {
  return {
    ...bucket,
    coverage: bucket.total ? Math.round((bucket.connected / bucket.total) * 100) : 0,
  };
}

function compareConnectorReadinessPriority(left, right) {
  const leftTier = getConnectorReadinessTier(left);
  const rightTier = getConnectorReadinessTier(right);
  const leftTierRank = connectorPriorityTierOrder.indexOf(leftTier);
  const rightTierRank = connectorPriorityTierOrder.indexOf(rightTier);
  if (leftTierRank !== rightTierRank) return (leftTierRank < 0 ? 99 : leftTierRank) - (rightTierRank < 0 ? 99 : rightTierRank);

  const leftWave = getConnectorReadinessWave(left);
  const rightWave = getConnectorReadinessWave(right);
  const leftWaveRank = getConnectorReadinessWaveRank(leftWave);
  const rightWaveRank = getConnectorReadinessWaveRank(rightWave);
  if (leftWaveRank !== rightWaveRank) return leftWaveRank - rightWaveRank;
  const waveCompare = leftWave.localeCompare(rightWave);
  if (waveCompare !== 0) return waveCompare;

  const categoryCompare = String(left.category || '').localeCompare(String(right.category || ''));
  if (categoryCompare !== 0) return categoryCompare;

  return String(left.name || left.provider).localeCompare(String(right.name || right.provider));
}

function buildConnectorReadinessSummary(connectors = []) {
  const sortedConnectors = connectors.slice().sort(compareConnectorReadinessPriority);
  const tierBuckets = new Map(connectorPriorityTierOrder.map((tier) => [
    tier,
    createConnectorReadinessBucket({ id: tier, label: connectorPriorityTierLabels[tier], tier }),
  ]));
  const categoryBuckets = new Map();
  const waveBuckets = new Map();
  const totalBucket = createConnectorReadinessBucket({ id: 'all', label: 'All connectors' });

  for (const connector of sortedConnectors) {
    const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
    const tier = getConnectorReadinessTier(connector);
    const wave = getConnectorReadinessWave(connector);
    const category = connector.category || 'Other';

    if (!tierBuckets.has(tier)) {
      tierBuckets.set(tier, createConnectorReadinessBucket({ id: tier, label: connectorPriorityTierLabels[tier] || tier, tier }));
    }
    if (!categoryBuckets.has(category)) {
      categoryBuckets.set(category, createConnectorReadinessBucket({ id: category.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: category }));
    }
    if (!waveBuckets.has(wave)) {
      waveBuckets.set(wave, createConnectorReadinessBucket({ id: wave.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: wave, tier }));
    }

    addConnectorToReadinessBucket(totalBucket, connector, adapterProfile);
    addConnectorToReadinessBucket(tierBuckets.get(tier), connector, adapterProfile);
    addConnectorToReadinessBucket(categoryBuckets.get(category), connector, adapterProfile);
    addConnectorToReadinessBucket(waveBuckets.get(wave), connector, adapterProfile);
  }

  const nextSetup = sortedConnectors
    .filter((connector) => connector.status !== 'connected')
    .slice(0, 12)
    .map((connector) => {
      const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
      return {
        provider: connector.provider,
        name: connector.name,
        category: connector.category,
        status: connector.status,
        priorityTier: getConnectorReadinessTier(connector),
        priorityWave: getConnectorReadinessWave(connector),
        setupMode: connector.setupMode,
        requiredFields: connector.requiredFields || defaultConnectorRequiredFields,
        adapterKey: adapterProfile.adapterKey,
        needsWebhook: Boolean(adapterProfile.supportsWebhook),
        needsOAuth: Boolean(adapterProfile.oauth),
        canProbe: Boolean(adapterProfile.probe),
      };
    });

  return {
    ...finalizeConnectorReadinessBucket(totalBucket),
    tiers: Array.from(tierBuckets.values()).map(finalizeConnectorReadinessBucket),
    categories: Array.from(categoryBuckets.values())
      .map(finalizeConnectorReadinessBucket)
      .sort((left, right) => left.label.localeCompare(right.label)),
    waves: Array.from(waveBuckets.values())
      .map(finalizeConnectorReadinessBucket)
      .sort((left, right) => {
        const leftTierRank = connectorPriorityTierOrder.indexOf(left.tier);
        const rightTierRank = connectorPriorityTierOrder.indexOf(right.tier);
        if (leftTierRank !== rightTierRank) return (leftTierRank < 0 ? 99 : leftTierRank) - (rightTierRank < 0 ? 99 : rightTierRank);
        const leftWaveRank = getConnectorReadinessWaveRank(left.label);
        const rightWaveRank = getConnectorReadinessWaveRank(right.label);
        if (leftWaveRank !== rightWaveRank) return leftWaveRank - rightWaveRank;
        return left.label.localeCompare(right.label);
      }),
    nextSetup,
  };
}

function cloneGrowthOsState() {
  const clone = JSON.parse(JSON.stringify(growthOsState));
  clone.connectors = clone.connectors.map((c) => sanitizeConnectorForResponse(c));
  clone.connectorReadiness = buildConnectorReadinessSummary(clone.connectors);
  return clone;
}

const leadStages = ['new', 'qualified', 'engaged', 'proposal', 'confirmed'];
const nextActionsByStage = {
  new: 'Qualify lead',
  qualified: 'Schedule discovery call',
  engaged: 'Send implementation plan',
  proposal: 'Send proposal',
  confirmed: 'Handoff to operations',
};

function adjustMetricForStageMove(previousStage, nextStage) {
  if (previousStage === nextStage) return;

  if (previousStage === 'qualified') growthOsState.metrics.qualifiedLeads = Math.max(0, growthOsState.metrics.qualifiedLeads - 1);
  if (nextStage === 'qualified') growthOsState.metrics.qualifiedLeads += 1;

  if (previousStage === 'engaged') growthOsState.metrics.engagedLeads = Math.max(0, growthOsState.metrics.engagedLeads - 1);
  if (nextStage === 'engaged') growthOsState.metrics.engagedLeads += 1;

  if (previousStage === 'confirmed') growthOsState.metrics.convertedCustomers = Math.max(0, growthOsState.metrics.convertedCustomers - 1);
  if (nextStage === 'confirmed') growthOsState.metrics.convertedCustomers += 1;

  growthOsState.metrics.conversionRate = Math.round((growthOsState.metrics.convertedCustomers / Math.max(1, growthOsState.metrics.engagedLeads)) * 100);
}

function findLeadOrThrow(leadId) {
  const lead = growthOsState.leads.find((item) => item.id === leadId);
  if (!lead) {
    const error = new Error(`Lead not found: ${leadId}`);
    error.statusCode = 404;
    throw error;
  }

  return lead;
}

function findConnectorOrThrow(connectorId) {
  const lookup = String(connectorId || '').trim().toLowerCase();
  const connector = growthOsState.connectors.find((item) => (
    item.id.toLowerCase() === lookup ||
    item.provider?.toLowerCase() === lookup ||
    item.name.toLowerCase() === lookup
  ));

  if (!connector) {
    const error = new Error(`Connector not found: ${connectorId}`);
    error.statusCode = 404;
    throw error;
  }

  return connector;
}

function assertValidWebhookUrl(webhookUrl) {
  try {
    const parsed = new URL(webhookUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function getConnectorSetupPayload(connector, payload = {}) {
  const setup = {
    accountRef: String(payload.accountRef || payload.account || payload.pageId || '').trim(),
    appId: String(payload.appId || payload.clientId || '').trim(),
    accessToken: String(payload.accessToken || payload.apiKey || payload.secret || '').trim(),
    webhookUrl: String(payload.webhookUrl || connector.webhookUrl || '').trim(),
    verifyToken: String(payload.verifyToken || payload.webhookSecret || '').trim(),
    environment: String(payload.environment || connector.environment || 'production').trim(),
  };
  const requiredFields = connector.requiredFields || defaultConnectorRequiredFields;
  const invalidFields = [];

  if (requiredFields.includes('accountRef') && setup.accountRef.length < 2) invalidFields.push('accountRef');
  if (requiredFields.includes('appId') && setup.appId.length < 2) invalidFields.push('appId');
  if (requiredFields.includes('accessToken') && setup.accessToken.length < 8) invalidFields.push('accessToken');
  if (requiredFields.includes('webhookUrl') && !assertValidWebhookUrl(setup.webhookUrl)) invalidFields.push('webhookUrl');
  if (requiredFields.includes('verifyToken') && setup.verifyToken.length < 6) invalidFields.push('verifyToken');

  if (invalidFields.length > 0) {
    const error = new Error(`Missing or invalid connector setup fields: ${invalidFields.join(', ')}.`);
    error.statusCode = 400;
    error.fields = invalidFields;
    throw error;
  }

  return setup;
}

const oauthSetupProviders = new Set([
  'gmail',
  'outlook',
  'youtube',
  'google_ads',
  'linkedin_ads',
  'google_analytics',
  'google_sheets',
  'search_console',
  'salesforce',
  'zoho_crm',
  'myinvois',
]);

const providerCredentialRules = {
  whatsapp: { minLength: 16, detail: 'Meta WhatsApp Cloud API token length' },
  messenger: { minLength: 16, detail: 'Meta page access token length' },
  facebook: { minLength: 16, detail: 'Meta page or app token length' },
  instagram: { minLength: 16, detail: 'Instagram business long-lived token length' },
  meta_ads: { minLength: 16, detail: 'Meta Marketing API token length' },
  tiktok: { minLength: 16, detail: 'TikTok Business API token length' },
  tiktok_ads: { minLength: 16, detail: 'TikTok Ads Business API token length' },
  zalo: { minLength: 12, detail: 'Zalo Official Account access token length' },
  wechat: { minLength: 12, detail: 'WeChat Official Account API token length' },
  viber: { minLength: 12, detail: 'Viber bot token length' },
  shopee: { minLength: 16, detail: 'Shopee partner access token length' },
  lazada: { minLength: 16, detail: 'Lazada seller API token length' },
  tiktok_shop: { minLength: 16, detail: 'TikTok Shop API token length' },
  amazon: { minLength: 16, detail: 'Amazon SP-API/LWA credential length' },
  stripe: { pattern: /^(sk|rk)_(test|live)_/i, detail: 'Stripe secret or restricted key prefix' },
  shopify: { pattern: /^(shpat_|shp[acrs]_)/i, detail: 'Shopify Admin API token prefix' },
  woocommerce: { pattern: /^(ck_|cs_)/i, detail: 'WooCommerce REST consumer key/secret prefix' },
  slack: { pattern: /^xox[baprs]-/i, detail: 'Slack bot or app token prefix' },
  telegram: { pattern: /^\d+:[A-Za-z0-9_-]{20,}$/, detail: 'Telegram bot token shape' },
  line: { minLength: 20, detail: 'LINE channel access token length' },
  paypal: { minLength: 16, detail: 'PayPal REST app credential length' },
  vnpay: { minLength: 8, detail: 'VNPay merchant secret length' },
  momo: { minLength: 8, detail: 'MoMo partner credential length' },
  notion: { minLength: 12, detail: 'Notion integration token length' },
  zapier: { minLength: 0, detail: 'Zapier webhook endpoint plus shared secret' },
};

function evaluateProviderCredentialShape(connector, setup, adapterProfile) {
  const rule = providerCredentialRules[connector.provider];
  const requiredFields = connector.requiredFields || defaultConnectorRequiredFields;
  const expectsAccessToken = requiredFields.includes('accessToken');
  const expectsAppId = requiredFields.includes('appId') || oauthSetupProviders.has(connector.provider);
  const issues = [];
  const details = [];

  if (expectsAccessToken) {
    if (!setup.accessToken) {
      issues.push('missing access token');
    } else if (rule?.pattern && !rule.pattern.test(setup.accessToken)) {
      issues.push(rule.detail);
    } else if (rule?.minLength !== undefined && setup.accessToken.length < rule.minLength) {
      issues.push(rule.detail);
    }
  }

  if (expectsAppId) {
    if (!setup.appId) {
      issues.push('missing app/client id');
    } else {
      details.push('app/client id present');
    }
  }

  if (adapterProfile.supportsWebhook && requiredFields.includes('verifyToken') && !setup.verifyToken) {
    issues.push('missing webhook secret');
  }

  if (rule?.detail) details.push(rule.detail);
  if (oauthSetupProviders.has(connector.provider)) details.push('OAuth client metadata required before production');
  if (!rule && !oauthSetupProviders.has(connector.provider)) details.push('Provider-specific live probe pending');

  return {
    key: 'credential_provider',
    label: 'Provider credential shape',
    status: issues.length ? 'watch' : 'ready',
    detail: issues.length ? `Check ${issues.join(', ')}` : details.join('; ') || 'Credential shape matches provider setup plan',
  };
}

function shouldSkipConnectorLiveProbe() {
  return process.env.PRIME_SKIP_CONNECTOR_LIVE_PROBES === 'true';
}

function buildConnectorReadinessChecks(connector, setup = null) {
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
  const requiredFields = connector.requiredFields || defaultConnectorRequiredFields;
  const checks = [
    {
      key: 'adapter_profile',
      label: 'Adapter profile',
      status: adapterProfile.adapterKey === defaultConnectorAdapterProfile.adapterKey ? 'generic' : 'ready',
      detail: adapterProfile.adapterKey,
    },
    {
      key: 'required_fields',
      label: 'Required setup fields',
      status: requiredFields.length ? 'ready' : 'generic',
      detail: requiredFields.join(', ') || 'No required fields configured',
    },
    {
      key: 'scope_plan',
      label: 'Scope plan',
      status: adapterProfile.requiredScopes?.length ? 'ready' : 'generic',
      detail: (adapterProfile.requiredScopes || []).join(', ') || 'Provider-specific scopes pending',
    },
    {
      key: 'webhook_support',
      label: 'Webhook support',
      status: adapterProfile.supportsWebhook ? 'ready' : 'not_required',
      detail: adapterProfile.supportsWebhook ? (adapterProfile.webhookEvents || []).join(', ') : 'Webhook not required for this connector',
    },
  ];

  const security = adapterProfile.webhookSecurity || defaultConnectorAdapterProfile.webhookSecurity;
  if (adapterProfile.supportsWebhook) {
    const hasSecret = setup?.verifyToken || getWebhookSignatureSecret(connector);
    checks.push({
      key: 'webhook_signature',
      label: 'Webhook signature',
      status: !security.required ? 'not_required' : hasSecret ? 'ready' : 'missing',
      detail: security.description || 'Provider webhook signature check',
    });
  }

  if (setup) {
    checks.push({
      key: 'credential_shape',
      label: 'Credential shape',
      status: setup.accessToken.length >= 8 ? 'ready' : 'missing',
      detail: `Token length ${setup.accessToken.length}`,
    });
    checks.push(evaluateProviderCredentialShape(connector, setup, adapterProfile));
    if (requiredFields.includes('webhookUrl')) {
      checks.push({
        key: 'webhook_url',
        label: 'Webhook URL',
        status: assertValidWebhookUrl(setup.webhookUrl) ? 'ready' : 'missing',
        detail: setup.webhookUrl || 'Missing webhook URL',
      });
    }
  }

  return checks;
}

function getDefaultOAuthRedirectUri(connector) {
  const configuredBase = String(process.env.PRIME_CONNECTOR_OAUTH_REDIRECT_BASE || process.env.PRIME_PUBLIC_API_BASE || '').trim().replace(/\/+$/, '');
  const base = configuredBase || `http://127.0.0.1:${process.env.PORT || 8180}`;
  return `${base}/oauth/connectors/${encodeURIComponent(connector.id)}/callback`;
}

function getConnectorOAuthProfileOrThrow(connector) {
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
  if (!adapterProfile.oauth) {
    const error = new Error(`${connector.name} does not expose an OAuth setup flow yet.`);
    error.statusCode = 400;
    throw error;
  }
  return { adapterProfile, oauthProfile: adapterProfile.oauth };
}

function createPkceChallenge() {
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function canUseOAuthTokenUrlOverride(tokenUrl) {
  if (!tokenUrl) return false;
  if (process.env.PRIME_ALLOW_CONNECTOR_OAUTH_TOKEN_URL_OVERRIDE === 'true' || process.env.NODE_ENV === 'test') return true;
  try {
    const parsed = new URL(tokenUrl);
    return ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function sanitizeOAuthSession(session) {
  const copy = JSON.parse(JSON.stringify(normalizeConnectorOAuthSession(session)));
  delete copy.encryptedCodeVerifier;
  delete copy.encryptedClientSecret;
  delete copy.encryptedAccessToken;
  delete copy.encryptedRefreshToken;
  delete copy.codeVerifierRef;
  delete copy.clientSecretRef;
  delete copy.accessTokenRef;
  delete copy.refreshTokenRef;
  return copy;
}

function findConnectorOAuthSessionOrThrow(connectorId, state) {
  const connector = findConnectorOrThrow(connectorId);
  const session = connectorOAuthSessions.find((item) => item.connectorId === connector.id && item.state === state);
  if (!session) {
    const error = new Error('Connector OAuth session not found.');
    error.statusCode = 404;
    throw error;
  }
  return { connector, session };
}

export function startConnectorOAuthSetup(connectorId, payload = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const { adapterProfile, oauthProfile } = getConnectorOAuthProfileOrThrow(connector);
  const appId = String(payload.appId || payload.clientId || '').trim();
  const clientSecret = String(payload.clientSecret || payload.appSecret || '').trim();
  const accountRef = String(payload.accountRef || connector.accountRef || connector.name).trim();
  const redirectUri = String(payload.redirectUri || getDefaultOAuthRedirectUri(connector)).trim();
  const requestedTokenUrl = String(payload.tokenUrl || '').trim();
  const requestedRevocationUrl = String(payload.revocationUrl || '').trim();

  if (appId.length < 2) {
    const error = new Error('OAuth client/app id is required to start connector setup.');
    error.statusCode = 400;
    throw error;
  }

  if (!assertValidWebhookUrl(redirectUri)) {
    const error = new Error('OAuth redirect URI must be a valid http(s) URL.');
    error.statusCode = 400;
    throw error;
  }

  if (requestedTokenUrl && (!assertValidWebhookUrl(requestedTokenUrl) || !canUseOAuthTokenUrlOverride(requestedTokenUrl))) {
    const error = new Error('OAuth token URL override is not allowed for this environment.');
    error.statusCode = 400;
    throw error;
  }

  if (requestedRevocationUrl && (!assertValidWebhookUrl(requestedRevocationUrl) || !canUseOAuthTokenUrlOverride(requestedRevocationUrl))) {
    const error = new Error('OAuth revocation URL override is not allowed for this environment.');
    error.statusCode = 400;
    throw error;
  }

  const state = randomBytes(32).toString('base64url');
  const pkce = oauthProfile.pkce ? createPkceChallenge() : { verifier: '', challenge: '' };
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CONNECTOR_OAUTH_SESSION_TTL_MS).toISOString();
  const scopes = Array.isArray(payload.scopes) && payload.scopes.length ? payload.scopes.map(String) : (oauthProfile.scopes || []);
  const scopeSeparator = oauthProfile.scopeSeparator || ' ';
  const codeVerifierRef = pkce.verifier ? storeConnectorCredential({
    connector,
    type: 'oauth_code_verifier',
    value: pkce.verifier,
    environment: connector.environment,
    sessionId: state,
  }) : null;
  const clientSecretRef = clientSecret ? storeConnectorCredential({
    connector,
    type: 'oauth_client_secret',
    value: clientSecret,
    environment: connector.environment,
    sessionId: state,
  }) : null;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appId,
    redirect_uri: redirectUri,
    state,
  });

  if (scopes.length) {
    params.set('scope', scopes.join(scopeSeparator));
  }
  if (oauthProfile.pkce) {
    params.set('code_challenge', pkce.challenge);
    params.set('code_challenge_method', 'S256');
  }
  for (const [key, value] of Object.entries(oauthProfile.authorizationParams || {})) {
    params.set(key, String(value));
  }

  const authorizationUrl = `${oauthProfile.authorizationUrl}?${params.toString()}`;
  const session = normalizeConnectorOAuthSession({
    id: `cos_${Date.now().toString(36)}_${connectorOAuthSessions.length + 1}`,
    state,
    connectorId: connector.id,
    provider: connector.provider,
    adapterKey: adapterProfile.adapterKey,
    oauthProvider: oauthProfile.provider,
    accountRef,
    appId,
    redirectUri,
    authorizationUrl,
    tokenUrl: requestedTokenUrl || oauthProfile.tokenUrl,
    revocationUrl: requestedRevocationUrl || oauthProfile.revocationUrl || null,
    scopes,
    pkce: Boolean(oauthProfile.pkce),
    codeVerifierRef,
    clientSecretRef,
    status: 'pending',
    createdAt,
    expiresAt,
  });

  connectorOAuthSessions.unshift(session);
  if (connectorOAuthSessions.length > 200) {
    connectorOAuthSessions.length = 200;
  }
  saveConnectorOAuthSessions();

  return sanitizeOAuthSession(session);
}

export function getConnectorOAuthSetupSession(connectorId, state) {
  const { session } = findConnectorOAuthSessionOrThrow(connectorId, state);
  if (session.status === 'pending' && Date.now() > new Date(session.expiresAt).getTime()) {
    session.status = 'expired';
    session.error = 'OAuth setup session expired.';
    saveConnectorOAuthSessions();
  }
  return sanitizeOAuthSession(session);
}

function shouldExchangeConnectorOAuthToken(session) {
  return Boolean(
    session.tokenUrl &&
    (
      session.clientSecretRef ||
      session.codeVerifierRef ||
      session.encryptedClientSecret ||
      session.encryptedCodeVerifier ||
      process.env.PRIME_CONNECTOR_OAUTH_EXCHANGE_ENABLED === 'true'
    )
  );
}

async function exchangeConnectorOAuthCode(session, code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: session.redirectUri,
    client_id: session.appId,
  });
  const clientSecret = getSessionCredential(session, 'clientSecret');
  const codeVerifier = getSessionCredential(session, 'codeVerifier');

  if (clientSecret) body.set('client_secret', clientSecret);
  if (codeVerifier) body.set('code_verifier', codeVerifier);

  const response = await fetch(session.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const tokenBody = await response.json().catch(() => ({}));
  if (!response.ok || !tokenBody.access_token) {
    const detail = tokenBody.error_description || tokenBody.error || `HTTP ${response.status}`;
    const error = new Error(`OAuth token exchange failed: ${detail}`);
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  return tokenBody;
}

function applyOAuthTokenExchange(connector, session, tokenBody, timestamp) {
  const expiresIn = Number(tokenBody.expires_in || 0);
  const tokenExpiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;
  const accessToken = String(tokenBody.access_token || '');
  const refreshToken = tokenBody.refresh_token ? String(tokenBody.refresh_token) : '';
  const accessTokenRef = storeConnectorCredential({
    connector,
    type: 'oauth_access_token',
    value: accessToken,
    environment: connector.environment,
    sessionId: session.state,
  });
  const refreshTokenRef = refreshToken ? storeConnectorCredential({
    connector,
    type: 'oauth_refresh_token',
    value: refreshToken,
    environment: connector.environment,
    sessionId: session.state,
  }) : session.refreshTokenRef || null;
  const refreshTokenLast4 = refreshToken ? refreshToken.slice(-4) : session.refreshTokenLast4 || null;

  session.status = 'token_exchanged';
  session.tokenExchangeStatus = 'complete';
  session.tokenType = String(tokenBody.token_type || 'Bearer');
  session.accessTokenLast4 = accessToken.slice(-4);
  session.refreshTokenLast4 = refreshTokenLast4;
  session.tokenExpiresAt = tokenExpiresAt;
  session.scopeGranted = tokenBody.scope ? String(tokenBody.scope) : (session.scopes || []).join(' ');
  session.accessTokenRef = accessTokenRef;
  session.refreshTokenRef = refreshTokenRef;
  revokeVaultCredential(session.codeVerifierRef, timestamp);
  session.codeVerifierRef = null;

  connector.status = 'connected';
  connector.syncHealth = Math.max(96, Number(connector.syncHealth || 0));
  connector.lastSync = 'OAuth token exchanged';
  connector.credentialStatus = 'configured';
  connector.maskedCredential = `oauth:${session.accessTokenLast4}`;
  connector.connectedAt = timestamp;
  connector.lastTestAt = timestamp;
  connector.credentialMeta = {
    ...(connector.credentialMeta || {}),
    appId: session.appId,
    oauthProvider: session.oauthProvider,
    oauthSessionId: session.id,
    oauthStateLast4: session.state.slice(-4),
    authorizationCodeLast4: session.authorizationCodeLast4,
    tokenLast4: session.accessTokenLast4,
    refreshTokenLast4: session.refreshTokenLast4,
    tokenType: session.tokenType,
    tokenExpiresAt,
    scopeGranted: session.scopeGranted,
    tokenRef: session.accessTokenRef,
    refreshTokenRef: session.refreshTokenRef,
    vaultWorkspaceId: getConnectorWorkspaceId(connector),
  };
}

export async function completeConnectorOAuthSetup(connectorId, query = {}) {
  const state = String(query.state || '').trim();
  const code = String(query.code || '').trim();
  const providerError = String(query.error || '').trim();
  const { connector, session } = findConnectorOAuthSessionOrThrow(connectorId, state);
  const timestamp = new Date().toISOString();

  if (Date.now() > new Date(session.expiresAt).getTime()) {
    session.status = 'expired';
    session.error = 'OAuth setup session expired.';
    saveConnectorOAuthSessions();
    const error = new Error(session.error);
    error.statusCode = 410;
    throw error;
  }

  if (providerError) {
    session.status = 'failed';
    session.error = providerError;
    session.completedAt = timestamp;
    saveConnectorOAuthSessions();
    const error = new Error(`OAuth provider returned error: ${providerError}`);
    error.statusCode = 400;
    throw error;
  }

  if (!code) {
    const error = new Error('OAuth authorization code is required.');
    error.statusCode = 400;
    throw error;
  }

  session.status = 'authorization_code_received';
  session.tokenExchangeStatus = 'not_started';
  session.completedAt = timestamp;
  session.authorizationCodeLast4 = code.slice(-4);
  session.error = null;
  connector.status = connector.status === 'connected' ? 'connected' : 'tested';
  connector.syncHealth = Math.max(88, Number(connector.syncHealth || 0));
  connector.lastSync = 'OAuth callback received';
  connector.accountRef = session.accountRef;
  connector.credentialStatus = 'validated';
  connector.maskedCredential = `oauth:${session.authorizationCodeLast4}`;
  connector.lastTestAt = timestamp;
  connector.credentialMeta = {
    ...(connector.credentialMeta || {}),
    appId: session.appId,
    oauthProvider: session.oauthProvider,
    oauthSessionId: session.id,
    oauthStateLast4: session.state.slice(-4),
    authorizationCodeLast4: session.authorizationCodeLast4,
  };

  if (shouldExchangeConnectorOAuthToken(session)) {
    try {
      session.tokenExchangeStatus = 'in_progress';
      const tokenBody = await exchangeConnectorOAuthCode(session, code);
      applyOAuthTokenExchange(connector, session, tokenBody, timestamp);
    } catch (error) {
      session.status = 'token_exchange_failed';
      session.tokenExchangeStatus = 'failed';
      session.error = error instanceof Error ? error.message : 'OAuth token exchange failed.';
      saveConnectorOAuthSessions();
      saveConnectorState();
      throw error;
    }
  }

  growthOsState.updatedAt = timestamp;
  saveConnectorOAuthSessions();
  saveConnectorState();

  return {
    ok: true,
    connector: cloneConnector(connector),
    session: sanitizeOAuthSession(session),
  };
}

export async function refreshConnectorOAuthToken(connectorId, state) {
  const { connector, session } = findConnectorOAuthSessionOrThrow(connectorId, state);
  const refreshToken = getSessionCredential(session, 'refreshToken');
  if (!refreshToken) {
    const error = new Error('OAuth refresh token is not available for this connector session.');
    error.statusCode = 409;
    throw error;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: session.appId,
  });
  const clientSecret = getSessionCredential(session, 'clientSecret');
  if (clientSecret) body.set('client_secret', clientSecret);

  const response = await fetch(session.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const tokenBody = await response.json().catch(() => ({}));
  if (!response.ok || !tokenBody.access_token) {
    const detail = tokenBody.error_description || tokenBody.error || `HTTP ${response.status}`;
    const error = new Error(`OAuth token refresh failed: ${detail}`);
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    session.tokenExchangeStatus = 'refresh_failed';
    session.error = error.message;
    saveConnectorOAuthSessions();
    throw error;
  }

  const timestamp = new Date().toISOString();
  applyOAuthTokenExchange(connector, session, tokenBody, timestamp);
  session.tokenExchangeStatus = 'refreshed';
  session.error = null;
  connector.lastSync = 'OAuth token refreshed';
  connector.lastTestAt = timestamp;
  growthOsState.updatedAt = timestamp;
  saveConnectorOAuthSessions();
  saveConnectorState();

  return {
    ok: true,
    connector: cloneConnector(connector),
    session: sanitizeOAuthSession(session),
  };
}

async function callOAuthRevocationEndpoint(session, token) {
  if (!session.revocationUrl || !token) {
    return { called: false, status: 'local_only' };
  }

  const body = new URLSearchParams({
    token,
    token_type_hint: (session.refreshTokenRef || session.encryptedRefreshToken) ? 'refresh_token' : 'access_token',
  });
  const clientSecret = getSessionCredential(session, 'clientSecret');
  if (session.appId) body.set('client_id', session.appId);
  if (clientSecret) body.set('client_secret', clientSecret);

  const response = await fetch(session.revocationUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const detail = errorBody.error_description || errorBody.error || `HTTP ${response.status}`;
    const error = new Error(`OAuth token revocation failed: ${detail}`);
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  return { called: true, status: 'provider_revoked' };
}

function clearConnectorOAuthCredentials(connector, session, timestamp, revocationStatus) {
  session.status = 'revoked';
  session.revocationStatus = revocationStatus;
  session.revokedAt = timestamp;
  session.tokenExchangeStatus = 'revoked';
  session.tokenExpiresAt = null;
  revokeVaultCredential(session.accessTokenRef, timestamp);
  revokeVaultCredential(session.refreshTokenRef, timestamp);
  session.accessTokenRef = null;
  session.refreshTokenRef = null;
  session.encryptedAccessToken = null;
  session.encryptedRefreshToken = null;
  session.error = null;

  connector.status = 'disconnected';
  connector.syncHealth = 0;
  connector.lastSync = 'OAuth token revoked';
  connector.credentialStatus = 'removed';
  connector.maskedCredential = null;
  connector.connectedAt = null;
  connector.lastTestAt = timestamp;
  connector.credentialMeta = connector.credentialMeta ? {
    appId: connector.credentialMeta.appId,
    oauthProvider: connector.credentialMeta.oauthProvider,
    oauthSessionId: connector.credentialMeta.oauthSessionId,
    oauthStateLast4: connector.credentialMeta.oauthStateLast4,
    authorizationCodeLast4: connector.credentialMeta.authorizationCodeLast4,
    revocationStatus,
    revokedAt: timestamp,
  } : null;
}

export async function revokeConnectorOAuthToken(connectorId, state) {
  const { connector, session } = findConnectorOAuthSessionOrThrow(connectorId, state);
  const refreshToken = getSessionCredential(session, 'refreshToken');
  const accessToken = getSessionCredential(session, 'accessToken');
  const token = refreshToken || accessToken;

  if (!token) {
    const error = new Error('OAuth token is not available for revocation.');
    error.statusCode = 409;
    throw error;
  }

  try {
    const result = await callOAuthRevocationEndpoint(session, token);
    const timestamp = new Date().toISOString();
    clearConnectorOAuthCredentials(connector, session, timestamp, result.status);
    growthOsState.updatedAt = timestamp;
    saveConnectorOAuthSessions();
    saveConnectorState();

    return {
      ok: true,
      providerCalled: result.called,
      connector: cloneConnector(connector),
      session: sanitizeOAuthSession(session),
    };
  } catch (error) {
    session.revocationStatus = 'failed';
    session.error = error instanceof Error ? error.message : 'OAuth token revocation failed.';
    saveConnectorOAuthSessions();
    throw error;
  }
}

function getNestedValue(value, pathValue) {
  if (!pathValue) return value;
  return String(pathValue).split('.').reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, value);
}

function summarizeProbeBody(body) {
  if (!body || typeof body !== 'object') return { type: typeof body };
  const keys = Object.keys(body).slice(0, 8);
  return { keys };
}

function getConnectorProbeProfileOrThrow(connector) {
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
  if (!adapterProfile.probe) {
    const error = new Error(`${connector.name} does not expose a live probe yet.`);
    error.statusCode = 400;
    throw error;
  }
  return { adapterProfile, probeProfile: adapterProfile.probe };
}

function resolveConnectorProbeUrl(connector, probeProfile) {
  if (probeProfile.probeAdapter === 'connector_gateway') {
    return null;
  }

  const configuredBase = String(process.env.PRIME_CONNECTOR_PROBE_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configuredBase) {
    return `${configuredBase}/probe/${encodeURIComponent(connector.provider)}`;
  }

  return String(probeProfile.url || '').replace(/\{accountRef\}/g, encodeURIComponent(connector.accountRef || ''));
}

function findConnectorProbeSession(connector, state = '') {
  const candidates = connectorOAuthSessions
    .filter((session) => session.connectorId === connector.id)
    .map((session) => normalizeConnectorOAuthSession(session));
  if (state) {
    return candidates.find((session) => session.state === state) || null;
  }
  return candidates.find((session) => session.status === 'token_exchanged' && (session.accessTokenRef || session.encryptedAccessToken)) || null;
}

function getConnectorProbeToken(connector, session) {
  return getSessionCredential(session, 'accessToken') || getConnectorCredential(connector, 'accessToken');
}

export async function probeGrowthConnector(connectorId, payload = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const { adapterProfile, probeProfile } = getConnectorProbeProfileOrThrow(connector);
  const session = findConnectorProbeSession(connector, String(payload.state || '').trim());
  const accessToken = getConnectorProbeToken(connector, session);

  if (!accessToken) {
    const error = new Error('Connector access token is required before running a live probe.');
    error.statusCode = 409;
    throw error;
  }

  const timestamp = new Date().toISOString();
  const startedAt = Date.now();

  if (probeProfile.probeAdapter === 'connector_gateway') {
    const { callRealProviderProbe } = await import('./connector-gateway.js');
    const { response, body } = await callRealProviderProbe({ connector, token: accessToken });
    const expectedValue = getNestedValue(body, probeProfile.successPath);
    const expectedMatched = probeProfile.successPath
      ? (Array.isArray(expectedValue) ? expectedValue.length >= 0 : Boolean(expectedValue))
      : true;
    const ok = response.ok && expectedMatched;

    connector.lastTestAt = timestamp;
    connector.syncHealth = ok ? Math.max(96, Number(connector.syncHealth || 0)) : Math.min(75, Number(connector.syncHealth || 75));
    connector.lastSync = ok ? 'Live probe passed' : 'Live probe needs attention';
    connector.credentialMeta = {
      ...(connector.credentialMeta || {}),
      lastProbeAt: timestamp,
      lastProbeStatus: ok ? 'ready' : 'watch',
      lastProbeHttpStatus: response.status,
      lastProbeSource: 'provider_api',
    };
    growthOsState.updatedAt = timestamp;
    saveConnectorState();

    return {
      ok,
      checkedAt: timestamp,
      connectorId: connector.id,
      provider: connector.provider,
      adapterKey: adapterProfile.adapterKey,
      probe: probeProfile.description,
      status: ok ? 'ready' : 'watch',
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      expectedPath: probeProfile.successPath || null,
      expectedMatched,
      responseSummary: summarizeProbeBody(body),
    };
  }

  const url = resolveConnectorProbeUrl(connector, probeProfile);
  if (!assertValidWebhookUrl(url)) {
    const error = new Error('Connector probe URL is not valid.');
    error.statusCode = 400;
    throw error;
  }

  const method = String(probeProfile.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(probeProfile.headers || {}),
  };
  const fetchOptions = { method, headers };
  if (method !== 'GET' && probeProfile.body) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(probeProfile.body);
  }

  const startedAtLegacy = Date.now();
  const response = await fetch(url, fetchOptions);
  const body = await response.json().catch(() => ({}));
  const expectedValue = getNestedValue(body, probeProfile.successPath);
  const expectedMatched = probeProfile.successPath
    ? (Array.isArray(expectedValue) ? expectedValue.length >= 0 : Boolean(expectedValue))
    : true;
  const ok = response.ok && expectedMatched;
  const timestampLegacy = new Date().toISOString();
  const result = {
    ok,
    checkedAt: timestampLegacy,
    connectorId: connector.id,
    provider: connector.provider,
    adapterKey: adapterProfile.adapterKey,
    probe: probeProfile.description,
    status: ok ? 'ready' : 'watch',
    httpStatus: response.status,
    latencyMs: Date.now() - startedAtLegacy,
    expectedPath: probeProfile.successPath || null,
    expectedMatched,
    responseSummary: summarizeProbeBody(body),
  };

  connector.lastTestAt = timestampLegacy;
  connector.syncHealth = ok ? Math.max(96, Number(connector.syncHealth || 0)) : Math.min(75, Number(connector.syncHealth || 75));
  connector.lastSync = ok ? 'Live probe passed' : 'Live probe needs attention';
  connector.credentialMeta = {
    ...(connector.credentialMeta || {}),
    lastProbeAt: timestampLegacy,
    lastProbeStatus: result.status,
    lastProbeHttpStatus: response.status,
  };
  growthOsState.updatedAt = timestampLegacy;
  saveConnectorState();

  return result;
}

function getConnectorVerifier(connector) {
  return getConnectorCredential(connector, 'verifyToken');
}

function getHeaderValue(headers = {}, headerName = '') {
  const wanted = String(headerName || '').toLowerCase();
  const direct = headers[headerName] || headers[wanted];
  if (direct) return Array.isArray(direct) ? direct[0] : String(direct);

  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  if (!match) return '';
  return Array.isArray(match[1]) ? match[1][0] : String(match[1]);
}

function getRawWebhookBody(payload = {}, rawBody = '') {
  if (Buffer.isBuffer(rawBody)) return rawBody.toString('utf8');
  if (typeof rawBody === 'string' && rawBody.length > 0) return rawBody;
  return JSON.stringify(payload ?? {});
}

function compareDigest(expected, provided, encoding = 'hex') {
  if (!expected || !provided) return false;
  try {
    const expectedBuffer = Buffer.from(String(expected).trim(), encoding);
    const providedBuffer = Buffer.from(String(provided).trim(), encoding);
    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

function comparePlainText(expected, provided) {
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(String(expected), 'utf8');
  const providedBuffer = Buffer.from(String(provided), 'utf8');
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function hmacDigest(secret, value, algorithm = 'sha256', encoding = 'hex') {
  return createHmac(algorithm, secret).update(value, 'utf8').digest(encoding);
}

function getWebhookSignatureSecret(connector) {
  return getConnectorVerifier(connector);
}

function getConfiguredSignatureHeader(headers, security = {}) {
  const headerNames = [security.header, ...(security.alternateHeaders || [])].filter(Boolean);
  for (const headerName of headerNames) {
    const value = getHeaderValue(headers, headerName);
    if (value) return { headerName, value };
  }
  return { headerName: security.header || '', value: '' };
}

function parseStripeSignatureHeader(headerValue) {
  return String(headerValue || '').split(',').reduce((parts, item) => {
    const [key, ...rest] = item.split('=');
    if (!key || rest.length === 0) return parts;
    const value = rest.join('=').trim();
    if (key === 'v1') {
      parts.v1.push(value);
    } else {
      parts[key.trim()] = value;
    }
    return parts;
  }, { v1: [] });
}

function verifyStripeSignature({ headerValue, secret, rawBody }) {
  const parts = parseStripeSignatureHeader(headerValue);
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || parts.v1.length === 0) return false;

  const toleranceSeconds = 60 * 5;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > toleranceSeconds) return false;

  const expected = hmacDigest(secret, `${timestamp}.${rawBody}`, 'sha256', 'hex');
  return parts.v1.some((candidate) => compareDigest(expected, candidate, 'hex'));
}

function verifySlackSignature({ headers, secret, rawBody, security }) {
  const signature = getHeaderValue(headers, security.header);
  const timestamp = Number(getHeaderValue(headers, security.timestampHeader));
  if (!signature || !Number.isFinite(timestamp)) return false;

  const toleranceSeconds = 60 * 5;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > toleranceSeconds) return false;

  const signedBody = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${hmacDigest(secret, signedBody, security.algorithm || 'sha256', 'hex')}`;
  return comparePlainText(expected, signature);
}

function getVnpaySignData(payload = {}) {
  return Object.entries(payload)
    .filter(([key, value]) => (
      key.startsWith('vnp_') &&
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      value !== undefined &&
      value !== null &&
      String(value) !== ''
    ))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value)).replace(/%20/g, '+')}`)
    .join('&');
}

function verifyVnpaySignature({ payload, secret }) {
  const provided = String(payload?.vnp_SecureHash || '').trim();
  if (!provided) return false;
  const expected = hmacDigest(secret, getVnpaySignData(payload), 'sha512', 'hex');
  return compareDigest(expected.toLowerCase(), provided.toLowerCase(), 'hex');
}

function verifySimpleWebhookSignature({ security, headers, rawBody, secret }) {
  const { headerName, value } = getConfiguredSignatureHeader(headers, security);
  if (!value) {
    return { ok: false, headerName, reason: 'missing_signature' };
  }

  if (security.format === 'base64') {
    const expected = hmacDigest(secret, rawBody, security.algorithm || 'sha256', 'base64');
    return {
      ok: compareDigest(expected, value, 'base64'),
      headerName,
      reason: 'signature_mismatch',
    };
  }

  const expected = hmacDigest(secret, rawBody, security.algorithm || 'sha256', 'hex');
  const provided = String(value).trim().replace(/^sha256=/i, '');
  return {
    ok: compareDigest(expected, provided, 'hex'),
    headerName,
    reason: 'signature_mismatch',
  };
}

function verifyConnectorWebhookSignature({ connector, adapterProfile, payload, headers, rawBody }) {
  const security = adapterProfile.webhookSecurity || defaultConnectorAdapterProfile.webhookSecurity;
  if (!security.required || security.mode === 'none') {
    return { ok: true, mode: security.mode || 'none', status: 'not_required' };
  }

  const secret = getWebhookSignatureSecret(connector);
  if (!secret) {
    const error = new Error('Connector webhook secret is required before accepting signed events.');
    error.statusCode = 409;
    throw error;
  }

  let valid = false;
  let headerName = security.header || security.field || '';
  let failureReason = 'signature_mismatch';
  const body = getRawWebhookBody(payload, rawBody);

  if (security.mode === 'stripe_signature') {
    const headerValue = getHeaderValue(headers, security.header);
    headerName = security.header;
    failureReason = headerValue ? 'signature_mismatch' : 'missing_signature';
    valid = verifyStripeSignature({ headerValue, secret, rawBody: body });
  } else if (security.mode === 'slack_signature') {
    headerName = security.header;
    failureReason = getHeaderValue(headers, security.header) ? 'signature_mismatch' : 'missing_signature';
    valid = verifySlackSignature({ headers, secret, rawBody: body, security });
  } else if (security.mode === 'shared_secret_header') {
    const headerValue = getHeaderValue(headers, security.header);
    headerName = security.header;
    failureReason = headerValue ? 'signature_mismatch' : 'missing_signature';
    valid = comparePlainText(secret, headerValue);
  } else if (security.mode === 'vnpay_ipn_hash') {
    failureReason = payload?.vnp_SecureHash ? 'signature_mismatch' : 'missing_signature';
    valid = verifyVnpaySignature({ payload, secret });
  } else {
    const result = verifySimpleWebhookSignature({ security, headers, rawBody: body, secret });
    valid = result.ok;
    headerName = result.headerName;
    failureReason = result.reason;
  }

  if (!valid) {
    const error = new Error(failureReason === 'missing_signature' ? 'Webhook signature is required.' : 'Webhook signature does not match.');
    error.statusCode = 401;
    throw error;
  }

  return {
    ok: true,
    mode: security.mode,
    status: 'verified',
    headerName,
  };
}

function extractWebhookEventType(payload = {}, adapterProfile = defaultConnectorAdapterProfile) {
  const directType = payload.type || payload.event || payload.event_type || payload.topic || payload.action;
  if (directType) return String(directType);

  if (payload.object && Array.isArray(payload.entry)) return `${payload.object}.event`;
  if (payload.order_status || payload.order_sn || payload.order_id) return 'order_status_update';
  if (payload.payment_status || payload.vnp_ResponseCode || payload.data?.object?.payment_intent) return 'payment.updated';

  return adapterProfile.webhookEvents?.[0] || 'connector.event';
}

function extractExternalEventId(payload = {}) {
  return String(
    payload.id ||
    payload.event_id ||
    payload.update_id ||
    payload.events?.[0]?.webhookEventId ||
    payload.entry?.[0]?.id ||
    payload.order_sn ||
    payload.order_id ||
    payload.payment_id ||
    payload.vnp_TxnRef ||
    payload.vnp_TransactionNo ||
    payload.data?.object?.id ||
    `evt_${Date.now().toString(36)}`
  );
}

function inferConnectorDomain(connector, eventType = '', adapterProfile = defaultConnectorAdapterProfile) {
  const normalizedType = String(eventType || '').toLowerCase();
  const familySet = new Set((adapterProfile.eventFamilies || []).map((family) => String(family).toLowerCase()));

  if (familySet.has('payment') || connector.category === 'Payments' || /payment|refund|charge|capture|ipn|dispute/.test(normalizedType)) {
    return 'payment';
  }

  if (familySet.has('order') || connector.category === 'Commerce' || /order|product|inventory|stock|fulfillment/.test(normalizedType)) {
    return 'order';
  }

  if (familySet.has('message') || ['Messaging', 'Social'].includes(connector.category) || /message|comment|lead|follow|mention|conversation/.test(normalizedType)) {
    return 'message';
  }

  if (connector.category === 'Compliance' || /invoice|submission|taxpayer|document/.test(normalizedType)) {
    return 'compliance';
  }

  if (['Ads', 'Analytics'].includes(connector.category) || /campaign|analytics|conversion|report|property/.test(normalizedType)) {
    return 'analytics';
  }

  if (['Productivity', 'Automation', 'Email'].includes(connector.category) || /workflow|sheet|mail|database|zap/.test(normalizedType)) {
    return 'workflow';
  }

  return 'connector';
}

function extractMoneyValue(payload = {}) {
  const value = payload.amount || payload.vnp_Amount || payload.data?.object?.amount || payload.payment?.amount || payload.order?.amount;
  if (value === undefined || value === null || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildDomainEventPayload(domain, payload = {}) {
  if (domain === 'message') {
    const message = payload.message || payload.entry?.[0]?.messaging?.[0]?.message || payload.events?.[0]?.message || payload.event || {};
    return {
      threadRef: String(payload.thread_id || payload.chatId || payload.message?.chat?.id || payload.entry?.[0]?.id || payload.events?.[0]?.source?.userId || 'unmapped-thread'),
      actorRef: String(payload.sender?.id || payload.from?.id || payload.message?.from?.id || payload.events?.[0]?.source?.userId || 'unknown-actor'),
      textPreview: String(message.text || payload.text || payload.comment || payload.caption || '').slice(0, 160),
    };
  }

  if (domain === 'order') {
    return {
      orderRef: String(payload.order_sn || payload.order_id || payload.orderId || payload.id || payload.resource?.id || 'unmapped-order'),
      skuRef: String(payload.sku || payload.item_id || payload.product_id || payload.admin_graphql_api_id || ''),
      status: String(payload.order_status || payload.status || payload.topic || payload.event || payload.type || 'updated'),
      amount: extractMoneyValue(payload),
    };
  }

  if (domain === 'payment') {
    return {
      paymentRef: String(payload.payment_id || payload.event_id || payload.vnp_TxnRef || payload.vnp_TransactionNo || payload.data?.object?.id || payload.id || 'unmapped-payment'),
      status: String(payload.payment_status || payload.vnp_ResponseCode || payload.type || payload.event || 'updated'),
      amount: extractMoneyValue(payload),
      currency: String(payload.currency || payload.vnp_CurrCode || payload.data?.object?.currency || '').toUpperCase(),
    };
  }

  if (domain === 'compliance') {
    return {
      documentRef: String(payload.document_id || payload.submission_id || payload.uuid || payload.id || 'unmapped-document'),
      status: String(payload.status || payload.event || payload.type || 'updated'),
    };
  }

  if (domain === 'analytics') {
    return {
      accountRef: String(payload.account_id || payload.ad_account_id || payload.property_id || payload.customer_id || ''),
      metricRef: String(payload.metric || payload.campaign_id || payload.event || payload.type || 'sync_requested'),
    };
  }

  if (domain === 'workflow') {
    return {
      workflowRef: String(payload.workflow_id || payload.database_id || payload.spreadsheet_id || payload.zap_id || payload.id || 'unmapped-workflow'),
      action: String(payload.action || payload.event || payload.type || 'triggered'),
    };
  }

  return {
    summary: String(payload.event || payload.type || payload.action || 'connector event'),
  };
}

function getDomainRecordExternalRef(domain, payload = {}) {
  if (domain === 'message') return payload.threadRef;
  if (domain === 'order') return payload.orderRef;
  if (domain === 'payment') return payload.paymentRef;
  if (domain === 'workflow') return payload.workflowRef;
  if (domain === 'compliance') return payload.documentRef;
  if (domain === 'analytics') return payload.accountRef || payload.metricRef;
  return payload.summary;
}

function buildConnectorDomainRecord(domainEvent) {
  const payload = domainEvent.payload || {};
  const base = {
    id: `cdr_${domainEvent.domain}_${domainEvent.id.replace(/^cde_/, '')}`,
    domainEventId: domainEvent.id,
    technicalEventId: domainEvent.technicalEventId,
    connectorId: domainEvent.connectorId,
    provider: domainEvent.provider,
    category: domainEvent.category,
    adapterKey: domainEvent.adapterKey,
    domain: domainEvent.domain,
    eventType: domainEvent.eventType,
    externalEventId: domainEvent.externalEventId,
    externalRef: String(getDomainRecordExternalRef(domainEvent.domain, payload) || domainEvent.externalEventId || domainEvent.id),
    status: payload.status || payload.action || 'updated',
    amount: payload.amount ?? null,
    currency: payload.currency || '',
    payload,
    firstSeenAt: domainEvent.receivedAt,
    updatedAt: domainEvent.routedAt || new Date().toISOString(),
  };

  if (domainEvent.domain === 'message') {
    return {
      ...base,
      threadRef: payload.threadRef,
      actorRef: payload.actorRef,
      textPreview: payload.textPreview,
    };
  }

  if (domainEvent.domain === 'order') {
    return {
      ...base,
      orderRef: payload.orderRef,
      skuRef: payload.skuRef,
    };
  }

  if (domainEvent.domain === 'payment') {
    return {
      ...base,
      paymentRef: payload.paymentRef,
    };
  }

  if (domainEvent.domain === 'workflow') {
    return {
      ...base,
      workflowRef: payload.workflowRef,
      action: payload.action,
    };
  }

  if (domainEvent.domain === 'compliance') {
    return {
      ...base,
      documentRef: payload.documentRef,
    };
  }

  if (domainEvent.domain === 'analytics') {
    return {
      ...base,
      accountRef: payload.accountRef,
      metricRef: payload.metricRef,
    };
  }

  return base;
}

function projectConnectorDomainRecord(domainEvent) {
  const domain = connectorDomainRecordNames.includes(domainEvent.domain) ? domainEvent.domain : 'connector';
  const record = buildConnectorDomainRecord({ ...domainEvent, domain });
  const records = connectorDomainRecords[domain] || [];
  const existingIndex = records.findIndex((item) => (
    item.domainEventId === record.domainEventId ||
    (item.connectorId === record.connectorId && item.domain === record.domain && item.externalRef === record.externalRef)
  ));

  if (existingIndex >= 0) {
    records[existingIndex] = {
      ...records[existingIndex],
      ...record,
      firstSeenAt: records[existingIndex].firstSeenAt || record.firstSeenAt,
    };
  } else {
    records.unshift(record);
  }

  if (records.length > 500) {
    records.length = 500;
  }
  connectorDomainRecords[domain] = records;
  saveConnectorDomainRecords();
  return record;
}

function routeConnectorWebhookEvent({ connector, adapterProfile, event, payload }) {
  const domain = inferConnectorDomain(connector, event.eventType, adapterProfile);
  const timestamp = new Date().toISOString();
  const domainEvent = {
    id: `cde_${Date.now().toString(36)}_${connectorDomainEvents.length + 1}`,
    technicalEventId: event.id,
    connectorId: connector.id,
    provider: connector.provider,
    category: connector.category,
    adapterKey: adapterProfile.adapterKey,
    domain,
    eventType: event.eventType,
    externalEventId: event.externalEventId,
    status: 'routed',
    receivedAt: event.receivedAt,
    routedAt: timestamp,
    attemptCount: 1,
    maxAttempts: CONNECTOR_DOMAIN_EVENT_MAX_ATTEMPTS,
    lastAttemptAt: timestamp,
    nextRetryAt: null,
    lastError: null,
    deadLetteredAt: null,
    requeuedAt: null,
    payload: buildDomainEventPayload(domain, payload),
  };

  connectorDomainEvents.unshift(domainEvent);
  if (connectorDomainEvents.length > 500) {
    connectorDomainEvents.length = 500;
  }
  saveConnectorDomainEvents();
  const domainRecord = projectConnectorDomainRecord(domainEvent);
  domainEvent.domainRecordId = domainRecord.id;
  saveConnectorDomainEvents();
  return domainEvent;
}

export function verifyConnectorWebhook(connectorId, query = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
  const expectedVerifyToken = getConnectorVerifier(connector);
  const providedVerifyToken = String(
    query.verifyToken ||
    query.verify_token ||
    query['hub.verify_token'] ||
    query.token ||
    ''
  ).trim();
  const challenge = String(query.challenge || query['hub.challenge'] || 'primeos-webhook-ok');

  if (expectedVerifyToken && providedVerifyToken !== expectedVerifyToken) {
    const error = new Error('Webhook verification token does not match.');
    error.statusCode = 403;
    throw error;
  }

  return {
    ok: true,
    challenge,
    connectorId: connector.id,
    provider: connector.provider,
    adapterKey: adapterProfile.adapterKey,
    verificationMode: expectedVerifyToken ? 'verify_token' : 'open_callback',
  };
}

function buildConnectorSampleWebhookPayload(connector, adapterProfile, requestedDomain = '') {
  const sampleIndex = connectorWebhookEvents.length + connectorDomainEvents.length + 1;
  const eventType = adapterProfile.webhookEvents?.[0] || 'connector.sample';
  const domain = requestedDomain || inferConnectorDomain(connector, eventType, adapterProfile);
  const eventId = `sample_${connector.provider}_${Date.now().toString(36)}_${sampleIndex}`;
  const base = {
    event_id: eventId,
    event: eventType,
    type: eventType,
    provider: connector.provider,
    account_id: connector.accountRef || connector.provider,
    demo: true,
  };

  if (domain === 'message') {
    return {
      ...base,
      thread_id: `thread_${connector.provider}_demo`,
      sender: { id: `customer_${connector.provider}_001` },
      message: { text: `PrimeOS demo ${connector.name} inbound message` },
      text: `PrimeOS demo ${connector.name} inbound message`,
    };
  }

  if (domain === 'order') {
    return {
      ...base,
      order_id: `order_${connector.provider}_${sampleIndex}`,
      order_status: 'paid',
      sku: 'SKU-DEMO-001',
      amount: 2450000,
    };
  }

  if (domain === 'payment') {
    return {
      ...base,
      payment_id: `pay_${connector.provider}_${sampleIndex}`,
      payment_status: 'completed',
      amount: 2450000,
      currency: connector.provider === 'vnpay' || connector.provider === 'momo' ? 'VND' : 'USD',
    };
  }

  if (domain === 'compliance') {
    return {
      ...base,
      document_id: `doc_${connector.provider}_${sampleIndex}`,
      submission_id: `sub_${connector.provider}_${sampleIndex}`,
      status: 'accepted',
    };
  }

  if (domain === 'analytics') {
    return {
      ...base,
      metric: 'conversion_sync',
      campaign_id: `campaign_${connector.provider}_${sampleIndex}`,
    };
  }

  if (domain === 'workflow') {
    return {
      ...base,
      workflow_id: `workflow_${connector.provider}_${sampleIndex}`,
      action: 'triggered',
      spreadsheet_id: connector.provider === 'google_sheets' ? connector.accountRef : undefined,
      database_id: connector.provider === 'notion' ? connector.accountRef : undefined,
    };
  }

  return {
    ...base,
    action: 'sample_event',
  };
}

function signConnectorSampleWebhookPayload({ connector, adapterProfile, payload }) {
  const security = adapterProfile.webhookSecurity || defaultConnectorAdapterProfile.webhookSecurity;
  const headers = {
    'x-forwarded-for': 'primeos-sample-webhook',
  };
  let signedPayload = payload;
  let rawBody = JSON.stringify(signedPayload);
  let signedHeader = security.header || security.field || '';

  if (!security.required || security.mode === 'none') {
    return { payload: signedPayload, headers, rawBody, signedHeader: '', signatureMode: security.mode || 'none' };
  }

  const secret = getWebhookSignatureSecret(connector);
  if (!secret) {
    const error = new Error('Connector webhook secret is required before generating a sample signed event.');
    error.statusCode = 409;
    throw error;
  }

  if (security.mode === 'stripe_signature') {
    const timestamp = Math.floor(Date.now() / 1000);
    headers[security.header] = `t=${timestamp},v1=${hmacDigest(secret, `${timestamp}.${rawBody}`, security.algorithm || 'sha256', 'hex')}`;
  } else if (security.mode === 'slack_signature') {
    const timestamp = Math.floor(Date.now() / 1000);
    headers[security.timestampHeader] = String(timestamp);
    headers[security.header] = `v0=${hmacDigest(secret, `v0:${timestamp}:${rawBody}`, security.algorithm || 'sha256', 'hex')}`;
  } else if (security.mode === 'shared_secret_header') {
    headers[security.header] = secret;
  } else if (security.mode === 'vnpay_ipn_hash') {
    signedPayload = {
      vnp_TmnCode: connector.accountRef || 'PRIMEOS',
      vnp_TxnRef: payload.payment_id || payload.event_id,
      vnp_Amount: String(payload.amount || 2450000),
      vnp_ResponseCode: '00',
      vnp_TransactionNo: payload.event_id,
    };
    signedPayload.vnp_SecureHash = hmacDigest(secret, getVnpaySignData(signedPayload), security.algorithm || 'sha512', 'hex');
    rawBody = JSON.stringify(signedPayload);
    signedHeader = security.field || 'vnp_SecureHash';
  } else {
    const headerName = security.header || security.alternateHeaders?.[0] || 'x-primeos-signature';
    signedHeader = headerName;
    if (security.format === 'base64') {
      headers[headerName] = hmacDigest(secret, rawBody, security.algorithm || 'sha256', 'base64');
    } else if (security.format === 'hex_prefixed') {
      headers[headerName] = `sha256=${hmacDigest(secret, rawBody, security.algorithm || 'sha256', 'hex')}`;
    } else {
      headers[headerName] = hmacDigest(secret, rawBody, security.algorithm || 'sha256', 'hex');
    }
  }

  return { payload: signedPayload, headers, rawBody, signedHeader, signatureMode: security.mode };
}

export function createConnectorSampleWebhook(connectorId, options = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
  const payload = buildConnectorSampleWebhookPayload(connector, adapterProfile, String(options.domain || '').trim().toLowerCase());
  const signed = signConnectorSampleWebhookPayload({ connector, adapterProfile, payload });
  const event = ingestConnectorWebhook(connector.id, signed.payload, signed.headers, signed.rawBody);

  return {
    ok: true,
    connectorId: connector.id,
    provider: connector.provider,
    adapterKey: adapterProfile.adapterKey,
    signatureMode: signed.signatureMode,
    signedHeader: signed.signedHeader,
    event,
    payloadPreview: JSON.stringify(signed.payload).slice(0, 500),
  };
}

export function ingestConnectorWebhook(connectorId, payload = {}, headers = {}, rawBody = '') {
  const connector = findConnectorOrThrow(connectorId);
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);

  if (!['connected', 'tested'].includes(connector.status)) {
    const error = new Error('Connector must be tested or connected before webhook ingest.');
    error.statusCode = 409;
    throw error;
  }

  const signatureCheck = verifyConnectorWebhookSignature({
    connector,
    adapterProfile,
    payload,
    headers,
    rawBody,
  });

  const event = {
    id: `cwe_${Date.now().toString(36)}_${connectorWebhookEvents.length + 1}`,
    connectorId: connector.id,
    provider: connector.provider,
    category: connector.category,
    adapterKey: adapterProfile.adapterKey,
    webhookSecurityMode: signatureCheck.mode,
    signatureStatus: signatureCheck.status,
    eventType: extractWebhookEventType(payload, adapterProfile),
    externalEventId: extractExternalEventId(payload),
    status: 'accepted',
    receivedAt: new Date().toISOString(),
    sourceIp: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
    payloadPreview: JSON.stringify(payload).slice(0, 500),
  };

  const domainEvent = routeConnectorWebhookEvent({ connector, adapterProfile, event, payload });
  event.domainRoute = domainEvent.domain;
  event.domainEventId = domainEvent.id;
  event.domainRecordId = domainEvent.domainRecordId;

  connectorWebhookEvents.unshift(event);
  if (connectorWebhookEvents.length > 500) {
    connectorWebhookEvents.length = 500;
  }
  saveConnectorWebhookEvents();
  connector.lastSync = 'Just now';
  connector.syncHealth = Math.max(92, Number(connector.syncHealth || 0));
  growthOsState.updatedAt = event.receivedAt;

  emit('webhook:accepted', { event, connector: cloneConnector(connector), adapterProfile });
  if (domainEvent) {
    emit('domain:routed', { domainEvent, connector: cloneConnector(connector), adapterProfile });
  }

  return event;
}

export function getConnectorWebhookEvents(connectorId) {
  const connector = findConnectorOrThrow(connectorId);
  return connectorWebhookEvents.filter((event) => event.connectorId === connector.id).slice(0, 50);
}

function cloneConnectorDomainEvent(event) {
  return JSON.parse(JSON.stringify(normalizeConnectorDomainEvent(event)));
}

function getConnectorDomainEventFilters(filters = {}) {
  if (typeof filters === 'string') {
    return {
      domain: String(filters || 'all').trim().toLowerCase(),
      status: 'all',
    };
  }

  return {
    domain: String(filters.domain || 'all').trim().toLowerCase(),
    status: String(filters.status || 'all').trim().toLowerCase(),
  };
}

function findConnectorDomainEventOrThrow(connectorId, eventId) {
  const connector = findConnectorOrThrow(connectorId);
  const event = connectorDomainEvents.find((item) => item.connectorId === connector.id && item.id === eventId);
  if (!event) {
    const error = new Error('Connector domain event not found.');
    error.statusCode = 404;
    throw error;
  }

  return event;
}

export function getConnectorDomainEventSummary(connectorId) {
  const connector = findConnectorOrThrow(connectorId);
  const scopedEvents = connectorDomainEvents.filter((event) => event.connectorId === connector.id).map((event) => normalizeConnectorDomainEvent(event));
  return scopedEvents.reduce((summary, event) => {
    summary.total += 1;
    summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;
    summary.byDomain[event.domain] = (summary.byDomain[event.domain] || 0) + 1;
    if (event.status === 'retry_pending') summary.retryPending += 1;
    if (event.status === 'dead_letter') summary.deadLetter += 1;
    if (event.status === 'routed') summary.routed += 1;
    return summary;
  }, {
    total: 0,
    routed: 0,
    retryPending: 0,
    deadLetter: 0,
    byStatus: {},
    byDomain: {},
  });
}

export function getConnectorDomainEvents(connectorId, filters = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const { domain, status } = getConnectorDomainEventFilters(filters);
  return connectorDomainEvents
    .filter((event) => event.connectorId === connector.id)
    .map((event) => normalizeConnectorDomainEvent(event))
    .filter((event) => domain === 'all' || event.domain === domain)
    .filter((event) => status === 'all' || event.status === status)
    .slice(0, 50);
}

export function getConnectorDomainRecordSummary(connectorId) {
  const connector = findConnectorOrThrow(connectorId);
  return connectorDomainRecordNames.reduce((summary, domain) => {
    const records = (connectorDomainRecords[domain] || []).filter((record) => record.connectorId === connector.id);
    summary.total += records.length;
    summary.byDomain[domain] = records.length;
    return summary;
  }, {
    total: 0,
    byDomain: {},
  });
}

export function getConnectorDomainRecords(connectorId, domain = 'all') {
  const connector = findConnectorOrThrow(connectorId);
  const normalizedDomain = String(domain || 'all').trim().toLowerCase();
  const domains = normalizedDomain === 'all'
    ? connectorDomainRecordNames
    : connectorDomainRecordNames.filter((item) => item === normalizedDomain);
  return domains
    .flatMap((item) => connectorDomainRecords[item] || [])
    .filter((record) => record.connectorId === connector.id)
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .slice(0, 50);
}

export function retryConnectorDomainEvent(connectorId, eventId) {
  const event = findConnectorDomainEventOrThrow(connectorId, eventId);
  const normalizedEvent = normalizeConnectorDomainEvent(event);
  if (!['retry_pending', 'requeued'].includes(normalizedEvent.status)) {
    const error = new Error('Only retry pending or requeued domain events can be retried.');
    error.statusCode = 409;
    throw error;
  }

  const timestamp = new Date().toISOString();
  const nextAttemptCount = Number(normalizedEvent.attemptCount || 0) + 1;
  Object.assign(event, {
    status: 'routed',
    attemptCount: nextAttemptCount,
    maxAttempts: normalizedEvent.maxAttempts,
    lastAttemptAt: timestamp,
    routedAt: timestamp,
    nextRetryAt: null,
    lastError: null,
    deadLetteredAt: null,
  });
  saveConnectorDomainEvents();

  return cloneConnectorDomainEvent(event);
}

export function deadLetterConnectorDomainEvent(connectorId, eventId, payload = {}) {
  const event = findConnectorDomainEventOrThrow(connectorId, eventId);
  const normalizedEvent = normalizeConnectorDomainEvent(event);
  const timestamp = new Date().toISOString();
  Object.assign(event, {
    status: 'dead_letter',
    attemptCount: Number(normalizedEvent.attemptCount || 0),
    maxAttempts: normalizedEvent.maxAttempts,
    lastAttemptAt: normalizedEvent.lastAttemptAt,
    nextRetryAt: null,
    lastError: String(payload.reason || payload.error || 'Moved to dead letter queue by operator.').slice(0, 240),
    deadLetteredAt: timestamp,
  });
  saveConnectorDomainEvents();

  return cloneConnectorDomainEvent(event);
}

export function requeueConnectorDomainEvent(connectorId, eventId, payload = {}) {
  const event = findConnectorDomainEventOrThrow(connectorId, eventId);
  const normalizedEvent = normalizeConnectorDomainEvent(event);
  if (normalizedEvent.status !== 'dead_letter') {
    const error = new Error('Only dead-lettered domain events can be requeued.');
    error.statusCode = 409;
    throw error;
  }

  const timestamp = new Date().toISOString();
  Object.assign(event, {
    status: 'retry_pending',
    attemptCount: Number(normalizedEvent.attemptCount || 0),
    maxAttempts: normalizedEvent.maxAttempts,
    nextRetryAt: timestamp,
    lastError: String(payload.reason || 'Requeued by operator.').slice(0, 240),
    deadLetteredAt: null,
    requeuedAt: timestamp,
  });
  saveConnectorDomainEvents();

  return cloneConnectorDomainEvent(event);
}

function applyConnectorSetup(connector, setup, status) {
  const timestamp = new Date().toISOString();
  connector.status = status;
  connector.syncHealth = status === 'connected' ? Math.max(96, Number(connector.syncHealth || 0)) : Math.max(88, Number(connector.syncHealth || 0));
  connector.lastSync = status === 'connected' ? 'Just now' : connector.lastSync;
  connector.direction = connector.direction || 'two_way';
  connector.inboundEnabled = connector.inboundEnabled !== false;
  connector.outboundEnabled = connector.outboundEnabled !== false;
  connector.accountRef = setup.accountRef;
  connector.webhookUrl = setup.webhookUrl;
  connector.environment = setup.environment;
  connector.credentialStatus = status === 'connected' ? 'configured' : 'validated';
  connector.maskedCredential = maskCredential(setup.accessToken);
  connector.lastTestAt = timestamp;
  const tokenRef = storeConnectorCredential({
    connector,
    type: 'access_token',
    value: setup.accessToken,
    environment: setup.environment,
  });
  const verifyTokenRef = setup.verifyToken ? storeConnectorCredential({
    connector,
    type: 'webhook_secret',
    value: setup.verifyToken,
    environment: setup.environment,
  }) : undefined;
  connector.credentialMeta = {
    appId: setup.appId || undefined,
    tokenRef,
    verifyTokenRef,
    tokenLast4: setup.accessToken.slice(-4),
    verifyTokenLast4: setup.verifyToken ? setup.verifyToken.slice(-4) : undefined,
    vaultWorkspaceId: getConnectorWorkspaceId(connector),
  };

  if (status === 'connected') {
    connector.connectedAt = timestamp;
  }

  growthOsState.updatedAt = timestamp;
  saveConnectorState();
}

function cloneConnector(connector) {
  return sanitizeConnectorForResponse(connector);
}

export function getGrowthOsSnapshot() {
  return cloneGrowthOsState();
}

export function findRawConnector(connectorId) {
  return growthOsState.connectors.find(
    (c) => c.id === connectorId || c.provider === connectorId
  ) || null;
}

export function createGrowthLead(payload = {}) {
  const company = String(payload.company || '').trim();
  const contact = String(payload.contact || '').trim();
  const source = String(payload.source || 'Manual').trim();

  if (company.length < 2 || contact.length < 2) {
    const error = new Error('Company and contact are required.');
    error.statusCode = 400;
    throw error;
  }

  const lead = {
    id: `lead_${Date.now().toString(36)}`,
    company,
    contact,
    source,
    stage: 'new',
    score: Number(payload.score || 72),
    value: Number(payload.value || 0),
    nextAction: String(payload.nextAction || 'Qualify lead'),
    owner: String(payload.owner || 'Sales Team'),
    dueAt: String(payload.dueAt || 'Today'),
    lastActivity: 'Lead captured',
  };

  growthOsState.leads.unshift(lead);
  growthOsState.metrics.totalLeads += 1;
  growthOsState.updatedAt = new Date().toISOString();

  return lead;
}

export function updateGrowthLeadStage(leadId, payload = {}) {
  const nextStage = String(payload.stage || '').trim();
  if (!leadStages.includes(nextStage)) {
    const error = new Error(`Unsupported lead stage: ${nextStage}`);
    error.statusCode = 400;
    throw error;
  }

  const lead = findLeadOrThrow(leadId);
  const previousStage = lead.stage;
  adjustMetricForStageMove(previousStage, nextStage);

  lead.stage = nextStage;
  lead.nextAction = String(payload.nextAction || nextActionsByStage[nextStage] || lead.nextAction);
  lead.dueAt = String(payload.dueAt || (nextStage === 'confirmed' ? 'Done' : 'Tomorrow 09:00'));
  lead.lastActivity = `Stage moved from ${previousStage} to ${nextStage}`;
  growthOsState.updatedAt = new Date().toISOString();

  return lead;
}

export function logGrowthLeadFollowUp(leadId, payload = {}) {
  const lead = findLeadOrThrow(leadId);
  const note = String(payload.note || 'Follow-up logged').trim();
  const nextAction = String(payload.nextAction || 'Schedule next follow-up').trim();

  lead.score = Math.min(100, Number(lead.score || 0) + 2);
  lead.nextAction = nextAction;
  lead.dueAt = String(payload.dueAt || 'Tomorrow 09:00');
  lead.lastActivity = note;
  growthOsState.updatedAt = new Date().toISOString();

  return lead;
}

export async function testGrowthConnector(connectorId, payload = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const setup = getConnectorSetupPayload(connector, payload);
  const nextStatus = connector.status === 'connected' ? 'connected' : 'tested';
  applyConnectorSetup(connector, setup, nextStatus);
  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);

  const result = {
    ok: true,
    checkedAt: connector.lastTestAt,
    connector: cloneConnector(connector),
    adapterProfile,
    readinessChecks: buildConnectorReadinessChecks(connector, setup),
    result: {
      provider: connector.provider,
      direction: connector.direction,
      inbound: connector.inboundEnabled,
      outbound: connector.outboundEnabled,
      webhookUrl: connector.webhookUrl,
      accountRef: connector.accountRef,
    },
  };

  if (adapterProfile.probe?.probeAdapter === 'connector_gateway' && !shouldSkipConnectorLiveProbe()) {
    try {
      const { callRealProviderProbe, describeRealProbeForDemo } = await import('./connector-gateway.js');
      const accessToken = getConnectorCredential(connector, 'accessToken');
      if (!accessToken) {
        result.liveProbe = {
          attempted: true,
          ok: false,
          reason: 'token_missing',
          detail: 'Connector access token not available for live probe.',
        };
      } else {
        const startedAt = Date.now();
        const { response, body } = await callRealProviderProbe({ connector, token: accessToken });
        const expectedValue = getNestedValue(body, adapterProfile.probe.successPath);
        const expectedMatched = adapterProfile.probe.successPath
          ? (Array.isArray(expectedValue) ? expectedValue.length >= 0 : Boolean(expectedValue))
          : true;
        const probeOk = response.ok && expectedMatched;
        result.liveProbe = {
          attempted: true,
          ok: probeOk,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          expectedPath: adapterProfile.probe.successPath || null,
          expectedMatched,
          source: 'provider_api',
          description: adapterProfile.probe.description,
          responseKeys: Object.keys(body || {}).slice(0, 8),
        };

        connector.syncHealth = probeOk ? Math.max(96, Number(connector.syncHealth || 0)) : Math.min(75, Number(connector.syncHealth || 75));
        connector.lastSync = probeOk ? 'Live probe passed' : `Live probe failed (HTTP ${response.status})`;
        connector.credentialMeta = {
          ...(connector.credentialMeta || {}),
          lastProbeAt: new Date().toISOString(),
          lastProbeStatus: probeOk ? 'ready' : 'watch',
          lastProbeHttpStatus: response.status,
          lastProbeSource: 'provider_api',
        };
        growthOsState.updatedAt = new Date().toISOString();
        saveConnectorState();
        result.connector = cloneConnector(connector);
        result.checkedAt = connector.lastTestAt || result.checkedAt;
      }
    } catch (probeError) {
      result.liveProbe = {
        attempted: true,
        ok: false,
        reason: 'probe_error',
        detail: probeError instanceof Error ? probeError.message : 'Live probe failed.',
        httpStatus: probeError.statusCode || 0,
      };
    }
  }

  return result;
}

export async function connectGrowthConnector(connectorId, payload = {}) {
  const connector = findConnectorOrThrow(connectorId);
  const setup = getConnectorSetupPayload(connector, payload);
  applyConnectorSetup(connector, setup, 'connected');
  const result = cloneConnector(connector);

  const adapterProfile = connector.adapterProfile || getConnectorAdapterProfile(connector.provider);
  if (adapterProfile.probe?.probeAdapter === 'connector_gateway' && !shouldSkipConnectorLiveProbe()) {
    try {
      const { callRealProviderProbe } = await import('./connector-gateway.js');
      const accessToken = getConnectorCredential(connector, 'accessToken');
      if (accessToken) {
        const startedAt = Date.now();
        const { response, body } = await callRealProviderProbe({ connector, token: accessToken });
        const expectedValue = getNestedValue(body, adapterProfile.probe.successPath);
        const expectedMatched = adapterProfile.probe.successPath
          ? (Array.isArray(expectedValue) ? expectedValue.length >= 0 : Boolean(expectedValue))
          : true;
        const probeOk = response.ok && expectedMatched;
        result._connectProbe = {
          ok: probeOk,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          expectedPath: adapterProfile.probe.successPath || null,
          expectedMatched,
          description: adapterProfile.probe.description,
        };
        connector.syncHealth = probeOk ? Math.max(96, Number(connector.syncHealth || 0)) : Math.min(75, Number(connector.syncHealth || 75));
        connector.lastSync = probeOk ? 'Connected — live probe passed' : `Connected — probe returned HTTP ${response.status}`;
        connector.credentialMeta = {
          ...(connector.credentialMeta || {}),
          lastProbeAt: new Date().toISOString(),
          lastProbeStatus: probeOk ? 'ready' : 'watch',
          lastProbeHttpStatus: response.status,
          lastProbeSource: 'provider_api',
        };
        growthOsState.updatedAt = new Date().toISOString();
        saveConnectorState();
      }
    } catch (probeError) {
      result._connectProbe = {
        ok: false,
        reason: 'probe_error',
        detail: probeError instanceof Error ? probeError.message : 'Live probe failed.',
        httpStatus: probeError.statusCode || 0,
      };
    }
  }

  return result;
}

export function disconnectGrowthConnector(connectorId) {
  const connector = findConnectorOrThrow(connectorId);
  const timestamp = new Date().toISOString();
  const credentialMeta = connector.credentialMeta || {};
  revokeVaultCredential(credentialMeta.tokenRef, timestamp);
  revokeVaultCredential(credentialMeta.refreshTokenRef, timestamp);
  revokeVaultCredential(credentialMeta.verifyTokenRef, timestamp);
  revokeVaultCredential(credentialMeta.clientSecretRef, timestamp);

  connector.status = 'disconnected';
  connector.syncHealth = 0;
  connector.lastSync = 'Disconnected';
  connector.accountRef = '';
  connector.credentialStatus = 'removed';
  connector.maskedCredential = null;
  connector.credentialMeta = null;
  connector.connectedAt = null;
  connector.lastTestAt = null;
  growthOsState.updatedAt = timestamp;
  saveConnectorState();

  return cloneConnector(connector);
}

export function approveGrowthAiAction(actionId) {
  const action = growthOsState.aiActions.find((item) => item.id === actionId);
  if (!action) return null;

  action.status = 'approved';
  growthOsState.metrics.aiActionsCompleted += 1;
  growthOsState.updatedAt = new Date().toISOString();

  return action;
}

on('webhook:accepted', ({ event, connector }) => {
  enqueue({
    type: 'webhook_health_update',
    payload: { connectorId: connector.id, provider: connector.provider, eventId: event.id },
    handler: async () => {
      connector.lastSync = 'Just now';
      connector.syncHealth = Math.max(92, Number(connector.syncHealth || 0));
      growthOsState.updatedAt = new Date().toISOString();
      saveConnectorState();
    },
    maxAttempts: 2,
    processor: 'webhook_health',
  });
});

on('domain:routed', ({ domainEvent, connector }) => {
  enqueue({
    type: 'domain_event_retry_watch',
    payload: {
      connectorId: connector.id,
      provider: connector.provider,
      domainEventId: domainEvent.id,
      domain: domainEvent.domain,
      eventType: domainEvent.eventType,
    },
    handler: async ({ domainEventId }) => {
      const event = connectorDomainEvents.find((item) => item.id === domainEventId);
      if (!event) return;
      if (event.status === 'retry_pending' && (event.attemptCount || 0) < (event.maxAttempts || 3)) {
        const normalizedEvent = normalizeConnectorDomainEvent(event);
        const nextAttemptCount = Number(normalizedEvent.attemptCount || 0) + 1;
        const timestamp = new Date().toISOString();
        Object.assign(event, {
          status: 'routed',
          attemptCount: nextAttemptCount,
          maxAttempts: normalizedEvent.maxAttempts,
          lastAttemptAt: timestamp,
          routedAt: timestamp,
          nextRetryAt: null,
          lastError: null,
        });
        saveConnectorDomainEvents();
        projectConnectorDomainRecord(event);
      }
    },
    maxAttempts: 5,
    processor: 'domain_event_worker',
  });
});

console.log('[growth-os] Event bus handlers registered for webhook:accepted and domain:routed');
