import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n/I18nContext';
import { addInventoryPosition, getPositionBySku, updatePosition } from '@/lib/inventory-store';
import { getOrderById, getOrderItems } from '@/lib/order-store';
import type { Return, ReturnItem } from '@/lib/partner-types';
import {
  getReturnById as getLocalReturnById,
  getReturns as getLocalReturns,
  updateReturn as updateLocalReturn,
  type Disposition as LocalDisposition,
  type QCGrade as LocalQCGrade,
  type ReturnItem as LocalReturnRecord,
  type ReturnStatus as LocalReturnStatus,
} from '@/lib/return-store';
import { getProducts } from '@/lib/product-store';
import {
  hydrateReturnItemsUiModel,
  hydrateReturnUiModel,
  hydrateReturnsUiModel,
  type ReturnItemUiModel,
  type ReturnUiModel,
} from '@/lib/contracts/returns';

function toPartnerStatus(status: LocalReturnStatus): Return['status'] {
  switch (status) {
    case 'authorized':
      return 'approved';
    case 'in_transit':
      return 'in_transit';
    case 'received':
      return 'received';
    case 'qc':
      return 'qc';
    case 'dispositioned':
      return 'dispositioned';
    case 'completed':
      return 'completed';
    default:
      return 'approved';
  }
}

function toLocalStatus(status: string): LocalReturnStatus {
  switch (status) {
    case 'approved':
    case 'authorized':
      return 'authorized';
    case 'in_transit':
      return 'in_transit';
    case 'received':
      return 'received';
    case 'qc':
      return 'qc';
    case 'dispositioned':
      return 'dispositioned';
    case 'completed':
      return 'completed';
    default:
      return 'authorized';
  }
}

function toPartnerReturn(record: LocalReturnRecord): Return {
  const order = record.order_id ? getOrderById(record.order_id) : undefined;

  return {
    id: record.id,
    rma_number: record.rma_number ?? record.id.slice(0, 8).toUpperCase(),
    rma_code: record.rma_number ?? record.id.slice(0, 8).toUpperCase(),
    order_id: record.order_id ?? '',
    user_id: order?.user_id ?? 'user_demo',
    status: toPartnerStatus(record.status),
    reason: record.reason,
    customer_name: order?.customer_name ?? 'Unknown Customer',
    customer_email: order?.customer_email ?? null,
    total_refund_amount: record.refund_amount,
    warehouse_id: order?.warehouse_id ?? order?.allocated_warehouse_id ?? null,
    received_at: record.received_at,
    completed_at: record.completed_at,
    created_at: record.created_at,
    updated_at: record.completed_at ?? record.received_at ?? record.created_at,
    qc_grade: record.qc_grade,
    disposition: record.disposition,
    refund_amount: record.refund_amount,
    order: order
      ? {
          order_id: order.order_id,
          order_number: order.order_id,
          customer_name: order.customer_name,
          total_amount: order.total_amount,
          channel: order.channel,
        }
      : undefined,
  };
}

function buildSkuLookup() {
  const lookup = new Map<string, { skuId: string; productName: string }>();

  for (const product of getProducts()) {
    for (const sku of product.skus) {
      lookup.set(sku.sku_code, {
        skuId: sku.id,
        productName: product.name,
      });
    }
  }

  return lookup;
}

function getReturnIdFromItemId(itemId: string): string {
  return itemId.split(':')[0] ?? itemId;
}

function deriveQcOutcome(record: LocalReturnRecord): ReturnItem['qc_outcome'] {
  if (!record.qc_grade) return null;
  if (record.disposition === 'unfulfillable' || record.disposition === 'destroy') {
    return 'fail';
  }
  return 'pass';
}

function getLocalReturnItems(returnId: string): ReturnItem[] {
  const record = getLocalReturnById(returnId);
  if (!record?.order_id) return [];

  const orderItems = getOrderItems(record.order_id);
  const skuLookup = buildSkuLookup();
  const received = ['received', 'qc', 'dispositioned', 'completed'].includes(record.status);

  return orderItems.map((line, index) => {
    const skuMeta = skuLookup.get(line.sku);

    return {
      id: `${record.id}:${index}`,
      return_id: record.id,
      sku_id: skuMeta?.skuId ?? `sku_missing_${index}`,
      sku_code: line.sku,
      product_name: skuMeta?.productName ?? line.product_name,
      quantity_expected: line.quantity,
      quantity_received: received ? line.quantity : null,
      qc_grade: record.qc_grade,
      qc_outcome: deriveQcOutcome(record),
      disposition: record.disposition,
      disposition_reason: record.qc_notes,
      notes: record.qc_notes,
      created_at: record.created_at,
      updated_at: record.completed_at ?? record.received_at ?? record.created_at,
    };
  });
}

