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

  it('resolves Consulting Agent and legacy Intelligence routes', () => {
    expect(getPrimeNavPath('/intelligence/product-operation-agent').map((item) => item.label)).toEqual(['Intelligence', 'Operation Agent']);
    expect(getPrimeNavPath('/intelligence/product-operation-agent?view=command').map((item) => item.label)).toEqual(['Intelligence', 'Operation Agent', 'Command Center']);
    expect(getPrimeNavPath('/intelligence/product-operation-agent?view=kanban').map((item) => item.label)).toEqual(['Intelligence', 'Operation Agent', 'Operating Kanban']);
    expect(getPrimeNavPath('/intelligence/product-operation-agent?view=queue').map((item) => item.label)).toEqual(['Intelligence', 'Operation Agent', 'Agent Queue']);
    expect(getPrimeNavPath('/intelligence/product-operation-agent?view=audit').map((item) => item.label)).toEqual(['Intelligence', 'Operation Agent', 'Audit']);
    expect(getPrimeNavPath('/intelligence/branding-agent').map((item) => item.label)).toEqual(['Intelligence', 'Branding Agent', 'Dashboard']);
    expect(getPrimeNavPath('/intelligence/branding-agent/create').map((item) => item.label)).toEqual(['Intelligence', 'Branding Agent', 'Create New']);
    expect(getPrimeNavPath('/intelligence/branding-agent/library').map((item) => item.label)).toEqual(['Intelligence', 'Branding Agent', 'Brand Library']);
    expect(getPrimeNavPath('/intelligence/branding-agent/integrations').map((item) => item.label)).toEqual(['Intelligence', 'Branding Agent', 'My Assets']);
    expect(getPrimeNavPath('/intelligence/branding-agent/venus-beauty/review').map((item) => item.label)).toEqual(['Intelligence', 'Branding Agent', 'My Assets']);
    expect(getPrimeNavPath('/intelligence/consulting-agent').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent']);
    expect(getPrimeNavPath('/intelligence/consulting-agent?tab=kpi').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent', 'KPI Dashboard']);
    expect(getPrimeNavPath('/intelligence/consulting-agent?tab=signals').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent', 'Signals Board']);
    expect(getPrimeNavPath('/intelligence/consulting-agent?tab=launch').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent', 'Launch Decisions']);
    expect(getPrimeNavPath('/intelligence/decision-hub').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent']);
    expect(getPrimeNavPath('/intelligence/signals').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent']);
    expect(getPrimeNavPath('/intelligence/launch-decisions').map((item) => item.label)).toEqual(['Intelligence', 'Consulting Agent']);
  });

  it('resolves Demand V1 hub, sources, and legacy route labels', () => {
    expect(getPrimeNavPath('/demand').map((item) => item.label)).toEqual(['Demand', 'Demand Dashboard']);
    expect(getPrimeNavPath('/demand/hub').map((item) => item.label)).toEqual(['Demand', 'Demand Dashboard']);
    expect(getPrimeNavPath('/demand/mdec').map((item) => item.label)).toEqual(['Demand', 'MDEC']);
    expect(getPrimeNavPath('/demand/mdec?view=escalations').map((item) => item.label)).toEqual(['Demand', 'MDEC', 'Workflow', 'Escalations']);
    expect(getPrimeNavPath('/demand/sources').map((item) => item.label)).toEqual(['Demand', 'Sources']);
    expect(getPrimeNavPath('/demand/acquisition').map((item) => item.label)).toEqual(['Demand', 'Sources']);
    expect(getPrimeNavPath('/demand/campaign-ops').map((item) => item.label)).toEqual(['Demand', 'Campaigns']);
    expect(getPrimeNavPath('/demand/campaigns?tab=overview').map((item) => item.label)).toEqual(['Demand', 'Campaigns', 'Overview']);
    expect(getPrimeNavPath('/demand/campaigns?tab=pipeline').map((item) => item.label)).toEqual(['Demand', 'Campaigns', 'Pipeline']);
    expect(getPrimeNavPath('/demand/campaigns?tab=planner').map((item) => item.label)).toEqual(['Demand', 'Campaigns', 'Planner']);
    expect(getPrimeNavPath('/demand/campaigns?tab=readiness').map((item) => item.label)).toEqual(['Demand', 'Campaigns', 'Readiness']);
    expect(getPrimeNavPath('/demand/campaigns?tab=execution-queue').map((item) => item.label)).toEqual(['Demand', 'Campaigns', 'Execution Queue']);
    expect(getPrimeNavPath('/demand/campaigns?tab=results').map((item) => item.label)).toEqual(['Demand', 'Campaigns', 'Results']);
    expect(getPrimeNavPath('/demand/lead-response-capture').map((item) => item.label)).toEqual(['Demand', 'Leads & RFQs']);
  });
});
