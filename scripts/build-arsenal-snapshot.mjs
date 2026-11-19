// Generate crawlable, timestamped Arsenal Exchange offers for GitHub Pages.
// Live client-side data remains authoritative and replaces this snapshot after loading.
import { readFile, writeFile } from 'node:fs/promises';
const file = 'endfield/arsenal/index.html';
const html = await readFile(file, 'utf8');
const config = JSON.parse(html.match(/<script id="arsenal-config" type="application\/json">([^<]+)<\/script>/)?.[1] ?? 'null');
if (!config?.url || !config?.key) throw new Error('Missing public Arsenal configuration');
const endpoint = new URL('/rest/v1/ef_arsenal_rotations', config.url);
endpoint.searchParams.set('select','period,source_id,observed_at,offers');
const response = await fetch(endpoint, { headers: { apikey: config.key }, signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error('Arsenal API returned HTTP ' + response.status);
const rows = await response.json();
if (!Array.isArray(rows) || rows.length > 2) throw new Error('Invalid Arsenal data');
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const now = Date.now();
const daily = rows.find(row => row.period === 'daily');
const weekly = rows.find(row => row.period === 'weekly');
for (const row of rows) {
  if (!['daily','weekly'].includes(row.period) || !Array.isArray(row.offers) || row.offers.length > 500 || !Number.isFinite(Date.parse(row.observed_at))) throw new Error('Invalid rotation');
  for (const offer of row.offers) if (typeof offer.name !== 'string' || !Number.isSafeInteger(offer.price) || offer.price < 1) throw new Error('Invalid offer');
}
const portraits = JSON.parse(html.match(/<script id="arsenal-portraits" type="application\/json">([^<]+)<\/script>/)?.[1] ?? '[]');
const links = new Map(portraits.map(p => [p.name.toLowerCase().replace(/[^\\p{L}\\p{N}]/gu,''),p.href]));
const cards = offers => offers.length ? '<ul class="arsenal-static-list">' + offers.map(o => {
  const href = links.get(o.name.toLowerCase().replace(/[^\\p{L}\\p{N}]/gu,''));
  const name = href ? '<a href="' + escape(href) + '">' + escape(o.name) + '</a>' : escape(o.name);
  return '<li>' + name + ' — ' + escape(o.price) + ' Arsenal Tickets</li>';
}).join('') + '</ul>' : '<p>No offers recorded for this rotation.</p>';
const activeWeekly = (weekly?.offers ?? []).filter(o => Date.parse(o.opens_at) <= now && Date.parse(o.closes_at) > now);
const upcoming = (weekly?.offers ?? []).filter(o => Date.parse(o.opens_at) > now);
const dailyReset = daily ? (() => { const d = new Date(daily.observed_at); d.setUTCHours(9,0,0,0); if(d <= new Date(daily.observed_at)) d.setUTCDate(d.getUTCDate()+1); return d.getTime(); })() : 0;
const activeDaily = daily && now < dailyReset ? daily.offers : [];
const stamp = Math.max(0,...rows.map(r=>Date.parse(r.observed_at)));
const snapshot = '<!-- arsenal-static:start -->\n<section class="arsenal-panel" id="arsenal-static-snapshot" aria-label="Recorded Arsenal Exchange offers"><h2>Recorded Arsenal Exchange weapon offers</h2><p>Snapshot of recorded offers. Live availability and countdowns update when JavaScript loads. Last observation: <time datetime="' + escape(new Date(stamp).toISOString()) + '">' + escape(new Date(stamp).toISOString().slice(0,16).replace('T',' ') + ' UTC') + '</time>.</p><h3>Current weekly weapons</h3>' + cards(activeWeekly) + '<h3>Daily weapons</h3>' + cards(activeDaily) + '<h3>Upcoming weekly weapons</h3>' + cards(upcoming) + '</section>\n<!-- arsenal-static:end -->';
const pattern = /<!-- arsenal-static:start -->[\\s\\S]*?<!-- arsenal-static:end -->/;
const next = pattern.test(html) ? html.replace(pattern,snapshot) : html.replace('<div id="arsenal-content" class="arsenal-sections">',snapshot + '\n      <div id="arsenal-content" class="arsenal-sections">');
if (next === html) throw new Error('Could not insert snapshot');
if (next !== html) await writeFile(file,next);
