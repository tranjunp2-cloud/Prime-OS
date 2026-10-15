export interface Message { id: string; direction: 'inbound' | 'outbound'; text: string; at: string }
export interface Guest { id: string; name: string; channel: string; handle: string; phone: string; email: string; customerId?: string; notes: string }
export interface Conversation { id: string; guestId: string; page: string; type: 'chat' | 'comment'; status: 'open' | 'resolved'; assignedTo: string; unread: boolean; tags: string[]; messages: Message[]; orderIds: string[]; draft: string }
export interface HistoryEvent { id: string; conversationId: string; guestId: string; action: string; detail: string; at: string }
export interface ReplyTemplate { id: string; name: string; body: string; kind: 'quick' | 'suggestion' | 'automatic'; enabled: boolean }
export interface GuestLevel { name: string; chats: number; comments: number }
export interface WhatsAppForm { id: string; name: string; greeting: string; confirmation: string; enabled: boolean }
export interface CrmState { version: 1; guests: Guest[]; conversations: Conversation[]; history: HistoryEvent[]; templates: ReplyTemplate[]; tags: string[]; keywords: string[]; levels: GuestLevel[]; forms: WhatsAppForm[] }

export const crmStorageKey = (scope: string, empty: boolean) => `prime.crm.prototype.v1:${encodeURIComponent(scope)}:${empty ? 'empty' : 'sample'}`;
export const newId = () => crypto.randomUUID();
const initialAt = '2026-10-08T03:42:00.000Z';

export function initialCrmState(empty = false): CrmState {
  const guests: Guest[] = empty ? [] : [
    { id: 'guest-anh', name: 'Nguyen Minh Anh', channel: 'Facebook', handle: 'minhanh', phone: '0901234567', email: '', notes: '' },
    { id: 'guest-han', name: 'Tran Gia Han', channel: 'Zalo', handle: 'giahan', phone: '', email: '', notes: '' },
    { id: 'guest-chau', name: 'Le Bao Chau', channel: 'Shopee', handle: 'bao.chau', phone: '', email: '', notes: '' },
    { id: 'guest-viet', name: 'Phan Quoc Viet', channel: 'Facebook', handle: 'quocviet', phone: '', email: '', notes: '' },
  ];
  return {
    version: 1, guests,
    conversations: guests.map((guest, index) => ({ id: `c${index + 1}`, guestId: guest.id, page: index === 2 ? 'Shopee Flagship' : 'Prime Beauty VN', type: index === 3 ? 'comment' : 'chat', status: 'open', assignedTo: '', unread: index !== 2, tags: [], draft: '', orderIds: [], messages: [{ id: `m${index}`, direction: 'inbound', text: ['Can this arrive before Friday?', 'I want the blue variant.', 'Is this item still available?', 'How do I use this product?'][index], at: initialAt }] })),
    history: [],
    templates: empty ? [] : [{ id: 'reply-availability', name: 'Product availability', body: 'Let me check the current availability for you.', kind: 'quick', enabled: true }, { id: 'reply-shipping', name: 'Shipping ETA', body: 'Let me check the delivery options for your address.', kind: 'quick', enabled: true }],
    tags: ['Needs follow-up', 'Waiting for customer', 'Order inquiry'], keywords: [],
    levels: [{ name: 'Awareness', chats: 0, comments: 0 }, { name: 'Consideration', chats: 2, comments: 1 }, { name: 'Convert', chats: 5, comments: 2 }, { name: 'Loyalty', chats: 10, comments: 5 }, { name: 'Advocacy', chats: 20, comments: 10 }], forms: [],
  };
}

export function readCrmState(scope: string, empty: boolean): CrmState {
  const raw = localStorage.getItem(crmStorageKey(scope, empty));
  if (!raw) return initialCrmState(empty);
  const state = JSON.parse(raw) as CrmState;
  if (state.version !== 1 || !['guests', 'conversations', 'history', 'templates', 'tags', 'keywords', 'levels', 'forms'].every(key => Array.isArray(state[key as keyof CrmState]))) throw new Error('Saved CRM data could not be read. Your saved data has not been replaced.');
  return state;
}

export function saveCrmState(scope: string, empty: boolean, state: CrmState) {
  localStorage.setItem(crmStorageKey(scope, empty), JSON.stringify(state));
}

export function recordEvent(state: CrmState, conversation: Conversation, action: string, detail: string): CrmState {
  return { ...state, history: [{ id: newId(), conversationId: conversation.id, guestId: conversation.guestId, action, detail, at: new Date().toISOString() }, ...state.history] };
}

export function replyToConversation(state: CrmState, id: string, text: string): CrmState {
  const conversation = state.conversations.find(item => item.id === id);
  if (!conversation) throw new Error('Conversation no longer exists.');
  if (conversation.status === 'resolved') throw new Error('Reopen this conversation before replying.');
  if (!text.trim()) throw new Error('Enter a reply.');
  if (text.length > 5000) throw new Error('Replies must be 5,000 characters or fewer.');
  const unsafe = state.keywords.find(word => text.toLocaleLowerCase().includes(word.toLocaleLowerCase()));
  if (unsafe) throw new Error(`Remove the restricted keyword “${unsafe}” before sending.`);
  const updated = { ...conversation, draft: '', unread: false, messages: [...conversation.messages, { id: newId(), direction: 'outbound' as const, text: text.trim(), at: new Date().toISOString() }] };
  return recordEvent({ ...state, conversations: state.conversations.map(item => item.id === id ? updated : item) }, conversation, 'Reply simulated', text.trim());
}

export function guestLevel(state: CrmState, guestId: string) {
  const conversations = state.conversations.filter(item => item.guestId === guestId);
  const inboundCount = (type: Conversation['type']) => conversations.filter(item => item.type === type).reduce((sum, item) => sum + item.messages.filter(message => message.direction === 'inbound').length, 0);
  const chats = inboundCount('chat'); const comments = inboundCount('comment');
  return [...state.levels].reverse().find(level => chats >= level.chats && comments >= level.comments)?.name ?? 'Unclassified';
}

export function validateLevels(levels: GuestLevel[]) {
  if (!levels.length) throw new Error('At least one guest level is required.');
  levels.forEach((level, index) => {
    if (!level.name.trim() || !Number.isInteger(level.chats) || !Number.isInteger(level.comments) || level.chats < 0 || level.comments < 0) throw new Error('Each level needs a name and non-negative whole-number thresholds.');
    if (index && (level.chats < levels[index - 1].chats || level.comments < levels[index - 1].comments)) throw new Error('Thresholds must increase or stay equal from one level to the next.');
  });
}

export function historyCsv(state: CrmState, events = state.history) {
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
  return [['Time', 'Guest', 'Conversation', 'Action', 'Detail'], ...events.map(event => [event.at, state.guests.find(guest => guest.id === event.guestId)?.name ?? event.guestId, event.conversationId, event.action, event.detail])].map(row => row.map(cell).join(',')).join('\r\n');
}
