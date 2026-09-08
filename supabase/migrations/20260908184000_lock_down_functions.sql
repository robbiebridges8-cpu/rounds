-- Rounds 0005: trigger and helper functions should not be reachable over the
-- REST API. Triggers run as the table owner regardless of who has EXECUTE, so
-- revoking costs nothing. are_friends() stays executable by authenticated
-- because RLS policies evaluate it as the calling role.

revoke all on function public.refresh_pub_stats(uuid) from public, anon, authenticated;
revoke all on function public.create_pub_stats_row() from public, anon, authenticated;
revoke all on function public.checkins_before_write() from public, anon, authenticated;
revoke all on function public.checkins_after_write() from public, anon, authenticated;
revoke all on function public.pub_tag_votes_after_write() from public, anon, authenticated;

revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

revoke all on function public.request_friendship(extensions.citext) from public, anon;
grant execute on function public.request_friendship(extensions.citext) to authenticated;

revoke all on function public.map_pubs(double precision, double precision, double precision, double precision, integer) from public, anon;
revoke all on function public.nearby_pubs(double precision, double precision, integer, integer) from public, anon;
revoke all on function public.user_pub_map(uuid) from public, anon;
revoke all on function public.user_stats(uuid) from public, anon;
grant execute on function public.map_pubs(double precision, double precision, double precision, double precision, integer) to authenticated;
grant execute on function public.nearby_pubs(double precision, double precision, integer, integer) to authenticated;
grant execute on function public.user_pub_map(uuid) to authenticated;
grant execute on function public.user_stats(uuid) to authenticated;
