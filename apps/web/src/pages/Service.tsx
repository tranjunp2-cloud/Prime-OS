import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  Globe2,
  Inbox,
  Megaphone,
  MessageCircle,
  PhoneCall,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  getBookingStats,
  getBookings,
  getServicePackages,
  getStaffResources,
  type Booking,
} from '@/lib/booking-store';
import { getAllStaffAvailability, getAvailableSlots } from '@/lib/availability-engine';

type ChannelKey = 'website' | 'facebook' | 'instagram' | 'whatsapp' | 'google' | 'tiktok';
type ChannelFilter = 'all' | ChannelKey;
type CustomerStage = 'New lead' | 'Chatting' | 'Booking intent' | 'Booked' | 'Completed' | 'Win back';
type ActivityDirection = 'inbound' | 'outbound' | 'system';
type WorkMode = 'active' | 'schedule' | 'segments';

interface Channel {
  id: ChannelKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface ServiceCustomer {
  id: string;
  name: string;
  stage: CustomerStage;
  channels: ChannelKey[];
  primaryChannel: ChannelKey;
  lastTouch: string;
  lastMessage: string;
  intent: string;
  owner: string;
  value: number;
  score: number;
  nextAction: string;
  tags: string[];
  identity: { phone?: string; email?: string; handle?: string };
}

interface CustomerActivity {
  id: string;
  channel: ChannelKey;
  direction: ActivityDirection;
  time: string;
  title: string;
  body: string;
}

interface Segment {
  id: string;
  name: string;
  count: number;
  rule: string;
  action: string;
}

interface Campaign {
  id: string;
  name: string;
  audience: string;
  channels: ChannelKey[];
  status: 'Draft' | 'Live' | 'Scheduled';
  result: string;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const channels: Channel[] = [
  { id: 'website', label: 'Website', shortLabel: 'Web', icon: Globe2 },
  { id: 'facebook', label: 'Facebook', shortLabel: 'FB', icon: Sparkles },
  { id: 'instagram', label: 'Instagram', shortLabel: 'IG', icon: Sparkles },
  { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WA', icon: PhoneCall },
  { id: 'google', label: 'Google', shortLabel: 'Google', icon: Search },
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TikTok', icon: ArrowUpRight },
];

const customers: ServiceCustomer[] = [
  { id: 'cus-mai-tran', name: 'Mai Tran', stage: 'Booking intent', channels: ['instagram', 'whatsapp'], primaryChannel: 'whatsapp', lastTouch: '12 min ago', lastMessage: 'Can I do gel manicure today after 5pm?', intent: 'Gel Manicure + Nail Art', owner: 'Linh', value: 60, score: 92, nextAction: 'Send 17:30 booking link and collect deposit.', tags: ['Hot lead', 'Same-day slot'], identity: { phone: '+1 415 555 0142', handle: '@maitran.beauty' } },
  { id: 'cus-ava-johnson', name: 'Ava Johnson', stage: 'Chatting', channels: ['instagram', 'facebook'], primaryChannel: 'instagram', lastTouch: '28 min ago', lastMessage: 'How much is bridal makeup for 3 people?', intent: 'Bridal Beauty Package', owner: 'Mia', value: 320, score: 84, nextAction: 'Send package quote and consult calendar.', tags: ['High value', 'Needs quote'], identity: { email: 'ava@example.com', handle: '@avajohnson' } },
  { id: 'cus-minh-le', name: 'Minh Le', stage: 'New lead', channels: ['facebook'], primaryChannel: 'facebook', lastTouch: '42 min ago', lastMessage: 'Do you have hair color consultation this week?', intent: 'Hair Color Consult', owner: 'Sofia', value: 140, score: 71, nextAction: 'Ask for hair reference photo before quote.', tags: ['Needs reply'], identity: { handle: 'fb.com/minhle' } },
  { id: 'cus-samantha-kim', name: 'Samantha Kim', stage: 'Completed', channels: ['website', 'google'], primaryChannel: 'website', lastTouch: 'Today 09:18', lastMessage: 'Signature Facial completed.', intent: 'Signature Facial', owner: 'Nora', value: 88, score: 66, nextAction: 'Send review request and 30-day facial reminder.', tags: ['Review due', 'Repeat potential'], identity: { phone: '+1 415 555 0188', email: 'samantha@example.com' } },
  { id: 'cus-jenny-pham', name: 'Jenny Pham', stage: 'Win back', channels: ['whatsapp', 'tiktok'], primaryChannel: 'whatsapp', lastTouch: '61 days ago', lastMessage: 'Last visit was deep tissue massage.', intent: 'Deep Tissue Massage', owner: 'Ken', value: 120, score: 58, nextAction: 'Send win-back massage offer.', tags: ['Inactive 60d', 'Promo fit'], identity: { phone: '+1 415 555 0199' } },
];

const activitiesByCustomer: Record<string, CustomerActivity[]> = {
  'cus-mai-tran': [
    { id: 'mai-1', channel: 'instagram', direction: 'inbound', time: 'Yesterday 20:14', title: 'Instagram DM', body: 'Asked about nail art styles from a reel.' },
    { id: 'mai-2', channel: 'whatsapp', direction: 'outbound', time: 'Today 09:05', title: 'WhatsApp follow-up', body: 'Sent available manicure slots and booking policy.' },
    { id: 'mai-3', channel: 'whatsapp', direction: 'inbound', time: '12 min ago', title: 'Booking request', body: 'Can I do gel manicure today after 5pm?' },
  ],
  'cus-ava-johnson': [
    { id: 'ava-1', channel: 'instagram', direction: 'inbound', time: '2 days ago', title: 'Reel reply', body: 'Saved bridal makeup reel and asked for package pricing.' },
    { id: 'ava-2', channel: 'facebook', direction: 'system', time: 'Yesterday 15:22', title: 'Matched Facebook profile', body: 'PrimeOS linked Facebook comment to Instagram DM by phone/email capture.' },
    { id: 'ava-3', channel: 'instagram', direction: 'inbound', time: '28 min ago', title: 'Quote request', body: 'How much is bridal makeup for 3 people?' },
  ],
  'cus-minh-le': [
    { id: 'minh-1', channel: 'facebook', direction: 'inbound', time: '42 min ago', title: 'Messenger lead', body: 'Do you have hair color consultation this week?' },
  ],
  'cus-samantha-kim': [
    { id: 'sam-1', channel: 'google', direction: 'inbound', time: '3 days ago', title: 'Google booking click', body: 'Clicked facial search ad and booked through website.' },
    { id: 'sam-2', channel: 'website', direction: 'system', time: 'Today 09:18', title: 'Appointment completed', body: 'Signature Facial completed. Review request is due.' },
  ],
  'cus-jenny-pham': [
    { id: 'jenny-1', channel: 'tiktok', direction: 'system', time: '61 days ago', title: 'TikTok first-touch', body: 'Booked massage after viewing promotion video.' },
    { id: 'jenny-2', channel: 'whatsapp', direction: 'system', time: 'Today', title: 'Win-back candidate', body: 'Customer has not returned in 60 days and matches massage offer segment.' },
  ],
};

const segments: Segment[] = [
  { id: 'hot-booking', name: 'Hot booking intent', count: 38, rule: 'Asked price or availability in the last 48 hours.', action: 'Send booking link' },
  { id: 'unreplied', name: 'Needs reply', count: 19, rule: 'Inbound message without staff response over 15 minutes.', action: 'Open inbox' },
  { id: 'inactive', name: 'Inactive clients', count: 126, rule: 'Completed service but no visit in 60 days.', action: 'Create win-back campaign' },
  { id: 'review-due', name: 'Review due', count: 54, rule: 'Completed appointment with no review request sent.', action: 'Send review request' },
];

const campaignsList: Campaign[] = [
  { id: 'camp-booking-followup', name: 'Booking follow-up', audience: 'Hot booking intent', channels: ['whatsapp', 'instagram'], status: 'Live', result: '42 sent / 11 booked' },
  { id: 'camp-winback', name: '60-day win-back', audience: 'Inactive clients', channels: ['whatsapp', 'facebook'], status: 'Scheduled', result: 'Starts tomorrow' },
  { id: 'camp-retarget', name: 'Spa retargeting ads', audience: 'Website visitors + chat leads', channels: ['google', 'facebook', 'instagram'], status: 'Draft', result: 'Audience ready' },
];

const stageFilters = ['All', 'New lead', 'Chatting', 'Booking intent', 'Booked', 'Completed', 'Win back'] as const;

const stageClass: Record<CustomerStage, string> = {
  'New lead': 'text-muted-foreground',
  Chatting: 'text-warning',
  'Booking intent': 'text-primary',
  Booked: 'text-emerald-700 dark:text-emerald-300',
  Completed: 'text-emerald-700 dark:text-emerald-300',
  'Win back': 'text-muted-foreground',
};

function normalizeWorkMode(value: string | null): WorkMode {
  return value === 'schedule' || value === 'segments' ? value : 'active';
}

function getChannel(id: ChannelKey) {
  return channels.find((channel) => channel.id === id) || channels[0];
}

function statusClass(status: Booking['status']) {
  if (status === 'confirmed' || status === 'completed') return 'text-emerald-700 dark:text-emerald-300';
  if (status === 'cancelled' || status === 'no_show') return 'text-destructive';
  return 'text-warning';
}

export default function Service() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workMode, setWorkModeState] = useState<WorkMode>(() => normalizeWorkMode(searchParams.get('mode')));
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0].id);
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [query, setQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [, setRenderVersion] = useState(0);

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingCustomerName, setBookingCustomerName] = useState('');

  const packages = getServicePackages();
  const staffList = getStaffResources();
  const allBookings = getBookings();
  const bookingStats = getBookingStats();
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const activities = activitiesByCustomer[selectedCustomer.id] || [];
  const selectedPkg = packages.find((pkg) => pkg.id === selectedPackageId);
  const staffAvailability = getAllStaffAvailability(selectedDate);
  const availableSlots = selectedStaffId && selectedPackageId
    ? getAvailableSlots(selectedStaffId, selectedDate, selectedPkg?.duration_minutes ?? 60)
    : [];

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStage = stageFilter === 'All' || customer.stage === stageFilter;
      const matchesChannel = channelFilter === 'all' || customer.channels.includes(channelFilter);
      const searchText = [customer.name, customer.intent, customer.lastMessage, customer.tags.join(' ')].join(' ').toLowerCase();
      return matchesStage && matchesChannel && (!normalizedQuery || searchText.includes(normalizedQuery));
    });
  }, [channelFilter, query, stageFilter]);

  const activeCustomerCount = customers.filter((customer) => ['New lead', 'Chatting', 'Booking intent'].includes(customer.stage)).length;
  const hotIntentCount = customers.filter((customer) => customer.stage === 'Booking intent').length;
  const pendingReplyCount = segments.find((segment) => segment.id === 'unreplied')?.count ?? 0;

  useEffect(() => {
    const rawMode = searchParams.get('mode');
    const mode = normalizeWorkMode(searchParams.get('mode'));
    if (rawMode && rawMode !== mode) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('mode');
      setSearchParams(nextParams, { replace: true });
      return;
    }
    setWorkModeState((current) => (current === mode ? current : mode));
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (workMode !== 'active' || filteredCustomers.length === 0) return;
    if (filteredCustomers.some((customer) => customer.id === selectedCustomerId)) return;
    setSelectedCustomerId(filteredCustomers[0].id);
  }, [filteredCustomers, selectedCustomerId, workMode]);

  function setWorkMode(mode: WorkMode) {
    setWorkModeState(mode);
    const nextParams = new URLSearchParams(searchParams);
    if (mode === 'active') {
      nextParams.delete('mode');
    } else {
      nextParams.set('mode', mode);
    }
    setSearchParams(nextParams, { replace: true });
  }

  function refresh() {
    setRenderVersion((value) => value + 1);
  }

  function handleCreateBooking() {
    if (!selectedPackageId || !selectedStaffId || !selectedTime) return;
    createBooking({
      customerId: selectedCustomer.id,
      customerName: bookingCustomerName || selectedCustomer.name,
      packageId: selectedPackageId,
      staffId: selectedStaffId,
      startTime: `${selectedDate}T${selectedTime}:00`,
    });
    setBookingCustomerName('');
    setSelectedTime('');
    refresh();
  }

  function mutateBooking(action: () => void) {
    action();
    refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[hsl(var(--surface-stage))]">
      <header className="shrink-0 border-b border-border bg-background">
        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <span>Customer</span>
              <span className="text-border">/</span>
              <span>Service</span>
              <span className="text-primary">Live desk</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">Prime Service Control</h1>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 xl:justify-end">
            <InlineMetric label="Open" value={String(activeCustomerCount)} />
            <InlineMetric label="Hot intent" value={String(hotIntentCount)} />
            <InlineMetric label="Waiting" value={String(pendingReplyCount)} tone="text-warning" />
            <InlineMetric label="Booking" value={String(bookingStats.total)} />
            <div className="hidden h-8 w-px bg-border lg:block" />
            <Button variant="ghost" size="sm" className="h-9 px-2.5">
              <UsersRound className="size-4" />
              Import
            </Button>
            <Button size="sm" className="h-9 px-3">
              <Plus className="size-4" />
              Outreach
            </Button>
          </div>
        </div>
      </header>

      <div
        className="grid min-h-0 min-w-[920px] flex-1 border-b border-border bg-[hsl(var(--surface-workspace))]"
        style={{ gridTemplateColumns: '72px minmax(280px, 320px) minmax(0, 1fr)' }}
      >
        <ModeRail
          mode={workMode}
          activeCount={activeCustomerCount}
          bookingCount={bookingStats.total}
          segmentCount={segments.length}
          onChange={setWorkMode}
        />

        <QueuePanel
          customers={filteredCustomers}
          selectedCustomer={selectedCustomer}
          query={query}
          stageFilter={stageFilter}
          channelFilter={channelFilter}
          onQueryChange={setQuery}
          onStageFilterChange={setStageFilter}
          onChannelFilterChange={setChannelFilter}
          onSelectCustomer={setSelectedCustomerId}
        />

        <main className="min-h-0 min-w-0 bg-background">
          {workMode === 'active' ? (
            <CustomerWorkspace
              customer={selectedCustomer}
              activities={activities}
              messageText={messageText}
              onMessageChange={setMessageText}
              onSchedule={() => setWorkMode('schedule')}
            />
          ) : null}

          {workMode === 'schedule' ? (
            <ScheduleBoard
              bookings={allBookings}
              packages={packages}
              staffList={staffList}
              staffAvailability={staffAvailability}
              selectedCustomer={selectedCustomer}
              bookingCustomerName={bookingCustomerName}
              selectedDate={selectedDate}
              selectedPackageId={selectedPackageId}
              selectedStaffId={selectedStaffId}
              selectedTime={selectedTime}
              availableSlots={availableSlots}
              setBookingCustomerName={setBookingCustomerName}
              setSelectedDate={setSelectedDate}
              setSelectedPackageId={setSelectedPackageId}
              setSelectedStaffId={setSelectedStaffId}
              setSelectedTime={setSelectedTime}
              onCreateBooking={handleCreateBooking}
              onMutateBooking={mutateBooking}
            />
          ) : null}

          {workMode === 'segments' ? <AudienceBoard /> : null}
        </main>

      </div>
    </div>
  );
}

