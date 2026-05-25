alter table public.lessons
  add column if not exists module_title text not null default 'Модул 1',
  add column if not exists module_order integer not null default 1,
  add column if not exists resource_title text not null default '',
  add column if not exists resource_url text not null default '';

create table if not exists public.lesson_progress (
  client_id uuid not null references public.clients(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (client_id, lesson_id)
);

alter table public.lesson_progress enable row level security;
