-- ================================================================
-- MIGRAÇÃO: Segurança Extrema e Observabilidade (Parte 3)
-- Data: 2026-03-22
-- ================================================================

-- 1. Tornar plan_origin IMUTÁVEL
CREATE OR REPLACE FUNCTION public.prevent_plan_origin_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.plan_origin <> OLD.plan_origin THEN
    RAISE EXCEPTION 'plan_origin cannot be updated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_plan_origin_update ON public.user_plans;

CREATE TRIGGER trg_prevent_plan_origin_update
BEFORE UPDATE ON public.user_plans
FOR EACH ROW
EXECUTE FUNCTION public.prevent_plan_origin_update();

-- 2. Consistência Lógica Absoluta (plan_id x active)
-- Primeiro, normalizar base existente
UPDATE public.user_plans
SET active = false
WHERE plan_id = 'free' AND active = true;

-- Adicionar constraint
ALTER TABLE public.user_plans
DROP CONSTRAINT IF EXISTS check_plan_active_consistency;

ALTER TABLE public.user_plans
ADD CONSTRAINT check_plan_active_consistency
CHECK (
  (plan_id = 'free' AND active = false)
  OR
  (plan_id <> 'free' AND active = true)
);

-- 3. Atualizar a Trigger handle_new_user para obedecer a constraint ('free' = active false)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_is_admin BOOLEAN;
  v_active BOOLEAN;
BEGIN
  v_is_admin := EXISTS (SELECT 1 FROM public.admin_users WHERE email = NEW.email);
  
  IF v_is_admin THEN
    v_plan := 'lifetime';
    v_active := true;
  ELSE
    v_plan := 'free';
    v_active := false;
  END IF;

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
  VALUES (NEW.id, v_plan, v_active, CASE WHEN v_is_admin THEN 'lifetime' ELSE 'stripe' END)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
