-- Rounds 0002: pubs.
-- Licence separation (see LICENSING.md): pubs_osm holds the ODbL OpenStreetMap
-- import verbatim and is never written to by users. public.pubs is our own
-- record, keyed by our own uuid, holding a nullable reference back to OSM.

set search_path = public, extensions;

create table public.pubs_osm (
  osm_type text not null check (osm_type in ('node', 'way', 'relation')),
  osm_id bigint not null,
  name text,
  lat double precision not null,
  lng double precision not null,
  addr_housenumber text,
  addr_street text,
  addr_city text,
  addr_postcode text,
  opening_hours text,
  website text,
  tags jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  primary key (osm_type, osm_id)
);

comment on table public.pubs_osm is
  'OpenStreetMap import, ODbL licensed. Read-only to clients; written only by the seed script via the service role. Never merge user-generated content into this table.';

alter table public.pubs_osm enable row level security;
create policy pubs_osm_select on public.pubs_osm for select to authenticated using (true);

create table public.pubs (
  id uuid primary key default extensions.gen_random_uuid(),
  osm_type text,
  osm_id bigint,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326)
    generated always as (
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    ) stored,
  address text,
  borough text,
  status text not null default 'unverified' check (status in ('open', 'closed', 'unverified')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint pubs_name_len check (char_length(name) between 1 and 120),
  constraint pubs_osm_ref check ((osm_type is null) = (osm_id is null)),
  foreign key (osm_type, osm_id) references public.pubs_osm(osm_type, osm_id) on delete set null
);

create unique index pubs_osm_ref_key on public.pubs (osm_type, osm_id) where osm_id is not null;
create index pubs_location_idx on public.pubs using gist (location);
create index pubs_borough_idx on public.pubs (borough);

alter table public.pubs enable row level security;

create policy pubs_select on public.pubs for select to authenticated using (true);

-- Anyone can add a pub the import missed. They cannot claim an OSM identity
-- for it, and it stays unverified until someone checks in.
create policy pubs_insert on public.pubs
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and osm_id is null
    and status = 'unverified'
  );

-- Public aggregates. Individual check-ins are friends-only, but a pub's rating
-- and visit count are visible to everyone, so they live in their own table that
-- is not subject to check-in row visibility.
create table public.pub_stats (
  pub_id uuid primary key references public.pubs(id) on delete cascade,
  checkin_count integer not null default 0,
  visitor_count integer not null default 0,
  rating_count integer not null default 0,
  rating_sum integer not null default 0,
  avg_rating numeric(3, 2)
    generated always as (
      case when rating_count > 0 then round(rating_sum::numeric / rating_count, 2) end
    ) stored,
  last_checkin_at timestamptz
);

alter table public.pub_stats enable row level security;
create policy pub_stats_select on public.pub_stats for select to authenticated using (true);

create or replace function public.create_pub_stats_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.pub_stats (pub_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger pubs_create_stats
  after insert on public.pubs
  for each row execute function public.create_pub_stats_row();
