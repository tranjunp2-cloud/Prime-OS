import { describe, expect, it } from 'vitest';
import { flattenPrimeProductSettingsItems, primeProductSettingsGroups } from './prime-product-settings-nav';

describe('primeProductSettingsGroups', () => {
  it('keeps all operating areas as product settings groups', () => {
    expect(primeProductSettingsGroups.map((group) => group.id)).toEqual([
      'intelligence',
      'ecom',
      'demand',
      'finance',
      'customer',
    ]);
  });

  it('exposes existing Prime OS route products and floors', () => {
    const items = flattenPrimeProductSettingsItems();
    const ids = new Set(items.map((item) => item.id));

    expect(ids).toContain('product-master');
    expect(ids).toContain('inventory-brain');
    expect(ids).toContain('oms');
    expect(ids).toContain('fulfillment');
    expect(ids).toContain('policy-rule');
    expect(ids).toContain('event-audit');
    expect(ids).toContain('product-operation-agent');
    expect(ids).toContain('product-operation-command');
    expect(ids).toContain('product-operation-kanban');
    expect(ids).toContain('product-operation-agent-queue');
    expect(ids).toContain('product-operation-audit');
    expect(ids).toContain('branding-agent');
    expect(ids).toContain('branding-agent-dashboard');
    expect(ids).toContain('branding-agent-library');
    expect(ids).toContain('branding-agent-create');
    expect(ids).toContain('branding-agent-assets');
    expect(ids).not.toContain('branding-agent-share');
    expect(ids).toContain('consulting-agent');
    expect(ids).toContain('consulting-agent-kpi');
    expect(ids).toContain('consulting-agent-signals');
    expect(ids).toContain('consulting-agent-launch');
    expect(ids).not.toContain('decision-hub');
    expect(ids).not.toContain('signals');
    expect(ids).toContain('mdec');
    expect(ids).toContain('mdec-main');
    expect(ids).toContain('mdec-workflow');
    expect(ids).toContain('mdec-insight');
    expect(ids).toContain('mdec-escalations');
    expect(ids).not.toContain('mdec-settings');
    expect(ids).toContain('campaign-ops');
    expect(ids).toContain('crm-compact');
    expect(ids).toContain('fin-support');
  });

  it('does not create empty navigation targets', () => {
    expect(flattenPrimeProductSettingsItems().every((item) => item.href.startsWith('/'))).toBe(true);
  });
});
