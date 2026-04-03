-- ================================================================
-- MIGRAÇÃO: Notas internas admin + RLS pagamentos por usuário
-- Data: 2026-04-03
-- ================================================================

-- 1. Adicionar coluna de nota interna do admin em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_note text;

-- 2. Garantir que admin pode ler pagamentos com filtro por user_id
-- (a policy "Admin can view all payments" já existe, mas garantimos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Admin can view all payments'
  ) THEN
    CREATE POLICY "Admin can view all payments"
      ON public.payments FOR SELECT
      USING (is_admin());
  END IF;
END $$;
