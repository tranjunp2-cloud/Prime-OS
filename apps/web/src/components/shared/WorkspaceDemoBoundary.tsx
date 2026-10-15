import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CalendarClock, FileText, Globe2, Headphones, MessageSquare, MonitorSmartphone, Package, RadioTower, Sparkles, TicketPercent, WalletCards, type LucideIcon } from 'lucide-react';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { EmptyState } from '@/components/system/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyScreen = {
  title: string;
  description: string;
  emptyTitle: string;
  guidance: string;
  icon: LucideIcon;
  action: [string, string];
  tabs?: Array<[string, string]>;
};
const connect: [string, string] = ['Connect sales channel', '/sales-channels/connected-channels'];
const orders: [string, string] = ['View orders', '/orders'];

// Explicitly registered data surfaces. Configuration forms, current-user access,
// Help and Docs remain available; redirects are allowed to resolve normally.
function emptyDemoScreen(pathname: string, params: URLSearchParams): EmptyScreen | undefined {
  if (pathname === '/finance/ops') return {
    title: 'Finance Ops', description: 'Operational revenue, collections control, cash forecasting, and financial risk monitoring.',
    emptyTitle: ({ collections: 'No receivables yet', forecast: 'No cash flow history yet', risk: 'No financial activity to review' } as Record<string, string>)[params.get('view') ?? ''] ?? 'No financial activity yet',
    guidance: 'Orders and payment activity are needed before balances, collections and forecasts can be shown.', icon: WalletCards, action: orders,
    tabs: [['Overview', '/finance/ops?view=overview'], ['Collections', '/finance/ops?view=collections'], ['Forecast', '/finance/ops?view=forecast'], ['Controls & Risks', '/finance/ops?view=risk']],
  };
  if (['/system/invoices', '/finance/invoices'].includes(pathname)) return { title: 'Invoice Management', description: 'Manage invoices linked to your orders.', emptyTitle: 'No invoices yet', guidance: 'Invoices will appear when you start processing orders. Set up your business information before issuing your first invoice.', icon: FileText, action: ['Set up business information', '/settings/general'] };
  if (pathname.startsWith('/automation/scheduled-tasks')) return { title: 'Scheduled Tasks', description: 'Manage recurring operations and monitor their execution.', emptyTitle: 'No scheduled tasks yet', guidance: 'Connect your channels first, then schedule the operational tasks you want to automate. There is no execution history yet.', icon: CalendarClock, action: connect };
  if (pathname === '/sales-channels/conversation-channels') return { title: 'Conversation Channels', description: 'Manage the channels used to talk with your customers.', emptyTitle: 'No conversation channels connected', guidance: 'Connect a sales channel before bringing conversations into your shared inbox.', icon: MessageSquare, action: connect };
  if (pathname === '/sales-channels/live-commerce') return { title: 'Live Commerce', description: 'Plan livestream sessions and track their orders.', emptyTitle: 'No live sessions yet', guidance: 'Connect a sales channel and prepare your products before planning the first livestream. Session results will appear after activity begins.', icon: RadioTower, action: connect };
  if (['/customer/service', '/crm/operator', '/customer/crm-compact'].includes(pathname)) return { title: 'Customer Service', description: 'Manage customer conversations and follow-up work.', emptyTitle: 'No conversations yet', guidance: 'Connect a channel to receive your first customer message. New conversations will appear here automatically.', icon: Headphones, action: connect };
  if (pathname === '/prime-ai') return { title: 'Prime AI', description: 'Understand your workspace and plan your next step.', emptyTitle: 'No business insights yet', guidance: 'Connect your channels and sync orders to receive recommendations based on your business. You can still explore product features in Help Center.', icon: Sparkles, action: ['Explore Help Center', '/faq'] };
  if (pathname === '/finance/fin-support') return { title: 'Financial Support', description: 'Review business readiness and available financial support.', emptyTitle: 'No financial assessment yet', guidance: 'Sync your orders and payment history before reviewing funding readiness. No sample balances, risk scores or offers are shown.', icon: WalletCards, action: connect };
  if (pathname === '/crm/mdec') return { title: 'Business Growth', description: 'Review growth opportunities for your business.', emptyTitle: 'No business activity yet', guidance: 'Complete your business setup and connect your first channel to start building your growth overview.', icon: BarChart3, action: ['Set up business information', '/settings/general'] };
  if (pathname === '/ecom/commerce-surface') return { title: 'Commerce', description: 'Manage commerce activity across your channels.', emptyTitle: 'No commerce activity yet', guidance: 'Connect a sales channel and add products to start selling.', icon: Globe2, action: connect };
  if (pathname.startsWith('/pos/')) {
    const section = pathname.split('/')[2];
    if (section === 'hardware') return undefined;
    const labels: Record<string, [string, string]> = { register: ['Fast Checkout', 'No products available for checkout'], shifts: ['Shift Management', 'No shifts yet'], transactions: ['Today Transactions', 'No transactions yet'], returns: ['Return / Refund', 'No purchases to return'] };
    const [title, emptyTitle] = labels[section] ?? ['Point of Sale', 'No POS activity yet'];
    return { title, description: 'Operate your point of sale from a shared product and inventory catalog.', emptyTitle, guidance: 'Add products and prepare warehouse stock before making your first sale. Transactions and returns will appear after sales are recorded.', icon: MonitorSmartphone, action: ['Set up products', '/products/master-catalog'] };
  }
  if (/^\/products\/[^/]+\/edit\/?$/.test(pathname)) return { title: 'Product details', description: 'Manage shared product information and channel listings.', emptyTitle: 'No product selected', guidance: 'The demo is showing an empty catalog. Create your first Product Master, or switch back to With data to inspect an existing product.', icon: Package, action: ['Go to Product Master', '/products/master-catalog'] };
  if (pathname.startsWith('/promotions/') && pathname !== '/promotions/discount-codes') {
    const titles: Record<string, string> = { automatic: 'Automatic Discounts', 'flash-sale': 'Flash Sales', loyalty: 'Loyalty & Membership', analytics: 'Promotion Analytics' };
    const title = titles[pathname.split('/')[2]] ?? 'Promotions';
    return { title, description: 'Manage promotions and review their results.', emptyTitle: `No ${title.toLowerCase()} data yet`, guidance: 'Create your first promotion. Results and usage will appear after customers redeem it.', icon: TicketPercent, action: ['Create a discount code', '/promotions/discount-codes'] };
  }
  return undefined;
}

export function WorkspaceDemoBoundary({ children }: { children: ReactNode }) {
  const { noData } = useDemoDataMode();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const screen = noData ? emptyDemoScreen(pathname, params) : undefined;
  if (!screen) return <>{children}</>;
  const Icon = screen.icon;
  return <section className="min-h-full space-y-5 bg-background p-4 pb-16 md:p-6" data-testid="workspace-no-data">
    <WorkspacePageHeader title={screen.title} description={screen.description} icon={Icon} />
    {screen.tabs && <nav aria-label={`${screen.title} sections`} className="flex flex-wrap gap-2 border-b pb-3">
      {screen.tabs.map(([label, href]) => {
        const target = new URL(href, 'https://prototype.local');
        const key = 'view';
        const active = (params.get(key) ?? 'overview') === (target.searchParams.get(key) ?? 'overview');
        return <Link key={href} to={href} aria-current={active ? 'page' : undefined} className={cn('inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted')}>{label}</Link>;
      })}
    </nav>}
    <EmptyState className="min-h-80" icon={<Icon aria-hidden="true" />} title={screen.emptyTitle} description={screen.guidance} action={<Button className="min-h-11" asChild><Link to={screen.action[1]}>{screen.action[0]}</Link></Button>} />
  </section>;
}
