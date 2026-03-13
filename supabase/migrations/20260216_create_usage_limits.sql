-- Create daily_usage table for Rate Limiting
create table if not exists public.daily_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  date date not null default current_date,
  type text not null check (type in ('food', 'shape', 'chat')),
  count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date, type)
);

-- RLS Policies
alter table public.daily_usage enable row level security;

create policy "Users can view their own usage" 
  on public.daily_usage for select 
  using (auth.uid() = user_id);

-- Only Service Role (Edge Functions) can update usage
create policy "Service interaction only" 
  on public.daily_usage for all 
  using (auth.role() = 'service_role');
