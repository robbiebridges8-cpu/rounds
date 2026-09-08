-- Rounds 0006: storage objects need a SELECT policy.
-- Postgres applies SELECT policies to rows returned by INSERT ... RETURNING,
-- and the storage service returns the object row after every upload. With no
-- SELECT policy, every upload failed with "new row violates row-level
-- security policy" even though the INSERT policy passed. Both buckets are
-- public, so letting signed-in users see the object rows gives nothing away.

create policy "public buckets select" on storage.objects
  for select to authenticated
  using (bucket_id in ('checkin-photos', 'avatars'));
