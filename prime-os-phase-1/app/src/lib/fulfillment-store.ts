// Fulfillment Store — singleton in-memory for local mockup
// Replaces Supabase queries for fulfillment jobs and related records in demo mode.

import {
  type CarrierCode,
  type ExceptionSeverity,
  type ExceptionType,
  type FbaInboundStatus,
  type FbaPrepStatus,
  type FlowType,
  type FulfillmentException,
  type FulfillmentJob,
  type FulfillmentJobItem,
  type JobItemStatus,
  type JobStatus,
  type Priority,
  type Shipment,
  type ShipmentStatus,
  type TrackingEvent,
} from './fulfillment-types';
import { getOrderById, updateOrder } from './order-store';
import { getResolvedProductSkuById } from './product-store';
import { getWarehouseById } from './warehouse-store';

export type { FlowType, JobStatus, Priority };
export type { FulfillmentJob };
export { FLOW_TYPE_COLORS, FLOW_TYPE_LABELS } from './fulfillment-types';

const LOCAL_PARTNERS = {
  partner_3plvn: {
    id: 'partner_3plvn',
    name: 'Vietnam 3PL Partner',
    partner_type: '3pl',
  },
} as const;

let _jobs: FulfillmentJob[] = [];
let _jobItems: FulfillmentJobItem[] = [];
let _shipments: Shipment[] = [];
let _trackingEvents: TrackingEvent[] = [];
let _exceptions: FulfillmentException[] = [];

function nowIso() {
  return new Date().toISOString();
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortDescByCreatedAt<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  ));
}

function sortAscByCreatedAt<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => (
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  ));
}

function getLocalPartner(partnerId: string | null) {
  if (!partnerId) return null;
  return LOCAL_PARTNERS[partnerId as keyof typeof LOCAL_PARTNERS] ?? null;
}

function hydrateJob(job: FulfillmentJob): FulfillmentJob {
  const order = getOrderById(job.order_id);
  const warehouse = job.warehouse_id ? getWarehouseById(job.warehouse_id) : null;
  const partner = getLocalPartner(job.partner_id);

  return {
    ...job,
    order: order ? {
      order_id: order.order_id,
      customer_name: order.customer_name ?? 'Unknown Customer',
      total_amount: order.total_amount,
      channel: order.channel,
    } : job.order,
    warehouse: warehouse ? {
      name: warehouse.name,
      code: warehouse.code,
      is_virtual: warehouse.is_virtual,
      type: warehouse.type,
    } : job.warehouse,
    partner: partner ?? job.partner ?? null,
  };
}

function hydrateJobItem(item: FulfillmentJobItem): FulfillmentJobItem {
  const resolved = getResolvedProductSkuById(item.sku_id);
  if (!resolved) return item;

  return {
    ...item,
    sku: {
      sku_code: resolved.sku.sku_code,
      variation_name: resolved.sku.variation_name ?? null,
      product: {
        title: resolved.product.name,
      },
    },
    sku_code: resolved.sku.sku_code,
    product_name: resolved.product.name,
  };
}

function applyJobStatusTransition(job: FulfillmentJob, updates: Partial<FulfillmentJob>): Partial<FulfillmentJob> {
  const nextStatus = updates.status;
  if (!nextStatus || nextStatus === job.status) return updates;

  const timestamp = nowIso();
  const transitionUpdates: Partial<FulfillmentJob> = { ...updates };

  if (nextStatus === 'packed') {
    transitionUpdates.picked_at = job.picked_at ?? timestamp;
    transitionUpdates.packed_at = timestamp;
  } else if (nextStatus === 'shipped') {
    transitionUpdates.picked_at = job.picked_at ?? timestamp;
    transitionUpdates.packed_at = job.packed_at ?? timestamp;
    transitionUpdates.shipped_at = timestamp;
  } else if (nextStatus === 'done') {
    transitionUpdates.picked_at = job.picked_at ?? timestamp;
    transitionUpdates.packed_at = job.packed_at ?? timestamp;
    transitionUpdates.shipped_at = job.shipped_at ?? timestamp;
  }

  return transitionUpdates;
}

export function getFulfillmentJobs(): FulfillmentJob[] {
  return sortDescByCreatedAt(_jobs).map(hydrateJob);
}

