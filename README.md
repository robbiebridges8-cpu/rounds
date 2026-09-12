# Pub'd

A pub check-in app for London. Called Rounds until 12 September 2026; the repo, the EAS project, the bundle id and the URL scheme keep `rounds`. Log the pubs you go to, turn boroughs blue, see where your mates have been.

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
| `pnpm seed:photos` | Find a front photo for every pub on Wikimedia Commons and store a copy with its credit. `--dry` to preview, `--limit N` for a taste |
| `pnpm build:boroughs` | Regenerate the borough SVG paths from the ONS boundaries |
| `pnpm build:privacy` | Regenerate the in-app privacy text from PRIVACY.md |
| `CI=1 npx expo export --platform ios --dev` | Prove the bundle builds. `CI=1` is required or NativeWind's watcher keeps it alive |
| `pnpm ship` | Push a JavaScript-only change to TestFlight installs. Uses the last commit message. Testers get it on next launch |
| `pnpm release` | New native build in the cloud, submitted to TestFlight when done. Needed after adding a native library, editing app.json, or an SDK upgrade |

## Stack

- **Expo SDK 57**, React Native 0.86, expo-router with typed routes, NativeWind 4 on Tailwind 3.4.
- **Supabase** in London (eu-west-2): Postgres with PostGIS, row level security on every table, storage buckets for photos, one edge function, pg_cron and pg_net.
- **EAS** project `@robbiebridges/rounds` (id in app.json). Builds go to TestFlight through `eas build` and `eas submit`; JavaScript changes go out with `eas update` on the `production` channel, runtime version follows the app version. Push is live end to end: the Apple push key is on EAS and a test notification was delivered on 12 September. Native tabs and expo-maps are still one-file changes waiting for a dev build.
- **Git**: `main` on GitHub at robbiebridges8-cpu/rounds. Every migration is committed under `supabase/migrations/` and applied through the Supabase connection with identical SQL.

## The look: Signal

Chosen from three mocked directions, then refined from thirty-six per-screen ideas. White ground with colour doing the branding: **cobalt** is you, **coral** is your mates and the stars, **butter** and **mint** are furniture, **ink** is anything you press. Display face is Unbounded; UI text is the system font. Pills, 22 px cards, a hard ink shadow on the map search bar. Light only for now: the navy dark mode and the Pub theme are built but paused until they have had a proper pass, see BACKLOG 22.

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
| `(auth)/get-a-mate` | The last onboarding step: send one person your invite link, or Later |
| `(tabs)/index` | Apple Maps. Search bar, chips for All / Been / Mates / Not yet, a pint glass per pub (full of beer where you have been, coral-rimmed where a mate has, empty where nobody you know has), a butter card with photos and Check in when you tap one. At city zoom only pubs with any check-ins show |
| `(tabs)/feed` | The week card, a personal "you this week" line, an overtake card if a mate passed you, then posts as cards with cheers and reply |
| `(tabs)/challenges` | Explore: lists. Yours first (made or saved), then everyone's. Every card shows your progress; crawls carry a Crawl label |
| `(tabs)/friends` | Leaderboard with a metric picker (boroughs, pubs, this month, badges), requests, friends, invite |
| `(tabs)/you` | The poster: the fill-in map on the white ground, cobalt where you have been, your borough count, stats strip, Overview / Pubs / Diary tabs, share and invite |
| `pub/[id]` | Hero photo with the name over it, rating and who's-been pills, Check in, add to a list, tag votes, lists it is on, visits |
| `cheers/[checkinId]` | Cheers camera: front-facing by default, flip, library, then Send cheers over the photo. Selfies save as the preview shows them |
| `checkin/[pubId]` | Camera first. Take or pick a photo, or skip, then stars, who was here, a note, laid over the photo |
| `post/[id]` | One check-in: cheers gallery, replies, a reply box, edit and delete if it is yours, "add it to my map" if you were tagged |
| `checkin/edit/[id]` | A sheet to change the stars, the note, who was there, or when it was, on your own check-in, or delete it. Setting the date is how you log last Saturday |
| `user/[id]` | A friend's profile, same poster layout |
| `nearby` | Pubs within 1.5 km by walking distance |
| `search` | Full-screen name search, with "add a missing pub" when nothing matches |
| `add-pub` | Add a pub the import missed, placed at your location |
| `list/[id]`, `list/new`, `list/[id]/add` | A list or a crawl: progress, Save (which is what earns the badge on finishing), Share, Show on map, Add pubs. A crawl numbers its stops and shows the walk between them. Creating one opens Add pubs straight away |
| `inbox` | Notifications: cheers, replies, tags, the Sunday digest |
| `invite/[code]` | Deep link target. Accepts the invite if signed in, otherwise remembers it through sign-up |
| `edit-profile` | Change your display name, username or photo |
| `settings` | Edit profile, Tell us (feedback), privacy policy, admin inbox and numbers if you are an admin, sign out, delete account |
| `feedback` | A sheet: bug, idea or something else, a message, an optional screenshot. Device, iOS version and the screen you came from go along automatically |
| `admin/inbox` | Feedback, pub corrections and reports in one place with a pending count. Tap to open, long press to set a status. Admins only |
| `privacy` | The policy, rendered from PRIVACY.md |
| `admin/index` | Actives, weekly check-ins, boroughs and top pubs for the last 30 days. Admins only |

