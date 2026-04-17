// SLA Policy types

export interface SlaPolicy {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  tier_default_days: number;       // Default ship deadline in days
  overrides: SlaOverrides;
  created_at?: string;
  updated_at?: string;
}

export interface SlaOverrides {
  channel?: Record<string, number>;   // e.g. { rakuten: 2, shopee: 3 }
  priority?: Record<string, number>;  // e.g. { express: 1, critical: 0 }
}

export const CHANNEL_SLA_OPTIONS = [
  { value: 'rakuten', label: 'Rakuten' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'manual', label: 'Manual' },
] as const;

export const PRIORITY_SLA_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'express', label: 'Express' },
  { value: 'standard', label: 'Standard' },
] as const;

export function createDefaultPolicy(): Partial<SlaPolicy> {
  return {
    name: '',
    description: '',
    is_active: true,
    tier_default_days: 3,
    overrides: {
      channel: {},
      priority: {},
    },
  };
}

export function getEffectiveSlaDays(policy: SlaPolicy, channel: string, priority: string): number {
  if (policy.overrides.channel?.[channel] !== undefined) {
    return policy.overrides.channel[channel];
  }
  if (policy.overrides.priority?.[priority] !== undefined) {
    return policy.overrides.priority[priority];
  }
  return policy.tier_default_days;
}

export function isSlaBreached(deadline: Date | string | null): boolean {
  if (!deadline) return false;
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  return d < new Date();
}

export function isSlaAtRisk(deadline: Date | string | null, atRiskHours = 2): boolean {
  if (!deadline) return false;
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= atRiskHours;
}
