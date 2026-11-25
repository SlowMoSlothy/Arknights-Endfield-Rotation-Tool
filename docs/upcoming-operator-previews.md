# Upcoming operator previews

The catalog includes all ten figures shown across the nine official *Ensemble: SIGNAL PRELINK* teaser cards, revealed on November 21, 2026. Warfarin and M3 are named; eight figures keep neutral `Unrevealed Operator` labels. Card 3 shows both M3 in front and a second unnamed figure behind her.

Sources:

- [Official operator teaser](https://www.youtube.com/watch?v=5-m2XEedNlU)
- [Official special program](https://www.youtube.com/watch?v=7YZ4VIUwn5c)
- [GRYPHLINE press release](https://www.gamespress.com/en-US/The-Game-Awards-Nominee-Arknights-Endfield-Launches-Meeting-You-in-the)
- [Teaser card image mirrors](https://endsync.vercel.app/versions/2-0/)
- Named identity cross-checks: [Warfarin](https://endfieldtools.dev/characters/warfarin/), [M3](https://endfieldtools.dev/characters/m3/).

`tools/upcoming-operator-previews.js` records each stable preview slug, card, portrait crop and provenance. The original, unedited teaser cards are stored in `endfield/assets/operators/previews/`. Ten separate transparent, AI-assisted head cutouts are stored in `endfield/assets/operators/avatars/previews/`. They are derived from the original teaser cards using the built-in image editor, like Mimino. The shared avatar scale and lower transform origin fill both index and detail frames without floating neck edges. See `docs/upcoming-portrait-prompts.md` for the prompt set. The full card remains available in an expandable section on each detail page.

These are display-only announcements, generated alongside public Supabase operators. They have no database operator IDs, invented rarity/class/element/weapon, placeholder physical skills, simulation actions or planner links. Missing combat details and individual dates remain explicitly unannounced. The cards participate in catalog search and sorting; unknown classifications and rarity have their own filter choices. All profiles use the shared engagement summary in the catalog and unique views plus reversible Like/Dislike buttons on detail pages. Preview engagement uses a stable `preview:{slug}` identity, separate from real operator IDs.

The regular operator build includes previews in the atomic output and sitemap, so scheduled builds retain them. Empty or failed live database reads still abort before replacing output. The initial engagement enablement uses `supabase/upcoming_profile_engagement.sql` (also included in the base engagement schema). The **Enable Upcoming Profile Engagement** workflow applies and verifies it using the existing Supabase Management API secret. It only adds the ten known teaser identities to target validation; hidden or released real profiles supersede their teasers. The verification exercises repeated views and all reaction transitions in a transaction that is rolled back.

When real data becomes available, a matching slug or name supersedes its teaser. A renamed operator can set `raw_data.previewSlug` to its former teaser slug. This also respects hidden real profiles. Review and update the corresponding preview mapping whenever an unnamed figure receives an official name; do not infer identities from appearance or faction symbols.

Validation: source card/crop inventory, unknown-data rendering, released-profile deduplication, structured data, catalog filtering, atomic output and sitemap integration; desktop/mobile visual review.
