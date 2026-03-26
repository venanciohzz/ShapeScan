-- ================================================================
-- MIGRAÇÃO: Campos de motivo de cancelamento em user_plans
-- Data: 2026-03-26
-- ================================================================

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS cancellation_feedback TEXT;

ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;

COMMENT ON COLUMN public.user_plans.cancellation_reason IS 'Motivo selecionado no exit survey (expensive, low_usage, alternative, technical, other)';
COMMENT ON COLUMN public.user_plans.cancellation_feedback IS 'Texto livre opcional deixado pelo usuário ao cancelar';
COMMENT ON COLUMN public.user_plans.cancelled_at IS 'Unix timestamp de quando o usuário solicitou o cancelamento';
