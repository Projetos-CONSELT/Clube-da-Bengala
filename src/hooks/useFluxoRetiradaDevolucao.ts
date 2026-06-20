import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { StatusSolicitacao } from '@/types/database.types';

const FLUXO_KEY = ['fluxo_retirada_devolucao'] as const;

/**
 * Registra o prazo de retirada de uma solicitação
 */
export function useRegistrarPrazoRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitacaoId, prazoRetirada }: { solicitacaoId: string; prazoRetirada: Date }) => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .update({ prazo_retirada: prazoRetirada.toISOString() })
        .eq('id', solicitacaoId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
    },
  });
}

/**
 * Registra a retirada do equipamento e cria o empréstimo
 */
export function useRegistrarRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      equipamentoId,
      dataPrevistaDevolucao,
    }: {
      solicitacaoId: string;
      equipamentoId: string;
      dataPrevistaDevolucao: Date;
    }) => {
      // Atualizar status da solicitação
      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({
          status: 'equipamento_emprestado' as StatusSolicitacao,
          data_retirada_realizada: new Date().toISOString(),
        })
        .eq('id', solicitacaoId);
      if (solError) throw solError;

      // Atualizar status do equipamento
      const { error: eqError } = await supabase
        .from('equipamentos')
        .update({ status: 'emprestado' })
        .eq('id', equipamentoId);
      if (eqError) throw eqError;

      // Criar registro de empréstimo
      const { data: empreData, error: empreError } = await supabase
        .from('emprestimos')
        .insert({
          solicitacao_id: solicitacaoId,
          equipamento_id: equipamentoId,
          data_retirada: new Date().toISOString(),
          data_prevista_devolucao: dataPrevistaDevolucao.toISOString(),
        })
        .select()
        .single();
      if (empreError) throw empreError;
      return empreData;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
      qc.invalidateQueries({ queryKey: ['emprestimos'] });
    },
  });
}

/**
 * Registra a devolução do equipamento
 */
export function useRegistrarDevolucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      equipamentoId,
      novoEstadoConservacao,
    }: {
      solicitacaoId: string;
      equipamentoId: string;
      novoEstadoConservacao: string;
    }) => {
      // Atualizar status da solicitação
      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({
          status: 'encerrada' as StatusSolicitacao,
        })
        .eq('id', solicitacaoId);
      if (solError) throw solError;

      // Atualizar status e estado do equipamento
      const { error: eqError } = await supabase
        .from('equipamentos')
        .update({
          status: 'disponivel',
          estado_conservacao: novoEstadoConservacao,
        })
        .eq('id', equipamentoId);
      if (eqError) throw eqError;

      // Atualizar data de devolução no empréstimo
      const { error: empreError } = await supabase
        .from('emprestimos')
        .update({ data_devolucao_realizada: new Date().toISOString() })
        .eq('solicitacao_id', solicitacaoId);
      if (empreError) throw empreError;

      return { success: true };
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
      qc.invalidateQueries({ queryKey: ['equipamentos'] });
      qc.invalidateQueries({ queryKey: ['emprestimos'] });
    },
  });
}

/**
 * Registra boleto de ressarcimento quando não há devolução
 */
export function useRegistrarBoletoRessarcimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      linkBoleto,
      valorBoleto,
      prazoVencimento,
      textoNotificacao,
      solicitanteId,
    }: {
      solicitacaoId: string;
      linkBoleto: string;
      valorBoleto: number;
      prazoVencimento: Date;
      textoNotificacao: string;
      solicitanteId: string;
    }) => {
      // Atualizar solicitação com dados do boleto
      const { data, error } = await supabase
        .from('solicitacoes')
        .update({
          status: 'em_cobranca' as StatusSolicitacao,
          link_boleto_ressarcimento: linkBoleto,
          valor_boleto_ressarcimento: valorBoleto,
          prazo_vencimento_boleto: prazoVencimento.toISOString(),
          texto_notificacao_boleto: textoNotificacao,
        })
        .eq('id', solicitacaoId)
        .select()
        .single();
      if (error) throw error;

      // Criar notificação para o solicitante
      const { error: notifError } = await supabase
        .from('notificacoes')
        .insert({
          solicitacao_id: solicitacaoId,
          usuario_id: solicitanteId,
          tipo: 'boleto',
          titulo: 'Boleto de Ressarcimento Registrado',
          descricao: textoNotificacao || `Boleto no valor de R$ ${valorBoleto.toFixed(2)} vence em ${prazoVencimento.toLocaleDateString('pt-BR')}`,
          link_acao: linkBoleto,
        });
      if (notifError) console.error('Erro ao criar notificação:', notifError);

      return data;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
    },
  });
}

