-- Rounds 0026: a tag is a question until the tagged person says yes.
--
-- Yes: the tag is accepted, the pub counts for them through a shadow
-- check-in that points at the original and never shows as a post, and the
-- original post is surfaced to their friends too, unless they already have
-- their own check-in there that night. No: the tag is deleted.

alter table public.checkin_tags
  add column accepted_at timestamptz,
  add column surfaced boolean not null default false;

alter table public.checkins
  add column tagged_from uuid references public.checkins(id) on delete cascade;
create index if not exists checkins_tagged_from_idx on public.checkins (tagged_from);

-- Can a viewer see this check-in because a friend of theirs accepted a tag on it?
-- Security definer so the checkins policy can ask without recursing into RLS.
create or replace function public.surfaced_for(p_checkin uuid, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.checkin_tags t
    where t.checkin_id = p_checkin and t.surfaced and public.are_friends(p_viewer, t.user_id)
  );
$$;
revoke all on function public.surfaced_for(uuid, uuid) from public, anon;
grant execute on function public.surfaced_for(uuid, uuid) to authenticated;

drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.are_friends((select auth.uid()), user_id)
    or public.surfaced_for(id, (select auth.uid()))
  );

-- Saying yes. Everything derived, one call.
create or replace function public.accept_tag(p_checkin uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare me uuid := auth.uid(); original public.checkins%rowtype; own_exists boolean;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into original from public.checkins where id = p_checkin;
  if original.id is null then raise exception 'no such check-in'; end if;
  if not exists (select 1 from public.checkin_tags t where t.checkin_id = p_checkin and t.user_id = me) then
    raise exception 'you are not tagged on this';
  end if;
  select exists (
    select 1 from public.checkins c
    where c.user_id = me and c.pub_id = original.pub_id and c.tagged_from is null
      and c.created_at between original.created_at - interval '12 hours' and original.created_at + interval '12 hours'
  ) into own_exists;
  update public.checkin_tags
    set accepted_at = coalesce(accepted_at, now()), surfaced = not own_exists
    where checkin_id = p_checkin and user_id = me;
  if own_exists then return 'already'; end if;
  if not exists (select 1 from public.checkins c where c.user_id = me and c.tagged_from = p_checkin) then
    insert into public.checkins (user_id, pub_id, client_id, created_at, tagged_from)
    values (me, original.pub_id, gen_random_uuid(), original.created_at, p_checkin);
  end if;
  return 'added';
end;
$$;
revoke all on function public.accept_tag(uuid) from public, anon;
grant execute on function public.accept_tag(uuid) to authenticated;

-- The tagged person can withdraw: the existing delete policy allows it, and
-- the shadow check-in goes with the tag.
create or replace function public.tags_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.checkins where tagged_from = old.checkin_id and user_id = old.user_id;
  return null;
end;
$$;
drop trigger if exists tags_cleanup on public.checkin_tags;
create trigger tags_cleanup after delete on public.checkin_tags
  for each row execute function public.tags_after_delete();
revoke all on function public.tags_after_delete() from public, anon, authenticated;
