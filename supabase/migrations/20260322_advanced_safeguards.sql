-- ================================================================
-- MIGRAÇÃO: Correções Avançadas de Arquitetura e Segurança (ShapeScan)
-- Data: 2026-03-22 (Parte 2)
-- ================================================================

-- 1. Criação de tabela admin para evitar hardcode de e-mails em triggers
CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atribuir admin inicial (contatobielaz@gmail.com)
INSERT INTO public.admin_users (email)
VALUES ('contatobielaz@gmail.com')
ON CONFLICT DO NOTHING;

-- 2. Controle de concorrência e idempotência do Stripe
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS last_stripe_event_ts BIGINT DEFAULT 0;

-- 3. Backfill: Corrigir planos existentes manually assigned antes da introdução de plan_origin
UPDATE public.user_plans
SET plan_origin = 'lifetime'
WHERE plan_id = 'lifetime' AND plan_origin = 'stripe';

UPDATE public.user_plans
SET plan_origin = 'manual'
WHERE plan_id IN ('vip_manual', 'founder') AND plan_origin = 'stripe';

-- 4. Constraint para proteger integridade do 'active' x 'plan_id'
-- Bloqueia a inserção acidental de planos inexistentes devido a typos ou exploits
ALTER TABLE public.user_plans
ADD CONSTRAINT check_valid_plan_id 
CHECK (plan_id IN ('free', 'monthly', 'annual', 'lifetime', 'pro_monthly', 'pro_annual'));

-- Adicional: Garantir que active boolean exista consistentemente (já existe, mas documenta a regra lógica)
ALTER TABLE public.user_plans
ADD CONSTRAINT check_active_boolean
CHECK (active IN (true, false));

-- 5. Atualizar a Trigger handle_new_user para checar admins da nova tabela dinamicamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Definir se é admin baseado na tabela admin_users (privilege leak bloqueado)
  v_is_admin := EXISTS (SELECT 1 FROM public.admin_users WHERE email = NEW.email);
  
  IF v_is_admin THEN
    v_plan := 'lifetime';
  ELSE
    v_plan := 'free';
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
  VALUES (NEW.id, v_plan, true, CASE WHEN v_is_admin THEN 'lifetime' ELSE 'manual' END)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
