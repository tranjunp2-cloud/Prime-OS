import { format } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AdjustmentTypeBadge, type AdjustmentType } from './AdjustmentTypeBadge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';
import { SkuBadge } from '@/components/system/SkuBadge';

export interface InventoryAdjustment {
  id: string;
  adjustment_id: string | null; // Now optional (adjustment_code)
  sku_id: string | null;
  warehouse_id: string | null;
  qty_delta: number;
  fulfillment_method_name: string;
  adjustment_type: AdjustmentType;
  reason: string;
  note: string | null;
  created_by: string;
  created_at: string;
  status: string;
  // Joined data
  sku_code?: string;
  variation_name?: string;
  product_title?: string;
  product_id?: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

interface AdjustmentsTableProps {
  adjustments: InventoryAdjustment[];
  isLoading?: boolean;
}

export function AdjustmentsTable({ adjustments, isLoading }: AdjustmentsTableProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleRowClick = (adjustmentId: string) => {
    navigate(`/inventory/adjustments/${adjustmentId}`);
  };

  if (isLoading) {
    return (
      <div className="surface-solid overflow-hidden rounded-lg">
        <Table wrapperClassName="max-h-[calc(100vh-260px)]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('inventory.colSku')}</TableHead>
              <TableHead>{t('inventory.colWarehouse')}</TableHead>
              <TableHead>{t('orders.colDate')}</TableHead>
              <TableHead>{t('orders.colType')}</TableHead>
              <TableHead className="text-right">{t('inventory.colQtyDelta')}</TableHead>
              <TableHead>{t('inventory.colReasonNote')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (adjustments.length === 0) {
    return (
      <div className="surface-solid rounded-lg p-12 text-center">
        <ClipboardList className="size-10 mx-auto mb-3 text-muted-foreground/50" />
        <h3 className="text-sm font-medium text-muted-foreground">{t('inventory.noAdjustments')}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('inventory.createFirstAdjustment')}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-solid overflow-hidden rounded-lg">
      <Table wrapperClassName="max-h-[calc(100vh-260px)]">
        <TableHeader>
          <TableRow>
            <TableHead>{t('inventory.colSku')}</TableHead>
            <TableHead>{t('inventory.colWarehouse')}</TableHead>
            <TableHead>{t('orders.colDate')}</TableHead>
            <TableHead>{t('orders.colType')}</TableHead>
            <TableHead className="text-right">{t('inventory.colQtyDelta')}</TableHead>
            <TableHead>{t('inventory.colReasonNote')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow
              key={adjustment.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(adjustment.id)}
            >
              <TableCell className="py-3.5">
                {adjustment.sku_id && adjustment.product_id ? (
                  <Link
                    to={`/ecom/cos/product-master/${adjustment.product_id}?variant=${adjustment.sku_id}`}
                    className="inline-flex transition-opacity hover:opacity-90"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SkuBadge sku={adjustment.sku_code} size="compact" />
                  </Link>
                ) : (
                  <SkuBadge sku={adjustment.sku_code} size="compact" />
                )}
              </TableCell>
              <TableCell className="py-3.5 text-sm">
                <div className="flex flex-col">
                  <span>{adjustment.warehouse_name || adjustment.fulfillment_method_name}</span>
                  {adjustment.warehouse_code && (
                    <span className="text-xs text-muted-foreground">{adjustment.warehouse_code}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-3.5 text-sm whitespace-nowrap">
                {format(new Date(adjustment.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="py-3.5">
                <AdjustmentTypeBadge type={adjustment.adjustment_type} />
              </TableCell>
              <TableCell className="py-3.5 text-right tabular-nums font-medium">
                <span
                  className={cn(
                    adjustment.qty_delta > 0
                      ? 'text-success'
                      : adjustment.qty_delta < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  )}
                >
                  {adjustment.qty_delta > 0 ? '+' : ''}
                  {adjustment.qty_delta}
                </span>
              </TableCell>
              <TableCell className="py-3.5 text-sm text-muted-foreground max-w-[200px]">
                <div className="truncate">{adjustment.reason}</div>
                {adjustment.note && (
                  <div className="text-xs truncate">{adjustment.note}</div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
