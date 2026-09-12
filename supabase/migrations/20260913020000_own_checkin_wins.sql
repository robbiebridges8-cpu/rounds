-- Rounds 0027: your own check-in beats an accepted tag.
--
-- Accept a tag, then log the same pub yourself that night: the hidden
-- tagged check-in goes, and the mate's post stops being surfaced to your
-- friends, because your own post now covers it. The tag stays accepted.

create or replace function public.checkins_after_insert_own()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.tagged_from is not null then return null; end if;
  update public.checkin_tags t
    set surfaced = false
    from public.checkins o
    where t.checkin_id = o.id and t.user_id = new.user_id and o.pub_id = new.pub_id
      and o.created_at between new.created_at - interval '12 hours' and new.created_at + interval '12 hours';
  delete from public.checkins s
    using public.checkins o
    where s.tagged_from = o.id and s.user_id = new.user_id and o.pub_id = new.pub_id
      and o.created_at between new.created_at - interval '12 hours' and new.created_at + interval '12 hours';
  return null;
end;
$$;

drop trigger if exists checkins_own_wins on public.checkins;
create trigger checkins_own_wins
  after insert on public.checkins
  for each row execute function public.checkins_after_insert_own();
revoke all on function public.checkins_after_insert_own() from public, anon, authenticated;
