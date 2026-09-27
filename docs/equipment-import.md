# Weapon and Armor Database import

The shared importer reads all public weapon pages from ReEnd and all equipment
pieces and sets from EndfieldTools. It compares them with the current Supabase
tables and generates a single transaction containing only new or changed rows.
Operators are outside this import's scope.

## Run locally

Requires Node.js 22 or newer; the importer has no additional dependencies.

```sh
node tools/sync-endfield-equipment.js
# Equivalent when npm is installed:
npm run sync:equipment
```

By default this only prepares files in `.cache/equipment-import/`:

- `catalog.sql`: executable transaction for the Supabase SQL Editor.
- `catalog.json`: normalized source data in the database's column format.
- `report.json`: new/changed/missing keys, changed columns, source retrieval time,
  target project and the SQL's SHA-256 checksum.

Use `--output DIRECTORY` to choose another output folder. Failed retrieval or
validation does not write to the database. Files from a previous successful run
may still exist after a failure; check the exit code and report timestamp.

Existing `weapons`, `weapon_essence_profiles`, `gear_sets` and `gear_items` tables
are required. Read configuration defaults to the public connection already used
by `endfield/supabaseClient.js`. To target another database, provide **both**
`SUPABASE_URL` and `SUPABASE_ANON_KEY` in the environment.

## Apply automatically

Set `SUPABASE_ACCESS_TOKEN` in the local environment, then run:

```sh
node tools/sync-endfield-equipment.js --apply
```

This is a Supabase Management API personal access token with permission to write
to the target project's database, **not** the frontend publishable key or a
service-role key. Keep it in the environment or GitHub Actions secrets, never in
source code. The importer sends its generated transaction to
[`POST /v1/projects/{ref}/database/query`](https://supabase.com/docs/reference/api/v1-run-a-query)
and reads the rows back to verify the result. A connection failure during the
write is not automatically retried; rerun the importer to compare the actual
database state before applying again.

Alternatively, execute the generated `catalog.sql` once in the SQL Editor.

## GitHub Actions

After the code is pushed, run **Import Weapon and Armor Database** from Actions.
The default run prepares downloadable SQL and a report. Select **Apply the
validated catalog to Supabase** to write automatically, with the
`SUPABASE_ACCESS_TOKEN` repository secret configured. Existing `SUPABASE_URL`
and `SUPABASE_ANON_KEY` secrets are reused. No recurring schedule is enabled.

The workflow artifact also contains `equipment-source-keys.json`. Commit updated
source keys after importing new items so future source renames retain their IDs.

## Mapping and limits

- Existing keys are matched by name on first import. The checked-in
  `tools/data/equipment-source-keys.json` then maps stable external IDs to those
  keys, including legacy keys referenced by saved loadouts.
- Missing source entries are retained, never deleted. Incomplete pagination,
  duplicate keys, an unexpectedly shrunken catalog, unknown stats or unresolved
  localization placeholders stop the import.
- Weapon ATK at level 90, primary/secondary values and all nine passive
  descriptions are imported. Manual metadata in `weapons.raw_data` is merged,
  and existing Essence rank limits are preserved. Profiles are marked unverified
  because an automated community import is not an in-game verification. New
  profiles use the database defaults for Essence limits until they are checked.
- Gear includes armor, gloves and kits, with base (unenhanced) displayed stats.
  Numeric bonuses are rounded to one decimal; percentages and multiplicative
  damage reduction are converted explicitly. Flat HP/ATK are not percentages.
- Set descriptions resolve game localization and blackboard placeholders. These
  descriptions **do not implement simulation mechanics**. New passives, new sets
  and any unsupported stat types in the simulator still need engine support.
- Existing local icons are retained. New items use source-hosted images; missing
  ReEnd icons fall back to EndfieldTools' game-ID icons. Their availability and
  CORS policy are controlled by the source provider.
- These are community sources, not an official API. Completeness and update
  timing depend on those sources. API/schema changes fail validation rather than
  silently importing partial rows.

## Sources

- [ReEnd weapon list](https://api.vallov.com/api/weapons): paginated `data`, `page`,
  `page_size`, `total`; detail at `/api/weapons/{slug}`.
- [EndfieldTools equipment](https://endfieldtools.dev/equipment/):
  `localdb/optimized/equipment/equipment-details.json`,
  `localdb/optimized/equipment/suits/suits-list.json` and
  `localdb/optimized/i18n/I18nTextTable_EN.json`.

The old per-catalog Python scripts are retained for reference. They use the Wiki
source and an older schema interpretation; use the shared importer for new runs.
