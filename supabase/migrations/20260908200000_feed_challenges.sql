-- Rounds 0008: the feed (cheers and replies), challenges and badges, a
-- leaderboard with more than one column, and the personal weekly digest.
--
-- Cheers is a photo reply to a check-in, and only to a check-in that has a
-- photo of its own. That constraint is in the INSERT policy, not the app.
-- Every social row inherits the check-in's visibility through an EXISTS on
-- public.checkins, which is itself filtered by RLS, so a photo reply is
-- visible exactly when the check-in it answers is.

set search_path = public, extensions;

-- cheers -----------------------------------------------------------------
create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now(),
  unique (checkin_id, user_id)
);

create index cheers_checkin_idx on public.cheers (checkin_id);

alter table public.cheers enable row level security;

create policy cheers_select on public.cheers
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy cheers_insert on public.cheers
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.checkins c where c.id = checkin_id)
    and exists (select 1 from public.checkin_photos p where p.checkin_id = cheers.checkin_id)
  );
create policy cheers_delete on public.cheers
  for delete to authenticated using (user_id = (select auth.uid()));

-- replies ----------------------------------------------------------------
create table public.checkin_comments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

create index checkin_comments_checkin_idx on public.checkin_comments (checkin_id, created_at);

alter table public.checkin_comments enable row level security;

create policy checkin_comments_select on public.checkin_comments
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy checkin_comments_insert on public.checkin_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.checkins c where c.id = checkin_id)
  );
create policy checkin_comments_delete on public.checkin_comments
  for delete to authenticated using (user_id = (select auth.uid()));

-- challenges -------------------------------------------------------------
-- Anyone can create one. The creator curates the pub list. Anyone can join,
-- progress comes from their own check-ins, and finishing earns the badge.
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  description text check (char_length(description) <= 280),
  icon text not null default 'flag.fill',
  color text not null default 'ale' check (color in ('ale', 'gold', 'mate', 'stout', 'danger')),
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
create policy challenges_select on public.challenges for select to authenticated using (true);
create policy challenges_insert on public.challenges
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy challenges_update on public.challenges
  for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy challenges_delete on public.challenges
  for delete to authenticated using (creator_id = (select auth.uid()));

create table public.challenge_pubs (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  pub_id uuid not null references public.pubs(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (challenge_id, pub_id)
);

create index challenge_pubs_pub_idx on public.challenge_pubs (pub_id);

alter table public.challenge_pubs enable row level security;
create policy challenge_pubs_select on public.challenge_pubs for select to authenticated using (true);
create policy challenge_pubs_insert on public.challenge_pubs
  for insert to authenticated
  with check (exists (
    select 1 from public.challenges ch where ch.id = challenge_id and ch.creator_id = (select auth.uid())
  ));
create policy challenge_pubs_delete on public.challenge_pubs
  for delete to authenticated
  using (exists (
    select 1 from public.challenges ch where ch.id = challenge_id and ch.creator_id = (select auth.uid())
  ));

create table public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (challenge_id, user_id)
);

create index challenge_members_user_idx on public.challenge_members (user_id);

alter table public.challenge_members enable row level security;
-- Readable by everyone so "12 people doing this" and badges on profiles work.
create policy challenge_members_select on public.challenge_members for select to authenticated using (true);
create policy challenge_members_insert on public.challenge_members
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy challenge_members_delete on public.challenge_members
  for delete to authenticated using (user_id = (select auth.uid()));
-- No update policy: completed_at is only ever set by the trigger below.

