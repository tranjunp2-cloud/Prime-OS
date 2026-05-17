import type { PrimeTowerId } from '@/lib/prime/prime-data';

export const demandTowerIds: PrimeTowerId[] = ['campaign-ops', 'content-creator-ops', 'lead-response-capture', 'retargeting-outreach'];
export const intelligenceTowerIds: PrimeTowerId[] = ['decision-hub', 'signals', 'creators', 'customers', 'campaigns', 'analytics', 'attribution', 'forecasting', 'ai-operator', 'voc', 'alerts'];
export const financeTowerIds: PrimeTowerId[] = ['offers', 'risk', 'settlement'];

export const DEMAND_CAMPAIGNS_HREF = '/demand/campaigns';
export const DEMAND_CONTENT_SOCIAL_HREF = '/demand/content-social';
export const DEMAND_LEADS_RFQS_HREF = '/demand/leads-rfqs';
export const DEMAND_REENGAGE_HREF = '/demand/re-engage';

export type TowerJob = { decide: string; handoff: string; handoffHref: string };
