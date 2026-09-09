-- Rounds 0011: tagging mates on a check-in, guests who are not on the app,
-- an in-app inbox with push delivery, claimable pub pages, a pub blurb and
-- a classics quest, admin stats, a monthly recap, and account deletion.

set search_path = public, extensions;

-- who was there --------------------------------------------------------
create table public.checkin_tags (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);

create index checkin_tags_user_idx on public.checkin_tags (user_id, created_at desc);

alter table public.checkin_tags enable row level security;
create policy checkin_tags_select on public.checkin_tags
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
-- You can tag a friend on your own check-in.
create policy checkin_tags_insert on public.checkin_tags
  for insert to authenticated
  with check (
    exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = (select auth.uid()))
    and public.are_friends((select auth.uid()), user_id)
  );
-- Either the tagger or the tagged can remove it.
create policy checkin_tags_delete on public.checkin_tags
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = (select auth.uid()))
  );

-- Someone who was there but is not on Rounds. The text they get is sent
-- from the phone; this row is so the post can say "with Sam".
create table public.checkin_guests (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index checkin_guests_checkin_idx on public.checkin_guests (checkin_id);

alter table public.checkin_guests enable row level security;
create policy checkin_guests_select on public.checkin_guests
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy checkin_guests_insert on public.checkin_guests
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = (select auth.uid()))
  );
create policy checkin_guests_delete on public.checkin_guests
  for delete to authenticated using (invited_by = (select auth.uid()));

