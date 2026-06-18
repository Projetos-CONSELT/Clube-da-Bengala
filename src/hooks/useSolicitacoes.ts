import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { SolicitacaoUpdate, StatusSolicitacao } from '@/types/database.types';
import { FILA_STATUSES, generateProtocolo, isBackOfficeRole, type SolicitacaoComRelacoes } from '@/types/domain';

export const SOLICITACOES_KEY = ['solicitacoes'] as const;

interface SolicitacoesQueryOptions {
  statuses?: StatusSolicitacao[];
  tipoId?: string;
}

export function useSolicitacoesQuery({ statuses, tipoId }: SolicitacoesQueryOptions = {}) {
  const { user, role, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...SOLICITACOES_KEY, { statuses, tipoId, role, userId: user?.id }],
    enabled: isAuthenticated,
    queryFn: async (): Promise<SolicitacaoComRelacoes[]> => {
      let q = supabase
        .from('solicitacoes')
        .select('*, solicitante:usuarios(*), beneficiario:beneficiarios(*), tipo:tipos_equipamento(*)')
        .order('created_at', { ascending: false });

      if (statuses?.length) q = q.in('status', statuses);
      if (tipoId) q = q.eq('tipo_equipamento_id', tipoId);
      if (role === 'solicitante' && user?.id) q = q.eq('solicitante_id', user.id);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SolicitacaoComRelacoes[];
    },
  });
}

export function useEquipamentosQuery() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['equipamentos'],
    enabled: isAuthenticated && isBackOfficeRole(role),
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

export function useUpdateSolicitacaoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, motivo }: { id: string; status: StatusSolicitacao; motivo?: string }) => {
      const payload: SolicitacaoUpdate = { status };
      if (motivo !== undefined) payload.motivo_solicitacao = motivo;
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
      void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
    },
  });
}

export function useUpdateSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SolicitacaoUpdate }) => {
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
      void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
    },
  });
}

export function useCreateSolicitacao() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      beneficiario_id,
      tipo_equipamento_id,
      motivo_solicitacao,
    }: {
      beneficiario_id: string;
      tipo_equipamento_id: string;
      motivo_solicitacao?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({
          protocolo: generateProtocolo(),
          solicitante_id: user.id,
          beneficiario_id,
          tipo_equipamento_id,
          motivo_solicitacao: motivo_solicitacao || null,
          status: 'triagem',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY }),
  });
}

export function useDeleteSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY }),
  });
}

export function useReservarEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitacaoId, equipamentoId }: { solicitacaoId: string; equipamentoId: string }) => {
      const limite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: e1 } = await supabase
        .from('solicitacoes')
        .update({
          status: 'aguardando_retirada',
          equipamento_reservado_id: equipamentoId,
          prazo_limite_retirada: limite,
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
      void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
      void qc.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });
}

export { FILA_STATUSES };
