const subscribers = new Map();

export function on(eventName, handler) {
  if (!subscribers.has(eventName)) {
    subscribers.set(eventName, new Set());
  }
  subscribers.get(eventName).add(handler);
  return () => subscribers.get(eventName)?.delete(handler);
}

export function off(eventName, handler) {
  subscribers.get(eventName)?.delete(handler);
}

export function emit(eventName, payload) {
  const handlers = subscribers.get(eventName);
  if (!handlers || handlers.size === 0) return 0;

  let dispatched = 0;
  for (const handler of handlers) {
    try {
      handler(payload);
      dispatched += 1;
    } catch (err) {
      console.error(`[event-bus] Handler error for "${eventName}": ${err.message}`);
    }
  }
  return dispatched;
}

export async function emitAsync(eventName, payload) {
  const handlers = subscribers.get(eventName);
  if (!handlers || handlers.size === 0) return 0;

  let dispatched = 0;
  const promises = [];
  for (const handler of handlers) {
    promises.push(
      (async () => {
        try {
          await handler(payload);
          dispatched += 1;
        } catch (err) {
          console.error(`[event-bus] Async handler error for "${eventName}": ${err.message}`);
        }
      })(),
    );
  }
  await Promise.allSettled(promises);
  return dispatched;
}

export function subscriberCount(eventName) {
  return subscribers.get(eventName)?.size || 0;
}

export function clearAll() {
  subscribers.clear();
}
