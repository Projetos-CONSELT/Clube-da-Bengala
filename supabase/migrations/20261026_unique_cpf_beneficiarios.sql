-- Migration: Garante UNIQUE constraint no CPF dos beneficiários
-- Bloco 4 da Auditoria SDET: Proteção física no PostgreSQL / Supabase para erro 23505

DO $$
BEGIN
  -- Cria constraint UNIQUE se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beneficiarios_cpf_key' OR conname = 'beneficiarios_cpf_unique'
  ) THEN
    -- Remove possíveis registros duplicados legados se houver (mantendo o mais recente por id)
    DELETE FROM public.beneficiarios a USING public.beneficiarios b
    WHERE a.id < b.id 
      AND a.cpf = b.cpf 
      AND a.cpf IS NOT NULL;

    ALTER TABLE public.beneficiarios ADD CONSTRAINT beneficiarios_cpf_unique UNIQUE (cpf);
  END IF;
END $$;
