import type {
  FulfillmentException,
  FulfillmentJob,
  FulfillmentJobItem,
  Shipment,
  TrackingEvent,
} from '@/lib/fulfillment-types';
import { CARRIER_LABELS, type CarrierCode } from '@/lib/fulfillment-types';
import { getOrderById } from '@/lib/order-store';
import { getResolvedProductSkuById } from '@/lib/product-store';
import { getWarehouseById } from '@/lib/warehouse-store';
import { resolveChannelOrderReference, resolveOrderBusinessId, resolveWarehouseId } from '@/lib/contracts/identity';
import { joinText, toOptionalText } from '@/lib/contracts/display';

export interface FulfillmentOrderUiSummary {
  id: string | null;
  order_id: string;
  display_order_id: string;
  channel_order_ref: string | null;
  display_channel_order_ref: string | null;
  customer_name: string;
  display_customer_name: string;
  total_amount: number;
  channel: string;
  status: string | null;
}

export interface FulfillmentWarehouseUiSummary {
  id: string | null;
  name: string;
  code: string;
  type: string;
  is_virtual: boolean | null;
  display_name: string | null;
  display_code: string | null;
  display_label: string | null;
}

export type FulfillmentJobUiModel = Omit<FulfillmentJob, 'order' | 'warehouse'> & {
  order?: FulfillmentOrderUiSummary;
  warehouse?: FulfillmentWarehouseUiSummary;
  display_job_code: string;
  display_order_id: string;
  display_customer_name: string;
  display_warehouse_name: string | null;
  display_warehouse_code: string | null;
  display_tracking_number: string | null;
  display_carrier_label: string | null;
  resolved_warehouse_id: string | null;
};

export type FulfillmentJobItemUiModel = FulfillmentJobItem & {
  display_sku_code: string;
  display_product_name: string;
  display_quantity_ordered: number | string;
  resolved_product_id: string | null;
  resolved_variation_name: string | null;
};

export type ShipmentUiModel = Shipment & {
  display_tracking_number: string | null;
  display_carrier_label: string | null;
};

function resolveCarrierLabel(carrierCode: string | null | undefined) {
  if (!carrierCode) return null;
  return carrierCode in CARRIER_LABELS
    ? CARRIER_LABELS[carrierCode as CarrierCode]
    : carrierCode;
}

function toOrderSummary(job: FulfillmentJob): FulfillmentOrderUiSummary | undefined {
  const orderFromStore = getOrderById(job.order_id);
  const source = job.order ?? orderFromStore;
  if (!source && !orderFromStore) return undefined;

  const orderId = resolveOrderBusinessId(source ?? orderFromStore) ?? job.order_id;

  return {
    id: orderFromStore?.id ?? null,
    order_id: source?.order_id ?? orderFromStore?.order_id ?? job.order_id,
    display_order_id: orderId,
    channel_order_ref: resolveChannelOrderReference(orderFromStore),
    display_channel_order_ref: resolveChannelOrderReference(orderFromStore),
    customer_name: source?.customer_name ?? orderFromStore?.customer_name ?? 'Unknown Customer',
    display_customer_name: toOptionalText(source?.customer_name ?? orderFromStore?.customer_name) ?? 'Unknown Customer',
    total_amount: source?.total_amount ?? orderFromStore?.total_amount ?? 0,
    channel: source?.channel ?? orderFromStore?.channel ?? 'manual',
    status: 'status' in (source ?? {}) ? (source as { status?: string | null }).status ?? null : orderFromStore?.status ?? null,
  };
}

function toWarehouseSummary(job: FulfillmentJob): FulfillmentWarehouseUiSummary | undefined {
  const resolvedWarehouseId = resolveWarehouseId(job);
  const warehouseFromStore = resolvedWarehouseId ? getWarehouseById(resolvedWarehouseId) : null;
  const source = job.warehouse ?? warehouseFromStore;
  if (!source && !warehouseFromStore) return undefined;

  const code = toOptionalText(source?.code ?? warehouseFromStore?.code ?? null);
  const name = toOptionalText(source?.name ?? warehouseFromStore?.name ?? null);

  return {
    id: warehouseFromStore?.id ?? resolvedWarehouseId ?? null,
    name: source?.name ?? warehouseFromStore?.name ?? 'Unknown Warehouse',
    code: source?.code ?? warehouseFromStore?.code ?? 'UNASSIGNED',
    type: source?.type ?? warehouseFromStore?.type ?? 'virtual',
    is_virtual: source?.is_virtual ?? warehouseFromStore?.is_virtual ?? null,
    display_name: name,
    display_code: code,
    display_label: joinText([code, name], ' · '),
  };
}

export function hydrateFulfillmentJobUiModel(job: FulfillmentJob): FulfillmentJobUiModel {
  const order = toOrderSummary(job);
  const warehouse = toWarehouseSummary(job);

  return {
    ...job,
    order,
    warehouse,
    display_job_code: toOptionalText(job.job_code) ?? job.id,
    display_order_id: order?.display_order_id ?? resolveOrderBusinessId({ order_id: job.order_id }) ?? job.order_id,
    display_customer_name: order?.display_customer_name ?? 'Unknown Customer',
    display_warehouse_name: warehouse?.display_name ?? null,
    display_warehouse_code: warehouse?.display_code ?? null,
    display_tracking_number: toOptionalText(job.tracking_number),
    display_carrier_label: resolveCarrierLabel(job.carrier),
    resolved_warehouse_id: resolveWarehouseId(job),
  };
}

export function hydrateFulfillmentJobsUiModel(jobs: FulfillmentJob[]) {
  return jobs.map(hydrateFulfillmentJobUiModel);
}

export function hydrateFulfillmentJobItemUiModel(item: FulfillmentJobItem): FulfillmentJobItemUiModel {
  let skuCode = item.sku?.sku_code ?? item.sku_code ?? null;
  let productName = item.sku?.product?.title ?? item.product_name ?? null;
  let resolvedProductId: string | null = item.sku?.product?.id ?? null;
  let resolvedVariationName = item.sku?.variation_name ?? null;

  const resolved = getResolvedProductSkuById(item.sku_id);
  if (resolved) {
    resolvedProductId = resolved.product.id;
    resolvedVariationName = resolvedVariationName ?? resolved.sku.variation_name ?? null;
    skuCode = skuCode ?? resolved.sku.sku_code;
    productName = productName ?? resolved.product.name;
  }

  return {
    ...item,
    sku_code: skuCode ?? item.sku_code,
    product_name: productName ?? item.product_name,
    display_sku_code: skuCode ?? item.id,
    display_product_name: productName ?? 'Unknown Product',
    display_quantity_ordered: item.quantity_ordered ?? item.qty ?? '—',
    resolved_product_id: resolvedProductId,
    resolved_variation_name: resolvedVariationName,
  };
}

export function hydrateFulfillmentJobItemsUiModel(items: FulfillmentJobItem[]) {
  return items.map(hydrateFulfillmentJobItemUiModel);
}

export function hydrateShipmentUiModel(shipment: Shipment): ShipmentUiModel {
  return {
    ...shipment,
    display_tracking_number: toOptionalText(shipment.tracking_number),
    display_carrier_label: resolveCarrierLabel(shipment.carrier_code),
  };
}

export function hydrateShipmentsUiModel(shipments: Shipment[]) {
  return shipments.map(hydrateShipmentUiModel);
}

export function hydrateTrackingEventsUiModel(events: TrackingEvent[]) {
  return [...events];
}

export function hydrateExceptionsUiModel(exceptions: FulfillmentException[]) {
  return [...exceptions];
}
