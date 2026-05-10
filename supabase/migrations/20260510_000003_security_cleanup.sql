create or replace function public.generate_order_number()
returns text
language sql
stable
set search_path = public
as $$
  select
    'ORD-'
    || to_char(timezone('Asia/Manila', now()), 'YYYYMMDD-HH24MISS')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.current_app_role_impl()
returns public.app_role
language sql
stable
security definer
set search_path = public, private
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.current_app_role_impl();
$$;

create or replace function private.is_manager_or_admin_impl()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.current_app_role_impl() in ('admin', 'manager'), false);
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.is_manager_or_admin_impl();
$$;

create or replace function private.is_admin_impl()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.current_app_role_impl() = 'admin', false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.is_admin_impl();
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  seeded_role private.seed_account_roles%rowtype;
begin
  select *
  into seeded_role
  from private.seed_account_roles
  where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    lower(new.email),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      seeded_role.full_name,
      initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    ),
    coalesce(seeded_role.role, 'cashier'),
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

drop function if exists public.handle_new_user();
drop function if exists public.create_order(text, text, text, jsonb);

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_manager_or_admin() from public;

grant execute on function private.current_app_role_impl() to authenticated;
grant execute on function private.is_admin_impl() to authenticated;
grant execute on function private.is_manager_or_admin_impl() to authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager_or_admin() to authenticated;
