-- Rounds 0001: extensions, profiles, friendships.
-- Friendship is the whole visibility model: you see your own data, and your
-- accepted friends' data. Nothing else. Defined here so every later table can
-- lean on are_friends() rather than reinventing the rule.

create extension if not exists postgis with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- profiles -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique,
  display_name text not null,
  avatar_url text,
  home_city text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username::text ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_len check (char_length(display_name) between 1 and 40)
);

alter table public.profiles enable row level security;

-- Readable by any signed-in user: you need to look someone up by username to
-- add them, and render names on pub pages. Profiles carry no private fields.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- friendships ----------------------------------------------------------
-- One row per pair, stored in a canonical order so (a,b) and (b,a) can never
-- both exist. Mutual consent: requester inserts pending, the other accepts.
create table public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (user_low, user_high),
  constraint friendships_ordered check (user_low < user_high)
);

create index friendships_low_accepted_idx on public.friendships (user_low) where status = 'accepted';
create index friendships_high_accepted_idx on public.friendships (user_high) where status = 'accepted';

alter table public.friendships enable row level security;

create policy friendships_select on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (user_low, user_high));

create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and (select auth.uid()) in (user_low, user_high)
    and status = 'pending'
  );

-- Only the person who did not send the request can accept it.
create policy friendships_update on public.friendships
  for update to authenticated
  using ((select auth.uid()) in (user_low, user_high) and requested_by <> (select auth.uid()))
  with check (status = 'accepted');

-- Either side can unfriend, or the requester can withdraw.
create policy friendships_delete on public.friendships
  for delete to authenticated
  using ((select auth.uid()) in (user_low, user_high));

-- security definer so other tables' policies can call it without granting
-- those callers read access to the friendships table itself.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and user_low = least(a, b)
      and user_high = greatest(a, b)
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Add a friend by username. If they already asked you, this accepts instead,
-- so two people tapping "add" resolves to friends rather than two dead requests.
create or replace function public.request_friendship(target_username extensions.citext)
returns public.friendships
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  me uuid := auth.uid();
  target uuid;
  rec public.friendships;
begin
  select id into target from public.profiles where username = target_username;
  if target is null then
    raise exception 'no user with that username';
  end if;
  if target = me then
    raise exception 'you cannot add yourself';
  end if;

  select * into rec from public.friendships
  where user_low = least(me, target) and user_high = greatest(me, target);

  if rec is null then
    insert into public.friendships (user_low, user_high, requested_by)
    values (least(me, target), greatest(me, target), me)
    returning * into rec;
  elsif rec.status = 'pending' and rec.requested_by <> me then
    update public.friendships
      set status = 'accepted', responded_at = now()
      where user_low = rec.user_low and user_high = rec.user_high
      returning * into rec;
  end if;

  return rec;
end;
$$;

grant execute on function public.request_friendship(extensions.citext) to authenticated;
