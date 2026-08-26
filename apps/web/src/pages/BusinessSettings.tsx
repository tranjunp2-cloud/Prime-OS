import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  Check,
  CreditCard,
  Printer,
  Settings2,
  Tags,
  Truck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { TeamAccessConfiguration } from '@/components/settings/TeamAccessConfiguration';

type SettingsKey = 'general' | 'team-access' | 'payments' | 'shipping-delivery' | 'customer-data' | 'templates-notifications';
type Feature = { title: string; description: string; status?: string };
type SettingsDefinition = { title: string; description: string; icon: LucideIcon; features: Feature[] };

const settingsDefinitions: Record<SettingsKey, SettingsDefinition> = {
  general: {
    title: 'General & Business', icon: Building2,
    description: 'Legal business identity, currency, system timezone, and VAT behavior shared across invoices and storefronts.',
    features: [
      { title: 'Legal business information', description: 'Company name, tax ID, registered address, and hotline.', status: 'Required' },
      { title: 'Currency & units', description: 'VND/USD formatting and the system timezone.', status: 'Configured' },
      { title: 'VAT configuration', description: 'Default 0%, 8%, or 10% VAT and tax-inclusive pricing.', status: 'New' },
    ],
  },
  'team-access': {
    title: 'Team & Access', icon: UsersRound,
    description: 'The single administration center for organization members, permissions, security policies, audit, and machine access.',
    features: [
      { title: 'Staff management', description: 'Members, invitations, seats, and workspace access.', status: 'IAM connected' },
      { title: 'RBAC permission matrix', description: 'Admin, POS Cashier, CRM Sales, Warehouse Manager, and Web Editor.', status: '5 roles' },
      { title: 'Security & machine access', description: 'Admin MFA, enterprise SSO, audit logs, and organization API keys.', status: 'Centralized' },
    ],
  },
  payments: {
    title: 'Payments', icon: WalletCards,
    description: 'Shared payment providers, accepted methods, settlement defaults, and refund behavior for PrimeWeb and POS.',
    features: [
      { title: 'Online payment providers', description: 'MOMO, VNPay, bank QR, Visa, and Mastercard.', status: '3 connected' },
      { title: 'Accepted payment methods', description: 'Shared checkout methods available across storefront and register.', status: '5 enabled' },
      { title: 'Settlement & refund defaults', description: 'Settlement currency and original-method refund behavior.', status: 'Configured' },
    ],
  },
  'shipping-delivery': {
    title: 'Shipping & Delivery', icon: Truck,
    description: 'Configure carrier credentials and channel-wide shipping fee policies used during fulfillment.',
    features: [
      { title: 'Delivery carriers', description: 'GHN, GHTK, Viettel Post, and GrabExpress.', status: '3 connected' },
      { title: 'Shipping fee rules', description: 'Flat rate, order-value freeship, or geocoded distance pricing.', status: 'Flat rate' },
    ],
  },
  'customer-data': {
    title: 'Customer Data & Privacy', icon: UsersRound,
    description: 'Shared customer identity, classification, consent, and retention rules across every sales channel.',
    features: [
      { title: 'Identity matching', description: 'Match and merge customer profiles received from Web, POS, and social channels.', status: 'Automatic' },
      { title: 'Customer classifications', description: 'Shared tiers and tag definitions used throughout customer operations.', status: '8 tags' },
      { title: 'Consent & retention', description: 'Marketing consent and customer data retention defaults.', status: 'Configured' },
    ],
  },
  'templates-notifications': {
    title: 'Templates & Notifications', icon: Printer,
    description: 'Shared document templates, sender identities, and transactional notification defaults.',
    features: [
      { title: 'Print & email templates', description: 'POS K80 receipt, A5 delivery note, and transactional email templates.', status: '6 templates' },
      { title: 'Notification channels', description: 'Email, SMS, and Zalo ZNS delivery defaults.', status: '3 active' },
      { title: 'Sender identities', description: 'Organization-wide sender names and reply-to addresses.', status: 'Verified' },
    ],
  },
};

function FeatureSummary({ features }: { features: Feature[] }) {
  return <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Included capabilities">{features.map((feature) => <Card key={feature.title} className="shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-4" /></span>{feature.status ? <Badge variant="outline">{feature.status}</Badge> : null}</div><h2 className="mt-4 text-sm font-semibold">{feature.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.description}</p></CardContent></Card>)}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return <Field label={label}><select className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary">{options.map((option) => <option key={option}>{option}</option>)}</select></Field>;
}

function ToggleRow({ title, description, checked, onCheckedChange }: { title: string; description: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return <div className="flex min-h-16 items-center gap-4 border-b border-border/70 py-3 last:border-0"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} /></div>;
}

