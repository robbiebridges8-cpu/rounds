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

## Redesign: Beli, Letterboxd, Strava

**Rankings, not stars.** Beli's model. After a check-in you say loved,
decent or not for me, then answer a few "which do you prefer?" questions (a
binary search through your pubs with the same sentiment) and the pub takes
a position on your list. The score out of ten is derived from position within
its bucket: loved spans 10 to 7, decent 6.9 to 4, not for me 3.9 to 0.5. Your
first loved pub is a 10 until something beats it. All of this is in
`rank_pub` and `rescore_rankings`; the app never writes positions.
`checkins.score` and `checkins.rating` are mirrors kept by the same function,
so the feed needs no join and `pub_stats` keeps working. The pub page shows
the 1-5 average doubled as "out of 10", which is honest enough until enough
people have ranked for a true score average to mean something.

**Dark first.** Letterboxd's confidence. The map, the photos and the gold
boroughs all read better on stout than on paper, and pubs happen at night.
Token names stayed semantic (`canvas`, `surface`, `raised`, `ink`), so a light
theme later is a values change, not a rewrite.

**The borough snapshot.** Strava puts a map on every activity card. Ours is
the silhouette of the pub's borough with a gold dot, drawn from the same SVG
paths as the fill-in map. It shows when a check-in has no photo, so no card
is ever just text.

**Profile tabs.** Overview, Ranked, Diary. Four favourites (your top four
ranked pubs, photo tiles where you have one), the fill-in map, an eight-week
bar chart, the trophy case. The diary groups check-ins by month with the day
in a box. All three apps agree that a profile is a record, not a form.

## Redesign, second attempt

**The first redesign was reverted.** Dark-first plus a serif plus a ranking
system still read as a template. Rankings are gone (migration 0010): people
talk about pubs in stars. Ratings are 0.5 to 5 in half steps, Letterboxd
style, stored as numeric with a check constraint so the halves are the only
fractions.

**Light by default, dark by choice.** A ThemeProvider swaps the palette and
remounts the tree; class names go through CSS variables (NativeWind `vars`)
so every token works in both. The toggle lives on the You tab and is
remembered on the device. Opacity modifiers on themed colours are banned
because variables and modifiers do not mix.

**The look: London signage, three references.** Chalk-white paper and navy
ink rather than black; Central line red for stars, active states and the
section rules; Circle line yellow for your boroughs; District green for your
mates; Jubilee grey for the rest. Bricolage Grotesque for display. Ink pill
buttons as Luma and Patreon do them; Patreon's soft filled inputs; Luma's
orbit on the welcome screen; Resy's map with a search bar, filter chips and
a photo card with a red star rating rising from the bottom.

## Signal

**Chosen from three mocked directions on a canvas.** Night Bus (dark, lime,
condensed capitals), Sunday Papers (paper, serif, cherry) and Signal (white,
cobalt, coral, butter, mint). Robbie picked Signal. Designing in code and
reviewing in Expo Go had produced two rounds of safe averages; mockups he
could react to settled it in one.

**Colour is the brand.** Cobalt is you (boroughs, the week card, the top
band on your own check-ins). Coral is your mates and the stars. Butter and
mint are furniture: stat tiles, chips, the map card. Ink is anything you
press. Unbounded for display, system font for everything else. Pills and
22 px cards throughout; the map search bar has a hard ink offset shadow.
Tabs are Map, Feed, Quests, Mates, You. Light by default, dark by toggle.

## Growth, second round

**Tagging is the viral loop.** A check-in can name the mates who were there
(on Rounds: a tag they get notified about, with a one-tap "add it to my map")
and the ones who are not (a name, and a text sent from your own phone with
your invite link). No contact upload, no server-side SMS, nothing to consent
to beyond what the person typing already knows.

**Notifications are rows first, pushes second.** Every cheers, reply, tag
and digest writes a row the inbox reads. A trigger then posts the row id to
the send-push edge function through pg_net, which looks up the person's
Expo tokens. Token registration needs an Expo project id, which arrives
with the Apple account and EAS; until then the inbox is the whole feature
and the push path is dormant but wired. The Sunday digest is a pg_cron job
that writes digest rows for everyone whose circle did anything.

