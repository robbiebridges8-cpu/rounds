-- Rounds 0025: a reply can answer another reply. One level: replies to
-- replies hang under the parent. The parent's author is told too.

alter table public.checkin_comments
  add column parent_id uuid references public.checkin_comments(id) on delete cascade;
create index if not exists checkin_comments_parent_idx on public.checkin_comments (parent_id);

create or replace function public.comments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner uuid; who text; pub text; parent_author uuid;
begin
  select c.user_id, p.name into owner, pub from public.checkins c join public.pubs p on p.id = c.pub_id where c.id = new.checkin_id;
  select display_name into who from public.profiles where id = new.user_id;
  perform public.notify(owner, 'reply', new.user_id, new.checkin_id, null, who || ' replied', left(new.body, 120));
  if new.parent_id is not null then
    select user_id into parent_author from public.checkin_comments where id = new.parent_id;
    if parent_author is not null and parent_author <> owner then
      perform public.notify(parent_author, 'reply', new.user_id, new.checkin_id, null, who || ' replied to you', left(new.body, 120));
    end if;
  end if;
  return null;
end;
$$;
