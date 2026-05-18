import type { Return, ReturnItem } from '@/lib/partner-types';
import { getWarehouseById } from '@/lib/warehouse-store';
import { resolveReturnBusinessId } from '@/lib/contracts/identity';
import type { Locale } from '@/lib/i18n/dictionaries';
import { formatLocalizedDate, formatLocalizedMoney } from '@/lib/i18n/format';
import { joinText, toOptionalText } from '@/lib/contracts/display';

export interface ReturnOrderUiSummary {
  id: string | null;
  order_id: string | null;
  display_order_id: string;
  customer_name: string | null;
  display_customer_name: string;
  total_amount: number | null;
  channel: string | null;
}

export interface ReturnWarehouseUiSummary {
  id: string | null;
  name: string | null;
  code: string | null;
  display_label: string | null;
}

export type ReturnUiModel = Omit<Return, 'order' | 'warehouse'> & {
  order?: ReturnOrderUiSummary;
  warehouse?: ReturnWarehouseUiSummary;
  display_rma: string;
  display_order_id: string | null;
  display_customer_name: string;
  display_reason: string | null;
  display_disposition: string | null;
  display_refund_amount: string;
  display_created_at: string;
};

export type ReturnItemUiModel = ReturnItem & {
  display_sku_code: string;
  display_product_name: string;
};

export function hydrateReturnUiModel(ret: Return, locale: Locale = 'en-US'): ReturnUiModel {
  const warehouseFromStore = ret.warehouse_id ? getWarehouseById(ret.warehouse_id) : null;
  const warehouse = ret.warehouse ?? warehouseFromStore ? {
    id: warehouseFromStore?.id ?? ret.warehouse_id ?? null,
    name: ret.warehouse?.name ?? warehouseFromStore?.name ?? null,
    code: ret.warehouse?.code ?? warehouseFromStore?.code ?? null,
    display_label: joinText([
      ret.warehouse?.code ?? warehouseFromStore?.code ?? null,
      ret.warehouse?.name ?? warehouseFromStore?.name ?? null,
    ], ' · '),
  } : undefined;

  const order = ret.order ? {
    id: null,
    order_id: ret.order.order_id ?? null,
    display_order_id: ret.order.order_id ?? ret.order.order_number ?? ret.order_id,
    customer_name: ret.order.customer_name ?? ret.customer_name ?? null,
    display_customer_name: toOptionalText(ret.order.customer_name ?? ret.customer_name) ?? '—',
    total_amount: ret.order.total_amount ?? null,
    channel: ret.order.channel ?? null,
  } : undefined;

  return {
    ...ret,
    order,
    warehouse,
    display_rma: resolveReturnBusinessId(ret) ?? ret.id,
    display_order_id: order?.display_order_id ?? toOptionalText(ret.order_id),
    display_customer_name: order?.display_customer_name ?? toOptionalText(ret.customer_name) ?? '—',
    display_reason: toOptionalText(ret.reason),
    display_disposition: toOptionalText(ret.disposition),
    display_refund_amount: formatLocalizedMoney(locale, ret.refund_amount ?? ret.total_refund_amount, 'JPY'),
    display_created_at: formatLocalizedDate(locale, ret.created_at),
  };
}

export function hydrateReturnsUiModel(returns: Return[], locale: Locale = 'en-US') {
  return returns.map((ret) => hydrateReturnUiModel(ret, locale));
}

export function hydrateReturnItemUiModel(item: ReturnItem): ReturnItemUiModel {
  return {
    ...item,
    display_sku_code: toOptionalText(item.sku_code ?? item.sku?.sku_code) ?? item.id,
    display_product_name: toOptionalText(item.product_name ?? item.sku?.product?.title) ?? '—',
  };
}

export function hydrateReturnItemsUiModel(items: ReturnItem[]) {
  return items.map(hydrateReturnItemUiModel);
}
