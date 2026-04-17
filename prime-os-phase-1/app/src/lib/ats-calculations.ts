// ATS (Available-to-Sell) calculation utilities

export type ATSHealth = 'healthy' | 'low' | 'critical';

export interface ATSResult {
  onHand: number;
  reserved: number;
  inbound: number;
  unfulfillable: number;
  ats: number;
  health: ATSHealth;
}

export interface ReplenishmentRecommendation {
  type: 'ok' | 'low' | 'critical';
  suggested_order_qty: number;
  days_until_stockout: number | null;
  urgency: 'none' | 'low' | 'medium' | 'high';
}

export function computeATS(
  onHand: number,
  reserved: number,
  inbound: number = 0,
  unfulfillable: number = 0,
): ATSResult {
  const available = Math.max(0, onHand - reserved);
  const ats = Math.max(0, available + inbound - unfulfillable);
  const health: ATSHealth =
    ats === 0 ? 'critical' : ats < 10 ? 'low' : 'healthy';

  return {
    onHand,
    reserved,
    inbound,
    unfulfillable,
    ats,
    health,
  };
}

export function getATSHealth(ats: number): ATSHealth {
  if (ats === 0) return 'critical';
  if (ats < 10) return 'low';
  return 'healthy';
}

export function getReplenishmentRecommendation(
  ats: number,
  avgDailySales: number,
  leadTimeDays: number,
  safetyStockDays = 3,
): ReplenishmentRecommendation {
  if (avgDailySales <= 0) {
    return {
      type: ats === 0 ? 'critical' : 'ok',
      suggested_order_qty: 0,
      days_until_stockout: null,
      urgency: ats === 0 ? 'high' : 'none',
    };
  }

  const daysUntilStockout = Math.round(ats / avgDailySales);
  const safetyStockUnits = avgDailySales * safetyStockDays;
  const safetyThreshold = avgDailySales * (leadTimeDays + safetyStockDays);

  let urgency: ReplenishmentRecommendation['urgency'] = 'none';
  let type: ReplenishmentRecommendation['type'] = 'ok';
  let suggested_order_qty = 0;

  if (ats === 0) {
    type = 'critical';
    urgency = 'high';
    suggested_order_qty = Math.ceil(avgDailySales * (leadTimeDays + 7));
  } else if (ats < safetyThreshold) {
    type = 'low';
    urgency = ats < avgDailySales * 2 ? 'high' : 'medium';
    suggested_order_qty = Math.ceil(
      avgDailySales * (leadTimeDays + safetyStockDays) - ats
    );
  }

  return {
    type,
    suggested_order_qty: Math.max(0, suggested_order_qty),
    days_until_stockout,
    urgency,
  };
}

export function getATSHealthLabel(health: ATSHealth): string {
  return {
    healthy: 'Healthy',
    low: 'Low Stock',
    critical: 'Out of Stock',
  }[health];
}

export function getATSHealthColor(health: ATSHealth): string {
  return {
    healthy: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    low: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
    critical: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
  }[health];
}
