import { Search, Calendar, Warehouse } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { FiltersBar } from '@/components/system/FiltersBar';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useI18n } from '@/lib/i18n/I18nContext';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface OrderFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  channelFilter: string;
  onChannelChange: (value: string) => void;
  warehouseFilter: string;
  onWarehouseChange: (value: string) => void;
  warehouses: WarehouseOption[];
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function OrderFilters({
  searchQuery,
  onSearchChange,
  channelFilter,
  onChannelChange,
  warehouseFilter,
  onWarehouseChange,
  warehouses,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
}: OrderFiltersProps) {
  const { t } = useI18n();

  return (
    <FiltersBar
      actions={
        hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            {t('orders.clearFilters')}
          </Button>
        )
      }
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t('orders.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Channel Filter */}
      <Select value={channelFilter} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('orders.channel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('orders.allChannels')}</SelectItem>
          <SelectItem value="amazon">Amazon</SelectItem>
          <SelectItem value="shopee">Shopee</SelectItem>
          <SelectItem value="rakuten">Rakuten</SelectItem>
        </SelectContent>
      </Select>

      {/* Warehouse Filter */}
      <Select value={warehouseFilter} onValueChange={onWarehouseChange}>
        <SelectTrigger className="w-[180px]">
          <div className="flex items-center gap-2">
            <Warehouse className="size-4" />
            <SelectValue placeholder={t('orders.allWarehouses')} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('orders.allWarehouses')}</SelectItem>
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id}>
              {wh.name} ({wh.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="size-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                </>
              ) : (
                format(dateRange.from, 'MMM d, yyyy')
              )
            ) : (
              t('orders.dateRange')
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </FiltersBar>
  );
}
