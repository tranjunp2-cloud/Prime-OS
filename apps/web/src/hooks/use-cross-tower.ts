import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { DomainEvent, InventoryEventLedger, ShipmentEvent } from '@/lib/cross-tower-types';

// ===== Domain Events Hook =====
export function useDomainEvents(aggregateType: string, aggregateId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['domain-events', aggregateType, aggregateId],
    queryFn: async () => {
      if (!user || !aggregateId) return [];

      const { data, error } = await supabase
        .from('domain_events')
        .select('*')
        .eq('aggregate_type', aggregateType)
        .eq('aggregate_id', aggregateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DomainEvent[];
    },
    enabled: !!user && !!aggregateId,
  });
}

export function useAddDomainEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventName,
      aggregateType,
      aggregateId,
      payload,
    }: {
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('domain_events').insert([{
        user_id: user.id,
        event_name: eventName,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        payload: (payload || null) as never,
      }]);

      if (error) throw error;
    },
    onSuccess: (_, { aggregateType, aggregateId }) => {
      queryClient.invalidateQueries({ queryKey: ['domain-events', aggregateType, aggregateId] });
    },
  });
}

// ===== Inventory Ledger Hook =====
export function useInventoryLedger(skuId?: string, warehouseId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-ledger', skuId, warehouseId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('inventory_events_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (skuId) query = query.eq('sku_id', skuId);
      if (warehouseId) query = query.eq('warehouse_id', warehouseId);

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryEventLedger[];
    },
    enabled: !!user,
  });
}

export function useAddInventoryEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventType,
      refType,
      refId,
      skuId,
      warehouseId,
      delta,
      metadata,
    }: {
      eventType: string;
      refType: string;
      refId?: string;
      skuId?: string;
      warehouseId?: string;
      delta: Record<string, number>;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('inventory_events_ledger').insert([{
        user_id: user.id,
        event_type: eventType,
        ref_type: refType,
        ref_id: refId || null,
        sku_id: skuId || null,
        warehouse_id: warehouseId || null,
        delta: delta as never,
        metadata: (metadata || null) as never,
      }]);

      if (error) throw error;
    },
    onSuccess: (_, { skuId, warehouseId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger', skuId, warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-positions'] });
    },
  });
}

// ===== Shipment Events Hook =====
export function useShipmentEvents(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-events', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];

      const { data, error } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('event_time', { ascending: false });

      if (error) throw error;
      return data as ShipmentEvent[];
    },
    enabled: !!shipmentId,
  });
}

export function useAddShipmentEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      eventType,
      message,
      location,
    }: {
      shipmentId: string;
      eventType: string;
      message?: string;
      location?: string;
    }) => {
      const { error } = await supabase.from('shipment_events').insert({
        shipment_id: shipmentId,
        event_type: eventType,
        event_time: new Date().toISOString(),
        message: message || null,
        location: location || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-events', shipmentId] });
    },
  });
}

// ===== Cross-Tower Order Flow =====
export function useOrderToShipFlow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const addDomainEvent = useAddDomainEvent();
  const addInventoryEvent = useAddInventoryEvent();

  // Complete ship action: updates inventory, creates events
  const markShippedWithDeduct = useMutation({
    mutationFn: async ({
      orderId,
      jobId,
      shipmentId,
      items,
      warehouseId,
      trackingNumber,
    }: {
      orderId: string;
      jobId: string;
      shipmentId: string;
      items: { skuId: string; qty: number }[];
      warehouseId: string;
      trackingNumber?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Update shipment
      await supabase
        .from('shipments')
        .update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
          tracking_number: trackingNumber,
        })
        .eq('id', shipmentId);

      // 2. Update job
      await supabase
        .from('fulfillment_jobs')
        .update({ status: 'shipped' })
        .eq('id', jobId);

      // 3. Update order
      await supabase
        .from('orders')
        .update({
          status: 'shipping',
          lifecycle_stage: 'shipped',
          tracking_number: trackingNumber,
        })
        .eq('id', orderId);

      // 4. Consume reservations
      await supabase
        .from('inventory_reservations')
        .update({ status: 'consumed' })
        .eq('order_id', orderId)
        .eq('status', 'reserved');

      // 5. Deduct inventory and log events
      for (const item of items) {
        // Update position
        const { data: pos } = await supabase
          .from('inventory_positions')
          .select('on_hand_qty, reserved_qty')
          .eq('sku_id', item.skuId)
          .eq('warehouse_id', warehouseId)
          .single();

        if (pos) {
          await supabase
            .from('inventory_positions')
            .update({
              on_hand_qty: pos.on_hand_qty - item.qty,
              reserved_qty: Math.max(0, pos.reserved_qty - item.qty),
            })
            .eq('sku_id', item.skuId)
            .eq('warehouse_id', warehouseId);
        }

        // Log inventory event
        await supabase.from('inventory_events_ledger').insert({
          user_id: user.id,
          event_type: 'deduct_on_ship',
          ref_type: 'shipment',
          ref_id: shipmentId,
          sku_id: item.skuId,
          warehouse_id: warehouseId,
          delta: { on_hand_qty: -item.qty, reserved_qty: -item.qty },
        });
      }

      // 6. Add shipment event
      await supabase.from('shipment_events').insert({
        shipment_id: shipmentId,
        event_type: 'picked_up',
        event_time: new Date().toISOString(),
        message: 'Package shipped and inventory deducted',
      });

      // 7. Add domain event
      await supabase.from('domain_events').insert({
        user_id: user.id,
        event_name: 'shipment_shipped',
        aggregate_type: 'shipment',
        aggregate_id: shipmentId,
        payload: { order_id: orderId, job_id: jobId, tracking_number: trackingNumber },
      });

      // 8. Add order event
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: 'shipped',
        message: `Order shipped with tracking: ${trackingNumber || 'N/A'}`,
        actor_type: 'system',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-positions'] });
      toast({ title: 'Shipped', description: 'Order shipped and inventory deducted' });
    },
    onError: (error) => {
      toast({ title: 'Ship failed', description: error.message, variant: 'destructive' });
    },
  });

  return { markShippedWithDeduct };
}

