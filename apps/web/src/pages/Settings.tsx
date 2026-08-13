import { PageHeader } from '@/components/system/PageHeader';
import { ThemeModeSwitcher } from '@/components/system/ThemeModeSwitcher';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Boxes, Package, ShoppingCart, Truck, MonitorCog, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext';

export default function Settings() {
  const { t } = useI18n();
  const modules = [
    {
      icon: Package,
      name: t('settings.moduleProductMasterName'),
      desc: t('settings.moduleProductMasterDesc'),
    },
    {
      icon: Boxes,
      name: t('settings.moduleInventoryName'),
      desc: t('settings.moduleInventoryDesc'),
    },
    {
      icon: ShoppingCart,
      name: t('settings.moduleOmsName'),
      desc: t('settings.moduleOmsDesc'),
    },
    {
      icon: Truck,
      name: t('settings.moduleFulfillmentName'),
      desc: t('settings.moduleFulfillmentDesc'),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title={t('settings.pageTitle')} description={t('settings.pageDesc')} />

      <Card className="surface-solid">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MonitorCog className="size-4 text-primary" /> {t('settings.appearanceTitle')}
          </CardTitle>
          <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-start">
          <ThemeModeSwitcher />
          <div className="rounded-lg border border-border/70 bg-muted/35 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="size-4 text-primary" />
              {t('settings.lightModeBadge')}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('settings.lightModeHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="size-4 text-primary" /> {t('settings.systemInfoTitle')}
            </CardTitle>
            <CardDescription>{t('settings.systemInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('settings.projectIdLabel')}</span>
              <span className="font-mono text-xs">fjywdnykcusdgybikknm</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('settings.regionLabel')}</span>
              <Badge variant="secondary" className="text-xs">Asia Pacific (Tokyo)</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('settings.statusLabel')}</span>
              <Badge variant="default" className="text-xs">{t('settings.connected')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.modulesTitle')}</CardTitle>
            <CardDescription>{t('settings.modulesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {modules.map((m) => (
              <div key={m.name} className="flex items-center gap-3 text-sm">
                <m.icon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
                <Badge variant="default" className="bg-primary/10 text-primary text-xs">{t('settings.active')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Database Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.dbTablesTitle')}</CardTitle>
          <CardDescription>{t('settings.dbTablesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[
              'warehouses', 'products', 'skus', 'listings',
              'sku_mappings', 'inventory_positions', 'reservations',
              'orders', 'order_lines', 'fulfillment_jobs',
              'shipments', 'tracking_events', 'returns', 'domain_events',
            ].map((table) => (
              <div key={table} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm">
                <div className="size-1.5 rounded-full bg-primary" />
                <span className="font-mono text-xs truncate">{table}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
