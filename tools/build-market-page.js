import { withMobileLandingNav } from './mobile-landing-nav.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { baseStyles, siteHeader } from './build-operator-pages.js';
import { isWeaponKey, safeUrl as safeWeaponImageUrl, typeName, weaponPath } from './build-weapon-pages.js';
import { cardMarkup, detailMarkup, escapeHtml, identity, validateStats, validateHistory, createMarketApi } from '../endfield/js/data/marketData.js';
const SITE='https://rotationforge.gg', ROUTE='/endfield/market/';
const ARSENAL_ROUTE = '/endfield/arsenal/';
const json=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const legacyArsenalRedirect = `<script>
(() => {
  const redirect = () => {
    if (location.hash === '#arsenal-exchange') location.replace(${json(ARSENAL_ROUTE)});
  };
  redirect();
  addEventListener('hashchange', redirect);
})();
</script>`;
export function publicConfig(root=process.cwd()){
 const source=fs.readFileSync(path.join(root,'endfield/supabaseClient.js'),'utf8');
 const url=source.match(/const SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1],key=source.match(/const SUPABASE_KEY\s*=\s*"([^"]+)"/)?.[1];
 createMarketApi({url,key});return{url,key};
}
export async function fetchSnapshot(config){
 const api=createMarketApi(config),statistics=await api.statistics(AbortSignal.timeout(30000));if(!statistics.length)throw Error('Market is empty; retaining existing page');
 const history=[];
 for(let offset=0;offset<100000;offset+=500){const query=new URLSearchParams({select:'shop_id,goods_id,observation_day,observed_at,price',order:'shop_id.asc,goods_id.asc,observation_day.asc',limit:'500',offset:String(offset)});const r=await fetch(config.url+'/rest/v1/ef_market_daily_prices?'+query,{headers:{apikey:config.key},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Daily price read failed (HTTP '+r.status+')');const data=validateHistory(await r.json());history.push(...data);if(data.length<500)return{statistics,history};}
 throw Error('History exceeds supported range');
}
export function renderMarketPage({statistics,history},config){
 validateStats(statistics);validateHistory(history);createMarketApi(config);if(!statistics.length)throw Error('Market snapshot is empty');
 const first=statistics[0],current=history.filter(r=>r.shop_id===first.shop_id&&r.goods_id===first.goods_id),last=new Date(Math.max(...statistics.map(r=>Date.parse(r.latest_observed_at)))).toLocaleString('en-GB',{timeZone:'Europe/Berlin'});
 const structured={'@context':'https://schema.org','@type':'WebPage',name:'Endfield Market Prices & Statistics',url:SITE+ROUTE,description:'Recorded Wuling and Tal II market prices, daily price history and statistics.'};
 return`<!doctype html><html lang="en"><head><meta charset="utf-8">${legacyArsenalRedirect}<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#252c2e"><title>Endfield Market Prices & Statistics | RotationForge</title><meta name="description" content="Track recorded Wuling and Tal II elastic-goods prices in Arknights: Endfield. Compare daily history, minimum, average and maximum prices."><link rel="canonical" href="${SITE+ROUTE}"><link rel="icon" href="/favicon-flat.png"><meta property="og:title" content="Endfield Market Prices & Statistics | RotationForge"><meta property="og:type" content="website"><meta property="og:url" content="${SITE+ROUTE}"><meta property="og:image" content="${SITE}/assets/market-trading-depot.webp"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${json(structured)}</script>${baseStyles()}<link rel="stylesheet" href="/endfield/css/databaseControls.css?v=6"><link rel="stylesheet" href="/endfield/css/marketDashboard.css"><link rel="stylesheet" href="/endfield/css/marketCompact.css?v=7"><link rel="stylesheet" href="/endfield/css/shopHeader.css?v=1"><link rel="stylesheet" href="/endfield/css/marketComparison.css?v=2"></head><body class="operator-index market-page shop-page">${siteHeader()}<main class="page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <span>Endfield Market</span></nav><section class="market-hero shop-hero"><span class="eyebrow">Arknights: Endfield / Supply redistribution</span><h1>Market prices</h1><p>Wuling &amp; Tal II · Recorded prices, daily history and statistics.</p></section><div class="market-summary"><div><span>Goods</span><strong id="market-goods-total">${statistics.length}</strong></div><div><span>Recorded days</span><strong id="market-days-total">${Math.max(...statistics.map(r=>r.observed_days))}</strong></div><div><span>Last observed · Berlin</span><strong id="market-last-observed">${escapeHtml(last)}</strong></div></div><div class="market-connection"><span id="market-status" role="status">Saved snapshot · checking for updates.</span><button id="market-refresh" class="market-refresh" type="button">Refresh prices</button></div><noscript><p class="market-note">This saved snapshot is readable without JavaScript. Enable JavaScript to filter goods, select histories and refresh prices from Supabase.</p></noscript><form id="market-filters" class="market-filters" onsubmit="return false"><label>Search goods<input name="search" type="search" placeholder="Find a package…" autocomplete="off"></label><label>Region<select name="region"><option value="">All regions</option><option>Wuling</option><option>Tal II</option></select></label><label>Sort by<select name="sort"><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="deviation">Below base price first</option></select></label><button type="reset" class="market-reset">Reset</button></form><div id="market-views" class="market-views" role="group" aria-label="Market view"><button type="button" data-market-view="all" aria-pressed="true">All goods</button><button type="button" data-market-view="deals" aria-pressed="false">Best deals</button><button type="button" data-market-view="favorites" aria-pressed="false">Favorites <span id="market-favorite-count">0</span></button><button type="button" data-market-view="alerts" aria-pressed="false">Alerts <span id="market-alert-count">0</span></button><span id="market-view-note">Star goods to pin them. Favorites stay in this browser.</span></div><details id="market-comparison" class="market-comparison"><summary>Compare goods · up to 4 price histories</summary><div class="comparison-body"><div class="comparison-controls"><label>Find goods<input id="comparison-search" type="search" placeholder="Search names or regions…"></label><label>Comparison period<select id="comparison-period"><option value="7">7 days</option><option value="30">30 days</option><option value="all" selected>All days</option></select></label><div id="comparison-mode" class="comparison-mode" role="group" aria-label="Comparison display"><button type="button" data-comparison-mode="price" aria-pressed="true">Price</button><button type="button" data-comparison-mode="change" aria-pressed="false">Change %</button></div><button id="comparison-clear" type="button">Clear comparison</button><span id="comparison-count">0/4 selected</span></div><p id="comparison-storage-note" class="comparison-note" role="status">Your selection is saved in this browser only. Clear comparison removes it.</p><div id="comparison-choices" class="comparison-choices"></div><p id="comparison-status" role="status"></p><div id="comparison-result"></div></div></details><p id="market-alert-status" class="market-alert-banner" role="status" hidden></p><span id="market-alert-feedback" class="market-alert-feedback" role="status"></span><div class="market-layout"><section class="market-results" aria-label="Recorded market goods"><p id="market-count">${statistics.length} goods</p><div id="market-grid" class="market-grid">${statistics.map(r=>cardMarkup(r,identity(r)===identity(first))).join('')}</div><p id="market-empty" hidden>No goods match your filters. Try another search or reset the filters.</p></section><details id="market-detail-shell" class="market-detail-shell" open><summary>Price history &amp; statistics</summary><label class="market-period-control">History &amp; statistics<select id="market-period"><option value="7">7 days</option><option value="30">30 days</option><option value="all" selected>All days</option></select></label><section id="market-detail" class="market-detail" tabindex="-1" aria-label="Selected good price history">${detailMarkup(first,current)}</section></details></div><section class="market-method"><h2>How these prices are recorded</h2><p>These are observed prices from a PC game session, saved to Supabase. They are not a global real-time market feed. Goods names use the English game localization. The timestamp shows when a price was received, not when it changed.</p><p>Each day's last observation counts once in the minimum, average and maximum. Days follow Europe/Berlin. Multiple logins on one day do not increase that day's weight. Unobserved days are not filled in, and the game's undated historical prices are not counted as dated observations.</p><p>A successful refresh can still show older observations if no new prices have been recorded. Refreshing this page never contacts the game server.</p></section><footer>RotationForge · Unofficial Arknights: Endfield tool · <a href="/">Back to all tools ↗</a></footer></main><script id="market-config" type="application/json">${json(config)}</script><script id="market-seed" type="application/json">${json({statistics,history})}</script><script type="module" src="/endfield/js/ui/marketDashboard.js?v=6"></script><script type="module" src="/endfield/js/ui/marketComparison.js?v=3"></script></body></html>`;
}
export function renderArsenalPage(config, weapons = []) {
  createMarketApi(config);
  const portraits = weapons.map(row => ({
    name: row.name, image: safeWeaponImageUrl(row.icon_path, true), rarity: row.rarity,
    type: row.weapon_type ? typeName(row) : undefined,
    href: isWeaponKey(row.weapon_key) ? weaponPath(row) : undefined,
  })).filter(({ name, image, href }) => typeof name === 'string' && name.trim() && (image || href));
  const title = 'Arsenal Exchange | RotationForge';
  const description = 'Track recorded daily weapon offers and upcoming Arsenal Exchange rotations in Arknights: Endfield.';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#252c2e">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${SITE + ARSENAL_ROUTE}">
  <link rel="icon" href="/favicon-flat.png">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${SITE + ARSENAL_ROUTE}">
  <meta property="og:image" content="${SITE}/assets/arsenal-exchange.webp">
  ${baseStyles()}
  <link rel="stylesheet" href="/endfield/css/databaseControls.css?v=6">
  <link rel="stylesheet" href="/endfield/css/weaponCatalog.css?v=7">
  <link rel="stylesheet" href="/endfield/css/shopHeader.css?v=1">
  <link rel="stylesheet" href="/endfield/css/marketArsenal.css?v=11">
</head>
<body class="operator-index shop-page">
  ${siteHeader()}
  <main class="page">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <span>Arsenal Exchange</span></nav>
    <section class="shop-hero arsenal-hero">
      <span class="eyebrow">Arknights: Endfield</span>
      <h1>Arsenal Exchange</h1>
      <p>Daily weapon offers and the upcoming weekly rotations.</p>
    </section>
    <nav class="arsenal-jump-links" aria-label="Arsenal sections">
      <a href="#current-weekly">Current weekly</a>
      <a href="#daily">Daily offers</a>
      <a href="#next-weekly">Next weekly</a>
    </nav>
    <section class="arsenal-shop" aria-label="Weapon offers">
      <div class="arsenal-toolbar">
        <p class="arsenal-note" id="arsenal-status" role="status">Loading recorded Arsenal Exchange offers…</p>
        <div class="arsenal-actions">
          <button id="arsenal-export" type="button" disabled>Download PNG</button>
          <button id="arsenal-refresh" type="button" disabled>Refresh offers</button>
        </div>
        <p id="arsenal-export-status" role="status"></p>
      </div>
      <div id="arsenal-content" class="arsenal-sections">
        <section class="arsenal-panel" aria-labelledby="current-weekly">
          <div class="arsenal-section-heading"><h2 id="current-weekly" tabindex="-1">Current weekly offers</h2></div>
          <div id="arsenal-weekly-offers"></div>
        </section>
        <section class="arsenal-panel" aria-labelledby="daily">
          <div class="arsenal-section-heading">
            <h2 id="daily" tabindex="-1">Daily offers</h2>
            <p class="arsenal-note" id="arsenal-daily-recorded"></p>
          </div>
          <div id="arsenal-daily-offers"></div>
        </section>
        <section class="arsenal-schedule" aria-labelledby="next-weekly">
          <h2 id="next-weekly" tabindex="-1">Upcoming weekly rotations</h2>
          <div id="arsenal-upcoming-offers"></div>
        </section>
      </div>
      <noscript><p>Enable JavaScript to load daily offers and the weekly schedule.</p></noscript>
    </section>
    <footer>RotationForge · Unofficial Arknights: Endfield tool · <a href="/">Back to all tools ↗</a></footer>
  </main>
  <script id="arsenal-config" type="application/json">${json(config)}</script>
  <script id="arsenal-portraits" type="application/json">${json(portraits)}</script>
  <script type="module" src="/endfield/js/ui/marketArsenal.js?v=16"></script>
</body>
</html>
`;
}

function writePage(root, route, html) {
  const dir = path.join(root, route.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  const temporary = path.join(dir, 'index.html.tmp');
  fs.writeFileSync(temporary, withMobileLandingNav(html));
  fs.renameSync(temporary, path.join(dir, 'index.html'));
}

export async function buildMarket({root=process.cwd(),snapshot,weapons,config=publicConfig(root)}={}){
 const [data, catalog] = await Promise.all([
   snapshot ?? fetchSnapshot(config),
   weapons ?? createMarketApi(config).arsenalWeapons(AbortSignal.timeout(15000)),
 ]);
 writePage(root, ROUTE, renderMarketPage(data, config));
 writePage(root, ARSENAL_ROUTE, renderArsenalPage(config, catalog));
 const urls = [ROUTE, ARSENAL_ROUTE].map(route => `<url><loc>${SITE + route}</loc></url>`).join('');
 fs.writeFileSync(path.join(root,'sitemap-market.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`);
 console.log(`Built market page with ${data.statistics.length} goods and ${data.history.length} dated observations.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)buildMarket().catch(e=>{console.error(e.message);process.exitCode=1;});
