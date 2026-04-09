-- Fix: hydration_logs e billing_audit bloqueavam exclusão de usuário no admin
-- delete_action estava como NO ACTION nas duas tabelas

-- Fix hydration_logs
ALTER TABLE public.hydration_logs
  DROP CONSTRAINT IF EXISTS hydration_logs_user_id_fkey;
ALTER TABLE public.hydration_logs
  ADD CONSTRAINT hydration_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Fix billing_audit (SET NULL para preservar histórico de faturamento)
ALTER TABLE public.billing_audit
  DROP CONSTRAINT IF EXISTS billing_audit_user_id_fkey;
ALTER TABLE public.billing_audit
  ADD CONSTRAINT billing_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
