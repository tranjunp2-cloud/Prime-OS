import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decryptCredential } from './growth-os.js';

const messages = new Map();
const pollIntervals = new Map();
const messageStorePath = fileURLToPath(new URL('../data/telegram-messages.json', import.meta.url));

function loadMessageStore() {
  try {
    const raw = readFileSync(messageStorePath, 'utf8');
    const data = JSON.parse(raw);

    for (const [connectorId, connectorMessages] of Object.entries(data)) {
      if (Array.isArray(connectorMessages)) {
        messages.set(connectorId, connectorMessages);
      }
    }
  } catch {
    // Missing or invalid local message cache should not block API startup.
  }
}

function saveMessageStore() {
  try {
    mkdirSync(dirname(messageStorePath), { recursive: true });
    writeFileSync(messageStorePath, JSON.stringify(Object.fromEntries(messages), null, 2));
  } catch (error) {
    console.error(`[telegram-gateway] Failed to persist messages: ${error.message}`);
  }
}

loadMessageStore();

function decryptCredentialForGateway(connector) {
  if (!connector || !connector.credentialMeta?.encryptedToken) return null;
  return decryptCredential(connector.credentialMeta.encryptedToken);
}

function getConnectorMessages(connectorId) {
  if (!messages.has(connectorId)) {
    messages.set(connectorId, []);
  }
  return messages.get(connectorId);
}

function addConnectorMessage(connectorId, message) {
  const connectorMessages = getConnectorMessages(connectorId);

  if (message.id && connectorMessages.some((item) => item.id === message.id)) {
    return;
  }

  connectorMessages.push(message);
  saveMessageStore();
}

export function getTelegramMessages(connectorId) {
  return getConnectorMessages(connectorId);
}

export async function sendTelegramMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || 'Failed to send Telegram message');
  }
  return data.result;
}

export async function startTelegramPolling(connector) {
  const connectorId = connector.id;

  if (pollIntervals.has(connectorId)) {
    return;
  }

  const token = decryptCredentialForGateway(connector);
  if (!token) {
    throw new Error('No valid access token found for Telegram connector');
  }

  let lastUpdateId = 0;
  let cancelled = false;

  const poll = async () => {
    if (cancelled) return;
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates`;
      const params = new URLSearchParams({
        offset: String(lastUpdateId + 1),
        timeout: '25',
        allowed_updates: JSON.stringify(['message']),
      });

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (!data.ok) {
        console.error(`[telegram-gateway] Poll error: ${data.description}`);
      } else {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);

          if (update.message) {
            const msg = update.message;
            addConnectorMessage(connectorId, {
              id: `tg_${msg.message_id}`,
              connectorId,
              chatId: String(msg.chat.id),
              from: msg.from?.first_name || msg.from?.username || 'Unknown',
              fromId: String(msg.from?.id || ''),
              text: msg.text || '[non-text message]',
              direction: 'inbound',
              timestamp: new Date(msg.date * 1000).toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error(`[telegram-gateway] Poll failed: ${error.message}`);
    }

    if (!cancelled) {
      setTimeout(poll, 2500);
    }
  };

  pollIntervals.set(connectorId, { cancel: () => { cancelled = true; } });

  // Start first poll immediately, subsequent polls via recursive setTimeout
  poll();

  console.log(`[telegram-gateway] Started polling for ${connector.provider} (${connectorId})`);
}

export function stopTelegramPolling(connectorId) {
  const handle = pollIntervals.get(connectorId);
  if (handle) {
    handle.cancel();
    pollIntervals.delete(connectorId);
    console.log(`[telegram-gateway] Stopped polling for ${connectorId}`);
  }
}

export function isTelegramPolling(connectorId) {
  return pollIntervals.has(connectorId);
}

export function addOutboundMessage(connectorId, message) {
  addConnectorMessage(connectorId, {
    id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    connectorId,
    chatId: message.chatId,
    from: 'PrimeOS',
    fromId: message.chatId,
    text: message.text,
    direction: 'outbound',
    timestamp: new Date().toISOString(),
  });
}
