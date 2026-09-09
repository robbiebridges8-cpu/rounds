# Rounds

A pub check-in app for London. Log the pubs you go to, turn boroughs blue, see where your mates have been.

This file is the map of what exists as of 9 September 2026. The reasoning behind each choice is in [DECISIONS.md](DECISIONS.md); data licensing in [LICENSING.md](LICENSING.md); the privacy policy in [PRIVACY.md](PRIVACY.md).

## Running it

```
cp .env.example .env        # fill in the Supabase URL, publishable key, and (for seeding) the service role key
pnpm install
npx expo start              # scan the QR code with Expo Go on an iPhone
```

Useful scripts:

| Command | What it does |
|---|---|
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm lint` | ESLint via Expo |
| `pnpm seed:pubs --bbox london` | Pull every named pub in Greater London from OpenStreetMap into the database |
| `pnpm build:boroughs` | Regenerate the borough SVG paths from the ONS boundaries |
| `pnpm build:privacy` | Regenerate the in-app privacy text from PRIVACY.md |
| `CI=1 npx expo export --platform ios --dev` | Prove the bundle builds. `CI=1` is required or NativeWind's watcher keeps it alive |

## Stack

- **Expo SDK 57**, React Native 0.86, expo-router with typed routes, NativeWind 4 on Tailwind 3.4.
- **Supabase** in London (eu-west-2): Postgres with PostGIS, row level security on every table, storage buckets for photos, one edge function, pg_cron and pg_net.
- **Expo Go** is the test target. That rules out native tabs, expo-maps and push token registration until there is an Apple Developer membership and an EAS project. The code for all three is in place and dormant.
- **Git**: `main` on GitHub at robbiebridges8-cpu/rounds. Every migration is committed under `supabase/migrations/` and applied through the Supabase connection with identical SQL.

## The look: Signal

Chosen from three mocked directions, then refined from thirty-six per-screen ideas. White ground with colour doing the branding: **cobalt** is you, **coral** is your mates and the stars, **butter** and **mint** are furniture, **ink** is anything you press. Display face is Unbounded; UI text is the system font. Pills, 22 px cards, a hard ink shadow on the map search bar. Light by default, a navy dark mode behind a toggle in Settings.

Design canvases (view and export):

- Three directions: https://claude.ai/code/artifact/7161be80-1619-4065-b7ee-89db6a3d78fc
- Four themes across six screens: https://claude.ai/code/artifact/3d32ef80-ae1f-4820-ae8e-357bf8cd169b
- Thirty-six Signal ideas, six per screen: https://claude.ai/code/artifact/80bebce1-169f-40ef-8342-1845831697c3

The chosen set: search-first map, card feed, poster profile, hero pub page, camera-first check-in, lists-then-quests explore.

## Screens

All routes live under `src/app/`. Five tabs: Map, Feed, Explore, Mates, You.

| Route | What it is |
|---|---|
| `(auth)/welcome` | Four drifting colour shapes around the wordmark, one Get started button |
| `(auth)/sign-in` | Email and password, sign in or create an account. No emails are ever sent |
| `(auth)/reset` | Forgot password: a six-digit code by email, then a new password. No link to click |
| `(auth)/onboarding` | Username, display name, optional avatar |
| `(auth)/first-pubs` | Tick the pubs you already know, from nearby or search, so the map is never empty |
| `(tabs)/index` | Apple Maps. Search bar, chips for All / Been / Mates / Not yet, dot pins by tier, a butter card with photos and Check in when you tap one. At city zoom only pubs with any check-ins show |
| `(tabs)/feed` | The week card, a personal "you this week" line, an overtake card if a mate passed you, then posts as cards with cheers and reply |
| `(tabs)/challenges` | Explore: lists (taste, followable) above quests (finish lines with badges) |
| `(tabs)/friends` | Leaderboard with a metric picker (boroughs, pubs, this month, badges), requests, friends, invite |
| `(tabs)/you` | The poster: cobalt hero with the fill-in map and your borough count, stats strip, Overview / Pubs / Diary tabs, share and invite |
| `pub/[id]` | Hero photo with the name over it, rating and who's-been pills, Check in, add to a list, tag votes, lists it is on, visits |
| `checkin/[pubId]` | Camera first. Take or pick a photo, or skip, then stars, who was here, a note, laid over the photo |
| `post/[id]` | One check-in: cheers gallery, replies, a reply box, delete if it is yours, "add it to my map" if you were tagged |
| `user/[id]` | A friend's profile, same poster layout |
| `nearby` | Pubs within 1.5 km by walking distance |
| `search` | Full-screen name search, with "add a missing pub" when nothing matches |
| `add-pub` | Add a pub the import missed, placed at your location |
| `list/[id]`, `list/new`, `list/[id]/add` | A list, creating one, adding pubs to it |
| `challenge/[id]`, `challenge/new`, `challenge/[id]/add` | A quest, creating one, adding pubs to it |
| `inbox` | Notifications: cheers, replies, tags, the Sunday digest |
| `invite/[code]` | Deep link target. Accepts the invite if signed in, otherwise remembers it through sign-up |
| `settings` | Dark mode, privacy policy, admin numbers if you are an admin, sign out, delete account |
| `privacy` | The policy, rendered from PRIVACY.md |
| `admin` | Actives, weekly check-ins, boroughs and top pubs for the last 30 days. Admins only |

## Features

**Check-ins.** A pub, a time, an optional rating from 0.5 to 5 in half steps, a note, up to three photos, who was there. Location is read once at check-in; within 150 m it is "verified", further away it still counts and says how far. A device-generated client id makes retries safe.

**Tagging.** Mates on Rounds get a notification and a one-tap "add it to my map". People not on Rounds get a name on the post and a text from your phone with your invite link.

**Cheers.** A photo sent back on a check-in that has a photo. One per person, camera-first. Enforced in the database, not the app.

**Replies.** Text, on any check-in.

**Friends.** Requests by username, or an eight-character invite code that creates an accepted friendship on the spot. Invite links carry the code. Everything personal is visible only to accepted friends; pub aggregates are visible to everyone.

**Amenities.** Sixteen public tags in two groups, It's got and Good to know, confirmed by tapping a chip. Seeded from OpenStreetMap where it knows (a chip marked "map"), confirmed at check-in or on the pub page, long press for "not any more". Ratings, notes and photos stay friends-only.

**Map legend.** Blue you have been, coral a mate has, grey nobody you know. The same three colours run through the whole app.

**Boroughs.** The 33 London boroughs, drawn from ONS boundaries, fill in as you check in. The profile poster, the share card and the feed's borough snapshots all use the same SVG paths.

**Leaderboard.** You and your friends, by boroughs, pubs, this month's check-ins, or badges. Monthly resets so newcomers can win.

**Digests.** A week card on the feed, a personal weekly line, an on-device overtake card, a monthly recap you can share, and a Sunday notification.

**Quests.** Anyone creates one with a name, icon and colour, and curates its pubs. Anyone joins. Completion is derived from check-ins by trigger and earns a badge on the profile. Seeded with "Every Wetherspoons in London" (104 pubs) and "London classics" (37).

**Lists.** Anyone publishes a list of pubs with a line on each. Anyone follows. A pub page says how many lists it is on.

**Share cards.** A 1080 px square of your borough map, or last month's recap, rendered off-screen and handed to the share sheet with your invite code on it.

**Inbox and push.** Every cheers, reply, tag and digest writes a notification row. A database trigger posts the row id to the `send-push` edge function, which looks up the person's Expo tokens and sends. Tokens register once there is an EAS project id; until then the inbox is the whole feature.

**Account deletion.** One RPC deletes the auth user and everything cascades. Required by Apple.

## Database

Fifteen migrations. The schema in one paragraph: `profiles` and `friendships` (one row per pair, `are_friends()` is the single visibility rule); `pubs_osm` (the OpenStreetMap import, ODbL, never edited) and `pubs` (our record, with a PostGIS geography column); `checkins`, `checkin_photos`, `checkin_tags`, `checkin_guests`; `cheers` and `checkin_comments`; `pub_tags`, `pub_tag_votes` and `pub_tag_stats`; `pub_stats` (public aggregates kept by trigger); `invite_codes`; `challenges`, `challenge_pubs`, `challenge_members`; `lists`, `list_pubs`, `list_follows`; `notifications` and `push_tokens`; `pub_corrections` and `reports`; `admins` and `app_config`.

Query functions the app calls: `map_pubs`, `nearby_pubs`, `user_pub_map`, `user_stats`, `friends_leaderboard`, `weekly_summary`, `my_week`, `my_month`, `challenge_list`, `challenge_pub_status`, `user_badges`, `list_index`, `list_pub_status`, `pub_lists`, `accept_invite`, `request_friendship`, `admin_stats`, `delete_my_account`.

3,593 pubs are loaded, 3,143 of them inside a borough.

## Not done

- No Apple Developer membership yet, so no TestFlight, no native tabs, no expo-maps, and push delivery is wired but dormant.
- Nobody but the author has used it. The first evening of real use will reorder the roadmap.
- No offline queue for check-ins, though the client id makes one safe to add.
- Pub claims for landlords and brands were built and removed; the design is in git history at commit 92f7ba2.
- The contact email in PRIVACY.md is a placeholder.
