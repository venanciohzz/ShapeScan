-- ================================================================
-- MIGRAÇÃO: Metadados Transacionais (Fechamento de Ouro)
-- Data: 2026-03-24
-- ================================================================

-- 1. Expandir billing_audit para suportar vínculo forte com Stripe
ALTER TABLE public.billing_audit 
ADD COLUMN IF NOT EXISTS stripe_event_id TEXT,
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- 2. Criar índices para consultas rápidas de segurança (usados no canUpgradeUser)
CREATE INDEX IF NOT EXISTS idx_billing_audit_payment_intent ON public.billing_audit (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_user_event ON public.billing_audit (user_id, event_type);

COMMENT ON COLUMN public.billing_audit.stripe_event_id IS 'ID do evento Stripe original';
COMMENT ON COLUMN public.billing_audit.payment_intent_id IS 'ID da transação (Payment Intent)';
COMMENT ON COLUMN public.billing_audit.invoice_id IS 'ID da fatura associada';
COMMENT ON COLUMN public.billing_audit.subscription_id IS 'ID da assinatura associada';
