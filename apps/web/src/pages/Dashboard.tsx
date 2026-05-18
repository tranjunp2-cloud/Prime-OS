import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/system/PageHeader';
import { PageDataState } from '@/components/system/PageDataState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { OperationsVariant } from '@/pages/dashboard-variants/OperationsVariant';
import { useDashboard } from '@/lib/dashboard/useDashboard';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime, formatMessage } from '@/lib/i18n/format';

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { locale, t } = useI18n();

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={t('controlTower.pageTitle')}
        description={t('controlTower.pageDesc')}
        actions={
          <Badge variant="outline" className="gap-1.5 text-xs font-normal">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {data
              ? formatMessage(t('controlTower.liveAt'), {
                  time: formatLocalizedDateTime(locale, data.lastRefreshedAt, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }),
                })
              : t('controlTower.syncing')}
          </Badge>
        }
      />

      <PageDataState
        data={data}
        isLoading={isLoading}
        error={error as Error | null}
        refetch={refetch}
        emptyTitle={t('controlTower.emptyTitle')}
        emptyDescription={t('controlTower.emptyDescription')}
        skeleton={<DashboardSkeleton />}
      >
        {(dashboardData) => <OperationsVariant data={dashboardData} />}
      </PageDataState>
    </div>
  );
}
