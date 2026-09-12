-- Rounds 0024: indexes the advisor asked for, and trigger functions closed
-- to direct calls. Nothing user-visible; the feed and inbox stay fast as
-- the tables grow, and nobody can invoke a trigger body over the API.

create index if not exists checkin_comments_user_idx on public.checkin_comments (user_id);
create index if not exists checkin_guests_invited_by_idx on public.checkin_guests (invited_by);
create index if not exists checkin_likes_user_idx on public.checkin_likes (user_id);
create index if not exists cheers_user_idx on public.cheers (user_id);
create index if not exists comment_likes_user_idx on public.comment_likes (user_id);
create index if not exists feedback_user_idx on public.feedback (user_id);
create index if not exists friendships_requested_by_idx on public.friendships (requested_by);
create index if not exists lists_creator_idx on public.lists (creator_id);
create index if not exists notifications_actor_idx on public.notifications (actor_id);
create index if not exists notifications_checkin_idx on public.notifications (checkin_id);
create index if not exists notifications_pub_idx on public.notifications (pub_id);
create index if not exists pub_corrections_user_idx on public.pub_corrections (user_id);
create index if not exists pub_tag_stats_tag_idx on public.pub_tag_stats (tag);
create index if not exists pub_tag_votes_tag_idx on public.pub_tag_votes (tag);
create index if not exists pubs_created_by_idx on public.pubs (created_by);
create index if not exists reports_reporter_idx on public.reports (reporter_id);

revoke all on function public.checkins_after_insert_lists() from public, anon, authenticated;
revoke all on function public.list_follows_after_change() from public, anon, authenticated;
revoke all on function public.list_pubs_after_change() from public, anon, authenticated;
revoke all on function public.refresh_list_completion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_admin() from anon;
