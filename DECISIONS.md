# Decisions

Anything non-obvious, and why. Newest at the bottom of each section.

## Product shape

**Friends, not circles.** The original plan had named groups. Robbie cut them:
you have friends, and the map is where you see them. One friendship table, no
group membership, no invite links to build or maintain.

**Sessions are not in the MVP.** Live nights out, "whose round", session summary
cards: all cut. They were the most expensive part of the plan and the least
proven. Nothing about the current schema blocks adding them later.

**Badges, push notifications and leaderboards are cut too.** Same reasoning.
The check-in trigger that would award badges is not written, rather than written
and disabled.

**"Pros and cons" are tag votes.** Rather than free text, you thumbs-up or
thumbs-down tags from a fixed vocabulary (`garden`, `real_ale`, `cash_only`…).
Net score decides whether a tag reads as a pro or a con on the pub page. This
reuses the `pub_tag_votes` table from the original plan and gives a scannable
summary rather than paragraphs nobody reads.

## Auth

**Email and password, nothing sent by email.** The first cut used six digit
codes, but Supabase's default template sends a magic link instead of the code,
and a magic link is exactly the wrong thing for a phone app in Expo Go. Robbie
called it: a password is less friction than any email round trip. Sign up and
sign in are one screen. "Confirm email" must be switched off in the Supabase
dashboard (Authentication, Providers, Email) or sign-up stalls waiting for a
click that never comes. Password reset is not built.

**Apple Sign In is deferred.** It requires a paid Apple Developer membership
($99/yr), which we do not have yet. Email is the only sign-in method until we
do. The same membership is what unlocks dev builds on a physical phone and
TestFlight, so buy it when we want other people holding the app.

**Expo Go is the test target for now.** Everything the MVP needs — maps,
location, camera, photo library — works in Expo Go, so we can test on a real
iPhone with no Apple account at all.

## Data model

**Visibility is friendship, everywhere.** `are_friends(a, b)` is a security
definer function, and every table that holds personal data uses it in its RLS
policy. One rule, defined once. Check-ins, photos and notes are visible to you
and your accepted friends. Nobody else, ever.

**Aggregates live in their own tables.** `pub_stats` and `pub_tag_stats` are
maintained by security definer triggers and are readable by everyone. This is
what makes a pub page work: the rating and visit count are public, while the
individual check-ins that produced them stay friends-only. A view over
`checkins` could not do this, because it would inherit RLS and show you the
average of only your own friends' ratings.

**`checkins.client_id`.** A uuid generated on the device before the request
leaves it, unique per user. When the offline queue retries a check-in over a
flaky pub connection, the insert conflicts instead of creating a duplicate.

**`pubs.location` is a generated `geography` column.** Derived from lat/lng, so
there is one source of truth and no way for them to drift. `geography` rather
than `geometry` means distances come back in metres without reprojecting.
GIST indexed for the viewport and radius queries.

**Tag slugs are the primary key.** `pub_tags.slug` is text (`dog_friendly`), not
a serial. The vocabulary is fixed and small, and readable foreign keys beat a
join everywhere they appear.

**Usernames are `citext`.** Case-insensitive uniqueness enforced by the database
rather than by remembering to lowercase in application code, with a format check
constraint on top.

**Friendships are one row per pair.** `user_low`/`user_high` with a
`user_low < user_high` check constraint, so (a,b) and (b,a) cannot both exist.
`request_friendship()` handles ordering, and auto-accepts if the other person
already asked you.

**Trigger and helper functions are revoked from `anon` and `authenticated`.**
Triggers run as the table owner regardless, so nothing is lost, and it stops
`refresh_pub_stats` being callable over the REST API. Flagged by the Supabase
security advisor; fixed in migration 0005.

**Storage needs a SELECT policy even for uploads.** Postgres checks SELECT
policies on rows returned by `INSERT ... RETURNING`, and the storage service
always returns the row it created. Without a SELECT policy every upload fails
with an RLS error that looks like the INSERT policy is wrong. It is not.
Migration 0006. The app also treats a failed photo as a warning rather than a
failed check-in, because the check-in row is already saved by then.

**Photo buckets are public.** URLs contain unguessable uuids and get CDN
caching, which matters more for a photo you are showing your mates than
obscurity does. Signed URLs would add a round trip to every image.

## Stack

**NativeWind 4 with Tailwind 3.4, pinned.** NativeWind 4 does not support
Tailwind 4; the pin is deliberate, not staleness.

**Supabase project is in `eu-west-2` (London).** The users and the pubs are both
in London.

**Migrations are applied through the Supabase MCP connection**, with the exact
same SQL committed under `supabase/migrations/`. The Supabase CLI would be the
normal route but it needs an interactive login we cannot do from here. If you
ever run `supabase db push`, the filenames already match the recorded history.

**Overpass has three mirrors and retries.** The main instance failed on the
first request while building the seed script and worked on the second. Treat it
as unreliable infrastructure, because it is.

## App shell

