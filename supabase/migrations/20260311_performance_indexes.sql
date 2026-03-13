-- Migração para melhorar a performance de consultas críticas
-- Data: 2026-03-11

-- Índice para busca rápida de perfil por email (login e webhooks)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Índice para filtragem de pagamentos por status (dashboard admin)
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Índice para otimizar busca de uso diário (rate limiting)
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage(user_id, date);