-- inbox ----------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('cheers', 'reply', 'tag', 'digest', 'claim')),
  actor_id uuid references public.profiles(id) on delete set null,
  checkin_id uuid references public.checkins(id) on delete cascade,
  pub_id uuid references public.pubs(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No insert policy: rows come from triggers.

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'ios',
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
create policy push_tokens_all on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Delivery: a row in notifications is the record; the push is best effort.
-- The trigger posts the row id to the send-push edge function through
-- pg_net, which looks up the person's tokens and talks to Expo.
create extension if not exists pg_net with schema extensions;

create table public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;
-- No policies: only security definer functions read it.

create or replace function public.notify(
  p_user uuid, p_kind text, p_actor uuid, p_checkin uuid, p_pub uuid, p_title text, p_body text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  n_id uuid;
  push_url text;
  push_key text;
begin
  if p_user is null or p_user = p_actor then return; end if;

  insert into public.notifications (user_id, kind, actor_id, checkin_id, pub_id, title, body)
  values (p_user, p_kind, p_actor, p_checkin, p_pub, p_title, p_body)
  returning id into n_id;

  select value into push_url from public.app_config where key = 'push_url';
  select value into push_key from public.app_config where key = 'push_secret';
  if push_url is not null and push_key is not null then
    perform net.http_post(
      url := push_url,
      body := jsonb_build_object('notification_id', n_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', push_key),
      timeout_milliseconds := 8000
    );
  end if;
end;
$$;

revoke all on function public.notify(uuid, text, uuid, uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.cheers_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner uuid; who text; pub text;
begin
  select c.user_id, p.name into owner, pub from public.checkins c join public.pubs p on p.id = c.pub_id where c.id = new.checkin_id;
  select display_name into who from public.profiles where id = new.user_id;
  perform public.notify(owner, 'cheers', new.user_id, new.checkin_id, null, who || ' said cheers', 'They sent a photo back on your check-in at ' || pub || '.');
  return null;
end;
$$;

create trigger cheers_notify after insert on public.cheers
  for each row execute function public.cheers_after_insert();

create or replace function public.comments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner uuid; who text; pub text;
begin
  select c.user_id, p.name into owner, pub from public.checkins c join public.pubs p on p.id = c.pub_id where c.id = new.checkin_id;
  select display_name into who from public.profiles where id = new.user_id;
  perform public.notify(owner, 'reply', new.user_id, new.checkin_id, null, who || ' replied', left(new.body, 120));
  return null;
end;
$$;

create trigger comments_notify after insert on public.checkin_comments
  for each row execute function public.comments_after_insert();

create or replace function public.tags_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner uuid; who text; pub text; pub_id uuid;
begin
  select c.user_id, c.pub_id, p.name into owner, pub_id, pub from public.checkins c join public.pubs p on p.id = c.pub_id where c.id = new.checkin_id;
  select display_name into who from public.profiles where id = owner;
  perform public.notify(new.user_id, 'tag', owner, new.checkin_id, pub_id, who || ' put you at ' || pub, 'Were you there? Add it to your map.');
  return null;
end;
$$;

create trigger tags_notify after insert on public.checkin_tags
  for each row execute function public.tags_after_insert();

revoke all on function public.cheers_after_insert() from public, anon, authenticated;
revoke all on function public.comments_after_insert() from public, anon, authenticated;
revoke all on function public.tags_after_insert() from public, anon, authenticated;

-- The Sunday digest, for everyone whose circle did anything this week.
create extension if not exists pg_cron;

create or replace function public.send_weekly_digests()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r record; n integer := 0;
begin
  for r in
    select p.id,
      (select count(*) from public.checkins c
        where c.created_at >= now() - interval '7 days'
          and (c.user_id = p.id or public.are_friends(p.id, c.user_id))) as cnt
    from public.profiles p
  loop
    if r.cnt > 0 then
      perform public.notify(r.id, 'digest', null, null, null, 'Your week in pubs',
        r.cnt || ' check-in' || case when r.cnt = 1 then '' else 's' end || ' across your mates. See who went where.');
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.send_weekly_digests() from public, anon, authenticated;

select cron.schedule('rounds-weekly-digest', '0 17 * * 0', $$select public.send_weekly_digests()$$);

-- claimable pubs -------------------------------------------------------
create table public.pub_claims (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('landlord', 'manager', 'brand')),
  contact text not null check (char_length(contact) between 3 and 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (pub_id, user_id)
);

alter table public.pub_claims enable row level security;
create policy pub_claims_select_own on public.pub_claims
  for select to authenticated using (user_id = (select auth.uid()));
create policy pub_claims_insert on public.pub_claims
  for insert to authenticated with check (user_id = (select auth.uid()));

-- What a claimed pub can say about itself. Readable by all, written by an
-- approved claimant.
create table public.pub_details (
  pub_id uuid primary key references public.pubs(id) on delete cascade,
  hours text check (char_length(hours) <= 200),
  offer text check (char_length(offer) <= 200),
  event text check (char_length(event) <= 200),
  website text check (char_length(website) <= 200),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.pub_details enable row level security;
create policy pub_details_select on public.pub_details for select to authenticated using (true);
create policy pub_details_write on public.pub_details
  for all to authenticated
  using (exists (select 1 from public.pub_claims k where k.pub_id = pub_details.pub_id and k.user_id = (select auth.uid()) and k.status = 'approved'))
  with check (exists (select 1 from public.pub_claims k where k.pub_id = pub_details.pub_id and k.user_id = (select auth.uid()) and k.status = 'approved'));

-- Is this pub claimed and approved, without exposing who by.
create or replace function public.pub_is_claimed(p uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from public.pub_claims where pub_id = p and status = 'approved'); $$;

revoke all on function public.pub_is_claimed(uuid) from public, anon;
grant execute on function public.pub_is_claimed(uuid) to authenticated;

-- a blurb and the classics ------------------------------------------------
alter table public.pubs add column blurb text check (char_length(blurb) <= 200);

-- admin ------------------------------------------------------------------
create table public.admins (user_id uuid primary key references public.profiles(id) on delete cascade);
alter table public.admins enable row level security;
create policy admins_select_self on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

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
    'claims_pending', (select count(*) from public.pub_claims where status = 'pending'),
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

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- monthly recap ------------------------------------------------------------
create or replace function public.my_month()
returns table (
  month_start date,
  checkin_count integer,
  pub_count integer,
  new_pub_count integer,
  new_borough_count integer,
  top_pub_id uuid,
  top_pub_name text,
  top_pub_visits integer,
  avg_rating numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with bounds as (
    select date_trunc('month', now() - interval '1 month')::date as s, date_trunc('month', now())::date as e
  ),
  mine as (
    select c.*, p.borough from public.checkins c join public.pubs p on p.id = c.pub_id
    where c.user_id = (select auth.uid())
  ),
  m as (select * from mine, bounds where created_at >= s and created_at < e),
  top as (select pub_id, count(*) as n from m group by pub_id order by n desc limit 1)
  select
    (select s from bounds),
    (select count(*) from m)::integer,
    (select count(distinct pub_id) from m)::integer,
    (select count(distinct pub_id) from m where not exists (select 1 from mine o where o.pub_id = m.pub_id and o.created_at < (select s from bounds)))::integer,
    (select count(distinct borough) from m where borough is not null and not exists (select 1 from mine o where o.borough = m.borough and o.created_at < (select s from bounds)))::integer,
    t.pub_id, p.name, t.n::integer,
    (select round(avg(rating), 1) from m)
  from (select 1) one
  left join top t on true
  left join public.pubs p on p.id = t.pub_id;
$$;

revoke all on function public.my_month() from public, anon;
grant execute on function public.my_month() to authenticated;

-- account deletion ---------------------------------------------------------
-- Apple requires it. Everything cascades from auth.users.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- feed: a tagged mate can add the visit to their own map ------------------
-- Just a normal check-in with the same pub; the app calls insert.
