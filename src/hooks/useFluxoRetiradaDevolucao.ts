import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { StatusSolicitacao } from '@/types/database.types';
import { buildAuditLogRequestKey, createAuditLog } from '@/lib/audit';

const FLUXO_KEY = ['fluxo_retirada_devolucao'] as const;

/**
 * Registra o prazo de retirada de uma solicitação
 */
export function useRegistrarPrazoRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ solicitacaoId, prazoRetirada }: { solicitacaoId: string; prazoRetirada: Date }) => {
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('protocolo, status')
        .eq('id', solicitacaoId)
        .single();
      if (currentError) throw currentError;

      const { data, error } = await supabase
        .from('solicitacoes')
        .update({ prazo_retirada: prazoRetirada.toISOString() })
        .eq('id', solicitacaoId)
        .select()
        .single();
      if (error) throw error;

      const audit = await createAuditLog({
        requestId: solicitacaoId,
        actionType: 'UPDATED',
        details: {
          protocolo: current?.protocolo ?? null,
          previous_status: current?.status ?? null,
          prazo_retirada: prazoRetirada.toISOString(),
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar prazo de retirada:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });

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
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('status, protocolo')
        .eq('id', solicitacaoId)
        .single();
      if (currentError) throw currentError;

      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({
          status: 'equipamento_emprestado' as StatusSolicitacao,
          data_retirada_realizada: new Date().toISOString(),
          equipamento_reservado_id: equipamentoId,
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

      const audit = await createAuditLog({
        requestId: solicitacaoId,
        actionType: 'STATUS_CHANGED',
        details: {
          from_status: current?.status ?? null,
          to_status: 'equipamento_emprestado',
          protocolo: current?.protocolo ?? null,
          equipamento_id: equipamentoId,
          data_prevista_devolucao: dataPrevistaDevolucao.toISOString(),
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar retirada:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });

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
      equipamentoId?: string;
      novoEstadoConservacao: string;
    }) => {
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('status, protocolo')
        .eq('id', solicitacaoId)
        .single();
      if (currentError) throw currentError;

      // 1. Atualizar status da solicitação
      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({
          status: 'encerrada' as StatusSolicitacao,
        })
        .eq('id', solicitacaoId);
      if (solError) throw solError;

      // 2. Buscar o equipamento_id do empréstimo se não foi fornecido
      let realEquipamentoId = equipamentoId;
      if (!realEquipamentoId) {
        const { data: emprestimo, error: empError } = await supabase
          .from('emprestimos')
          .select('equipamento_id')
          .eq('solicitacao_id', solicitacaoId)
          .is('data_devolucao_realizada', null)
          .maybeSingle();

        if (empError) throw empError;
        if (emprestimo) {
          realEquipamentoId = emprestimo.equipamento_id;
        }
      }

      // 3. Se ainda assim não encontrar, tentar pegar de solicitacoes.equipamento_reservado_id
      if (!realEquipamentoId) {
        const { data: sol, error: getSolError } = await supabase
          .from('solicitacoes')
          .select('equipamento_reservado_id')
          .eq('id', solicitacaoId)
          .single();
        if (getSolError) throw getSolError;
        if (sol && sol.equipamento_reservado_id) {
          realEquipamentoId = sol.equipamento_reservado_id;
        }
      }

      // 4. Se não encontrar o equipamentoId, lançar erro amigável
      if (!realEquipamentoId) {
        throw new Error("Não foi possível localizar o equipamento associado a esta devolução.");
      }

      // 5. Atualizar status e estado do equipamento
      const { error: eqError } = await supabase
        .from('equipamentos')
        .update({
          status: 'disponivel',
          estado_conservacao: novoEstadoConservacao,
        })
        .eq('id', realEquipamentoId);
      if (eqError) throw eqError;

      // 6. Atualizar data de devolução no empréstimo
      const { error: empreError } = await supabase
        .from('emprestimos')
        .update({ data_devolucao_realizada: new Date().toISOString() })
        .eq('solicitacao_id', solicitacaoId)
        .is('data_devolucao_realizada', null);
      if (empreError) throw empreError;

      const audit = await createAuditLog({
        requestId: solicitacaoId,
        actionType: 'STATUS_CHANGED',
        details: {
          from_status: current?.status ?? null,
          to_status: 'encerrada',
          protocolo: current?.protocolo ?? null,
          equipamento_id: realEquipamentoId,
          novo_estado_conservacao: novoEstadoConservacao,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar devolução:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });

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
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('status, protocolo')
        .eq('id', solicitacaoId)
        .single();
      if (currentError) throw currentError;

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

      const audit = await createAuditLog({
        requestId: solicitacaoId,
        actionType: 'MESSAGE_SENT',
        details: {
          protocolo: current?.protocolo ?? null,
          previous_status: current?.status ?? null,
          tipo: 'boleto',
          link_boleto: linkBoleto,
          valor_boleto: valorBoleto,
          prazo_vencimento_boleto: prazoVencimento.toISOString(),
          mensagem: textoNotificacao,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar boleto de ressarcimento:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });

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
      const { data: current, error: currentError } = await supabase
        .from('solicitacoes')
        .select('status, protocolo')
        .eq('id', solicitacaoId)
        .single();
      if (currentError) throw currentError;

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

      const audit = await createAuditLog({
        requestId: solicitacaoId,
        actionType: 'PAYMENT_APPROVED',
        details: {
          protocolo: current?.protocolo ?? null,
          previous_status: current?.status ?? null,
          valor_pago: valorPago,
          texto_customizado: textoCustomizado,
        },
      });
      if (audit.error) {
        console.warn('[audit] não foi possível registrar pagamento:', audit.error.message);
      }
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });

      return reciboData;
    },
    onSuccess: (_, { solicitacaoId, solicitanteId }) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes', { solicitacaoId }] });
      qc.invalidateQueries({ queryKey: ['usuarios', { userId: solicitanteId }] });
      qc.invalidateQueries({ queryKey: ['recibos_pagamento'] });
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });
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
      void qc.invalidateQueries({ queryKey: buildAuditLogRequestKey(solicitacaoId) });
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
