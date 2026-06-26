-- ====================================================================================
-- SCRIPT DE ATUALIZAÇÃO - ADICIONAR CAMPOS E TABELAS DO FLUXO DE RETIRADA/DEVOLUÇÃO
-- Execute este script no SQL Editor do seu painel do Supabase
-- ====================================================================================

-- 1. Adicionar novas colunas à tabela solicitacoes
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS prazo_retirada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_retirada_realizada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS link_boleto_ressarcimento TEXT,
ADD COLUMN IF NOT EXISTS valor_boleto_ressarcimento DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS prazo_vencimento_boleto TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS texto_notificacao_boleto TEXT,
ADD COLUMN IF NOT EXISTS pagamento_ressarcimento_realizado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_pagamento_ressarcimento TIMESTAMP WITH TIME ZONE;

-- 2. Criar a tabela recibos_pagamento
CREATE TABLE IF NOT EXISTS public.recibos_pagamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    solicitante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    descricao_equipamento TEXT NOT NULL,
    valor_pago DECIMAL(10,2) NOT NULL,
    texto_customizado TEXT,
    data_emissao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar a tabela imagens_retirada
CREATE TABLE IF NOT EXISTS public.imagens_retirada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    url_imagem TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar a tabela imagens_devolucao
CREATE TABLE IF NOT EXISTS public.imagens_devolucao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    url_imagem TEXT NOT NULL,
    descricao TEXT,
    estado_conservacao VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar a tabela notificacoes
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('boleto', 'pagamento', 'inadimplencia', 'retirada', 'devolucao')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    lido BOOLEAN DEFAULT false,
    link_acao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.imagens_retirada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_devolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS para imagens_retirada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'imagens_retirada' AND policyname = 'Solicitante vê imagens de suas solicitações'
    ) THEN
        CREATE POLICY "Solicitante vê imagens de suas solicitações" ON public.imagens_retirada 
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'imagens_retirada' AND policyname = 'Back-office gerencia imagens de retirada'
    ) THEN
        CREATE POLICY "Back-office gerencia imagens de retirada" ON public.imagens_retirada 
            FOR ALL USING (public.is_backoffice());
    END IF;
END
$$;

-- 8. Criar políticas RLS para imagens_devolucao
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'imagens_devolucao' AND policyname = 'Solicitante vê imagens de devoluções'
    ) THEN
        CREATE POLICY "Solicitante vê imagens de devoluções" ON public.imagens_devolucao 
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'imagens_devolucao' AND policyname = 'Back-office gerencia imagens de devolução'
    ) THEN
        CREATE POLICY "Back-office gerencia imagens de devolução" ON public.imagens_devolucao 
            FOR ALL USING (public.is_backoffice());
    END IF;
END
$$;

-- 9. Criar políticas RLS para recibos_pagamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recibos_pagamento' AND policyname = 'Solicitante vê seus recibos'
    ) THEN
        CREATE POLICY "Solicitante vê seus recibos" ON public.recibos_pagamento 
            FOR SELECT USING (solicitante_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recibos_pagamento' AND policyname = 'Back-office gerencia recibos'
    ) THEN
        CREATE POLICY "Back-office gerencia recibos" ON public.recibos_pagamento 
            FOR ALL USING (public.is_backoffice());
    END IF;
END
$$;

-- 10. Criar políticas RLS para notificacoes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuário vê suas notificações'
    ) THEN
        CREATE POLICY "Usuário vê suas notificações" ON public.notificacoes 
            FOR SELECT USING (usuario_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Back-office pode criar notificações'
    ) THEN
        CREATE POLICY "Back-office pode criar notificações" ON public.notificacoes 
            FOR INSERT WITH CHECK (public.is_backoffice());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuário pode atualizar suas notificações'
    ) THEN
        CREATE POLICY "Usuário pode atualizar suas notificações" ON public.notificacoes 
            FOR UPDATE USING (usuario_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuário pode deletar suas notificações'
    ) THEN
        CREATE POLICY "Usuário pode deletar suas notificações" ON public.notificacoes 
            FOR DELETE USING (usuario_id = auth.uid());
    END IF;
END
$$;

