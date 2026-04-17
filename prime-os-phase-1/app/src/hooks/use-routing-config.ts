import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoutingConfig, createDefaultRoutingConfig } from '@/lib/routing-config-types';
import { toast } from 'sonner';
import type { Json } from '@/lib/types-supabase';

interface WarehouseRoutingConfig {
  id: string;
  warehouse_id: string;
  config_version: number;
  is_enabled: boolean;
  config_json: Json;
  created_at: string;
  updated_at: string;
}

export function useRoutingConfig(warehouseId: string, warehouseName: string, warehouseCountry: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: configRecord, isLoading, error } = useQuery({
    queryKey: ['warehouse-routing-config', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_routing_configs')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      if (error) throw error;
      return data as WarehouseRoutingConfig | null;
    },
    enabled: !!user && !!warehouseId,
  });

  // Parse the config JSON or create default
  const config: RoutingConfig = configRecord?.config_json
    ? (configRecord.config_json as unknown as RoutingConfig)
    : createDefaultRoutingConfig(warehouseName, warehouseCountry);

  const isEnabled = configRecord?.is_enabled ?? true;
  const configVersion = configRecord?.config_version ?? 1;

  const saveMutation = useMutation({
    mutationFn: async (newConfig: RoutingConfig) => {
      if (configRecord) {
        // Update existing
        const { error } = await supabase
          .from('warehouse_routing_configs')
          .update({
            config_json: newConfig as unknown as Json,
            config_version: configVersion + 1,
          })
          .eq('id', configRecord.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('warehouse_routing_configs')
          .insert({
            warehouse_id: warehouseId,
            config_json: newConfig as unknown as Json,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-routing-config', warehouseId] });
      toast.success('Routing configuration saved');
    },
    onError: (error) => {
      toast.error('Failed to save configuration: ' + error.message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const defaultConfig = createDefaultRoutingConfig(warehouseName, warehouseCountry);
      
      if (configRecord) {
        const { error } = await supabase
          .from('warehouse_routing_configs')
          .update({
            config_json: defaultConfig as unknown as Json,
            config_version: configVersion + 1,
          })
          .eq('id', configRecord.id);

        if (error) throw error;
      }
      
      return defaultConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-routing-config', warehouseId] });
      toast.success('Configuration reset to defaults');
    },
    onError: (error) => {
      toast.error('Failed to reset configuration: ' + error.message);
    },
  });

  return {
    config,
    isEnabled,
    configVersion,
    isLoading,
    error,
    hasExistingConfig: !!configRecord,
    saveConfig: saveMutation.mutate,
    resetConfig: resetMutation.mutate,
    isSaving: saveMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}
