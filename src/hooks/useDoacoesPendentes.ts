import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { isBackOfficeRole } from '@/types/domain';
import { useCeoContext } from '@/lib/CeoContext';
import type { Database } from '@/types/database.types';

export const DOACOES_PENDENTES_KEY = ['doacoes_pendentes'] as const;

type DoacaoPendenteInsert = Database['public']['Tables']['doacoes_pendentes']['Insert'];

export function useDoacoesPendentesQuery() {
  const { isAuthenticated, role } = useAuth();
  const { selectedNucleusId } = useCeoContext();
  return useQuery({
    queryKey: [...DOACOES_PENDENTES_KEY, selectedNucleusId],
    enabled: isAuthenticated && isBackOfficeRole(role),
    queryFn: async () => {
      let q = supabase
        .from('doacoes_pendentes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (selectedNucleusId) {
        q = q.eq('nucleo_id', selectedNucleusId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateDoacaoPendente() {
  return useMutation({
    mutationFn: async (payload: DoacaoPendenteInsert) => {
      const { data, error } = await supabase
        .from('doacoes_pendentes')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateDoacaoPendenteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pendente' | 'aprovado' | 'rejeitado' }) => {
      const { data, error } = await supabase
        .from('doacoes_pendentes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOACOES_PENDENTES_KEY });
    },
  });
}
