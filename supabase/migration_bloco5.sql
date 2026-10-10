-- ====================================================================================
-- MIGRATION BLOCO 5 - Fila de Solicitações e Máquina de Estados
-- Execute este script no SQL Editor do seu painel do Supabase
-- ====================================================================================

-- 1. Tabela solicitacoes: Adicionar novas colunas para controle da máquina de estados
ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT,
ADD COLUMN IF NOT EXISTS terceiro_retirada_nome VARCHAR,
ADD COLUMN IF NOT EXISTS terceiro_retirada_cpf VARCHAR;

-- 2. Tabela usuarios: Adicionar coluna de controle de inadimplência (negativado)
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS is_negativado BOOLEAN DEFAULT false;

-- Observação: is_inadimplente já existe na tabela de usuários e já cobre parte dessa lógica, 
-- mas conforme o plano de ação, o controle "is_negativado" bloqueia novas solicitações explicitamente.
