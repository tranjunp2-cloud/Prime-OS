export function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

export function resolveOrderBusinessId(source: {
  order_id?: string | null;
  order_number?: string | null;
  id?: string | null;
} | null | undefined) {
  return firstNonEmpty(source?.order_id, source?.order_number, source?.id);
}

export function resolveChannelOrderReference(source: {
  channel_order_ref?: string | null;
  channel_order_id?: string | null;
} | null | undefined) {
  return firstNonEmpty(source?.channel_order_ref, source?.channel_order_id);
}

export function resolveReturnBusinessId(source: {
  rma_number?: string | null;
  rma_code?: string | null;
  id?: string | null;
} | null | undefined) {
  return firstNonEmpty(source?.rma_number, source?.rma_code, source?.id);
}

export function resolveWarehouseId(source: {
  warehouse_id?: string | null;
  allocated_warehouse_id?: string | null;
} | null | undefined) {
  return firstNonEmpty(source?.allocated_warehouse_id, source?.warehouse_id);
}
