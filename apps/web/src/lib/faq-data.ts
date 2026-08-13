export type FaqWorkspace = 'main' | 'pos' | 'primeweb' | 'inbox';

export type FaqCategoryId =
  | 'getting-started'
  | 'catalog-channels'
  | 'orders-fulfillment'
  | 'pos-hardware'
  | 'storefront'
  | 'customers-inbox'
  | 'account-settings';

export interface FaqArticle {
  slug: string;
  title: string;
  summary: string;
  category: FaqCategoryId;
  workspaces: FaqWorkspace[];
  tags: string[];
  is_top_issue?: boolean;
  read_time: number;
  updated_at: string;
  related_settings_link?: {
    label: string;
    href: string;
  };
  content: string;
}

export const faqWorkspaceLabels: Record<FaqWorkspace, string> = {
  main: 'Main Back-office',
  pos: 'POS',
  primeweb: 'PrimeWeb',
  inbox: 'Prime Inbox',
};

export const faqCategories: Array<{ id: FaqCategoryId; name: string; description: string }> = [
  { id: 'getting-started', name: 'Getting started', description: 'Workspace setup, access, and the core Prime OS operating model.' },
  { id: 'catalog-channels', name: 'Catalog & channels', description: 'Master products, listings, publishing, and channel synchronization.' },
  { id: 'orders-fulfillment', name: 'Orders & fulfillment', description: 'Order lifecycle, warehouse allocation, shipping, and returns.' },
  { id: 'pos-hardware', name: 'POS & hardware', description: 'Registers, receipts, printers, shifts, and physical store operations.' },
  { id: 'storefront', name: 'PrimeWeb storefront', description: 'Themes, domains, content, navigation, and web publishing.' },
  { id: 'customers-inbox', name: 'Customers & Prime Inbox', description: 'Customer profiles, social conversations, tickets, and quick replies.' },
  { id: 'account-settings', name: 'Account & settings', description: 'Users, permissions, integrations, billing, and business configuration.' },
];

