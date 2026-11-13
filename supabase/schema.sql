-- Daymark initial schema. Apply with the Supabase SQL editor or Supabase CLI.
create extension if not exists pgcrypto;

create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('todo', 'in_progress', 'done', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  category text,
  tags text[] not null default '{}',
  due_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  recurrence_rule text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_due_idx on public.tasks(user_id, due_at);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_user_priority_idx on public.tasks(user_id, priority);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

create policy "Users can read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage own tasks" on public.tasks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
