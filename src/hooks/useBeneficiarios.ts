import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { BeneficiarioInsert, BeneficiarioUpdate } from '@/types/database.types';
import { isBackOfficeRole } from '@/types/domain';

export const BENEFICIARIOS_KEY = ['beneficiarios'] as const;

export function useBeneficiariosQuery() {
  const { isAuthenticated, role, user } = useAuth();
  return useQuery({
    queryKey: [...BENEFICIARIOS_KEY, role, user?.id],
    enabled: isAuthenticated,
    queryFn: async () => {
      let q = supabase.from('beneficiarios').select('*').order('nome_completo', { ascending: true });
      if (role === 'solicitante' && user?.id) {
        q = q.eq('solicitante_id', user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBeneficiario() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<BeneficiarioInsert, 'solicitante_id'> & { solicitante_id?: string }) => {
      const solicitante_id = payload.solicitante_id ?? user?.id;
      if (!solicitante_id) throw new Error('Solicitante não identificado.');
      const row: BeneficiarioInsert = { ...payload, solicitante_id };
      const { data, error } = await supabase.from('beneficiarios').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}

export function useUpdateBeneficiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: BeneficiarioUpdate }) => {
      const { data, error } = await supabase
        .from('beneficiarios')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}

export function useDeleteBeneficiario() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!isBackOfficeRole(role)) {
        const { error } = await supabase.from('beneficiarios').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('beneficiarios').delete().eq('id', id);
        if (error) throw error;
      }
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}