function ConnectorGrid({ items, icon: Icon }: { items: Array<{ name: string; detail: string; status: string }>; icon: LucideIcon }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <div key={item.name} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-2"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><Badge variant={item.status === 'Setup' || item.status === 'Offline' ? 'secondary' : 'outline'}>{item.status}</Badge></div><h3 className="mt-4 text-sm font-semibold">{item.name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{item.detail}</p><Button variant="outline" size="sm" className="mt-3 w-full">{item.status === 'Setup' ? 'Configure' : 'Manage'}</Button></div>)}</div>;
}

function GeneralConfiguration() {
  const [taxInclusive, setTaxInclusive] = useState(true);
  return <div className="grid gap-4 xl:grid-cols-2"><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Legal business information</CardTitle><CardDescription>Automatically inserted into VAT invoices and the PrimeWeb footer.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Company name"><Input defaultValue="Unifi Business Company Limited" /></Field><Field label="Tax ID"><Input defaultValue="0312345678" /></Field><Field label="Registered address"><Input defaultValue="Tân Bình District, Ho Chi Minh City" /></Field><Field label="Business hotline"><Input defaultValue="1900 6868" /></Field></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Currency, timezone & VAT</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Currency format" options={['VND (₫)', 'USD ($)']} /><SelectField label="System timezone" options={['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore']} /><SelectField label="Default VAT" options={['10%', '8%', '0%']} /></div><ToggleRow title="Tax-inclusive listed prices" description="Displayed prices already include the configured VAT rate." checked={taxInclusive} onCheckedChange={setTaxInclusive} /></CardContent></Card></div>;
}

function TeamConfiguration() {
  return <TeamAccessConfiguration />;
}

function PaymentsConfiguration() {
  const [originalMethodRefunds, setOriginalMethodRefunds] = useState(true);
  const [sharedMethods, setSharedMethods] = useState(true);
  return <div className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Payment providers</CardTitle><CardDescription>Connections shared by PrimeWeb checkout and POS registers.</CardDescription></CardHeader><CardContent><ConnectorGrid items={[{ name: 'MOMO', detail: 'Wallet and QR checkout.', status: 'Connected' }, { name: 'VNPay', detail: 'Bank and QR payments.', status: 'Connected' }, { name: 'Bank QR', detail: 'Dynamic transfer QR.', status: 'Connected' }, { name: 'Visa / Mastercard', detail: 'Card processing via Stripe.', status: 'Setup' }]} icon={CreditCard} /></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Shared payment defaults</CardTitle><CardDescription>Applied consistently wherever the same payment method is available.</CardDescription></CardHeader><CardContent className="grid gap-x-8 md:grid-cols-2"><div><ToggleRow title="Use shared payment methods" description="Keep accepted methods aligned between PrimeWeb and POS." checked={sharedMethods} onCheckedChange={setSharedMethods} /><ToggleRow title="Refund to original method" description="Use the original payment rail whenever it supports refunds." checked={originalMethodRefunds} onCheckedChange={setOriginalMethodRefunds} /></div><div className="space-y-4 pt-3"><SelectField label="Settlement currency" options={['VND (₫)', 'USD ($)']} /><SelectField label="Default refund window" options={['7 days', '14 days', '30 days']} /></div></CardContent></Card></div>;
}

function ShippingConfiguration() {
  const [freeship, setFreeship] = useState(true);
  return <div className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Delivery carriers</CardTitle></CardHeader><CardContent><ConnectorGrid items={[{ name: 'GHN', detail: 'Domestic standard and express.', status: 'Connected' }, { name: 'GHTK', detail: 'Domestic standard delivery.', status: 'Connected' }, { name: 'Viettel Post', detail: 'Nationwide and B2B delivery.', status: 'Connected' }, { name: 'GrabExpress', detail: 'Same-day urban delivery.', status: 'Setup' }]} icon={Truck} /></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Shipping fee rules</CardTitle><CardDescription>Rules are evaluated in priority order at checkout.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><SelectField label="Default calculation" options={['Flat rate', 'Distance-based geocoding', 'Carrier live rate']} /><Field label="Flat shipping fee"><Input type="number" defaultValue="30000" /></Field><Field label="Freeship order threshold"><Input type="number" defaultValue="500000" /></Field><div className="md:col-span-3"><ToggleRow title="Order-value freeship" description="Apply free shipping when the order reaches the configured threshold." checked={freeship} onCheckedChange={setFreeship} /></div></CardContent></Card></div>;
}

