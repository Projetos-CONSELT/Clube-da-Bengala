-- Bloco 6 e 7 Migrations

-- Tabela Colaboradores
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS motivo_desativacao TEXT;

-- Tabela Nucleos (Bloco 7)
ALTER TABLE nucleos ADD COLUMN IF NOT EXISTS is_ativo BOOLEAN DEFAULT true;

-- Criar Bucket Storage "termos-legais" (Bloco 7)
INSERT INTO storage.buckets (id, name, public)
VALUES ('termos-legais', 'termos-legais', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for termos-legais
CREATE POLICY "Termos Legais Público" ON storage.objects
  FOR SELECT USING (bucket_id = 'termos-legais');

CREATE POLICY "Gerentes inserem termos legais" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'termos-legais' AND
    auth.uid() IN (
      SELECT id FROM usuarios WHERE role IN ('gerente', 'ceo')
    )
  );

CREATE POLICY "Gerentes atualizam termos legais" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'termos-legais' AND
    auth.uid() IN (
      SELECT id FROM usuarios WHERE role IN ('gerente', 'ceo')
    )
  );

CREATE POLICY "Gerentes deletam termos legais" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'termos-legais' AND
    auth.uid() IN (
      SELECT id FROM usuarios WHERE role IN ('gerente', 'ceo')
    )
  );
