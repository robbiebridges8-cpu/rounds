-- Rounds 0010: stars are back, with halves. Rankings are gone.
--
-- The Beli-style ranked list (migration 0009) was cut a day after it went
-- in: it did not fit how people talk about pubs. A rating is now 0.5 to 5 in
-- half steps, Letterboxd style. Everything that mirrored the ranking is
-- removed, and the aggregate columns become numeric so half stars add up.

set search_path = public, extensions;

-- remove rankings --------------------------------------------------------
drop function if exists public.rank_pub(uuid, text, integer);
drop function if exists public.unrank_pub(uuid);
drop function if exists public.rescore_rankings(uuid);
drop function if exists public.sentiment_rank(text);
drop table if exists public.pub_rankings;
alter table public.checkins drop column if exists score;

-- half stars -------------------------------------------------------------
alter table public.checkins drop constraint if exists checkins_rating_check;
alter table public.checkins alter column rating type numeric(2, 1);
alter table public.checkins add constraint checkins_rating_check
  check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)));

-- rating_sum feeds a generated column, which has to be dropped to retype it.
alter table public.pub_stats drop column avg_rating;
alter table public.pub_stats alter column rating_sum type numeric(7, 1);
alter table public.pub_stats add column avg_rating numeric(3, 2)
  generated always as (
    case when rating_count > 0 then round(rating_sum / rating_count, 2) end
  ) stored;

create or replace function public.refresh_pub_stats(p uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.pub_stats s set
    checkin_count = agg.n,
    visitor_count = agg.v,
    rating_count = agg.rc,
    rating_sum = agg.rs,
    last_checkin_at = agg.last_at
  from (
    select
      count(*)::integer as n,
      count(distinct user_id)::integer as v,
      count(rating)::integer as rc,
      coalesce(sum(rating), 0)::numeric as rs,
      max(created_at) as last_at
    from public.checkins where pub_id = p
  ) agg
  where s.pub_id = p;
$$;

revoke all on function public.refresh_pub_stats(uuid) from public, anon, authenticated;

-- functions that returned smallint ratings now return numeric -------------
drop function public.map_pubs(double precision, double precision, double precision, double precision, integer);

create function public.map_pubs(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  max_rows integer default 400
)
returns table (
  id uuid,
  name text,
  lat double precision,
  lng double precision,
  status text,
  avg_rating numeric,
  checkin_count integer,
  visited_by_me boolean,
  my_rating numeric,
  friend_visits integer,
  friend_avg_rating numeric
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    p.id,
    p.name,
    p.lat,
    p.lng,
    p.status,
    s.avg_rating,
    s.checkin_count,
    coalesce(v.mine, false),
    v.my_rating,
    coalesce(v.friend_visits, 0),
    v.friend_avg_rating
  from public.pubs p
  join public.pub_stats s on s.pub_id = p.id
  left join lateral (
    select
      bool_or(c.user_id = (select auth.uid())) as mine,
      (array_agg(c.rating order by c.created_at desc)
        filter (where c.user_id = (select auth.uid()) and c.rating is not null))[1] as my_rating,
      count(*) filter (where c.user_id <> (select auth.uid()))::integer as friend_visits,
      round(avg(c.rating) filter (where c.user_id <> (select auth.uid())), 1) as friend_avg_rating
    from public.checkins c
    where c.pub_id = p.id
  ) v on true
  where p.status <> 'closed'
    and p.location && extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography
  order by coalesce(v.mine, false) desc, coalesce(v.friend_visits, 0) desc, s.checkin_count desc
  limit max_rows;
$$;

revoke all on function public.map_pubs(double precision, double precision, double precision, double precision, integer) from public, anon;
grant execute on function public.map_pubs(double precision, double precision, double precision, double precision, integer) to authenticated;

drop function public.user_pub_map(uuid);

create function public.user_pub_map(target uuid)
returns table (
  pub_id uuid,
  name text,
  lat double precision,
  lng double precision,
  borough text,
  visits integer,
  last_visit timestamptz,
  latest_rating numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.name,
    p.lat,
    p.lng,
    p.borough,
    count(*)::integer as visits,
    max(c.created_at) as last_visit,
    (array_agg(c.rating order by c.created_at desc) filter (where c.rating is not null))[1]
  from public.checkins c
  join public.pubs p on p.id = c.pub_id
  where c.user_id = target
  group by p.id, p.name, p.lat, p.lng, p.borough;
$$;

revoke all on function public.user_pub_map(uuid) from public, anon;
grant execute on function public.user_pub_map(uuid) to authenticated;
