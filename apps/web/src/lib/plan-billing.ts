export type PlanId = 'freemium' | 'starter' | 'standard' | 'pro';
export type BillingRequestType = 'Upgrade' | 'Downgrade' | 'Terminate';
export type BillingRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Failed' | 'Cancelled';

export type BillingPlan = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  highlights: string[];
};

export type BillingRequest = {
  id: string;
  planId: PlanId;
  type: BillingRequestType;
  status: BillingRequestStatus;
  requestedAt: string;
  effectiveAt: string;
};

export type FeatureGroup = { name: string; features: Array<{ name: string; values: Record<PlanId, boolean | string>; badge?: 'New' | 'Coming soon' }> };

export const billingPlans: BillingPlan[] = [
  { id: 'freemium', name: 'Freemium', monthlyPrice: 0, description: 'Start selling with the essentials at no cost.', highlights: ['1 sales channel', '100 orders / month', 'Product and customer management', 'Basic analytics'] },
  { id: 'starter', name: 'Starter', monthlyPrice: 990000, description: 'For new commerce teams building repeatable operations.', highlights: ['3 sales channels', '900 orders / month', 'Social CRM or Web Store', 'Delivery integrations'] },
  { id: 'standard', name: 'Standard', monthlyPrice: 2490000, description: 'Scale multi-channel sales with more capacity and control.', highlights: ['5 sales channels', '1,500 orders / month', 'Web Store and Social CRM', 'Promotion management'] },
  { id: 'pro', name: 'Pro', monthlyPrice: 5490000, description: 'Advanced automation and unlimited volume for growing brands.', highlights: ['10 sales channels', 'Unlimited orders', 'Advanced analytics', 'Point of Sale'] },
];

const all = { freemium: true, starter: true, standard: true, pro: true } as const;
const paid = { freemium: false, starter: true, standard: true, pro: true } as const;
const standard = { freemium: false, starter: false, standard: true, pro: true } as const;

export const featureGroups: FeatureGroup[] = [
  { name: 'Sales channels', features: [
    { name: 'Lazada and Shopee', values: all },
    { name: 'Web Store and Social CRM', values: paid },
    { name: 'TikTok Shop', badge: 'New', values: all },
    { name: 'Point of Sale', values: { freemium: false, starter: false, standard: false, pro: true } },
  ] },
  { name: 'Product & SKU management', features: [
    { name: 'Publish products to sales channels', values: all },
    { name: 'Edit, filter and segment products', values: all },
    { name: 'Unlimited products', values: all },
  ] },
  { name: 'Order management', features: [
    { name: 'Orders processed monthly', values: { freemium: '100', starter: '900', standard: '1,500', pro: 'Unlimited' } },
    { name: 'Delivery status and waybills', badge: 'New', values: all },
    { name: 'Automatic order-status email', values: paid },
  ] },
  { name: 'Customer & promotion management', features: [
    { name: 'Unified customer profiles and segments', values: all },
    { name: 'Purchase history and behaviour', values: all },
    { name: 'Promotion codes and validation', values: paid },
  ] },
  { name: 'Analytics & conversations', features: [
    { name: 'Product, order and customer metrics', values: all },
    { name: 'Revenue metrics', values: { freemium: false, starter: false, standard: false, pro: true } },
    { name: 'Social response templates and tags', values: paid },
    { name: 'Create orders from social media', badge: 'New', values: { freemium: false, starter: false, standard: false, pro: true } },
  ] },
  { name: 'Website, delivery & payments', features: [
    { name: 'Domain, SEO and analytics tracking', values: paid },
    { name: 'Shipping providers and self-delivery fees', values: paid },
    { name: 'Billplz and Stripe', values: paid },
    { name: 'FPX', badge: 'Coming soon', values: standard },
  ] },
];

export const seedBillingRequests: BillingRequest[] = [
  { id: 'UP20260818001', planId: 'pro', type: 'Upgrade', status: 'Approved', requestedAt: '2026-08-18T09:15:00+07:00', effectiveAt: '2026-08-18T09:15:00+07:00' },
  { id: 'RN20260701002', planId: 'standard', type: 'Downgrade', status: 'Rejected', requestedAt: '2026-07-01T14:30:00+07:00', effectiveAt: '2026-08-01T00:00:00+07:00' },
  { id: 'UP20260612003', planId: 'standard', type: 'Upgrade', status: 'Approved', requestedAt: '2026-06-12T10:05:00+07:00', effectiveAt: '2026-06-12T10:05:00+07:00' },
];

export function formatVnd(value: number) {
  if (!value) return 'Free';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

export function planById(id: PlanId) { return billingPlans.find((plan) => plan.id === id)!; }
