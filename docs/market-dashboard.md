# Market dashboard

`/endfield/market/` displays `ef_market_statistics` and the per-good history from
`ef_market_daily_prices`. All browser requests use the site's existing public
Supabase configuration in `endfield/supabaseClient.js`. No secret key belongs in
this repository. The PC uploader remains a separate application.

Run `npm run build:market` to generate the initial crawlable snapshot and
`sitemap-market.xml`. The existing database workflow runs this command before
publishing. Failed or empty source reads retain the existing page. The browser
refreshes the statistics every minute while visible and when returning to the
tab. Read failures preserve the last successful values and show a status notice.

The page shares `baseStyles()` and `siteHeader()` with the existing catalogs.
The homepage links it through an illustrated card. The generated trading-depot
illustration lives in `assets/market-trading-depot.webp` and is not a game capture.

Daily statistics count the last observation per Europe/Berlin calendar day.
Historical game arrays with unconfirmed dates are excluded. Every price shows
its observation date; a connected page does not imply a real-time game feed.
Goods names use the official English localization, mapped by goods IDs in
`marketNames.js`; live German source names do not overwrite the display names.
The compact layout prioritizes visible prices; on mobile the history panel
starts collapsed and opens when a good is selected.

Tests: `node --test tests/market-dashboard.test.js tests/landing-page.test.js`.
