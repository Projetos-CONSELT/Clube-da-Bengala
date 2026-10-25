-- Migration: Padronização e Validação de CPF Único em public.beneficiarios
-- Bloco 4: Padronização de CPF para formato 000.000.000-00 e bloqueio de duplicados

-- 1. Função auxiliar para formatar CPF para 000.000.000-00
CREATE OR REPLACE FUNCTION public.format_cpf(raw_cpf text)
RETURNS text AS $$
DECLARE
  digits text;
BEGIN
  IF raw_cpf IS NULL THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(raw_cpf, '\D', '', 'g');
  IF length(digits) <> 11 THEN
    RETURN raw_cpf;
  END IF;
  RETURN substr(digits, 1, 3) || '.' ||
         substr(digits, 4, 3) || '.' ||
         substr(digits, 7, 3) || '-' ||
         substr(digits, 10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Atualizar todos os CPFs existentes na tabela beneficiarios para o formato padronizado
UPDATE public.beneficiarios
SET cpf = public.format_cpf(cpf)
WHERE cpf IS NOT NULL AND length(regexp_replace(cpf, '\D', '', 'g')) = 11;

-- 3. Trigger BEFORE INSERT OR UPDATE para garantir padrão 000.000.000-00 e bloquear duplicados
CREATE OR REPLACE FUNCTION public.trg_padronizar_cpf_beneficiarios()
RETURNS TRIGGER AS $$
DECLARE
  digits text;
  formatted text;
  existing_count int;
BEGIN
  IF NEW.cpf IS NOT NULL AND trim(NEW.cpf) <> '' THEN
    digits := regexp_replace(NEW.cpf, '\D', '', 'g');
    IF length(digits) <> 11 THEN
      RAISE EXCEPTION 'CPF deve conter exatamente 11 dígitos numéricos.';
    END IF;
    
    formatted := substr(digits, 1, 3) || '.' ||
                 substr(digits, 4, 3) || '.' ||
                 substr(digits, 7, 3) || '-' ||
                 substr(digits, 10, 2);
    NEW.cpf := formatted;

    -- Verificar se já existe outro beneficiário com esse CPF (formatado ou apenas dígitos)
    SELECT count(*) INTO existing_count
    FROM public.beneficiarios
    WHERE (cpf = formatted OR regexp_replace(cpf, '\D', '', 'g') = digits)
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF existing_count > 0 THEN
      RAISE EXCEPTION 'Este CPF (%) já está cadastrado para outro beneficiário.', formatted;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_padronizar_cpf_beneficiarios ON public.beneficiarios;
CREATE TRIGGER trg_padronizar_cpf_beneficiarios
BEFORE INSERT OR UPDATE ON public.beneficiarios
FOR EACH ROW EXECUTE FUNCTION public.trg_padronizar_cpf_beneficiarios();
