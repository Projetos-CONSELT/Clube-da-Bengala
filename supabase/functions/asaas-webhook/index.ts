/**
 * Supabase Edge Function: asaas-webhook
 * Processa notificações de pagamento do Asaas e quita automaticamente a solicitação no banco.
 * Desenvolvido por: CONSELT (https://github.com/Projetos-CONSELT)
 * Licença: Licença Proprietária CONSELT
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const asaasWebhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET') || '';

    // Validação opcional de token do webhook
    const receivedToken = req.headers.get('asaas-access-token');
    if (asaasWebhookSecret && receivedToken && receivedToken !== asaasWebhookSecret) {
      return new Response(JSON.stringify({ error: 'Token de webhook inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const event = body.event; // PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE
    const payment = body.payment;

    console.log(`[Asaas Webhook] Evento recebido: ${event} para o pagamento: ${payment?.id}`);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const solicitacaoId = payment?.externalReference;

      if (!solicitacaoId) {
        console.warn('[Asaas Webhook] externalReference (solicitacaoId) não informado.');
        return new Response(JSON.stringify({ received: true, note: 'sem externalReference' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Chama a procedure SQL de confirmação de fatura
      const { data, error } = await supabase.rpc('confirmar_pagamento_fatura', {
        p_solicitacao_id: solicitacaoId,
        p_cpf: null, // Executa diretamente com privilégios de service_role
      });

      if (error) {
        console.error('[Asaas Webhook] Erro ao confirmar pagamento:', error);
        throw error;
      }

      console.log(`[Asaas Webhook] Pagamento confirmado com sucesso para a solicitação ${solicitacaoId}:`, data);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('[Asaas Webhook] Erro:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
