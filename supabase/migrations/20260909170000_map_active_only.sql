-- Rounds 0014: the map can ask for only pubs with any life in them.
-- At city zoom three and a half thousand grey dots read as an empty app;
-- a scatter of colour reads as a party you are late to. The client passes
-- only_active at wide zoom and false once you are into a neighbourhood.

set search_path = public, extensions;

drop function public.map_pubs(double precision, double precision, double precision, double precision, integer);

create function public.map_pubs(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  max_rows integer default 400,
  only_active boolean default false
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
    p.id, p.name, p.lat, p.lng, p.status,
    s.avg_rating, s.checkin_count,
    coalesce(v.mine, false), v.my_rating,
    coalesce(v.friend_visits, 0), v.friend_avg_rating
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
    and (not only_active or s.checkin_count > 0)
  order by coalesce(v.mine, false) desc, coalesce(v.friend_visits, 0) desc, s.checkin_count desc
  limit max_rows;
$$;

revoke all on function public.map_pubs(double precision, double precision, double precision, double precision, integer, boolean) from public, anon;
grant execute on function public.map_pubs(double precision, double precision, double precision, double precision, integer, boolean) to authenticated;
