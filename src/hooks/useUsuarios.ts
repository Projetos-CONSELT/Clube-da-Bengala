import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const tempPassword = `Temp_${window.crypto.randomUUID().slice(0, 8)}!Aa1`;

      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: usuario.email!,
        password: tempPassword,
        options: {
          data: {
            nome_completo: usuario.nome_completo,
            cpf: usuario.cpf || null,
            whatsapp: usuario.whatsapp || null,
            papel: usuario.papel || 'solicitante',
            nucleo_id: usuario.nucleo_id || null,
            pode_criar_nucleos: usuario.pode_criar_nucleos || false,
          },
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (
          msg.includes('already registered') ||
          msg.includes('user_already_exists') ||
          msg.includes('já está cadastrado')
        ) {
          throw new Error('Este e-mail já está cadastrado no sistema.');
        }
        throw new Error(authError.message);
      }

      const createdUserId = authData.user?.id;
      if (createdUserId) {
        await supabase
          .from('usuarios')
          .update({
            nome_completo: usuario.nome_completo,
            cpf: usuario.cpf || null,
            whatsapp: usuario.whatsapp || null,
            papel: usuario.papel || 'solicitante',
            nucleo_id: usuario.nucleo_id || null,
            pode_criar_nucleos: usuario.pode_criar_nucleos || false,
          })
          .eq('id', createdUserId);
      }

      return authData.user;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

