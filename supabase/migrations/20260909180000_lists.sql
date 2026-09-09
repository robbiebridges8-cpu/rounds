-- Rounds 0015: lists. Quests are lists with a finish line; these are lists
-- as taste. Anyone publishes one, anyone follows one, a pub page says how
-- many lists it is on. The creator alone edits the pubs and the one-line
-- notes. Everything is public to signed-in users: a list is meant to be seen.

set search_path = public, extensions;

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  description text check (char_length(description) <= 280),
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.lists enable row level security;
create policy lists_select on public.lists for select to authenticated using (true);
create policy lists_insert on public.lists for insert to authenticated with check (creator_id = (select auth.uid()));
create policy lists_update on public.lists for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy lists_delete on public.lists for delete to authenticated using (creator_id = (select auth.uid()));

create table public.list_pubs (
  list_id uuid not null references public.lists(id) on delete cascade,
  pub_id uuid not null references public.pubs(id) on delete cascade,
  note text check (char_length(note) <= 140),
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (list_id, pub_id)
);

create index list_pubs_pub_idx on public.list_pubs (pub_id);

alter table public.list_pubs enable row level security;
create policy list_pubs_select on public.list_pubs for select to authenticated using (true);
create policy list_pubs_write on public.list_pubs for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.creator_id = (select auth.uid())));

create table public.list_follows (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index list_follows_user_idx on public.list_follows (user_id);

alter table public.list_follows enable row level security;
create policy list_follows_select on public.list_follows for select to authenticated using (true);
create policy list_follows_insert on public.list_follows for insert to authenticated with check (user_id = (select auth.uid()));
create policy list_follows_delete on public.list_follows for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.list_index()
returns table (
  id uuid,
  title text,
  description text,
  creator_id uuid,
  creator_name text,
  pub_count integer,
  follower_count integer,
  following boolean,
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
    coalesce(p.display_name, 'Rounds'),
    (select count(*) from public.list_pubs lp where lp.list_id = l.id)::integer,
    (select count(*) from public.list_follows f where f.list_id = l.id)::integer,
    exists (select 1 from public.list_follows f where f.list_id = l.id and f.user_id = (select auth.uid())),
    (select coalesce(array_agg(pb.name order by lp.position, lp.added_at), '{}')
      from (select * from public.list_pubs lp2 where lp2.list_id = l.id order by lp2.position, lp2.added_at limit 3) lp
      join public.pubs pb on pb.id = lp.pub_id),
    l.created_at
  from public.lists l
  left join public.profiles p on p.id = l.creator_id
  order by 8 desc, 7 desc, 10 desc;
$$;

create or replace function public.list_pub_status(list uuid)
returns table (
  pub_id uuid,
  name text,
  borough text,
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
    p.id, p.name, p.borough, lp.note, lp.position,
    exists (select 1 from public.checkins c where c.pub_id = p.id and c.user_id = (select auth.uid())),
    s.avg_rating
  from public.list_pubs lp
  join public.pubs p on p.id = lp.pub_id
  left join public.pub_stats s on s.pub_id = p.id
  where lp.list_id = list
  order by lp.position, lp.added_at;
$$;

create or replace function public.pub_lists(pub uuid)
returns table (id uuid, title text, creator_name text, follower_count integer, note text)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select l.id, l.title, coalesce(p.display_name, 'Rounds'),
    (select count(*) from public.list_follows f where f.list_id = l.id)::integer,
    lp.note
  from public.list_pubs lp
  join public.lists l on l.id = lp.list_id
  left join public.profiles p on p.id = l.creator_id
  where lp.pub_id = pub
  order by 4 desc, l.created_at desc;
$$;

revoke all on function public.list_index() from public, anon;
revoke all on function public.list_pub_status(uuid) from public, anon;
revoke all on function public.pub_lists(uuid) from public, anon;
grant execute on function public.list_index() to authenticated;
grant execute on function public.list_pub_status(uuid) to authenticated;
grant execute on function public.pub_lists(uuid) to authenticated;
