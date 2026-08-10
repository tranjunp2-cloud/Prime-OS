import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryStatusBadge, computeInventoryStatus } from './InventoryStatusBadge';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/I18nContext';
import { SkuBadge } from '@/components/system/SkuBadge';

export interface InventoryPositionRow {
  id: string;
  product_name: string;
  variation_name: string | null;
  sku_code: string;
  variation_attributes: Record<string, string> | null;
  product_id: string;
  sku_id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  type: string;
  country: string;
  platform: string | null;
  available_qty: number;
  low_stock_threshold: number;
}

interface InventorySummaryTableProps {
  items: InventoryPositionRow[];
  isLoading?: boolean;
  totalCount: number;
}

function VariationAttributesChips({ attributes }: { attributes: Record<string, string> | null }) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const entries = Object.entries(attributes).slice(0, 3);
  const hasMore = Object.keys(attributes).length > 3;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-xs font-normal">
          {key}: {value}
        </Badge>
      ))}
      {hasMore && (
        <Badge variant="outline" className="text-xs font-normal">
          +{Object.keys(attributes).length - 3}
        </Badge>
      )}
    </div>
  );
}

export function InventorySummaryTable({
  items,
  isLoading,
  totalCount,
}: InventorySummaryTableProps) {
  const { t } = useI18n();
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t('inventory.showingRecords')
          .replace('{current}', items.length.toString())
          .replace('{total}', totalCount.toString())}
      </p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-edge-divider/70 bg-surface-data/82 py-16 text-muted-foreground">
          <Package className="size-12 mb-4 opacity-50" />
          <p className="font-medium">{t('inventory.tableNoData')}</p>
          <p className="text-sm mt-1">{t('inventory.tableNoDataDesc')}</p>
        </div>
      ) : (
        <div className="surface-solid overflow-hidden rounded-lg flex flex-col">
          <Table wrapperClassName="max-h-[calc(100vh-260px)]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('inventory.colProductVariation')}</TableHead>
                <TableHead>{t('inventory.colSku')}</TableHead>
                <TableHead>{t('inventory.colVariationAttributes')}</TableHead>
                <TableHead>{t('inventory.colWarehouse')}</TableHead>
                <TableHead>{t('orders.colType')}</TableHead>
                <TableHead>{t('inventory.colCountry')}</TableHead>
                <TableHead>{t('inventory.colPlatform')}</TableHead>
                <TableHead className="text-right">{t('inventory.colAvailableStock')}</TableHead>
                <TableHead>{t('inventory.colStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const status = computeInventoryStatus(item.available_qty, item.low_stock_threshold);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="py-3.5">
                      <div>
                        <Link
                          to={`/ecom/cos/product-master/${item.product_id}`}
                          className="font-medium text-primary hover:underline transition-colors"
                        >
                          {item.product_name}
                        </Link>
                        {item.variation_name && (
                          <span className="text-muted-foreground ml-1">
                            ({item.variation_name})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Link
                        to={`/ecom/cos/product-master/${item.product_id}?variant=${item.sku_id}`}
                        className="inline-flex transition-opacity hover:opacity-90"
                      >
                        <SkuBadge sku={item.sku_code} size="compact" />
                      </Link>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <VariationAttributesChips attributes={item.variation_attributes} />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div>
                        <Link
                          to="/ecom/cos/warehouses"
                          className="font-medium hover:underline transition-colors"
                        >
                          {item.warehouse_name}
                        </Link>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.warehouse_code})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 capitalize">{item.type}</TableCell>
                    <TableCell className="py-3.5">{item.country}</TableCell>
                    <TableCell className="py-3.5">{item.platform || '—'}</TableCell>
                    <TableCell className="py-3.5 text-right font-medium">{item.available_qty}</TableCell>
                    <TableCell className="py-3.5">
                      <InventoryStatusBadge status={status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
