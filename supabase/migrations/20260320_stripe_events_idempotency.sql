-- Migration: Idempotência do Stripe Webhook
-- Tabela para registrar eventos Stripe já processados, prevenindo
-- duplicação causada por retries automáticos ou entregas múltiplas.
--
-- Estratégia: inserir o event.id ANTES de processar o evento.
-- Se a inserção falhar com unique_violation (23505), o evento
-- já está sendo processado por outra instância → idempotente.

CREATE TABLE IF NOT EXISTS stripe_events (
  id            TEXT        PRIMARY KEY,  -- event.id do Stripe (ex: evt_1TCCjDB2Kj43d7TH...)
  type          TEXT        NOT NULL,     -- event.type do Stripe (ex: invoice.payment_succeeded)
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para queries de limpeza periódica (remover eventos antigos > 90 dias)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events (processed_at);

-- RLS: apenas service_role pode acessar (webhook usa SUPABASE_SERVICE_ROLE_KEY)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Nenhuma política de acesso para anon/authenticated — apenas service_role bypassa RLS
-- Isso garante que o frontend nunca consiga ler ou escrever eventos do Stripe

COMMENT ON TABLE stripe_events IS 
  'Registro de eventos Stripe processados. Usado para garantir idempotência no webhook. '
  'Eventos duplicados (retries do Stripe) são detectados aqui e ignorados.';
