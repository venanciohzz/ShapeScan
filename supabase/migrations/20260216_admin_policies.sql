-- Admin Policies for contatobielaz@gmail.com

-- Helper function to check if the current user is the admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return (auth.jwt() ->> 'email') = 'contatobielaz@gmail.com';
end;
$$ language plpgsql security definer;

-- 1. Profiles: Admin can view and update all profiles
create policy "Admin can view all profiles"
  on public.profiles
  for select
  using ( is_admin() );

create policy "Admin can update all profiles"
  on public.profiles
  for update
  using ( is_admin() );

-- 2. Payments: Admin can view all payments
create policy "Admin can view all payments"
  on public.payments
  for select
  using ( is_admin() );

-- 3. User Plans: Admin can view and update all plans
create policy "Admin can view all user_plans"
  on public.user_plans
  for select
  using ( is_admin() );

create policy "Admin can update all user_plans"
  on public.user_plans
  for update
  using ( is_admin() );

create policy "Admin can insert user_plans"
  on public.user_plans
  for insert
  with check ( is_admin() );

-- 4. User Usage: Admin can probably view usage
create policy "Admin can view all usage"
  on public.user_usage
  for select
  using ( is_admin() );
