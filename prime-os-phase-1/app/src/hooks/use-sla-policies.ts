import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SlaPolicy } from '@/lib/sla-policy-types';

export function useSlaPolicies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sla-policies', user?.id],
    queryFn: async (): Promise<SlaPolicy[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SlaPolicy[];
    },
    enabled: !!user,
  });
}

export function useSlaPolicy(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sla-policy', id],
    queryFn: async (): Promise<SlaPolicy | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SlaPolicy;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateSlaPolicy() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (policy: Partial<SlaPolicy>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('sla_policies')
        .insert({ ...policy, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as SlaPolicy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sla-policies'] });
      toast.success('SLA Policy created');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}

export function useUpdateSlaPolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SlaPolicy> & { id: string }) => {
      const { data, error } = await supabase
        .from('sla_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SlaPolicy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sla-policies'] });
      qc.invalidateQueries({ queryKey: ['sla-policy'] });
      toast.success('SLA Policy updated');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}

export function useDeleteSlaPolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sla_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sla-policies'] });
      toast.success('SLA Policy deleted');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}

export function useToggleSlaPolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sla_policies')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sla-policies'] });
      qc.invalidateQueries({ queryKey: ['sla-policy'] });
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}
