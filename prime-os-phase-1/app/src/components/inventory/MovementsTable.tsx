import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Layers, HelpCircle, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MovementTypeBadge } from './MovementTypeBadge';
import { WarehouseTypeBadge } from './WarehouseTypeBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getCountryFlag } from '@/lib/country-flags';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/I18nContext';
import { SkuBadge } from '@/components/system/SkuBadge';

export interface InventoryMovement {
  id: string;
  created_at: string;
  fulfillment_method_name: string;
  sku: string;
  qty_change: number;
  movement_type: 'RESERVE' | 'SHIP' | 'RETURN' | 'ADJUST' | 'REPLENISH';
  source_type: 'ORDER' | 'RETURN' | 'ADJUSTMENT' | 'REPLENISHMENT' | 'MARKETPLACE_SYNC';
  source_ref: string | null;
  batch_id: string | null;
  balance_after: number | null;
}

interface WarehouseInfo {
  id: string;
  code: string;
  name: string;
  country: string;
  type: 'own' | 'fba' | '3pl';
  fulfillment_type_mapping: string | null;
}

interface MovementsTableProps {
  movements: InventoryMovement[];
  isLoading?: boolean;
  onBatchClick?: (batchId: string) => void;
}

export function MovementsTable({ movements, isLoading, onBatchClick }: MovementsTableProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  // User-friendly label mappings
  const sourceTypeLabels: Record<string, string> = {
    'ORDER': t('inventory.srcOrder'),
    'RETURN': t('inventory.srcReturn'),
    'ADJUSTMENT': t('inventory.srcAdjustment'),
    'REPLENISHMENT': t('inventory.srcReplenishment'),
    'MARKETPLACE_SYNC': t('inventory.srcMarketplaceSync'),
  };

  const movementTypeLabels: Record<string, string> = {
    'RESERVE': t('inventory.typeOrderAllocation'),
    'SHIP': t('inventory.typeShipped'),
    'RETURN': t('inventory.typeReturned'),
    'ADJUST': t('inventory.typeAdjustment'),
    'REPLENISH': t('inventory.typeReplenishment'),
  };

  // Fetch warehouses for mapping
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-for-movements-table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, code, name, country, type, fulfillment_type_mapping');
      if (error) throw error;
      return data as WarehouseInfo[];
    },
  });

  // Fetch skus mapping
  const { data: skuMappings = [] } = useQuery({
    queryKey: ['skus-for-movements-table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skus')
        .select('id, product_id, sku_code');
      if (error) throw error;
      return data;
    },
  });

  // Build fulfillment method to warehouse lookup
  const fulfillmentToWarehouse = (fulfillmentMethod: string): WarehouseInfo | null => {
    // First try exact fulfillment_type_mapping match
    const exactMatch = warehouses.find((wh) => wh.fulfillment_type_mapping === fulfillmentMethod);
    if (exactMatch) return exactMatch;

    // Try pattern matching for legacy data
    if (fulfillmentMethod.toLowerCase().includes('seller') || fulfillmentMethod.toLowerCase().includes('fbm')) {
      return warehouses.find((wh) => wh.type === 'own') || null;
    }
    if (fulfillmentMethod.toLowerCase().includes('amazon') || fulfillmentMethod.toLowerCase().includes('fba')) {
      return warehouses.find((wh) => wh.type === 'fba') || null;
    }
    if (fulfillmentMethod.toLowerCase().includes('3pl')) {
      return warehouses.find((wh) => wh.type === '3pl') || null;
    }

    return null;
  };

  const handleSkuClick = (skuCode: string) => {
    const mapping = skuMappings.find(s => s.sku_code === skuCode);
    if (mapping) {
      navigate(`/ecom/cos/product-master/${mapping.product_id}?variant=${mapping.id}`);
    } else {
      toast.error(t('inventory.errorSkuNotFound'));
      navigate(`/ecom/cos/product-master?search=${encodeURIComponent(skuCode)}`);
    }
  };

  const handleSourceRefClick = (sourceType: string, sourceRef: string) => {
    if (sourceType === 'ORDER') {
      navigate(`/ecom/cos/oms?search=${encodeURIComponent(sourceRef)}`);
    } else if (sourceType === 'ADJUSTMENT') {
      navigate(`/inventory/adjustments?search=${encodeURIComponent(sourceRef)}`);
    }
  };

  const handleWarehouseClick = (warehouseId: string) => {
    navigate(`/ecom/cos/warehouses?warehouse=${encodeURIComponent(warehouseId)}`);
  };

  if (isLoading) {
    return (
      <div className="surface-solid overflow-hidden rounded-[1.75rem]">
        <Table wrapperClassName="max-h-[calc(100vh-260px)]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('inventory.colDateTime')}</TableHead>
              <TableHead>{t('inventory.colWarehouse')}</TableHead>
              <TableHead>{t('inventory.colSku')}</TableHead>
              <TableHead className="text-right">{t('inventory.colQtyChange')}</TableHead>
              <TableHead>{t('orders.colType')}</TableHead>
              <TableHead>{t('inventory.filterTriggeredBy')}</TableHead>
              <TableHead>{t('inventory.colReference')}</TableHead>
              <TableHead className="text-right">{t('inventory.colBalanceAfter')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="surface-solid rounded-[1.75rem] p-12 text-center">
        <ArrowLeftRight className="size-10 mx-auto mb-3 text-muted-foreground/50" />
        <h3 className="text-sm font-medium text-muted-foreground">{t('inventory.noMovements')}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('inventory.noMovementsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-solid overflow-hidden rounded-[1.75rem]">
      <Table wrapperClassName="max-h-[calc(100vh-260px)]">
        <TableHeader>
          <TableRow>
            <TableHead>{t('inventory.colDateTime')}</TableHead>
            <TableHead>{t('inventory.colWarehouse')}</TableHead>
            <TableHead>{t('inventory.colSku')}</TableHead>
            <TableHead className="text-right">{t('inventory.colQtyChange')}</TableHead>
            <TableHead>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    {t('orders.colType')}
                    <HelpCircle className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('inventory.tooltipTypeAllocation')}</p>
                    <p>{t('inventory.tooltipTypeShipped')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead>{t('inventory.filterTriggeredBy')}</TableHead>
            <TableHead>{t('inventory.colReference')}</TableHead>
            <TableHead className="text-right">{t('inventory.colBalanceAfter')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="py-3.5 text-sm whitespace-nowrap">
                {format(new Date(movement.created_at), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell className="py-3.5 text-sm font-medium">
                {(() => {
                  const warehouse = fulfillmentToWarehouse(movement.fulfillment_method_name);
                  if (!warehouse) {
                    return <span className="text-muted-foreground">{movement.fulfillment_method_name}</span>;
                  }
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-sm font-medium text-foreground hover:text-primary"
                            onClick={() => handleWarehouseClick(warehouse.id)}
                          >
                            <Building2 className="h-3.5 w-3.5 mr-1.5 inline text-muted-foreground" />
                            {warehouse.name}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{warehouse.name}</span>
                              <span>{getCountryFlag(warehouse.country)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <WarehouseTypeBadge type={warehouse.type} className="text-[10px]" />
                              <span className="text-xs text-muted-foreground">{warehouse.country}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {warehouse.type === 'fba' ? t('inventory.tooltipOwnerMarketplace') : warehouse.type === '3pl' ? t('inventory.tooltipOwner3pl') : t('inventory.tooltipOwnerSeller')}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
              </TableCell>
              <TableCell className="py-3.5">
                <Button
                  variant="ghost"
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => handleSkuClick(movement.sku)}
                >
                  <SkuBadge sku={movement.sku} size="compact" />
                </Button>
              </TableCell>
              <TableCell className="py-3.5 text-right tabular-nums font-medium">
                <span
                  className={cn(
                    movement.qty_change > 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {movement.qty_change > 0 ? '+' : ''}{movement.qty_change}
                </span>
              </TableCell>
              <TableCell className="py-3.5">
                <Badge variant="outline" className="font-normal">
                  {movementTypeLabels[movement.movement_type] || movement.movement_type}
                </Badge>
              </TableCell>
              <TableCell className="py-3.5 text-sm text-muted-foreground">
                {sourceTypeLabels[movement.source_type] || movement.source_type}
              </TableCell>
              <TableCell className="py-3.5">
                <div className="flex items-center gap-2">
                  {movement.source_ref ? (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm font-mono"
                      onClick={() => handleSourceRefClick(movement.source_type, movement.source_ref!)}
                    >
                      {movement.source_ref}
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {movement.batch_id && onBatchClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5"
                      onClick={() => onBatchClick(movement.batch_id!)}
                      title="View batch"
                    >
                      <Layers className="size-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-3.5 text-right tabular-nums text-sm">
                {movement.balance_after !== null ? movement.balance_after : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
