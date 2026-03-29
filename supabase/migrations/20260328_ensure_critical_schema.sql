-- ================================================================
-- MIGRAÇÃO: Garantir colunas críticas do sistema de pagamentos
-- Data: 2026-03-28
-- Todas as operações usam IF NOT EXISTS — seguro reaplicar.
-- Esta migração consolida o conteúdo de APPLY_NOW_fix_billing.sql
-- e garante aplicação na ordem correta das migrations.
-- ================================================================

-- ── 1. user_plans: colunas necessárias pelo webhook ────────────────
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS subscription_id      TEXT,
  ADD COLUMN IF NOT EXISTS last_stripe_event_ts BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_origin          TEXT   DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_period_end   BIGINT,
  ADD COLUMN IF NOT EXISTS subscription_start   BIGINT;

-- ── 2. billing_audit: colunas necessárias pelo webhook ────────────
ALTER TABLE public.billing_audit
  ADD COLUMN IF NOT EXISTS plan_id  TEXT,
  ADD COLUMN IF NOT EXISTS amount   FLOAT;

-- ── 3. profiles: colunas de vínculo Stripe ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS plan                    TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT DEFAULT 'inactive';

-- ── 4. admin_users: garantir tabela existe ────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Índices de performance ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_plans_event_ts          ON public.user_plans (last_stripe_event_ts);
CREATE INDEX IF NOT EXISTS idx_billing_audit_payment_intent ON public.billing_audit (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_user_event     ON public.billing_audit (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id  ON public.profiles (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_sub_id       ON public.profiles (stripe_subscription_id);