**Pub claims were built and taken out again the same day.** Migration
0012 drops them. Too early: nobody to sell to and nobody to review claims.
The design stays in git history for when there is an audience.

**No seeded copy.** Thirty-seven classic pubs briefly had a one-line blurb
written from memory. Robbie called them what they were and they came out
(migration 0013). The London classics quest stays: a list is useful, a
guidebook voice is not.

**Admin numbers live in one function.** `admin_stats` refuses anyone not on
the admins table and returns the actives, weekly check-ins, boroughs and top
pubs an advertiser or a buyer asks for first. Reachable from Settings.

**Account deletion is one RPC.** `delete_my_account` deletes the auth user;
every table cascades. Apple requires it; the privacy policy points at it.

## Lists

**Lists are taste; quests are lists with a finish line.** Both live on the
Explore tab. A list has a title, an optional description, pubs in order and
a one-line note per pub, written by the creator alone. Anyone follows a
list; a pub page says "On 3 lists". Nothing to complete, nothing to earn:
the value is that someone who knows put their name to it. Migration 0015.

## Signal, chosen per screen

Thirty-six Signal ideas were mocked, six per screen, and Robbie picked:
search-first map, card feed, poster profile, hero pub page, camera-first
check-in, lists-then-quests explore. Three were already built.

**Poster profile.** A cobalt hero with the fill-in map edge to edge and
"Robbie's London" on it, the borough count as a huge butter numeral. The
header is transparent with white controls so the poster starts at the top.

**Hero pub page.** The first photo anyone took here is the page, full
bleed, name and two pills over a dark gradient; a cobalt silhouette of the
borough stands in when there is no photo yet. "List" adds it to one of
your lists.

**Camera-first check-in.** A full-screen modal that opens on the
viewfinder. The photo is the check-in; stars, who was there and a note are
a caption laid over it. Library and skip are both one tap, because
basements and battery exist. This guarantees the photos that cheers and
the feed run on.

## Opinions, rebuilt

**Tags are confirmations.** The thumbs up and down on a list of tags was
the worst screen in the app, and "Cash only" with a thumbs up meant two
things at once. Now a tag is a chip you tap because it is true. The count
is how many people have. There is no vote against; a long press offers
"not any more" for things that have changed, and a tag with more of those
than confirmations fades and strikes through. Two groups, "It's got" and
"Good to know", so the list reads as description rather than a survey.
Offered at check-in as an optional row with the already-confirmed ones
first, so agreeing is one tap.

**Stars stay.** Verdict words were considered and rejected: stars are the
unit everyone understands. What changed is the pub page: a distribution
of everyone's ratings, your mates' faces on the line where they rated it,
and their notes as quotes.

**Cheers, Like, Reply, in that order.** Three responses on every post.
Cheers is the photo back and the big butter pill; Like is a nod; Reply
opens a box under the post with no navigation. Replies can be liked too.
The order and the sizes are deliberate: cheers is the thing we want.

## Amenities, the final list

Sixteen, cut from twenty-four with Robbie: Garden, Roof terrace, Riverside,
Cocktails, Good Guinness, Food, Sunday roast, Shows sport, Pool table,
Darts, Quiz, Live music, Happy hour; then Dog friendly, Cash only, Step-free.
Everything cut was either rare, a complaint dressed as a fact, or a
preference rather than a property (real ale, craft beer, cheap pints).

**Seeded from the map.** Where OpenStreetMap tags a garden, food, dogs, live
music, sport, step-free access or cocktails, the pub starts with that chip
marked "map" (a `osm` flag on `pub_tag_stats`, which the vote trigger leaves
alone). It counts as one when ordering and fades if enough people say "not
any more". The three layers are now explicit: the record and the amenities
are public, reviews are friends-only, and a generated public summary of the
reviews is the planned fourth, once there is volume.

