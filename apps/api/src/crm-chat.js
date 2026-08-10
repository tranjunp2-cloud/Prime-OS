import { getTelegramMessages } from './telegram-gateway.js';
import { decryptCredential, findRawConnector, getGrowthOsSnapshot } from './growth-os.js';

export function getConversations() {
  const snapshot = getGrowthOsSnapshot();
  const conversations = new Map();

  for (const connector of snapshot.connectors) {
    if (!isMessagingConnector(connector)) continue;
    if (connector.status !== 'connected' && connector.status !== 'tested') continue;

    const msgs = getMessagesForConnector(connector.id, connector.provider);
    for (const msg of msgs) {
      const key = getConversationKey(msg);
      if (!key) continue;

      if (!conversations.has(key)) {
        conversations.set(key, {
          id: key,
          customerName: getCustomerName(msg, connector.provider, key),
          platforms: [connector.provider],
          connectorId: connector.id,
          connectorIds: [connector.id],
          lastMessage: null,
          unreadCount: 0,
          messages: [],
          priority: classifyCrmPriority(msg.text || '', connector.provider),
        });
      }
      const conv = conversations.get(key);
      const platformMsg = { ...msg, chatId: String(msg.chatId || key), platform: connector.provider };

      if (msg.direction === 'inbound' && msg.from && shouldUseInboundName(conv.customerName)) {
        conv.customerName = msg.from;
      }

      if (!conv.platforms.includes(connector.provider)) {
        conv.platforms.push(connector.provider);
      }
      if (!conv.connectorIds.includes(connector.id)) {
        conv.connectorIds.push(connector.id);
      }

      conv.messages.push(platformMsg);

      if (!conv.lastMessage || new Date(msg.timestamp) > new Date(conv.lastMessage.timestamp)) {
        conv.lastMessage = platformMsg;
      }

      if (msg.direction === 'inbound') {
        conv.unreadCount += 1;
      }
    }
  }

  for (const conversation of conversations.values()) {
    conversation.messages.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  }

  const result = Array.from(conversations.values()).sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return result;
}

function classifyCrmPriority(text, platform) {
  if (!text) return 2;
  const lower = text.toLowerCase();
  const highIntentPatterns = [
    /(đặt|chốt|mua|order|size|màu|color|xl|kích cỡ)\b/i,
    /\b(buy|purchase|confirm|checkout)\b/i,
  ];
  const midIntentPatterns = [
    /(giá|price|bao nhiêu|how much|còn|hết|stock|tồn)\b/i,
    /\b(price|cost|stock|available)\b/i,
  ];

  for (const p of highIntentPatterns) {
    if (p.test(lower)) return 0;
  }
  for (const p of midIntentPatterns) {
    if (p.test(lower)) return 1;
  }
  return 2;
}

function getConversationKey(message) {
  return String(message.chatId || message.fromId || message.from || '').trim();
}

function getCustomerName(message, provider, fallbackKey) {
  if (message.direction === 'inbound' && message.from) {
    return message.from;
  }

  if (provider === 'telegram') {
    return `Telegram chat ${fallbackKey}`;
  }

  return fallbackKey;
}

function shouldUseInboundName(currentName) {
  return !currentName || currentName === 'PrimeOS' || currentName.startsWith('Telegram chat ');
}

export function getConversation(conversationId, connectorId) {
  const conversations = getConversations();
  const conv = conversations.find((c) => c.id === conversationId);
  if (!conv) return null;

  if (connectorId) {
    return {
      ...conv,
      messages: conv.messages.filter((m) => m.platform === findPlatformForConnector(connectorId)),
      activePlatform: findPlatformForConnector(connectorId),
    };
  }

  return {
    ...conv,
    activePlatform: conv.platforms[0] || null,
    activeConnectorId: conv.connectorIds[0] || null,
  };
}

export async function sendConversationMessage(conversationId, connectorId, text) {
  const rawConnector = findRawConnector(connectorId);
  if (!rawConnector) throw Object.assign(new Error('Connector not found'), { statusCode: 404 });
  if (!text || typeof text !== 'string' || !text.trim()) throw Object.assign(new Error('Message text is required'), { statusCode: 400 });

  const token = decryptCredential(rawConnector.credentialMeta?.encryptedToken);
  if (!token) throw Object.assign(new Error('Connector is not authenticated'), { statusCode: 400 });

  if (rawConnector.provider === 'telegram') {
    const { sendTelegramMessage } = await import('./telegram-gateway.js');
    const result = await sendTelegramMessage(token, conversationId, text);
    const { addOutboundMessage } = await import('./telegram-gateway.js');
    addOutboundMessage(connectorId, { chatId: conversationId, text });
    return { ok: true, messageId: result.message_id, chatId: conversationId, text, platform: 'telegram' };
  }

  throw Object.assign(new Error(`Send not supported for ${rawConnector.provider}`), { statusCode: 400 });
}

// CRM Queue API
let crmQueue = [];

export function getCrmQueue() {
  return crmQueue;
}

export function createCrmQueueItem({ platform, customerName, customerId, messageText, conversationId }) {
  const priority = classifyCrmPriority(messageText, platform);
  const item = {
    id: `crm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    platform,
    customerName,
    customerId,
    messageText,
    conversationId,
    priority,
    status: 'unassigned',
    assignedTo: null,
    created_at: new Date().toISOString(),
  };
  crmQueue = [...crmQueue, item];
  return item;
}

export function assignCrmItem(crmId, operatorId) {
  const index = crmQueue.findIndex(d => d.id === crmId);
  if (index === -1) return null;
  crmQueue = crmQueue.map((d, i) =>
    i === index ? { ...d, status: d.status === 'unassigned' ? 'assigned' : d.status, assignedTo: operatorId } : d
  );
  return crmQueue[index];
}

export function getCrmQueueStats() {
  return {
    total: crmQueue.length,
    unassigned: crmQueue.filter(d => d.status === 'unassigned').length,
    assigned: crmQueue.filter(d => d.status === 'assigned').length,
    p0: crmQueue.filter(d => d.priority === 0).length,
    p1: crmQueue.filter(d => d.priority === 1).length,
    p2: crmQueue.filter(d => d.priority === 2).length,
  };
}

// Booking API
let bookings = [];

export function createBooking({ customerId, customerName, packageId, staffId, startTime }) {
  const booking = {
    id: `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    customerId,
    customerName,
    packageId,
    staffId,
    startTime,
    status: 'requested',
    created_at: new Date().toISOString(),
  };
  bookings = [...bookings, booking];
  return booking;
}

export function getBookings() {
  return bookings;
}

function isMessagingConnector(connector) {
  const messagingCategories = ['Messaging', 'Social', 'Email'];
  return messagingCategories.includes(connector.category);
}

function getMessagesForConnector(connectorId, provider) {
  if (provider === 'telegram') {
    return getTelegramMessages(connectorId);
  }
  return [];
}

function findPlatformForConnector(connectorId) {
  const snapshot = getGrowthOsSnapshot();
  const connector = snapshot.connectors.find((c) => c.id === connectorId);
  return connector ? connector.provider : null;
}
