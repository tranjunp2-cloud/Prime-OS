import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  createJobException as createLocalJobException,
  createShipmentForJob as createLocalShipmentForJob,
  createTrackingEvent as createLocalTrackingEvent,
  getExceptionsByJobId as getLocalExceptionsByJobId,
  getFulfillmentJobItemById,
  getFulfillmentJobItems as getLocalFulfillmentJobItems,
  getFulfillmentJobs as getLocalFulfillmentJobs,
  getJobById as getLocalJobById,
  getShipmentById as getLocalShipmentById,
  getShipmentsByJobId as getLocalShipmentsByJobId,
  getTrackingEventsByShipmentId as getLocalTrackingEventsByShipmentId,
  hasLocalJob,
  markShipmentShipped as markLocalShipmentShipped,
  updateFulfillmentJobItem as updateLocalFulfillmentJobItem,
  updateJob as updateLocalJob,
} from '@/lib/fulfillment-store';
import {
  hydrateExceptionsUiModel,
  hydrateFulfillmentJobItemsUiModel,
  hydrateFulfillmentJobUiModel,
  hydrateFulfillmentJobsUiModel,
  hydrateShipmentsUiModel,
  hydrateTrackingEventsUiModel,
  type FulfillmentJobItemUiModel,
  type FulfillmentJobUiModel,
  type ShipmentUiModel,
} from '@/lib/contracts/fulfillment';
import type {
  ExceptionSeverity,
  ExceptionType,
  FulfillmentException,
  FulfillmentJob,
  FulfillmentJobItem,
  JobStatus,
  Shipment,
  ShipmentStatus,
  TrackingEvent,
} from '@/lib/fulfillment-types';

interface JobFilters {
  status?: string;
  warehouseId?: string;
  flowType?: string;
  partnerId?: string;
  search?: string;
}

function isNoRowsError(error: { code?: string } | null) {
  return error?.code === 'PGRST116';
}

function matchesJobSearch(job: FulfillmentJobUiModel, query: string) {
  if (!query) return true;

  return [
    job.display_job_code,
    job.id,
    job.display_order_id,
    job.order?.display_channel_order_ref,
    job.display_customer_name,
    job.display_tracking_number,
    job.fba_shipment_id,
    job.fulfillment_center_id,
  ].some((value) => value?.toLowerCase().includes(query));
}

function getLocalJob(jobId: string) {
  const job = getLocalJobById(jobId);
  return job ? hydrateFulfillmentJobUiModel(job) : null;
}

function getLocalJobsFiltered(filters: JobFilters = {}) {
  const query = filters.search?.trim().toLowerCase() ?? '';

  return hydrateFulfillmentJobsUiModel(getLocalFulfillmentJobs()).filter((job) => {
    const statusMatch = !filters.status || filters.status === 'all' || job.status === filters.status;
    const warehouseMatch = !filters.warehouseId || job.resolved_warehouse_id === filters.warehouseId;
    const flowMatch = !filters.flowType || job.flow_type === filters.flowType;
    const partnerMatch = !filters.partnerId || job.partner_id === filters.partnerId;
    const searchMatch = matchesJobSearch(job, query);

    return statusMatch && warehouseMatch && flowMatch && partnerMatch && searchMatch;
  });
}

