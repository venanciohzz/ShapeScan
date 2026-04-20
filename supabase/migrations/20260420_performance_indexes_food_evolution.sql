-- ================================================================
-- PERFORMANCE: Índices em food_logs e evolution_records
-- Data: 2026-04-20
--
-- food_logs e evolution_records são consultados frequentemente por
-- user_id + ordem por data. Sem índice, o Supabase faz full table
-- scan em cada carregamento de histórico — lento em escala.
-- ================================================================

-- Índice composto para food_logs: user_id + created_at DESC
-- Cobre queries: .eq('user_id', x).order('created_at', { ascending: false }).limit(500)
CREATE INDEX IF NOT EXISTS idx_food_logs_user_created
  ON public.food_logs(user_id, created_at DESC);

-- Índice composto para evolution_records: user_id + record_date DESC
-- Cobre queries: .eq('user_id', x).order('record_date', { ascending: false }).limit(200)
CREATE INDEX IF NOT EXISTS idx_evolution_records_user_date
  ON public.evolution_records(user_id, record_date DESC);

-- Índice em free_scan_usage.created_at para o disjuntor global (200 scans/dia)
-- Cobre: .gte('created_at', today) — COUNT sem índice faz seq scan em alta escala
CREATE INDEX IF NOT EXISTS idx_free_scan_usage_created
  ON public.free_scan_usage(created_at DESC);

-- Índice composto em free_scan_usage para o rate limit por IP
-- Cobre: .eq('ip_address', ip).gte('created_at', today)
CREATE INDEX IF NOT EXISTS idx_free_scan_usage_ip_created
  ON public.free_scan_usage(ip_address, created_at DESC);
