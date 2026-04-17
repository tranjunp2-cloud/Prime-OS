export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          channel: string | null
          country: string | null
          event_type: string
          id: string
          map_x: number | null
          map_y: number | null
          occurred_at: string
          order_id: string | null
          product_id: string | null
          session_id: string | null
          user_id: string
          value_jpy: number | null
        }
        Insert: {
          channel?: string | null
          country?: string | null
          event_type: string
          id?: string
          map_x?: number | null
          map_y?: number | null
          occurred_at?: string
          order_id?: string | null
          product_id?: string | null
          session_id?: string | null
          user_id: string
          value_jpy?: number | null
        }
        Update: {
          channel?: string | null
          country?: string | null
          event_type?: string
          id?: string
          map_x?: number | null
          map_y?: number | null
          occurred_at?: string
          order_id?: string | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string
          value_jpy?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      bulk_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          file_url: string | null
          id: string
          job_type: string
          processed_items: number | null
          status: string
          total_items: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          file_url?: string | null
          id?: string
          job_type: string
          processed_items?: number | null
          status?: string
          total_items?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          file_url?: string | null
          id?: string
          job_type?: string
          processed_items?: number | null
          status?: string
          total_items?: number | null
          user_id?: string
        }
        Relationships: []
      }
      country_map_points: {
        Row: {
          country: string
          display_name: string
          map_x: number
          map_y: number
        }
        Insert: {
          country: string
          display_name: string
          map_x: number
          map_y: number
        }
        Update: {
          country?: string
          display_name?: string
          map_x?: number
          map_y?: number
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string
          event_name: string
          id: string
          payload: Json | null
          user_id: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string
          event_name: string
          id?: string
          payload?: Json | null
          user_id: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      fulfillment_exceptions: {
        Row: {
          created_at: string
          id: string
          job_id: string
          note: string | null
          resolved_at: string | null
          severity: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          resolved_at?: string | null
          severity?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          resolved_at?: string | null
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_exceptions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_job_items: {
        Row: {
          created_at: string
          id: string
          job_id: string
          location_hint: string | null
          packed_qty: number
          picked_qty: number
          qty: number
          sku_code: string | null
          sku_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          location_hint?: string | null
          packed_qty?: number
          picked_qty?: number
          qty?: number
          sku_code?: string | null
          sku_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          location_hint?: string | null
          packed_qty?: number
          picked_qty?: number
          qty?: number
          sku_code?: string | null
          sku_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_job_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_jobs: {
        Row: {
          assigned_to: string | null
          created_at: string
          external_notes: string | null
          external_priority: string | null
          flow_type: string
          fulfillment_type: string | null
          handoff_status: string | null
          id: string
          job_code: string | null
          notes: string | null
          order_id: string
          partner_id: string | null
          priority: string | null
          request_id: string | null
          sla_due_at: string | null
          sla_target_days: number | null
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          external_notes?: string | null
          external_priority?: string | null
          flow_type?: string
          fulfillment_type?: string | null
          handoff_status?: string | null
          id?: string
          job_code?: string | null
          notes?: string | null
          order_id: string
          partner_id?: string | null
          priority?: string | null
          request_id?: string | null
          sla_due_at?: string | null
          sla_target_days?: number | null
          status?: string
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          external_notes?: string | null
          external_priority?: string | null
          flow_type?: string
          fulfillment_type?: string | null
          handoff_status?: string | null
          id?: string
          job_code?: string | null
          notes?: string | null
          order_id?: string
          partner_id?: string | null
          priority?: string | null
          request_id?: string | null
          sla_due_at?: string | null
          sla_target_days?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_jobs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_jobs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_partners: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          partner_type: string
          provider_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          partner_type: string
          provider_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          partner_type?: string
          provider_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fulfillment_requests: {
        Row: {
          created_at: string
          flow_type: string
          id: string
          order_id: string
          payload: Json | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          flow_type?: string
          id?: string
          order_id: string
          payload?: Json | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          flow_type?: string
          id?: string
          order_id?: string
          payload?: Json | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          low_stock_threshold: number | null
          product_id: string
          quantity: number
          reserved_quantity: number
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          product_id: string
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustment_items: {
        Row: {
          adjustment_id: string
          id: string
          qty_change: number
          sku: string
        }
        Insert: {
          adjustment_id: string
          id?: string
          qty_change: number
          sku: string
        }
        Update: {
          adjustment_id?: string
          id?: string
          qty_change?: number
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "inventory_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_id: string | null
          adjustment_type: string
          created_at: string
          created_by: string
          fulfillment_method_name: string
          id: string
          note: string | null
          qty_delta: number | null
          reason: string
          sku_id: string | null
          status: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          adjustment_id?: string | null
          adjustment_type: string
          created_at?: string
          created_by: string
          fulfillment_method_name: string
          id?: string
          note?: string | null
          qty_delta?: number | null
          reason: string
          sku_id?: string | null
          status?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          adjustment_id?: string | null
          adjustment_type?: string
          created_at?: string
          created_by?: string
          fulfillment_method_name?: string
          id?: string
          note?: string | null
          qty_delta?: number | null
          reason?: string
          sku_id?: string | null
          status?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_events_ledger: {
        Row: {
          created_at: string
          delta: Json
          event_type: string
          id: string
          metadata: Json | null
          ref_id: string | null
          ref_type: string
          sku_id: string | null
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          delta: Json
          event_type: string
          id?: string
          metadata?: Json | null
          ref_id?: string | null
          ref_type: string
          sku_id?: string | null
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: Json
          event_type?: string
          id?: string
          metadata?: Json | null
          ref_id?: string | null
          ref_type?: string
          sku_id?: string | null
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_ledger_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          balance_after: number | null
          batch_id: string | null
          created_at: string
          created_by: string | null
          from_warehouse_id: string | null
          fulfillment_method_name: string
          id: string
          movement_type: string
          qty_change: number
          reference: string | null
          sku: string
          source_ref: string | null
          source_type: string
          status: string | null
          to_warehouse_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          fulfillment_method_name: string
          id?: string
          movement_type: string
          qty_change: number
          reference?: string | null
          sku: string
          source_ref?: string | null
          source_type: string
          status?: string | null
          to_warehouse_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number | null
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          fulfillment_method_name?: string
          id?: string
          movement_type?: string
          qty_change?: number
          reference?: string | null
          sku?: string
          source_ref?: string | null
          source_type?: string
          status?: string | null
          to_warehouse_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_positions: {
        Row: {
          available_qty: number
          country: string
          created_at: string
          damaged_qty: number | null
          id: string
          in_transit_qty: number | null
          inbound_qty: number
          low_stock_threshold: number
          on_hand_qty: number
          platform: string | null
          qc_hold_qty: number | null
          reserved_qty: number
          sku_id: string
          status: string | null
          type: string
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          available_qty?: number
          country?: string
          created_at?: string
          damaged_qty?: number | null
          id?: string
          in_transit_qty?: number | null
          inbound_qty?: number
          low_stock_threshold?: number
          on_hand_qty?: number
          platform?: string | null
          qc_hold_qty?: number | null
          reserved_qty?: number
          sku_id: string
          status?: string | null
          type?: string
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          available_qty?: number
          country?: string
          created_at?: string
          damaged_qty?: number | null
          id?: string
          in_transit_qty?: number | null
          inbound_qty?: number
          low_stock_threshold?: number
          on_hand_qty?: number
          platform?: string | null
          qc_hold_qty?: number | null
          reserved_qty?: number
          sku_id?: string
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_positions_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_positions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          id: string
          order_id: string
          order_line_id: string | null
          qty: number
          reason: string | null
          sku_id: string
          status: string
          ttl_expires_at: string | null
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          order_line_id?: string | null
          qty: number
          reason?: string | null
          sku_id: string
          status?: string
          ttl_expires_at?: string | null
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          order_line_id?: string | null
          qty?: number
          reason?: string | null
          sku_id?: string
          status?: string
          ttl_expires_at?: string | null
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sync_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          platform: string
          status: string
          synced_at: string | null
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          platform: string
          status?: string
          synced_at?: string | null
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          platform?: string
          status?: string
          synced_at?: string | null
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sync_logs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_category: string | null
          platform_data: Json | null
          platform_description: string | null
          platform_listing_id: string | null
          platform_price: number | null
          platform_title: string | null
          price_adjustment_percent: number | null
          price_amount: number | null
          price_currency: string | null
          product_id: string
          status: Database["public"]["Enums"]["listing_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_category?: string | null
          platform_data?: Json | null
          platform_description?: string | null
          platform_listing_id?: string | null
          platform_price?: number | null
          platform_title?: string | null
          price_adjustment_percent?: number | null
          price_amount?: number | null
          price_currency?: string | null
          product_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_category?: string | null
          platform_data?: Json | null
          platform_description?: string | null
          platform_listing_id?: string | null
          platform_price?: number | null
          platform_title?: string | null
          price_adjustment_percent?: number | null
          price_amount?: number | null
          price_currency?: string | null
          product_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ops_exceptions: {
        Row: {
          code: string
          created_at: string
          id: string
          message: string
          owner: string | null
          related_id: string
          related_type: string
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          message: string
          owner?: string | null
          related_id: string
          related_type: string
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          message?: string
          owner?: string | null
          related_id?: string
          related_type?: string
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_allocations: {
        Row: {
          allocation_strategy: string | null
          created_at: string
          id: string
          is_manual: boolean | null
          order_id: string
          reason: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          allocation_strategy?: string | null
          created_at?: string
          id?: string
          is_manual?: boolean | null
          order_id: string
          reason?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          allocation_strategy?: string | null
          created_at?: string
          id?: string
          is_manual?: boolean | null
          order_id?: string
          reason?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_allocations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_type: string
          id: string
          message: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_type: string
          id?: string
          message: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_per_unit: number
          product_name: string
          quantity: number
          sku: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_per_unit?: number
          product_name: string
          quantity?: number
          sku: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_per_unit?: number
          product_name?: string
          quantity?: number
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          allocated_warehouse_id: string | null
          allocation_policy_snapshot: Json | null
          channel: string
          channel_order_ref: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          discount_amount: number | null
          fulfillment_mode: string | null
          id: string
          lifecycle_stage: string | null
          order_date: string
          order_id: string
          risk_flags: string[] | null
          ship_to: Json | null
          ship_to_country: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_amount: number | null
          shipping_method: string | null
          sla_target_days: number | null
          status: string
          subtotal_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          allocated_warehouse_id?: string | null
          allocation_policy_snapshot?: Json | null
          channel: string
          channel_order_ref?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          fulfillment_mode?: string | null
          id?: string
          lifecycle_stage?: string | null
          order_date?: string
          order_id: string
          risk_flags?: string[] | null
          ship_to?: Json | null
          ship_to_country?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_amount?: number | null
          shipping_method?: string | null
          sla_target_days?: number | null
          status?: string
          subtotal_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          allocated_warehouse_id?: string | null
          allocation_policy_snapshot?: Json | null
          channel?: string
          channel_order_ref?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          fulfillment_mode?: string | null
          id?: string
          lifecycle_stage?: string | null
          order_date?: string
          order_id?: string
          risk_flags?: string[] | null
          ship_to?: Json | null
          ship_to_country?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_amount?: number | null
          shipping_method?: string | null
          sla_target_days?: number | null
          status?: string
          subtotal_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_allocated_warehouse_id_fkey"
            columns: ["allocated_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          created_at: string | null
          id: string
          plan: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan?: string
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          dimensions_mm: Json | null
          id: string
          items: Json
          package_no: number
          shipment_id: string
          updated_at: string
          weight_g: number | null
        }
        Insert: {
          created_at?: string
          dimensions_mm?: Json | null
          id?: string
          items?: Json
          package_no?: number
          shipment_id: string
          updated_at?: string
          weight_g?: number | null
        }
        Update: {
          created_at?: string
          dimensions_mm?: Json | null
          id?: string
          items?: Json
          package_no?: number
          shipment_id?: string
          updated_at?: string
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_accounts: {
        Row: {
          account_name: string
          auth_method: string
          config_json: Json
          country: string
          created_at: string
          environment: string
          id: string
          is_default: boolean
          partner_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          auth_method?: string
          config_json?: Json
          country?: string
          created_at?: string
          environment?: string
          id?: string
          is_default?: boolean
          partner_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          auth_method?: string
          config_json?: Json
          country?: string
          created_at?: string
          environment?: string
          id?: string
          is_default?: boolean
          partner_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_accounts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_capabilities: {
        Row: {
          capabilities_json: Json
          created_at: string
          id: string
          partner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities_json?: Json
          created_at?: string
          id?: string
          partner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities_json?: Json
          created_at?: string
          id?: string
          partner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_capabilities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_health_checks: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string
          message: string | null
          partner_account_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string
          message?: string | null
          partner_account_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string
          message?: string | null
          partner_account_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_health_checks_partner_account_id_fkey"
            columns: ["partner_account_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_node_bindings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          node_id: string
          partner_id: string
          purpose: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          node_id: string
          partner_id: string
          purpose?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          node_id?: string
          partner_id?: string
          purpose?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_node_bindings_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_node_bindings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_secrets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          partner_account_id: string
          rotated_at: string | null
          secret_kind: string
          secret_value_encrypted: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          partner_account_id: string
          rotated_at?: string | null
          secret_kind: string
          secret_value_encrypted: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          partner_account_id?: string
          rotated_at?: string | null
          secret_kind?: string
          secret_value_encrypted?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_secrets_partner_account_id_fkey"
            columns: ["partner_account_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          capabilities: Json | null
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          mode: string
          name: string
          partner_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          mode?: string
          name: string
          partner_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: Json | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          mode?: string
          name?: string
          partner_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          created_at: string
          credentials_encrypted: string | null
          id: string
          is_connected: boolean
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          store_id: string | null
          store_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          store_id?: string | null
          store_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          store_id?: string | null
          store_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_at: string
          id: string
          listing_id: string
          new_price: number
          old_price: number | null
        }
        Insert: {
          changed_at?: string
          id?: string
          listing_id: string
          new_price: number
          old_price?: number | null
        }
        Update: {
          changed_at?: string
          id?: string
          listing_id?: string
          new_price?: number
          old_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          dimensions: Json | null
          id: string
          images: string[] | null
          sku: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          variants: Json | null
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          base_price?: number
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          id?: string
          images?: string[] | null
          sku: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          variants?: Json | null
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          base_price?: number
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          id?: string
          images?: string[] | null
          sku?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          variants?: Json | null
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proof_of_delivery: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          received_at: string | null
          receiver_name: string | null
          shipment_id: string
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          received_at?: string | null
          receiver_name?: string | null
          shipment_id: string
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          received_at?: string | null
          receiver_name?: string | null
          shipment_id?: string
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      region_countries: {
        Row: {
          country: string
          region_key: string
        }
        Insert: {
          country: string
          region_key: string
        }
        Update: {
          country?: string
          region_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_countries_region_key_fkey"
            columns: ["region_key"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["key"]
          },
        ]
      }
      regions: {
        Row: {
          key: string
          label: string
        }
        Insert: {
          key: string
          label: string
        }
        Update: {
          key?: string
          label?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          created_at: string
          disposition: string
          id: string
          notes: string | null
          qc_outcome: string
          qty: number
          return_id: string
          sku_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disposition?: string
          id?: string
          notes?: string | null
          qc_outcome?: string
          qty?: number
          return_id: string
          sku_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disposition?: string
          id?: string
          notes?: string | null
          qc_outcome?: string
          qty?: number
          return_id?: string
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      return_lines: {
        Row: {
          created_at: string
          disposition: string
          id: string
          notes: string | null
          qc_outcome: string
          qty: number
          return_id: string
          sku_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disposition?: string
          id?: string
          notes?: string | null
          qc_outcome?: string
          qty?: number
          return_id: string
          sku_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disposition?: string
          id?: string
          notes?: string | null
          qc_outcome?: string
          qty?: number
          return_id?: string
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          is_partner_managed: boolean | null
          job_id: string | null
          order_id: string
          partner_id: string | null
          reason: string | null
          received_at: string | null
          rma_code: string
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_partner_managed?: boolean | null
          job_id?: string | null
          order_id: string
          partner_id?: string | null
          reason?: string | null
          received_at?: string | null
          rma_code: string
          status?: string
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_partner_managed?: boolean | null
          job_id?: string | null
          order_id?: string
          partner_id?: string | null
          reason?: string | null
          received_at?: string | null
          rma_code?: string
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          created_at: string
          event_time: string
          event_type: string
          id: string
          location: string | null
          message: string | null
          raw_payload: Json | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          event_time?: string
          event_type: string
          id?: string
          location?: string | null
          message?: string | null
          raw_payload?: Json | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          event_time?: string
          event_type?: string
          id?: string
          location?: string | null
          message?: string | null
          raw_payload?: Json | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier_code: string
          created_at: string
          delivered_at: string | null
          id: string
          is_partner_managed: boolean | null
          job_id: string
          label_url: string | null
          metadata: Json | null
          partner_id: string | null
          service_level: string | null
          shipment_code: string | null
          shipped_at: string | null
          status: string
          tracking_format_hint: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier_code?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_partner_managed?: boolean | null
          job_id: string
          label_url?: string | null
          metadata?: Json | null
          partner_id?: string | null
          service_level?: string | null
          shipment_code?: string | null
          shipped_at?: string | null
          status?: string
          tracking_format_hint?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier_code?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_partner_managed?: boolean | null
          job_id?: string
          label_url?: string | null
          metadata?: Json | null
          partner_id?: string | null
          service_level?: string | null
          shipment_code?: string | null
          shipped_at?: string | null
          status?: string
          tracking_format_hint?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_inventory: {
        Row: {
          created_at: string
          fulfillment_type: string
          id: string
          product_id: string
          quantity: number
          status: string
          updated_at: string
          user_id: string
          variant_sku: string
        }
        Insert: {
          created_at?: string
          fulfillment_type: string
          id?: string
          product_id: string
          quantity?: number
          status: string
          updated_at?: string
          user_id: string
          variant_sku: string
        }
        Update: {
          created_at?: string
          fulfillment_type?: string
          id?: string
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
          variant_sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_inventory_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string
          id: string
          product_id: string
          quantity_after: number
          quantity_before: number
          reason: string
          reference: string | null
          sku_inventory_id: string
          variant_sku: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by: string
          id?: string
          product_id: string
          quantity_after: number
          quantity_before: number
          reason: string
          reference?: string | null
          sku_inventory_id: string
          variant_sku: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string
          id?: string
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          reason?: string
          reference?: string | null
          sku_inventory_id?: string
          variant_sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_inventory_history_sku_inventory_id_fkey"
            columns: ["sku_inventory_id"]
            isOneToOne: false
            referencedRelation: "sku_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_mappings: {
        Row: {
          asin: string | null
          channel_sku: string | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          fnsku: string | null
          id: string
          platform: string
          sku_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          channel_sku?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          fnsku?: string | null
          id?: string
          platform: string
          sku_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          channel_sku?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          fnsku?: string | null
          id?: string
          platform?: string
          sku_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_mappings_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      skus: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sku_code: string
          updated_at: string
          user_id: string
          variation_attributes: Json | null
          variation_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sku_code: string
          updated_at?: string
          user_id: string
          variation_attributes?: Json | null
          variation_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sku_code?: string
          updated_at?: string
          user_id?: string
          variation_attributes?: Json | null
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tower_events: {
        Row: {
          created_at: string
          event_source: string
          event_type: string
          id: string
          payload: Json | null
          ref_id: string
          ref_table: string
        }
        Insert: {
          created_at?: string
          event_source: string
          event_type: string
          id?: string
          payload?: Json | null
          ref_id: string
          ref_table: string
        }
        Update: {
          created_at?: string
          event_source?: string
          event_type?: string
          id?: string
          payload?: Json | null
          ref_id?: string
          ref_table?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          event_code: string
          event_message: string
          event_time: string
          id: string
          raw_payload: Json | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          event_code: string
          event_message: string
          event_time?: string
          id?: string
          raw_payload?: Json | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          event_code?: string
          event_message?: string
          event_time?: string
          id?: string
          raw_payload?: Json | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_routing_configs: {
        Row: {
          config_json: Json
          config_version: number
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          config_json?: Json
          config_version?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          config_json?: Json
          config_version?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_routing_configs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: true
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capabilities: Json | null
          city: string | null
          code: string
          constraints: Json | null
          country: string
          created_at: string | null
          fulfillment_type_mapping: string | null
          id: string
          is_virtual: boolean | null
          last_synced_at: string | null
          lat: number | null
          lng: number | null
          map_x: number | null
          map_y: number | null
          name: string
          postal_code: string | null
          prefecture: string | null
          status: string
          sync_source: string | null
          sync_status: string | null
          tags: string[] | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          capabilities?: Json | null
          city?: string | null
          code: string
          constraints?: Json | null
          country: string
          created_at?: string | null
          fulfillment_type_mapping?: string | null
          id?: string
          is_virtual?: boolean | null
          last_synced_at?: string | null
          lat?: number | null
          lng?: number | null
          map_x?: number | null
          map_y?: number | null
          name: string
          postal_code?: string | null
          prefecture?: string | null
          status?: string
          sync_source?: string | null
          sync_status?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          capabilities?: Json | null
          city?: string | null
          code?: string
          constraints?: Json | null
          country?: string
          created_at?: string | null
          fulfillment_type_mapping?: string | null
          id?: string
          is_virtual?: boolean | null
          last_synced_at?: string | null
          lat?: number | null
          lng?: number | null
          map_x?: number | null
          map_y?: number | null
          name?: string
          postal_code?: string | null
          prefecture?: string | null
          status?: string
          sync_source?: string | null
          sync_status?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      listing_status: "draft" | "pending" | "active" | "paused" | "error"
      platform_type: "amazon" | "shopee" | "rakuten"
      subscription_tier: "free" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      listing_status: ["draft", "pending", "active", "paused", "error"],
      platform_type: ["amazon", "shopee", "rakuten"],
      subscription_tier: ["free", "premium"],
    },
  },
} as const
