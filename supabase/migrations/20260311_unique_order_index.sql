-- Migração refinada para garantir idempotência absoluta
-- O índice único agora garante que order_id não seja nulo e seja único

DROP INDEX IF EXISTS idx_payments_order_id;

CREATE UNIQUE INDEX idx_payments_order_id 
ON public.payments ((metadata->>'order_id')) 
WHERE (metadata->>'order_id') IS NOT NULL;
