import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryFilters } from '@/components/inventory/InventoryFiltersBar';
import { InventoryPositionRow } from '@/components/inventory/InventorySummaryTable';

interface UseInventoryPositionsResult {
  items: InventoryPositionRow[];
  totalCount: number;
  isLoading: boolean;
  warehouseOptions: Array<{ id: string; name: string }>;
  typeOptions: string[];
  countryOptions: string[];
}

export function useInventoryPositions(filters: InventoryFilters): UseInventoryPositionsResult {
  const { user } = useAuth();

  // Fetch warehouses for dropdown
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch inventory positions with joins
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-positions', filters],
    queryFn: async () => {
      // Build the query
      let query = supabase
        .from('inventory_positions')
        .select(`
          id,
          platform,
          country,
          type,
          available_qty,
          low_stock_threshold,
          sku:skus!inner (
            id,
            sku_code,
            variation_name,
            variation_attributes,
            product_id,
            product:products!inner (
              title
            )
          ),
          warehouse:warehouses!inner (
            id,
            name,
            code
          )
        `)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters.warehouse !== 'all') {
        query = query.eq('warehouse_id', filters.warehouse);
      }

      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters.country !== 'all') {
        query = query.eq('country', filters.country);
      }

      if (filters.lowStockOnly) {
        // Low stock: available_qty > 0 AND available_qty <= low_stock_threshold
        query = query.gt('available_qty', 0);
      }

      const { data: positions, error } = await query;

      if (error) throw error;
      return positions || [];
    },
    enabled: !!user,
  });

  // Transform the data
  const items: InventoryPositionRow[] = (data || [])
    .map((pos) => {
      const sku = pos.sku as {
        id: string;
        sku_code: string;
        variation_name: string | null;
        variation_attributes: Record<string, string> | null;
        product_id: string;
        product: { title: string };
      };
      const warehouse = pos.warehouse as { id: string; name: string; code: string };

      return {
        id: pos.id,
        product_name: sku.product.title,
        product_id: sku.product_id,
        variation_name: sku.variation_name,
        sku_id: sku.id,
        sku_code: sku.sku_code,
        variation_attributes: sku.variation_attributes as Record<string, string> | null,
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        warehouse_code: warehouse.code,
        type: pos.type,
        country: pos.country,
        platform: pos.platform,
        available_qty: pos.available_qty,
        low_stock_threshold: pos.low_stock_threshold,
      };
    })
    .filter((item) => {
      // Apply search filter client-side
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesProduct = item.product_name.toLowerCase().includes(searchLower);
        const matchesSku = item.sku_code.toLowerCase().includes(searchLower);
        if (!matchesProduct && !matchesSku) return false;
      }

      // Apply low stock filter (must check threshold per row)
      if (filters.lowStockOnly) {
        if (item.available_qty > item.low_stock_threshold) return false;
      }

      return true;
    });

  // Extract unique type and country options from data
  const typeOptions = Array.from(new Set((data || []).map((p) => p.type))).filter(Boolean);
  const countryOptions = Array.from(new Set((data || []).map((p) => p.country))).filter(Boolean);

  return {
    items,
    totalCount: items.length,
    isLoading,
    warehouseOptions: warehouses.map((w) => ({ id: w.id, name: w.name })),
    typeOptions: typeOptions.length > 0 ? typeOptions : ['own', '3pl', 'marketplace'],
    countryOptions: countryOptions.length > 0 ? countryOptions : ['JP', 'US'],
  };
}
