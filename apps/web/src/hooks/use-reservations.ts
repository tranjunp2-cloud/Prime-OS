import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReservationStatus = 'reserved' | 'released' | 'consumed' | 'expired';

interface ReservationFilters {
  status?: ReservationStatus;
  warehouseId?: string;
  skuId?: string;
}

export function useReservations(filters: ReservationFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reservations', filters, user?.id],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('inventory_reservations')
        .select(`
          *,
          sku:skus(sku_code, product:products(title)),
          warehouse:warehouses(name, code),
          order:orders(order_id, customer_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.status) q = q.eq('status', filters.status);
      if (filters.warehouseId) q = q.eq('warehouse_id', filters.warehouseId);
      if (filters.skuId) q = q.eq('sku_id', filters.skuId);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ skuId, warehouseId, orderId, quantity }: {
      skuId: string; warehouseId: string; orderId: string; quantity: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('inventory_reservations')
        .insert({
          sku_id: skuId,
          warehouse_id: warehouseId,
          order_id: orderId,
          quantity,
          status: 'reserved',
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: 'released' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useConsumeReservation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: 'consumed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useReservationCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reservation-counts', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase
        .from('inventory_reservations')
        .select('status')
        .eq('user_id', user.id);
      if (error) throw error;
      const counts: Record<string, number> = { all: data.length, reserved: 0, consumed: 0, released: 0, failed: 0 };
      data.forEach((r: { status: string }) => { if (r.status in counts) counts[r.status]++; });
      return counts;
    },
    enabled: !!user,
  });
}