function InlineMetric({ label, value, tone = 'text-foreground' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
      <span className={cn('font-identifier text-base font-semibold', tone)}>{value}</span>
    </div>
  );
}

function ChannelChip({ channelId, compact = false }: { channelId: ChannelKey; compact?: boolean }) {
  const channel = getChannel(channelId);
  const Icon = channel.icon;

  return (
    <span className={cn(
      'inline-flex min-w-0 items-center gap-1 text-muted-foreground',
      compact ? 'text-[10px]' : 'text-xs',
    )} title={channel.label}>
      <Icon className="size-3" />
      <span>{channel.shortLabel}</span>
    </span>
  );
}

function ModeRail({
  mode,
  activeCount,
  bookingCount,
  segmentCount,
  onChange,
}: {
  mode: WorkMode;
  activeCount: number;
  bookingCount: number;
  segmentCount: number;
  onChange: (mode: WorkMode) => void;
}) {
  return (
    <aside className="border-b border-border bg-background lg:border-b-0 lg:border-r">
      <div className="grid grid-cols-3 lg:grid-cols-1">
        <ModeRailButton active={mode === 'active'} label="Inbox" value={String(activeCount)} icon={Inbox} onClick={() => onChange('active')} />
        <ModeRailButton active={mode === 'schedule'} label="Book" value={String(bookingCount)} icon={CalendarCheck} onClick={() => onChange('schedule')} />
        <ModeRailButton active={mode === 'segments'} label="Grow" value={String(segmentCount)} icon={Target} onClick={() => onChange('segments')} />
      </div>
    </aside>
  );
}

