-- Fix: adicionar ON DELETE CASCADE na FK user_id da tabela daily_usage
-- Sem isso, deletar um usuário pelo painel admin falha com "Database error deleting user"

ALTER TABLE public.daily_usage
  DROP CONSTRAINT IF EXISTS daily_usage_user_id_fkey;

ALTER TABLE public.daily_usage
  ADD CONSTRAINT daily_usage_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
