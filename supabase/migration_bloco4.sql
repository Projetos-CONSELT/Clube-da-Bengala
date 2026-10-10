-- ====================================================================================
-- MIGRATION BLOCO 4 - Formulário de Solicitação, Configurações e Como Conheceu
-- Execute este script no SQL Editor do seu painel do Supabase
-- ====================================================================================

-- 1. Tabela configuracoes_sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL DEFAULT '{}'::jsonb,
    descricao TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE
);

-- RLS configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica de configuracoes" ON public.configuracoes_sistema FOR SELECT USING (true);
CREATE POLICY "Backoffice gerencia configuracoes" ON public.configuracoes_sistema FOR ALL USING (public.is_backoffice());

-- Inserir configuração padrão de termos legais e tempo de empréstimo (Global, sem nucleo_id)
INSERT INTO public.configuracoes_sistema (chave, valor, descricao) 
VALUES (
    'geral', 
    '{
        "opcoes_tempo_emprestimo": [30, 60, 90, 180],
        "links_termos": {
            "termo_voluntariado_url": "",
            "termo_emprestimo_url": ""
        }
    }'::jsonb, 
    'Configurações gerais do sistema: opções de tempo previsto de empréstimo e links de termos legais.'
) ON CONFLICT (chave) DO NOTHING;

-- 2. Tabela solicitacoes: Adicionar como_conheceu TEXT
ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS como_conheceu TEXT;
