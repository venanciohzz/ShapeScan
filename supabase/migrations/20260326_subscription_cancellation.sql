-- ================================================================
-- MIGRAÇÃO: Campos de cancelamento de assinatura em user_plans
-- Data: 2026-03-26
-- ================================================================

-- Adicionar campos de ciclo e cancelamento ao user_plans
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS current_period_end BIGINT;

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS subscription_start BIGINT;

COMMENT ON COLUMN public.user_plans.cancel_at_period_end IS 'Se true, a assinatura será cancelada ao fim do período atual (Stripe cancel_at_period_end)';
COMMENT ON COLUMN public.user_plans.current_period_end IS 'Unix timestamp do fim do período atual da assinatura (Stripe)';
COMMENT ON COLUMN public.user_plans.subscription_start IS 'Unix timestamp do início da assinatura no Stripe';