export function useFulfillmentJobs(filters: JobFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fulfillment-jobs', filters, user?.id],
    queryFn: async (): Promise<FulfillmentJobUiModel[]> => {
      const localJobs = getLocalJobsFiltered(filters);
      if (!user) return localJobs;

      let query = supabase
        .from('fulfillment_jobs')
        .select(`
          *,
          order:orders!inner(order_id, customer_name, total_amount, channel, status),
          warehouse:warehouses!inner(name, code, is_virtual, type),
          partner:fulfillment_partners(id, name, partner_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.warehouseId) {
        query = query.eq('warehouse_id', filters.warehouseId);
      }
      if (filters.flowType) {
        query = query.eq('flow_type', filters.flowType);
      }
      if (filters.partnerId) {
        query = query.eq('partner_id', filters.partnerId);
      }

      const { data, error } = await query;
      if (error) {
        if (localJobs.length > 0) return localJobs;
        throw error;
      }

      if ((data?.length ?? 0) === 0 && localJobs.length > 0) {
        return localJobs;
      }

      const hydrated = hydrateFulfillmentJobsUiModel((data ?? []) as FulfillmentJob[]);
      const queryText = filters.search?.trim().toLowerCase() ?? '';
      return queryText ? hydrated.filter((job) => matchesJobSearch(job, queryText)) : hydrated;
    },
    enabled: true,
  });
}

export function useFulfillmentJob(jobId: string | undefined) {
  const { user } = useAuth();
  const localJob = jobId ? getLocalJob(jobId) : null;

  return useQuery({
    queryKey: ['fulfillment-job', jobId, user?.id],
    queryFn: async (): Promise<FulfillmentJobUiModel | null> => {
      if (!jobId) return null;
      if (localJob) return localJob;
      if (!user) return null;

      const { data, error } = await supabase
        .from('fulfillment_jobs')
        .select(`
          *,
          order:orders!inner(order_id, customer_name, total_amount, channel, status),
          warehouse:warehouses!inner(name, code, is_virtual, type),
          partner:fulfillment_partners(id, name, partner_type)
        `)
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (localJob && isNoRowsError(error)) return localJob;
        throw error;
      }

      return hydrateFulfillmentJobUiModel(data as FulfillmentJob);
    },
    enabled: !!jobId,
  });
}

export function useFulfillmentJobItems(jobId: string | undefined) {
  const { user } = useAuth();
  const localItems = jobId ? hydrateFulfillmentJobItemsUiModel(getLocalFulfillmentJobItems(jobId)) : [];

  return useQuery({
    queryKey: ['fulfillment-job-items', jobId, user?.id],
    queryFn: async (): Promise<FulfillmentJobItemUiModel[]> => {
      if (!jobId) return [];
      if (localItems.length > 0 || hasLocalJob(jobId)) return localItems;
      if (!user) return [];

      const { data, error } = await supabase
        .from('fulfillment_job_items')
        .select(`
          *,
          sku:skus!inner(id, sku_code, variation_name, product:products!inner(id, title))
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) {
        if (localItems.length > 0) return localItems;
        throw error;
      }

      if ((data?.length ?? 0) === 0 && localItems.length > 0) {
        return localItems;
      }

      return hydrateFulfillmentJobItemsUiModel((data ?? []) as FulfillmentJobItem[]);
    },
    enabled: !!jobId,
  });
}

export function useJobShipments(jobId: string | undefined) {
  const { user } = useAuth();
  const localShipments = jobId ? hydrateShipmentsUiModel(getLocalShipmentsByJobId(jobId)) : [];

  return useQuery({
    queryKey: ['job-shipments', jobId, user?.id],
    queryFn: async (): Promise<ShipmentUiModel[]> => {
      if (!jobId) return [];
      if (localShipments.length > 0 || hasLocalJob(jobId)) return localShipments;
      if (!user) return [];

      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        if (localShipments.length > 0) return localShipments;
        throw error;
      }

      if ((data?.length ?? 0) === 0 && localShipments.length > 0) {
        return localShipments;
      }

      return hydrateShipmentsUiModel((data ?? []) as Shipment[]);
    },
    enabled: !!jobId,
  });
}

