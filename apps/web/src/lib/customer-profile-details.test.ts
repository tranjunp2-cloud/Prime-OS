// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoOrders } from '../../../../packages/order-workflow/demo-orders.js';
import type { OrderRecord } from './orders-api';
import { buildOrderCustomers, separateCustomerOrders } from './order-customers';
import { customerDateTime, customerOrderStats, customerProfileIdentity, customerProfileKey, customerRelativeTime, customerUpdatedAt, readCustomerProfile, saveCustomerProfile } from './customer-profile-details';

const sample = demoOrders()[0] as OrderRecord;
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('customer profile details', () => {
  it('uses the latest real order/profile timestamp and formats compact relative time', () => {
    const latest = '2026-10-13T10:00:00Z';
    expect(customerUpdatedAt('2026-10-11T00:00:00Z', latest, 'bad date')).toBe(latest);
    expect(customerUpdatedAt(latest, '2026-10-11T00:00:00Z')).toBe(latest);
    expect(customerUpdatedAt('', 'bad date')).toBe('');
    const now = Date.parse(latest);
    for (const [seconds, label] of [[0, 'just now'], [59, 'just now'], [60, '1m ago'], [3600, '1h ago'], [172800, '2d ago'], [7776000, '3mo ago'], [31536000, '1y ago']] as const) {
      expect(customerRelativeTime(new Date(now - seconds * 1000).toISOString(), now)).toBe(label);
    }
    expect(customerRelativeTime('bad date', now)).toBe('Not available');
    const future = '2026-10-14T00:00:00Z';
    expect(customerRelativeTime(future, now)).toBe(customerDateTime(future));
  });
  it('saves only editable fields with workspace/account isolation and revision checking', () => {
    const value = saveCustomerProfile('workspace/user1', 'customer-a', { displayName: '  Demo name  ', notes: 'Demo note' }, 0);
    expect(value.displayName).toBe('Demo name');
    expect(readCustomerProfile('workspace/user1', 'customer-a').value).toEqual(value);
    expect(readCustomerProfile('workspace/user2', 'customer-a').value.revision).toBe(0);
    expect(readCustomerProfile('workspace/user1', 'customer-b').value.revision).toBe(0);
    expect(() => saveCustomerProfile('workspace/user1', 'customer-a', { displayName: 'Changed', notes: '' }, 0)).toThrow('another tab');
    expect(localStorage.getItem(customerProfileKey('workspace/user1', 'customer-a'))).not.toContain('phone');
  });
  it('rejects invalid input and corrupted/unavailable storage without overwriting existing data', () => {
    expect(() => saveCustomerProfile('s', 'a', { displayName: '   ', notes: '' }, 0)).toThrow('1–100');
    expect(() => saveCustomerProfile('s', 'a', { displayName: 'Name', notes: 'x'.repeat(2001) }, 0)).toThrow('2,000');
    localStorage.setItem(customerProfileKey('s', 'a'), '{broken');
    expect(readCustomerProfile('s', 'a').error).toBeTruthy();
    expect(() => saveCustomerProfile('s', 'a', { displayName: 'Name', notes: '' }, 0)).toThrow('protect');
    expect(localStorage.getItem(customerProfileKey('s', 'a'))).toBe('{broken');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota'); });
    expect(() => saveCustomerProfile('s', 'b', { displayName: 'Name', notes: '' }, 0)).toThrow('Nothing was changed');
  });
  it('does not transfer shared profile notes to either separated profile', () => {
    const records = [{ ...sample, id: 'a' }, { ...sample, id: 'b' }];
    const customer = buildOrderCustomers(records)[0];
    const identity = customerProfileIdentity(customer, {});
    saveCustomerProfile('s', identity, { displayName: 'Shared profile', notes: 'Do not copy to split person' }, 0);
    const groups = separateCustomerOrders(customer, ['a'], {});
    for (const profile of buildOrderCustomers(records, groups)) {
      const splitIdentity = customerProfileIdentity(profile, groups);
      expect(splitIdentity).not.toBe(identity);
      expect(readCustomerProfile('s', splitIdentity).value.notes).toBe('');
    }
    expect(readCustomerProfile('s', identity).value.notes).toBe('Do not copy to split person');
  });
  it('calculates completed/cancelled rates and real order timestamps without confusing delivery failures', () => {
    const customer = buildOrderCustomers([
      { ...sample, id: 'a', canonicalStatus: 'closed', orderedAt: '2026-10-01T00:00:00Z', activity: [{ id: 'event', at: '2026-10-09T00:00:00Z', message: 'Paid', actor: 'Demo' }], transitions: [] },
      { ...sample, id: 'b', canonicalStatus: 'canceled', orderedAt: '2026-10-02T00:00:00Z', activity: [], transitions: [] },
      { ...sample, id: 'c', canonicalStatus: 'shipped', orderedAt: '2026-10-03T00:00:00Z', activity: [], transitions: [] },
      { ...sample, id: 'draft', canonicalStatus: 'draft' },
    ])[0];
    expect(customerOrderStats(customer)).toEqual({ count: 3, completed: 1, cancelled: 1, completedRate: 33, cancelledRate: 33, oldest: '2026-10-01T00:00:00Z', latest: '2026-10-03T00:00:00Z', lastActivity: '2026-10-09T00:00:00Z' });
    expect(customerDateTime('bad date')).toBe('Not available');
    expect(customerOrderStats({ ...customer, orders: [] }).completedRate).toBe(0);
  });
});
