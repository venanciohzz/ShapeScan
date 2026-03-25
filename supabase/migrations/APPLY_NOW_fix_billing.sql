-- ================================================================
-- CORREÇÃO CRÍTICA: Colunas faltando que causam falha silenciosa
-- no webhook de pagamento. Todas as operações são seguras (IF NOT EXISTS).
-- ================================================================

-- ── 1. user_plans: colunas que o webhook tenta inserir mas não existem
-- Sem estas colunas o upsert falha com erro 42703 e o plano nunca é ativado
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS subscription_id      TEXT,
  ADD COLUMN IF NOT EXISTS last_stripe_event_ts BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_origin          TEXT   DEFAULT 'stripe';

-- ── 2. billing_audit: colunas que faltam no INSERT do webhook
ALTER TABLE public.billing_audit
  ADD COLUMN IF NOT EXISTS plan_id  TEXT,
  ADD COLUMN IF NOT EXISTS amount   FLOAT;

-- ── 3. profiles: coluna para subscription_id sincronizado
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- ── 4. admin_users: tabela necessária para o handle_new_user futuro
CREATE TABLE IF NOT EXISTS public.admin_users (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.admin_users (email)
VALUES ('contatobielaz@gmail.com')
ON CONFLICT DO NOTHING;

-- ── 5. Atualizar a função de sync para incluir stripe_subscription_id
-- (a função handle_user_plan_change já existe e é chamada pelo trigger)
CREATE OR REPLACE FUNCTION public.handle_user_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    plan                  = NEW.plan_id,
    subscription_status   = CASE WHEN NEW.active THEN 'active' ELSE 'inactive' END,
    stripe_subscription_id = CASE WHEN NEW.active THEN NEW.subscription_id ELSE NULL END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- ── 6. Índices de performance
CREATE INDEX IF NOT EXISTS idx_user_plans_event_ts          ON public.user_plans (last_stripe_event_ts);
CREATE INDEX IF NOT EXISTS idx_billing_audit_payment_intent ON public.billing_audit (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_user_event     ON public.billing_audit (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id  ON public.profiles (stripe_customer_id);

-- ── 7. Verificação: mostra colunas adicionadas (deve listar todas abaixo)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'user_plans'    AND column_name IN ('subscription_id', 'last_stripe_event_ts', 'plan_origin'))
    OR
    (table_name = 'billing_audit' AND column_name IN ('plan_id', 'amount'))
    OR
    (table_name = 'profiles'      AND column_name = 'stripe_subscription_id')
  )
ORDER BY table_name, column_name;
