# Operator attribute import

Run `npm run sync:operators` for a preview, or use **Import Operator Database** in GitHub Actions. Enable its apply option to update Supabase and then trigger the existing SEO build. Uses the existing Supabase URL, anonymous key and access token secrets. No scheduled data import is enabled.

The source is the public community JSON service used by [EndfieldTools](https://endfieldtools.dev/characters/): `localdb/optimized/characters/characters-list.json` and `characters/details/<charId>.json`. All existing Endfield operators must match uniquely; Zhuang, Mi Fu and the physical Endministrator have explicit ID mappings. Extra source characters are reported. Reviewed additions are registered in `tools/data/operator-source-additions.json` with an unused database ID, source identity and local portrait. Inserts have collision protection. New profiles include base attributes and are explicitly marked as catalog-only until skills and rotation mechanics are implemented. Purrchena is the first approved addition.

Reads HP, ATK, Strength, Agility, Intellect and Will for every level 1–90. Duplicate breakthrough boundary rows must agree. Incomplete data aborts before writing. Source decimals are retained in `raw_data.operatorCatalogImport.levels`. Displayed attributes and level-90 base fields are rounded down, matching the existing level-90 convention; level-1 attribute columns retain one decimal. Equipment, talent, potential and combat modifiers are excluded.

For existing operators, only base stat columns, their existing raw-data mirrors, the missing-stats flag and the import metadata are updated. Operator identity, visibility, portraits, skills, attack sequences and other raw-data mechanics remain unchanged. Later manual stat edits are preserved by comparing against the previous import snapshot. The full level table reflects the source independently of manually overridden base fields.

Reports and guarded SQL are saved in `.cache/operator-import/`. Updates use one transaction with a table lock and optimistic checks on all affected fields and raw data. Concurrent changes abort the transaction. Writes are never automatically retried; only verification reads retry. Preview reads through Actions include drafts. After applying, every changed field is checked against Supabase.

The SEO generator renders the full level table for search engines and without JavaScript, then enhances it with a keyboard-accessible slider. The public display remains capped at level 90.
