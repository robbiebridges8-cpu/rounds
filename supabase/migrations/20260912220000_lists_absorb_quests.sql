-- Rounds 0022: quests become lists. A crawl is a list with an order.
--
-- One object. Every list shows progress; finishing a list you have saved
-- earns its badge. Quests, their pubs, members and completions move over
-- with their ids, so nothing anyone did is lost. The quest tables go.

alter table public.lists
  add column kind text not null default 'list' check (kind in ('list', 'crawl')),
  add column icon text not null default 'list.bullet',
  add column color text not null default 'ale' check (color in ('ale', 'gold', 'mate', 'stout', 'danger'));

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lists' and policyname = 'lists_delete') then
    create policy lists_delete on public.lists for delete to authenticated using (creator_id = (select auth.uid()));
  end if;
end $$;

-- Badges: a completion is derived, never written by the app.
create table public.list_completions (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index list_completions_user_idx on public.list_completions (user_id);
alter table public.list_completions enable row level security;
create policy list_completions_select on public.list_completions for select to authenticated using (true);

-- Move the quests over, ids intact.
insert into public.lists (id, title, description, creator_id, created_at, kind, icon, color)
select id, title, description, creator_id, created_at, 'list', icon, color from public.challenges
on conflict (id) do nothing;

insert into public.list_pubs (list_id, pub_id, position, added_at)
select challenge_id, pub_id, row_number() over (partition by challenge_id order by created_at), created_at
from public.challenge_pubs
on conflict do nothing;

insert into public.list_follows (list_id, user_id, created_at)
select challenge_id, user_id, joined_at from public.challenge_members
on conflict do nothing;

insert into public.list_completions (list_id, user_id, completed_at)
select challenge_id, user_id, completed_at from public.challenge_members where completed_at is not null
on conflict do nothing;

-- Completion: saved (or made) the list, and checked in at every pub on it.
create or replace function public.refresh_list_completion(p_list uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare finished boolean;
begin
  select
    (exists (select 1 from public.list_follows f where f.list_id = p_list and f.user_id = p_user)
      or exists (select 1 from public.lists l where l.id = p_list and l.creator_id = p_user))
    and exists (select 1 from public.list_pubs lp where lp.list_id = p_list)
    and not exists (
      select 1 from public.list_pubs lp
      where lp.list_id = p_list
        and not exists (select 1 from public.checkins c where c.user_id = p_user and c.pub_id = lp.pub_id))
  into finished;
  if finished then
    insert into public.list_completions (list_id, user_id) values (p_list, p_user) on conflict do nothing;
  else
    delete from public.list_completions where list_id = p_list and user_id = p_user;
  end if;
end;
$$;

create or replace function public.checkins_after_insert_lists()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare l uuid;
begin
  for l in
    select distinct lp.list_id
    from public.list_pubs lp
    join public.lists ls on ls.id = lp.list_id
    left join public.list_follows f on f.list_id = lp.list_id and f.user_id = new.user_id
    where lp.pub_id = new.pub_id and (f.user_id is not null or ls.creator_id = new.user_id)
  loop
    perform public.refresh_list_completion(l, new.user_id);
  end loop;
  return null;
end;
$$;

drop trigger if exists checkins_challenges on public.checkins;
drop trigger if exists checkins_lists on public.checkins;
create trigger checkins_lists
  after insert on public.checkins
  for each row execute function public.checkins_after_insert_lists();

create or replace function public.list_pubs_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target uuid := coalesce(new.list_id, old.list_id); member uuid;
begin
  for member in
    select user_id from public.list_follows where list_id = target
    union select creator_id from public.lists where id = target and creator_id is not null
  loop
    perform public.refresh_list_completion(target, member);
  end loop;
  return null;
end;
$$;

drop trigger if exists list_pubs_recompute on public.list_pubs;
create trigger list_pubs_recompute
  after insert or delete on public.list_pubs
  for each row execute function public.list_pubs_after_change();

create or replace function public.list_follows_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_list_completion(coalesce(new.list_id, old.list_id), coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

drop trigger if exists list_follows_recompute on public.list_follows;
create trigger list_follows_recompute
  after insert or delete on public.list_follows
  for each row execute function public.list_follows_after_change();

-- The index, with kind, look and your completion.
drop function if exists public.list_index();
create function public.list_index()
returns table (
  id uuid,
  title text,
  description text,
  kind text,
  icon text,
  color text,
  creator_id uuid,
  creator_name text,
  pub_count integer,
  follower_count integer,
  following boolean,
  been_count integer,
  completed_at timestamptz,
  sample text[],
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    l.id, l.title, l.description, l.kind, l.icon, l.color, l.creator_id,
    coalesce(p.display_name, 'Pub''d'),
    (select count(*) from public.list_pubs lp where lp.list_id = l.id)::integer,
    (select count(*) from public.list_follows f where f.list_id = l.id)::integer,
    exists (select 1 from public.list_follows f where f.list_id = l.id and f.user_id = (select auth.uid())),
    (select count(*) from public.list_pubs lp where lp.list_id = l.id
      and exists (select 1 from public.checkins c where c.pub_id = lp.pub_id and c.user_id = (select auth.uid())))::integer,
    (select lc.completed_at from public.list_completions lc where lc.list_id = l.id and lc.user_id = (select auth.uid())),
    (select coalesce(array_agg(pb.name order by lp.position, lp.added_at), '{}')
      from (select * from public.list_pubs lp2 where lp2.list_id = l.id order by lp2.position, lp2.added_at limit 3) lp
      join public.pubs pb on pb.id = lp.pub_id),
    l.created_at
  from public.lists l
  left join public.profiles p on p.id = l.creator_id
  order by 11 desc, 10 desc, 15 desc;
$$;
revoke all on function public.list_index() from public;
grant execute on function public.list_index() to authenticated;

-- Badges come from finished lists now.
drop function if exists public.user_badges(uuid);
create function public.user_badges(target uuid)
returns table (list_id uuid, title text, icon text, color text, completed_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select l.id, l.title, l.icon, l.color, lc.completed_at
  from public.list_completions lc
  join public.lists l on l.id = lc.list_id
  where lc.user_id = target
  order by lc.completed_at desc;
$$;
revoke all on function public.user_badges(uuid) from public;
grant execute on function public.user_badges(uuid) to authenticated;

-- The leaderboard counts finished lists as badges.
drop function if exists public.friends_leaderboard();
create function public.friends_leaderboard()
returns table (
  user_id uuid,
  username extensions.citext,
  display_name text,
  avatar_url text,
  borough_count integer,
  pub_count integer,
  checkin_count integer,
  month_checkins integer,
  month_pubs integer,
  badge_count integer,
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
  ),
  month as (select date_trunc('month', now()) as start)
  select
    p.id, p.username, p.display_name, p.avatar_url,
    count(distinct pb.borough)::integer,
    count(distinct c.pub_id)::integer,
    count(c.id)::integer,
    count(c.id) filter (where c.created_at >= (select start from month))::integer,
    count(distinct c.pub_id) filter (where c.created_at >= (select start from month))::integer,
    (select count(*) from public.list_completions lc where lc.user_id = p.id)::integer,
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

-- And the quests go. Tables first: their triggers go with them.
drop table if exists public.challenge_members;
drop table if exists public.challenge_pubs;
drop table if exists public.challenges;
drop function if exists public.challenge_list();
drop function if exists public.challenge_pub_status(uuid);
drop function if exists public.checkins_after_insert_challenges();
drop function if exists public.challenge_pubs_after_change();
drop function if exists public.challenge_members_after_insert();
drop function if exists public.refresh_challenge_completion(uuid, uuid);
