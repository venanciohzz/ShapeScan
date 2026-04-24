-- Retorna email dos usuários auth que têm plano pago mas não têm perfil (orphans)
-- Só pode ser chamado por admins (verificação via is_admin na tabela profiles)
CREATE OR REPLACE FUNCTION get_auth_emails_for_ids(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;
