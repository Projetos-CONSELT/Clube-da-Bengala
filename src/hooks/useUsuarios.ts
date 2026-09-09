import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useCeoContext } from '@/lib/CeoContext';
import type { UsuarioInsert, UsuarioUpdate, UserRole } from '@/types/database.types';
import { isBackOfficeRole } from '@/types/domain';

export const USUARIOS_KEY = ['usuarios'] as const;

export function useUsuariosQuery() {
  const { isAuthenticated, role } = useAuth();
  const { selectedNucleusId } = useCeoContext();

  return useQuery({
    queryKey: [...USUARIOS_KEY, { nucleoId: selectedNucleusId }],
    enabled: isAuthenticated && isBackOfficeRole(role),
    queryFn: async () => {
      let q = supabase
        .from('usuarios')
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

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UsuarioUpdate }) => {
      const { data, error } = await supabase
        .from('usuarios')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useUpdateUsuarioPapel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, papel }: { id: string; papel: UserRole }) => {
      const payload: any = { papel };
      if (papel !== 'gerente' && papel !== 'ceo') {
        payload.pode_criar_nucleos = false;
      }
      const { data, error } = await supabase
        .from('usuarios')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (usuario: Omit<UsuarioInsert, 'id'>) => {
      const id = window.crypto.randomUUID();
      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          ...usuario,
          id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}
