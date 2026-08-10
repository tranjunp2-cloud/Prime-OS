import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ReturnStatusBadge } from './ReturnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Eye, Package } from 'lucide-react';
import type { Return } from '@/lib/partner-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime } from '@/lib/i18n/format';

interface ReturnsTableProps {
  returns: Return[];
  isLoading: boolean;
}

export function ReturnsTable({ returns, isLoading }: ReturnsTableProps) {
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

  if (returns.length === 0) {
    return (
        <div className="surface-solid rounded-lg py-12 text-center text-muted-foreground">
          <Package className="size-12 mx-auto mb-4 opacity-50" />
        <p>{t('fulfillment.returnsTable.emptyTitle')}</p>
        <p className="text-sm mt-1">{t('fulfillment.returnsTable.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <Table wrapperClassName="max-h-[calc(100vh-260px)]">
      <TableHeader>
        <TableRow>
          <TableHead>{t('fulfillment.returnsTable.colRmaCode')}</TableHead>
          <TableHead>{t('fulfillment.returnsTable.colOrder')}</TableHead>
          <TableHead>{t('fulfillment.returnsTable.colWarehouse')}</TableHead>
          <TableHead>{t('fulfillment.returnsTable.colStatus')}</TableHead>
          <TableHead>{t('fulfillment.returnsTable.colPartner')}</TableHead>
          <TableHead>{t('fulfillment.returnsTable.colReceived')}</TableHead>
          <TableHead>{t('fulfillment.returnsTable.colUpdated')}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {returns.map((ret) => (
          <TableRow
            key={ret.id}
            className="group/return cursor-pointer"
            onClick={() => navigate(`/ecom/cos/returns/${ret.id}`)}
          >
            <TableCell className="py-3.5">
              <Link
                to={`/ecom/cos/returns/${ret.id}`}
                className="font-mono font-medium text-foreground transition-colors hover:text-primary hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {ret.rma_code}
              </Link>
            </TableCell>
            <TableCell className="py-3.5">
              <div className="font-medium">{ret.order?.order_id}</div>
              <span className="text-xs text-muted-foreground">{ret.order?.customer_name}</span>
            </TableCell>
            <TableCell className="py-3.5">
              <div className="font-medium">{ret.warehouse?.name}</div>
              <span className="text-xs text-muted-foreground">{ret.warehouse?.code}</span>
            </TableCell>
            <TableCell className="py-3.5">
              <ReturnStatusBadge status={ret.status} />
            </TableCell>
            <TableCell className="py-3.5">
              {ret.is_partner_managed ? (
                <Badge variant="outline" className="text-xs">
                  {ret.partner?.name || t('fulfillment.returnsTable.partnerFallback')}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{t('fulfillment.returnsTable.internal')}</span>
              )}
            </TableCell>
            <TableCell className="py-3.5 text-sm text-muted-foreground">
              {ret.received_at 
                ? formatLocalizedDateTime(locale, ret.received_at)
                : '—'}
            </TableCell>
            <TableCell className="py-3.5 text-sm text-muted-foreground">
              {formatLocalizedDateTime(locale, ret.updated_at)}
            </TableCell>
            <TableCell className="py-3.5">
              <Link
                to={`/ecom/cos/returns/${ret.id}`}
                className="inline-flex text-muted-foreground opacity-70 transition-opacity group-hover/return:opacity-100 hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <Eye className="size-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
