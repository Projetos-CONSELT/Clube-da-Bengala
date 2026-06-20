import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Notificacao {
  id: string;
  solicitacao_id: string;
  usuario_id: string;
  tipo: 'boleto' | 'pagamento' | 'inadimplencia' | 'retirada' | 'devolucao';
  titulo: string;
  descricao: string;
  lido: boolean;
  link_acao?: string;
  created_at: string;
}

/**
 * Busca todas as notificações do usuário logado
 */
export function useNotificacoesQuery() {
  return useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notificacao[];
    },
  });
}

/**
 * Cria uma nova notificação
 */
export function useCriarNotificacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      usuarioId,
      tipo,
      titulo,
      descricao,
      linkAcao,
    }: {
      solicitacaoId: string;
      usuarioId: string;
      tipo: 'boleto' | 'pagamento' | 'inadimplencia' | 'retirada' | 'devolucao';
      titulo: string;
      descricao: string;
      linkAcao?: string;
    }) => {
      const { data, error } = await supabase
        .from('notificacoes')
        .insert([
          {
            solicitacao_id: solicitacaoId,
            usuario_id: usuarioId,
            tipo,
            titulo,
            descricao,
            link_acao: linkAcao,
            lido: false,
          },
        ])
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

/**
 * Marca uma notificação como lida
 */
export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { data, error } = await supabase
        .from('notificacoes')
        .update({ lido: true })
        .eq('id', notificacaoId)
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

/**
 * Deleta uma notificação
 */
export function useDeletarNotificacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

/**
 * Conta notificações não lidas
 */
export function useNotificacoesNaoLidas() {
  const { data: notificacoes = [] } = useNotificacoesQuery();
  return notificacoes.filter((n) => !n.lido).length;
}
