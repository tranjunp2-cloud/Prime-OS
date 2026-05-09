import { describe, expect, it } from 'vitest';
import { getPrimeNavPath } from './prime-navigation';

describe('prime navigation utility routes', () => {
  it('provides breadcrumb metadata for the account center without sidebar placement', () => {
    expect(getPrimeNavPath('/account').map((item) => item.label)).toEqual(['Platform Admin']);
  });

  it('resolves Customer Profile sub-floor routes from query state', () => {
    expect(getPrimeNavPath('/customer/crm-compact').map((item) => item.label)).toEqual(['Customer', 'Customer Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?floor=overview').map((item) => item.label)).toEqual(['Customer', 'Customer Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?floor=account').map((item) => item.label)).toEqual(['Customer', 'Customer Profile', 'Account Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?floor=contact').map((item) => item.label)).toEqual(['Customer', 'Customer Profile', 'Account Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?customer=cust_1&floor=tags').map((item) => item.label)).toEqual(['Customer', 'Customer Profile', 'Account Profile']);
  });
});