-- completion is derived from check-ins, never written by the app ---------
create or replace function public.refresh_challenge_completion(p_challenge uuid, p_user uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.challenge_members m
  set completed_at = case
    when exists (select 1 from public.challenge_pubs cp where cp.challenge_id = p_challenge)
     and not exists (
       select 1 from public.challenge_pubs cp
       where cp.challenge_id = p_challenge
         and not exists (
           select 1 from public.checkins c where c.user_id = p_user and c.pub_id = cp.pub_id
         )
     )
    then coalesce(m.completed_at, now())
    else null
  end
  where m.challenge_id = p_challenge and m.user_id = p_user;
$$;

create or replace function public.checkins_after_insert_challenges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare ch uuid;
begin
  for ch in
    select m.challenge_id
    from public.challenge_members m
    join public.challenge_pubs cp on cp.challenge_id = m.challenge_id and cp.pub_id = new.pub_id
    where m.user_id = new.user_id
  loop
    perform public.refresh_challenge_completion(ch, new.user_id);
  end loop;
  return null;
end;
$$;

create trigger checkins_challenges
  after insert on public.checkins
  for each row execute function public.checkins_after_insert_challenges();

create or replace function public.challenge_pubs_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target uuid := coalesce(new.challenge_id, old.challenge_id); member uuid;
begin
  for member in select user_id from public.challenge_members where challenge_id = target loop
    perform public.refresh_challenge_completion(target, member);
  end loop;
  return null;
end;
$$;

create trigger challenge_pubs_recompute
  after insert or delete on public.challenge_pubs
  for each row execute function public.challenge_pubs_after_change();

create or replace function public.challenge_members_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_challenge_completion(new.challenge_id, new.user_id);
  return null;
end;
$$;

create trigger challenge_members_recompute
  after insert on public.challenge_members
  for each row execute function public.challenge_members_after_insert();

revoke all on function public.refresh_challenge_completion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.checkins_after_insert_challenges() from public, anon, authenticated;
revoke all on function public.challenge_pubs_after_change() from public, anon, authenticated;
revoke all on function public.challenge_members_after_insert() from public, anon, authenticated;

-- challenge queries -------------------------------------------------------
create or replace function public.challenge_list()
returns table (
  id uuid,
  title text,
  description text,
  icon text,
  color text,
  creator_id uuid,
  creator_name text,
  pub_count integer,
  member_count integer,
  joined boolean,
  done_count integer,
  completed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    ch.id, ch.title, ch.description, ch.icon, ch.color, ch.creator_id,
    coalesce(p.display_name, 'Rounds'),
    (select count(*) from public.challenge_pubs cp where cp.challenge_id = ch.id)::integer,
    (select count(*) from public.challenge_members m where m.challenge_id = ch.id)::integer,
    mine.user_id is not null,
    (select count(*) from public.challenge_pubs cp
      where cp.challenge_id = ch.id
        and exists (select 1 from public.checkins c where c.pub_id = cp.pub_id and c.user_id = (select auth.uid())))::integer,
    mine.completed_at,
    ch.created_at
  from public.challenges ch
  left join public.profiles p on p.id = ch.creator_id
  left join public.challenge_members mine on mine.challenge_id = ch.id and mine.user_id = (select auth.uid())
  order by 10 desc, 9 desc, 13 desc;
$$;

create or replace function public.challenge_pub_status(challenge uuid)
returns table (
  pub_id uuid,
  name text,
  borough text,
  lat double precision,
  lng double precision,
  done boolean,
  friends_done integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id, p.name, p.borough, p.lat, p.lng,
    exists (select 1 from public.checkins c where c.pub_id = p.id and c.user_id = (select auth.uid())),
    (select count(distinct c.user_id) from public.checkins c
      where c.pub_id = p.id and c.user_id <> (select auth.uid()))::integer
  from public.challenge_pubs cp
  join public.pubs p on p.id = cp.pub_id
  where cp.challenge_id = challenge
  order by 6 desc, p.borough nulls last, p.name;
$$;

create or replace function public.user_badges(target uuid)
returns table (challenge_id uuid, title text, icon text, color text, completed_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select ch.id, ch.title, ch.icon, ch.color, m.completed_at
  from public.challenge_members m
  join public.challenges ch on ch.id = m.challenge_id
  where m.user_id = target and m.completed_at is not null
  order by m.completed_at desc;
$$;

revoke all on function public.challenge_list() from public, anon;
revoke all on function public.challenge_pub_status(uuid) from public, anon;
revoke all on function public.user_badges(uuid) from public, anon;
grant execute on function public.challenge_list() to authenticated;
grant execute on function public.challenge_pub_status(uuid) to authenticated;
grant execute on function public.user_badges(uuid) to authenticated;

-- leaderboard, second edition --------------------------------------------
drop function public.friends_leaderboard();

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
    (select count(*) from public.challenge_members m where m.user_id = p.id and m.completed_at is not null)::integer,
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

-- personal digest ---------------------------------------------------------
create or replace function public.my_week()
returns table (
  this_week integer,
  new_pubs integer,
  best_week integer,
  best_week_start date,
  weeks_active integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with mine as (
    select c.* from public.checkins c where c.user_id = (select auth.uid())
  ),
  weeks as (
    select date_trunc('week', created_at)::date as wk, count(*) as n
    from mine group by 1
  ),
  best as (select wk, n from weeks order by n desc, wk desc limit 1)
  select
    (select count(*) from mine where created_at >= now() - interval '7 days')::integer,
    (select count(distinct m.pub_id) from mine m
      where m.created_at >= now() - interval '7 days'
        and not exists (select 1 from mine o where o.pub_id = m.pub_id and o.created_at < now() - interval '7 days'))::integer,
    coalesce((select n from best), 0)::integer,
    (select wk from best),
    (select count(*) from weeks)::integer;
$$;

revoke all on function public.my_week() from public, anon;
grant execute on function public.my_week() to authenticated;

-- a first challenge, so the tab is not empty ------------------------------
-- Wetherspoons tag their pubs by brand in OSM. Only seeded if the import
-- actually found some, so this is a no-op on an empty database.
insert into public.challenges (id, title, description, icon, color, creator_id)
select
  '00000000-0000-4000-8000-000000000001',
  'Every Wetherspoons in London',
  'All of them. Every carpet. No excuses.',
  'building.columns.fill',
  'ale',
  null
where (
  select count(*) from public.pubs p
  join public.pubs_osm o on o.osm_type = p.osm_type and o.osm_id = p.osm_id
  where o.tags->>'brand' ilike '%wetherspoon%' or o.tags->>'operator' ilike '%wetherspoon%'
) >= 5
on conflict (id) do nothing;

insert into public.challenge_pubs (challenge_id, pub_id)
select '00000000-0000-4000-8000-000000000001', p.id
from public.pubs p
join public.pubs_osm o on o.osm_type = p.osm_type and o.osm_id = p.osm_id
where exists (select 1 from public.challenges where id = '00000000-0000-4000-8000-000000000001')
  and (o.tags->>'brand' ilike '%wetherspoon%' or o.tags->>'operator' ilike '%wetherspoon%')
  and p.status <> 'closed'
on conflict do nothing;
