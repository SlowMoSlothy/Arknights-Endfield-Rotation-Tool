import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { baseStyles, siteHeader, createSupabaseClient } from './build-operator-pages.js';

const SITE = 'https://rotationforge.gg';
const BASE = '/endfield/weapons/';
const TYPES = { sword: 'Sword', great_sword: 'Greatsword', handcannon: 'Handcannon', polearm: 'Polearm', arts_unit: 'Arts Unit' };
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const number = value => numeric(value) ? new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value)) : 'Unknown';
const stat = (value, percent) => numeric(value) ? `${number(value)}${percent ? '%' : ''}` : 'Unknown';
const typeName = row => TYPES[row.weapon_type] || row.weapon_type || 'Unknown';
export const weaponPath = row => `${BASE}${row.weapon_key}/`;

export function safeUrl(value, localImages = false) {
  const input = String(value || '');
  if (localImages && /^(?:\/endfield\/)?assets\/weapons\/[a-z0-9_-]+\.(?:png|webp|jpg)$/i.test(input)) return input.startsWith('/') ? input : '/endfield/' + input;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export const weaponImage = row => safeUrl(row.icon_path, true) || '/favicon-flat.png';
const absoluteImage = row => weaponImage(row).startsWith('/') ? SITE + weaponImage(row) : weaponImage(row);
const updatedAt = row => [row.updated_at, row.profile?.updated_at].filter(value => value && Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
const dateLabel = row => updatedAt(row) ? new Date(updatedAt(row)).toISOString().slice(0, 10) : null;

export function validateWeapons(rows) {
  if (!Array.isArray(rows)) throw new Error('Weapon response must be an array');
  const keys = new Set();
  for (const row of rows) {
    if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(row.weapon_key || '') || keys.has(row.weapon_key) || !String(row.name || '').trim()) throw new Error('Invalid or duplicate weapon identity');
    if (!Number.isInteger(row.rarity) || row.rarity < 1 || row.rarity > 6) throw new Error(`Invalid weapon rarity: ${row.name}`);
    keys.add(row.weapon_key);
  }
}

async function readTable(client, table, game) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from(table).select('*');
    if (game) query = query.eq('game', 'arknights_endfield');
    const { data, error } = await query.order('weapon_key').range(offset, offset + 499);
    if (error || !Array.isArray(data)) throw new Error(`${table} read failed: ${error?.message || 'Invalid response'}`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export async function fetchWeapons(client) {
  const [weapons, profiles] = await Promise.all([readTable(client, 'weapons', true), readTable(client, 'weapon_essence_profiles', false)]);
  // A failed/empty source must never replace a published catalog with empty pages.
  if (!weapons.length) throw new Error('Weapon database is empty; existing pages were retained');
  validateWeapons(weapons);
  const byKey = new Map(profiles.map(profile => [profile.weapon_key, profile]));
  return weapons.map(row => ({ ...row, profile: byKey.get(row.weapon_key) || null })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

function head(title, description, url, schema, image = SITE + '/favicon-flat.png') {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(url)}"><link rel="icon" href="/favicon-flat.png"><meta name="theme-color" content="#313739">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:type" content="website"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(image)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}">
<script type="application/ld+json">${json(schema)}</script>
${baseStyles()}<link rel="stylesheet" href="/endfield/css/databaseControls.css?v=6"><link rel="stylesheet" href="/endfield/css/weaponCatalog.css?v=5">`;
}

function footer() { return '<footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield. Game content belongs to its respective owners.</footer>'; }
function breadcrumbs(row) { return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span>${row ? `<a href="${BASE}">Weapons</a><span aria-hidden="true">›</span><strong>${escape(row.name)}</strong>` : '<strong>Weapons</strong>'}</nav>`; }
function stars(row) { return `<span class="weapon-stars" aria-label="${row.rarity} stars">${'★'.repeat(row.rarity)}</span>`; }
function tile(row) {
  const search = [row.name, typeName(row), row.main_attribute, row.secondary_attribute, row.passive_name].join(' ').toLowerCase();
  return `<a class="weapon-tile" href="${weaponPath(row)}" data-name="${escape(row.name.toLowerCase())}" data-search="${escape(search)}" data-type="${escape(row.weapon_type)}" data-rarity="${row.rarity}" data-attribute="${escape(row.main_attribute || '')}" data-atk="${numeric(row.base_atk) ? Number(row.base_atk) : -1}">
<span class="weapon-art"><span class="weapon-type">${escape(typeName(row))}</span><img src="${escape(weaponImage(row))}" alt="" loading="lazy" width="256" height="256"></span>
<span class="weapon-tile-copy">${stars(row)}<h2>${escape(row.name)}</h2><span class="weapon-tile-stats"><span>ATK <strong>${number(row.base_atk)}</strong><small>Lv. ${number(row.base_stats_level)}</small></span><span>${escape(row.main_attribute || 'Unknown attribute')}</span></span><span class="weapon-passive-name">${escape(row.passive_name || 'Skill not recorded')}</span></span></a>`;
}

export function createWeaponIndex(rows) {
  const url = SITE + BASE;
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Arknights: Endfield Weapon Database', url,
    mainEntity: { '@type': 'ItemList', itemListElement: rows.map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.name, url: SITE + weaponPath(row) })) } };
  const attributes = [...new Set(rows.map(row => row.main_attribute).filter(Boolean))].sort();
  return `<!doctype html><html lang="en"><head>${head('Arknights Endfield Weapons – Stats & Skills | RotationForge', 'Browse Arknights: Endfield weapons by type, rarity and attribute. Compare base ATK, attribute ranks and weapon skills in the RotationForge Weapon Database.', url, schema)}</head>
<body class="operator-index weapon-index">${siteHeader({ showWeaponLink: false }).replace(/[ \t]+$/gm, '')}<main class="page">${breadcrumbs()}
<section class="index-hero"><div class="eyebrow">RotationForge Database</div><h1>Arknights: Endfield Weapons</h1><p>Find your next weapon. Compare base ATK, attributes and weapon skills across all nine ranks.</p></section>
<details class="database-filters" open><summary><span class="filter-show">Show filters</span><span class="filter-hide">Hide filters</span></summary>
<form class="operator-toolbar weapon-toolbar" aria-label="Filter and sort weapons">
<div class="operator-summary" aria-live="polite"><strong id="weapon-count">${rows.length} Weapons</strong><span>Filter the database</span></div>
<label class="control search-control"><span>Search</span><input type="search" name="search" placeholder="Weapon or skill" autocomplete="off"></label>
<label class="control"><span>Type</span><select name="type"><option value="">All types</option>${Object.entries(TYPES).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></label>
<label class="control"><span>Rarity</span><select name="rarity"><option value="">All rarities</option>${[...new Set(rows.map(row => row.rarity))].sort((a,b) => b-a).map(rarity => `<option value="${rarity}">${rarity} stars</option>`).join('')}</select></label>
<label class="control"><span>Attribute</span><select name="attribute"><option value="">All attributes</option>${attributes.map(name => `<option value="${escape(name)}">${escape(name)}</option>`).join('')}</select></label>
<label class="control"><span>Sort</span><select name="sort"><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="rarity">Rarity ↓</option><option value="atk">Base ATK ↓</option></select></label><button type="reset" class="filter-reset">Reset</button></form></details>
<section class="weapon-grid" aria-label="Weapons">${rows.map(tile).join('\n')}</section><p class="empty-state" hidden>No weapons match the selected filters.</p>${footer()}</main>
<script src="/endfield/js/ui/databaseFilters.js?v=1"></script><script src="/endfield/js/ui/weaponCatalog.js?v=1" defer></script></body></html>`;
}

