import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WarehouseTypeBadge } from './WarehouseTypeBadge';
import { WarehouseStatusBadge } from './WarehouseStatusBadge';
import { WarehouseCapabilityBadges } from './WarehouseCapabilityBadge';
import { VirtualWarehouseBadge, MarketplaceSyncBadge } from './VirtualWarehouseBadge';
import { getCountryFlag } from '@/lib/country-flags';
import { Pencil, Trash2, ChevronRight, MapPinOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';
import { resolveGeoCoordinates } from '@/lib/map/coordinates';
import { getLocalizedCountryName } from '@/lib/i18n/format';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  country: string;
  type: 'own' | 'fba' | '3pl';
  status: 'active' | 'inactive';
  tags: string[];
  address: string | null;
  fulfillment_type_mapping: string | null;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
  prefecture: string | null;
  city: string | null;
  postal_code: string | null;
  is_virtual: boolean;
  sync_status: string | null;
  sync_source: string | null;
  last_synced_at: string | null;
  map_x: number | null;
  map_y: number | null;
}

interface WarehouseTableProps {
  warehouses: Warehouse[];
  isLoading?: boolean;
  onEdit?: (warehouse: Warehouse) => void;
  onDelete?: (warehouse: Warehouse) => void;
  onRowClick?: (warehouse: Warehouse) => void;
  selectedWarehouseId?: string | null;
}

export function WarehouseTable({
  warehouses,
  isLoading,
  onEdit,
  onDelete,
  onRowClick,
  selectedWarehouseId,
}: WarehouseTableProps) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();

  const handleRowClick = (warehouse: Warehouse) => {
    if (onRowClick) {
      onRowClick(warehouse);
    } else {
      navigate(`/ecom/cos/warehouses?warehouse=${encodeURIComponent(warehouse.id)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[82px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-edge-divider/70 bg-surface-data/88 px-6 text-center text-muted-foreground">
        <div>
          <p className="text-sm text-foreground">{t('warehouses.noWarehouses')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('warehouses.addFirstWarehouse')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-solid overflow-hidden rounded-lg">
      <Table wrapperClassName="max-h-[calc(100vh-310px)]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[270px]">{t('warehouses.title')}</TableHead>
            <TableHead className="min-w-[156px]">{t('warehouses.colCountry')}</TableHead>
            <TableHead className="min-w-[130px]">{t('warehouses.colType')}</TableHead>
            <TableHead className="min-w-[120px]">{t('warehouses.colStatus')}</TableHead>
            <TableHead className="min-w-[180px]">{t('warehouses.colTags')}</TableHead>
            <TableHead className="min-w-[140px] text-right">{t('warehouses.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => {
            const isVirtual = warehouse.is_virtual || warehouse.type === 'fba';
            const hasMapLocation = (() => {
              const geo = resolveGeoCoordinates({
                lat: warehouse.lat,
                lng: warehouse.lng,
                map_x: warehouse.map_x,
                map_y: warehouse.map_y,
              });
              return geo !== null;
            })();
            const isSelected = warehouse.id === selectedWarehouseId;
            const localizedCountry = getLocalizedCountryName(locale, warehouse.country, warehouse.country);

            return (
              <TableRow
                key={warehouse.id}
                className={cn(
                  'group/warehouse cursor-pointer',
                  isSelected &&
                    'bg-surface-selected/92 shadow-[inset_3px_0_0_0_hsl(var(--primary)),inset_0_1px_0_hsl(var(--border-highlight)/0.05)] hover:bg-surface-selected/92'
                )}
                onClick={() => handleRowClick(warehouse)}
              >
                <TableCell className="py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{warehouse.name}</span>
                        {isVirtual && <VirtualWarehouseBadge size="sm" showLabel={false} />}
                        {!hasMapLocation && (
                          <Badge variant="outline" className="border-warning/28 bg-warning/10 text-warning">
                            <MapPinOff className="size-3" />
                            {t('warehouses.noMapPin')}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">{warehouse.code}</span>
                        {isVirtual && <MarketplaceSyncBadge />}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 whitespace-nowrap">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 text-lg">{getCountryFlag(warehouse.country)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{localizedCountry}</div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{warehouse.country}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 whitespace-nowrap">
                  <WarehouseTypeBadge type={warehouse.type} />
                </TableCell>
                <TableCell className="py-3.5 whitespace-nowrap">
                  <WarehouseStatusBadge status={warehouse.status} />
                </TableCell>
                <TableCell className="py-3.5">
                  <WarehouseCapabilityBadges tags={warehouse.tags || []} maxVisible={2} className="max-w-[240px]" />
                </TableCell>
                <TableCell className="py-3.5 text-right">
                  <div
                    className="flex justify-end gap-1.5 opacity-75 transition-opacity duration-150 group-hover/warehouse:opacity-100 group-focus-within/warehouse:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onEdit && !isVirtual && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(warehouse)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {onDelete && !isVirtual && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(warehouse)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => handleRowClick(warehouse)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