export function getJobById(id: string): FulfillmentJob | undefined {
  const job = _jobs.find((candidate) => candidate.id === id);
  return job ? hydrateJob(job) : undefined;
}

export function hasLocalJob(id: string): boolean {
  return _jobs.some((candidate) => candidate.id === id);
}

export function addFulfillmentJob(job: FulfillmentJob): void {
  _jobs = [job, ..._jobs];
}

export function updateJob(id: string, updates: Partial<FulfillmentJob>): FulfillmentJob | undefined {
  let updated: FulfillmentJob | undefined;

  _jobs = _jobs.map((job) => {
    if (job.id !== id) return job;

    const nextJob = {
      ...job,
      ...applyJobStatusTransition(job, updates),
      updated_at: nowIso(),
    };
    updated = nextJob;
    return nextJob;
  });

  return updated ? hydrateJob(updated) : undefined;
}

export function deleteJob(id: string): void {
  const shipmentIds = _shipments.filter((shipment) => shipment.job_id === id).map((shipment) => shipment.id);

  _jobs = _jobs.filter((job) => job.id !== id);
  _jobItems = _jobItems.filter((item) => item.job_id !== id);
  _shipments = _shipments.filter((shipment) => shipment.job_id !== id);
  _trackingEvents = _trackingEvents.filter((event) => !shipmentIds.includes(event.shipment_id));
  _exceptions = _exceptions.filter((exception) => exception.job_id !== id);
}

export function getFulfillmentJobItems(jobId: string): FulfillmentJobItem[] {
  return sortAscByCreatedAt(_jobItems.filter((item) => item.job_id === jobId)).map(hydrateJobItem);
}

export function getFulfillmentJobItemById(id: string): FulfillmentJobItem | undefined {
  const item = _jobItems.find((candidate) => candidate.id === id);
  return item ? hydrateJobItem(item) : undefined;
}

export function addFulfillmentJobItem(item: FulfillmentJobItem): void {
  _jobItems = [..._jobItems, item];
}

export function updateFulfillmentJobItem(id: string, updates: Partial<FulfillmentJobItem>): FulfillmentJobItem | undefined {
  let updated: FulfillmentJobItem | undefined;

  _jobItems = _jobItems.map((item) => {
    if (item.id !== id) return item;

    const nextItem = {
      ...item,
      ...updates,
      updated_at: nowIso(),
    };
    updated = nextItem;
    return nextItem;
  });

  return updated ? hydrateJobItem(updated) : undefined;
}

export function deleteFulfillmentJobItem(id: string): void {
  _jobItems = _jobItems.filter((item) => item.id !== id);
}

export function getShipmentsByJobId(jobId: string): Shipment[] {
  return sortDescByCreatedAt(_shipments.filter((shipment) => shipment.job_id === jobId));
}

export function getShipmentById(id: string): Shipment | undefined {
  return _shipments.find((shipment) => shipment.id === id);
}

export function addShipment(shipment: Shipment): void {
  _shipments = [shipment, ..._shipments];
}

export function createShipmentForJob({
  jobId,
  carrierCode,
  trackingNumber,
  serviceLevel,
  status = 'draft',
}: {
  jobId: string;
  carrierCode: string;
  trackingNumber?: string;
  serviceLevel?: string;
  status?: ShipmentStatus;
}): Shipment {
  const job = _jobs.find((candidate) => candidate.id === jobId);
  if (!job) {
    throw new Error('Job not found in local fulfillment store');
  }

  const timestamp = nowIso();
  const shipment: Shipment = {
    id: genId('ship'),
    job_id: jobId,
    user_id: job.user_id,
    carrier_code: carrierCode,
    service_level: serviceLevel ?? null,
    tracking_number: trackingNumber ?? null,
    label_url: null,
    shipped_at: status === 'shipped' || status === 'delivered' ? timestamp : null,
    status,
    created_at: timestamp,
    updated_at: timestamp,
  };

  addShipment(shipment);
  updateJob(jobId, {
    carrier: carrierCode as CarrierCode | string,
    tracking_number: trackingNumber ?? job.tracking_number ?? null,
  });

  return shipment;
}

export function updateShipment(id: string, updates: Partial<Shipment>): Shipment | undefined {
  let updated: Shipment | undefined;

  _shipments = _shipments.map((shipment) => {
    if (shipment.id !== id) return shipment;

    const nextShipment = {
      ...shipment,
      ...updates,
      updated_at: nowIso(),
    };
    updated = nextShipment;
    return nextShipment;
  });

  return updated;
}

