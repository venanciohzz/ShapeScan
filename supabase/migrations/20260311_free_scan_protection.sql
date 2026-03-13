-- Tabela para rastrear uso de análises gratuitas por IP
create table if not exists public.free_scan_usage (
  id uuid default gen_random_uuid() primary key,
  ip_address text not null,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table public.free_scan_usage enable row level security;

-- Apenas a service_role pode inserir e ler (Edge Functions)
create policy "Service role only access"
  on public.free_scan_usage
  for all
  using (auth.role() = 'service_role');

-- Índice para busca rápida por IP
create index if not exists idx_free_scan_usage_ip on public.free_scan_usage(ip_address);
