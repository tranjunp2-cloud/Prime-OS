import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FulfillmentJob, JobStatus } from '@/lib/fulfillment-types';
import { JOB_STATUS_LABELS } from '@/lib/fulfillment-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime, formatMessage } from '@/lib/i18n/format';
import { getLocalizedJobStatusLabel } from '@/lib/i18n/ops-labels';
import { cn } from '@/lib/utils';

const FULFILLMENT_STEPS = ['pending', 'picking', 'packed', 'shipped', 'done'] as const;

type WorkflowStep = (typeof FULFILLMENT_STEPS)[number];
type StepVisualState = 'done' | 'active' | 'pending';

function isWorkflowStep(status: JobStatus): status is WorkflowStep {
  return FULFILLMENT_STEPS.includes(status as WorkflowStep);
}

function getWorkflowIndex(job: FulfillmentJob): number {
  if (job.status === 'done') return FULFILLMENT_STEPS.length - 1;
  if (isWorkflowStep(job.status)) return FULFILLMENT_STEPS.indexOf(job.status);
  if (job.shipped_at) return FULFILLMENT_STEPS.indexOf('shipped');
  if (job.packed_at) return FULFILLMENT_STEPS.indexOf('packed');
  if (job.picked_at) return FULFILLMENT_STEPS.indexOf('picking');
  return 0;
}

function getStepTimestamp(job: FulfillmentJob, step: WorkflowStep): string | null {
  switch (step) {
    case 'pending':
      return job.created_at;
    case 'picking':
      return job.picked_at ?? (job.status === 'picking' ? job.updated_at : null);
    case 'packed':
      return job.packed_at ?? (job.status === 'packed' ? job.updated_at : null);
    case 'shipped':
      return job.shipped_at ?? (job.status === 'shipped' ? job.updated_at : null);
    case 'done':
      return job.status === 'done' ? (job.shipped_at ?? job.updated_at) : null;
  }
}

function getStepVisualState(index: number, activeIndex: number, status: JobStatus): StepVisualState {
  if (status === 'done') return 'done';
  if (index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'pending';
}

interface FulfillmentWorkflowTimelineProps {
  job: FulfillmentJob;
}

export function FulfillmentWorkflowTimeline({ job }: FulfillmentWorkflowTimelineProps) {
  const { locale, t } = useI18n();
  const activeIndex = getWorkflowIndex(job);
  const completedCount = job.status === 'done' ? FULFILLMENT_STEPS.length : activeIndex + 1;
  const currentWorkflowStep = FULFILLMENT_STEPS[activeIndex];
  const currentWorkflowLabel = getLocalizedJobStatusLabel(currentWorkflowStep, t) ?? JOB_STATUS_LABELS[currentWorkflowStep];
  const liveStatusLabel = getLocalizedJobStatusLabel(job.status, t) ?? JOB_STATUS_LABELS[job.status];
  const outOfFlowStatus = !isWorkflowStep(job.status) ? liveStatusLabel : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{t('fulfillment.jobDetail.workflowProgress')}</CardTitle>
            <CardDescription>
              {formatMessage(t('fulfillment.jobDetail.milestonesComplete'), {
                completed: completedCount,
                total: FULFILLMENT_STEPS.length,
              })}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {t('fulfillment.jobDetail.liveStep')}: {currentWorkflowLabel}
            </Badge>
            {outOfFlowStatus ? (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-xs">
                {liveStatusLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[760px] items-start">
            {FULFILLMENT_STEPS.map((step, index) => {
              const visualState = getStepVisualState(index, activeIndex, job.status);
              const timestamp = getStepTimestamp(job, step);
              const label = getLocalizedJobStatusLabel(step, t) ?? JOB_STATUS_LABELS[step];

              return (
                <div key={step} className="flex flex-1 items-start">
                  <div className="flex min-w-[124px] flex-1 flex-col items-center text-center">
                    <div
                      className={cn(
                        'flex min-h-24 flex-col items-center',
                        visualState === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                      )}
                    >
                      {visualState === 'done' ? (
                        <CheckCircle2 className="size-5 text-green-600" />
                      ) : (
                        <div
                          className={cn(
                            'size-5 rounded-full border-2',
                            visualState === 'active'
                              ? 'border-primary bg-primary/20'
                              : 'border-current',
                          )}
                        />
                      )}
                      <span className="mt-2 text-xs font-medium uppercase tracking-[0.14em]">
                        {label}
                      </span>
                      <span className="mt-2 text-xs leading-5 text-muted-foreground">
                        {timestamp
                          ? formatLocalizedDateTime(locale, timestamp, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                  {index < FULFILLMENT_STEPS.length - 1 ? (
                    <div
                      className={cn(
                        'mt-2 h-0.5 flex-1 rounded-full',
                        job.status === 'done' || index < activeIndex ? 'bg-green-500' : 'bg-border',
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {outOfFlowStatus ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {formatMessage(t('fulfillment.jobDetail.workflowMovedTo'), { status: liveStatusLabel })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