function progression(row) {
  const profile = row.profile;
  if (!profile || !Array.isArray(profile.primary_values) || !profile.primary_values.length) return '<p class="weapon-missing">Attribute rank values have not been recorded for this weapon.</p>';
  const primary = profile.primary_values, secondary = Array.isArray(profile.secondary_values) ? profile.secondary_values : [];
  return `<div class="weapon-table-scroll" tabindex="0" role="region" aria-label="Attribute values by rank"><table class="weapon-table"><caption>Weapon attribute values at each skill rank</caption><thead><tr><th scope="col">Rank</th><th scope="col">${escape(profile.primary_label || row.main_attribute || 'Primary attribute')}</th>${profile.secondary_label ? `<th scope="col">${escape(profile.secondary_label)}</th>` : ''}</tr></thead><tbody>${Array.from({ length: Math.max(primary.length, secondary.length) }, (_, index) => `<tr><th scope="row">${index + 1}</th><td>${stat(primary[index], profile.primary_is_percent)}</td>${profile.secondary_label ? `<td>${stat(secondary[index], profile.secondary_is_percent)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}

function atkProgression(row) {
  const values = row.raw_data?.catalogImport?.atkStats;
  const points = Array.isArray(values) ? values.filter(point => numeric(point.level) && point.level >= 1 && point.level <= 90 && numeric(point.atk)).sort((a,b) => a.level-b.level) : [];
  if (!points.length) return '<p class="weapon-missing">Additional level values have not been recorded.</p>';
  return `<div class="weapon-atk-levels">${points.map(point => `<div><span>Level ${number(point.level)}</span><strong>${number(point.atk)}</strong><small>Base ATK</small></div>`).join('')}</div>`;
}

function skills(row) {
  const descriptions = row.profile?.skill_descriptions;
  if (!Array.isArray(descriptions) || !descriptions.some(text => typeof text === 'string' && text.trim())) return '<p class="weapon-missing">Weapon skill descriptions have not been recorded yet.</p>';
  return descriptions.map((text, index) => `<details class="weapon-skill-rank"${index === 0 ? ' open' : ''}><summary><span>Rank ${index + 1}</span><strong>${escape(row.profile.skill_name || row.passive_name || 'Weapon skill')}</strong></summary><p>${escape(typeof text === 'string' && text.trim() ? text : 'Description not recorded.')}</p></details>`).join('\n');
}

export function createWeaponPage(row, rows) {
  const url = SITE + weaponPath(row);
  const description = `${row.name} in Arknights: Endfield: ${row.rarity}-star ${typeName(row).toLowerCase()}, base ATK, attribute progression and ${row.passive_name || 'weapon skill'} across all recorded ranks.`;
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', name: `${row.name} | RotationForge Weapon Database`, description, url, image: absoluteImage(row), ...(updatedAt(row) ? { dateModified: new Date(updatedAt(row)).toISOString() } : {}) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Weapon Database', item: SITE + BASE }, { '@type': 'ListItem', position: 3, name: row.name, item: url }] }
  ] };
  const profile = row.profile;
  const primaryMax = Array.isArray(profile?.primary_values) ? profile.primary_values.at(-1) : null;
  const primaryRank = profile?.primary_values?.length;
  const secondaryMax = Array.isArray(profile?.secondary_values) ? profile.secondary_values.at(-1) : null;
  const related = rows.filter(other => other.weapon_key !== row.weapon_key && other.weapon_type === row.weapon_type).sort((a,b) => Math.abs(a.rarity-row.rarity)-Math.abs(b.rarity-row.rarity) || a.name.localeCompare(b.name, 'en')).slice(0, 4);
  const source = safeUrl(profile?.source_url || row.raw_data?.catalogImport?.source || row.raw_data?.source);
  return `<!doctype html><html lang="en"><head>${head(`${row.name} – Weapon Stats & Skills | RotationForge`, description, url, schema, absoluteImage(row))}</head>
<body class="operator-index weapon-index weapon-profile">${siteHeader({ showWeaponLink: false }).replace(/[ \t]+$/gm, '')}<main class="page">${breadcrumbs(row)}
<nav class="weapon-section-links" aria-label="Weapon sections"><a href="#weapon-atk">ATK by level</a><a href="#weapon-attributes">Attributes</a><a href="#weapon-skill">Weapon skill</a></nav>
<section class="weapon-hero"><div class="portrait-card weapon-portrait"><div class="weapon-portrait-media"><img src="${escape(weaponImage(row))}" alt="${escape(row.name)}" width="360" height="360" fetchpriority="high"></div><span class="barcode">ROTATIONFORGE DATABASE</span></div>
<div class="weapon-hero-copy"><div class="eyebrow">Arknights: Endfield Weapon</div>${stars(row)}<h1>${escape(row.name)}</h1><p class="weapon-subtitle">${escape(typeName(row))} <span aria-hidden="true">/</span> ${escape(row.passive_name || 'Weapon skill not recorded')}</p>
<dl class="weapon-stat-grid"><div><dt>Base ATK · Level ${number(row.base_stats_level)}</dt><dd>${number(row.base_atk)}</dd></div><div><dt>${escape(profile?.primary_label || row.main_attribute || 'Primary attribute')}${primaryRank ? ` · Rank ${primaryRank}` : ''}</dt><dd>${stat(primaryMax, profile?.primary_is_percent)}</dd></div>${profile?.secondary_label ? `<div><dt>${escape(profile.secondary_label)} · Rank ${profile.secondary_values?.length || '—'}</dt><dd>${stat(secondaryMax, profile.secondary_is_percent)}</dd></div>` : ''}</dl>
</div></section>
<section class="weapon-section" id="weapon-atk"><div class="section-kicker">Weapon growth</div><h2>Base ATK by level</h2>${atkProgression(row)}</section>
<div class="weapon-details-grid"><section class="weapon-section" id="weapon-attributes"><div class="section-kicker">Rank progression</div><h2>Attribute values</h2>${progression(row)}</section>
<section class="weapon-section" id="weapon-skill"><div class="section-kicker">Weapon skill</div><h2>${escape(profile?.skill_name || row.passive_name || 'Skill descriptions')}</h2><p class="weapon-section-intro">Expand a rank to compare its effect.</p>${skills(row)}</section></div>
<section class="weapon-source"><h2>About these values</h2><p>Base ATK is shown at the listed weapon level. Attribute and skill ranks are shown separately; they do not include operator stats, gear or temporary combat buffs.</p>${profile?.verified !== true ? '<p>Imported community data. These values have not been marked as verified in-game.</p>' : ''}<p>${source ? `<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">View data source ↗</a>` : 'Source not recorded.'}${dateLabel(row) ? ` <span>Database updated: <time datetime="${dateLabel(row)}">${dateLabel(row)}</time></span>` : ''}</p></section>
${related.length ? `<section class="weapon-related"><h2>More ${escape(typeName(row))} weapons</h2><div class="weapon-grid">${related.map(tile).join('')}</div></section>` : ''}<p class="weapon-back"><a href="${BASE}">← Browse all weapons</a></p>${footer()}</main><script src="/endfield/js/ui/weaponProgression.js?v=1" defer></script><script src="/endfield/js/ui/enemySectionNav.js?v=2" defer></script></body></html>`;
}

export function createWeaponSitemap(rows) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n<url><loc>${SITE}${BASE}</loc></url>\n${rows.map(row => `<url><loc>${SITE}${weaponPath(row)}</loc>${updatedAt(row) ? `<lastmod>${new Date(updatedAt(row)).toISOString()}</lastmod>` : ''}<image:image><image:loc>${escape(absoluteImage(row))}</image:loc></image:image></url>`).join('\n')}\n</urlset>\n`;
}

export function writeWeaponOutput(rows, { outputDir = path.resolve('endfield/weapons'), sitemapPath = path.resolve('sitemap-weapons.xml') } = {}) {
  validateWeapons(rows);
  if (!rows.length) throw new Error('Refusing to replace weapon catalog with empty data');
  const suffix = `${process.pid}-${Date.now()}`;
  const temp = `${outputDir}.tmp-${suffix}`, backup = `${outputDir}.backup-${suffix}`, temporaryMap = `${sitemapPath}.tmp-${suffix}`;
  let moved = false, committed = false, complete = false;
  const remove = target => {
    const resolved = path.resolve(target);
    if (path.dirname(resolved) !== path.dirname(path.resolve(outputDir)) || ![temp, backup, outputDir].map(p => path.resolve(p)).includes(resolved)) throw new Error('Unsafe generated directory');
    fs.rmSync(resolved, { recursive: true, force: true });
  };
  try {
    fs.mkdirSync(temp, { recursive: true });
    fs.writeFileSync(path.join(temp, 'index.html'), createWeaponIndex(rows));
    for (const row of rows) {
      const folder = path.join(temp, row.weapon_key);
      fs.mkdirSync(folder);
      fs.writeFileSync(path.join(folder, 'index.html'), createWeaponPage(row, rows));
    }
    fs.writeFileSync(temporaryMap, createWeaponSitemap(rows));
    if (fs.existsSync(outputDir)) { fs.renameSync(outputDir, backup); moved = true; }
    fs.renameSync(temp, outputDir); committed = true;
    fs.renameSync(temporaryMap, sitemapPath); complete = true;
  } catch (error) {
    if (committed) remove(outputDir);
    if (moved) fs.renameSync(backup, outputDir);
    throw error;
  } finally {
    remove(temp);
    if (complete) remove(backup);
    fs.rmSync(temporaryMap, { force: true });
  }
}

export async function build({ supabase = createSupabaseClient(), ...options } = {}) {
  const rows = await fetchWeapons(supabase);
  writeWeaponOutput(rows, options);
  console.log(`Created ${rows.length} weapon pages, weapon index and weapon sitemap.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) build().catch(error => { console.error(error.message); process.exitCode = 1; });
