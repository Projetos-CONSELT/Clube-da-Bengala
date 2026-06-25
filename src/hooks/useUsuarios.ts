import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { UsuarioInsert, UsuarioUpdate, UserRole } from '@/types/database.types';
import { isBackOfficeRole } from '@/types/domain';

export const USUARIOS_KEY = ['usuarios'] as const;

export function useUsuariosQuery() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: USUARIOS_KEY,
    enabled: isAuthenticated && isBackOfficeRole(role),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });
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
      const { data, error } = await supabase
        .from('usuarios')
        .update({ papel })
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