## Features

**Check-ins.** A pub, a time, an optional rating from 0.5 to 5 in half steps, a note, up to three photos, who was there. Location is read once at check-in; within 150 m it is marked verified in the database, further away it still counts. Distance is stored but not shown. A device-generated client id makes retries safe.

**Tagging.** Mates on Rounds get a notification and a one-tap "add it to my map". People not on Rounds get a name on the post and a text from your phone with your invite link.

**Photos.** Tap any photo, on a post, a pub page or a cheers gallery, and it opens full screen with swipe and pinch.

**Cheers.** A photo sent back on a check-in that has a photo. One per person, camera-first. Enforced in the database, not the app.

**Replies.** Text, on any check-in.

**Friends.** Requests by username, or an eight-character invite code that creates an accepted friendship on the spot. Invite links carry the code. Everything personal is visible only to accepted friends; pub aggregates are visible to everyone.

**Front photos.** Most pubs have a photo of the outside, found on Wikimedia Commons by location and name and credited under the hero. That photo is the hero; check-in photos are visits and sit in a strip below it and on the visits themselves. A pub with no front photo shows a short cobalt masthead, not a stand-in picture.

**Amenities.** Sixteen public tags in two groups, It's got and Good to know, confirmed by tapping a chip. Seeded from OpenStreetMap where it knows (a chip marked "map"), confirmed at check-in or on the pub page, long press for "not any more". Ratings, notes and photos stay friends-only.

**Map legend.** Every pub is a pint glass. Full of gold beer with a head where you have been, full with a coral rim where a mate has, an empty grey glass where nobody you know has. Blue for you and coral for mates still run through the rest of the app.

**Boroughs.** The 33 London boroughs, drawn from ONS boundaries, fill in as you check in. The profile poster, the share card and the feed's borough snapshots all use the same SVG paths.

**Leaderboard.** You and your friends, by boroughs, pubs, this month's check-ins, or badges. Monthly resets so newcomers can win.

**Digests.** A week card on the feed, a personal weekly line, an on-device overtake card, a monthly recap you can share, and a Sunday notification.

**Lists.** One object for taste and for goals. Anyone makes one, adds pubs, and a line on each. Every list shows how many of its pubs you have been to. Save a list and finishing it earns its badge, derived from check-ins by trigger. A crawl is a list with an order: numbered stops, the walk between them, and a Share button that sends the link. Seeded with "Every Wetherspoons in London" (104 pubs) and "London classics" (37), which used to be quests.

**Share cards.** A 1080 px square of your borough map, or last month's recap, rendered off-screen and handed to the share sheet with your invite code on it.

**Inbox and push.** Every cheers, reply, tag and digest writes a notification row. A database trigger posts the row id to the `send-push` edge function, which looks up the person's Expo tokens and sends. Tokens register once there is an EAS project id; until then the inbox is the whole feature.

**Feedback.** A small speech-bubble button sits in the bottom-left corner of every signed-in screen while the app is in testing (one flag in `feedback-fab.tsx` turns it off), and Settings has Tell us. Every submission is a row in `feedback` with the sender, kind, message, screenshot, device and screen. Admins see them in the in-app inbox alongside pub corrections and reports, and can mark each one seen or done. `is_admin()` is the single check behind the admin policies.

**Account deletion.** One RPC deletes the auth user and everything cascades. Required by Apple.

## Database

Twenty-two migrations. The schema in one paragraph: `profiles` and `friendships` (one row per pair, `are_friends()` is the single visibility rule); `pubs_osm` (the OpenStreetMap import, ODbL, never edited) and `pubs` (our record, with a PostGIS geography column); `checkins`, `checkin_photos`, `checkin_tags`, `checkin_guests`; `cheers` and `checkin_comments`; `pub_tags`, `pub_tag_votes` and `pub_tag_stats`; `pub_photos` (one seeded front photo per pub, with its credit); `pub_stats` (public aggregates kept by trigger); `invite_codes`; `lists` (with kind, list or crawl), `list_pubs`, `list_follows`, `list_completions`; `notifications` and `push_tokens`; `pub_corrections` and `reports`; `admins` and `app_config`; `feedback`.

Query functions the app calls: `map_pubs`, `nearby_pubs`, `user_pub_map`, `user_stats`, `friends_leaderboard`, `weekly_summary`, `my_week`, `my_month`, `user_badges`, `list_index`, `list_pub_status`, `pub_lists`, `accept_invite`, `request_friendship`, `admin_stats`, `delete_my_account`.

3,593 pubs are loaded, 3,143 of them inside a borough. 2,886 have a front photo from Wikimedia Commons, seeded 11 September 2026.

## Not done

- On TestFlight since 12 September as Pub'd. Native tabs and expo-maps are still one-file changes waiting for a dev build.
- Nobody but the author has used it. The first evening of real use will reorder the roadmap.
- No offline queue for check-ins, though the client id makes one safe to add.
- Pub claims for landlords and brands were built and removed; the design is in git history at commit 92f7ba2.
- The contact email in PRIVACY.md is a placeholder.
