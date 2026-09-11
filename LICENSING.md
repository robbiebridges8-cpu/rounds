# Licensing

## OpenStreetMap (ODbL 1.0)

Our pub seed comes from OpenStreetMap via the Overpass API. OSM data is licensed
under the [Open Database Licence 1.0](https://opendatacommons.org/licenses/odbl/1-0/),
which is a share-alike licence: derivative databases must be released under the
same terms.

We keep OSM data quarantined so that our users' contributions never become a
derivative of it.

**`pubs_osm`** is the OSM import. It holds `osm_type`, `osm_id`, name, position,
address fields, opening hours, website and the raw tag blob, exactly as OSM
supplies them. It is written only by `scripts/seed-pubs.ts` running with the
service role. RLS gives clients read access and nothing else. Nothing a user
types ever lands in this table.

**`pubs`** is our own record. It has our own uuid primary key, and a *nullable*
reference back to an OSM row. A pub we created ourselves (someone added a
missing one in the app) has no OSM reference at all. Ratings, tags, photos,
check-ins and corrections all reference `pubs.id`, never an OSM id.

The practical consequence: our user-generated database is a separate work that
happens to be *linked* to OSM, not a derivative of it. If we ever have to prove
that, the schema is the argument.

### Attribution

We must credit OSM wherever its data is shown. The map screen carries
"© OpenStreetMap contributors" and it stays there. Do not remove it.

## Borough boundaries (Open Government Licence v3)

Borough polygons come from the ONS Open Geography Portal, "Local Authority
Districts (December 2024) Boundaries UK BGC", filtered to the `E09` codes that
identify the London boroughs. Licensed under the
[Open Government Licence v3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/),
which requires attribution:

> Contains OS data © Crown copyright and database right 2024
> Contains National Statistics data © Crown copyright and database right 2024

The downloaded GeoJSON is cached at `scripts/data/london-boroughs.geojson` and
is gitignored: it is a build input, not source.

## Pub front photos (Wikimedia Commons)

`scripts/seed-photos.ts` looks for a photograph of the front of each pub on
Wikimedia Commons, which also mirrors the Geograph archive. It takes only
files marked CC BY, CC BY-SA, CC0 or public domain; anything with a
non-commercial or no-derivatives clause is skipped in code. A resized copy
(1280 px wide) is stored in the public `pub-photos` bucket, and the row in
`pub_photos` keeps the author, the licence name and URL, and a link to the
file page.

### Attribution

The pub page shows "Photo: author, licence, via Wikimedia Commons" under the
hero whenever the seeded photo is the one on screen, and tapping it opens the
file page. That satisfies BY. Resizing is the only change we make, and the
copy stays under the original licence, which satisfies SA. If a seeded photo
is ever used on a share card or anywhere off the pub page, the credit has to
go with it.

A photo taken by a user in the app replaces the seeded one on screen as soon
as there is one; the seeded row stays as the fallback.

## Google

We do not use Google Places. Their terms forbid caching most of their content,
which is incompatible with how this app stores pub records. If we ever add it,
it will be fetched on demand and never written to our database.
