// English response templates for the PrimeOS orchestration copilot.

import { type CopilotDomain, type GlobalCopilotAction, type GlobalCopilotMessage } from './types';

interface TemplateResponse {
  content: string;
  actions?: GlobalCopilotAction[];
}

export function getWelcomeMessage(): Omit<GlobalCopilotMessage, 'id' | 'timestamp'> {
  return {
    role: 'assistant',
    content: `**Hello, I am PrimeOS Copilot.**

I can help you with:

- **Product Master**: Create and standardize products or generate listing content.
- **Listings**: Manage listings across Amazon, Shopee, and Rakuten.
- **Warehouses**: Review warehouse information and routing configuration.
- **Orders**: Track orders and troubleshoot operational issues.
- **QC & Support**: Review policies and create test data.

For inventory availability and stock diagnostics, use **Inventory Copilot** from Inventory Summary.

How can I help?`,
    actions: [
      { type: 'navigate', label: 'Open Products', url: '/products' },
      { type: 'navigate', label: 'Open Orders', url: '/orders' },
      { type: 'navigate', label: 'Open Inventory Copilot', url: '/inventory/summary' },
    ],
  };
}

export function getHelpResponse(): TemplateResponse {
  return {
    content: `**What can I help you with?**

**1. Product Master AI**
- Create a new product.
- Standardize attributes for a marketplace.
- Generate listing content for a SKU.

**2. Listings**
- Check a product listing status.
- Diagnose listing errors.
- Synchronize listings with a marketplace.

**3. Warehouses & Routing**
- Review a warehouse routing configuration.
- Change priority ranking.
- Explain why a marketplace-managed warehouse is read-only.

**4. Orders**
- Diagnose why an order is blocked.
- Review cancellation steps.
- Troubleshoot shipping delays.

**5. QC & Policy**
- Explain warehouse synchronization policies.
- Create test data for QA.

For stock lookup, use **Inventory Copilot** from Inventory Summary.`,
    actions: [{ type: 'navigate', label: 'Open Inventory Copilot', url: '/inventory/summary' }],
  };
}

export function getDomainResponse(domain: CopilotDomain): TemplateResponse {
  switch (domain) {
    case 'product': return getProductDomainResponse();
    case 'listing': return getListingDomainResponse();
    case 'warehouse':
    case 'routing_config': return getWarehouseDomainResponse();
    case 'orders': return getOrdersDomainResponse();
    case 'qc_support': return getQcSupportResponse();
    case 'admin_integration': return getAdminIntegrationResponse();
    default: return getUnknownDomainResponse();
  }
}

function getProductDomainResponse(): TemplateResponse {
  return {
    content: `**Product Master AI**

I can help you:
- Review existing product and SKU records.
- Prepare a new master product draft.
- Generate titles, bullets, and descriptions for a sales channel.
- Validate attributes against marketplace requirements.

What would you like to do?`,
    actions: [
      { type: 'navigate', label: 'Open Products', url: '/products' },
      { type: 'navigate', label: 'Create New Product', url: '/products/new' },
    ],
  };
}

function getListingDomainResponse(): TemplateResponse {
  return {
    content: `**Listings Management**

I can help you:
- Review listing status across connected channels.
- Prepare a listing from an existing master product or SKU.
- Diagnose validation and synchronization errors.
- Check the latest synchronization status.

Which listing would you like to review?`,
    actions: [{ type: 'navigate', label: 'Open Listings', url: '/listings' }],
  };
}

function getWarehouseDomainResponse(): TemplateResponse {
  return {
    content: `**Warehouses & Fulfillment Network**

I can help you:
- Review warehouse profiles, capabilities, and constraints.
- Review and adjust routing configuration.
- Explain fulfillment ranking rules.

Marketplace-managed virtual warehouses are read-only because Amazon FBA, Shopee Fulfillment, and similar providers control their source data.

What warehouse information do you need?`,
    actions: [{ type: 'navigate', label: 'Open Warehouses', url: '/warehouses' }],
  };
}

function getOrdersDomainResponse(): TemplateResponse {
  return {
    content: `**Orders Management**

I can help you:
- Review order status, timeline, and shipping information.
- Diagnose why an order is blocked.
- Guide cancellation, refund, and reshipment triage.

Which order would you like to review?`,
    actions: [{ type: 'navigate', label: 'Open Orders', url: '/orders' }],
  };
}

function getQcSupportResponse(): TemplateResponse {
  return {
    content: `**QC & Support**

I can help you:
- Review SOPs, processes, and operational policies.
- Create demo data for a QA environment.
- Explain troubleshooting procedures.

What would you like help with?`,
    actions: [{ type: 'navigate', label: 'Open Products', url: '/products' }],
  };
}

function getAdminIntegrationResponse(): TemplateResponse {
  return {
    content: `**Admin & Integrations**

I can help you:
- Review connection status for supported platforms.
- Check the latest synchronization and error status.
- Diagnose integration issues.

Credentials are managed by administrators, and some changes require owner-level permission.

Which connection would you like to check?`,
    actions: [],
  };
}

function getUnknownDomainResponse(): TemplateResponse {
  return {
    content: `I do not yet have enough detail to understand the request.

Try one of these:
- "Create a listing for product XYZ."
- "Why is order #123 blocked?"
- "Open the warehouse routing configuration."
- "Explain the warehouse synchronization policy."

For inventory availability, use **Inventory Copilot** from Inventory Summary.`,
    actions: [{ type: 'navigate', label: 'Open Inventory Copilot', url: '/inventory/summary' }],
  };
}

export const QUICK_PROMPTS = [
  { label: 'How to Use Copilot', prompt: 'help' },
  { label: 'Create New Product', prompt: 'Create a new product' },
  { label: 'Review Listings', prompt: 'Show listings' },
  { label: 'Find an Order', prompt: 'Find an order' },
  { label: 'Routing Configuration', prompt: 'Show routing configuration' },
  { label: 'Virtual Warehouse Policy', prompt: 'Why is a marketplace warehouse read-only?' },
];
