-- Run this once in Supabase SQL Editor.
create table if not exists public.time_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  planned_time text,
  date date not null,
  done boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.time_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_time text not null,
  end_time text not null,
  category text not null check (category in ('money', 'learning', 'network', 'fun')),
  date date not null,
  updated_at timestamptz not null default now()
);

alter table public.time_tasks enable row level security;
alter table public.time_records enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'time_tasks' and policyname = 'users manage own tasks') then
    create policy "users manage own tasks" on public.time_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'time_records' and policyname = 'users manage own records') then
    create policy "users manage own records" on public.time_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Reading notes: run this expansion after the original tables above.
create table if not exists public.reading_books (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  rating smallint not null default 0 check (rating between 0 and 5),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_notes (
  id text primary key,
  book_id text not null references public.reading_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_type text not null check (note_type in ('excerpt', 'reflection')),
  body text,
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.reading_books enable row level security;
alter table public.reading_notes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reading_books' and policyname = 'users manage own reading books') then
    create policy "users manage own reading books" on public.reading_books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reading_notes' and policyname = 'users manage own reading notes') then
    create policy "users manage own reading notes" on public.reading_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('reading-images', 'reading-images', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'users manage own reading images') then
    create policy "users manage own reading images" on storage.objects for all
    using (bucket_id = 'reading-images' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'reading-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

-- One-time migration from an anonymous account to an existing email account.
create table if not exists public.account_migrations (
  source_user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.account_migrations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_migrations' and policyname = 'anonymous user prepares own migration') then
    create policy "anonymous user prepares own migration" on public.account_migrations for insert with check (auth.uid() = source_user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_migrations' and policyname = 'anonymous user restarts own migration') then
    create policy "anonymous user restarts own migration" on public.account_migrations for update using (auth.uid() = source_user_id) with check (auth.uid() = source_user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_migrations' and policyname = 'anonymous user reads own migration') then
    create policy "anonymous user reads own migration" on public.account_migrations for select using (auth.uid() = source_user_id);
  end if;
end $$;

create or replace function public.claim_anonymous_migration(p_source_user_id uuid, p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  valid_token boolean;
begin
  if target_user_id is null or target_user_id = p_source_user_id then
    raise exception 'A different signed-in account is required';
  end if;
  select token_hash = p_token_hash and expires_at > now() into valid_token from public.account_migrations where source_user_id = p_source_user_id;
  if valid_token is distinct from true then raise exception 'Migration token is invalid or expired'; end if;
  update public.time_tasks set user_id = target_user_id where user_id = p_source_user_id;
  update public.time_records set user_id = target_user_id where user_id = p_source_user_id;
  update public.reading_books set user_id = target_user_id where user_id = p_source_user_id;
  update public.reading_notes set user_id = target_user_id where user_id = p_source_user_id;
  delete from public.account_migrations where source_user_id = p_source_user_id;
  return true;
end;

revoke all on function public.claim_anonymous_migration(uuid, text) from public;
grant execute on function public.claim_anonymous_migration(uuid, text) to authenticated;