function ModeRailButton({ active, label, value, icon: Icon, onClick }: {
  active: boolean;
  label: string;
  value: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex min-h-16 items-center justify-center gap-3 border-r border-border px-3 py-2 text-left transition-colors last:border-r-0 lg:min-h-[92px] lg:flex-col lg:border-b lg:border-r-0',
        active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 text-center">
        <span className="block text-[10px] font-semibold uppercase leading-none">{label}</span>
        <span className="mt-1 block font-identifier text-base font-semibold leading-none">{value}</span>
      </span>
    </button>
  );
}

function QueuePanel({
  customers: visibleCustomers,
  selectedCustomer,
  query,
  stageFilter,
  channelFilter,
  onQueryChange,
  onStageFilterChange,
  onChannelFilterChange,
  onSelectCustomer,
}: {
  customers: ServiceCustomer[];
  selectedCustomer: ServiceCustomer;
  query: string;
  stageFilter: string;
  channelFilter: ChannelFilter;
  onQueryChange: (value: string) => void;
  onStageFilterChange: (value: string) => void;
  onChannelFilterChange: (value: ChannelFilter) => void;
  onSelectCustomer: (id: string) => void;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col border-b border-border bg-[hsl(var(--surface-control))] lg:border-b-0 lg:border-r">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
          <span className="font-identifier text-xs text-muted-foreground">{visibleCustomers.length} conversations</span>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Find customer"
              className="h-9 rounded-md border-border bg-background pl-9 text-sm"
            />
          </div>
          <Select value={stageFilter} onValueChange={onStageFilterChange}>
            <SelectTrigger className="h-9 rounded-md border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stageFilters.map((filter) => <SelectItem key={filter} value={filter}>{filter}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
              <span>Channel</span>
              <span className="truncate">{channelFilter === 'all' ? 'All sources' : getChannel(channelFilter).label}</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-visible">
              <ChannelFilterButton active={channelFilter === 'all'} label="All" icon={Inbox} onClick={() => onChannelFilterChange('all')} />
              {channels.map((channel) => (
                <ChannelFilterButton
                  key={channel.id}
                  active={channelFilter === channel.id}
                  label={channel.shortLabel}
                  icon={channel.icon}
                  onClick={() => onChannelFilterChange(channel.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-visible">
        {visibleCustomers.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No conversations match these filters.
          </div>
        ) : visibleCustomers.map((customer) => {
          const selected = selectedCustomer.id === customer.id;
          return (
            <button
              key={customer.id}
              type="button"
              className={cn(
                'relative grid w-full gap-2 border-b border-border px-4 py-4 text-left transition-colors hover:bg-[hsl(var(--surface-row-hover))]',
                selected && 'bg-background',
              )}
              onClick={() => onSelectCustomer(customer.id)}
            >
              {selected ? <span className="absolute inset-y-0 left-0 w-1 bg-primary" /> : null}
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{customer.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{customer.intent}</div>
                </div>
                <span className={cn('shrink-0 text-xs font-semibold', stageClass[customer.stage])}>{customer.stage}</span>
              </div>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{customer.lastMessage}</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">{customer.channels.map((channel) => <ChannelChip key={channel} channelId={channel} compact />)}</div>
                <span className="text-xs text-muted-foreground">{customer.lastTouch}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ChannelFilterButton({ active, label, icon: Icon, onClick }: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Channel ${label}`}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

function CustomerWorkspace({
  customer,
  activities,
  messageText,
  onMessageChange,
  onSchedule,
}: {
  customer: ServiceCustomer;
  activities: CustomerActivity[];
  messageText: string;
  onMessageChange: (value: string) => void;
  onSchedule: () => void;
}) {
  const suggestedReply = `Hi ${customer.name.split(' ')[0]}, we have availability for ${customer.intent}. Would you like to book?`;

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
      <section className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold leading-tight text-foreground">{customer.name}</h2>
              <span className={cn('text-xs font-semibold', stageClass[customer.stage])}>{customer.stage}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{customer.intent}</span>
              <span className="font-identifier text-foreground">{currency.format(customer.value)}</span>
              <span>Owner {customer.owner}</span>
              <span>Score <span className="font-identifier text-foreground">{customer.score}</span></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {customer.channels.map((channel) => <ChannelChip key={channel} channelId={channel} />)}
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-3">
          <ProfileFact label="Phone" value={customer.identity.phone || '-'} />
          <ProfileFact label="Handle" value={customer.identity.handle || '-'} />
          <ProfileFact label="Email" value={customer.identity.email || '-'} />
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto scrollbar-visible">
        {activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}
      </section>

      <section className="border-t border-border bg-[hsl(var(--surface-control))] px-5 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <MessageCircle className="size-4" />
          <span>Reply via</span>
          <ChannelChip channelId={customer.primaryChannel} />
        </div>
        <Textarea
          value={messageText}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={suggestedReply}
          className="min-h-20 resize-none rounded-md border-border bg-background text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2 pr-24 lg:pr-0">
          <Button size="sm" className="h-9"><Send className="size-4" />Send</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={onSchedule}><CalendarCheck className="size-4" />Book slot</Button>
          <Button size="sm" variant="ghost" className="h-9 text-muted-foreground"><Megaphone className="size-4" />Campaign</Button>
        </div>
      </section>
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="font-semibold uppercase">{label}</span>
      <span className="ml-2 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function ActivityRow({ activity }: { activity: CustomerActivity }) {
  const channel = getChannel(activity.channel);
  const Icon = channel.icon;

  return (
    <article className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 border-b border-border px-5 py-5">
      <span className={cn(
        'grid size-10 place-items-center rounded-md border border-border bg-[hsl(var(--surface-control))] text-muted-foreground',
        activity.direction === 'inbound' && 'border-primary/30 text-primary',
        activity.direction === 'system' && 'text-foreground',
      )}>
        {activity.direction === 'system' ? <Clock3 className="size-5" /> : <Icon className="size-5" />}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{activity.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <ChannelChip channelId={activity.channel} compact />
              <span>{activity.direction}</span>
            </div>
          </div>
          <span className="shrink-0 font-identifier text-xs text-muted-foreground">{activity.time}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{activity.body}</p>
      </div>
    </article>
  );
}

function ScheduleBoard({
  bookings,
  packages,
  staffList,
  staffAvailability,
  selectedCustomer,
  bookingCustomerName,
  selectedDate,
  selectedPackageId,
  selectedStaffId,
  selectedTime,
  availableSlots,
  setBookingCustomerName,
  setSelectedDate,
  setSelectedPackageId,
  setSelectedStaffId,
  setSelectedTime,
  onCreateBooking,
  onMutateBooking,
}: {
  bookings: Booking[];
  packages: ReturnType<typeof getServicePackages>;
  staffList: ReturnType<typeof getStaffResources>;
  staffAvailability: ReturnType<typeof getAllStaffAvailability>;
  selectedCustomer: ServiceCustomer;
  bookingCustomerName: string;
  selectedDate: string;
  selectedPackageId: string;
  selectedStaffId: string;
  selectedTime: string;
  availableSlots: ReturnType<typeof getAvailableSlots>;
  setBookingCustomerName: (value: string) => void;
  setSelectedDate: (value: string) => void;
  setSelectedPackageId: (value: string) => void;
  setSelectedStaffId: (value: string) => void;
  setSelectedTime: (value: string) => void;
  onCreateBooking: () => void;
  onMutateBooking: (action: () => void) => void;
}) {
  return (
    <div className="grid h-full min-h-0 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 border-b border-border 2xl:border-b-0 2xl:border-r">
        <div className="flex min-h-14 items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Booking board</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{bookings.length} total</p>
          </div>
          <CalendarCheck className="size-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto scrollbar-visible">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-[hsl(var(--surface-control))] text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-[hsl(var(--surface-row-hover))]">
                  <td className="px-4 py-3 font-medium text-foreground">{booking.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{packages.find((pkg) => pkg.id === booking.packageId)?.name ?? booking.packageId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{staffList.find((staff) => staff.id === booking.staffId)?.name ?? booking.staffId}</td>
                  <td className="px-4 py-3 font-identifier text-xs text-muted-foreground">{new Date(booking.startTime).toLocaleDateString('en-GB')} {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3"><span className={cn('font-semibold capitalize', statusClass(booking.status))}>{booking.status}</span></td>
                  <td className="px-4 py-3 text-right font-identifier text-xs">{currency.format(booking.value)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {booking.status === 'requested' ? <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onMutateBooking(() => confirmBooking(booking.id))}>Confirm</Button> : null}
                      {booking.status === 'confirmed' ? <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onMutateBooking(() => completeBooking(booking.id))}>Complete</Button> : null}
                      {booking.status === 'requested' || booking.status === 'confirmed' ? <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground" onClick={() => onMutateBooking(() => cancelBooking(booking.id))}>Cancel</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Staff capacity</h3>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {staffAvailability.map((staff) => (
              <div key={staff.staffId} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{staff.staffName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{staff.existingBookings} bookings - {staff.availableSlots} slots free</div>
                </div>
                <span className={cn('size-2.5 rounded-full', staff.availableSlots > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/35')} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="bg-[hsl(var(--surface-control))] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <UserRoundCheck className="size-4" />
          Create booking
        </div>
        <div className="mt-4 grid gap-4">
          <Input placeholder="Customer name" value={bookingCustomerName || selectedCustomer.name} onChange={(event) => setBookingCustomerName(event.target.value)} className="h-9 rounded-md border-border bg-background text-sm" />
          <Select value={selectedPackageId} onValueChange={(value) => { setSelectedPackageId(value); setSelectedTime(''); }}>
            <SelectTrigger className="h-9 rounded-md border-border bg-background text-sm"><SelectValue placeholder="Select package" /></SelectTrigger>
            <SelectContent>{packages.map((pkg) => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.duration_minutes}m - {currency.format(pkg.price)})</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedStaffId} onValueChange={(value) => { setSelectedStaffId(value); setSelectedTime(''); }}>
            <SelectTrigger className="h-9 rounded-md border-border bg-background text-sm"><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>{staffList.map((staff) => <SelectItem key={staff.id} value={staff.id}>{staff.name} - {staff.skills.join(', ')}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedTime(''); }} className="h-9 rounded-md border-border bg-background text-sm" />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Available slots</div>
            {availableSlots.length ? (
              <div className="grid max-h-[230px] grid-cols-3 gap-1.5 overflow-y-auto scrollbar-visible">
                {availableSlots.map((slot) => (
                  <button key={slot.start} type="button" onClick={() => setSelectedTime(slot.start)} disabled={!slot.available} className={cn('h-8 rounded-md border px-2 text-xs font-medium transition-colors', slot.available && selectedTime === slot.start ? 'border-primary bg-primary text-primary-foreground' : slot.available ? 'border-border bg-background text-foreground hover:border-primary/40' : 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground/40')}>
                    {slot.start}
                  </button>
                ))}
              </div>
            ) : <div className="border border-dashed border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground">Select package and staff to view slots.</div>}
          </div>
          <Button disabled={!selectedPackageId || !selectedStaffId || !selectedTime} onClick={onCreateBooking} size="sm" className="h-9 w-full"><CalendarCheck className="size-4" />Create booking</Button>
        </div>
      </aside>
    </div>
  );
}

function AudienceBoard() {
  return (
    <div className="grid h-full min-h-0 xl:grid-cols-2">
      <section className="border-b border-border xl:border-b-0 xl:border-r">
        <div className="flex min-h-14 items-center justify-between border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">Customer segments</h2><Target className="size-4 text-muted-foreground" /></div>
        <div className="divide-y divide-border">
          {segments.map((segment) => <ActionRow key={segment.id} title={segment.name} meta={`${segment.count} customers`} detail={segment.rule} action={segment.action} />)}
        </div>
      </section>
      <section>
        <div className="flex min-h-14 items-center justify-between border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">Outreach campaigns</h2><Megaphone className="size-4 text-muted-foreground" /></div>
        <div className="divide-y divide-border">
          {campaignsList.map((campaign) => (
            <div key={campaign.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
              <div><div className="text-sm font-semibold">{campaign.name}</div><div className="text-xs text-muted-foreground">{campaign.audience}</div></div>
              <div><div className="flex flex-wrap gap-3">{campaign.channels.map((channel) => <ChannelChip key={channel} channelId={channel} />)}</div><div className="mt-2 text-xs text-muted-foreground">{campaign.result}</div></div>
              <span className={cn('text-xs font-semibold', campaign.status === 'Live' ? 'text-emerald-700 dark:text-emerald-300' : campaign.status === 'Scheduled' ? 'text-warning' : 'text-muted-foreground')}>{campaign.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionRow({ title, meta, detail, action }: { title: string; meta: string; detail: string; action: string }) {
  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
      <div><div className="text-sm font-semibold">{title}</div><div className="text-xs text-muted-foreground">{meta}</div></div>
      <div className="text-sm leading-6 text-muted-foreground">{detail}</div>
      <Button size="sm" variant="outline" className="h-8 justify-self-start lg:justify-self-end">{action}</Button>
    </div>
  );
}
