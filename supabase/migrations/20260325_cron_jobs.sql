-- ================================================================
-- Cron Jobs: stripe-reconcile e abandoned-quiz-recovery
-- Requer: pg_cron + pg_net (ambos habilitados)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Reconciliação Stripe: todo dia às 3h Brasília (06:00 UTC)
SELECT cron.schedule(
  'stripe-reconcile-daily',
  '0 6 * * *',
  $$
    SELECT extensions.http(
      ('POST',
       'https://eqhedmkgwyczxmmztpkj.supabase.co/functions/v1/stripe-reconcile',
       ARRAY[extensions.http_header('Content-Type','application/json')],
       'application/json',
       '{}')::extensions.http_request
    )
  $$
);

-- Recovery de quiz abandonado: todo dia às 10h Brasília (13:00 UTC)
SELECT cron.schedule(
  'abandoned-quiz-recovery-daily',
  '0 13 * * *',
  $$
    SELECT extensions.http(
      ('POST',
       'https://eqhedmkgwyczxmmztpkj.supabase.co/functions/v1/abandoned-quiz-recovery',
       ARRAY[extensions.http_header('Content-Type','application/json')],
       'application/json',
       '{}')::extensions.http_request
    )
  $$
);

SELECT jobname, schedule, active FROM cron.job;
