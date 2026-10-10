-- ====================================================================================
-- MIGRATION BLOCO 2 - Gestão de Beneficiários
-- Execute este script no SQL Editor do seu painel do Supabase
-- ====================================================================================

-- 1. Adicionar Data de Nascimento aos Beneficiários
ALTER TABLE public.beneficiarios
ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- Atualizar registros antigos com uma data padrão genérica para não quebrar a obrigatoriedade (opcional, caso existam registros sem data)
UPDATE public.beneficiarios SET data_nascimento = '1900-01-01' WHERE data_nascimento IS NULL;

-- Tornar a coluna NOT NULL se necessário (Opcional)
-- ALTER TABLE public.beneficiarios ALTER COLUMN data_nascimento SET NOT NULL;