## Pictures: fill, then remove the stand-ins

Every pub without a photo showed a borough silhouette in cobalt, and it
looked like what it was. Two moves on 11 September.

**Fill from Wikimedia Commons.** Commons mirrors the Geograph archive, which
has photographed most pubs in Britain, and it needs no API key. The seed
script searches by coordinates within 70 m and matches on the pub's name in
the file title (trusted) or description (only if the camera was within 120
m), with a text search fallback held to the same distance rule. Plaques,
signs, interiors and details are marked down. Only CC BY, CC BY-SA, CC0 and
public domain files are taken; a 1280 px copy lives in our bucket so the app
never hotlinks Wikimedia. The credit sits under the hero and opens the file
page. Geograph's own API was the alternative; it needs a key and adds
nothing Commons lacks.

**Remove every placeholder.** Pub page, map card, feed card and favourite
tiles no longer draw anything that pretends to be a picture. A pub with no
photo at all gets a short cobalt masthead with the name and pills. The feed
card without a photo is a text card. The map card without a photo has no
image strip. Honest beats decorative.

**Order on the pub page.** Check-in photos first, newest first, then the
seeded front. A real photo from someone you know beats an archive shot, and
the archive shot beats nothing.

## Feedback goes in the app, and the admin reads it in the app

TestFlight has its own feedback channel, but it stops at the App Store
Connect dashboard and only covers testers. From 11 September, Settings has
"Tell us": bug, idea or other, a message, an optional screenshot. The phone
model, iOS version, app version and the screen the sender came from are
attached without asking, because nobody types those and every bug report
needs them. It lands in a `feedback` table.

The admin inbox is a screen, not a dashboard. Three tabs: feedback, pub
fixes (the `pub_corrections` table, which the pub page long-press has
written to since day one), and reports. A count on each. Tap opens the
thing, long press sets a status. Admin access is one function, `is_admin()`,
used by every admin policy so there is one place to get it right. Actions on
the reported thing itself (hide, warn) are backlog until there is a case.

## Pins are pints

The dots were tried at three sizes and two greys and never looked like
anything. The pint glass experiment behind Settings became the only pin on
11 September: a glass full of gold beer with a white head where you have
been, the same glass rimmed coral where a mate has, and an empty grey glass
where nobody you know has. The beer is one fixed gold on every theme, because
beer is that colour. The toggle and the dot are gone, as is the prefs store
that only existed for the toggle.

## The name: Pub'd

Rounds was taken on the App Store. Pub'd won over Pubd because it reads as a
word, "we got pub'd", and Pubd searches like a typo of PUBG. Apple allows the
apostrophe in the store name and under the icon. Anywhere an apostrophe
cannot go, a domain, a handle, the URL scheme, it is `pubd`. The name lives
in one constant, `APP_NAME`, and the wordmark lowercases it. The repo, the
EAS project slug and the bundle identifier stay `rounds`, because renaming
those buys nothing and the bundle id cannot change anyway.

## Quests are lists now, and a crawl is a list with an order

Two objects that were nearly the same thing. On 12 September they became one:
a list shows your progress whether or not you saved it, and finishing a list
you have saved earns its badge, which is all a quest ever was. The two seeded
quests moved over with everyone's progress. A crawl is a list whose pubs are
numbered stops, with the walking time between them and a Share button. No
going or maybe, no arrivals, no time window, no voting: the route and the
link. The quest tables, screens and the icon picker are gone.

## A tag is a question

Until 13 September a tag put a post in front of the tagged person and offered
"add it to my map", which made a second, empty post. Now the tag waits for a
yes. Yes accepts it, creates a shadow check-in that points at the original
(so every count, map and list works with no other change, and it never shows
as a post), and marks the tag surfaced so the original post appears in the
tagged person's friends' feeds too. If they already had their own check-in at
that pub within twelve hours, the tag is accepted but not surfaced, because
their own post already covers it. No deletes the tag and the shadow with it.
Visibility runs through one security-definer function so the check-ins policy
can ask about tags without recursing into their own policy.
