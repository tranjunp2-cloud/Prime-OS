import { afterEach, expect, it, vi } from 'vitest';
import { allocateReservation, clearReservationStore, confirmReservation, createReservation, getActiveReservations, releaseExpiredReservations } from './reservation-store';
afterEach(() => { clearReservationStore(); vi.useRealTimers(); });
it('expires unpaid checkout holds without expiring paid or allocated order stock', () => {
  vi.useFakeTimers();
  const make = (key: string) => createReservation({ order_ref: key, sku_id: key, warehouse_id: 'wh_crjp', qty: 1, source: 'AMAZON', idempotency_key: key, ttl_minutes: 1 })!;
  const unpaid = make('unpaid');
  const paid = make('paid');
  const allocated = make('allocated');
  confirmReservation(paid.id);
  confirmReservation(allocated.id);
  allocateReservation(allocated.id);
  vi.advanceTimersByTime(61_000);
  expect(getActiveReservations().map(item => item.id)).toEqual([paid.id, allocated.id]);
  expect(getActiveReservations().some(item => item.id === unpaid.id)).toBe(false);
  expect(releaseExpiredReservations()).toBe(1);
});