/**
 * Registra pagamento do boleto e gera recibo
 */
export function useRegistrarPagamentoRessarcimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      solicitanteId,
      nomeCompleto,
      cpf,
      descricaoEquipamento,
      valorPago,
      textoCustomizado,
    }: {
      solicitacaoId: string;
      solicitanteId: string;
      nomeCompleto: string;
      cpf: string;
      descricaoEquipamento: string;
      valorPago: number;
      textoCustomizado: string;
    }) => {
      // Atualizar solicitação
      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({
          status: 'encerrada' as StatusSolicitacao,
          pagamento_ressarcimento_realizado: true,
          data_pagamento_ressarcimento: new Date().toISOString(),
        })
        .eq('id', solicitacaoId);
      if (solError) throw solError;

      // Remover inadimplência do solicitante
      const { error: usError } = await supabase
        .from('usuarios')
        .update({ is_inadimplente: false })
        .eq('id', solicitanteId);
      if (usError) throw usError;

      // Criar recibo de pagamento
      const { data: reciboData, error: reciboError } = await supabase
        .from('recibos_pagamento')
        .insert({
          solicitacao_id: solicitacaoId,
          solicitante_id: solicitanteId,
          nome_completo: nomeCompleto,
          cpf: cpf,
          descricao_equipamento: descricaoEquipamento,
          valor_pago: valorPago,
          texto_customizado: textoCustomizado,
        })
        .select()
        .single();
      if (reciboError) throw reciboError;

      // Criar notificação para o solicitante
      const { error: notifError } = await supabase
        .from('notificacoes')
        .insert({
          solicitacao_id: solicitacaoId,
          usuario_id: solicitanteId,
          tipo: 'pagamento',
          titulo: 'Pagamento Registrado com Sucesso',
          descricao: `Seu pagamento de R$ ${valorPago.toFixed(2)} foi confirmado. Recibo disponível.`,
        });
      if (notifError) console.error('Erro ao criar notificação:', notifError);

      return reciboData;
    },
    onSuccess: (_, { solicitacaoId, solicitanteId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
      qc.invalidateQueries({ queryKey: ['usuarios', { userId: solicitanteId }] });
      qc.invalidateQueries({ queryKey: ['recibos_pagamento'] });
    },
  });
}

/**
 * Marca solicitante como inadimplente quando boleto vence sem pagamento
 */
export function useMarcarInadimplente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitacaoId, solicitanteId }: { solicitacaoId: string; solicitanteId: string }) => {
      // Marcar solicitante como inadimplente
      const { error: usError } = await supabase
        .from('usuarios')
        .update({ is_inadimplente: true })
        .eq('id', solicitanteId);
      if (usError) throw usError;

      // Encerrar solicitação
      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({ status: 'encerrada' as StatusSolicitacao })
        .eq('id', solicitacaoId);
      if (solError) throw solError;

      return { success: true };
    },
    onSuccess: (_, { solicitacaoId, solicitanteId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
      qc.invalidateQueries({ queryKey: ['usuarios', { userId: solicitanteId }] });
    },
  });
}

/**
 * Reverte status de inadimplência do solicitante
 */
export function useReverterInadimplencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitanteId }: { solicitanteId: string }) => {
      const { data, error } = await supabase
        .from('usuarios')
        .update({ is_inadimplente: false })
        .eq('id', solicitanteId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { solicitanteId }) => {
      qc.invalidateQueries({ queryKey: ['usuarios', { userId: solicitanteId }] });
    },
  });
}

/**
 * Busca recibo de pagamento de uma solicitação
 */
export function useReciboQuery(solicitacaoId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...FLUXO_KEY, { solicitacaoId, type: 'recibo' }],
    enabled: isAuthenticated && !!solicitacaoId,
    queryFn: async () => {
      if (!solicitacaoId) return null;
      const { data, error } = await supabase
        .from('recibos_pagamento')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    },
  });
}
