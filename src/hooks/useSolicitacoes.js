import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export const SOLICITACOES_KEY = ['solicitacoes'];

const BACK_OFFICE = ['gerente', 'coordenador', 'atendente'];

/**
 * Busca solicitacoes com joins para usuarios (solicitante), beneficiarios e tipos_equipamento.
 * Solicitantes só veem as próprias (a UI já filtra, mas o RLS é a fonte da verdade).
 */
export function useSolicitacoesQuery({ statuses, tipoId } = {}) {
  const { user, role, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...SOLICITACOES_KEY, { statuses, tipoId, role, userId: user?.id }],
    enabled: isAuthenticated,
    queryFn: async () => {
      let q = supabase
        .from('solicitacoes')
        .select('*, solicitante:usuarios(*), beneficiario:beneficiarios(*), tipo:tipos_equipamento(*)')
        .order('created_at', { ascending: false });

      if (statuses?.length) q = q.in('status', statuses);
      if (tipoId) q = q.eq('tipo_equipamento_id', tipoId);
      if (role === 'solicitante' && user?.id) q = q.eq('solicitante_id', user.id);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEquipamentosQuery() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['equipamentos'],
    enabled: isAuthenticated && BACK_OFFICE.includes(role),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select('*, tipo:tipos_equipamento(*)');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTiposEquipamentoQuery() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['tipos_equipamento'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_equipamento')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Atualiza status de uma solicitação (apenas back-office, garantido pelo RLS).
 */
export function useUpdateSolicitacaoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, motivo }) => {
      const payload = { status };
      if (motivo !== undefined) payload.motivo_status = motivo;
      const { data, error } = await supabase
        .from('solicitacoes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
    },
  });
}

export function useUpdateSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
    },
  });
}
