// Reservation Store — singleton in-memory ledger for livestream anti-oversell
// Implements: TTL-based holding, idempotency, state transitions
// Based on deep-research-livestreamPrimeOS.md recommendations

export type ReservationSource = 'LIVESTREAM_TIKTOK' | 'LIVESTREAM_FB' | 'LAZADA' | 'SHOPEE' | 'CHECKOUT' | 'MANUAL';
export type ReservationState = 'RESERVED_UNPAID' | 'RESERVED_PAID' | 'ALLOCATED' | 'RELEASED_TIMEOUT' | 'RELEASED_CANCEL';

export interface Reservation {
  id: string;
  order_ref: string;
  sku_id: string;
  warehouse_id: string;
  qty: number;
  state: ReservationState;
  expires_at: string;
  source: ReservationSource;
  idempotency_key: string;
  created_at: string;
  released_at?: string;
}

const TTL_BY_SOURCE: Record<ReservationSource, number> = {
  LIVESTREAM_TIKTOK: 30,
  LIVESTREAM_FB: 10,
  LAZADA: 30,
  SHOPEE: 20,
  CHECKOUT: 15,
  MANUAL: 20,
};

let _reservations: Reservation[] = [];
let _idempotencyLog = new Set<string>();

function genId(): string {
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getReservations(): Reservation[] {
  return _reservations;
}

export function getReservationsByOrder(orderRef: string): Reservation[] {
  return _reservations.filter(r => r.order_ref === orderRef);
}

export function getReservationsBySku(skuId: string): Reservation[] {
  return _reservations.filter(r => r.sku_id === skuId);
}

export function getActiveReservations(): Reservation[] {
  const now = new Date().toISOString();
  return _reservations.filter(r =>
    (r.state === 'RESERVED_UNPAID' || r.state === 'RESERVED_PAID' || r.state === 'ALLOCATED')
    && r.expires_at > now
  );
}

export function getExpiredReservations(): Reservation[] {
  const now = new Date().toISOString();
  return _reservations.filter(r =>
    r.state === 'RESERVED_UNPAID' && r.expires_at <= now
  );
}

export function getReservationCounts(): Record<string, number> {
  return {
    all: _reservations.length,
    active: getActiveReservations().length,
    reserved_unpaid: _reservations.filter(r => r.state === 'RESERVED_UNPAID').length,
    reserved_paid: _reservations.filter(r => r.state === 'RESERVED_PAID').length,
    allocated: _reservations.filter(r => r.state === 'ALLOCATED').length,
    released_timeout: _reservations.filter(r => r.state === 'RELEASED_TIMEOUT').length,
    released_cancel: _reservations.filter(r => r.state === 'RELEASED_CANCEL').length,
  };
}

function isIdempotent(idempotencyKey: string): boolean {
  if (_idempotencyLog.has(idempotencyKey)) return true;
  _idempotencyLog.add(idempotencyKey);
  return false;
}

export function createReservation(params: {
  order_ref: string;
  sku_id: string;
  warehouse_id: string;
  qty: number;
  source: ReservationSource;
  idempotency_key: string;
  ttl_minutes?: number;
}): Reservation | null {
  if (isIdempotent(params.idempotency_key)) {
    const existing = _reservations.find(r => r.idempotency_key === params.idempotency_key);
    return existing || null;
  }

  const ttl = params.ttl_minutes ?? TTL_BY_SOURCE[params.source];
  const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();

  const reservation: Reservation = {
    id: genId(),
    order_ref: params.order_ref,
    sku_id: params.sku_id,
    warehouse_id: params.warehouse_id,
    qty: params.qty,
    state: 'RESERVED_UNPAID',
    expires_at: expiresAt,
    source: params.source,
    idempotency_key: params.idempotency_key,
    created_at: new Date().toISOString(),
  };

  _reservations = [..._reservations, reservation];
  return reservation;
}

export function confirmReservation(reservationId: string): Reservation | null {
  const index = _reservations.findIndex(r => r.id === reservationId);
  if (index === -1 || _reservations[index].state !== 'RESERVED_UNPAID') return null;

  const updated = [..._reservations];
  updated[index] = { ...updated[index], state: 'RESERVED_PAID' };
  _reservations = updated;
  return updated[index];
}

export function allocateReservation(reservationId: string): Reservation | null {
  const index = _reservations.findIndex(r => r.id === reservationId);
  if (index === -1 || _reservations[index].state !== 'RESERVED_PAID') return null;

  const updated = [..._reservations];
  updated[index] = { ...updated[index], state: 'ALLOCATED' };
  _reservations = updated;
  return updated[index];
}

export function releaseReservation(reservationId: string, reason: 'timeout' | 'cancel' = 'timeout'): Reservation | null {
  const index = _reservations.findIndex(r => r.id === reservationId);
  if (index === -1) return null;

  const state = reason === 'timeout' ? 'RELEASED_TIMEOUT' : 'RELEASED_CANCEL';
  const updated = [..._reservations];
  updated[index] = {
    ...updated[index],
    state,
    released_at: new Date().toISOString(),
  };
  _reservations = updated;
  return updated[index];
}

export function releaseExpiredReservations(): number {
  const expired = getExpiredReservations();
  let count = 0;
  for (const r of expired) {
    releaseReservation(r.id, 'timeout');
    count++;
  }
  return count;
}

export function clearReservationStore(): void {
  _reservations = [];
  _idempotencyLog = new Set();
}
