import { demoOrders } from '../../../../packages/order-workflow/demo-orders.js';
import { validateManualOrder } from '../../../../packages/order-workflow/manual-order.js';
import { restoreOrderPrototype } from './order-prototype';
import type { ManualOrderInput, OrderRecord } from './orders-api';
import { posDemoOrders } from '@/features/primepos/order-adapter';

// Separate from API records. Existing per-order prototype progress keeps its original key.
const createdKey = 'prime.order-prototype.created.v1';
let memory: OrderRecord[] = [];
function createdOrders(): OrderRecord[] {
  try {
    const saved = sessionStorage.getItem(createdKey);
    return saved ? JSON.parse(saved) : memory;
  } catch { return memory; }
}

export function listPrototypeOrders(): OrderRecord[] {
  return [...posDemoOrders(), ...createdOrders(), ...demoOrders() as OrderRecord[]].map(restoreOrderPrototype);
}

export function createPrototypeOrder(input: ManualOrderInput): OrderRecord {
  const validated = validateManualOrder(input);
  if (!input.requestKey?.trim()) throw new Error('Request key is required.');
  const existing = listPrototypeOrders().find(order => order.orderKey === validated.orderKey);
  if (existing) {
    if (existing.requestKey === input.requestKey) return existing;
    throw new Error('Order reference already exists.');
  }
  const now = new Date().toISOString();
  const order: OrderRecord = {
    ...validated, id: `prototype-${crypto.randomUUID()}`, requestKey: input.requestKey,
    source: 'demo', version: 1, orderedAt: now,
    transitions: [], shipments: [], returnRequests: [], exceptions: [],
    activity: [{id: crypto.randomUUID(), at: now, actor: 'Prototype', message: validated.canonicalStatus === 'draft' ? 'Draft saved locally (simulated)' : 'Manual order created locally (simulated)'}],
  };
  memory = [order, ...createdOrders()];
  try { sessionStorage.setItem(createdKey, JSON.stringify(memory)); } catch { /* Keep the prototype usable in memory if storage is unavailable. */ }
  return order;
}
