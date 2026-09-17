import { renderEnemyDossier } from './enemy-dossier.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { baseStyles, siteHeader, createSupabaseClient } from './build-operator-pages.js';

const SITE = 'https://rotationforge.gg';
const BASE = '/endfield/enemies/';
const ELEMENTS = ['physical', 'heat', 'cryo', 'electric', 'nature', 'aether'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const category = row => ({ normal: 'Normal', elite: 'Elite', boss: 'Boss', test: 'Training / test' })[row.category] || 'Unknown';
const value = input => input == null ? 'Unknown' : escape(input);
// Database IDs keep links stable when an enemy is renamed.
export const enemyPath = row => `${BASE}${row.id}/`;

export function validateEnemies(rows) {
    if (!Array.isArray(rows)) throw new Error('Enemy response must be an array.');
    const ids = new Set();
    for (const row of rows) {
        if (!UUID.test(row.id) || ids.has(row.id) || !String(row.name || '').trim()) throw new Error('Invalid or duplicate enemy identity.');
        if (!Array.isArray(row.skills) || !row.resistances || typeof row.resistances !== 'object') throw new Error(`Invalid profile: ${row.name}`);
        ids.add(row.id);
    }
}

export function portrait(row) {
    if (hasUploadedAvatar(row)) return `${enemyPath(row)}avatar.png?v=${row.avatar_url.split('/').at(-1).slice(0, 64)}`;
    return '/favicon-flat.png';
}

function hasUploadedAvatar(row) {
    return /^https:\/\/ftssllxdkqvmlxhfeqmy\.supabase\.co\/storage\/v1\/object\/public\/enemy-avatars\/[0-9a-f-]{36}\/[0-9a-f]{64}\.png$/.test(row.avatar_url || '');
}

export async function fetchAvatarImages(rows, fetcher = fetch) {
    const images = new Map();
    // Download the current profile images before changing any generated output.
    for (const row of rows.filter(row => row.is_visible === true && hasUploadedAvatar(row))) {
        const response = await fetcher(row.avatar_url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
        if (!response.ok) throw new Error(`Avatar download failed for ${row.name}: ${response.status}`);
        const chunks = []; let length = 0;
        for await (const chunk of response.body) {
            length += chunk.length;
            if (length > 2097152) throw new Error(`Avatar too large: ${row.name}`);
            chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Invalid avatar PNG: ${row.name}`);
        images.set(row.id, bytes);
    }
    return images;
}

function head(title, description, url, schema, image = `${SITE}/favicon-flat.png`) {
    return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
<meta name="theme-color" content="#313739"><link rel="icon" href="/favicon-flat.png">
<link rel="canonical" href="${escape(url)}">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:type" content="website"><meta property="og:url" content="${escape(url)}">
<meta property="og:image" content="${escape(image)}"><meta name="twitter:card" content="summary">
<script type="application/ld+json">${json(schema)}</script>
${baseStyles()}<link rel="stylesheet" href="/endfield/css/databaseControls.css?v=2"><link rel="stylesheet" href="/endfield/css/enemyCatalog.css?v=10">`;
}

function tile(row) {
    const search = [row.name, row.location, row.description, ...row.skills.map(skill => skill.name)].join(' ').toLowerCase();
    return `<a class="operator-tile" href="${enemyPath(row)}" data-name="${escape(row.name.toLowerCase())}" data-search="${escape(search)}" data-category="${escape(row.category)}">
<span class="tile-avatar-frame"><img class="tile-avatar" src="${portrait(row)}" alt="" loading="lazy" width="256" height="256"></span>
<div class="tile-body"><span class="enemy-category">${escape(category(row))}</span><h2>${escape(row.name)}</h2>
<p>${escape(row.location || 'Location unknown')}</p><p>${row.skills.length} ${row.skills.length === 1 ? 'ability' : 'abilities'}</p></div></a>`;
}

export function createEnemyIndex(rows, workInProgress = true) {
    const url = `${SITE}${BASE}`;
    const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Arknights: Endfield Enemy Database', url,
        mainEntity: { '@type': 'ItemList', itemListElement: rows.map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.name, url: SITE + enemyPath(row) })) } };
    return `<!doctype html><html lang="en"><head>${head('Arknights Endfield Enemy Database | RotationForge', 'Browse Arknights: Endfield enemy profiles, combat values, abilities, locations and sources. Explore the RotationForge Enemy Database.', url, schema)}</head>
<body class="operator-index enemy-index">${siteHeader()}<main class="page">
<div class="breadcrumbs"><a href="/">Home</a><span>›</span><strong>Enemies</strong></div>
${statusBadge(workInProgress)}<section class="index-hero"><div class="eyebrow">RotationForge Database</div><h1>Arknights: Endfield Enemies</h1>
<p>Browse enemy profiles, combat values, locations and abilities. Training and test profiles are labeled; unrecorded values are shown as unknown.</p></section>
<details class="database-filters" open><summary><span class="filter-show">Show filters</span><span class="filter-hide">Hide filters</span></summary>
<form class="operator-toolbar" aria-label="Filter and sort enemies">
<div class="operator-summary" aria-live="polite"><strong id="enemy-count">${rows.length} ${rows.length === 1 ? 'Enemy' : 'Enemies'}</strong><span>Filter the database</span></div>
<label class="control search-control"><span>Search</span><input type="search" name="search" placeholder="Enemy, location or ability" autocomplete="off"></label>
<label class="control"><span>Category</span><select name="category"><option value="">All categories</option>${['normal','elite','boss','test'].map(key => `<option value="${key}">${category({category:key})}</option>`).join('')}</select></label>
<label class="control"><span>Sort</span><select name="sort"><option value="name">Name A-Z</option><option value="name-desc">Name Z-A</option></select></label>
<button class="filter-reset" type="reset">Reset</button></form></details>
<section class="operator-grid" aria-label="Enemy profiles">${rows.map(tile).join('\n')}</section>
<p class="empty-state"${rows.length ? ' hidden' : ''}>${rows.length ? 'No enemies match the selected filters.' : 'No enemies have been published yet.'}</p>
<footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield.</footer></main>
<script src="/endfield/js/ui/databaseFilters.js?v=1"></script>
<script src="/endfield/js/ui/enemyCatalog.js?v=1"></script></body></html>`;
}

