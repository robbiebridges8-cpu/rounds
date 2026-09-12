-- Rounds 0021: lists and quests, the small things.
--
-- list_index gains been_count (how many of the list's pubs the caller has
-- checked in at) so the Explore card can say "4 of 12 been". list_pub_status
-- gains lat/lng so a list can be shown on the map. Default creator names
-- follow the app's name. Return types change, so the two functions are
-- dropped and recreated.

drop function if exists public.list_index();
create function public.list_index()
returns table (
  id uuid,
  title text,
  description text,
  creator_id uuid,
  creator_name text,
  pub_count integer,
  follower_count integer,
  following boolean,
  been_count integer,
  sample text[],
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    l.id, l.title, l.description, l.creator_id,
    coalesce(p.display_name, 'Pub''d'),
    (select count(*) from public.list_pubs lp where lp.list_id = l.id)::integer,
    (select count(*) from public.list_follows f where f.list_id = l.id)::integer,
    exists (select 1 from public.list_follows f where f.list_id = l.id and f.user_id = (select auth.uid())),
    (select count(*) from public.list_pubs lp where lp.list_id = l.id
      and exists (select 1 from public.checkins c where c.pub_id = lp.pub_id and c.user_id = (select auth.uid())))::integer,
    (select coalesce(array_agg(pb.name order by lp.position, lp.added_at), '{}')
      from (select * from public.list_pubs lp2 where lp2.list_id = l.id order by lp2.position, lp2.added_at limit 3) lp
      join public.pubs pb on pb.id = lp.pub_id),
    l.created_at
  from public.lists l
  left join public.profiles p on p.id = l.creator_id
  order by 8 desc, 7 desc, 11 desc;
$$;
revoke all on function public.list_index() from public;
grant execute on function public.list_index() to authenticated;

drop function if exists public.list_pub_status(uuid);
create function public.list_pub_status(list uuid)
returns table (
  pub_id uuid,
  name text,
  borough text,
  lat double precision,
  lng double precision,
  note text,
  sort_order integer,
  done boolean,
  avg_rating numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id, p.name, p.borough, p.lat, p.lng, lp.note, lp.position,
    exists (select 1 from public.checkins c where c.pub_id = p.id and c.user_id = (select auth.uid())),
    s.avg_rating
  from public.list_pubs lp
  join public.pubs p on p.id = lp.pub_id
  left join public.pub_stats s on s.pub_id = p.id
  where lp.list_id = list
  order by lp.position, lp.added_at;
$$;
revoke all on function public.list_pub_status(uuid) from public;
grant execute on function public.list_pub_status(uuid) to authenticated;

-- Same default name on the other two, no signature change.
create or replace function public.pub_lists(pub uuid)
returns table (id uuid, title text, creator_name text, follower_count integer, note text)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select l.id, l.title, coalesce(p.display_name, 'Pub''d'),
    (select count(*) from public.list_follows f where f.list_id = l.id)::integer,
    lp.note
  from public.list_pubs lp
  join public.lists l on l.id = lp.list_id
  left join public.profiles p on p.id = l.creator_id
  where lp.pub_id = pub
  order by 4 desc, l.created_at desc;
$$;

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
    coalesce(p.display_name, 'Pub''d'),
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
