-- Fix: Adicionar política RLS admin para daily_usage que estava ausente no banco
-- A migration 20260216_admin_policies.sql definia esta policy, mas ela nunca
-- foi aplicada corretamente, fazendo o admin ver apenas seus próprios scans.

DROP POLICY IF EXISTS "Admin can view all daily_usage" ON public.daily_usage;

CREATE POLICY "Admin can view all daily_usage"
  ON public.daily_usage
  FOR SELECT
  USING ( public.is_admin() );
