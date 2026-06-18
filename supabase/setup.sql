-- Adiciona a coluna de solicitação de papel na tabela de usuários
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS solicitacao_papel text;

-- Garante que apenas papéis válidos (exceto gerente) possam ser solicitados via RLS ou restrição (opcional)
-- ALTER TABLE public.usuarios ADD CONSTRAINT chk_solicitacao_papel CHECK (solicitacao_papel IN ('coordenador', 'atendente', 'solicitante'));
