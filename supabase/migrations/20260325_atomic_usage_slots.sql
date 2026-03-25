-- ================================================================
-- SEGURANÇA CRÍTICA: Incremento Atômico de Uso (Anti-Race-Condition)
-- Data: 2026-03-25
--
-- Substitui o padrão "ler → checar → escrever" por operações atômicas
-- que eliminam race conditions onde dois requests simultâneos burlariam
-- o limite de uso.
-- ================================================================

-- ── FUNÇÃO 1: Reserva de slot diário para usuários pagos ──────────
-- Usa INSERT ... ON CONFLICT DO UPDATE ... WHERE para garantir atomicidade.
-- O PostgreSQL garante que a verificação e o incremento ocorram sob lock
-- de linha, impedindo que dois requests simultâneos ultrapassem o limite.
--
-- Retorna TRUE se o slot foi reservado com sucesso.
-- Retorna FALSE se o limite já foi atingido.
CREATE OR REPLACE FUNCTION public.claim_daily_slot(
    p_user_id UUID,
    p_type    TEXT,
    p_date    DATE,
    p_limit   INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows INT;
BEGIN
    INSERT INTO public.daily_usage (user_id, date, type, count)
    VALUES (p_user_id, p_date, p_type, 1)
    ON CONFLICT (user_id, date, type) DO UPDATE
        SET count      = public.daily_usage.count + 1,
            updated_at = NOW()
        WHERE public.daily_usage.count < p_limit;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END;
$$;

-- ── FUNÇÃO 2: Reserva do scan gratuito vitalício para usuários free ─
-- Usa UPDATE ... WHERE free_scans_used < 1 para garantir atomicidade.
-- Apenas 1 scan por conta, para sempre.
-- Também insere em daily_usage para rastreamento.
--
-- Retorna TRUE se o scan gratuito foi reservado.
-- Retorna FALSE se o usuário já usou seu scan gratuito.
CREATE OR REPLACE FUNCTION public.claim_free_slot(
    p_user_id UUID,
    p_type    TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows  INT;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Incrementa free_scans_used atomicamente, somente se < 1
    UPDATE public.profiles
    SET free_scans_used = COALESCE(free_scans_used, 0) + 1
    WHERE id = p_user_id
      AND COALESCE(free_scans_used, 0) < 1;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    -- Se a reserva foi bem-sucedida, registra em daily_usage para rastreamento
    IF v_rows > 0 THEN
        INSERT INTO public.daily_usage (user_id, date, type, count)
        VALUES (p_user_id, v_today, p_type, 1)
        ON CONFLICT (user_id, date, type) DO UPDATE
            SET count      = public.daily_usage.count + 1,
                updated_at = NOW();
    END IF;

    RETURN v_rows > 0;
END;
$$;

-- Garantir que apenas a service_role possa chamar essas funções via RPC direto
-- (a Edge Function usa service_role key, então isso é correto)
REVOKE ALL ON FUNCTION public.claim_daily_slot FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_free_slot  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_slot TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_free_slot  TO service_role;
