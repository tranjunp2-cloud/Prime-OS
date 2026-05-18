import { useState } from 'react';
import { GitBranch, Plus, Settings, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/system/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoutingConfigEditor } from '@/components/oms/RoutingConfigEditor';
import { getWarehouses } from '@/lib/warehouse-store';
import { useI18n } from '@/lib/i18n/I18nContext';

export default function RoutingPlans() {
  const { locale, t } = useI18n();
  const warehouses = getWarehouses().filter(w => w.status === 'active');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.id ?? '',
  );
  const [editorKey, setEditorKey] = useState(0);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  const copy = {
    sidebarWarehouses: locale === 'ja-JP' ? '倉庫' : locale === 'vi-VN' ? 'Nhà kho' : 'Warehouses',
    noWarehouses: locale === 'ja-JP' ? '利用可能な倉庫がありません。' : locale === 'vi-VN' ? 'Chưa có kho khả dụng.' : 'No warehouses configured.',
    goToWarehouses: locale === 'ja-JP' ? '倉庫へ移動' : locale === 'vi-VN' ? 'Đi tới nhà kho' : 'Go to Warehouses',
  } as const;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={t('sidebar.routingPlans')}
        description={t('warehouses.routingDesc')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
        {/* Warehouse selector sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="size-4" />
              {copy.sidebarWarehouses}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs
              value={selectedWarehouseId}
              onValueChange={v => { setSelectedWarehouseId(v); setEditorKey(k => k + 1); }}
              orientation="vertical"
              className="w-full"
            >
              <TabsList className="flex-col h-auto w-full bg-transparent gap-1 p-2">
                {warehouses.map(wh => (
                  <TabsTrigger
                    key={wh.id}
                    value={wh.id}
                    className="w-full justify-start text-left px-3 py-2 h-auto data-[state=active]:bg-primary/10"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className={`size-2 rounded-full flex-shrink-0 ${wh.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{wh.code}</div>
                        <div className="text-xs text-muted-foreground truncate">{wh.name}</div>
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Editor panel */}
        <Card>
          <CardContent className="p-6">
            {selectedWarehouse ? (
              <RoutingConfigEditor
                key={editorKey}
                warehouseId={selectedWarehouse.id}
              warehouseName={selectedWarehouse.name}
              warehouseCountry={selectedWarehouse.country}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Settings className="size-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">{copy.noWarehouses}</p>
              <Button variant="outline" onClick={() => window.location.href = '/warehouses'}>
                  {copy.goToWarehouses}
              </Button>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
