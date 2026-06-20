-- ====================================================================================
-- PROJETO CLUBE DA BENGALA - ESQUEMA DE BANCO DE DADOS SUPABASE
-- Arquitetura relacional com RLS (Row Level Security) para PostgreSQL
-- ====================================================================================

-- Habilita a extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================================
-- 1. TIPOS DE DADOS E ENUMS
-- ====================================================================================

CREATE TYPE user_role AS ENUM ('gerente', 'coordenador', 'atendente', 'solicitante');
CREATE TYPE status_equipamento AS ENUM ('disponivel', 'reservado', 'emprestado', 'vendido', 'extraviado', 'manutencao');
CREATE TYPE status_solicitacao AS ENUM ('triagem', 'aguardando_documentacao', 'aguardando_retirada', 'equipamento_emprestado', 'em_devolucao', 'inadimplente', 'em_cobranca', 'encerrada');
CREATE TYPE status_documento AS ENUM ('pendente', 'aprovado', 'reprovado');

-- ====================================================================================
-- 2. TABELAS DO SISTEMA
-- ====================================================================================

-- Tabela de Usuários (Estende auth.users do Supabase)
-- Guarda tanto a equipe do back-office quanto os solicitantes do front-office.
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    papel user_role NOT NULL DEFAULT 'solicitante',
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    data_nascimento DATE,
    -- Endereço
    cep VARCHAR(9),
    rua VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    -- Controle de Sistema
    is_inadimplente BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Beneficiários
-- Relação 1:N com usuários (solicitantes). Um CPF de beneficiário é único no sistema.
CREATE TABLE public.beneficiarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_nascimento DATE,
    altura_cm INTEGER,
    peso_kg DECIMAL(5,2),
    tamanho_calcado INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Tipos de Equipamento
-- Utiliza JSONB para definir quais campos (especificações) este tipo exige.
CREATE TABLE public.tipos_equipamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    imagem_ilustrativa_url TEXT,
    schema_especificacoes JSONB DEFAULT '{}'::jsonb, -- Ex: {"peso_suportado": ["85kg", "100kg"], "reclinavel": ["Sim", "Nao"]}
    limite_renovacoes INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Equipamentos (Estoque físico)
CREATE TABLE public.equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_patrimonio VARCHAR(50) UNIQUE NOT NULL,
    tipo_id UUID NOT NULL REFERENCES public.tipos_equipamento(id) ON DELETE RESTRICT,
    status status_equipamento DEFAULT 'disponivel',
    estado_conservacao VARCHAR(50) DEFAULT 'Bom',
    atributos_especificos JSONB DEFAULT '{}'::jsonb, -- Valores reais das especificações baseadas no schema do tipo
    doador_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Solicitações
-- Fila central de pedidos. O estado controla a etapa do fluxo.
CREATE TABLE public.solicitacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocolo VARCHAR(20) UNIQUE NOT NULL,
    solicitante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE RESTRICT,
    tipo_equipamento_id UUID NOT NULL REFERENCES public.tipos_equipamento(id) ON DELETE RESTRICT,
    equipamento_reservado_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
    status status_solicitacao DEFAULT 'triagem',
    tempo_estimado_meses INTEGER DEFAULT 1,
    motivo_solicitacao TEXT,
    observacoes_solicitante TEXT,
    observacoes_atendimento TEXT, -- Uso exclusivo do back-office
    prazo_limite_retirada TIMESTAMP WITH TIME ZONE,
    -- Controle de Retirada e Devolução
    prazo_retirada TIMESTAMP WITH TIME ZONE,
    data_retirada_realizada TIMESTAMP WITH TIME ZONE,
    -- Controle de Ressarcimento
    link_boleto_ressarcimento TEXT,
    valor_boleto_ressarcimento DECIMAL(10,2),
    prazo_vencimento_boleto TIMESTAMP WITH TIME ZONE,
    texto_notificacao_boleto TEXT,
    pagamento_ressarcimento_realizado BOOLEAN DEFAULT false,
    data_pagamento_ressarcimento TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Documentos da Solicitação
CREATE TABLE public.documentos_solicitacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL, -- 'RG_FRENTE', 'COMPROVANTE_RESIDENCIA', etc.
    url_arquivo TEXT NOT NULL,
    status status_documento DEFAULT 'pendente',
    motivo_rejeicao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Empréstimos (Recibos e Controle de Prazos)
-- Gerado no momento em que o equipamento é retirado fisicamente.
CREATE TABLE public.emprestimos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID UNIQUE NOT NULL REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
    equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE RESTRICT,
    data_retirada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_prevista_devolucao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_devolucao_realizada TIMESTAMP WITH TIME ZONE,
    renovacoes_realizadas INTEGER DEFAULT 0,
    recibo_texto_customizado TEXT,
    assinatura_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Recibos de Pagamento (Ressarcimento)
