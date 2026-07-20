import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useSolicitacoesQuery } from '@/hooks/useSolicitacoes';
import { getStatusSolicitacaoUi } from '@/types/domain';

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
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notificacoes', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let q = supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.id) {
        q = q.eq('usuario_id', user.id);
      }

      const { data, error } = await q;
      if (error) {
        console.warn('[useNotificacoesQuery] Aviso:', error.message);
        return [];
      }
      return (data ?? []) as Notificacao[];
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
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
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
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
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
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

/**
 * Hook completo que combina a contagem de notificações não lidas
 * e traz o detalhamento de alterações das triagens/solicitações.
 */
export function useNotificacoesComBadges() {
  const { user } = useAuth();
  const { data: notificacoesData = [], refetch: refetchNotif } = useNotificacoesQuery();
  const { data: solicitacoesData = [] } = useSolicitacoesQuery();

  const localStorageKey = `notif_last_seen_${user?.id || 'guest'}`;
  const [lastSeenTime, setLastSeenTime] = useState<number>(() => {
    const saved = localStorage.getItem(localStorageKey);
    return saved ? Number(saved) : 0;
  });

  const alteracoesList = useMemo(() => {
    const items: Array<{
      id: string;
      protocolo: string;
      titulo: string;
      descricao: string;
      dataFormatted: string;
      timestamp: number;
      lido: boolean;
    }> = [];

    // 1. Adiciona notificações formais da tabela
    notificacoesData.forEach((n) => {
      const ts = new Date(n.created_at).getTime();
      items.push({
        id: n.id,
        protocolo: n.titulo,
        titulo: n.titulo,
        descricao: n.descricao,
        dataFormatted: new Date(n.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: ts,
        lido: n.lido || ts <= lastSeenTime,
      });
    });

    // 2. Adiciona dados das solicitações/triagens alteradas
    solicitacoesData.forEach((sol) => {
      const ts = sol.updated_at ? new Date(sol.updated_at).getTime() : new Date(sol.created_at).getTime();
      const statusUi = getStatusSolicitacaoUi(sol.status);
      const itemId = `sol-update-${sol.id}-${sol.status}`;

      if (!items.some((i) => i.id === itemId || i.id === sol.id)) {
        items.push({
          id: itemId,
          protocolo: sol.protocolo || 'Solicitação',
          titulo: `Alteração na Solicitação ${sol.protocolo || ''}`,
          descricao: `Status da triagem: "${statusUi.label}". Beneficiário: ${sol.beneficiario?.nome_completo || 'Não especificado'}.`,
          dataFormatted: new Date(ts).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: ts,
          lido: ts <= lastSeenTime,
        });
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [notificacoesData, solicitacoesData, lastSeenTime]);

  const unreadCount = alteracoesList.filter((item) => !item.lido).length;

  const marcarTodasLidas = useCallback(async () => {
    const now = Date.now();
    localStorage.setItem(localStorageKey, String(now));
    setLastSeenTime(now);

    try {
      if (user?.id) {
        await supabase.from('notificacoes').update({ lido: true }).eq('usuario_id', user.id);
        void refetchNotif();
      }
    } catch (e) {
      // Ignora erro se a tabela não estiver totalmente configurada
    }
  }, [localStorageKey, user?.id, refetchNotif]);

  return {
    unreadCount,
    alteracoesList,
    marcarTodasLidas,
  };
}
