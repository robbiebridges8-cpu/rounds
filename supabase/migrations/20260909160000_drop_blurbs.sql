-- Rounds 0013: the seeded one-liners on pubs are gone. Written from memory,
-- read like a guidebook, and a guidebook is the opposite of the app.
alter table public.pubs drop column if exists blurb;
