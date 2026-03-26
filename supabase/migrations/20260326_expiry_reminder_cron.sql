-- ================================================================
-- MIGRAÇÃO: Cron job para email de aviso 3 dias antes do cancelamento
-- Data: 2026-03-26
-- ================================================================

-- Aviso de expiração: todo dia às 9h Brasília (12:00 UTC)
SELECT cron.schedule(
  'subscription-expiry-reminder',
  '0 12 * * *',
  $$
    SELECT extensions.http(
      ('POST',
       'https://eqhedmkgwyczxmmztpkj.supabase.co/functions/v1/stripe-expiry-reminder',
       ARRAY[extensions.http_header('Content-Type','application/json')],
       'application/json',
       '{}')::extensions.http_request
    )
  $$
);
