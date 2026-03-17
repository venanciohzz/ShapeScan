-- ================================================================
-- MIGRAÇÃO: Correções do sistema de pagamentos Cakto
-- Data: 2026-03-17
-- ================================================================

-- 1. Limpar duplicatas em user_plans (manter 1 por usuário - prioridade: pago ativo > free)
DELETE FROM public.user_plans
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.user_plans
    ORDER BY
        user_id,
        (CASE WHEN active = true THEN 0 ELSE 1 END),
        (CASE WHEN plan_id != 'free' THEN 0 ELSE 1 END),
        created_at DESC
);

-- 2. Adicionar UNIQUE CONSTRAINT em user_plans.user_id
ALTER TABLE public.user_plans
ADD CONSTRAINT user_plans_user_id_unique UNIQUE (user_id);

-- 3. Garantir RLS em email_recovery_queue
ALTER TABLE public.email_recovery_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on email_recovery_queue" ON public.email_recovery_queue;
DROP POLICY IF EXISTS "service_role_full_access" ON public.email_recovery_queue;

CREATE POLICY "service_role_full_access" ON public.email_recovery_queue
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Corrigir search_path em handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, name, username, phone, age, height, weight,
    gender, goal, "activityLevel", "dailyCalorieGoal", "dailyWaterGoal",
    "dailyProtein", "dailyCarbs", "dailyFat", "freeScansUsed", photo
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Atleta'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'age')::integer,
    (NEW.raw_user_meta_data->>'height')::double precision,
    (NEW.raw_user_meta_data->>'weight')::double precision,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'goal',
    NEW.raw_user_meta_data->>'activityLevel',
    COALESCE((NEW.raw_user_meta_data->>'dailyCalorieGoal')::integer, 2000),
    (NEW.raw_user_meta_data->>'dailyWaterGoal')::integer,
    (NEW.raw_user_meta_data->>'dailyProtein')::integer,
    (NEW.raw_user_meta_data->>'dailyCarbs')::integer,
    (NEW.raw_user_meta_data->>'dailyFat')::integer,
    COALESCE((NEW.raw_user_meta_data->>'freeScansUsed')::integer, 0),
    NEW.raw_user_meta_data->>'photo'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_plans (user_id, plan_id, active)
  VALUES (NEW.id, 'free', true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. Corrigir search_path em sync_email_confirmation
CREATE OR REPLACE FUNCTION public.sync_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET email_confirmed = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
