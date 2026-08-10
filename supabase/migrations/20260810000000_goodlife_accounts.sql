create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb,
  days jsonb not null default '{}'::jsonb,
  swaps jsonb not null default '{}'::jsonb,
  habits jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"fontSize":"medium"}'::jsonb,
  sync_preferences jsonb not null default '{"profile":true,"habits":true,"completions":true,"settings":true,"conversations":true}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_date date not null,
  title text not null default 'Conversation',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create or replace function public.set_goodlife_conversation_created_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.conversation_date > current_date or new.conversation_date < current_date - 6 then
    raise exception 'Conversation date must be within the past seven days';
  end if;
  new.created_at = new.conversation_date::timestamp at time zone 'UTC';
  return new;
end;
$$;

drop trigger if exists set_conversation_created_at on public.conversations;
create trigger set_conversation_created_at before insert on public.conversations for each row execute function public.set_goodlife_conversation_created_at();

alter table public.user_state enable row level security;
alter table public.conversations enable row level security;

create policy "users read their state" on public.user_state for select using (auth.uid() = user_id);
create policy "users create their state" on public.user_state for insert with check (auth.uid() = user_id);
create policy "users update their state" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete their state" on public.user_state for delete using (auth.uid() = user_id);

create policy "users read recent conversations" on public.conversations for select using (auth.uid() = user_id and created_at >= now() - interval '7 days');
create policy "users create their conversations" on public.conversations for insert with check (auth.uid() = user_id);
create policy "users update recent conversations" on public.conversations for update using (auth.uid() = user_id and created_at >= now() - interval '7 days') with check (auth.uid() = user_id);
create policy "users delete their conversations" on public.conversations for delete using (auth.uid() = user_id);

create or replace function public.touch_goodlife_row() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_state on public.user_state;
create trigger touch_user_state before update on public.user_state for each row execute function public.touch_goodlife_row();
drop trigger if exists touch_conversations on public.conversations;
create trigger touch_conversations before update on public.conversations for each row execute function public.touch_goodlife_row();

create or replace function public.delete_expired_goodlife_conversations() returns void language sql security definer set search_path = '' as $$
  delete from public.conversations where created_at < now() - interval '7 days';
$$;
revoke all on function public.delete_expired_goodlife_conversations() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'delete-expired-goodlife-conversations';
select cron.schedule('delete-expired-goodlife-conversations', '17 * * * *', $$select public.delete_expired_goodlife_conversations()$$);
