import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FlowTypeBadge } from './FlowTypeBadge';
import { JobStatusBadge } from './JobStatusBadge';
import { Eye } from 'lucide-react';
import type { FulfillmentJob } from '@/lib/fulfillment-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime, formatMessage } from '@/lib/i18n/format';

interface FulfillmentJobsTableProps {
  jobs: FulfillmentJob[];
  isLoading: boolean;
}

export function FulfillmentJobsTable({ jobs, isLoading }: FulfillmentJobsTableProps) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="surface-solid rounded-lg py-12 text-center text-muted-foreground">
        <p>{t('fulfillment.jobsTable.emptyTitle')}</p>
        <p className="text-sm mt-1">{t('fulfillment.jobsTable.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <Table wrapperClassName="max-h-[calc(100vh-260px)]">
      <TableHeader>
        <TableRow>
          <TableHead>{t('fulfillment.jobsTable.colJobOrder')}</TableHead>
          <TableHead>{t('fulfillment.jobsTable.colWarehouse')}</TableHead>
          <TableHead>{t('fulfillment.jobsTable.colFlowType')}</TableHead>
          <TableHead>{t('fulfillment.jobsTable.colPartner')}</TableHead>
          <TableHead>{t('fulfillment.jobsTable.colStatus')}</TableHead>
          <TableHead>{t('fulfillment.jobsTable.colSla')}</TableHead>
          <TableHead>{t('fulfillment.jobsTable.colUpdated')}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow
            key={job.id}
            className="group/job cursor-pointer"
            onClick={() => navigate(`/fulfillment/jobs/${job.id}`)}
          >
            <TableCell className="py-3.5">
              <div>
                <span className="font-mono text-xs text-muted-foreground">
                  {job.id.slice(0, 8)}...
                </span>
                <div className="font-medium text-foreground">{job.order?.order_id}</div>
              </div>
            </TableCell>
            <TableCell className="py-3.5">
              <div>
                <div className="font-medium">{job.warehouse?.name}</div>
                <span className="text-xs text-muted-foreground">{job.warehouse?.code}</span>
              </div>
            </TableCell>
            <TableCell className="py-3.5">
              <FlowTypeBadge flowType={job.flow_type} />
            </TableCell>
            <TableCell className="py-3.5">
              {(job as { partner?: { name: string } | null }).partner ? (
                <Badge variant="outline" className="text-xs">
                  {(job as { partner?: { name: string } | null }).partner?.name}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{t('fulfillment.jobsTable.noPartner')}</span>
              )}
            </TableCell>
            <TableCell className="py-3.5">
              <JobStatusBadge status={job.status} />
            </TableCell>
            <TableCell className="py-3.5">
              {job.sla_target_days ? (
                <span className="text-sm">{formatMessage(t('fulfillment.jobsTable.slaDay'), { count: job.sla_target_days })}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="py-3.5 text-sm text-muted-foreground">
              {formatLocalizedDateTime(locale, job.updated_at)}
            </TableCell>
            <TableCell className="py-3.5">
              <Eye className="size-4 text-muted-foreground opacity-70 transition-opacity group-hover/job:opacity-100" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
