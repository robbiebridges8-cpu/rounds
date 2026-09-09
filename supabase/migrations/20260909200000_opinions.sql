-- Rounds 0016: the opinion layer, rebuilt.
--
-- Tags are confirmations, never votes against. "Cash only" with a thumbs
-- up was ambiguous; "Cash only" as a chip you tap because it is true is not.
-- A value of -1 survives only as "not any more", set from a long press.
-- Two groups: what it has got, and what is good to know. Likes arrive on
-- posts and on replies; cheers stays a photo and stays the main event.

set search_path = public, extensions;

-- tag vocabulary ---------------------------------------------------------
alter table public.pub_tags add column if not exists "group" text not null default 'has'
  check ("group" in ('has', 'know'));

-- Votes first (their trigger rewrites stats), then stats, then the vocabulary.
delete from public.pub_tag_votes;
delete from public.pub_tag_stats;
delete from public.pub_tags;

insert into public.pub_tags (slug, label, sort_order, "group") values
  ('garden',        'Garden',              10, 'has'),
  ('real_ale',      'Real ale',            20, 'has'),
  ('dog_friendly',  'Dog friendly',        30, 'has'),
  ('food',          'Food',                40, 'has'),
  ('shows_sport',   'Shows sport',         50, 'has'),
  ('big_screen',    'Big screen',          60, 'has'),
  ('quiz',          'Quiz',                70, 'has'),
  ('live_music',    'Live music',          80, 'has'),
  ('pool_table',    'Pool table',          90, 'has'),
  ('darts',         'Darts',              100, 'has'),
  ('board_games',   'Board games',        110, 'has'),
  ('karaoke',       'Karaoke',            120, 'has'),
  ('fireplace',     'Fireplace',          130, 'has'),
  ('riverside',     'Riverside',          140, 'has'),
  ('roof_terrace',  'Roof terrace',       150, 'has'),
  ('late',          'Late licence',       160, 'has'),
  ('cash_only',     'Cash only',          200, 'know'),
  ('card_only',     'Card only',          210, 'know'),
  ('no_phones',     'No phones at the bar', 220, 'know'),
  ('table_service', 'Table service',      230, 'know'),
  ('books_up',      'Books up',           240, 'know'),
  ('standing',      'Standing room only', 250, 'know'),
  ('kids_early',    'Kids fine till 7',   260, 'know'),
  ('toilets',       'Dodgy toilets',      270, 'know');

-- likes ------------------------------------------------------------------
create table public.checkin_likes (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);

alter table public.checkin_likes enable row level security;
create policy checkin_likes_select on public.checkin_likes
  for select to authenticated using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy checkin_likes_insert on public.checkin_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.checkins c where c.id = checkin_id));
create policy checkin_likes_delete on public.checkin_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.comment_likes (
  comment_id uuid not null references public.checkin_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;
create policy comment_likes_select on public.comment_likes
  for select to authenticated using (exists (select 1 from public.checkin_comments c where c.id = comment_id));
create policy comment_likes_insert on public.comment_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.checkin_comments c where c.id = comment_id));
create policy comment_likes_delete on public.comment_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- rating distribution ------------------------------------------------------
-- Everyone's ratings, bucketed to whole stars, without exposing anyone.
create or replace function public.pub_rating_histogram(pub uuid)
returns table (star integer, n integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.star, count(c.id)::integer
  from generate_series(1, 5) as s(star)
  left join public.checkins c on c.pub_id = pub and c.rating is not null and ceil(c.rating) = s.star
  group by s.star
  order by s.star desc;
$$;

revoke all on function public.pub_rating_histogram(uuid) from public, anon;
grant execute on function public.pub_rating_histogram(uuid) to authenticated;
