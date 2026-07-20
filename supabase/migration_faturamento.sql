-- ====================================================================================
-- SCRIPT DE ATUALIZAÇÃO - FUNÇÕES DE COBRANÇA PÚBLICA SEGURA
-- Execute este script no SQL Editor do seu painel do Supabase
-- para permitir a visualização de faturas e confirmação de pagamento sem login, 
-- mediante validação de CPF.
-- ====================================================================================

-- 1. Função para obter detalhes da cobrança de forma segura
CREATE OR REPLACE FUNCTION public.obter_detalhes_cobranca(
    p_solicitacao_id UUID,
    p_cpf TEXT
)
RETURNS TABLE (
    id UUID,
    protocolo VARCHAR(20),
    status VARCHAR(50),
    valor_boleto_ressarcimento DECIMAL(10,2),
    prazo_vencimento_boleto TIMESTAMP WITH TIME ZONE,
    link_boleto_ressarcimento TEXT,
    pagamento_ressarcimento_realizado BOOLEAN,
    data_pagamento_ressarcimento TIMESTAMP WITH TIME ZONE,
    solicitante_nome VARCHAR(255),
    equipamento_nome VARCHAR(100)
) 
SECURITY DEFINER -- Permite executar a consulta ignorando políticas RLS de tabelas
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.protocolo,
        s.status::VARCHAR(50),
        s.valor_boleto_ressarcimento,
        s.prazo_vencimento_boleto,
        s.link_boleto_ressarcimento,
        s.pagamento_ressarcimento_realizado,
        s.data_pagamento_ressarcimento,
        u.nome_completo AS solicitante_nome,
        t.nome AS equipamento_nome
    FROM public.solicitacoes s
    JOIN public.usuarios u ON u.id = s.solicitante_id
    JOIN public.tipos_equipamento t ON t.id = s.tipo_equipamento_id
    WHERE s.id = p_solicitacao_id 
      AND (
          -- Remove pontuação de ambos os CPFs para comparação precisa
          REPLACE(REPLACE(REPLACE(u.cpf, '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(p_cpf, '.', ''), '-', ''), ' ', '')
      );
END;
$$ LANGUAGE plpgsql;

-- 2. Função para simular/confirmar pagamento da cobrança de forma segura
CREATE OR REPLACE FUNCTION public.confirmar_pagamento_fatura(
    p_solicitacao_id UUID,
    p_cpf TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
    v_solicitante_id UUID;
    v_solicitante_nome VARCHAR(255);
    v_solicitante_cpf VARCHAR(14);
    v_equipamento_desc TEXT;
    v_valor_cobranca DECIMAL(10,2);
BEGIN
    -- Obter os detalhes necessários
    SELECT 
        s.solicitante_id,
        u.nome_completo,
        u.cpf,
        t.nome,
        COALESCE(s.valor_boleto_ressarcimento, 0.00)
    INTO 
        v_solicitante_id,
        v_solicitante_nome,
        v_solicitante_cpf,
        v_equipamento_desc,
        v_valor_cobranca
    FROM public.solicitacoes s
    JOIN public.usuarios u ON u.id = s.solicitante_id
    JOIN public.tipos_equipamento t ON t.id = s.tipo_equipamento_id
    WHERE s.id = p_solicitacao_id 
      AND REPLACE(REPLACE(REPLACE(u.cpf, '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(p_cpf, '.', ''), '-', ''), ' ', '');

    IF v_solicitante_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Atualizar solicitação
    UPDATE public.solicitacoes
    SET 
        status = 'encerrada',
        pagamento_ressarcimento_realizado = TRUE,
        data_pagamento_ressarcimento = NOW()
    WHERE id = p_solicitacao_id;

    -- 2. Remover inadimplência do usuário
    UPDATE public.usuarios
    SET is_inadimplente = FALSE
    WHERE id = v_solicitante_id;

    -- 3. Criar recibo de pagamento
    INSERT INTO public.recibos_pagamento (
        solicitacao_id,
        solicitante_id,
        nome_completo,
        cpf,
        descricao_equipamento,
        valor_pago,
        texto_customizado
    ) VALUES (
        p_solicitacao_id,
        v_solicitante_id,
        v_solicitante_nome,
        v_solicitante_cpf,
        v_equipamento_desc,
        v_valor_cobranca,
        'Pagamento recebido via Gateway de Faturamento Automatizado.'
    );

    -- 4. Criar notificação
    INSERT INTO public.notificacoes (
        solicitacao_id,
        usuario_id,
        tipo,
        titulo,
        descricao
    ) VALUES (
        p_solicitacao_id,
        v_solicitante_id,
        'pagamento',
        'Pagamento Confirmado',
        'Seu pagamento de R$ ' || v_valor_cobranca || ' foi confirmado automaticamente.'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