export function useReturns(status?: string) {
  const { user } = useAuth();
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['returns', status, user?.id],
    queryFn: async (): Promise<ReturnUiModel[]> => {
      const normalizedStatus = status ? toLocalStatus(status) : null;
      const returns = getLocalReturns()
        .filter((record) => !normalizedStatus || record.status === normalizedStatus)
        .map(toPartnerReturn)
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

      return hydrateReturnsUiModel(returns, locale);
    },
    enabled: true,
  });
}

export function useReturn(id: string | undefined) {
  const { user } = useAuth();
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['return', id, user?.id],
    queryFn: async (): Promise<ReturnUiModel | null> => {
      if (!id) return null;
      const record = getLocalReturnById(id);
      return record ? hydrateReturnUiModel(toPartnerReturn(record), locale) : null;
    },
    enabled: !!id,
  });
}

export function useReturnItems(returnId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['return-items', returnId, user?.id],
    queryFn: async (): Promise<ReturnItemUiModel[]> => {
      if (!returnId) return [];
      return hydrateReturnItemsUiModel(getLocalReturnItems(returnId));
    },
    enabled: !!returnId,
  });
}

export function useUpdateReturnStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      updateLocalReturn(id, {
        status: toLocalStatus(status),
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      });
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['return', id] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Return status updated');
    },
    onError: (error: Error) => toast.error('Error: ' + error.message),
  });
}

export function useUpdateReturnItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      qc_grade,
      disposition,
      disposition_reason,
      notes,
    }: {
      id: string;
      qc_grade?: string;
      qc_outcome?: 'pass' | 'fail';
      disposition?: string;
      disposition_reason?: string;
      notes?: string;
    }) => {
      const returnId = getReturnIdFromItemId(id);
      const current = getLocalReturnById(returnId);
      if (!current) throw new Error('Return item not found');

      const nextStatus: LocalReturnStatus = disposition
        ? 'dispositioned'
        : qc_grade
        ? 'qc'
        : current.status;

      updateLocalReturn(returnId, {
        qc_grade: (qc_grade as LocalQCGrade | undefined) ?? current.qc_grade,
        disposition: (disposition as LocalDisposition | undefined) ?? current.disposition,
        qc_notes: notes ?? disposition_reason ?? current.qc_notes,
        status: nextStatus,
        received_at: current.received_at ?? new Date().toISOString(),
      });
    },
    onSuccess: (_data, { id }) => {
      const returnId = getReturnIdFromItemId(id);
      qc.invalidateQueries({ queryKey: ['return', returnId] });
      qc.invalidateQueries({ queryKey: ['return-items', returnId] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Return item updated');
    },
    onError: (error: Error) => toast.error('Error: ' + error.message),
  });
}

export function useRestockReturnItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnItemId,
      skuId,
      warehouseId,
      quantity,
    }: {
      returnItemId: string;
      skuId: string;
      warehouseId: string;
      quantity: number;
    }) => {
      const returnId = getReturnIdFromItemId(returnItemId);
      const current = getLocalReturnById(returnId);
      if (!current) throw new Error('Return not found');

      if (warehouseId && quantity > 0) {
        const existingPosition = getPositionBySku(skuId).find((position) => position.warehouse_id === warehouseId);

        if (existingPosition) {
          updatePosition(existingPosition.id, {
            on_hand: existingPosition.on_hand + quantity,
            returns: Math.max(0, existingPosition.returns - quantity),
          });
        } else {
          addInventoryPosition({
            id: `inv_restock_${Date.now()}`,
            sku_id: skuId,
            product_id: '',
            warehouse_id: warehouseId,
            on_hand: quantity,
            reserved: 0,
            inbound: 0,
            outbound: 0,
            unfulfillable: 0,
            returns: 0,
            updated_at: new Date().toISOString(),
          });
        }
      }

      updateLocalReturn(returnId, {
        disposition: 'restock',
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: (_data, { returnItemId }) => {
      const returnId = getReturnIdFromItemId(returnItemId);
      qc.invalidateQueries({ queryKey: ['return', returnId] });
      qc.invalidateQueries({ queryKey: ['return-items', returnId] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item restocked successfully');
    },
    onError: (error: Error) => toast.error('Error: ' + error.message),
  });
}
