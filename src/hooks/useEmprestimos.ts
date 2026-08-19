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
        .is('data_devolucao_realizada', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmprestimoComRelacoes[];
    },
  });
}

export function useCreateEmprestimo() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  return useMutation({
    mutationFn: async (payload: EmprestimoInsert) => {
      if (role === 'gerente' && user?.nucleo_id) {
        payload.nucleo_id = user.nucleo_id;
      }
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

export function useRenovarEmprestimoRpc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase.rpc('renovar_emprestimo', {
        p_emprestimo_id: id,
        p_dias_adicionais: 30,
      });
      if (error) throw error;
      return { id, ...(data as { nova_data: string; renovacoes_realizadas: number }) };
    },
    onSuccess: (data) => {
      // Atualiza o estado local sem recarregar tudo
      qc.setQueryData(EMPRESTIMOS_KEY, (old: EmprestimoComRelacoes[] | undefined) => {
        if (!old) return old;
        return old.map((e) =>
          e.id === data.id
            ? {
              ...e,
              data_prevista_devolucao: data.nova_data,
              renovacoes_realizadas: data.renovacoes_realizadas,
            }
            : e
        );
      });
    },
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
      // 1. Marcar data_devolucao_realizada no empréstimo
      const { error: empError } = await supabase
        .from('emprestimos')
        .update({ data_devolucao_realizada: new Date().toISOString() })
        .eq('id', emprestimoId);
      if (empError) throw empError;

      // 2. Atualizar o equipamento de volta para disponível
      const { error: eqError } = await supabase
        .from('equipamentos')
        .update({ status: 'disponivel' })
        .eq('id', equipamentoId);
      if (eqError) throw eqError;

      // 3. Encerrar a solicitação se houver
      if (solicitacaoId) {
        const { error: solError } = await supabase
          .from('solicitacoes')
          .update({ status: 'encerrada' })
          .eq('id', solicitacaoId);
        if (solError) throw solError;
      }

      // 4. Limpar marcação de inadimplente se selecionado
      if (marcarInadimplente && solicitanteId) {
        await supabase.from('usuarios').update({ is_inadimplente: false }).eq('id', solicitanteId);
      }

      return emprestimoId;
    },
    onSuccess: (emprestimoId) => {
      qc.setQueryData(EMPRESTIMOS_KEY, (old: EmprestimoComRelacoes[] | undefined) => {
        if (!old) return old;
        return old.filter((e) => e.id !== emprestimoId);
      });
      void qc.invalidateQueries({ queryKey: EMPRESTIMOS_KEY });
      void qc.invalidateQueries({ queryKey: ['equipamentos'] });
      void qc.invalidateQueries({ queryKey: ['solicitacoes'] });
      void qc.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}
