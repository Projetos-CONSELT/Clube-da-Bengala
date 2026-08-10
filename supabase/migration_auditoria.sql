-- ====================================================================================
-- MIGRAÇÃO DE AUDITORIA E HISTÓRICO
-- Cria a tabela audit_logs, índices e políticas RLS para leitura e inserção segura.
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (
        action_type IN (
            'CREATED',
            'STATUS_CHANGED',
            'MESSAGE_SENT',
            'FILE_UPLOADED',
            'FILE_REMOVED',
            'PAYMENT_APPROVED',
            'UPDATED',
            'DELETED'
        )
    ),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.registrar_auditoria(
    p_request_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log public.audit_logs;
    v_request_owner UUID;
BEGIN
    IF p_request_id IS NULL OR p_user_id IS NULL OR p_action_type IS NULL THEN
        RAISE EXCEPTION 'Parâmetros obrigatórios ausentes para registrar auditoria.';
    END IF;

    SELECT solicitante_id
      INTO v_request_owner
      FROM public.solicitacoes
     WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação não encontrada para auditoria.';
    END IF;

    IF auth.uid() IS NULL THEN
        IF p_action_type <> 'PAYMENT_APPROVED' OR v_request_owner <> p_user_id THEN
            RAISE EXCEPTION 'Auditoria pública permitida apenas para confirmação de pagamento.';
        END IF;
    ELSIF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Usuário autenticado não confere com o autor do log.';
    ELSIF NOT (public.is_backoffice() OR v_request_owner = auth.uid()) THEN
        RAISE EXCEPTION 'Usuário sem permissão para registrar auditoria nesta solicitação.';
    END IF;

    INSERT INTO public.audit_logs (
        request_id,
        user_id,
        action_type,
        details
    )
    VALUES (
        p_request_id,
        p_user_id,
        p_action_type,
        COALESCE(p_details, '{}'::jsonb)
    )
    RETURNING * INTO v_log;

    RETURN v_log;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_auditoria(UUID, UUID, TEXT, JSONB) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id_created_at
    ON public.audit_logs (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON public.audit_logs (user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solicitante vê logs da própria solicitação" ON public.audit_logs;
CREATE POLICY "Solicitante vê logs da própria solicitação" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.solicitacoes s
            WHERE s.id = request_id
              AND s.solicitante_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Back-office vê logs de todas as solicitações" ON public.audit_logs;
CREATE POLICY "Back-office vê logs de todas as solicitações" ON public.audit_logs
    FOR SELECT USING (public.is_backoffice());

DROP POLICY IF EXISTS "Back-office registra auditoria" ON public.audit_logs;
CREATE POLICY "Back-office registra auditoria" ON public.audit_logs
    FOR INSERT WITH CHECK (
        public.is_backoffice()
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Solicitante registra auditoria própria" ON public.audit_logs;
CREATE POLICY "Solicitante registra auditoria própria" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.solicitacoes s
            WHERE s.id = request_id
              AND s.solicitante_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Confirmação pública de pagamento registra auditoria" ON public.audit_logs;
CREATE POLICY "Confirmação pública de pagamento registra auditoria" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NULL
        AND action_type = 'PAYMENT_APPROVED'
        AND EXISTS (
            SELECT 1
            FROM public.solicitacoes s
            WHERE s.id = request_id
              AND s.solicitante_id = user_id
        )
    );

COMMENT ON TABLE public.audit_logs IS 'Registra o histórico de ações relevantes executadas em cada solicitação.';
COMMENT ON COLUMN public.audit_logs.details IS 'Metadata adicional em JSONB para descrever contexto, antes/depois e anexos.';