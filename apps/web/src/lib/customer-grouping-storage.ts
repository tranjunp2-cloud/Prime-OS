import type { CustomerGroups } from './order-customers';

export const customerGroupingKey = (scope: string) => `prime.customer-groups.v1:${encodeURIComponent(scope)}`;

export function readCustomerGroups(scope: string): { groups: CustomerGroups; error?: string } {
  try {
    const groups: unknown = JSON.parse(localStorage.getItem(customerGroupingKey(scope)) || '{}');
    if (!groups || typeof groups !== 'object' || Array.isArray(groups) || Object.values(groups).some(value => typeof value !== 'string' || !value)) throw new Error('Invalid groups');
    return { groups: Object.fromEntries(Object.entries(groups)) };
  } catch {
    return { groups: {}, error: 'Saved profile separations could not be loaded. Only automatic phone grouping is shown; changes are disabled to protect saved separations.' };
  }
}

export function saveCustomerGroups(scope: string, groups: CustomerGroups) {
  // IDs only: do not store customer names, phone numbers or entire orders here.
  localStorage.setItem(customerGroupingKey(scope), JSON.stringify(groups));
}
