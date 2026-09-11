-- Rounds 0020: in-app feedback, and admin access to everything people report.
--
-- `feedback` is bugs, ideas and anything else, sent from Settings with an
-- optional screenshot. Admins read all of it, plus the existing `reports` and
-- `pub_corrections` tables, from one inbox in the app, and can set a status.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  screen text,
  app_version text,
  device text,
  screenshot_path text,
  status text not null default 'new' check (status in ('new', 'seen', 'done')),
  created_at timestamptz not null default now()
);

create index feedback_status_idx on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;

create policy feedback_insert_own on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy feedback_select on public.feedback
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy feedback_admin_update on public.feedback
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admins read and resolve what already exists.
create policy reports_admin_select on public.reports
  for select to authenticated using (public.is_admin());
create policy reports_admin_update on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pub_corrections_admin_select on public.pub_corrections
  for select to authenticated using (public.is_admin());
create policy pub_corrections_admin_update on public.pub_corrections
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Screenshots. Public bucket, unguessable paths under your own user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-shots', 'feedback-shots', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "feedback shots insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback-shots' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "public buckets select" on storage.objects;
create policy "public buckets select" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('checkin-photos', 'avatars', 'pub-photos', 'feedback-shots'));
