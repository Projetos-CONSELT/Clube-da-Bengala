import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { buildAuditLogRequestKey, createAuditLog } from '@/lib/audit';
import type { SolicitacaoInsert, SolicitacaoUpdate, StatusSolicitacao } from '@/types/database.types';
import { FILA_STATUSES, generateProtocolo, isBackOfficeRole, getStatusSolicitacaoUi, type SolicitacaoComRelacoes } from '@/types/domain';

export const SOLICITACOES_KEY = ['solicitacoes'] as const;

interface SolicitacoesQueryOptions {
  statuses?: StatusSolicitacao[];
  tipoId?: string;
  includeEncerradas?: boolean;
  page?: number;
  pageSize?: number;
}

export function useSolicitacoesQuery({ statuses, tipoId, includeEncerradas, page, pageSize }: SolicitacoesQueryOptions = {}) {
  const { user, role, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...SOLICITACOES_KEY, { statuses, tipoId, includeEncerradas, page, pageSize, role, userId: user?.id }],
    enabled: isAuthenticated,
    queryFn: async (): Promise<SolicitacaoComRelacoes[]> => {
      let q = supabase
        .from('solicitacoes')
        .select('*, solicitante:usuarios(*), beneficiario:beneficiarios(*), tipo:tipos_equipamento(*)')
        .order('created_at', { ascending: false });

      if (statuses?.length) q = q.in('status', statuses);
      if (tipoId) q = q.eq('tipo_equipamento_id', tipoId);
      if (role === 'solicitante' && user?.id) q = q.eq('solicitante_id', user.id);

      if (!includeEncerradas && (!statuses || !statuses.includes('encerrada'))) {
        q = q.neq('status', 'encerrada');
      }

      if (page !== undefined && pageSize !== undefined) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        q = q.range(from, to);
      }

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
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('status, protocolo')
        .eq('id', id)
        .single();
      if (currentError) throw currentError;

      const payload: SolicitacaoUpdate = { status };
      if (motivo !== undefined) payload.motivo_solicitacao = motivo;
      const { data, error } = await supabase
        .from('solicitacoes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (data && data.solicitante_id) {
        try {
          const statusUi = getStatusSolicitacaoUi(status);
          await supabase.from('notificacoes').insert({
            solicitacao_id: data.id,
            usuario_id: data.solicitante_id,
            tipo: 'retirada',
            titulo: `Alteração na Solicitação ${data.protocolo || ''}`,
            descricao: `O status da sua solicitação/triagem foi alterado para "${statusUi.label}".`,
            lido: false,
          });
        } catch (e) {
          // Ignora se tabela notificacoes não estiver presente
        }
      }

      const audit = await createAuditLog({
        requestId: id,
        actionType: 'STATUS_CHANGED',
        details: {
          from_status: current?.status ?? null,
          to_status: status,
          protocolo: current?.protocolo ?? null,
          motivo: motivo ?? null,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar alteração de status:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(id) });

      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
      void qc.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

export function useUpdateSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SolicitacaoUpdate }) => {
      const shouldTrackStatusChange = typeof patch.status !== 'undefined';
      const { data: current, error: currentError } = shouldTrackStatusChange
        ? await supabase.from('solicitacoes').select('status, protocolo').eq('id', id).single()
        : { data: null, error: null };
      if (currentError) throw currentError;

      const { data, error } = await supabase
        .from('solicitacoes')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      const audit = await createAuditLog({
        requestId: id,
        actionType: shouldTrackStatusChange ? 'STATUS_CHANGED' : 'UPDATED',
        details: shouldTrackStatusChange
          ? {
              from_status: current?.status ?? null,
              to_status: patch.status ?? null,
              protocolo: current?.protocolo ?? null,
              patch,
            }
          : {
              protocolo: data?.protocolo ?? null,
              patch,
            },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar atualização da solicitação:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(id) });

      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
    },
  });
}

export function useCreateSolicitacao() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
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
      
      const insertData: SolicitacaoInsert = {
        protocolo: generateProtocolo(),
        solicitante_id: user.id,
        beneficiario_id,
        tipo_equipamento_id,
        motivo_solicitacao: motivo_solicitacao || null,
        status: 'triagem',
      };
      
      if (role === 'gerente' && user?.nucleo_id) {
        insertData.nucleo_id = user.nucleo_id;
      }

      const { data, error } = await supabase
        .from('solicitacoes')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;

      const audit = await createAuditLog({
        requestId: data.id,
        actionType: 'CREATED',
        details: {
          protocolo: data.protocolo,
          solicitante_id: user.id,
          beneficiario_id,
          tipo_equipamento_id,
          status: data.status,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar criação da solicitação:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(data.id) });

      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY }),
  });
}

export function useDeleteSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('protocolo, status')
        .eq('id', id)
        .single();
      if (currentError) throw currentError;

      const audit = await createAuditLog({
        requestId: id,
        actionType: 'DELETED',
        details: {
          protocolo: current?.protocolo ?? null,
          previous_status: current?.status ?? null,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar exclusão da solicitação:', audit.error.message);
      }

      const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(id) });

      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY }),
  });
}

export function useReservarEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitacaoId, equipamentoId }: { solicitacaoId: string; equipamentoId: string }) => {
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('status, protocolo')
        .eq('id', solicitacaoId)
        .single();
      if (currentError) throw currentError;

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

      const audit = await createAuditLog({
        requestId: solicitacaoId,
        actionType: 'STATUS_CHANGED',
        details: {
          from_status: current?.status ?? null,
          to_status: 'aguardando_retirada',
          protocolo: current?.protocolo ?? null,
          equipamento_id: equipamentoId,
          prazo_limite_retirada: limite,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar reserva da solicitação:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });

      return true;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOLICITACOES_KEY });
      void qc.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });
}

export { FILA_STATUSES };
