import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgePercent,
  BarChart3,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Gift,
  Globe2,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  Search,
  Sparkles,
  Store,
  Target,
  TicketPercent,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';

type PromoStatus = 'Active' | 'Scheduled' | 'Paused' | 'Expired';
type PromoChannel = 'POS' | 'WebStore' | 'Inbox';
type StatusFilter = 'All' | PromoStatus;

type Promotion = {
  id: string;
  title: string;
  code: string;
  discount: string;
  channels: PromoChannel[];
  used: number;
  limit: number;
  startDate: string;
  endDate: string;
  status: PromoStatus;
  revenue: number;
  discountValue: number;
};

const initialPromotions: Promotion[] = [
  { id: 'promo-1', title: 'Welcome to PrimeWeb', code: 'WELCOME15', discount: '15% OFF up to ₫250,000', channels: ['WebStore', 'Inbox'], used: 450, limit: 1000, startDate: '01 Aug 2026', endDate: '31 Aug 2026', status: 'Active', revenue: 428000000, discountValue: 49600000 },
  { id: 'promo-2', title: 'POS Weekend Bundle', code: 'WEEKEND-B2G1', discount: 'Buy 2 Get 1', channels: ['POS'], used: 286, limit: 500, startDate: '08 Aug 2026', endDate: '30 Aug 2026', status: 'Active', revenue: 196000000, discountValue: 32200000 },
  { id: 'promo-3', title: 'Payday Member Voucher', code: 'PAYDAY200', discount: '₫200,000 OFF', channels: ['POS', 'WebStore'], used: 0, limit: 1500, startDate: '25 Aug 2026', endDate: '31 Aug 2026', status: 'Scheduled', revenue: 0, discountValue: 0 },
  { id: 'promo-4', title: 'Inbox Conversion Offer', code: 'CHAT10', discount: '10% OFF up to ₫100,000', channels: ['Inbox'], used: 318, limit: 800, startDate: '15 Jul 2026', endDate: '15 Sep 2026', status: 'Paused', revenue: 174000000, discountValue: 21800000 },
  { id: 'promo-5', title: 'Mid-Year Clearance', code: 'MIDYEAR30', discount: '30% OFF up to ₫500,000', channels: ['POS', 'WebStore', 'Inbox'], used: 1200, limit: 1200, startDate: '15 Jun 2026', endDate: '30 Jun 2026', status: 'Expired', revenue: 842000000, discountValue: 168000000 },
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const statusStyle: Record<PromoStatus, string> = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  Scheduled: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  Paused: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  Expired: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300',
};

