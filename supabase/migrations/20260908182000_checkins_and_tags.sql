-- Rounds 0003: check-ins, photos, and the pros/cons tag vote.
-- Check-in rows are visible to you and your accepted friends only. The public
-- surface of a pub is the aggregate tables (pub_stats, pub_tag_stats), which are
-- maintained by security-definer triggers so they count everyone's activity
-- without exposing anyone's individual rows.

set search_path = public, extensions;

create table public.checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pub_id uuid not null references public.pubs(id) on delete cascade,
  -- generated on the device before the request leaves it, so a check-in that
  -- gets retried from the offline queue lands exactly once.
  client_id uuid not null,
  rating smallint check (rating between 1 and 5),
  note text check (char_length(note) <= 500),
  lat double precision,
  lng double precision,
  distance_m integer,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index checkins_pub_idx on public.checkins (pub_id, created_at desc);
create index checkins_user_idx on public.checkins (user_id, created_at desc);

alter table public.checkins enable row level security;

create policy checkins_select on public.checkins
  for select to authenticated
  using (user_id = (select auth.uid()) or public.are_friends((select auth.uid()), user_id));
create policy checkins_insert on public.checkins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy checkins_update on public.checkins
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy checkins_delete on public.checkins
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.checkin_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index checkin_photos_checkin_idx on public.checkin_photos (checkin_id);

alter table public.checkin_photos enable row level security;

-- Inherits check-in visibility: the subquery is itself filtered by the policies
-- on public.checkins, so a photo is visible exactly when its check-in is.
create policy checkin_photos_select on public.checkin_photos
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy checkin_photos_insert on public.checkin_photos
  for insert to authenticated
  with check (exists (
    select 1 from public.checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())
  ));
create policy checkin_photos_delete on public.checkin_photos
  for delete to authenticated
  using (exists (
    select 1 from public.checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())
  ));

-- Fixed tag vocabulary. Voted up or down on a pub; net score decides whether a
-- tag reads as a pro or a con.
create table public.pub_tags (
  slug text primary key,
  label text not null,
  sort_order smallint not null default 0
);

alter table public.pub_tags enable row level security;
create policy pub_tags_select on public.pub_tags for select to authenticated using (true);

insert into public.pub_tags (slug, label, sort_order) values
  ('dog_friendly', 'Dog friendly', 10),
  ('garden',       'Garden',       20),
  ('pool_table',   'Pool table',   30),
  ('darts',        'Darts',        40),
  ('quiz',         'Quiz',         50),
  ('live_music',   'Live music',   60),
  ('shows_sport',  'Shows sport',  70),
  ('real_ale',     'Real ale',     80),
  ('food',         'Food',         90),
  ('date_spot',    'Date spot',   100),
  ('late',         'Open late',   110),
  ('cash_only',    'Cash only',   120);

create table public.pub_tag_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pub_id uuid not null references public.pubs(id) on delete cascade,
  tag text not null references public.pub_tags(slug) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, pub_id, tag)
);

create index pub_tag_votes_pub_idx on public.pub_tag_votes (pub_id, tag);

alter table public.pub_tag_votes enable row level security;

-- Your votes are yours. Everyone else sees only the aggregate.
create policy pub_tag_votes_select on public.pub_tag_votes
  for select to authenticated using (user_id = (select auth.uid()));
create policy pub_tag_votes_write on public.pub_tag_votes
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.pub_tag_stats (
  pub_id uuid not null references public.pubs(id) on delete cascade,
  tag text not null references public.pub_tags(slug) on delete cascade,
  up_votes integer not null default 0,
  down_votes integer not null default 0,
  net_votes integer generated always as (up_votes - down_votes) stored,
  primary key (pub_id, tag)
);

create index pub_tag_stats_pub_idx on public.pub_tag_stats (pub_id, net_votes desc);

alter table public.pub_tag_stats enable row level security;
create policy pub_tag_stats_select on public.pub_tag_stats for select to authenticated using (true);

-- aggregate maintenance ------------------------------------------------
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
      coalesce(sum(rating), 0)::integer as rs,
      max(created_at) as last_at
    from public.checkins where pub_id = p
  ) agg
  where s.pub_id = p;
$$;

create or replace function public.checkins_before_write()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- 150m geofence: inside it the check-in is verified, outside it still counts
  -- but is marked so the UI can say "logged from a distance".
  new.verified := new.distance_m is not null and new.distance_m <= 150;
  return new;
end;
$$;

create trigger checkins_geofence
  before insert or update of distance_m on public.checkins
  for each row execute function public.checkins_before_write();

create or replace function public.checkins_after_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_pub_stats(new.pub_id);
    -- first person through the door confirms the pub is real and open
    update public.pubs set status = 'open' where id = new.pub_id and status = 'unverified';
  end if;
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.pub_id <> new.pub_id) then
    perform public.refresh_pub_stats(old.pub_id);
  end if;
  return null;
end;
$$;

create trigger checkins_maintain_stats
  after insert or update or delete on public.checkins
  for each row execute function public.checkins_after_write();

create or replace function public.pub_tag_votes_after_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_pub uuid := coalesce(new.pub_id, old.pub_id);
  target_tag text := coalesce(new.tag, old.tag);
begin
  insert into public.pub_tag_stats (pub_id, tag, up_votes, down_votes)
  select target_pub, target_tag,
         count(*) filter (where value = 1)::integer,
         count(*) filter (where value = -1)::integer
  from public.pub_tag_votes where pub_id = target_pub and tag = target_tag
  on conflict (pub_id, tag) do update
    set up_votes = excluded.up_votes, down_votes = excluded.down_votes;
  return null;
end;
$$;

create trigger pub_tag_votes_maintain_stats
  after insert or update or delete on public.pub_tag_votes
  for each row execute function public.pub_tag_votes_after_write();
