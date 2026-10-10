-- ====================================================================================
-- MIGRATION BLOCO 1 - Autenticação, Acessos Públicos e Cadastro do Solicitante
-- Execute este script no SQL Editor do seu painel do Supabase
-- ====================================================================================

-- 1. Atualizar a tabela de Usuários com colunas de documentos e dados faltantes
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS documento_identidade_url TEXT,
ADD COLUMN IF NOT EXISTS comprovante_residencia_url TEXT,
ADD COLUMN IF NOT EXISTS documentos_aprovados BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_rejeicao_documentos TEXT,
ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- 2. Criar a tabela de Doações Pendentes (Página Pública)
CREATE TABLE IF NOT EXISTS public.doacoes_pendentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_doador VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    data_nascimento DATE NOT NULL,
    item_doado TEXT NOT NULL,
    imagem_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS na tabela doacoes_pendentes
ALTER TABLE public.doacoes_pendentes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para doacoes_pendentes
DO $$
BEGIN
    -- Permitir inserção pública (para a página /quero-doar)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doacoes_pendentes' AND policyname = 'Inserção pública em doacoes_pendentes') THEN
        CREATE POLICY "Inserção pública em doacoes_pendentes" ON public.doacoes_pendentes 
            FOR INSERT WITH CHECK (true);
    END IF;

    -- Backoffice pode gerenciar (ler, atualizar) todas as doações pendentes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doacoes_pendentes' AND policyname = 'Back-office gerencia doacoes_pendentes') THEN
        CREATE POLICY "Back-office gerencia doacoes_pendentes" ON public.doacoes_pendentes 
            FOR ALL USING (public.is_backoffice());
    END IF;
END
$$;

-- 5. Criar Buckets de Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-usuarios', 'documentos-usuarios', false) -- Privado, contem dados sensíveis (RG/Comprovante)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('imagens-doacoes-pendentes', 'imagens-doacoes-pendentes', true) -- Público, para exibir no backoffice e na interface
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de Acesso para os Buckets de Storage
DO $$
BEGIN
    -- =====================================================
    -- Bucket: documentos-usuarios (PRIVADO)
    -- =====================================================
    
    -- Usuário pode fazer upload dos próprios documentos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Usuário pode fazer upload do próprio documento') THEN
        CREATE POLICY "Usuário pode fazer upload do próprio documento" ON storage.objects 
            FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos-usuarios' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Usuário pode ver/baixar seus próprios documentos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Usuário pode ver o próprio documento') THEN
        CREATE POLICY "Usuário pode ver o próprio documento" ON storage.objects 
            FOR SELECT TO authenticated USING (bucket_id = 'documentos-usuarios' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Backoffice pode ver os documentos de qualquer usuário
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Back-office pode ver documentos dos usuários') THEN
        CREATE POLICY "Back-office pode ver documentos dos usuários" ON storage.objects 
            FOR SELECT TO authenticated USING (bucket_id = 'documentos-usuarios' AND public.is_backoffice());
    END IF;

    -- =====================================================
    -- Bucket: imagens-doacoes-pendentes (PÚBLICO)
    -- =====================================================

    -- Leitura pública das imagens de doação
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Leitura pública de imagens-doacoes-pendentes') THEN
        CREATE POLICY "Leitura pública de imagens-doacoes-pendentes" ON storage.objects 
            FOR SELECT USING (bucket_id = 'imagens-doacoes-pendentes');
    END IF;

    -- Upload público das imagens de doação (pela página aberta)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Upload público de imagens-doacoes-pendentes') THEN
        CREATE POLICY "Upload público de imagens-doacoes-pendentes" ON storage.objects 
            FOR INSERT WITH CHECK (bucket_id = 'imagens-doacoes-pendentes');
    END IF;

    -- Backoffice pode deletar imagens (ao recusar doação, etc)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Back-office pode deletar imagens-doacoes-pendentes') THEN
        CREATE POLICY "Back-office pode deletar imagens-doacoes-pendentes" ON storage.objects 
            FOR DELETE TO authenticated USING (bucket_id = 'imagens-doacoes-pendentes' AND public.is_backoffice());
    END IF;
END
$$;
