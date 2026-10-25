-- Migration: Add motivo_recusa column to public.solicitacoes
-- Bloco 2, Item 3: Suporte ao motivo de recusa de solicitações

ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;

COMMENT ON COLUMN public.solicitacoes.motivo_recusa IS 'Motivo informado pelo atendente ao recusar/rejeitar a solicitação na triagem.';