// ===== Returns QC Flow =====
export function useReturnQCFlow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const processQC = useMutation({
    mutationFn: async ({
      returnId,
      returnLineId,
      skuId,
      warehouseId,
      qty,
      outcome,
      disposition,
    }: {
      returnId: string;
      returnLineId: string;
      skuId: string;
      warehouseId: string;
      qty: number;
      outcome: 'pass' | 'fail';
      disposition: 'restock' | 'unfulfillable' | 'scrap';
    }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Update return line
      await supabase
        .from('return_lines')
        .update({ qc_outcome: outcome, disposition })
        .eq('id', returnLineId);

      // 2. Update inventory based on disposition
      if (disposition === 'restock') {
        // Increase on_hand
        const { data: pos } = await supabase
          .from('inventory_positions')
          .select('on_hand_qty, available_qty')
          .eq('sku_id', skuId)
          .eq('warehouse_id', warehouseId)
          .single();

        if (pos) {
          await supabase
            .from('inventory_positions')
            .update({
              on_hand_qty: pos.on_hand_qty + qty,
              available_qty: pos.available_qty + qty,
            })
            .eq('sku_id', skuId)
            .eq('warehouse_id', warehouseId);
        }

        // Log event
        await supabase.from('inventory_events_ledger').insert({
          user_id: user.id,
          event_type: 'qc_pass',
          ref_type: 'return',
          ref_id: returnId,
          sku_id: skuId,
          warehouse_id: warehouseId,
          delta: { on_hand_qty: qty, available_qty: qty },
        });
      } else if (disposition === 'unfulfillable') {
        // Increase damaged bucket
        const { data: pos } = await supabase
          .from('inventory_positions')
          .select('damaged_qty')
          .eq('sku_id', skuId)
          .eq('warehouse_id', warehouseId)
          .single();

        if (pos) {
          await supabase
            .from('inventory_positions')
            .update({ damaged_qty: (pos.damaged_qty || 0) + qty })
            .eq('sku_id', skuId)
            .eq('warehouse_id', warehouseId);
        }

        // Log event
        await supabase.from('inventory_events_ledger').insert({
          user_id: user.id,
          event_type: 'qc_fail',
          ref_type: 'return',
          ref_id: returnId,
          sku_id: skuId,
          warehouse_id: warehouseId,
          delta: { damaged_qty: qty },
        });
      }

      // 3. Add domain event
      await supabase.from('domain_events').insert({
        user_id: user.id,
        event_name: outcome === 'pass' ? 'inventory_restocked' : 'inventory_unfulfillable',
        aggregate_type: 'return',
        aggregate_id: returnId,
        payload: { sku_id: skuId, qty, disposition },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-positions'] });
      toast({ title: 'QC Processed', description: 'Return item processed and inventory updated' });
    },
    onError: (error) => {
      toast({ title: 'QC Failed', description: error.message, variant: 'destructive' });
    },
  });

  return { processQC };
}

// ===== Partners Hook =====
export function usePartners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['partners', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