const routeDefinitions: Record<string, { title: string; description: string; icon: LucideIcon }> = {
  automatic: { title: 'Automatic Discounts', description: 'Checkout rules applied automatically when order conditions are met.', icon: Sparkles },
  'flash-sale': { title: 'Flash Sales', description: 'Schedule limited-time deals with inventory and channel controls.', icon: CalendarClock },
  loyalty: { title: 'Loyalty & Membership', description: 'Configure reward points, earning rules, and customer membership tiers.', icon: Gift },
  analytics: { title: 'Promotion Analytics', description: 'Measure campaign revenue, discount cost, conversion, and ROI.', icon: BarChart3 },
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function ChannelIcons({ channels }: { channels: PromoChannel[] }) {
  const definitions: Record<PromoChannel, { icon: LucideIcon; label: string }> = {
    POS: { icon: MonitorSmartphone, label: 'POS' },
    WebStore: { icon: Globe2, label: 'WebStore' },
    Inbox: { icon: MessageSquare, label: 'Inbox' },
  };
  return <div className="flex items-center gap-1.5">{channels.map((channel) => { const Icon = definitions[channel].icon; return <span key={channel} title={definitions[channel].label} aria-label={definitions[channel].label} className="grid size-8 place-items-center rounded-lg border border-border bg-muted/30 text-muted-foreground"><Icon className="size-4" /></span>; })}</div>;
}

export default function PromotionsManagement() {
  const { pathname } = useLocation();
  const page = pathname.split('/').filter(Boolean).at(-1) ?? 'discount-codes';
  if (page !== 'discount-codes') return <PromotionSectionPage page={page} />;
  return <DiscountCodesPage />;
}

function DiscountCodesPage() {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [channelFilter, setChannelFilter] = useState<'All' | PromoChannel>('All');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const filteredPromotions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return promotions.filter((promotion) => {
      const matchesSearch = !query || `${promotion.title} ${promotion.code}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'All' || promotion.status === statusFilter;
      const matchesChannel = channelFilter === 'All' || promotion.channels.includes(channelFilter);
      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [channelFilter, promotions, search, statusFilter]);

  const totals = useMemo(() => ({
    active: promotions.filter((promotion) => promotion.status === 'Active').length,
    revenue: promotions.reduce((total, promotion) => total + promotion.revenue, 0),
    usage: promotions.reduce((total, promotion) => total + promotion.used, 0),
    discounts: promotions.reduce((total, promotion) => total + promotion.discountValue, 0),
  }), [promotions]);

  const togglePromotion = (promotion: Promotion, enabled: boolean) => {
    if (promotion.status === 'Expired') return;
    const nextStatus: PromoStatus = enabled ? 'Active' : 'Paused';
    setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, status: nextStatus } : item));
    toast.success(`${promotion.title} ${enabled ? 'resumed' : 'paused'}`);
  };

  const addPromotion = (promotion: Promotion) => {
    setPromotions((current) => [promotion, ...current]);
    setStatusFilter('All');
    toast.success(`${promotion.title} created`);
  };

  const summaryCards = [
    { label: 'Active Campaigns', value: String(totals.active), detail: 'Currently accepting redemptions', icon: Megaphone, tone: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Revenue Driven by Promos', value: currency.format(totals.revenue), detail: 'Attributed gross revenue', icon: CircleDollarSign, tone: 'bg-primary/10 text-primary' },
    { label: 'Total Usage Count', value: totals.usage.toLocaleString('en-US'), detail: 'Redemptions across all channels', icon: TicketPercent, tone: 'bg-violet-500/10 text-violet-600' },
    { label: 'Discount Value Issued', value: currency.format(totals.discounts), detail: 'Total promotional investment', icon: BadgePercent, tone: 'bg-amber-500/10 text-amber-600' },
  ];

  return <main className="min-h-full space-y-5 bg-[hsl(var(--surface-stage))] p-4 pb-24 md:p-6">
    <WorkspacePageHeader title="Discount Codes" description="Create and manage manual vouchers across POS, WebStore, and Inbox." icon={TicketPercent} actions={<Button onClick={() => setWizardOpen(true)}><BadgePercent />Create Promotion</Button>} />

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Promotion summary">{summaryCards.map(({ label, value, detail, icon: Icon, tone }) => <Card key={label} className="shadow-none"><CardContent className="flex gap-4 p-5"><span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 truncate text-2xl font-bold tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>)}</section>

    <Card className="overflow-hidden shadow-none">
      <div className="border-b border-border">
        <div className="overflow-x-auto px-4"><div className="flex min-w-max gap-1" role="tablist" aria-label="Promotion status">{(['All', 'Active', 'Scheduled', 'Paused', 'Expired'] as StatusFilter[]).map((status) => <button key={status} type="button" role="tab" aria-selected={statusFilter === status} onClick={() => setStatusFilter(status)} className={cn('relative min-h-11 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', statusFilter === status ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground')}>{status}</button>)}</div></div>
        <div className="grid gap-3 border-t border-border p-4 md:grid-cols-[minmax(260px,1fr)_220px_auto]">
          <label className="relative block"><span className="sr-only">Search promotions</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9" placeholder="Search promotion name or code" /></label>
          <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as 'All' | PromoChannel)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Channels</SelectItem><SelectItem value="POS">POS</SelectItem><SelectItem value="WebStore">WebStore</SelectItem><SelectItem value="Inbox">Inbox</SelectItem></SelectContent></Select>
          <Button variant="ghost" className="h-10" onClick={() => { setSearch(''); setStatusFilter('All'); setChannelFilter('All'); }}>Clear</Button>
        </div>
      </div>

      <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-4 py-3">Promotion</th><th className="px-4 py-3">Discount Type</th><th className="px-4 py-3">Channels</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Pause / Resume</th></tr></thead><tbody className="divide-y divide-border">{filteredPromotions.map((promotion) => { const usagePercent = Math.min(100, Math.round((promotion.used / promotion.limit) * 100)); return <tr key={promotion.id} className="bg-card transition-colors hover:bg-muted/40"><td className="px-4 py-4"><p className="font-semibold">{promotion.title}</p><button type="button" onClick={() => { navigator.clipboard?.writeText(promotion.code); toast.success(`${promotion.code} copied`); }} className="mt-1 inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{promotion.code}<Copy className="size-3" /></button></td><td className="px-4 py-4 font-medium">{promotion.discount}</td><td className="px-4 py-4"><ChannelIcons channels={promotion.channels} /></td><td className="w-52 px-4 py-4"><div className="flex justify-between text-xs"><span className="font-semibold tabular-nums">{promotion.used.toLocaleString()} / {promotion.limit.toLocaleString()}</span><span className="text-muted-foreground">{usagePercent}%</span></div><Progress value={usagePercent} aria-label={`${promotion.title} usage`} className="mt-2 h-1.5" /></td><td className="px-4 py-4"><p className="font-medium">{promotion.startDate}</p><p className="mt-1 text-xs text-muted-foreground">to {promotion.endDate}</p></td><td className="px-4 py-4"><Badge variant="outline" className={cn('font-semibold', statusStyle[promotion.status])}>{promotion.status}</Badge></td><td className="px-4 py-4 text-right"><div className="inline-flex items-center gap-3"><span className="text-xs text-muted-foreground">{promotion.status === 'Active' ? 'Live' : promotion.status === 'Paused' ? 'Paused' : promotion.status}</span><Switch aria-label={`${promotion.status === 'Active' ? 'Pause' : 'Resume'} ${promotion.title}`} checked={promotion.status === 'Active'} disabled={promotion.status === 'Expired' || promotion.status === 'Scheduled'} onCheckedChange={(checked) => togglePromotion(promotion, checked)} /></div></td></tr>; })}</tbody></table>{!filteredPromotions.length ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><TicketPercent className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No promotions found</h2><p className="mt-1 text-sm text-muted-foreground">Try another status, channel, or search term.</p></div></div> : null}</div>
    </Card>

    <PromotionWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreate={addPromotion} />
  </main>;
}

function PromotionWizard({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (promotion: Promotion) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [codeType, setCodeType] = useState<'custom' | 'auto'>('custom');
  const [code, setCode] = useState('');
  const [usageLimit, setUsageLimit] = useState('1000');
  const [startDate, setStartDate] = useState('2026-08-14');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrder, setMinOrder] = useState('500000');
  const [stacking, setStacking] = useState(false);
  const [channels, setChannels] = useState<PromoChannel[]>(['WebStore']);
  const [outlets, setOutlets] = useState(['POS Tân Bình']);
  const [segments, setSegments] = useState(['All Customers']);
  const [nameTouched, setNameTouched] = useState(false);

  const reset = () => {
    setStep(1); setName(''); setCodeType('custom'); setCode(''); setUsageLimit('1000'); setStartDate('2026-08-14'); setEndDate('2026-08-31'); setDiscountType('percentage'); setDiscountValue('15'); setMinOrder('500000'); setStacking(false); setChannels(['WebStore']); setOutlets(['POS Tân Bình']); setSegments(['All Customers']); setNameTouched(false);
  };

  const close = (nextOpen: boolean) => { onOpenChange(nextOpen); if (!nextOpen) reset(); };
  const toggleArrayValue = <T extends string>(current: T[], value: T, setter: (next: T[]) => void) => setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const canContinue = step !== 1 || (name.trim().length > 0 && Number(usageLimit) > 0 && startDate <= endDate);

  const create = () => {
    if (!channels.length) { toast.error('Select at least one eligible channel'); return; }
    const finalCode = codeType === 'auto' ? `AUTO-${Date.now().toString().slice(-5)}` : code.trim().toUpperCase() || name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12);
    onCreate({ id: `promo-${Date.now()}`, title: name.trim(), code: finalCode, discount: discountType === 'percentage' ? `${discountValue}% OFF` : `${currency.format(Number(discountValue))} OFF`, channels, used: 0, limit: Number(usageLimit), startDate, endDate, status: startDate > '2026-08-13' ? 'Scheduled' : 'Active', revenue: 0, discountValue: 0 });
    close(false);
  };

  const steps = [{ number: 1, label: 'Basic Info' }, { number: 2, label: 'Discount Logic' }, { number: 3, label: 'Eligibility' }];

  return <Sheet open={open} onOpenChange={close}><SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl"><SheetHeader className="border-b border-border px-6 py-5 pr-14"><SheetTitle>Create Promotion</SheetTitle><SheetDescription>Build an omnichannel discount code in three steps.</SheetDescription></SheetHeader>
    <div className="border-b border-border px-6 py-4"><div className="grid grid-cols-3 gap-2">{steps.map((item) => <div key={item.number} className="flex items-center gap-2"><span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', step > item.number ? 'bg-emerald-500 text-white' : step === item.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{step > item.number ? <Check className="size-3.5" /> : item.number}</span><span className={cn('hidden text-xs font-semibold sm:block', step === item.number ? 'text-foreground' : 'text-muted-foreground')}>{item.label}</span></div>)}</div><Progress value={(step / 3) * 100} aria-label={`Step ${step} of 3`} className="mt-3 h-1" /></div>
    <div className="flex-1 overflow-y-auto p-6">
      {step === 1 ? <div className="space-y-5"><div><h2 className="text-base font-semibold">Basic Information</h2><p className="mt-1 text-sm text-muted-foreground">Name the promotion and define when it can be redeemed.</p></div><Field label="Promotion name"><Input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => setNameTouched(true)} placeholder="e.g. New Customer Welcome" aria-invalid={nameTouched && !name.trim()} />{nameTouched && !name.trim() ? <p className="text-xs text-destructive">Promotion name is required.</p> : null}</Field><Field label="Code type"><RadioGroup value={codeType} onValueChange={(value) => setCodeType(value as 'custom' | 'auto')} className="grid gap-3 sm:grid-cols-2"><ChoiceCard value="custom" title="Custom code" description="Enter a memorable voucher code." /><ChoiceCard value="auto" title="Auto-generated" description="Generate a unique secure code." /></RadioGroup></Field>{codeType === 'custom' ? <Field label="Promotion code" hint="Letters and numbers are recommended."><Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WELCOME15" className="font-mono" /></Field> : null}<div className="grid gap-4 sm:grid-cols-2"><Field label="Usage limit"><Input type="number" min="1" value={usageLimit} onChange={(event) => setUsageLimit(event.target.value)} /></Field><div /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Start date"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field><Field label="End date"><Input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} />{startDate > endDate ? <p className="text-xs text-destructive">End date must be after the start date.</p> : null}</Field></div></div> : null}

      {step === 2 ? <div className="space-y-5"><div><h2 className="text-base font-semibold">Discount Logic</h2><p className="mt-1 text-sm text-muted-foreground">Define the benefit and checkout requirements.</p></div><Field label="Discount type"><RadioGroup value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')} className="grid gap-3 sm:grid-cols-2"><ChoiceCard value="percentage" title="Percentage" description="Reduce the eligible subtotal by a percent." /><ChoiceCard value="fixed" title="Fixed amount" description="Deduct a fixed currency amount." /></RadioGroup></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={discountType === 'percentage' ? 'Discount percentage' : 'Discount amount'}><div className="relative"><Input type="number" min="0" max={discountType === 'percentage' ? 100 : undefined} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} className="pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{discountType === 'percentage' ? '%' : 'VND'}</span></div></Field><Field label="Minimum order value"><Input type="number" min="0" value={minOrder} onChange={(event) => setMinOrder(event.target.value)} /></Field></div><div className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">Stack with automatic discounts</p><p className="mt-1 text-xs text-muted-foreground">Allow this code to combine with eligible automatic rules.</p></div><Switch checked={stacking} onCheckedChange={setStacking} aria-label="Stack with automatic discounts" /></div>{stacking ? <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><AlertTriangle className="size-4" /><AlertTitle>Stacking may reduce margin</AlertTitle><AlertDescription>This promotion can combine with automatic discounts. Review the maximum combined discount before publishing.</AlertDescription></Alert> : null}</div> : null}

      {step === 3 ? <div className="space-y-6"><div><h2 className="text-base font-semibold">Omnichannel Eligibility</h2><p className="mt-1 text-sm text-muted-foreground">Choose where the code works and which customers can redeem it.</p></div><EligibilityGroup title="Sales channels" options={[{ value: 'POS', label: 'POS', detail: 'Eligible retail registers', icon: MonitorSmartphone }, { value: 'WebStore', label: 'WebStore', detail: 'PrimeWeb checkout', icon: Globe2 }, { value: 'Inbox', label: 'Inbox', detail: 'Agent-assisted orders', icon: MessageSquare }]} selected={channels} onToggle={(value) => toggleArrayValue(channels, value as PromoChannel, setChannels)} /><EligibilityGroup title="POS outlets" options={[{ value: 'POS Tân Bình', label: 'POS Tân Bình', detail: 'Ho Chi Minh City', icon: Store }, { value: 'District 1 Flagship', label: 'District 1 Flagship', detail: 'Ho Chi Minh City', icon: Store }, { value: 'Hanoi Outlet', label: 'Hanoi Outlet', detail: 'Hanoi', icon: Store }]} selected={outlets} onToggle={(value) => toggleArrayValue(outlets, value, setOutlets)} disabled={!channels.includes('POS')} /><EligibilityGroup title="Customer eligibility segments" options={[{ value: 'All Customers', label: 'All Customers', detail: 'Every eligible shopper', icon: UsersRound }, { value: 'VIP Members', label: 'VIP Members', detail: 'VIP membership tier', icon: Gift }, { value: 'New Customers', label: 'New Customers', detail: 'No completed order yet', icon: Target }]} selected={segments} onToggle={(value) => toggleArrayValue(segments, value, setSegments)} /></div> : null}
    </div>
    <SheetFooter className="border-t border-border bg-background px-6 py-4"><div className="flex w-full items-center justify-between"><Button variant="ghost" onClick={() => step === 1 ? close(false) : setStep((current) => current - 1)}>{step > 1 ? <ChevronLeft /> : null}{step === 1 ? 'Cancel' : 'Back'}</Button>{step < 3 ? <Button disabled={!canContinue} onClick={() => { setNameTouched(true); if (canContinue) setStep((current) => current + 1); }}>Continue<ChevronRight /></Button> : <Button onClick={create}><Check />Create Promotion</Button>}</div></SheetFooter>
  </SheetContent></Sheet>;
}

function ChoiceCard({ value, title, description }: { value: string; title: string; description: string }) {
  return <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/40"><RadioGroupItem value={value} className="mt-0.5" /><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{description}</span></span></Label>;
}

function EligibilityGroup({ title, options, selected, onToggle, disabled = false }: { title: string; options: Array<{ value: string; label: string; detail: string; icon: LucideIcon }>; selected: string[]; onToggle: (value: string) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className={cn('space-y-3', disabled && 'opacity-50')}><legend className="text-sm font-semibold">{title}</legend><div className="grid gap-3 sm:grid-cols-3">{options.map(({ value, label, detail, icon: Icon }) => <Label key={value} className="flex min-h-24 cursor-pointer flex-col gap-3 rounded-xl border border-border p-4 hover:bg-muted/40"><div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><Checkbox checked={selected.includes(value)} onCheckedChange={() => onToggle(value)} aria-label={label} /></div><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{detail}</span></span></Label>)}</div></fieldset>;
}

function PromotionSectionPage({ page }: { page: string }) {
  const navigate = useNavigate();
  const definition = routeDefinitions[page] ?? routeDefinitions.automatic;
  const Icon = definition.icon;
  const content: Record<string, Array<{ title: string; metric: string; detail: string; icon: LucideIcon }>> = {
    automatic: [{ title: 'Active Rules', metric: '6', detail: 'Checkout rules currently live', icon: Sparkles }, { title: 'Orders Discounted', metric: '1,248', detail: 'This month', icon: TicketPercent }, { title: 'Revenue Influenced', metric: currency.format(684000000), detail: 'Attributed revenue', icon: CircleDollarSign }],
    'flash-sale': [{ title: 'Upcoming Deals', metric: '4', detail: 'Scheduled in the next 30 days', icon: Clock3 }, { title: 'Reserved Inventory', metric: '2,840', detail: 'Units across campaigns', icon: Gift }, { title: 'Projected Revenue', metric: currency.format(920000000), detail: 'Current forecast', icon: CircleDollarSign }],
    loyalty: [{ title: 'Active Members', metric: '8,420', detail: 'Across all membership tiers', icon: UsersRound }, { title: 'Points Outstanding', metric: '4.8M', detail: 'Redeemable reward points', icon: Gift }, { title: 'Repeat Revenue', metric: '38%', detail: 'Revenue from members', icon: CircleDollarSign }],
    analytics: [{ title: 'Promo Revenue', metric: currency.format(1640000000), detail: 'Selected reporting period', icon: CircleDollarSign }, { title: 'Average ROI', metric: '4.7×', detail: 'Revenue per discount cost', icon: BarChart3 }, { title: 'Conversion Lift', metric: '+12.8%', detail: 'Against non-promo traffic', icon: Target }],
  };
  const cards = content[page] ?? content.automatic;
  return <main className="min-h-full space-y-5 bg-[hsl(var(--surface-stage))] p-4 pb-24 md:p-6"><WorkspacePageHeader title={definition.title} description={definition.description} icon={Icon} actions={<Button onClick={() => toast.info(`${definition.title} creation flow opened`)}><BadgePercent />Create</Button>} /><section className="grid gap-3 md:grid-cols-3">{cards.map(({ title, metric, detail, icon: CardIcon }) => <Card key={title} className="shadow-none"><CardContent className="p-5"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CardIcon className="size-5" /></span><p className="mt-4 text-xs font-medium text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-bold tabular-nums">{metric}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>)}</section><Card className="shadow-none"><CardHeader><CardTitle>{definition.title} workspace</CardTitle><CardDescription>This dedicated sub-route is ready for channel-specific rules and reporting.</CardDescription></CardHeader><CardContent className="flex min-h-56 flex-col items-center justify-center text-center"><span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></span><h2 className="mt-4 font-semibold">Manage {definition.title.toLowerCase()}</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Use Discount Codes for manual vouchers, or continue configuring this specialized promotion type here.</p><Button variant="outline" className="mt-4" onClick={() => navigate('/promotions/discount-codes')}>Open Discount Codes</Button></CardContent></Card></main>;
}
