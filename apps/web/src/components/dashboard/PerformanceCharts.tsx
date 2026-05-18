import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface BreakdownItem {
  label: string;
  value: number;
}

interface PerformanceChartsProps {
  ordersByStatus: BreakdownItem[];
  salesByChannel: BreakdownItem[];
  ordersByWarehouse: BreakdownItem[];
  lowStockByWarehouse: BreakdownItem[];
  loading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(var(--warning))',
  processing: 'hsl(var(--primary))',
  shipped: 'hsl(var(--chart-2))',
  delivered: 'hsl(var(--success))',
  cancelled: 'hsl(var(--muted-foreground))',
  returned: 'hsl(var(--destructive))',
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function PerformanceCharts({
  ordersByStatus,
  salesByChannel,
  ordersByWarehouse,
  lowStockByWarehouse,
  loading,
}: PerformanceChartsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ja-JP', { 
      style: 'currency', 
      currency: 'JPY',
      notation: 'compact',
    }).format(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Performance Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="channel">
          <TabsList className="mb-4">
            <TabsTrigger value="channel">By Channel</TabsTrigger>
            <TabsTrigger value="warehouse">By Warehouse</TabsTrigger>
          </TabsList>

          <TabsContent value="channel" className="flex flex-col gap-6">
            {/* Orders by Status */}
            <div>
              <h4 className="text-sm font-medium mb-3">Orders by Status</h4>
              {ordersByStatus.length === 0 ? (
                <EmptyChart message="No order data available" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ordersByStatus} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="label" 
                      width={80}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Orders']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {ordersByStatus.map((entry, index) => (
                        <Cell 
                          key={entry.label} 
                          fill={STATUS_COLORS[entry.label] || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sales by Channel */}
            <div>
              <h4 className="text-sm font-medium mb-3">Sales by Channel</h4>
              {salesByChannel.length === 0 ? (
                <EmptyChart message="No sales data available" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={salesByChannel}>
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Sales']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="warehouse" className="flex flex-col gap-6">
            {/* Orders by Warehouse */}
            <div>
              <h4 className="text-sm font-medium mb-3">Orders by Warehouse</h4>
              {ordersByWarehouse.length === 0 ? (
                <EmptyChart message="No warehouse order data available" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ordersByWarehouse}>
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Orders']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Low Stock by Warehouse */}
            <div>
              <h4 className="text-sm font-medium mb-3">Low Stock SKUs by Warehouse</h4>
              {lowStockByWarehouse.length === 0 ? (
                <EmptyChart message="No low stock items" />
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={lowStockByWarehouse}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {lowStockByWarehouse.map((entry, index) => (
                          <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, 'SKUs']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-1 flex-col gap-2">
                    {lowStockByWarehouse.map((item, index) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="size-3 rounded-sm" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
