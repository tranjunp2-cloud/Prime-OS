import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInventoryPositions } from '@/lib/inventory-store';
import { getProducts } from '@/lib/product-store';
import { computeATP } from '@/lib/ats-calculations';

interface ATSBucketChartProps {
  warehouseId?: string;
  topN?: number;
}

export function ATSBucketChart({ warehouseId, topN = 15 }: ATSBucketChartProps) {
  const positions = getInventoryPositions();
  const products = getProducts();

  const skuProductMap = new Map<string, { name: string; skuCode: string }>();
  for (const p of products) {
    for (const s of p.skus) {
      skuProductMap.set(s.id, { name: p.name, skuCode: s.sku_code });
    }
  }

  const aggregated = positions
    .filter(p => !warehouseId || p.warehouse_id === warehouseId)
    .reduce<Record<string, {
      skuId: string; name: string; skuCode: string;
      on_hand: number; reserved_unpaid: number; reserved_paid: number;
      allocated: number; inbound: number; unfulfillable: number;
      safety_stock: number; campaign_lock: number; ats: number;
    }>>((acc, p) => {
      const info = skuProductMap.get(p.sku_id);
      if (!info) return acc;
      if (!acc[p.sku_id]) {
        acc[p.sku_id] = {
          skuId: p.sku_id, name: info.name, skuCode: info.skuCode,
          on_hand: 0, reserved_unpaid: 0, reserved_paid: 0,
          allocated: 0, inbound: 0, unfulfillable: 0,
          safety_stock: 0, campaign_lock: 0, ats: 0,
        };
      }
      acc[p.sku_id].on_hand += p.on_hand ?? 0;
      acc[p.sku_id].reserved_unpaid += p.reserved_unpaid ?? 0;
      acc[p.sku_id].reserved_paid += p.reserved_paid ?? 0;
      acc[p.sku_id].allocated += p.allocated ?? 0;
      acc[p.sku_id].inbound += p.inbound ?? 0;
      acc[p.sku_id].unfulfillable += p.unfulfillable ?? 0;
      acc[p.sku_id].safety_stock += p.safety_stock ?? 0;
      acc[p.sku_id].campaign_lock += p.campaign_lock ?? 0;
      const result = computeATP(
        acc[p.sku_id].on_hand,
        acc[p.sku_id].reserved_unpaid,
        acc[p.sku_id].reserved_paid,
        acc[p.sku_id].allocated,
        acc[p.sku_id].inbound,
        acc[p.sku_id].unfulfillable,
        acc[p.sku_id].safety_stock,
        acc[p.sku_id].campaign_lock,
      );
      acc[p.sku_id].ats = result.ats;
      return acc;
    }, {});

  const chartData = Object.values(aggregated)
    .sort((a, b) => b.ats - a.ats)
    .slice(0, topN)
    .map(s => ({
      name: s.skuCode.length > 14 ? s.skuCode.slice(0, 14) + '…' : s.skuCode,
      fullName: `${s.skuCode} — ${s.name}`,
      'On Hand': s.on_hand,
      'Resv. Unpaid': s.reserved_unpaid,
      'Resv. Paid': s.reserved_paid,
      Allocated: s.allocated,
      'Safety Stock': s.safety_stock,
      Inbound: s.inbound,
      Unfulfillable: s.unfulfillable,
      ATP: s.ats,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">ATP Breakdown by SKU</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          No inventory data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ATP Breakdown by SKU (Top {chartData.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
        <div className="h-[300px] min-w-[620px] sm:min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ paddingTop: 2 }}
              formatter={(value, name) => [String(value), name]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="On Hand" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Resv. Unpaid" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Resv. Paid" fill="#a78bfa" radius={[2, 2, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Allocated" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Safety Stock" fill="#94a3b8" radius={[2, 2, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Inbound" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