-- ====================================================================================
-- 11. CRIAR BUCKETS DE STORAGE E CONFIGURAR POLÍTICAS
-- ====================================================================================

-- Criar buckets se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES ('imagens-devolucao', 'imagens-devolucao', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('imagens-retirada', 'imagens-retirada', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para os buckets
DO $$
BEGIN
    -- Leitura pública devolução
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Leitura pública de imagens de devolução'
    ) THEN
        CREATE POLICY "Leitura pública de imagens de devolução" ON storage.objects 
            FOR SELECT USING (bucket_id = 'imagens-devolucao');
    END IF;

    -- Leitura pública retirada
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Leitura pública de imagens de retirada'
    ) THEN
        CREATE POLICY "Leitura pública de imagens de retirada" ON storage.objects 
            FOR SELECT USING (bucket_id = 'imagens-retirada');
    END IF;

    -- Upload devolução
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Usuários autenticados podem fazer upload de imagens de devolução'
    ) THEN
        CREATE POLICY "Usuários autenticados podem fazer upload de imagens de devolução" ON storage.objects 
            FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imagens-devolucao');
    END IF;

    -- Upload retirada
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Usuários autenticados podem fazer upload de imagens de retirada'
    ) THEN
        CREATE POLICY "Usuários autenticados podem fazer upload de imagens de retirada" ON storage.objects 
            FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imagens-retirada');
    END IF;

    -- Delete devolução
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Back-office pode deletar imagens de devolução'
    ) THEN
        CREATE POLICY "Back-office pode deletar imagens de devolução" ON storage.objects 
            FOR DELETE TO authenticated USING (bucket_id = 'imagens-devolucao');
    END IF;

    -- Delete retirada
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Back-office pode deletar imagens de retirada'
    ) THEN
        CREATE POLICY "Back-office pode deletar imagens de retirada" ON storage.objects 
            FOR DELETE TO authenticated USING (bucket_id = 'imagens-retirada');
    END IF;
END
$$;

-- ====================================================================================
-- 12. RESTRIÇÃO HIERÁRQUICA DE CARGOS (TRIGGER DE VALIDAÇÃO DE ATUALIZAÇÃO)
-- ====================================================================================

-- Função para validar alterações de cargos seguindo regras de hierarquia
CREATE OR REPLACE FUNCTION public.valida_alteracao_papel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role;
BEGIN
  -- Se o papel (role) não está sendo alterado, permite a atualização
  IF OLD.papel = NEW.papel THEN
    RETURN NEW;
  END IF;

  -- Busca o papel de quem está realizando a alteração
  SELECT papel INTO v_actor_role FROM public.usuarios WHERE id = auth.uid();

  -- Se não encontrar o ator da alteração, bloqueia
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: ator da alteração não encontrado no sistema.';
  END IF;

  -- 1. Atendente não pode alterar papel de ninguém
  IF v_actor_role = 'atendente'::public.user_role THEN
    RAISE EXCEPTION 'Não autorizado: Atendentes não possuem permissão para alterar cargos.';
  END IF;

  -- 2. Coordenador só pode gerenciar alterações entre 'solicitante' e 'atendente'
  IF v_actor_role = 'coordenador'::public.user_role THEN
    -- Não pode alterar quem já é coordenador ou gerente
    IF OLD.papel IN ('gerente'::public.user_role, 'coordenador'::public.user_role) THEN
      RAISE EXCEPTION 'Não autorizado: Coordenadores não podem alterar cargos de gerentes ou outros coordenadores.';
    END IF;
    -- Não pode promover ninguém a coordenador ou gerente
    IF NEW.papel IN ('gerente'::public.user_role, 'coordenador'::public.user_role) THEN
      RAISE EXCEPTION 'Não autorizado: Coordenadores não podem atribuir cargos de gerente ou coordenador.';
    END IF;
  END IF;

  -- 3. Gerente tem permissão total
  RETURN NEW;
END;
$$;

-- Criar o trigger de validação antes do update
DROP TRIGGER IF EXISTS on_usuario_papel_update ON public.usuarios;

CREATE TRIGGER on_usuario_papel_update
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.valida_alteracao_papel();

