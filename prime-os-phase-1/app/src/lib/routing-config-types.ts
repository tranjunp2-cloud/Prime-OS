// Routing configuration types
// Used by: use-routing-config.ts, RoutingConfigEditor

export interface RoutingCondition {
  max_weight_g?: number;       // Max weight in grams
  max_value_jpy?: number;      // Max order value in JPY
  channels?: string[];         // e.g. ['rakuten', 'shopee', 'amazon']
  countries?: string[];        // e.g. ['JP', 'SG', 'MY']
  warehouse_types?: string[];   // e.g. ['internal', 'fba', '3pl']
  min_quantity?: number;        // Min units in order
  max_quantity?: number;       // Max units in order
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;             // 1 = highest, evaluated in order
  warehouse_id: string;        // Target warehouse
  conditions: RoutingCondition;
  fallback?: string;            // warehouse_id fallback if this rule matches but warehouse unavailable
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoutingConfig {
  id?: string;
  user_id?: string;
  warehouse_id?: string;
  config_version: number;
  is_enabled: boolean;
  rules: RoutingRule[];
  default_warehouse_id: string;
  split_order_enabled: boolean;
  fallback_chain: string[];     // Ordered list of warehouse_ids for fallback
  created_at?: string;
  updated_at?: string;
}

export const CHANNEL_OPTIONS = ['rakuten', 'shopee', 'amazon', 'tiktok', 'manual'] as const;
export type ChannelOption = typeof CHANNEL_OPTIONS[number];

export const COUNTRY_OPTIONS = ['JP', 'SG', 'MY', 'VN', 'US', 'UK', 'AU', 'TH'] as const;
export type CountryOption = typeof COUNTRY_OPTIONS[number];

export const WAREHOUSE_TYPE_OPTIONS = ['internal', 'fba', 'fbs', '3pl', 'virtual'] as const;
export type WarehouseTypeOption = typeof WAREHOUSE_TYPE_OPTIONS[number];

export function createDefaultRoutingConfig(
  _warehouseName?: string,
  _warehouseCountry?: string,
): RoutingConfig {
  return {
    config_version: 1,
    is_enabled: true,
    rules: [],
    default_warehouse_id: '',
    split_order_enabled: false,
    fallback_chain: [],
  };
}

export function createEmptyRule(): RoutingRule {
  return {
    id: crypto.randomUUID(),
    name: '',
    priority: 1,
    warehouse_id: '',
    conditions: {},
    fallback: undefined,
    enabled: true,
  };
}
