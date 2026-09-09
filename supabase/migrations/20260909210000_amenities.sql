-- Rounds 0017: the amenities list, cut to what changes whether you go.
-- Sixteen tags. Where OpenStreetMap already knows (gardens, food, dogs,
-- live music, sport, step-free), the pub starts with one confirmation
-- marked as from the map, so no pub is blank on day one.

set search_path = public, extensions;

alter table public.pub_tag_stats add column if not exists osm boolean not null default false;

delete from public.pub_tag_votes;
delete from public.pub_tag_stats;
delete from public.pub_tags;

insert into public.pub_tags (slug, label, sort_order, "group") values
  ('garden',       'Garden',         10, 'has'),
  ('roof_terrace', 'Roof terrace',   20, 'has'),
  ('riverside',    'Riverside',      30, 'has'),
  ('cocktails',    'Cocktails',      40, 'has'),
  ('guinness',     'Good Guinness',  50, 'has'),
  ('food',         'Food',           60, 'has'),
  ('sunday_roast', 'Sunday roast',   70, 'has'),
  ('shows_sport',  'Shows sport',    80, 'has'),
  ('pool_table',   'Pool table',     90, 'has'),
  ('darts',        'Darts',         100, 'has'),
  ('quiz',         'Quiz',          110, 'has'),
  ('live_music',   'Live music',    120, 'has'),
  ('happy_hour',   'Happy hour',    130, 'has'),
  ('dog_friendly', 'Dog friendly',  200, 'know'),
  ('cash_only',    'Cash only',     210, 'know'),
  ('step_free',    'Step-free',     220, 'know');

-- Seed from OSM. One row per (pub, tag) the map vouches for.
insert into public.pub_tag_stats (pub_id, tag, up_votes, down_votes, osm)
select p.id, t.tag, 0, 0, true
from public.pubs p
join public.pubs_osm o on o.osm_type = p.osm_type and o.osm_id = p.osm_id
cross join lateral (
  select 'garden' as tag where o.tags->>'outdoor_seating' in ('yes', 'garden', 'terrace') or o.tags->>'garden' = 'yes' or o.tags->>'beer_garden' = 'yes'
  union all select 'food' where o.tags->>'food' = 'yes' or o.tags ? 'cuisine'
  union all select 'dog_friendly' where o.tags->>'dog' in ('yes', 'leashed')
  union all select 'live_music' where o.tags->>'live_music' = 'yes'
  union all select 'shows_sport' where o.tags ? 'sport' or o.tags->>'television' = 'yes' or o.tags->>'tv' = 'yes'
  union all select 'step_free' where o.tags->>'wheelchair' = 'yes'
  union all select 'cocktails' where o.tags->>'cocktails' = 'yes'
) t
on conflict (pub_id, tag) do update set osm = true;
