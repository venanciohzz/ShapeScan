-- ================================================================
-- MIGRAÇÃO: Enriquecimento da Tabela Profiles e User Plans (Stripe Sub ID)
-- Data: 2026-03-24
-- ================================================================

-- 1. Adicionar coluna subscription_id na tabela user_plans (Fonte da Verdade)
ALTER TABLE public.user_plans 
ADD COLUMN IF NOT EXISTS subscription_id TEXT;

COMMENT ON COLUMN public.user_plans.subscription_id IS 'ID da assinatura no Stripe';

-- 2. Adicionar coluna stripe_subscription_id na tabela profiles (Sincronização para Frontend)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'ID da assinatura ativa no Stripe (sincronizado)';

-- 3. Atualizar a função de sincronização para incluir o subscription_id
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
        stripe_subscription_id = NEW.subscription_id, -- Novo campo sincronizado
        subscription_status = CASE 
            WHEN NEW.active = true THEN 'active'
            ELSE 'inactive'
        END
    WHERE id = NEW.user_id;

    -- Se o plano é free e inativo, garantimos status inativo e limpamos o sub_id
    IF NEW.plan_id = 'free' AND NEW.active = false THEN
        UPDATE public.profiles 
        SET 
            subscription_status = 'inactive',
            stripe_subscription_id = NULL
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Sincronizar dados existentes
UPDATE public.profiles p
SET 
    stripe_subscription_id = up.subscription_id
FROM public.user_plans up
WHERE p.id = up.user_id;
