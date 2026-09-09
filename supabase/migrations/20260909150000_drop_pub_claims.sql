-- Rounds 0012: pub claims come out again. Too early: there is no audience
-- to sell to yet, and a claim flow nobody reviews is worse than none.

set search_path = public, extensions;

drop function if exists public.pub_is_claimed(uuid);
drop table if exists public.pub_details;
drop table if exists public.pub_claims;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not an admin';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'new_users_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'active_7d', (select count(distinct user_id) from public.checkins where created_at >= now() - interval '7 days'),
    'active_30d', (select count(distinct user_id) from public.checkins where created_at >= now() - interval '30 days'),
    'checkins_7d', (select count(*) from public.checkins where created_at >= now() - interval '7 days'),
    'checkins_total', (select count(*) from public.checkins),
    'photos_total', (select count(*) from public.checkin_photos),
    'friendships', (select count(*) from public.friendships where status = 'accepted'),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'checkins', n, 'users', u) order by wk), '[]'::jsonb)
      from (
        select date_trunc('week', created_at)::date as wk, count(*) as n, count(distinct user_id) as u
        from public.checkins where created_at >= now() - interval '12 weeks'
        group by 1
      ) w
    ),
    'boroughs', (
      select coalesce(jsonb_agg(jsonb_build_object('borough', borough, 'checkins', n) order by n desc), '[]'::jsonb)
      from (
        select p.borough, count(*) as n
        from public.checkins c join public.pubs p on p.id = c.pub_id
        where p.borough is not null and c.created_at >= now() - interval '30 days'
        group by p.borough order by n desc limit 12
      ) b
    ),
    'top_pubs', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'borough', borough, 'checkins', n, 'visitors', v) order by n desc), '[]'::jsonb)
      from (
        select p.id, p.name, p.borough, count(*) as n, count(distinct c.user_id) as v
        from public.checkins c join public.pubs p on p.id = c.pub_id
        where c.created_at >= now() - interval '30 days'
        group by p.id order by n desc limit 10
      ) t
    )
  ) into result;
  return result;
end;
$$;
