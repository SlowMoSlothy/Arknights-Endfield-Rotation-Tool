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

Favorites are saved under `rotationforge.market.favorites.v1` in browser localStorage.
They pin to the top of the normal list and can be filtered with Favorites. Storage
failures fall back to this visit only, with an explanatory message. Resetting
filters does not delete favorites. No account or server storage is involved.
Best deals includes only observations below their base price and sorts by the
price/base-price ratio, greatest discount first. Region and search still apply.
Each card includes its latest observation date in Europe/Berlin.

Price alerts are local target prices for favorites, stored separately under
`rotationforge.market.alerts.v1`. An alert is reached when the last recorded
price is less than or equal to its positive integer target. Unstarring pauses
the alert but retains the target. Removing an alert deletes its target.
The Alerts view lists configured targets for current favorites; a banner marks
reached targets even when another list/filter is open. Alerts use recorded
prices and observation dates, not a live game-server feed. They are evaluated
while the page is open or when reopened; there are no closed-page push, email
or background notifications. Denied storage falls back to this visit only.
Automatic refresh does not replace an alert editor while it is focused.

Cards and the detail panel show amount/percentage change against
previous_observed_day_price, explicitly labelled previous recorded day. This is
not necessarily yesterday. A missing/zero prior value or one observed day
produces no comparison. The compact recorded-range bar positions the latest
price between the minimum and maximum of the observed daily prices. Equal
endpoints use a centered marker without dividing by zero. Invalid or inconsistent
ranges are shown as unavailable rather than silently clamped.
