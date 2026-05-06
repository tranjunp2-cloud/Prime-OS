import { describe, expect, it } from 'vitest';
import {
  customerTags,
  detectIdentityMatches,
  filterCustomerAccounts,
  type CustomerAccount,
} from './customer-profile-floor';

function account(overrides: Partial<CustomerAccount>): CustomerAccount {
  return {
    id: 'acct-a',
    accountCode: 'ACC-A',
    companyName: 'Alpha Supply',
    displayName: 'Alpha Supply',
    customerType: 'b2b',
    lifecycle: 'active',
    status: 'active',
    ownerId: 'owner-a',
    tags: [],
    primaryEmail: 'owner@alpha.example',
    website: 'https://alpha.example',
    industry: 'Office supplies',
    country: 'Japan',
    source: 'Test',
    revenue: 0,
    orderCount: 0,
    identityCompleteness: 80,
    notes: [],
    ...overrides,
  };
}

describe('customer profile floor helpers', () => {
  it('exposes marketplace buyer as the unified consumer segment tag', () => {
    expect(customerTags.some((tag) => tag.id === 'tag-marketplace-buyer' && tag.label === 'Marketplace buyer')).toBe(true);
    expect(customerTags.some((tag) => tag.id === 'tag-b2c')).toBe(false);
  });

  it('does not flag blank websites or public email domains as account duplicates', () => {
    const matches = detectIdentityMatches([
      account({ id: 'acct-a', companyName: 'Alpha Supply', primaryEmail: 'owner@gmail.com', website: '' }),
      account({ id: 'acct-b', companyName: 'Beta Trading', primaryEmail: 'buyer@gmail.com', website: '' }),
    ], []);

    expect(matches).toEqual([]);
  });

  it('flags account duplicates when company and owned domains match', () => {
    const matches = detectIdentityMatches([
      account({ id: 'acct-a', companyName: 'Kansai Office Supply', primaryEmail: 'owner@kansai.example', website: 'https://kansai.example' }),
      account({ id: 'acct-b', companyName: 'Kansai Office Supply Co.', primaryEmail: 'ops@kansai.example', website: 'https://www.kansai.example/team' }),
    ], []);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ entityType: 'account', suggestion: 'possible_merge' });
  });

  it('filters accounts by query and customer type', () => {
    const filtered = filterCustomerAccounts([
      account({ id: 'acct-a', companyName: 'Alpha Supply', customerType: 'b2b' }),
      account({ id: 'acct-b', companyName: 'Beta Studio', customerType: 'creator' }),
    ], customerTags, {
      query: 'studio',
      tagId: 'all',
      ownerId: 'all',
      lifecycle: 'all',
      customerType: 'creator',
    });

    expect(filtered.map((item) => item.id)).toEqual(['acct-b']);
  });
});