export function createEnemyPage(row, rows, workInProgress = true) {
    const url = SITE + enemyPath(row);
    const description = `${row.name} enemy profile for Arknights: Endfield: ${category(row).toLowerCase()}, combat values, abilities and sources.`;
    const schema = { '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebPage', name: `${row.name} | RotationForge Enemy Database`, description, url },
        { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
            { '@type': 'ListItem', position: 2, name: 'Enemy Database', item: SITE + BASE },
            { '@type': 'ListItem', position: 3, name: row.name, item: url }
        ] }
    ] };
    const stats = [['HP', row.hp], ['Defense', row.defense], ...ELEMENTS.map(key => [`${key} damage multiplier`, row.resistances[key]])];
    const avatar = portrait(row);
    return `<!doctype html><html lang="en"><head>${head(`${row.name} – Arknights Endfield Enemy | RotationForge`, description, url, schema, avatar.startsWith('/') ? SITE + avatar : avatar)}</head>
<body class="operator-index enemy-index enemy-profile">${siteHeader()}<main class="page">
<div class="breadcrumbs"><a href="/">Home</a><span>›</span><a href="${BASE}">Enemies</a><span>›</span><strong>${escape(row.name)}</strong></div>
<nav class="enemy-section-nav" aria-label="Enemy profile sections"><a href="#enemy-overview">Overview</a><a href="#enemy-attributes">Attributes</a><a href="#enemy-resistances">Resistances</a><a href="#enemy-abilities">Abilities</a></nav>
<section class="enemy-hero enemy-profile-layout">
  <div class="enemy-portrait-card"><span class="enemy-card-brand">ENDFIELD</span><span class="enemy-portrait-frame"><img src="${portrait(row)}" alt="" width="200" height="200"></span><span class="enemy-card-caption">ROTATIONFORGE DATABASE</span></div>
  <div class="enemy-hero-copy"><div class="eyebrow">Arknights: Endfield Enemy</div><h1>${escape(row.name)}</h1><span class="enemy-guide-label">Enemy profile</span>${statusBadge(workInProgress)}<div class="enemy-hero-actions"><a class="button primary" href="/endfield/">Open Rotation Planner ↗</a><a class="button secondary" href="${BASE}">All enemies ↗</a></div></div>
  <div class="enemy-profile-info">${[['Category',category(row)],['Location',row.location || 'Unknown'],['Abilities',String(row.skills.length)]].map(([label,text])=>`<div><span>${escape(label)}</span><strong>${escape(text)}</strong></div>`).join('')}</div>
</section>
${row.category === 'test' ? '<p class="enemy-test-note">This is a synthetic training / test profile used by RotationForge, not a verified game enemy.</p>' : ''}
${renderEnemyDossier(row)}
<section id="enemy-related" class="enemy-related"><h2>More enemies</h2><div class="operator-grid">${rows.filter(item => item.id !== row.id).slice(0,6).map(tile).join('')}</div><p><a href="${BASE}">Browse all enemies ↗</a></p></section>
<footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield.</footer></main><script src="/endfield/js/ui/enemySectionNav.js?v=1" defer></script></body></html>`;
}