export const faqArticles: FaqArticle[] = [
  {
    slug: 'connect-a-marketplace-channel',
    title: 'Connect a marketplace channel',
    summary: 'Authorize Shopee, Lazada, Amazon, or Rakuten and verify the first catalog sync.',
    category: 'catalog-channels',
    workspaces: ['main'],
    tags: ['Channels', 'Marketplace', 'Sync'],
    is_top_issue: true,
    read_time: 4,
    updated_at: 'August 10, 2026',
    related_settings_link: { label: 'Go to Channel Settings', href: '/settings/channels' },
    content: `## Before you connect

Confirm that you have administrator access to the marketplace seller account. Prime OS needs permission to read listings, orders, inventory, and fulfillment events.

## Connect the channel

1. Open **Settings → Channels & Integrations**.
2. Select the marketplace and choose **Connect**.
3. Complete authorization in the marketplace window.
4. Return to Prime OS and select the stores you want to manage.

## Verify the first sync

The connection is ready when the store status is **Connected** and the latest sync shows no errors. Catalog items remain unpublished until you explicitly push them from the Master Catalog.

### If authorization fails

Confirm that pop-ups are enabled, the seller account is active, and your marketplace role includes application authorization. Reconnect after correcting the missing permission.`,
  },
  {
    slug: 'fix-a-pos-receipt-printer',
    title: 'Fix a POS receipt printer that is offline',
    summary: 'Restore a disconnected receipt printer and run a test print without interrupting the register.',
    category: 'pos-hardware',
    workspaces: ['pos'],
    tags: ['POS', 'Hardware', 'Printer'],
    is_top_issue: true,
    read_time: 3,
    updated_at: 'August 9, 2026',
    related_settings_link: { label: 'Go to Hardware Settings', href: '/settings/templates-hardware' },
    content: `## Check the connection

Confirm the printer is powered on and connected to the same network or device as the active register. For USB printers, reconnect the cable before restarting the register.

## Run a test print

Open **Hardware Settings**, select the register, and choose **Test receipt**. A successful test automatically restores the printer status to Online.

## Continue selling safely

If the printer remains unavailable, enable **Digital receipt** for the shift. Completed sales remain recorded and receipts can be printed later from Today Transactions.

### Browser permission

If prompted, allow Prime POS to access the selected printer. Do not select a shared office printer for customer receipts.`,
  },
  {
    slug: 'publish-primeweb-storefront',
    title: 'Publish changes to your PrimeWeb storefront',
    summary: 'Preview theme changes, validate the domain, and publish a new storefront version.',
    category: 'storefront',
    workspaces: ['primeweb'],
    tags: ['PrimeWeb', 'Theme', 'Publishing'],
    is_top_issue: true,
    read_time: 5,
    updated_at: 'August 8, 2026',
    related_settings_link: { label: 'Open Storefront Builder', href: '/builder/theme' },
    content: `## Preview your changes

Use **Preview** to review desktop and mobile layouts. Check navigation, product availability, promotion rules, and checkout links before publishing.

## Publish a version

Choose **Publish**, enter a short version note, and confirm the target domain. PrimeWeb creates a recoverable version before replacing the live storefront.

## Validate the live site

Open the storefront in a private browser window and test one product page and the cart. Product data is sourced from the Main Workspace Master Catalog.

### Roll back

Open version history and restore the last stable version. Rolling back the theme does not roll back catalog or inventory data.`,
  },
  {
    slug: 'recover-missing-social-messages',
    title: 'Recover missing messages in Prime Inbox',
    summary: 'Diagnose disconnected pages, expired permissions, and delayed social message synchronization.',
    category: 'customers-inbox',
    workspaces: ['inbox', 'main'],
    tags: ['Prime Inbox', 'Facebook', 'Zalo'],
    is_top_issue: true,
    read_time: 4,
    updated_at: 'August 11, 2026',
    related_settings_link: { label: 'Check Conversation Channels', href: '/sales-channels/conversation-channels' },
    content: `## Check connection health

Open **Social Integrations** and confirm that the affected page is Connected. An amber status indicates delayed events; a red status means the authorization must be renewed.

## Reconnect the page

Select **Reconnect**, sign in with a page administrator account, and grant message and comment permissions. Prime Inbox resumes ingestion from the time the connection is restored.

## Review conversation filters

Clear Page, Chat or Comment, assignee, and unread filters. Closed conversations remain available under the Closed view.

### Escalate a sync gap

If messages are visible on the social network but absent after reconnecting, open Live Support and include the page name and approximate message time.`,
  },
  {
    slug: 'reroute-an-order-to-another-warehouse',
    title: 'Re-route an order to another warehouse',
    summary: 'Resolve allocation failures by assigning an eligible warehouse before fulfillment starts.',
    category: 'orders-fulfillment',
    workspaces: ['main'],
    tags: ['Orders', 'Warehouse', 'Allocation'],
    is_top_issue: true,
    read_time: 3,
    updated_at: 'August 7, 2026',
    related_settings_link: { label: 'Review Warehouse Settings', href: '/warehouses' },
    content: `## Confirm the blocker

Open the order and review **Inventory Allocation**. Prime OS shows why the current warehouse cannot fulfill the order, including insufficient ATP, disabled channel mapping, or shipping coverage.

## Select another warehouse

Choose an eligible warehouse from the allocation dropdown. Review available and reserved stock, then save the assignment.

## Resume fulfillment

Confirm the order or return it to the batch fulfillment queue. The shipping label must be regenerated if the pickup address changed.

### No eligible warehouse

Transfer stock, split the order according to policy, or contact the customer before changing the promised delivery date.`,
  },
  {
    slug: 'create-your-first-master-product',
    title: 'Create and publish a Master Product',
    summary: 'Create one product record and publish channel-specific listings without duplicating source data.',
    category: 'catalog-channels',
    workspaces: ['main', 'primeweb', 'pos'],
    tags: ['Products', 'PIM', 'Publishing'],
    read_time: 6,
    updated_at: 'August 6, 2026',
    related_settings_link: { label: 'Add Master Product', href: '/products/new' },
    content: `## Create the source record

Add the product title, Master SKU, category, description, media, base price, and tax settings. Add variants only when inventory or price differs by option.

## Prepare channel listings

Select the target channels and complete any required channel fields. Prime OS highlights missing attributes before publishing.

## Publish and monitor

Push the product to selected channels. Green means Synced, amber means Pending, red means Error, and gray means Not published.

### Remove a listing

Use the product action menu and choose **Unlist** for a specific channel. This removes the channel listing without deleting the Master Product.`,
  },
  {
    slug: 'understand-order-sync-statuses',
    title: 'Understand order sync and lifecycle statuses',
    summary: 'Learn the difference between channel synchronization state and fulfillment lifecycle state.',
    category: 'orders-fulfillment',
    workspaces: ['main', 'pos'],
    tags: ['Orders', 'Status', 'Sync'],
    read_time: 4,
    updated_at: 'August 4, 2026',
    content: `## Lifecycle status

Lifecycle status describes operational progress: Pending Confirmation, Awaiting Shipment, In Transit, Completed, or Cancelled / Returned.

## Sync status

Sync status describes whether Prime OS and the selling channel agree on the latest order data. A sync error does not always stop fulfillment, but it must be reviewed before updating the channel again.

## Resolve an error

Open **Errors & Alerts**, inspect the rejected field, correct the source data, and retry synchronization. Avoid creating a duplicate order to work around a sync error.`,
  },
  {
    slug: 'start-and-close-a-pos-shift',
    title: 'Start and close a POS shift',
    summary: 'Open a register with a cash float and reconcile payments at the end of the shift.',
    category: 'pos-hardware',
    workspaces: ['pos'],
    tags: ['POS', 'Shift', 'Cash'],
    read_time: 4,
    updated_at: 'August 3, 2026',
    content: `## Start a shift

Select the outlet and register, enter the opening cash float, and confirm the cashier. Only one active shift can own a register at a time.

## During the shift

Record cash movements with a reason. Refunds and returns are linked to the original transaction and included in reconciliation.

## Close and reconcile

Count each payment method, review differences, and submit the shift. A manager must approve variances above the configured threshold.`,
  },
  {
    slug: 'manage-customer-tags-and-segments',
    title: 'Manage customer tags and dynamic segments',
    summary: 'Use shared customer attributes across CRM, campaigns, orders, and Prime Inbox.',
    category: 'customers-inbox',
    workspaces: ['main', 'inbox'],
    tags: ['CRM', 'Tags', 'Segments'],
    read_time: 5,
    updated_at: 'August 2, 2026',
    related_settings_link: { label: 'Open Segments & Tags', href: '/crm/segments' },
    content: `## Apply a manual tag

Open a customer profile and add a tag such as VIP, B2B, or High Return Risk. Manual tags are immediately visible in Orders and Prime Inbox.

## Build a dynamic segment

Create rules using purchase value, order count, channel, location, or engagement. Dynamic membership updates when customer data changes.

## Use segments safely

Review estimated audience size before activating a campaign. Exclude customers without the required marketing consent.`,
  },
  {
    slug: 'configure-team-roles-and-permissions',
    title: 'Configure team roles and permissions',
    summary: 'Control access to workspaces, stores, warehouses, and high-risk operations.',
    category: 'account-settings',
    workspaces: ['main', 'pos', 'primeweb', 'inbox'],
    tags: ['Users', 'Roles', 'Security'],
    read_time: 5,
    updated_at: 'August 1, 2026',
    related_settings_link: { label: 'Go to Team & Permissions', href: '/settings/team-permissions' },
    content: `## Choose a base role

Start with Admin, Operator, Editor, Cashier, or CS Agent. Each role includes a safe default set of workspace permissions.

## Limit operational scope

Restrict access by store, channel, warehouse, or workspace. Grant high-risk permissions such as refunds, price overrides, and user administration only when required.

## Review access

Audit inactive users and privileged roles regularly. Removing a user ends future access but preserves their activity history.`,
  },
  {
    slug: 'set-up-prime-os-workspaces',
    title: 'Understand the Prime OS workspace model',
    summary: 'Know when to use Main Workspace, POS, PrimeWeb, or Prime Inbox.',
    category: 'getting-started',
    workspaces: ['main', 'pos', 'primeweb', 'inbox'],
    tags: ['Workspace', 'Navigation', 'Setup'],
    read_time: 3,
    updated_at: 'July 30, 2026',
    content: `## Main Workspace

Use Main Workspace for catalog, inventory, orders, fulfillment, customer management, analytics, and system configuration.

## Touchpoint workspaces

PrimeWeb is the storefront design workspace. POS is the physical selling interface. Prime Inbox is the fullscreen customer conversation and social commerce desk.

## Switch workspaces

Use the Workspace Switcher in the application header. Your role and permissions determine which workspaces are available.`,
  },
];

export function getFaqArticle(slug: string | undefined) {
  return faqArticles.find((article) => article.slug === slug);
}

export function getFaqCategory(categoryId: FaqCategoryId) {
  return faqCategories.find((category) => category.id === categoryId);
}
