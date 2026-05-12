import { describe, expect, it } from 'vitest';
import { getPrimeNavPath } from './prime-navigation';

describe('prime navigation utility routes', () => {
  it('provides breadcrumb metadata for the account center without sidebar placement', () => {
    expect(getPrimeNavPath('/account').map((item) => item.label)).toEqual(['Admin Setup']);
  });

  it('resolves Customer Profile sub-floor routes from query state', () => {
    expect(getPrimeNavPath('/customer/crm-compact').map((item) => item.label)).toEqual(['Customer', 'Customer Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?floor=overview').map((item) => item.label)).toEqual(['Customer', 'Customer Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?floor=account').map((item) => item.label)).toEqual(['Customer', 'Customer Profile', 'Account Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?floor=contact').map((item) => item.label)).toEqual(['Customer', 'Customer Profile', 'Account Profile']);
    expect(getPrimeNavPath('/customer/crm-compact?customer=cust_1&floor=tags').map((item) => item.label)).toEqual(['Customer', 'Customer Profile', 'Account Profile']);
  });

  it('resolves Demand V1 hub, sources, and legacy route labels', () => {
    expect(getPrimeNavPath('/demand').map((item) => item.label)).toEqual(['Demand', 'Demand Hub']);
    expect(getPrimeNavPath('/demand/hub').map((item) => item.label)).toEqual(['Demand', 'Demand Hub']);
    expect(getPrimeNavPath('/demand/sources').map((item) => item.label)).toEqual(['Demand', 'Sources']);
    expect(getPrimeNavPath('/demand/acquisition').map((item) => item.label)).toEqual(['Demand', 'Sources']);
    expect(getPrimeNavPath('/demand/campaign-ops').map((item) => item.label)).toEqual(['Demand', 'Campaigns']);
    expect(getPrimeNavPath('/demand/lead-response-capture').map((item) => item.label)).toEqual(['Demand', 'Leads & RFQs']);
  });
});
