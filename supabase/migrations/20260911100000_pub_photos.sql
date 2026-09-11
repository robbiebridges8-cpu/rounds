-- Rounds 0018: a front photo per pub, seeded from Wikimedia Commons.
--
-- One row per pub, written only by scripts/seed-photos.ts with the service
-- role. The photo is a resized copy in the public `pub-photos` bucket; the
-- row carries the author, licence and a link back, which is what the licence
-- asks us to show alongside it. Public like the rest of the pub record.
-- Check-in photos stay in checkin_photos and stay friends-only.

create table public.pub_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  pub_id uuid not null references public.pubs(id) on delete cascade,
  storage_path text not null,
  source text not null check (source in ('commons')),
  source_url text not null,
  source_title text,
  author text,
  licence text not null,
  licence_url text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create unique index pub_photos_pub_key on public.pub_photos (pub_id);

alter table public.pub_photos enable row level security;

create policy "pub photos are public" on public.pub_photos
  for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pub-photos', 'pub-photos', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "public buckets select" on storage.objects;
create policy "public buckets select" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('checkin-photos', 'avatars', 'pub-photos'));
