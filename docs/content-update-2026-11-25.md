# Meeting You in the World o'Shrooms — November 25, 2026

Adds Kay (35), Mimino (36), Sweet Deal, Raid Comet and Star of Tomorrow.
The release roster is confirmed by the [official update notes](https://endfield.gryphline.com/en-us/news/0740).
Mimino and Star of Tomorrow are announced for the December 16 giveaway;
their numeric combat data is not published yet. They are explicit previews,
with unknown damage, costs, cooldowns, attributes and weapon ranks retained as
null. No invented values are included. Star of Tomorrow uses the site icon until
its item artwork becomes available. Mimino uses the published event artwork.

Run `node tools/build-shrooms-content.js` to regenerate
`supabase/content_update_2026_11_25.sql`. This only prepares SQL. Apply that
transaction once to the planner's existing Supabase project, then publish the
matching client and local assets. It locks the affected tables, guards all
operator/skill/weapon identities and aborts on any collision without overwriting
existing records. The live database must still have unused IDs 35 and 36.

The checked-in normalized snapshot records source URLs and SHA-256 hashes of
the retrieved exports. Kay's complete level table, skill ranks, potentials and
upgrade materials come from the EndfieldTools 1.7 game-data export. Sweet Deal
and Raid Comet include level-90 ATK and all nine attribute/passive ranks.
Community values are not marked as verified in-game.

Add `--pages` to reproduce the local catalog pages through the existing
operator and weapon generators. This reads public Supabase data and overlays
the reviewed additions; it does not write to the database. After the
database imports are installed, use the ordinary `build:operators` and
`build:weapons` commands. Scheduled builds read Supabase, so they require the
database migrations to retain pending additions.

Kay starts with three Weapons. A fresh Nature Infliction or Arts Burst hit can
trigger her Combo while a Weapon remains; each cast spends one and observes
the six-second cooldown. A placed Salvage Weapon action restores one dropped
Weapon and grants Hot Edgy Naives. Battle Skill salvages all dropped Weapons
before consuming those stacks, scales from 300% to 600% ATK, and forcibly
applies five-second Combustion at three stacks. Her Combo forcibly deals a
Nature Burst without adding or requiring Nature Infliction. Ultimate supplies
three damage sequences and 30 SP; Combo supplies 12 SP. Automatic movement,
Picnic Snack drops/pickups, talent buffs, potentials and animation timings are
not simulated.

Mimino's first Battle Skill attaches a device. The separate detonation action
consumes it and applies Vulnerability. With the device attached, a new Lift,
Knock Down, Solidification or Immobilization automatically inserts her Combo
and consumes the device. Ultimate forcibly applies Lift and can trigger her own
Combo. Persistent old statuses cannot trigger the Combo on device attachment.
Unpublished device lifetime, zone buffs, susceptibility values, damage and
cooldowns remain explicitly unavailable; preview timelines are not quantified
damage or timing recommendations.

Sweet Deal provides the documented Ultimate Gain Efficiency metadata, SP
recovery team ATK stacks (30 seconds, up to three, independent durations,
0.1-second trigger interval) and a 15-second team Arts DMG buff after a skill
applies an Arts Burst. Raid Comet provides static Nature DMG, a 20-second
personal Nature Burst buff and a separate 20-second team Arts DMG buff after
skill SP recovery. All nine ranks are supported. Ultimate energy gain efficiency
is recorded in loadout stats; the planner does not enforce energy budgets.
Star of Tomorrow's unpublished passive is not simulated.

Gameplay profiles and resource definitions remain in Supabase raw data. Client
resolvers handle generic counters, transfer, spending, damage scaling,
requirements and fresh-event conditions without operator-name checks.

Sources: [Kay export](https://www.endfieldtools.dev/localdb/optimized/characters/details/chr_0040_sweetpie.json),
[Mimino announced kit](https://endfieldtools.dev/characters/mimino/),
[Sweet Deal export](https://www.endfieldtools.dev/localdb/optimized/weapons/details/wpn_lance_0017.json),
[Raid Comet export](https://www.endfieldtools.dev/localdb/optimized/weapons/details/wpn_lance_0018.json),
[Star of Tomorrow announcement](https://endfieldtools.dev/weapons/star-of-tomorrow/).
