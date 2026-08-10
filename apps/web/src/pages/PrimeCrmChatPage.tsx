import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  CheckCheck,
  Clock3,
  Mail,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserRound,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { getPrimeAuthToken, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';
import { cn } from '@/lib/utils';
import { getServicePackages, getStaffResources, getBookings, createBooking } from '@/lib/booking-store';
import { getAvailableSlots } from '@/lib/availability-engine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlatformMessage {
  id: string;
  chatId: string;
  from: string;
  fromId: string;
  text: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  platform: string;
}

interface Conversation {
  id: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  platforms: string[];
  connectorId: string;
  connectorIds: string[];
  lastMessage: PlatformMessage | null;
  unreadCount: number;
  messages: PlatformMessage[];
  activePlatform?: string;
  activeConnectorId?: string;
}

interface GrowthConnectorSummary {
  id: string;
  provider: string;
  name?: string;
  category: string;
  status: string;
  accountRef?: string;
}

const PLATFORM_STYLES: Record<string, string> = {
  telegram: 'border-sky-200 bg-sky-50 text-sky-700',
  whatsapp: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  messenger: 'border-blue-200 bg-blue-50 text-blue-700',
  zalo: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  line: 'border-lime-200 bg-lime-50 text-lime-700',
  wechat: 'border-green-200 bg-green-50 text-green-700',
  viber: 'border-purple-200 bg-purple-50 text-purple-700',
  instagram: 'border-pink-200 bg-pink-50 text-pink-700',
  facebook: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  gmail: 'border-red-200 bg-red-50 text-red-700',
  outlook: 'border-blue-200 bg-blue-50 text-blue-700',
};

function getPlatformClassName(platform: string) {
  return PLATFORM_STYLES[platform] || 'border-slate-200 bg-slate-50 text-slate-700';
}

function normalizePlatform(platform: string) {
  return platform.replace(/_/g, ' ');
}

function formatClock(timestamp?: string | null) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function messageId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function sortMessages(messages: PlatformMessage[]) {
  return [...messages].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

function getLastMessage(messages: PlatformMessage[]) {
  const sorted = sortMessages(messages);
  return sorted.at(-1) || null;
}

function normalizeConversation(conversation: Conversation): Conversation {
  const messages = sortMessages(conversation.messages || []);
  const platforms = conversation.platforms?.length
    ? conversation.platforms
    : Array.from(new Set(messages.map((message) => message.platform).filter(Boolean)));
  const connectorIds = conversation.connectorIds?.length
    ? conversation.connectorIds
    : conversation.connectorId
      ? [conversation.connectorId]
      : [];

  return {
    ...conversation,
    platforms,
    connectorIds,
    connectorId: conversation.connectorId || connectorIds[0] || '',
    lastMessage: conversation.lastMessage || getLastMessage(messages),
    unreadCount: Number(conversation.unreadCount || 0),
    messages,
  };
}

function appendMessageToConversations(
  conversations: Conversation[],
  conversationId: string,
  message: PlatformMessage,
) {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;

    const messages = sortMessages([...conversation.messages, message]);

    return {
      ...conversation,
      messages,
      lastMessage: message,
      unreadCount: message.direction === 'outbound' ? 0 : conversation.unreadCount,
    };
  });
}

function markConversationRead(conversations: Conversation[], conversationId: string) {
  return conversations.map((conversation) => (
    conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
  ));
}

function connectorForPlatform(conversation: Conversation, platform: string) {
  const direct = conversation.connectorIds.find((connectorId) => connectorId.toLowerCase().includes(platform.toLowerCase()));
  return direct || conversation.activeConnectorId || conversation.connectorId || conversation.connectorIds[0] || '';
}

function getConversationSearchText(conversation: Conversation) {
  return [
    conversation.customerName,
    conversation.customerCompany,
    conversation.customerEmail,
    conversation.platforms.join(' '),
    conversation.lastMessage?.text,
  ].filter(Boolean).join(' ').toLowerCase();
}

function isMessagingConnector(connector: GrowthConnectorSummary) {
  return ['Messaging', 'Social', 'Email'].includes(connector.category);
}

interface PrimeCrmChatPageProps {
  embedded?: boolean;
  title?: string;
}

