# Backlog

Ordered by priority. Priority is a judgement from urgency (does waiting cost us), value (does it move users, retention or the pitch) and effort. Anything vetoed is at the bottom so it does not creep back.

Scale: urgency and value are High / Medium / Low; effort is Small (a day or less), Medium (a few days), Large (a week or more).

Last updated 11 September 2026. See README.md for what exists.

## P0. This week. Everything else is guesswork until these are done.

| # | Item | Urgency | Value | Effort | Why now |
|---|---|---|---|---|---|
| 1 | Buy the Apple Developer membership, set up EAS, ship a TestFlight build | High | High | Small | Unblocks push, native tabs, expo-maps, and real users. Everything below assumes it |
| 2 | Ten mates on TestFlight for one weekend, watch what they do | High | High | Small | The first evening of real use reorders this whole list |
| 3 | Instrumentation: screen views, check-in funnel, invite sends and accepts | High | High | Small | Without it the admin numbers page is the only signal, and it cannot tell you where people drop |
| 4 | Crash and error reporting (Sentry via the Expo integration) | High | Medium | Small | Ten testers will hit things you will never hear about otherwise |
| 5 | Fill the placeholder contact email in PRIVACY.md and re-run `pnpm build:privacy` | High | Low | Small | Apple reads it |

## P1. Next two weeks. The growth loop and the reasons to come back.

| # | Item | Urgency | Value | Effort | Notes |
|---|---|---|---|---|---|
| 6 | Register for push once the EAS project id exists, then turn on the four notifications: cheers, reply, tag, Sunday digest | High | High | Small | The pipeline is built; this is the last mile |
| 7 | Friday 6pm nudge: "Where are you tonight?" with the nearest pub one tap away | Medium | High | Small | One well-timed prompt a week is the closest thing to BeReal's mechanic |
| 8 | Onboarding ends with mates, not pubs: ask for three phone numbers and text them the invite | Medium | High | Medium | Zero friends is the empty state that kills social apps. Skippable but asked |
| 9 | Share card carries a QR code that opens the app or the App Store | Medium | High | Small | Every story post becomes a door once the store listing exists |
| 10 | Pub crawls: a route, a night, a group; who made it to which stop; a recap card | Medium | High | Large | One crawl brings in a whole group at once. The biggest growth mechanic on the list |
| 11 | Live layer on the map: mates' avatars on the pub they checked into in the last three hours, a strip of who is out | Medium | High | Medium | A reason to open the app at 8pm rather than the morning after |
| 12 | Prompt for a photo at check-in when a pub has no user photo yet | Medium | Medium | Small | Front photos from Commons cover most pubs now; this fills the rest and freshens the ones that are dated |
| 13 | Boroughs as a finishable game: progress bar everyone sees, "London Complete" badge, a real reward | Medium | Medium | Medium | Thirty-three is finishable, and the race to finish first is a year of engagement |

## P2. Next month. Product depth and the pitch.

| # | Item | Urgency | Value | Effort | Notes |
|---|---|---|---|---|---|
| 14 | Public leaderboard by area: busiest pubs per borough this month, aggregates only | Medium | High | Medium | Content, press, and the first data product a brewer would pay for |
| 15 | Pub pulse: busiest nights and hours per pub from check-in times, once there is enough data | Low | Medium | Medium | Google's popular times, from people you know. Useful even when not checking in |
| 16 | Moderation tools: act on reports from the inbox (hide a post, warn a user), not just set a status | Low | Medium | Small | The inbox reads `reports` and `pub_corrections` since 11 September; actions on the target are what is left |
| 17 | Offline check-in queue: save locally, retry on signal | Medium | Medium | Medium | The client id already makes retries safe. Pub wifi is the reason |
| 18 | Native tabs and expo-maps once on a dev build | Low | Medium | Small | Both are one-file changes noted in DECISIONS.md. Liquid Glass tab bar on iOS 26 |
| 19 | Rate limiting on invite acceptance, cheers uploads and list creation | Medium | Low | Small | Cheap insurance before strangers arrive |
| 20 | Admin: approve or reject from the numbers page, pending reports count, per-borough growth over time | Low | Medium | Medium | The page an advertiser or buyer sees. Extend as the pitch firms up |
| 21 | Accessibility pass: VoiceOver labels on every icon button, Dynamic Type on the display face, contrast on butter text | Low | Medium | Small | Apple review notices; users with large text notice sooner |
| 22 | Dark mode audit: every screen, every card, the share card stays light on purpose | Medium | Low | Small | Paused 12 September: the toggle is hidden and saved dark settings are ignored, because it looked wrong. Do the pass with Robbie looking at each screen, then put the toggle back |

