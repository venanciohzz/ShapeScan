-- ================================================================
-- MIGRAÇÃO: Observabilidade de Negócios (Billing Audit)
-- Data: 2026-03-23
-- ================================================================

CREATE TABLE IF NOT EXISTS public.billing_audit (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    status text NOT NULL,
    plan_id text,
    amount float,
    created_at timestamptz DEFAULT now()
);

-- Permite apenas leitura e inserção via service_role ou anon auth (para leitura no admin futuro)
ALTER TABLE public.billing_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler tudo"
    ON public.billing_audit
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt()->>'email'));

-- Index para performance de dashboards
CREATE INDEX IF NOT EXISTS billing_audit_user_id_idx ON public.billing_audit(user_id);
CREATE INDEX IF NOT EXISTS billing_audit_created_at_idx ON public.billing_audit(created_at);