**Classic tabs, not native tabs.** expo-router's `NativeTabs` (the real
UITabBar, Liquid Glass on iOS 26) needs a development build and does not run
in Expo Go. Until we have an Apple Developer membership the tab bar is the
JavaScript one from `Tabs`, styled to match and using SF Symbols via
`expo-symbols`. Swapping is confined to `src/app/(tabs)/_layout.tsx`.

**react-native-maps, not expo-maps.** Same reason: expo-maps needs a dev build.
react-native-maps renders Apple Maps on iOS inside Expo Go with no config.

**Detail screens live in the root stack.** Pub and friend profile pages are
pushed at the root, over the tab bar, so one route serves every tab. Check-in
and Nearby are `formSheet` presentations with detents, which is what the
Human Interface Guidelines want for a short focused task.

**Location is optional at check-in.** A check-in with no location, or one
logged more than 150 m away, still saves. The database marks it unverified and
the pub page says "logged 1.2 km away" rather than refusing. Nobody should
lose a check-in to a bad GPS fix in a basement bar.

**`expo export` needs `CI=1`.** NativeWind leaves a Tailwind watcher process
running, and without `CI=1` the export waits on it forever. `expo start` is
unaffected.

## Growth

**Invites are a code plus a deep link, not a universal link.** An https link
that opens the App Store, or the app if installed, needs the Apple Developer
membership (associated domains) and a store listing. Until then the share
message carries `rounds://invite/CODE` for people with the app and the eight
character code for everyone else. The code is in its own table, readable only
by its owner, and accepting it creates an accepted friendship directly:
sending the link is the consent.

**The borough map is the shareable artifact.** 33 ONS borough polygons,
simplified to SVG at build time (`pnpm build:boroughs`), gold where you have
been. It heads the profile screen and is rendered again off-screen at 1080 px
square for "Share my map". Both use the same component so they never drift.

**One leaderboard, boroughs only.** Leaderboards were cut from the MVP;
this is the smallest possible one back in. Friends only, ranked by boroughs,
because that is the number people compare over a pint. Pubs and check-ins are
shown but do not rank.

**The weekly summary is a local notification for now.** Push needs APNs
credentials, which need the Apple account. A repeating local notification on
Sunday at 6pm, scheduled on the device after the first check-in, opens the
Friends tab where the "This week" card is computed live. When there is a
server push path, the same card becomes the notification body.

**Onboarding ends with pubs, not a blank map.** The last step lists pubs
near you (or a name search) to tick. Those check-ins have no rating or
location, so they count but are not verified.

## Design

**Fraunces for display, the system font for everything else.** Headings,
big numbers and the wordmark are set in Fraunces, a soft serif with the
warmth of a pub sign and none of the cliché. UI text stays in San Francisco,
which is what the Human Interface Guidelines expect and what makes forms and
lists feel native. Loaded with expo-font at launch; the splash holds until it
is ready.

**Dots, not pins.** Map markers are small circles with a white ring, sized
and coloured by tier (gold you, green mates, grey unvisited). Default pins
cover neighbouring pubs and all look the same. Tapping a dot opens a preview
card at the bottom of the map, Apple Maps style, with the name, rating and a
Check in button. Native callouts were cut.

**No emoji in the interface.** SF Symbols throughout. Emoji render
differently everywhere, cannot be tinted, and read as placeholder.

**One dark surface.** The "This week" card is the only stout-coloured
element. Contrast is spent once, where it earns attention.

## Feed and challenges

**Cheers is a photo, and only on a photo.** The BeReal move: you answer a
photo with a photo. No thumbs, no hearts. The rule that a check-in must have a
photo to receive one lives in the INSERT policy on `cheers`, so no client can
get it wrong. Replies are plain text and allowed on anything. One cheers per
person per check-in; sending again replaces it.

**Social rows inherit check-in visibility.** Cheers and replies have no
friendship logic of their own. Their policies say "the check-in must be
visible to you", and the check-in policy already says friends only. One rule,
defined once, still.

**Challenges are community made, creator curated.** Anyone can create one and
anyone can join. Only the creator edits the pub list, because a list anyone
can edit is a list nobody trusts. Progress is derived from check-ins by
trigger; the app never writes `completed_at`. Removing a pub from a challenge
can un-complete it, which is correct. Badges are completed memberships,
nothing more, so there is no badge table to keep in sync.

**The Wetherspoons challenge is seeded from OSM brand tags.** 104 pubs at
import time. It exists so the tab is never empty on day one, and so the first
thing a new user sees is a ridiculous, obviously shareable goal.

**Overtakes are detected on the device.** The feed compares the leaderboard
with the last one it saw and shows "Tom overtook you" if someone moved past.
No history table, no server job, and it only fires for things that happened
while you were away, which is when it matters.

**Leaderboard columns, not leaderboards.** One function returns every metric
for every friend; the app sorts. The monthly column resets, so a newcomer can
win this month even if they will never catch up on boroughs.
