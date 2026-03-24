-- ================================================================
-- MIGRAÇÃO: Controle de Ordem e Contexto Real (Blindagem Final)
-- Data: 2026-03-24
-- ================================================================

-- 1. Adicionar timestamp original do Stripe para controle de ordering
ALTER TABLE public.billing_audit 
ADD COLUMN IF NOT EXISTS event_created BIGINT;

-- 2. Garantir que a tabela user_plans também tenha o controle de timestamp (já existe, mas reforçando índice)
CREATE INDEX IF NOT EXISTS idx_user_plans_event_ts ON public.user_plans (last_stripe_event_ts);

COMMENT ON COLUMN public.billing_audit.event_created IS 'Timestamp original de criação do evento no Stripe (event.created)';
