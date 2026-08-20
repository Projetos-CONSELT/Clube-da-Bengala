-- ====================================================================================
-- CLUBE DA BENGALA - SCRIPT DE ATUALIZAÇÃO (FATURAMENTO & CONTROLE RLS)
-- Desenvolvido por: CONSELT (https://github.com/Projetos-CONSELT)
-- Licença: Licença Proprietária CONSELT. Todos os direitos reservados.
-- ====================================================================================

-- 0. Remove versões anteriores das funções para evitar erro 42P13 (cannot change return type)
DROP TRIGGER IF EXISTS trg_validar_permissao_faturamento ON public.solicitacoes;
DROP FUNCTION IF EXISTS public.validar_permissao_faturamento_update() CASCADE;
DROP FUNCTION IF EXISTS public.obter_detalhes_cobranca(UUID, TEXT);
DROP FUNCTION IF EXISTS public.confirmar_pagamento_fatura(UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_manager();

-- 1. Função auxiliar para verificar se o usuário atual é Gestor (Gerente ou CEO)
CREATE OR REPLACE FUNCTION public.is_manager() 
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- 1. Verifica papel/role presente no JWT
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('gerente', 'ceo'),
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('gerente', 'ceo'),
      (auth.jwt() -> 'user_metadata' ->> 'papel') IN ('gerente', 'ceo'),
      (auth.jwt() ->> 'role') IN ('gerente', 'ceo'),
      FALSE
    )
    OR
    -- 2. Verifica papel registrado na tabela usuarios
    public.get_user_role() IN ('gerente'::public.user_role, 'ceo'::public.user_role)
  );
$$;

-- 2. Trigger de proteção no nível de banco de dados para impedir UPDATE em colunas de faturamento por não-gestores
CREATE OR REPLACE FUNCTION public.validar_permissao_faturamento_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se alguma coluna financeira / de boleto foi alterada
    IF (
        NEW.valor_boleto_ressarcimento IS DISTINCT FROM OLD.valor_boleto_ressarcimento OR
        NEW.prazo_vencimento_boleto IS DISTINCT FROM OLD.prazo_vencimento_boleto OR
        NEW.link_boleto_ressarcimento IS DISTINCT FROM OLD.link_boleto_ressarcimento OR
        NEW.texto_notificacao_boleto IS DISTINCT FROM OLD.texto_notificacao_boleto OR
        NEW.pagamento_ressarcimento_realizado IS DISTINCT FROM OLD.pagamento_ressarcimento_realizado OR
        NEW.data_pagamento_ressarcimento IS DISTINCT FROM OLD.data_pagamento_ressarcimento
    ) THEN
        -- Se a requisição partiu de um usuário autenticado (JWT presente)
        -- e esse usuário NÃO for Gestor (Gerente ou CEO), rejeitar a operação.
        IF auth.uid() IS NOT NULL AND NOT public.is_manager() THEN
            RAISE EXCEPTION 'Acesso negado: Apenas usuários com nível de acesso GERENTE ou CEO possuem permissão para alterar ou registrar dados de faturamento e boletos.'
            USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_permissao_faturamento
    BEFORE UPDATE ON public.solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_permissao_faturamento_update();

-- 3. Função para obter detalhes da cobrança de forma segura
CREATE OR REPLACE FUNCTION public.obter_detalhes_cobranca(
    p_solicitacao_id UUID,
    p_cpf TEXT
)
RETURNS TABLE (
    id UUID,
    protocolo VARCHAR(20),
    status VARCHAR(50),
    solicitante_id UUID,
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
        s.solicitante_id,
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

-- 4. Função para simular/confirmar pagamento da cobrança de forma segura
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
      AND (
          p_cpf IS NULL 
          OR p_cpf = ''
          OR REPLACE(REPLACE(REPLACE(u.cpf, '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(p_cpf, '.', ''), '-', ''), ' ', '')
      );

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