export function useTrackingEvents(shipmentId: string | undefined) {
  const localEvents = shipmentId ? getLocalTrackingEventsByShipmentId(shipmentId) : [];

  return useQuery({
    queryKey: ['tracking-events', shipmentId],
    queryFn: async (): Promise<TrackingEvent[]> => {
      if (!shipmentId) return [];
      if (localEvents.length > 0 || getLocalShipmentById(shipmentId)) {
        return hydrateTrackingEventsUiModel(localEvents);
      }

      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('event_time', { ascending: false });

      if (error) {
        if (localEvents.length > 0 || getLocalShipmentById(shipmentId)) return hydrateTrackingEventsUiModel(localEvents);
        throw error;
      }

      if ((data?.length ?? 0) === 0 && localEvents.length > 0) {
        return hydrateTrackingEventsUiModel(localEvents);
      }

      return hydrateTrackingEventsUiModel((data ?? []) as TrackingEvent[]);
    },
    enabled: !!shipmentId,
  });
}

export function useJobExceptions(jobId: string | undefined) {
  const localExceptions = jobId ? getLocalExceptionsByJobId(jobId) : [];

  return useQuery({
    queryKey: ['job-exceptions', jobId],
    queryFn: async (): Promise<FulfillmentException[]> => {
      if (!jobId) return [];
      if (localExceptions.length > 0 || hasLocalJob(jobId)) return hydrateExceptionsUiModel(localExceptions);

      const { data, error } = await supabase
        .from('fulfillment_exceptions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        if (localExceptions.length > 0 || hasLocalJob(jobId)) return hydrateExceptionsUiModel(localExceptions);
        throw error;
      }

      if ((data?.length ?? 0) === 0 && localExceptions.length > 0) {
        return hydrateExceptionsUiModel(localExceptions);
      }

      return hydrateExceptionsUiModel((data ?? []) as FulfillmentException[]);
    },
    enabled: !!jobId,
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: JobStatus }) => {
      if (hasLocalJob(jobId)) {
        const updated = updateLocalJob(jobId, { status });
        if (!updated) throw new Error('Local job not found');
        return updated;
      }

      const { error } = await supabase
        .from('fulfillment_jobs')
        .update({ status })
        .eq('id', jobId);

      if (error) throw error;
      return null;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-jobs'] });
      toast({ title: 'Job status updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update job status', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFulfillmentJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      jobId,
      updates,
    }: {
      jobId: string;
      updates: Partial<FulfillmentJob>;
    }) => {
      const payload = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      ) as Partial<FulfillmentJob>;

      if (hasLocalJob(jobId)) {
        const updated = updateLocalJob(jobId, payload);
        if (!updated) throw new Error('Local job not found');
        return updated;
      }

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('fulfillment_jobs')
        .update(payload)
        .eq('id', jobId)
        .eq('user_id', user.id);

      if (error) throw error;
      return null;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-shipments', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-exceptions', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-jobs'] });
      toast({ title: 'Fulfillment job updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update fulfillment job', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateJobItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ items }: { items: { id: string; picked_qty?: number; packed_qty?: number; status?: string }[] }) => {
      const localItems = items.filter((item) => !!getFulfillmentJobItemById(item.id));

      if (localItems.length > 0) {
        for (const item of localItems) {
          updateLocalFulfillmentJobItem(item.id, {
            picked_qty: item.picked_qty,
            packed_qty: item.packed_qty,
            status: item.status as FulfillmentJobItem['status'] | undefined,
          });
        }
        return;
      }

      for (const item of items) {
        const { error } = await supabase
          .from('fulfillment_job_items')
          .update({
            picked_qty: item.picked_qty,
            packed_qty: item.packed_qty,
            status: item.status,
          })
          .eq('id', item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-job-items'] });
      toast({ title: 'Items updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update items', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      jobId,
      carrierCode,
      trackingNumber,
      serviceLevel,
    }: {
      jobId: string;
      carrierCode: string;
      trackingNumber?: string;
      serviceLevel?: string;
    }) => {
      if (hasLocalJob(jobId)) {
        return createLocalShipmentForJob({ jobId, carrierCode, trackingNumber, serviceLevel });
      }

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          job_id: jobId,
          user_id: user.id,
          carrier_code: carrierCode,
          tracking_number: trackingNumber || null,
          service_level: serviceLevel || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Shipment;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['job-shipments', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-jobs'] });
      toast({ title: 'Shipment created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create shipment', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMarkShipped() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      jobId,
      shipmentId,
      orderId,
      trackingNumber,
    }: {
      jobId: string;
      shipmentId: string;
      orderId: string;
      trackingNumber?: string;
    }) => {
      if (getLocalShipmentById(shipmentId)) {
        return markLocalShipmentShipped({ shipmentId, trackingNumber });
      }

      if (!user) throw new Error('Not authenticated');

      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({
          status: 'shipped' as ShipmentStatus,
          shipped_at: new Date().toISOString(),
          tracking_number: trackingNumber,
        })
        .eq('id', shipmentId);

      if (shipmentError) throw shipmentError;

      const { error: jobError } = await supabase
        .from('fulfillment_jobs')
        .update({ status: 'shipped' as JobStatus })
        .eq('id', jobId);

      if (jobError) throw jobError;

      const { error: eventError } = await supabase
        .from('tracking_events')
        .insert({
          shipment_id: shipmentId,
          event_code: 'shipped',
          event_message: 'Package has been shipped',
          event_time: new Date().toISOString(),
        });

      if (eventError) throw eventError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'shipping',
          tracking_number: trackingNumber || null,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      return null;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job-shipments', jobId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Shipment marked as shipped', description: 'Order status updated to shipping' });
    },
    onError: (error) => {
      toast({ title: 'Failed to mark as shipped', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddTrackingEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      eventCode,
      eventMessage,
    }: {
      shipmentId: string;
      eventCode: string;
      eventMessage: string;
    }) => {
      if (getLocalShipmentById(shipmentId)) {
        return createLocalTrackingEvent({ shipmentId, eventCode, eventMessage });
      }

      const { error } = await supabase
        .from('tracking_events')
        .insert({
          shipment_id: shipmentId,
          event_code: eventCode,
          event_message: eventMessage,
          event_time: new Date().toISOString(),
        });

      if (error) throw error;
      return null;
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tracking-events', shipmentId] });
      toast({ title: 'Tracking event added' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add tracking event', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateException() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      jobId,
      type,
      severity,
      note,
    }: {
      jobId: string;
      type: string;
      severity: string;
      note?: string;
    }) => {
      if (hasLocalJob(jobId)) {
        return createLocalJobException({
          jobId,
          type: type as ExceptionType,
          severity: severity as ExceptionSeverity,
          note,
        });
      }

      const { error } = await supabase
        .from('fulfillment_exceptions')
        .insert({
          job_id: jobId,
          type,
          severity,
          note: note || null,
        });

      if (error) throw error;
      return null;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['job-exceptions', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-jobs'] });
      toast({ title: 'Exception recorded' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create exception', description: error.message, variant: 'destructive' });
    },
  });
}

export function useJobStatusCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fulfillment-job-counts', user?.id],
    queryFn: async () => {
      const localJobs = getLocalFulfillmentJobs();
      if (!user) {
        return buildStatusCounts(localJobs.map((job) => ({ status: job.status })));
      }

      const { data, error } = await supabase
        .from('fulfillment_jobs')
        .select('status')
        .eq('user_id', user.id);

      if (error) {
        if (localJobs.length > 0) {
          return buildStatusCounts(localJobs.map((job) => ({ status: job.status })));
        }
        throw error;
      }

      if ((data?.length ?? 0) === 0 && localJobs.length > 0) {
        return buildStatusCounts(localJobs.map((job) => ({ status: job.status })));
      }

      return buildStatusCounts(data ?? []);
    },
    enabled: true,
  });
}

function buildStatusCounts(jobs: { status: string }[]) {
  const counts: Record<string, number> = {
    all: jobs.length,
    pending: 0,
    picking: 0,
    packed: 0,
    shipped: 0,
    done: 0,
    observing: 0,
    exception: 0,
    cancelled: 0,
  };

  jobs.forEach((job) => {
    if (counts[job.status] !== undefined) {
      counts[job.status]++;
    }
  });

  return counts;
}
