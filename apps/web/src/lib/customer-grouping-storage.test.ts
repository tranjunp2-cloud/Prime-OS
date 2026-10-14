// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { customerGroupingKey, readCustomerGroups, saveCustomerGroups } from './customer-grouping-storage';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('prototype customer grouping preferences', () => {
  it('isolates workspaces/accounts and persists only order IDs and group tokens', () => {
    saveCustomerGroups('workspace-a:user-a', { order1: 'group1' });
    expect(readCustomerGroups('workspace-a:user-a').groups).toEqual({ order1: 'group1' });
    expect(readCustomerGroups('workspace-b:user-a').groups).toEqual({});
    expect(readCustomerGroups('workspace-a:user-b').groups).toEqual({});
  });
  it('reports malformed or blocked storage instead of overwriting preferences silently', () => {
    localStorage.setItem(customerGroupingKey('scope'), '[1]');
    expect(readCustomerGroups('scope').error).toBeTruthy();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(() => saveCustomerGroups('scope', {})).toThrow();
  });
});
