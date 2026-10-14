import type { OrderCustomer } from './order-customers';
import { customerMoney } from './order-customers';
import type { OrderRecord } from './orders-api';

export const rankKeys = ['unranked', 'bronze', 'silver', 'gold', 'vip'] as const;
export type RankKey = typeof rankKeys[number];
export type RankState = RankKey | 'not_configured';
export const rankLabels: Record<RankState, string> = { not_configured: 'Not configured', unranked: 'Unranked', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', vip: 'VIP' };
export interface RankConfig { enabled: boolean; currency: 'VND'; silver: number; gold: number; vip: number }
export const defaultRankConfig: RankConfig = { enabled: true, currency: 'VND', silver: 1000000, gold: 5000000, vip: 10000000 };
export const rankCalculationDescription = 'Completed, paid orders only. Merchandise after discounts and merchandise refunds; shipping and tax excluded. Lifetime, across all channels in this workspace.';

export function rankConfigErrors(config: RankConfig): Partial<Record<'silver' | 'gold' | 'vip', string>> {
  const errors: Partial<Record<'silver' | 'gold' | 'vip', string>> = {};
  for (const key of ['silver', 'gold', 'vip'] as const) {
    if (!Number.isSafeInteger(config[key]) || config[key] <= 0 || config[key] > 1e12) errors[key] = 'Enter a whole VND amount between 1 and 1,000,000,000,000.';
  }
  if (!errors.gold && config.gold <= config.silver) errors.gold = 'Gold must be higher than Silver.';
  if (!errors.vip && config.vip <= config.gold) errors.vip = 'VIP must be higher than Gold.';
  return errors;
}

export function isRankConfig(value: unknown): value is RankConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as RankConfig;
  return typeof candidate.enabled === 'boolean' && candidate.currency === 'VND' && !Object.keys(rankConfigErrors(candidate)).length;
}

export interface RankResult {
  key: RankState;
  amount: number;
  currency: string;
  qualifyingOrders: number;
  excluded: { orderId: string; reason: string }[];
  next?: { key: RankKey; remaining: number };
}

function eligibleOrder(order: OrderRecord, currency: string): { amount: number; reason?: string } {
  const payment = order.payment.state.trim().toLowerCase();
  if (order.canonicalStatus !== 'closed' || !['paid', 'partially refunded'].includes(payment)) return { amount: 0 };
  if (order.currencyCode !== currency) return { amount: 0, reason: `Currency ${order.currencyCode || 'unknown'} needs conversion to ${currency}.` };
  // A partial refund without an explicit merchandise amount cannot safely be estimated.
  const refund = order.payment.refundedMerchandiseAmount;
  if ((payment === 'partially refunded' || order.returnRequests.some(item => ['refunded', 'closed'].includes(item.status))) && refund === undefined) return { amount: 0, reason: 'Merchandise refund amount is missing.' };
  const subtotal = order.totals.subtotal;
  const discount = order.totals.discount;
  if (subtotal === undefined || discount === undefined || !Number.isFinite(subtotal) || !Number.isFinite(discount) || subtotal < 0 || discount < 0 || discount > subtotal) return { amount: 0, reason: 'Merchandise subtotal or discount is missing or invalid.' };
  if (refund !== undefined && (!Number.isFinite(refund) || refund < 0 || refund > subtotal - discount)) return { amount: 0, reason: 'Merchandise refund amount is invalid.' };
  return { amount: Math.round(subtotal - discount - (refund || 0)) };
}

export function customerRank(customer: Pick<OrderCustomer, 'orders'>, config: RankConfig | null): RankResult {
  const result: RankResult = { key: 'not_configured', amount: 0, currency: config?.currency || 'VND', qualifyingOrders: 0, excluded: [] };
  if (!config?.enabled) return result;
  for (const order of new Map(customer.orders.map(item => [item.id, item])).values()) {
    const eligible = eligibleOrder(order, config.currency);
    if (eligible.reason) result.excluded.push({ orderId: order.id, reason: eligible.reason });
    result.amount += eligible.amount;
    if (eligible.amount > 0) result.qualifyingOrders++;
  }
  const amount = result.amount;
  result.key = amount >= config.vip ? 'vip' : amount >= config.gold ? 'gold' : amount >= config.silver ? 'silver' : amount > 0 ? 'bronze' : 'unranked';
  if (result.key !== 'vip') {
    const next = result.key === 'unranked' ? 'bronze' : result.key === 'bronze' ? 'silver' : result.key === 'silver' ? 'gold' : 'vip';
    result.next = { key: next, remaining: next === 'bronze' ? 1 : config[next] - amount };
  }
  return result;
}

export function rankSummary(result: RankResult) {
  if (result.key === 'not_configured') return 'Set up automatic ranking in Rank settings.';
  if (result.key === 'unranked') return `No qualifying spend yet. Completed, paid purchases earn a rank; pending, cancelled and fully refunded orders do not.${result.excluded.length ? ` ${result.excluded.length} order(s) need data review.` : ''}`;
  const next = result.next ? `${customerMoney(result.next.remaining, result.currency)} to ${rankLabels[result.next.key]}.` : 'Highest rank reached.';
  return `${customerMoney(result.amount, result.currency)} qualifying spend. ${next}${result.excluded.length ? ` ${result.excluded.length} order(s) excluded pending data review; rank may be understated.` : ''}`;
}

export const rankPosition = (key: RankState) => key === 'not_configured' ? -1 : rankKeys.indexOf(key);

export interface RankSettings { config: RankConfig | null; revision: number; error?: string; demoDefaults?: boolean }

/** A fresh demo is presentation-ready. Never invent rules for real/mixed orders,
 * overwrite saved preferences, hide corrupt storage, or persist a read-only visit. */
export function withDemoRankDefaults(settings: RankSettings, orders: Pick<OrderRecord, 'source'>[]): RankSettings {
  if (settings.config || settings.error || orders.length === 0 || orders.some(order => order.source !== 'demo')) return settings;
  return { ...settings, config: { ...defaultRankConfig }, demoDefaults: true };
}
export const rankSettingsKey = (workspace: string) => `prime.customer-ranks.v1:${encodeURIComponent(workspace)}`;
export function readRankSettings(workspace: string): RankSettings {
  try {
    const raw = localStorage.getItem(rankSettingsKey(workspace));
    if (!raw) return { config: null, revision: 0 };
    const saved = JSON.parse(raw);
    if (saved.schema !== 1 || !Number.isSafeInteger(saved.revision) || saved.revision < 1 || !isRankConfig(saved.config)) throw new Error('Invalid rank settings');
    return { config: saved.config, revision: saved.revision };
  } catch { return { config: null, revision: 0, error: 'Saved rank settings could not be read. Restore browser storage or your saved settings, then reload. No settings were overwritten.' }; }
}
export function saveRankSettings(workspace: string, config: RankConfig, expectedRevision: number): RankSettings {
  if (!isRankConfig(config)) throw new Error('Check the rank thresholds before saving.');
  const previous = readRankSettings(workspace);
  if (previous.error) throw new Error(previous.error);
  if (previous.revision !== expectedRevision) throw new Error('Rank settings changed in another tab. Close and reopen settings to review the latest rules.');
  const revision = previous.revision + 1;
  localStorage.setItem(rankSettingsKey(workspace), JSON.stringify({ schema: 1, revision, config, savedAt: new Date().toISOString() }));
  return { config, revision };
}