function CustomerDataConfiguration() {
  const [automaticMerge, setAutomaticMerge] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(true);
  return <div className="grid gap-4 xl:grid-cols-2"><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Unified customer identity</CardTitle><CardDescription>One customer profile across PrimeWeb, POS, marketplaces, and social channels.</CardDescription></CardHeader><CardContent className="space-y-4"><SelectField label="Primary matching strategy" options={['Verified phone, then email', 'Verified email, then phone', 'External customer ID']} /><ToggleRow title="Automatically merge confident matches" description="Merge profiles only when verified identifiers meet the confidence threshold." checked={automaticMerge} onCheckedChange={setAutomaticMerge} /><SelectField label="Potential duplicate behavior" options={['Send to review queue', 'Keep separate', 'Automatically merge']} /></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tags className="size-4 text-primary" />Classification & privacy</CardTitle><CardDescription>Definitions and policies shared by every customer-facing product.</CardDescription></CardHeader><CardContent className="space-y-4"><div><p className="text-sm font-medium">Customer classifications</p><div className="mt-2 flex flex-wrap gap-2">{['VIP', 'Wholesale', 'Retail', 'New customer', 'At risk'].map((tag) => <Badge key={tag} variant="outline" className="min-h-8 px-3">{tag}</Badge>)}</div><Button variant="outline" size="sm" className="mt-3">Manage definitions</Button></div><ToggleRow title="Require marketing consent" description="Only contact customers through channels covered by recorded consent." checked={marketingConsent} onCheckedChange={setMarketingConsent} /><SelectField label="Inactive customer retention" options={['24 months', '36 months', '60 months', 'Keep indefinitely']} /></CardContent></Card></div>;
}

function TemplatesConfiguration() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const templates = [{ name: 'POS Thermal Receipt K80', type: 'Print' }, { name: 'Delivery Note A5', type: 'Print' }, { name: 'Order Confirmation Email', type: 'Email' }];
  return <div className="grid gap-4 xl:grid-cols-2"><Card className="shadow-none"><CardHeader><CardTitle className="text-base">Print & message templates</CardTitle><CardDescription>Hardware pairing and device tests are managed from POS → Hardware Setup.</CardDescription></CardHeader><CardContent className="space-y-2">{templates.map((template) => <div key={template.name} className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-3"><Printer className="size-4 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{template.name}</p><p className="text-xs text-muted-foreground">{template.type} template</p></div><Button variant="outline" size="sm">Edit</Button></div>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-primary" />Notification defaults</CardTitle><CardDescription>Shared sender and delivery defaults for transactional notifications.</CardDescription></CardHeader><CardContent><Field label="Sender name"><Input defaultValue="Unifi Business" /></Field><div className="mt-4"><Field label="Reply-to email"><Input type="email" defaultValue="support@unifi.business" /></Field></div><div className="mt-4"><ToggleRow title="Email notifications" description="Send transactional email when a supported event occurs." checked={emailNotifications} onCheckedChange={setEmailNotifications} /><ToggleRow title="SMS / Zalo ZNS notifications" description="Use the configured messaging provider for eligible events." checked={smsNotifications} onCheckedChange={setSmsNotifications} /></div></CardContent></Card></div>;
}

function ConfigurationSurface({ page }: { page: SettingsKey }) {
  if (page === 'general') return <GeneralConfiguration />;
  if (page === 'team-access') return <TeamConfiguration />;
  if (page === 'payments') return <PaymentsConfiguration />;
  if (page === 'shipping-delivery') return <ShippingConfiguration />;
  if (page === 'customer-data') return <CustomerDataConfiguration />;
  return <TemplatesConfiguration />;
}

function resolveSettingsKey(pathname: string): SettingsKey | null {
  const slug = pathname.split('/').filter(Boolean).at(-1);
  return slug && slug in settingsDefinitions ? slug as SettingsKey : null;
}

export default function BusinessSettings() {
  const { pathname } = useLocation();
  const page = useMemo(() => resolveSettingsKey(pathname), [pathname]);
  if (!page) return <Navigate to="/settings/general" replace />;
  const definition = settingsDefinitions[page];
  const headerActions = page === 'team-access' ? undefined : <Button onClick={() => toast.success(`${definition.title} settings saved`)}><Check className="size-4" />Save changes</Button>;
  return <main className="min-h-full bg-[hsl(var(--surface-stage))] p-4 pb-24 md:p-6"><div className="mx-auto max-w-[1600px] space-y-5"><WorkspacePageHeader title={definition.title} description={definition.description} icon={definition.icon} actions={headerActions} />{page !== 'team-access' ? <FeatureSummary features={definition.features} /> : null}<ConfigurationSurface page={page} /></div></main>;
}
