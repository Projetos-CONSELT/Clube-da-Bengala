-- ====================================================================================
-- MIGRATION BLOCO 3 - Catálogo, Características Dinâmicas, Valor Nominal e Estoque
-- Execute este script no SQL Editor do seu painel do Supabase
-- ====================================================================================

-- 1. Tabela Equipamentos: Adicionar coluna valor_nominal DECIMAL(10,2)
ALTER TABLE public.equipamentos
ADD COLUMN IF NOT EXISTS valor_nominal DECIMAL(10,2);

-- 2. Tabela Tipos Equipamento: Adicionar coluna imagem_ilustrativa_url (garantia caso falte)
ALTER TABLE public.tipos_equipamento
ADD COLUMN IF NOT EXISTS imagem_ilustrativa_url TEXT;

-- 3. Criar Bucket para Imagens dos Tipos de Equipamento
INSERT INTO storage.buckets (id, name, public)
VALUES ('imagens-tipos-equipamento', 'imagens-tipos-equipamento', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas do Bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Leitura publica de imagens de tipos'
    ) THEN
        CREATE POLICY "Leitura publica de imagens de tipos" 
            ON storage.objects FOR SELECT 
            USING (bucket_id = 'imagens-tipos-equipamento');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Backoffice insere imagens de tipos'
    ) THEN
        CREATE POLICY "Backoffice insere imagens de tipos" 
            ON storage.objects FOR INSERT TO authenticated 
            WITH CHECK (bucket_id = 'imagens-tipos-equipamento' AND public.is_backoffice());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Backoffice deleta imagens de tipos'
    ) THEN
        CREATE POLICY "Backoffice deleta imagens de tipos" 
            ON storage.objects FOR DELETE TO authenticated 
            USING (bucket_id = 'imagens-tipos-equipamento' AND public.is_backoffice());
    END IF;
END $$;
