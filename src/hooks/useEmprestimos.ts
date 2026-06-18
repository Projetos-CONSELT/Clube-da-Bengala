import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { EmprestimoInsert } from '@/types/database.types';
import { isBackOfficeRole, type EmprestimoComRelacoes } from '@/types/domain';

export const EMPRESTIMOS_KEY = ['emprestimos'] as const;

export function useEmprestimosQuery() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: EMPRESTIMOS_KEY,
    enabled: isAuthenticated && isBackOfficeRole(role),
    queryFn: async (): Promise<EmprestimoComRelacoes[]> => {
      const { data, error } = await supabase
        .from('emprestimos')
        .select(
          '*, solicitacao:solicitacoes(*, solicitante:usuarios(*), beneficiario:beneficiarios(*)), equipamento:equipamentos(*, tipo:tipos_equipamento(*))'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmprestimoComRelacoes[];
    },
  });
}

export function useCreateEmprestimo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmprestimoInsert) => {
      const { data, error } = await supabase.from('emprestimos').insert(payload).select().single();
      if (error) throw error;

      await supabase.from('equipamentos').update({ status: 'emprestado' }).eq('id', payload.equipamento_id);
      if (payload.solicitacao_id) {
        await supabase.from('solicitacoes').update({ status: 'encerrada' }).eq('id', payload.solicitacao_id);
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPRESTIMOS_KEY });
      void qc.invalidateQueries({ queryKey: ['equipamentos'] });
      void qc.invalidateQueries({ queryKey: ['solicitacoes'] });
    },
  });
}

export function useRenovarEmprestimo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data_prevista_devolucao,
      renovacoes_realizadas,
      recibo_texto_customizado,
    }: {
      id: string;
      data_prevista_devolucao: string;
      renovacoes_realizadas: number;
      recibo_texto_customizado?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('emprestimos')
        .update({ data_prevista_devolucao, renovacoes_realizadas, recibo_texto_customizado })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: EMPRESTIMOS_KEY }),
  });
}

export function useDevolverEmprestimo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      emprestimoId,
      equipamentoId,
      solicitacaoId,
      solicitanteId,
      marcarInadimplente,
    }: {
      emprestimoId: string;
      equipamentoId: string;
      solicitacaoId?: string | null;
      solicitanteId?: string | null;
      marcarInadimplente?: boolean;
    }) => {
      await supabase.from('equipamentos').update({ status: 'disponivel' }).eq('id', equipamentoId);
      if (solicitacaoId) {
        await supabase.from('solicitacoes').update({ status: 'encerrada' }).eq('id', solicitacaoId);
      }
      if (marcarInadimplente && solicitanteId) {
        await supabase.from('usuarios').update({ is_inadimplente: false }).eq('id', solicitanteId);
      }
      return emprestimoId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPRESTIMOS_KEY });
      void qc.invalidateQueries({ queryKey: ['equipamentos'] });
      void qc.invalidateQueries({ queryKey: ['solicitacoes'] });
      void qc.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}