-- Emitida quando o solicitante paga o boleto de ressarcimento
CREATE TABLE public.recibos_pagamento (
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

-- Tabela de Imagens da Retirada
-- Armazena imagens do equipamento no momento da retirada, visíveis para o solicitante.
CREATE TABLE public.imagens_retirada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    url_imagem TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Imagens da Devolução
-- Armazena imagens do equipamento no momento da devolução, visíveis para o solicitante.
CREATE TABLE public.imagens_devolucao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
    url_imagem TEXT NOT NULL,
    descricao TEXT,
    estado_conservacao VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Notificações
-- Armazena notificações para solicitantes e back-office sobre eventos importantes
CREATE TABLE public.notificacoes (
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

-- ====================================================================================
-- 3. ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ====================================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_solicitacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emprestimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_retirada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_devolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_pagamento ENABLE ROW LEVEL SECURITY;

-- Funções utilitárias para RLS
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS user_role AS $$
  SELECT papel FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_backoffice() RETURNS boolean AS $$
  SELECT public.get_user_role() IN ('gerente', 'coordenador', 'atendente');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- POLÍTICAS: USUÁRIOS
-- Solicitantes veem e editam apenas o próprio perfil. Back-office vê todos.
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Back-office pode ver todos os usuários" ON public.usuarios FOR SELECT USING (public.is_backoffice());
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.usuarios FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Back-office pode atualizar usuários" ON public.usuarios FOR UPDATE USING (public.is_backoffice());

-- POLÍTICAS: BENEFICIÁRIOS
-- Solicitante vê/gerencia apenas seus próprios beneficiários[cite: 103].
CREATE POLICY "Solicitante gerencia seus beneficiários" ON public.beneficiarios 
    FOR ALL USING (solicitante_id = auth.uid());
CREATE POLICY "Back-office gerencia todos os beneficiários" ON public.beneficiarios 
    FOR ALL USING (public.is_backoffice());

-- POLÍTICAS: TIPOS DE EQUIPAMENTO E EQUIPAMENTOS
-- Catálogo é público para leitura. Apenas back-office modifica (e Gerentes deletam)[cite: 7, 154].
CREATE POLICY "Leitura pública de tipos de equipamento" ON public.tipos_equipamento FOR SELECT USING (true);
CREATE POLICY "Leitura pública de inventário" ON public.equipamentos FOR SELECT USING (true);

CREATE POLICY "Back-office gerencia tipos de equipamento" ON public.tipos_equipamento 
    FOR ALL USING (public.is_backoffice());
CREATE POLICY "Back-office gerencia equipamentos" ON public.equipamentos 
    FOR ALL USING (public.is_backoffice());

-- POLÍTICAS: SOLICITAÇÕES
-- Solicitante insere e lê as próprias. Back-office lê e atualiza todas[cite: 8, 92].
CREATE POLICY "Solicitante lê suas solicitações" ON public.solicitacoes FOR SELECT USING (solicitante_id = auth.uid());
CREATE POLICY "Solicitante insere suas solicitações" ON public.solicitacoes FOR INSERT WITH CHECK (solicitante_id = auth.uid());
CREATE POLICY "Back-office lê todas as solicitações" ON public.solicitacoes FOR SELECT USING (public.is_backoffice());
CREATE POLICY "Back-office atualiza solicitações" ON public.solicitacoes FOR UPDATE USING (public.is_backoffice());

-- POLÍTICAS: DOCUMENTOS DA SOLICITAÇÃO
CREATE POLICY "Solicitante gerencia documentos de suas solicitações" ON public.documentos_solicitacao 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid())
    );
CREATE POLICY "Back-office gerencia todos os documentos" ON public.documentos_solicitacao 
    FOR ALL USING (public.is_backoffice());

-- POLÍTICAS: EMPRÉSTIMOS
CREATE POLICY "Solicitante vê seus empréstimos" ON public.emprestimos 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid())
    );
CREATE POLICY "Back-office gerencia empréstimos" ON public.emprestimos 
    FOR ALL USING (public.is_backoffice());

-- POLÍTICAS: IMAGENS DA RETIRADA
-- Solicitante vê imagens de suas solicitações. Back-office gerencia todas as imagens.
CREATE POLICY "Solicitante vê imagens de suas solicitações" ON public.imagens_retirada 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid())
    );
CREATE POLICY "Back-office gerencia imagens de retirada" ON public.imagens_retirada 
    FOR ALL USING (public.is_backoffice());

-- POLÍTICAS: IMAGENS DA DEVOLUÇÃO
-- Solicitante vê imagens de suas devoluções. Back-office gerencia todas as imagens.
CREATE POLICY "Solicitante vê imagens de devoluções" ON public.imagens_devolucao 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.solicitacoes s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid())
    );
CREATE POLICY "Back-office gerencia imagens de devolução" ON public.imagens_devolucao 
    FOR ALL USING (public.is_backoffice());

-- POLÍTICAS: RECIBOS DE PAGAMENTO
-- Solicitante vê seus recibos. Back-office gerencia todos os recibos.
CREATE POLICY "Solicitante vê seus recibos" ON public.recibos_pagamento 
    FOR SELECT USING (solicitante_id = auth.uid());
CREATE POLICY "Back-office gerencia recibos" ON public.recibos_pagamento 
    FOR ALL USING (public.is_backoffice());

-- RLS para Notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê suas notificações" ON public.notificacoes 
    FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "Back-office pode criar notificações" ON public.notificacoes 
    FOR INSERT WITH CHECK (public.is_backoffice());
CREATE POLICY "Usuário pode atualizar suas notificações" ON public.notificacoes 
    FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY "Usuário pode deletar suas notificações" ON public.notificacoes 
    FOR DELETE USING (usuario_id = auth.uid());