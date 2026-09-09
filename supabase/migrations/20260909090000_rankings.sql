-- Rounds 0009: personal rankings.
--
-- Stars are gone. After a check-in you say loved / fine / meh, then answer a
-- few "which do you prefer?" comparisons, and the pub takes a position in
-- your own ordered list. The score out of ten is derived from that position
-- inside its sentiment bucket, so it is always relative to your other pubs:
-- your best "loved" pub is a 10, your worst "meh" is a 0.5.
--
-- The list is only ever written through rank_pub / unrank_pub (security
-- definer), because a position change has to shift everyone else and rescore
-- the whole list atomically. checkins.score and checkins.rating are mirrors
-- so the feed and the pub aggregates need no join.

set search_path = public, extensions;

create table public.pub_rankings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pub_id uuid not null references public.pubs(id) on delete cascade,
  sentiment text not null check (sentiment in ('loved', 'fine', 'meh')),
  position integer not null,
  score numeric(3, 1) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, pub_id)
);

create index pub_rankings_user_pos_idx on public.pub_rankings (user_id, position);
create index pub_rankings_pub_idx on public.pub_rankings (pub_id);

alter table public.pub_rankings enable row level security;

-- Visible to you and your friends, like a check-in. Written only by the RPCs.
create policy pub_rankings_select on public.pub_rankings
  for select to authenticated
  using (user_id = (select auth.uid()) or public.are_friends((select auth.uid()), user_id));

alter table public.checkins add column score numeric(3, 1);

create or replace function public.sentiment_rank(s text)
returns integer
language sql
immutable
as $$ select case s when 'loved' then 0 when 'fine' then 1 else 2 end; $$;

-- Renumber densely, rescore every bucket, and mirror onto check-ins.
create or replace function public.rescore_rankings(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with ordered as (
    select pub_id, row_number() over (order by public.sentiment_rank(sentiment), position, updated_at) - 1 as pos
    from public.pub_rankings where user_id = p_user
  )
  update public.pub_rankings r set position = o.pos
  from ordered o where r.user_id = p_user and r.pub_id = o.pub_id and r.position <> o.pos;

  with bucketed as (
    select pub_id, sentiment,
      row_number() over (partition by sentiment order by position) - 1 as r,
      count(*) over (partition by sentiment) as n
    from public.pub_rankings where user_id = p_user
  ),
  scored as (
    select pub_id,
      round((
        case sentiment when 'loved' then 10.0 when 'fine' then 6.9 else 3.9 end
        - (case sentiment when 'loved' then 3.0 when 'fine' then 2.9 else 3.4 end)
          * r / greatest(n - 1, 1)
      )::numeric, 1) as score
    from bucketed
  )
  update public.pub_rankings r set score = s.score
  from scored s where r.user_id = p_user and r.pub_id = s.pub_id and r.score <> s.score;

  -- Mirror. rating (1-5) keeps pub_stats honest without a schema change there.
  update public.checkins c
  set score = r.score,
      rating = greatest(1, least(5, round(r.score / 2)))::smallint
  from public.pub_rankings r
  where c.user_id = p_user and r.user_id = p_user and c.pub_id = r.pub_id
    and (c.score is distinct from r.score);
end;
$$;

-- Put a pub at index p_index inside its sentiment bucket (0 = best in bucket).
create or replace function public.rank_pub(p_pub uuid, p_sentiment text, p_index integer)
returns table (rank_position integer, rank_score numeric, rank_total integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  higher integer;
  bucket_size integer;
  global integer;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_sentiment not in ('loved', 'fine', 'meh') then raise exception 'bad sentiment'; end if;

  delete from public.pub_rankings where user_id = me and pub_id = p_pub;

  select count(*) into higher from public.pub_rankings
    where user_id = me and public.sentiment_rank(sentiment) < public.sentiment_rank(p_sentiment);
  select count(*) into bucket_size from public.pub_rankings
    where user_id = me and sentiment = p_sentiment;

  global := higher + least(greatest(coalesce(p_index, 0), 0), bucket_size);

  update public.pub_rankings set position = position + 1
    where user_id = me and position >= global;

  insert into public.pub_rankings (user_id, pub_id, sentiment, position, updated_at)
    values (me, p_pub, p_sentiment, global, now());

  perform public.rescore_rankings(me);

  return query
    select r.position, r.score, (select count(*)::integer from public.pub_rankings where user_id = me)
    from public.pub_rankings r where r.user_id = me and r.pub_id = p_pub;
end;
$$;

create or replace function public.unrank_pub(p_pub uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid();
begin
  delete from public.pub_rankings where user_id = me and pub_id = p_pub;
  update public.checkins set score = null where user_id = me and pub_id = p_pub;
  perform public.rescore_rankings(me);
end;
$$;

revoke all on function public.sentiment_rank(text) from public, anon;
revoke all on function public.rescore_rankings(uuid) from public, anon, authenticated;
revoke all on function public.rank_pub(uuid, text, integer) from public, anon;
revoke all on function public.unrank_pub(uuid) from public, anon;
grant execute on function public.sentiment_rank(text) to authenticated;
grant execute on function public.rank_pub(uuid, text, integer) to authenticated;
grant execute on function public.unrank_pub(uuid) to authenticated;
