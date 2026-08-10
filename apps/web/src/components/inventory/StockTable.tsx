import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FulfillmentModeBadge } from './FulfillmentModeBadge';
import { useI18n } from '@/lib/i18n/I18nContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { SkuBadge } from '@/components/system/SkuBadge';

export interface StockItem {
  sku: string;
  warehouse_name: string;
  warehouse_code: string;
  quantity: number;
  reserved: number;
  in_transit: number;
  available: number;
  fulfillment_mode: 'auto' | 'fixed';
}

interface StockTableProps {
  items: StockItem[];
  isLoading?: boolean;
}

export function StockTable({ items, isLoading }: StockTableProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-edge-divider/70 bg-surface-data/82 py-12 text-center text-muted-foreground">
        <p>{t('inventory.tableNoData')}</p>
        <p className="text-sm mt-1">{t('inventory.tableNoDataDesc')}</p>
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
            <TableHead className="text-right">{t('inventory.colStock')}</TableHead>
            <TableHead className="text-right">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                    {t('inventory.colReserved')}
                    <HelpCircle className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('inventory.tooltipReserved')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-right">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                    {t('inventory.colInTransit')}
                    <HelpCircle className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('inventory.tooltipInTransit')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-right">{t('inventory.colAvailable')}</TableHead>
            <TableHead>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    {t('inventory.colMode')}
                    <HelpCircle className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      <strong>{t('inventory.tooltipModeAutoTitle')}</strong> {t('inventory.tooltipModeAutoDesc')}
                    </p>
                    <p className="mt-1">
                      <strong>{t('inventory.tooltipModeFixedTitle')}</strong> {t('inventory.tooltipModeFixedDesc')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={`${item.sku}-${item.warehouse_code}-${index}`}>
              <TableCell className="py-3.5">
                <SkuBadge sku={item.sku} size="compact" />
              </TableCell>
              <TableCell className="py-3.5">
                <div>
                  <div className="font-medium text-foreground">{item.warehouse_name}</div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.warehouse_code}</div>
                </div>
              </TableCell>
              <TableCell className="py-3.5 text-right">{item.quantity}</TableCell>
              <TableCell className="py-3.5 text-right text-muted-foreground">
                {item.reserved}
              </TableCell>
              <TableCell className="py-3.5 text-right text-muted-foreground">
                {item.in_transit}
              </TableCell>
              <TableCell className="py-3.5 text-right font-medium text-success">
                {item.available}
              </TableCell>
              <TableCell className="py-3.5">
                <FulfillmentModeBadge mode={item.fulfillment_mode} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
