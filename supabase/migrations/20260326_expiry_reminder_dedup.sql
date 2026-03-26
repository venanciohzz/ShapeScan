-- ================================================================
-- MIGRAÇÃO: Dedup de email de expiração + token de reativação 1-clique
-- Data: 2026-03-26
-- ================================================================

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at BIGINT;

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS reactivation_token UUID;

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS reactivation_token_expires_at BIGINT;

-- Índice único para lookup rápido do token
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_reactivation_token
  ON public.user_plans(reactivation_token)
  WHERE reactivation_token IS NOT NULL;

COMMENT ON COLUMN public.user_plans.expiry_reminder_sent_at IS 'Unix timestamp do envio do email de aviso de expiração (dedup)';
COMMENT ON COLUMN public.user_plans.reactivation_token IS 'Token UUID para reativação com 1 clique via email';
COMMENT ON COLUMN public.user_plans.reactivation_token_expires_at IS 'Unix timestamp de expiração do token de reativação (7 dias)';