export default function PrimeCrmChatPage({ embedded = false, title = 'Service Chat' }: PrimeCrmChatPageProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connectedConnectors, setConnectedConnectors] = useState<GrowthConnectorSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePlatformByConversation, setActivePlatformByConversation] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollRef = useRef<() => void>(() => {});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const token = getPrimeAuthToken();
      if (!token) {
        setLoadError('Login required');
        setLoading(false);
        return;
      }

      const baseUrl = resolvePrimeBackendBase();
      const [conversationResponse, growthResponse] = await Promise.all([
        fetch(`${baseUrl}/api/demand/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseUrl}/api/growth-os`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (!conversationResponse.ok) {
        throw new Error('Unable to load live conversations');
      }

      const data = await conversationResponse.json();
      const remote = Array.isArray(data)
        ? data.map((item) => normalizeConversation(item as Conversation))
        : [];

      setConversations(remote);
      setLastRefreshAt(new Date().toISOString());
      setLoadError(null);

      if (growthResponse?.ok) {
        const growth = await growthResponse.json().catch(() => ({}));
        const connectors = Array.isArray(growth.connectors)
          ? growth.connectors.filter((connector: GrowthConnectorSummary) => isMessagingConnector(connector) && connector.status === 'connected')
          : [];
        setConnectedConnectors(connectors);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load live conversations');
    } finally {
      setLoading(false);
    }
  };

  pollRef.current = fetchConversations;

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => getConversationSearchText(conversation).includes(normalizedQuery));
  }, [conversations, query]);

  const selectedConversation = selectedId
    ? conversations.find((conversation) => conversation.id === selectedId) || null
    : null;

  const activePlatform = selectedConversation
    ? activePlatformByConversation[selectedConversation.id] || selectedConversation.activePlatform || selectedConversation.platforms[0] || ''
    : '';

  useEffect(() => {
    void pollRef.current();
    const interval = window.setInterval(() => void pollRef.current(), 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedId && visibleConversations.length > 0) {
      setSelectedId(visibleConversations[0].id);
      return;
    }

    if (selectedId && conversations.length > 0 && !conversations.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations[0].id);
      return;
    }

    if (selectedId && conversations.length === 0) {
      setSelectedId(null);
    }
  }, [conversations, selectedId, visibleConversations]);

  useEffect(() => {
    if (!selectedId) return;
    setConversations((current) => markConversationRead(current, selectedId));
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedConversation?.messages.length, selectedId]);

  function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    setConversations((current) => markConversationRead(current, conversationId));
  }

  async function handleSend() {
    if (!selectedConversation || !text.trim()) return;

    const outboundText = text.trim();
    const platform = activePlatform || selectedConversation.platforms[0] || 'telegram';
    const connectorId = connectorForPlatform(selectedConversation, platform);

    if (!connectorId) {
      toast.error('No live connector selected');
      return;
    }

    setSending(true);

    try {
      const token = getPrimeAuthToken();
      if (!token) {
        toast.error('Login required');
        return;
      }

      const baseUrl = resolvePrimeBackendBase();
      const response = await fetch(`${baseUrl}/api/demand/conversations/${encodeURIComponent(selectedConversation.id)}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ connectorId, text: outboundText }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(body.message || 'Send failed');
        return;
      }

      setText('');
      setConversations((current) => appendMessageToConversations(current, selectedConversation.id, {
        id: messageId('outbound'),
        chatId: selectedConversation.id,
        from: 'PrimeOS',
        fromId: 'primeos_operator',
        text: outboundText,
        direction: 'outbound',
        timestamp: new Date().toISOString(),
        platform: body.platform || platform,
      }));
      void pollRef.current();
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  }

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  const conversationPlatforms = conversations.flatMap((conversation) => conversation.platforms);
  const connectedPlatforms = Array.from(new Set([
    ...connectedConnectors.map((connector) => connector.provider),
    ...conversationPlatforms,
  ]));
  const telegramConnector = connectedConnectors.find((connector) => connector.provider === 'telegram');

  // Booking state
  const [showBookingScheduler, setShowBookingScheduler] = useState(false);
  const [bookingPackageId, setBookingPackageId] = useState('');
  const [bookingStaffId, setBookingStaffId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookingTime, setBookingTime] = useState('');
  const [bookingTick, setBookingTick] = useState(0);

  const packages = getServicePackages();
  const staffList = getStaffResources();
  const allBookings = getBookings();
  const selectedPkg = packages.find(p => p.id === bookingPackageId);
  const bookingSlots = bookingStaffId && bookingPackageId
    ? getAvailableSlots(bookingStaffId, bookingDate, selectedPkg?.duration_minutes ?? 60)
    : [];
  const customerBookings = selectedConversation
    ? allBookings.filter(b => b.customerName.toLowerCase().includes(selectedConversation.customerName.toLowerCase()))
    : [];

  const handleCreateBookingFromChat = () => {
    if (!selectedConversation || !bookingPackageId || !bookingStaffId || !bookingTime) return;
    createBooking({
      customerId: selectedConversation.id,
      customerName: selectedConversation.customerName,
      packageId: bookingPackageId,
      staffId: bookingStaffId,
      startTime: `${bookingDate}T${bookingTime}:00`,
      sourceConversationId: selectedConversation.id,
    });
    setBookingTime('');
    setShowBookingScheduler(false);
    setBookingTick(t => t + 1);
    toast.success(`Booking created for ${selectedConversation.customerName}`);
  };

  return (
    <div className={cn('flex h-full flex-col bg-background', embedded ? 'min-h-0' : 'min-h-[680px]')}>
      <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <MessageSquare className="size-3.5" />
              Customer Inbox
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Live only
            </span>
            {telegramConnector ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                Telegram connected{telegramConnector.accountRef ? ` · ${telegramConnector.accountRef}` : ''}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-normal text-foreground">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {conversations.length} live customers, {totalUnread} unread, {connectedPlatforms.length} connected channel{connectedPlatforms.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connectedPlatforms.map((platform) => (
            <span key={platform} className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize', getPlatformClassName(platform))}>
              {normalizePlatform(platform)}
            </span>
          ))}
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
            onClick={() => void fetchConversations()}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[350px_minmax(0,1fr)_310px]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search live customers..."
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/45"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleConversations.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">
                {loading ? 'Loading live Telegram conversations...' : 'No live customer conversations yet.'}
              </div>
            ) : (
              visibleConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={cn(
                    'flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    selectedConversation?.id === conversation.id && 'bg-primary/5',
                  )}
                  onClick={() => selectConversation(conversation.id)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground">
                    <UserRound className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{conversation.customerName}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatClock(conversation.lastMessage?.timestamp)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{conversation.customerEmail || conversation.customerCompany || 'Telegram user'}</span>
                    <span className="mt-2 flex min-w-0 items-center gap-1.5">
                      {conversation.platforms.slice(0, 3).map((platform) => (
                        <span key={platform} className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-semibold capitalize', getPlatformClassName(platform))}>
                          {normalizePlatform(platform)}
                        </span>
                      ))}
                      {conversation.unreadCount > 0 ? (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 block truncate text-xs text-muted-foreground">
                      {conversation.lastMessage?.direction === 'outbound' ? 'You: ' : ''}{conversation.lastMessage?.text || 'No messages'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-background">
          {selectedConversation ? (
            <>
              <div className="shrink-0 border-b bg-card px-4 py-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">{selectedConversation.customerName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Live conversation</span>
                      <span>Chat ID: {selectedConversation.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedConversation.platforms.map((platform) => {
                      const active = platform === activePlatform;
                      return (
                        <button
                          key={platform}
                          type="button"
                          className={cn(
                            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold capitalize transition-colors',
                            active ? 'border-primary bg-primary text-primary-foreground' : getPlatformClassName(platform),
                          )}
                          onClick={() => setActivePlatformByConversation((current) => ({ ...current, [selectedConversation.id]: platform }))}
                        >
                          <Zap className="size-3" />
                          {normalizePlatform(platform)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex max-w-[78%] flex-col gap-1 rounded-lg px-4 py-2.5 shadow-sm',
                        message.direction === 'inbound'
                          ? 'self-start rounded-bl-md border bg-card text-card-foreground'
                          : 'self-end rounded-br-md bg-primary text-primary-foreground',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                            message.direction === 'inbound'
                              ? getPlatformClassName(message.platform)
                              : 'border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground',
                          )}
                        >
                          {normalizePlatform(message.platform)}
                        </span>
                        <span className={cn('text-[10px]', message.direction === 'inbound' ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
                          {formatClock(message.timestamp)}
                        </span>
                        {message.direction === 'outbound' ? <CheckCheck className="size-3 text-primary-foreground/70" /> : null}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="shrink-0 border-t bg-card px-4 py-3">
                <div className="mx-auto flex max-w-4xl items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <MessageCircle className="size-3.5" />
                      Reply via <span className="capitalize text-foreground">{normalizePlatform(activePlatform || 'telegram')}</span>
                    </div>
                    <textarea
                      value={text}
                      rows={1}
                      placeholder={`Message ${selectedConversation.customerName}`}
                      className="min-h-11 w-full resize-none rounded-lg border border-input bg-background px-3 py-3 text-sm leading-5 outline-none transition-colors focus:border-primary/45"
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleSend()}
                    disabled={sending || !text.trim()}
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="grid size-14 place-items-center rounded-full border bg-card">
                <MessageSquare className="size-7 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {loadError ? 'Unable to load live conversations' : 'Waiting for live Telegram messages'}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {loadError
                    ? loadError
                    : telegramConnector
                      ? `Telegram is connected${telegramConnector.accountRef ? ` as ${telegramConnector.accountRef}` : ''}. Send a message to the bot, then this inbox will show the real chat.`
                      : 'Connect Telegram in Connectors, then inbound messages will appear here.'}
                </p>
                {lastRefreshAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">Last checked {formatClock(lastRefreshAt)}</p>
                ) : null}
              </div>
            </div>
          )}
        </section>

          <aside className="hidden min-h-0 flex-col border-l bg-card xl:flex">
            {selectedConversation ? (
              <>
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Live context</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Real conversation from connected channels</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3">
                    <ContextMetric label="Chat ID" value={selectedConversation.id} />
                    <ContextMetric label="Channel" value={selectedConversation.platforms.map(normalizePlatform).join(', ')} />
                    <ContextMetric label="Messages" value={String(selectedConversation.messages.length)} />
                    <ContextMetric label="Connector" value={connectorForPlatform(selectedConversation, activePlatform || selectedConversation.platforms[0] || '') || 'Not selected'} />
                  </div>

                  {/* Booking Section */}
                  <div className="mt-5 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Booking</h3>
                      <button
                        type="button"
                        onClick={() => setShowBookingScheduler(v => !v)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                      >
                        <Plus className="size-3" />
                        Book
                      </button>
                    </div>

                    {/* Active Bookings */}
                    {customerBookings.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {customerBookings.map(b => (
                          <div key={b.id} className="rounded-lg border bg-background px-3 py-2 text-xs">
                            <div className="font-medium">{packages.find(p => p.id === b.packageId)?.name ?? b.packageId}</div>
                            <div className="mt-0.5 text-muted-foreground">
                              {new Date(b.startTime).toLocaleDateString('en-GB')} {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <Badge variant="outline" className="mt-1 text-[10px] capitalize">{b.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Booking Scheduler (expandable) */}
                    {showBookingScheduler && (
                      <div className="mt-3 grid gap-2.5 rounded-lg border bg-background p-3">
                        <Select value={bookingPackageId} onValueChange={v => { setBookingPackageId(v); setBookingTime(''); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Package" /></SelectTrigger>
                          <SelectContent>
                            {packages.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} ({p.duration_minutes}m)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={bookingStaffId} onValueChange={v => { setBookingStaffId(v); setBookingTime(''); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Staff" /></SelectTrigger>
                          <SelectContent>
                            {staffList.map(s => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input type="date" value={bookingDate}
                          onChange={e => { setBookingDate(e.target.value); setBookingTime(''); }}
                          className="h-8 text-xs" />

                        {bookingSlots.length > 0 && (
                          <div className="grid grid-cols-3 gap-1 max-h-[140px] overflow-y-auto">
                            {bookingSlots.map(slot => (
                              <button key={slot.start} type="button"
                                onClick={() => setBookingTime(slot.start)}
                                disabled={!slot.available}
                                className={cn(
                                  'rounded border px-1.5 py-1 text-[10px] font-medium transition-colors',
                                  slot.available && bookingTime === slot.start ? 'bg-primary text-primary-foreground border-primary'
                                    : slot.available ? 'hover:border-primary/40'
                                    : 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed',
                                )}>
                                {slot.start}
                              </button>
                            ))}
                          </div>
                        )}

                        <Button size="sm" disabled={!bookingPackageId || !bookingStaffId || !bookingTime}
                          onClick={handleCreateBookingFromChat} className="h-7 text-xs w-full">
                          <CalendarCheck className="size-3 mr-1" />Book
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Contact</h3>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="size-4" />
                        <span className="min-w-0 truncate">{selectedConversation.customerEmail || 'Not provided by Telegram'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <PhoneCall className="size-4" />
                        <span>Synced from channel profile</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Last activity</h3>
                    <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock3 className="mt-0.5 size-4 shrink-0" />
                      <span>{selectedConversation.lastMessage?.text || 'No activity yet'}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </aside>
      </div>
    </div>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
