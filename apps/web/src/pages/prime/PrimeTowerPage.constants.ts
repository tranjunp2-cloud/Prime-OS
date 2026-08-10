import type { PrimeTowerId } from '@/lib/prime/prime-data';

export const crmTowerIds: PrimeTowerId[] = ['campaign-ops', 'content-creator-ops', 'lead-response-capture', 'retargeting-outreach'];
export const intelligenceTowerIds: PrimeTowerId[] = ['decision-hub', 'signals', 'creators', 'customers', 'campaigns', 'analytics', 'attribution', 'forecasting', 'ai-operator', 'voc', 'alerts'];
export const financeTowerIds: PrimeTowerId[] = ['offers', 'risk', 'settlement'];

export const CRM_CAMPAIGNS_HREF = '/crm/campaigns';
export const CRM_CONTENT_SOCIAL_HREF = '/crm/content-social';
export const CRM_LEADS_RFQS_HREF = '/crm/leads-rfqs';
export const CRM_REENGAGE_HREF = '/crm/re-engage';
export const INTELLIGENCE_DECISIONS_HREF = '/intelligence/launch-decisions';

export type TowerJob = { decide: string; handoff: string; handoffHref: string };
