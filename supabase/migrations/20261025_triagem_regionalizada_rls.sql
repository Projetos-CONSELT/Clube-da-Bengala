-- ====================================================================================
-- MIGRATION: Painel de Triagem Regionalizado e Políticas RLS
-- Tabelas: doacoes_pendentes e colaboradores (voluntários)
-- Execute este script no SQL Editor do painel do Supabase
-- ====================================================================================

-- 1. Tratar dados legados: atribuir registros sem núcleo ao núcleo Sede Principal ('00000000-0000-0000-0000-000000000000')
DO $$
DECLARE
    sede_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Garantir que o núcleo sede existe na tabela de nucleos
    INSERT INTO public.nucleos (id, nome, is_ativo)
    VALUES (sede_id, 'Sede Principal', true)
    ON CONFLICT (id) DO UPDATE SET is_ativo = true;

    -- Atualizar doações com nucleo_id nulo para a Sede
    UPDATE public.doacoes_pendentes
    SET nucleo_id = sede_id
    WHERE nucleo_id IS NULL;

    -- Atualizar colaboradores com nucleo_id nulo para a Sede
    UPDATE public.colaboradores
    SET nucleo_id = sede_id
    WHERE nucleo_id IS NULL;
END
$$;

-- 2. Garantir coluna motivo_desativacao em colaboradores
ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS motivo_desativacao TEXT;

-- 3. Ajustar check constraint em doacoes_pendentes.status para permitir formas feminina/masculina
ALTER TABLE public.doacoes_pendentes DROP CONSTRAINT IF EXISTS doacoes_pendentes_status_check;
ALTER TABLE public.doacoes_pendentes ADD CONSTRAINT doacoes_pendentes_status_check 
  CHECK (status IN ('pendente', 'aprovado', 'aprovada', 'rejeitado', 'rejeitada'));

-- 4. Habilitar RLS em ambas as tabelas
ALTER TABLE public.doacoes_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- 5. Limpar políticas anteriores
DROP POLICY IF EXISTS "Back-office gerencia doacoes_pendentes" ON public.doacoes_pendentes;
DROP POLICY IF EXISTS "Atendentes e gerentes visualizam doações do próprio núcleo" ON public.doacoes_pendentes;
DROP POLICY IF EXISTS "Atendentes e gerentes atualizam doações do próprio núcleo" ON public.doacoes_pendentes;
DROP POLICY IF EXISTS "Inserção pública em doacoes_pendentes" ON public.doacoes_pendentes;

DROP POLICY IF EXISTS "Atendentes e gerentes visualizam colaboradores do próprio núcleo" ON public.colaboradores;
DROP POLICY IF EXISTS "Atendentes e gerentes atualizam colaboradores do próprio núcleo" ON public.colaboradores;

-- 6. POLÍTICAS PARA doacoes_pendentes
-- 6.1 Permite inserção pública (para visitantes do formulário /quero-doar)
CREATE POLICY "Inserção pública em doacoes_pendentes" 
ON public.doacoes_pendentes 
FOR INSERT 
WITH CHECK (true);

-- 6.2 SELECT: Atendentes e gerentes veem apenas doações do seu próprio núcleo (CEO vê tudo)
CREATE POLICY "Atendentes e gerentes visualizam doações do próprio núcleo"
ON public.doacoes_pendentes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND (
              u.papel = 'ceo'
              OR (
                  u.papel IN ('gerente', 'atendente')
                  AND (
                      doacoes_pendentes.nucleo_id = u.nucleo_id
                      OR (
                          (doacoes_pendentes.nucleo_id IS NULL OR doacoes_pendentes.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                          AND (u.nucleo_id IS NULL OR u.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                      )
                  )
              )
          )
    )
);

-- 6.3 UPDATE: Atendentes e gerentes alteram apenas doações do seu próprio núcleo (CEO altera tudo)
CREATE POLICY "Atendentes e gerentes atualizam doações do próprio núcleo"
ON public.doacoes_pendentes
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND (
              u.papel = 'ceo'
              OR (
                  u.papel IN ('gerente', 'atendente')
                  AND (
                      doacoes_pendentes.nucleo_id = u.nucleo_id
                      OR (
                          (doacoes_pendentes.nucleo_id IS NULL OR doacoes_pendentes.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                          AND (u.nucleo_id IS NULL OR u.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                      )
                  )
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND (
              u.papel = 'ceo'
              OR (
                  u.papel IN ('gerente', 'atendente')
                  AND (
                      doacoes_pendentes.nucleo_id = u.nucleo_id
                      OR (
                          (doacoes_pendentes.nucleo_id IS NULL OR doacoes_pendentes.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                          AND (u.nucleo_id IS NULL OR u.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                      )
                  )
              )
          )
    )
);

-- 7. POLÍTICAS PARA colaboradores (voluntários)
-- 7.1 SELECT: Atendentes e gerentes veem apenas colaboradores do seu próprio núcleo (CEO vê tudo)
CREATE POLICY "Atendentes e gerentes visualizam colaboradores do próprio núcleo"
ON public.colaboradores
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND (
              u.papel = 'ceo'
              OR (
                  u.papel IN ('gerente', 'atendente')
                  AND (
                      colaboradores.nucleo_id = u.nucleo_id
                      OR (
                          (colaboradores.nucleo_id IS NULL OR colaboradores.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                          AND (u.nucleo_id IS NULL OR u.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                      )
                  )
              )
          )
    )
);

-- 7.2 UPDATE: Atendentes e gerentes alteram apenas colaboradores do seu próprio núcleo (CEO altera tudo)
CREATE POLICY "Atendentes e gerentes atualizam colaboradores do próprio núcleo"
ON public.colaboradores
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND (
              u.papel = 'ceo'
              OR (
                  u.papel IN ('gerente', 'atendente')
                  AND (
                      colaboradores.nucleo_id = u.nucleo_id
                      OR (
                          (colaboradores.nucleo_id IS NULL OR colaboradores.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                          AND (u.nucleo_id IS NULL OR u.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                      )
                  )
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND (
              u.papel = 'ceo'
              OR (
                  u.papel IN ('gerente', 'atendente')
                  AND (
                      colaboradores.nucleo_id = u.nucleo_id
                      OR (
                          (colaboradores.nucleo_id IS NULL OR colaboradores.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                          AND (u.nucleo_id IS NULL OR u.nucleo_id = '00000000-0000-0000-0000-000000000000'::uuid)
                      )
                  )
              )
          )
    )
);
