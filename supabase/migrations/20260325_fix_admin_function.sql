-- ================================================================
-- SEGURANÇA: Remover hardcode de email admin da função is_admin()
-- Data: 2026-03-25
--
-- A função original usava email hardcoded. Agora consulta a tabela
-- admin_users, que é a fonte de verdade para permissões de admin.
-- ================================================================

-- Atualizar função is_admin() para usar tabela admin_users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE email = auth.jwt() ->> 'email'
    );
$$;

-- Garantir que a função só seja executada internamente (não via RPC pública)
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Verificação de sanidade
COMMENT ON FUNCTION public.is_admin() IS 'Verifica se o usuário autenticado é admin via tabela admin_users. Não usa email hardcoded.';
