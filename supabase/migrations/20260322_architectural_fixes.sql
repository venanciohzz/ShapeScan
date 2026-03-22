-- ================================================================
-- MIGRAÇÃO: Correções Arquiteturais e Segurança (ShapeScan)
-- Data: 2026-03-22
-- ================================================================

-- 1. Origem do Plano (plan_origin) para proteger contas manuais/lifetime
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS plan_origin text DEFAULT 'stripe';

-- 2. Remoção do estado intermediário (pending_payment)
ALTER TABLE public.user_plans
DROP COLUMN IF EXISTS pending_payment;

-- 3. Correção de segurança no Trigger handle_new_user
-- Garantir que a injeção via raw_user_meta_data não passe isPremium/isAdmin soltos.
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

  INSERT INTO public.user_plans (user_id, plan_id, active, plan_origin)
  VALUES (NEW.id, 'free', true, 'manual')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
