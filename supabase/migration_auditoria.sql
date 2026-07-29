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