create table if not exists public.bonus_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  url text not null default '',
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.bonus_resources enable row level security;

drop function if exists public.admin_list_bonuses(text, text);
create function public.admin_list_bonuses(admin_email text, admin_password text)
returns table (
  id uuid,
  title text,
  description text,
  url text,
  sort_order integer,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_ok(admin_email, admin_password) then
    raise exception 'not allowed';
  end if;

  return query
  select b.id, b.title, b.description, b.url, b.sort_order, b.is_active, b.created_at
  from public.bonus_resources b
  order by b.sort_order asc, b.created_at asc;
end;
$$;

drop function if exists public.admin_insert_bonus(text, text, text, text, text, integer, boolean);
create function public.admin_insert_bonus(
  admin_email text,
  admin_password text,
  bonus_title text,
  bonus_description text,
  bonus_url text,
  bonus_sort_order integer,
  bonus_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_ok(admin_email, admin_password) then
    raise exception 'not allowed';
  end if;

  insert into public.bonus_resources (title, description, url, sort_order, is_active)
  values (bonus_title, coalesce(bonus_description, ''), coalesce(bonus_url, ''), coalesce(bonus_sort_order, 1), coalesce(bonus_is_active, true));
end;
$$;

drop function if exists public.admin_update_bonus(text, text, uuid, text, text, text, integer, boolean);
create function public.admin_update_bonus(
  admin_email text,
  admin_password text,
  bonus_id uuid,
  bonus_title text,
  bonus_description text,
  bonus_url text,
  bonus_sort_order integer,
  bonus_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_ok(admin_email, admin_password) then
    raise exception 'not allowed';
  end if;

  update public.bonus_resources
  set title = bonus_title,
      description = coalesce(bonus_description, ''),
      url = coalesce(bonus_url, ''),
      sort_order = coalesce(bonus_sort_order, 1),
      is_active = coalesce(bonus_is_active, true)
  where id = bonus_id;
end;
$$;

drop function if exists public.admin_delete_bonus(text, text, uuid);
create function public.admin_delete_bonus(
  admin_email text,
  admin_password text,
  bonus_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_ok(admin_email, admin_password) then
    raise exception 'not allowed';
  end if;

  delete from public.bonus_resources where id = bonus_id;
end;
$$;

drop function if exists public.get_bonus_resources(text);
create function public.get_bonus_resources(lookup_email text)
returns table (
  id uuid,
  title text,
  description text,
  url text,
  sort_order integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.clients
    where lower(email) = lower(trim(lookup_email))
      and status = 'active'
  ) then
    return;
  end if;

  return query
  select b.id, b.title, b.description, b.url, b.sort_order
  from public.bonus_resources b
  where b.is_active = true
  order by b.sort_order asc, b.created_at asc;
end;
$$;

grant execute on function public.admin_list_bonuses(text, text) to anon, authenticated;
grant execute on function public.admin_insert_bonus(text, text, text, text, text, integer, boolean) to anon, authenticated;
grant execute on function public.admin_update_bonus(text, text, uuid, text, text, text, integer, boolean) to anon, authenticated;
grant execute on function public.admin_delete_bonus(text, text, uuid) to anon, authenticated;
grant execute on function public.get_bonus_resources(text) to anon, authenticated;
