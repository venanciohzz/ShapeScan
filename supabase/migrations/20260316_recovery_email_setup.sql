-- Migração para configurar a recuperação de quiz abandonado via email

-- 1. Ativar extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Criar a tabela de fila de recuperação
create table if not exists public.email_recovery_queue (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    email text not null,
    status text not null default 'pending', -- pending, sent, cancelled, failed
    scheduled_at timestamptz not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    retry_count int default 0,
    error_message text
);

-- Habilitar RLS (apenas admins ou service_role podem acessar)
alter table public.email_recovery_queue enable row level security;

create policy "Admins can do everything on email_recovery_queue"
on public.email_recovery_queue
to service_role
using (true)
with check (true);

-- 3. Função para disparar na confirmação de email
create or replace function public.handle_user_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Só agenda se o email foi confirmado AGORA (ou se foi confirmado e não tem registro na fila)
    if (NEW.email_confirmed_at is not null and (OLD.email_confirmed_at is null or OLD.email_confirmed_at <> NEW.email_confirmed_at)) then
        -- Insere na fila para processamento em 10 minutos
        insert into public.email_recovery_queue (user_id, email, scheduled_at)
        values (NEW.id, NEW.email, now() + interval '10 minutes')
        on conflict do nothing;
    end if;
    return NEW;
end;
$$;

-- 4. Trigger no esquema auth (precisa ser superuser ou via migração Supabase)
-- Nota: Em ambientes locais/CLI, triggers em auth.users funcionam bem via migrações
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update of email_confirmed_at on auth.users
for each row
execute function public.handle_user_email_confirmation();

-- 5. Função para processar a fila (Será chamada pelo pg_cron)
-- Esta função chama a Edge Function
create or replace function public.process_email_recovery_queue()
returns void
language plpgsql
security definer
as $$
declare
    r record;
    edge_url text;
    service_key text;
begin
    -- Buscar a URL e Chave das variáveis de ambiente (ou hardcoded se necessário, mas env é melhor)
    -- Em Supabase, podemos usar vault ou apenas configurar na Edge Function
    edge_url := 'https://eqhedmkgwyczxmmztpkj.supabase.co/functions/v1/abandoned-quiz-recovery';
    service_key := 'SERVICE_ROLE_KEY'; -- Idealmente via vault ou wrapper seguro

    for r in 
        select * from public.email_recovery_queue 
        where status = 'pending' 
        and scheduled_at <= now() 
        limit 10 -- Processa de 10 em 10 para não sobrecarregar
    loop
        -- Chamada assíncrona para a Edge Function usando pg_net
        perform net.http_post(
            url := edge_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_key
            ),
            body := jsonb_build_object(
                'user_id', r.user_id,
                'email', r.email,
                'queue_id', r.id
            ),
            timeout_milliseconds := 5000
        );

        -- Marcamos como processando (a Edge Function vai marcar como 'sent' ou 'cancelled' ao validar)
        update public.email_recovery_queue 
        set status = 'processing', updated_at = now()
        where id = r.id;
    end loop;
end;
$$;

-- 6. Agendar o Job no pg_cron (Roda a cada minuto)
select cron.schedule(
    'process-recovery-emails',
    '* * * * *', -- Cada minuto
    'select public.process_email_recovery_queue();'
);
