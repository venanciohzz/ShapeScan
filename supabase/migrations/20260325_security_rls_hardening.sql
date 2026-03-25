-- ================================================================
-- Segurança: Habilitar RLS nas tabelas sensíveis expostas
-- ================================================================

-- billing_audit estava sem RLS — qualquer usuário logado podia ler dados de cobrança de todos
ALTER TABLE public.billing_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ler tudo" ON public.billing_audit;
CREATE POLICY "Admins podem ler tudo" ON public.billing_audit
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt()->>'email')
  );

-- admin_users estava sem RLS — lista de admins ficava exposta
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
CREATE POLICY "Admins can view admin list" ON public.admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt()->>'email')
  );

-- Verificação
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('billing_audit', 'admin_users');