export function markShipmentShipped({
  shipmentId,
  trackingNumber,
}: {
  shipmentId: string;
  trackingNumber?: string;
}): Shipment {
  const shipment = getShipmentById(shipmentId);
  if (!shipment) {
    throw new Error('Shipment not found in local fulfillment store');
  }

  const timestamp = nowIso();
  const nextTracking = trackingNumber ?? shipment.tracking_number ?? null;
  const updatedShipment = updateShipment(shipmentId, {
    status: 'shipped',
    shipped_at: timestamp,
    tracking_number: nextTracking,
  });

  if (!updatedShipment) {
    throw new Error('Failed to update local shipment');
  }

  updateJob(shipment.job_id, {
    status: 'shipped',
    shipped_at: timestamp,
    carrier: updatedShipment.carrier_code,
    tracking_number: nextTracking,
  });

  const job = _jobs.find((candidate) => candidate.id === shipment.job_id);
  if (job) {
    updateOrder(job.order_id, {
      status: 'shipped',
      shipped_at: timestamp,
    });
  }

  createTrackingEvent({
    shipmentId,
    eventCode: 'shipped',
    eventMessage: nextTracking
      ? `Package marked as shipped with tracking ${nextTracking}.`
      : 'Package marked as shipped.',
    eventTime: timestamp,
  });

  return updatedShipment;
}

export function deleteShipment(id: string): void {
  _shipments = _shipments.filter((shipment) => shipment.id !== id);
  _trackingEvents = _trackingEvents.filter((event) => event.shipment_id !== id);
}

export function getTrackingEventsByShipmentId(shipmentId: string): TrackingEvent[] {
  return [..._trackingEvents]
    .filter((event) => event.shipment_id === shipmentId)
    .sort((left, right) => new Date(right.event_time).getTime() - new Date(left.event_time).getTime());
}

export function addTrackingEvent(event: TrackingEvent): void {
  _trackingEvents = [event, ..._trackingEvents];
}

export function createTrackingEvent({
  shipmentId,
  eventCode,
  eventMessage,
  eventTime,
}: {
  shipmentId: string;
  eventCode: string;
  eventMessage: string;
  eventTime?: string;
}): TrackingEvent {
  const trackingEvent: TrackingEvent = {
    id: genId('trk'),
    shipment_id: shipmentId,
    event_code: eventCode,
    event_message: eventMessage,
    event_time: eventTime ?? nowIso(),
    raw_payload: null,
    created_at: nowIso(),
  };

  addTrackingEvent(trackingEvent);
  return trackingEvent;
}

export function deleteTrackingEvent(id: string): void {
  _trackingEvents = _trackingEvents.filter((event) => event.id !== id);
}

export function getExceptionsByJobId(jobId: string): FulfillmentException[] {
  return sortDescByCreatedAt(_exceptions.filter((exception) => exception.job_id === jobId));
}

export function addFulfillmentException(exception: FulfillmentException): void {
  _exceptions = [exception, ..._exceptions];
}

export function createJobException({
  jobId,
  type,
  severity,
  note,
}: {
  jobId: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  note?: string;
}): FulfillmentException {
  if (!hasLocalJob(jobId)) {
    throw new Error('Job not found in local fulfillment store');
  }

  const exception: FulfillmentException = {
    id: genId('fex'),
    job_id: jobId,
    type,
    severity,
    note: note ?? null,
    resolved_at: null,
    created_at: nowIso(),
  };

  addFulfillmentException(exception);
  updateJob(jobId, { status: 'exception' });

  return exception;
}

export function updateFulfillmentException(id: string, updates: Partial<FulfillmentException>): FulfillmentException | undefined {
  let updated: FulfillmentException | undefined;

  _exceptions = _exceptions.map((exception) => {
    if (exception.id !== id) return exception;
    const nextException = { ...exception, ...updates };
    updated = nextException;
    return nextException;
  });

  return updated;
}

export function deleteFulfillmentException(id: string): void {
  _exceptions = _exceptions.filter((exception) => exception.id !== id);
}

export function clearFulfillmentStore(): void {
  _jobs = [];
  _jobItems = [];
  _shipments = [];
  _trackingEvents = [];
  _exceptions = [];
}
