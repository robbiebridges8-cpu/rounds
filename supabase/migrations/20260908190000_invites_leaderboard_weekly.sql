-- Rounds 0007: invite codes, the friends leaderboard, and the weekly summary.
--
-- Invite codes live in their own table rather than on profiles, because
-- profiles are readable by every signed-in user and a code must only be known
-- to its owner. Accepting a code creates an accepted friendship straight away:
-- sharing the link is the consent.

set search_path = public, extensions;

-- invite codes -----------------------------------------------------------
create table public.invite_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
create policy invite_codes_select_own on public.invite_codes
  for select to authenticated using (user_id = (select auth.uid()));

-- 8 characters, no ambiguous glyphs (0/O, 1/I/L), 32^8 combinations.
create or replace function public.generate_invite_code()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31))::int + 1, 1), ''
  ) from generate_series(1, 8);
$$;

create or replace function public.profiles_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  loop
    begin
      insert into public.invite_codes (user_id, code) values (new.id, public.generate_invite_code());
      exit;
    exception when unique_violation then
      -- astronomically unlikely, but loop rather than fail onboarding
    end;
  end loop;
  return null;
end;
$$;

create trigger profiles_create_invite
  after insert on public.profiles
  for each row execute function public.profiles_after_insert();

insert into public.invite_codes (user_id, code)
select id, public.generate_invite_code() from public.profiles
on conflict do nothing;

create or replace function public.accept_invite(invite text)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  inviter uuid;
  rec public.profiles;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select user_id into inviter from public.invite_codes where code = upper(trim(invite));
  if inviter is null then
    raise exception 'that invite code is not valid';
  end if;
  if inviter = me then
    raise exception 'that is your own invite';
  end if;

  insert into public.friendships (user_low, user_high, requested_by, status, responded_at)
  values (least(me, inviter), greatest(me, inviter), inviter, 'accepted', now())
  on conflict (user_low, user_high) do update
    set status = 'accepted',
        responded_at = coalesce(public.friendships.responded_at, now());

  select * into rec from public.profiles where id = inviter;
  return rec;
end;
$$;

revoke all on function public.generate_invite_code() from public, anon, authenticated;
revoke all on function public.profiles_after_insert() from public, anon, authenticated;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- leaderboard ------------------------------------------------------------
-- You and your accepted friends, ranked by boroughs. Security invoker, so the
-- check-in counts come through RLS and a friend's number is exactly what you
-- would see on their profile.
create or replace function public.friends_leaderboard()
returns table (
  user_id uuid,
  username extensions.citext,
  display_name text,
  avatar_url text,
  borough_count integer,
  pub_count integer,
  checkin_count integer,
  is_me boolean
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with people as (
    select (select auth.uid()) as id
    union
    select case when user_low = (select auth.uid()) then user_high else user_low end
    from public.friendships
    where status = 'accepted' and (select auth.uid()) in (user_low, user_high)
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(distinct pb.borough)::integer,
    count(distinct c.pub_id)::integer,
    count(c.id)::integer,
    p.id = (select auth.uid())
  from people pe
  join public.profiles p on p.id = pe.id
  left join public.checkins c on c.user_id = p.id
  left join public.pubs pb on pb.id = c.pub_id
  group by p.id
  order by 5 desc, 6 desc, 7 desc, p.display_name;
$$;

revoke all on function public.friends_leaderboard() from public, anon;
grant execute on function public.friends_leaderboard() to authenticated;

-- weekly summary ---------------------------------------------------------
-- The last seven days across you and your friends: how many check-ins, the
-- most visited pub, and who went out most. One row, nulls when quiet.
create or replace function public.weekly_summary()
returns table (
  checkin_count integer,
  people_count integer,
  new_pub_count integer,
  top_pub_id uuid,
  top_pub_name text,
  top_pub_visits integer,
  top_pub_rating numeric,
  busiest_user_id uuid,
  busiest_display_name text,
  busiest_checkins integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recent as (
    select c.* from public.checkins c where c.created_at >= now() - interval '7 days'
  ),
  top_pub as (
    select r.pub_id, count(*) as visits, round(avg(r.rating), 1) as rating
    from recent r
    group by r.pub_id
    order by visits desc, rating desc nulls last
    limit 1
  ),
  busiest as (
    select r.user_id, count(*) as n
    from recent r
    group by r.user_id
    order by n desc
    limit 1
  )
  select
    (select count(*) from recent)::integer,
    (select count(distinct user_id) from recent)::integer,
    (select count(distinct r.pub_id) from recent r
      where not exists (
        select 1 from public.checkins o
        where o.pub_id = r.pub_id and o.created_at < now() - interval '7 days'
      ))::integer,
    t.pub_id,
    p.name,
    t.visits::integer,
    t.rating,
    b.user_id,
    pr.display_name,
    b.n::integer
  from (select 1) as one
  left join top_pub t on true
  left join public.pubs p on p.id = t.pub_id
  left join busiest b on true
  left join public.profiles pr on pr.id = b.user_id;
$$;

revoke all on function public.weekly_summary() from public, anon;
grant execute on function public.weekly_summary() to authenticated;
