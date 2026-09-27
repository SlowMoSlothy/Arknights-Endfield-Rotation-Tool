# Enemy Database API import

`npm run sync:enemies` prepares `.cache/enemy-import/catalog.sql`, `catalog.json` and `report.json`. It reads the public community API at https://endfield-assets.fffdan.com, documented by https://github.com/Deliay/endfield-development-skills/tree/main/find-endfield-data. This is not an official game API; coverage and freshness depend on its operator.

The **Import Enemy Database** GitHub Actions workflow uses the same `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_ACCESS_TOKEN` secrets as the equipment importer. Its default is a preview. Set **Apply the validated enemy catalog to Supabase** to import. The successful applied run dispatches **Build Database SEO Pages**, which downloads source portraits, generates static pages and publishes them through the existing Pages workflow. No recurring data import schedule is enabled; SEO generation retains its existing hourly schedule.

## Imported data

- One row per named `eny_` template in `EnemyTemplateDisplayInfoTable`; training-target records are excluded.
- English name, description, locations and ability notes using the locale dictionaries. Signed 64-bit localization IDs are preserved as strings before parsing to prevent rounded hashes.
- HP/ATK/Defense for levels 1–100. Top-level HP/Defense use level 90, explicitly labeled on the SEO page. Encounter-specific modifiers and alternate spawn configurations are not applied.
- Six incoming damage multipliers, mapped through verified `AttributeMetaTable` icons; these are multipliers, not resistance percentages.
- Source category retained in `combat_details.source_category`; Common maps to normal, Boss to boss, and Elite/Advanced/Alpha to elite for the existing database schema.
- Ability descriptions are field notes, without fabricated simulation IDs or mechanics. Unnamed source abilities use numbered field-note labels.
- Available `monstericonbig` images are copied by the SEO builder. A missing image uses the existing fallback and is listed in the report. Existing uploaded avatars take precedence.

## Identity and preservation

New UUIDs are deterministic from the game template ID. `tools/data/enemy-source-keys.json` explicitly binds existing manual profiles, including Triaggelos. First-time unique name matches also preserve manually maintained profiles in full. Test enemies are untouched. Imported source bindings, fixed URL slugs and the previous source snapshot live under `combat_details.catalog_import`.

On subsequent runs, fields that still match the previous source snapshot follow source updates. Manually changed fields remain unchanged; nested combat-detail fields are compared individually. Source removal never deletes a database row. Database visibility edits and avatar uploads remain effective. Keep the catalog_import provenance when editing imported rows so they can be identified on later imports.

Applied runs read all existing rows, including drafts, using the Management API. Local previews without the token can only see public rows and say so in their report. Before writing, a transaction locks the enemy table and checks the exact pre-import row snapshots; a concurrent edit aborts the transaction instead of being overwritten. A failed guard reports a division-by-zero SQL error: rerun a preview against the current state. Writes are not retried automatically, and the importer verifies all saved fields afterwards.

Incomplete localization, missing stat mappings, incomplete level tables, duplicate identities and unexpectedly shrunken catalogs fail before database writes. Reports include the source, timestamp, target project and SQL checksum. No credentials are saved in artifacts or generated pages.
