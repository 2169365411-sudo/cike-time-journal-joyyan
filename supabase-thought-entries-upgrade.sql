-- Run once in Supabase SQL Editor to enable “沉淀下来的思考与决心”.
create table if not exists public.thought_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.thought_entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'thought_entries' and policyname = 'users manage own thought entries') then
    create policy "users manage own thought entries" on public.thought_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
