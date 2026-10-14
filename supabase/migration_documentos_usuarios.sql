-- ====================================================================================
-- MIGRATION: Upload e Salvamento de Documentos de Usuários (Cadastro Público e Anônimo)
-- Execute este script no SQL Editor do Supabase (Painel Web -> SQL Editor)
-- ====================================================================================

-- 1. Garantir que o bucket 'documentos-usuarios' existe e possui acesso público configurado
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-usuarios', 'documentos-usuarios', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Adicionar as colunas na tabela public.usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS url_documento_foto TEXT,
ADD COLUMN IF NOT EXISTS url_comprovante_residencia TEXT,
ADD COLUMN IF NOT EXISTS documento_identidade_url TEXT,
ADD COLUMN IF NOT EXISTS comprovante_residencia_url TEXT;

-- 3. Políticas de RLS na tabela storage.objects para o bucket 'documentos-usuarios'
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "Permitir upload publico em documentos-usuarios" ON storage.objects;
DROP POLICY IF EXISTS "Usuário pode fazer upload do próprio documento" ON storage.objects;
DROP POLICY IF EXISTS "Upload público de documentos de usuários" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload anonimo em documentos-usuarios" ON storage.objects;

-- Política de INSERT permitindo uploads públicos (anônimos e autenticados)
CREATE POLICY "Upload público de documentos de usuários" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'documentos-usuarios');

-- Política de SELECT para permitir a visualização e download dos documentos
DROP POLICY IF EXISTS "Permitir leitura de documentos-usuarios" ON storage.objects;
DROP POLICY IF EXISTS "Usuário pode ver o próprio documento" ON storage.objects;
DROP POLICY IF EXISTS "Back-office pode ver documentos dos usuários" ON storage.objects;
DROP POLICY IF EXISTS "Visualização pública de documentos de usuários" ON storage.objects;

CREATE POLICY "Visualização pública de documentos de usuários" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'documentos-usuarios');

-- Política de UPDATE para upsert de documentos
DROP POLICY IF EXISTS "Update público de documentos de usuários" ON storage.objects;

CREATE POLICY "Update público de documentos de usuários" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (bucket_id = 'documentos-usuarios');

-- 4. Atualizar a função disparada ao cadastrar usuário via Supabase Auth
-- Isso garante que as URLs passadas no data do signUp sejam gravadas automaticamente na tabela usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_foto TEXT;
  v_comp_res TEXT;
BEGIN
  v_doc_foto := COALESCE(
    NULLIF(new.raw_user_meta_data->>'url_documento_foto', ''),
    NULLIF(new.raw_user_meta_data->>'documento_identidade_url', '')
  );
  v_comp_res := COALESCE(
    NULLIF(new.raw_user_meta_data->>'url_comprovante_residencia', ''),
    NULLIF(new.raw_user_meta_data->>'comprovante_residencia_url', '')
  );

  INSERT INTO public.usuarios (
    id,
    papel,
    nome_completo,
    cpf,
    whatsapp,
    email,
    data_nascimento,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    is_inadimplente,
    url_documento_foto,
    url_comprovante_residencia,
    documento_identidade_url,
    comprovante_residencia_url
  )
  VALUES (
    new.id,
    COALESCE(NULLIF(new.raw_user_meta_data->>'papel', '')::public.user_role, 'solicitante'::public.user_role),
    NULLIF(new.raw_user_meta_data->>'nome_completo', ''),
    NULLIF(new.raw_user_meta_data->>'cpf', ''),
    NULLIF(new.raw_user_meta_data->>'whatsapp', ''),
    new.email,
    NULLIF(new.raw_user_meta_data->>'data_nascimento', '')::DATE,
    NULLIF(new.raw_user_meta_data->>'cep', ''),
    NULLIF(new.raw_user_meta_data->>'rua', ''),
    NULLIF(new.raw_user_meta_data->>'numero', ''),
    NULLIF(new.raw_user_meta_data->>'complemento', ''),
    NULLIF(new.raw_user_meta_data->>'bairro', ''),
    NULLIF(new.raw_user_meta_data->>'cidade', ''),
    NULLIF(new.raw_user_meta_data->>'estado', ''),
    false,
    v_doc_foto,
    v_comp_res,
    v_doc_foto,
    v_comp_res
  );
  RETURN new;
END;
$$;
