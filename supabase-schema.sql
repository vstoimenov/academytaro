create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'pending', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null default '',
  description text not null default '',
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
alter table public.lessons enable row level security;

create or replace function public.is_taroacademy_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'viktor.stoimenov12@gmail.com';
$$;

create or replace function public.check_client_access(lookup_email text)
returns table (
  has_access boolean,
  client_id uuid,
  client_name text
)
language sql
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.clients
      where lower(email) = lower(trim(lookup_email))
        and status = 'active'
    ) as has_access,
    c.id as client_id,
    c.name as client_name
  from public.clients c
  where lower(c.email) = lower(trim(lookup_email))
    and c.status = 'active'
  limit 1;
$$;

grant execute on function public.check_client_access(text) to anon, authenticated;

drop policy if exists "Admin can read clients" on public.clients;
drop policy if exists "Admin can insert clients" on public.clients;
drop policy if exists "Admin can update clients" on public.clients;
drop policy if exists "Admin can delete clients" on public.clients;
drop policy if exists "Anyone can read lessons" on public.lessons;
drop policy if exists "Admin can insert lessons" on public.lessons;
drop policy if exists "Admin can update lessons" on public.lessons;
drop policy if exists "Admin can delete lessons" on public.lessons;

create policy "Admin can read clients"
on public.clients
for select
to authenticated
using (public.is_taroacademy_admin());

create policy "Admin can insert clients"
on public.clients
for insert
to authenticated
with check (public.is_taroacademy_admin());

create policy "Admin can update clients"
on public.clients
for update
to authenticated
using (public.is_taroacademy_admin())
with check (public.is_taroacademy_admin());

create policy "Admin can delete clients"
on public.clients
for delete
to authenticated
using (public.is_taroacademy_admin());

create policy "Anyone can read lessons"
on public.lessons
for select
to anon, authenticated
using (true);

create policy "Admin can insert lessons"
on public.lessons
for insert
to authenticated
with check (public.is_taroacademy_admin());

create policy "Admin can update lessons"
on public.lessons
for update
to authenticated
using (public.is_taroacademy_admin())
with check (public.is_taroacademy_admin());

create policy "Admin can delete lessons"
on public.lessons
for delete
to authenticated
using (public.is_taroacademy_admin());

insert into public.clients (name, email, status)
values ('Демо клиент', 'demo@taroacademy.online', 'active')
on conflict (email) do nothing;

insert into public.lessons (title, url, description, sort_order)
values
  ('Добре дошла в TaroAcademy', '', 'Тук ще стои първото Vimeo видео. Добави линк от CRM екрана.', 1),
  ('Как да подготвиш първото си четене', '', 'Кратък стартов урок за първите практически стъпки.', 2)
on conflict do nothing;
