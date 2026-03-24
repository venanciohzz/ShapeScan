-- ================================================================
-- MIGRAÇÃO: Billing Ultra-Robusto (Sincronização e Identificação)
-- Data: 2026-03-24
-- ================================================================

-- 1. Adicionar colunas na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Criar índice para busca rápida por customer_id (usado no fallback do webhook)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles (stripe_customer_id);

-- 2. Função para sincronizar user_plans -> profiles
CREATE OR REPLACE FUNCTION public.sync_user_plan_to_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        plan = NEW.plan_id,
        subscription_status = CASE 
            WHEN NEW.active = true THEN 'active'
            ELSE 'inactive'
        END
    WHERE id = NEW.user_id;

    -- Se o plano é free e inativo, garantimos status inativo independentemente
    IF NEW.plan_id = 'free' AND NEW.active = false THEN
        UPDATE public.profiles SET subscription_status = 'inactive' WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Trigger para manter a sincronização automática
DROP TRIGGER IF EXISTS on_user_plan_change ON public.user_plans;
CREATE TRIGGER on_user_plan_change
AFTER INSERT OR UPDATE ON public.user_plans
FOR EACH ROW EXECUTE FUNCTION public.sync_user_plan_to_profiles();

-- 4. Backfill: Sincronizar dados existentes
UPDATE public.profiles p
SET 
    plan = up.plan_id,
    subscription_status = CASE WHEN up.active = true THEN 'active' ELSE 'inactive' END
FROM public.user_plans up
WHERE p.id = up.user_id;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'ID do cliente no Stripe para vinculação robusta em webhooks';
COMMENT ON COLUMN public.profiles.plan IS 'Plano atual do usuário (sincronizado de user_plans)';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Status da assinatura (active/inactive)';
