import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Search, Building2, Package, Truck, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { WarehouseTypeBadge } from './WarehouseTypeBadge';
import { VirtualWarehouseBadge } from './VirtualWarehouseBadge';
import { supabase } from '@/integrations/supabase/client';
import { getCountryFlag } from '@/lib/country-flags';

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  country: string;
  type: 'own' | 'fba' | '3pl';
  status: string;
  tags?: string[];
  isVirtual?: boolean;
  adjustmentAllowed?: 'yes' | 'limited' | 'no';
}

interface WarehouseSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  showTypeBadge?: boolean;
  filterTypes?: ('own' | 'fba' | '3pl')[];
  disabled?: boolean;
  excludeTransit?: boolean;
  className?: string;
}

const getWarehouseTypeConfig = (type: string, tags?: string[]) => {
  const isReturn = tags?.includes('Return');
  const isTransit = tags?.includes('Transit');
  
  if (isTransit) {
    return { label: 'Transit', adjustmentAllowed: 'no' as const, icon: Truck };
  }
  if (isReturn) {
    return { label: 'Return Center', adjustmentAllowed: 'yes' as const, icon: RotateCcw };
  }
  
  switch (type) {
    case 'own':
      return { label: 'In-house', adjustmentAllowed: 'yes' as const, icon: Building2 };
    case '3pl':
      return { label: '3PL', adjustmentAllowed: 'yes' as const, icon: Package };
    case 'fba':
      return { label: 'Marketplace', adjustmentAllowed: 'limited' as const, icon: Package };
    default:
      return { label: 'Unknown', adjustmentAllowed: 'no' as const, icon: Building2 };
  }
};

export function WarehouseSelector({
  value,
  onChange,
  multiple = false,
  placeholder = 'Select warehouse',
  showTypeBadge = true,
  filterTypes,
  disabled = false,
  excludeTransit = false,
  className,
}: WarehouseSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses-for-selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      return data.map((wh) => ({
        ...wh,
        type: wh.type as 'own' | 'fba' | '3pl',
        isVirtual: wh.type === 'fba',
        adjustmentAllowed: getWarehouseTypeConfig(wh.type, wh.tags || []).adjustmentAllowed,
      })) as WarehouseOption[];
    },
  });

  const filteredWarehouses = useMemo(() => {
    let result = warehouses;
    
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((wh) => filterTypes.includes(wh.type));
    }
    
    if (excludeTransit) {
      result = result.filter((wh) => !wh.tags?.includes('Transit'));
    }
    
    return result;
  }, [warehouses, filterTypes, excludeTransit]);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  
  const selectedWarehouses = useMemo(() => {
    return filteredWarehouses.filter((wh) => selectedValues.includes(wh.id));
  }, [filteredWarehouses, selectedValues]);

  const handleSelect = (warehouseId: string) => {
    if (multiple) {
      const newValue = selectedValues.includes(warehouseId)
        ? selectedValues.filter((id) => id !== warehouseId)
        : [...selectedValues, warehouseId];
      onChange(newValue);
    } else {
      onChange(warehouseId);
      setOpen(false);
    }
  };

  const getDisplayText = () => {
    if (selectedWarehouses.length === 0) return placeholder;
    if (selectedWarehouses.length === 1) return selectedWarehouses[0].name;
    return `${selectedWarehouses.length} warehouses selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', className)}
          disabled={disabled || isLoading}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search warehouses..." />
          <CommandList>
            <CommandEmpty>No warehouse found.</CommandEmpty>
            <CommandGroup>
              {filteredWarehouses.map((warehouse) => {
                const typeConfig = getWarehouseTypeConfig(warehouse.type, warehouse.tags || []);
                const TypeIcon = typeConfig.icon;
                const isSelected = selectedValues.includes(warehouse.id);
                const isTransit = warehouse.tags?.includes('Transit');
                
                return (
                  <CommandItem
                    key={warehouse.id}
                    value={`${warehouse.name} ${warehouse.code}`}
                    onSelect={() => !isTransit && handleSelect(warehouse.id)}
                    disabled={isTransit}
                    className={cn(
                      'flex items-center gap-2 py-2',
                      isTransit && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <TypeIcon className="size-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{warehouse.name}</span>
                        <span className="text-xs text-muted-foreground">{getCountryFlag(warehouse.country)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {showTypeBadge && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1 py-0 h-4',
                              warehouse.type === 'own' && 'border-primary/50 text-primary dark:text-blue-300',
                              warehouse.type === '3pl' && 'border-purple-300 text-purple-700 dark:text-purple-300',
                              warehouse.type === 'fba' && 'border-orange-300 text-orange-700 dark:text-orange-300'
                            )}
                          >
                            {typeConfig.label}
                          </Badge>
                        )}
                        {warehouse.isVirtual && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-warning/50 text-warning dark:text-amber-300">
                            Virtual
                          </Badge>
                        )}
                        {typeConfig.adjustmentAllowed === 'limited' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-warning/50 text-warning">
                            Limited
                          </Badge>
                        )}
                        {typeConfig.adjustmentAllowed === 'no' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-destructive/50 text-destructive">
                            No Adjust
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simplified version for filters (multi-select with "All" option)
interface WarehouseFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

export function WarehouseFilter({ value, onChange, className }: WarehouseFilterProps) {
  const [open, setOpen] = useState(false);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      return data.map((wh) => ({
        ...wh,
        type: wh.type as 'own' | 'fba' | '3pl',
        isVirtual: wh.type === 'fba',
      })) as WarehouseOption[];
    },
  });

  const selectedWarehouses = useMemo(() => {
    return warehouses.filter((wh) => value.includes(wh.id));
  }, [warehouses, value]);

  const handleSelect = (warehouseId: string) => {
    const newValue = value.includes(warehouseId)
      ? value.filter((id) => id !== warehouseId)
      : [...value, warehouseId];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (value.length === 0) return 'All Warehouses';
    if (selectedWarehouses.length === 1) return selectedWarehouses[0].name;
    return `${selectedWarehouses.length} warehouses`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal h-9', className)}
          disabled={isLoading}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search warehouses..." />
          <CommandList>
            <CommandEmpty>No warehouse found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={handleSelectAll}
                className="flex items-center gap-2 py-2"
              >
                <Check
                  className={cn(
                    'size-4',
                    value.length === 0 ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="font-medium">All Warehouses</span>
              </CommandItem>
              {warehouses.map((warehouse) => {
                const typeConfig = getWarehouseTypeConfig(warehouse.type, warehouse.tags || []);
                const TypeIcon = typeConfig.icon;
                const isSelected = value.includes(warehouse.id);
                
                return (
                  <CommandItem
                    key={warehouse.id}
                    value={`${warehouse.name} ${warehouse.code}`}
                    onSelect={() => handleSelect(warehouse.id)}
                    className="flex items-center gap-2 py-2"
                  >
                    <Check
                      className={cn(
                        'size-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <TypeIcon className="size-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{warehouse.name}</span>
                        <span className="text-xs text-muted-foreground">{getCountryFlag(warehouse.country)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1 py-0 h-4',
                            warehouse.type === 'own' && 'border-primary/50 text-primary dark:text-blue-300',
                            warehouse.type === '3pl' && 'border-purple-300 text-purple-700 dark:text-purple-300',
                            warehouse.type === 'fba' && 'border-orange-300 text-orange-700 dark:text-orange-300'
                          )}
                        >
                          {typeConfig.label}
                        </Badge>
                        {warehouse.isVirtual && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-warning/50 text-warning dark:text-amber-300">
                            Virtual
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
