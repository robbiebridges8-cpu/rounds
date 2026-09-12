-- Rounds 0023: a like on your check-in tells you.

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('cheers', 'reply', 'tag', 'like', 'digest', 'claim'));

create or replace function public.likes_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner uuid; who text; pub text;
begin
  select c.user_id, p.name into owner, pub from public.checkins c join public.pubs p on p.id = c.pub_id where c.id = new.checkin_id;
  select display_name into who from public.profiles where id = new.user_id;
  perform public.notify(owner, 'like', new.user_id, new.checkin_id, null, who || ' liked your check-in', 'At ' || pub || '.');
  return null;
end;
$$;

drop trigger if exists likes_notify on public.checkin_likes;
create trigger likes_notify after insert on public.checkin_likes
  for each row execute function public.likes_after_insert();

revoke all on function public.likes_after_insert() from public, anon, authenticated;
