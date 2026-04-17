import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <SummaryMetricCard
            key={index}
            label="Loading"
            value="—"
            tone={index % 3 === 0 ? 'info' : index % 3 === 1 ? 'warning' : 'success'}
            loading
            icon={<span />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Orchestration Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 flex-1 rounded-full" />
                <Skeleton className="h-5 w-8 rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Priority Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-5 w-28 rounded-full" />
                      <Skeleton className="h-3 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 rounded-full" />
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Fulfillment Node Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1.2fr_1fr_60px] items-center gap-3">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full justify-self-end" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
