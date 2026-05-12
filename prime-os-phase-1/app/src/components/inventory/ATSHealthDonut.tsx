import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInventoryPositions } from '@/lib/inventory-store';
import { getProducts } from '@/lib/product-store';
import { computeATS, getATSHealth } from '@/lib/ats-calculations';

interface ATSHealthDonutProps {
  warehouseId?: string;
}

const HEALTH_CONFIG = {
  healthy: { label: 'Healthy', color: '#22c55e', bgClass: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  low: { label: 'Low Stock', color: '#f59e0b', bgClass: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300' },
  critical: { label: 'Out of Stock', color: '#ef4444', bgClass: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300' },
};

export function ATSHealthDonut({ warehouseId }: ATSHealthDonutProps) {
  const positions = getInventoryPositions();
  const products = getProducts();

  const skuProductMap = new Map<string, { name: string; skuCode: string }>();
  for (const p of products) {
    for (const s of p.skus) {
      skuProductMap.set(s.id, { name: p.name, skuCode: s.sku_code });
    }
  }

  // Count unique SKUs by health bucket
  const healthCounts = { healthy: 0, low: 0, critical: 0 };

  const skuAggregates = positions
    .filter(p => !warehouseId || p.warehouse_id === warehouseId)
    .reduce<Record<string, { on_hand: number; reserved: number; inbound: number; unfulfillable: number }>>((acc, p) => {
      if (!acc[p.sku_id]) acc[p.sku_id] = { on_hand: 0, reserved: 0, inbound: 0, unfulfillable: 0 };
      acc[p.sku_id].on_hand += p.on_hand ?? 0;
      acc[p.sku_id].reserved += p.reserved ?? 0;
      acc[p.sku_id].inbound += p.inbound ?? 0;
      acc[p.sku_id].unfulfillable += p.unfulfillable ?? 0;
      return acc;
    }, {});

  for (const [, agg] of Object.entries(skuAggregates)) {
    const result = computeATS(agg.on_hand, agg.reserved, agg.inbound, agg.unfulfillable);
    healthCounts[result.health]++;
  }

  const chartData = [
    { name: 'Healthy', value: healthCounts.healthy, color: HEALTH_CONFIG.healthy.color },
    { name: 'Low Stock', value: healthCounts.low, color: HEALTH_CONFIG.low.color },
    { name: 'Out of Stock', value: healthCounts.critical, color: HEALTH_CONFIG.critical.color },
  ].filter(d => d.value > 0);

  const total = Object.values(healthCounts).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ATS Health Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
            No inventory data available.
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-44 w-full sm:h-52 sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="70%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            </div>

            {/* Legend + summary */}
            <div className="flex flex-1 flex-col gap-3">
              {([
                ['healthy', 'Healthy', healthCounts.healthy],
                ['low', 'Low Stock', healthCounts.low],
                ['critical', 'Out of Stock', healthCounts.critical],
              ] as const).map(([key, label, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: HEALTH_CONFIG[key].color }}
                    />
                    <span className="text-xs text-muted-foreground flex-1">{label}</span>
                    <span className="text-xs font-semibold">{count}</span>
                    <span className="text-xs text-muted-foreground">({pct}%)</span>
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total SKUs</span>
                <span className="text-sm font-bold">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
