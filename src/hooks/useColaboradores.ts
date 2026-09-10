import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { ColaboradorInsert, ColaboradorUpdate } from '@/types/database.types';
import { isBackOfficeRole } from '@/types/domain';

export const COLABORADORES_KEY = ['colaboradores'] as const;
export const COLABORADORES_ATIVOS_KEY = ['colaboradores_ativos'] as const;

export function useColaboradoresQuery() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: COLABORADORES_KEY,
    enabled: isAuthenticated && isBackOfficeRole(role),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAtivosColaboradoresQuery() {
  return useQuery({
    queryKey: COLABORADORES_ATIVOS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('is_ativo', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ColaboradorUpdate }) => {
      const { data, error } = await supabase
        .from('colaboradores')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLABORADORES_KEY });
      qc.invalidateQueries({ queryKey: COLABORADORES_ATIVOS_KEY });
    },
  });
}

export function useCreateColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (colaborador: Omit<ColaboradorInsert, 'id'>) => {
      const id = window.crypto.randomUUID();
      const payload: ColaboradorInsert = {
        ...colaborador,
        id,
        is_ativo: colaborador.is_ativo !== undefined ? colaborador.is_ativo : false,
      };
      
      // Se aceitou termo, registramos a data
      if (payload.aceitou_termo && !payload.data_aceite_termo) {
        payload.data_aceite_termo = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('colaboradores')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLABORADORES_KEY });
    },
  });
}