## P2b. User-contributed data. Planned 9 September, parked until there are users.

One optional structured question at check-in, rotating, never all at once. Show people the impact of what they add. Amenities already work this way.

| # | Item | Urgency | Value | Effort | Notes |
|---|---|---|---|---|---|
| 31 | Pint price at check-in: drink type and price, public aggregate per pub | Low | High | Medium | A London pint price index by borough and month. Press, a brewer's dashboard, nobody else has it at street level |
| 32 | Busyness at check-in: Quiet / Steady / Rammed, aggregated by day and hour | Low | High | Small | Popular times from people inside. Feeds the live layer |
| 33 | What you drank: drink and brand, recent ones suggested first | Low | Medium | Medium | Friends see it on the post; publicly "what people drink here"; personally, share-card stats |
| 34 | Best for: After work, Big group, Date, Match day, Sunday, Solo pint, Last one before the train | Low | Medium | Small | Confirmable like amenities. Makes search occasion-aware |
| 35 | Front photo from users: replace or add the outside shot for pubs Commons does not have | Low | Medium | Small | Seeded from Commons on 11 September; the user path is what is left |
| 36 | Still open? prompt for pubs with no check-in in a year, asked of the next person nearby | Low | Medium | Small | Keeps the record honest without a team |
| 37 | Open now? yes/no when standing outside, quietly correcting imported hours | Low | Low | Small | |
| 38 | Corrections with upvotes: three people saying the same fix applies it | Low | Medium | Small | Reports table exists |
| 39 | Your local: one pub declared on your profile; the pub shows how many call it theirs | Low | Medium | Small | A badge pubs will want |
| 40 | Your drink: one favourite on your profile | Low | Low | Small | |
| 41 | Impact line on the profile: facts confirmed, pints priced, people who used them | Low | Medium | Small | The thing that keeps people contributing |

## P3. Later. Bigger bets and things that need an audience first.

| # | Item | Urgency | Value | Effort | Notes |
|---|---|---|---|---|---|
| 24 | Claimable pub pages for landlords and brands, with hours, an event, an offer | Low | High later | Medium | Built and removed at commit 92f7ba2. Bring back when there is someone to sell to |
| 25 | Advertising slots: a sponsored pub in Nearby, a brand on the week card | Low | High later | Medium | Only once there are actives to sell. Aggregates only, never individuals |
| 26 | Other cities: Manchester, Edinburgh, Bristol, Dublin. Seed script and borough builder already take a bounding box | Low | High later | Large | Makes the exit story bigger than one city. Not before London works |
| 27 | Cheers on posts without a photo, as a plain reaction | Low | Low | Small | Deliberately not done: the photo rule is the point. Revisit if testers ask |
| 28 | Monthly recap as an automatic push and a card in the feed | Low | Medium | Small | `my_month` exists; the share card exists; wire them to the first of the month |
| 29 | Lists you can co-author, and reordering pubs on a list by drag | Low | Medium | Medium | Wait for lists to be used |
| 30 | Automated tests: RLS policy tests in `supabase/tests`, a smoke test of the check-in flow | Low | Medium | Medium | The folder exists and is empty |

## Vetoed. Not doing these.

- Round tracking, whose round it is, anything built on the name. Decided 9 September.
- One-tap check-in that skips rating, photo and tagging. Those are the point of the app.
- Seeded editorial copy about pubs. Came out the same day it went in.
- Beli-style comparative ranking instead of stars. Built, reverted, migration 0010.
