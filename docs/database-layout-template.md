# RotationForge database layout template

Use the Operator Database as the visual reference for future RotationForge catalogs, including Gear. This is a source-backed implementation guide, not a separate website or a fixed copy of game data. Adapt sections and filters to the actual database schema.

## Source of truth

- `tools/build-operator-pages.js`: shared `baseStyles()` and `siteHeader()`, operator overview/detail layout and SEO generation.
- `endfield/operators/akekuri/index.html`: generated example of the operator detail page. Regenerate rather than editing this file.
- `endfield/css/databaseControls.css` and `endfield/js/ui/databaseFilters.js`: shared navigation, responsive controls and mobile collapsible filters.
- `tools/build-weapon-pages.js`: smaller complete example of a paginated Supabase catalog, static detail pages, independent sitemap and staged output replacement.
- `endfield/css/weaponCatalog.css`: adapts the operator portrait frame for transparent item images.
- `index.html`: homepage database cards.
- `.github/workflows/build-operator-pages.yml`: existing hourly/manual/push SEO build and Pages deployment.

## Visual system

Keep the charcoal/stone surfaces, orange `#fc6f02` accents, light `#f6f7f0` text, silver `#a0aaa9` secondary text and subtle grid background from `baseStyles()`. Use the existing typography and spacing instead of introducing a second design system.

Catalog: shared header, breadcrumbs, title/description panel, item count, search, schema-appropriate filters, sort and reset; responsive grid of linked image cards. The complete catalog must remain readable without JavaScript. Use the shared collapsible filters on mobile.

Detail: breadcrumbs and section navigation; portrait frame next to title, rarity and key values on desktop; one column on mobile. Follow with clearly headed stat/attribute/effect sections, source/update information, related items and a link back to the catalog. Use tables for progression and expandable sections for lengthy rank descriptions. Keep unavailable values explicitly unknown.

### Portrait frame

Reuse the actual `.portrait-card` and `.barcode` classes from `baseStyles()`:

```html
<div class="portrait-card item-portrait">
  <div class="item-portrait-media">
    <img src="..." alt="Item name" width="360" height="360">
  </div>
  <span class="barcode">ROTATIONFORGE DATABASE</span>
</div>
```

The shared card supplies the orange left strip, ENDFIELD heading, rounded charcoal outer frame and vertical orange label. Add an inset rounded image surface modeled on `.weapon-portrait-media`. Keep transparent equipment images fully visible with `object-fit: contain`; do not stretch or crop them. The heading and label must remain visible above the image. Weapon profiles currently use 380px desktop / 340px mobile frame heights. Operator-specific media overrides are scoped to `.operator-page`; new catalogs need their own scoped media styling.

## Data and SEO integration

Use stable database identifiers for routes under `/endfield/<catalog>/<key>/`. Check the current tables and access policies before implementing an adapter; do not assume gear has weapon skill ranks or operator abilities. Read all pages of the data source, escape stored content, validate route identities and allow only safe image/source URLs. Failed reads must not wipe existing published pages. Follow the weapon builder's staged replacement when appropriate, scoped to the new catalog.

Generate a static index and detail pages, unique titles/descriptions, canonical URLs, Open Graph metadata, JSON-LD breadcrumbs and a dedicated `sitemap-<catalog>.xml`. Register the sitemap in `robots.txt`. Link the catalog from the homepage and appropriate shared navigation. Add its build command to the existing SEO workflow, using existing public-read Supabase secrets where the schema permits. Never embed management or service-role credentials in generated HTML.

For Gear, inspect the current gear and set tables first. Candidate sections are slot, rarity, recorded stats, set membership and set effects; include only supported data. Creating this template does not create or import a Gear Database.

## Verification

Check desktop and mobile layouts, image containment, labels, keyboard navigation and horizontal overflow. Exercise search/filter/reset where provided. Run relevant existing tests and generator checks; verify canonical links, structured data, sitemap entries and a real generated item. Publication follows the current task's authorization; the template itself grants none.
