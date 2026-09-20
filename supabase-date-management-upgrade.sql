-- Run once in Supabase SQL Editor before using daily summaries.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'time_records_title_length') then
    alter table public.time_records add constraint time_records_title_length check (char_length(title) between 1 and 500);
  end if;
end $$;

create table if not exists public.daily_summaries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  slot smallint not null check (slot between 1 and 3),
  content text not null check (char_length(content) between 1 and 500),
  updated_at timestamptz not null default now(),
  unique (user_id, date, slot)
);

alter table public.daily_summaries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'daily_summaries' and policyname = 'users manage own daily summaries') then
    create policy "users manage own daily summaries" on public.daily_summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.claim_anonymous_migration(p_source_user_id uuid, p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $migration$
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
  update public.daily_summaries set user_id = target_user_id where user_id = p_source_user_id;
  update public.reading_books set user_id = target_user_id where user_id = p_source_user_id;
  update public.reading_notes set user_id = target_user_id where user_id = p_source_user_id;
  delete from public.account_migrations where source_user_id = p_source_user_id;
  return true;
end;
$migration$;

revoke all on function public.claim_anonymous_migration(uuid, text) from public;
grant execute on function public.claim_anonymous_migration(uuid, text) to authenticated;
