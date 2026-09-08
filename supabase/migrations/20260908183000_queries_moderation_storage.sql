-- Rounds 0004: the queries the app actually runs, plus corrections, reports
-- and storage buckets.
--
-- All query functions are security invoker: check-in visibility comes from RLS,
-- so a friend's visits appear and a stranger's never do, without the function
-- having to reason about it.

set search_path = public, extensions;

-- Pins for the current map viewport, coloured by who has been.
create or replace function public.map_pubs(
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
  my_rating smallint,
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
  -- keep pubs you or your friends know about when the viewport is crowded
  order by coalesce(v.mine, false) desc, coalesce(v.friend_visits, 0) desc, s.checkin_count desc
  limit max_rows;
$$;

grant execute on function public.map_pubs(double precision, double precision, double precision, double precision, integer) to authenticated;

-- The nearby list: same data, ordered by how far you have to walk.
create or replace function public.nearby_pubs(
  in_lat double precision,
  in_lng double precision,
  radius_m integer default 1500,
  max_rows integer default 50
)
returns table (
  id uuid,
  name text,
  lat double precision,
  lng double precision,
  address text,
  status text,
  distance_m double precision,
  avg_rating numeric,
  checkin_count integer,
  visited_by_me boolean,
  friend_visits integer
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(in_lng, in_lat), 4326)::extensions.geography as g
  )
  select
    p.id,
    p.name,
    p.lat,
    p.lng,
    p.address,
    p.status,
    extensions.st_distance(p.location, o.g) as distance_m,
    s.avg_rating,
    s.checkin_count,
    coalesce(v.mine, false),
    coalesce(v.friend_visits, 0)
  from public.pubs p
  cross join origin o
  join public.pub_stats s on s.pub_id = p.id
  left join lateral (
    select
      bool_or(c.user_id = (select auth.uid())) as mine,
      count(*) filter (where c.user_id <> (select auth.uid()))::integer as friend_visits
    from public.checkins c
    where c.pub_id = p.id
  ) v on true
  where p.status <> 'closed'
    and extensions.st_dwithin(p.location, o.g, radius_m)
  order by extensions.st_distance(p.location, o.g)
  limit max_rows;
$$;

grant execute on function public.nearby_pubs(double precision, double precision, integer, integer) to authenticated;

-- Every pub a person has been to, for the fill-in map on a profile. Returns
-- nothing for someone you are not friends with, because RLS says so.
create or replace function public.user_pub_map(target uuid)
returns table (
  pub_id uuid,
  name text,
  lat double precision,
  lng double precision,
  borough text,
  visits integer,
  last_visit timestamptz,
  latest_rating smallint
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

grant execute on function public.user_pub_map(uuid) to authenticated;

create or replace function public.user_stats(target uuid)
returns table (
  pub_count integer,
  checkin_count integer,
  borough_count integer,
  rated_count integer,
  avg_rating numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(distinct c.pub_id)::integer,
    count(*)::integer,
    count(distinct p.borough)::integer,
    count(c.rating)::integer,
    round(avg(c.rating), 1)
  from public.checkins c
  join public.pubs p on p.id = c.pub_id
  where c.user_id = target;
$$;

grant execute on function public.user_stats(uuid) to authenticated;

-- corrections and reports ----------------------------------------------
create table public.pub_corrections (
  id uuid primary key default extensions.gen_random_uuid(),
  pub_id uuid not null references public.pubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('closed', 'wrong_location', 'wrong_name', 'duplicate', 'other')),
  detail text check (char_length(detail) <= 500),
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create index pub_corrections_pub_idx on public.pub_corrections (pub_id, status);

alter table public.pub_corrections enable row level security;
create policy pub_corrections_select_own on public.pub_corrections
  for select to authenticated using (user_id = (select auth.uid()));
create policy pub_corrections_insert on public.pub_corrections
  for insert to authenticated with check (user_id = (select auth.uid()));

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('checkin', 'photo', 'profile')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- storage ---------------------------------------------------------------
-- Public buckets: URLs are unguessable uuids and get CDN caching, which matters
-- more than obscurity for photos people are posting to friends anyway.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('checkin-photos', 'checkin-photos', true, 5242880, array['image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Write access is scoped to a folder named after your own user id.
create policy "own folder insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('checkin-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "own folder update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('checkin-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "own folder delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('checkin-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
