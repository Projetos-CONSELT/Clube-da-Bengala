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

export function useBeneficiariosQuery() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['beneficiarios'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiarios')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function generateProtocolo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SOL-${y}${m}${d}-${r}`;
}

export function useCreateSolicitacao() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ beneficiario_id, tipo_equipamento_id, observacoes }) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      const payload = {
        protocolo: generateProtocolo(),
        solicitante_id: user.id,
        beneficiario_id: beneficiario_id || null,
        tipo_equipamento_id,
        observacoes: observacoes || null,
        status: 'nova',
      };
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SOLICITACOES_KEY }),
  });
}

export function useDeleteSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SOLICITACOES_KEY }),
  });
}

export function useReservarEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitacaoId, equipamentoId }) => {
      const agora = new Date();
      const limite = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { error: e1 } = await supabase
        .from('solicitacoes')
        .update({
          status: 'reservado',
          equipamento_reservado_id: equipamentoId,
          data_reserva: agora.toISOString(),
          data_limite_retirada: limite.toISOString(),
        })
        .eq('id', solicitacaoId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('equipamentos')
        .update({ status: 'reservado' })
        .eq('id', equipamentoId);
      if (e2) throw e2;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
      qc.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });
}