export function createEnemySitemap(rows) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE}${BASE}</loc></url>\n${rows.map(row => `<url><loc>${SITE}${enemyPath(row)}</loc>${row.updated_at && Number.isFinite(Date.parse(row.updated_at)) ? `<lastmod>${new Date(row.updated_at).toISOString()}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}

export async function fetchEnemies(client) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client.from('enemies').select('*').eq('is_visible', true).order('id').range(offset, offset + 999);
        if (error || !Array.isArray(data)) throw new Error(`Enemy database read failed: ${error?.message || 'Invalid response'}`);
        rows.push(...data.filter(row => row.is_visible === true));
        if (data.length < 1000) break;
    }
    validateEnemies(rows);
    return rows.sort((a,b) => a.name.localeCompare(b.name, 'en'));
}

export function writeEnemyOutput(rows, { outputDir = path.resolve('endfield/enemies'), sitemapPath = path.resolve('sitemap-enemies.xml'), avatarImages = new Map(), workInProgress = true } = {}) {
    rows = rows.filter(row => row.is_visible === true);
    validateEnemies(rows);
    const suffix = `${process.pid}-${Date.now()}`;
    const temp = `${outputDir}.tmp-${suffix}`;
    const backup = `${outputDir}.backup-${suffix}`;
    const temporaryMap = `${sitemapPath}.tmp-${suffix}`;
    let moved = false, committed = false, complete = false;
    // Remove only explicitly generated siblings of this catalog directory.
    function removeGenerated(target) {
        const resolved = path.resolve(target);
        if (path.dirname(resolved) !== path.dirname(path.resolve(outputDir)) || ![temp, backup, outputDir].map(item => path.resolve(item)).includes(resolved)) throw new Error('Unsafe generated directory path');
        fs.rmSync(resolved, { recursive: true, force: true });
    }
    try {
        fs.mkdirSync(temp, { recursive: true });
        fs.writeFileSync(path.join(temp, 'index.html'), createEnemyIndex(rows, workInProgress));
        for (const row of rows) {
            fs.mkdirSync(path.join(temp, row.id));
            fs.writeFileSync(path.join(temp, row.id, 'index.html'), createEnemyPage(row, rows, workInProgress));
            if (hasUploadedAvatar(row)) {
                if (!avatarImages.has(row.id)) throw new Error(`Missing avatar copy: ${row.name}`);
                fs.writeFileSync(path.join(temp, row.id, 'avatar.png'), avatarImages.get(row.id));
            }
        }
        fs.writeFileSync(temporaryMap, createEnemySitemap(rows));
        if (fs.existsSync(outputDir)) { fs.renameSync(outputDir, backup); moved = true; }
        fs.renameSync(temp, outputDir); committed = true;
        fs.renameSync(temporaryMap, sitemapPath);
        complete = true;
    } catch (error) {
        if (committed) removeGenerated(outputDir);
        if (moved) fs.renameSync(backup, outputDir);
        throw error;
    } finally {
        removeGenerated(temp);
        if (complete && fs.existsSync(backup)) removeGenerated(backup);
        fs.rmSync(temporaryMap, { force: true });
    }
}

export function statusBadge(enabled) {
    return enabled ? '<span class="database-status">Work in progress</span>' : '';
}

export async function fetchDatabaseStatus(client) {
    const { data, error } = await client.from('database_settings').select('work_in_progress').eq('id', 'enemy_database').single();
    // Initial rollout remains labeled until the settings migration is installed.
    if (error?.code === 'PGRST205' || error?.code === '42P01') return true;
    if (error || typeof data?.work_in_progress !== 'boolean') throw new Error('Database status could not be loaded: ' + (error?.message || 'Invalid response'));
    return data.work_in_progress;
}

export function updateHomeStatus(html, enabled) {
    const marker = /<!-- enemy-database-status:start -->[\s\S]*?<!-- enemy-database-status:end -->/;
    if (!marker.test(html)) throw new Error('Homepage status marker missing');
    return html.replace(marker, '<!-- enemy-database-status:start -->' + statusBadge(enabled) + '<!-- enemy-database-status:end -->');
}

export async function build({ supabase = createSupabaseClient() } = {}) {
    const workInProgress = await fetchDatabaseStatus(supabase);
    const home = updateHomeStatus(fs.readFileSync("index.html", "utf8"), workInProgress);
    const rows = await fetchEnemies(supabase);
    const avatarImages = await fetchAvatarImages(rows);
    writeEnemyOutput(rows, { avatarImages, workInProgress });
    fs.writeFileSync("index.html", home);
    console.log(`Created ${rows.length} enemy pages and enemy sitemap.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    build().catch(error => { console.error(error.message); process.exitCode = 1; });
}






