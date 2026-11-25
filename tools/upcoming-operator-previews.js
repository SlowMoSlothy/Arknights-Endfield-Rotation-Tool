import { profileEngagementMarkup, profileEngagementSummaryMarkup } from './profile-engagement-markup.js';

// Official SIGNAL PRELINK teaser order. No rarity, class, element or kit is inferred.
export const TEASER_VIDEO = 'https://www.youtube.com/watch?v=5-m2XEedNlU';
export const TEASER_ANNOUNCED_AT = '2026-11-21T11:30:00Z';
const entries = [
  ['warfarin', 'Warfarin', 1, [610, 0, 350], 'Introduced as the leader of Rhodes Island. Her playable details have not been announced.'],
  ['signal-prelink-02', 'Unrevealed Operator 1', 2, [420, 0, 340], 'The golden-haired operator wearing a yellow hat in teaser card 2. The official name has not been announced.'],
  ['m3', 'M3', 3, [440, 50, 340], 'M3 returns with a new appearance, shown in the foreground of teaser card 3. Her playable details have not been announced.'],
  ['signal-prelink-03-background', 'Unrevealed Operator 2', 3, [740, 0, 260], 'The silver-haired figure behind M3 in teaser card 3. The official name and playable details have not been announced.'],
  ['signal-prelink-04', 'Unrevealed Operator 3', 4, [450, 0, 350], 'The pink-haired operator in teaser card 4. The official name has not been announced.'],
  ['signal-prelink-05', 'Unrevealed Operator 4', 5, [630, 0, 340], 'The dark-haired operator with purple accents in teaser card 5. The official name has not been announced.'],
  ['signal-prelink-06', 'Unrevealed Operator 5', 6, [650, 0, 340], 'The red-haired operator in teaser card 6. The official name has not been announced.'],
  ['signal-prelink-07', 'Unrevealed Operator 6', 7, [315, 0, 340], 'The dark-haired operator with a crescent ornament in teaser card 7. The official name has not been announced.'],
  ['signal-prelink-08', 'Unrevealed Operator 7', 8, [395, 0, 340], 'The pale-blue-haired operator in teaser card 8. The official name has not been announced.'],
  ['signal-prelink-09', 'Unrevealed Operator 8', 9, [650, 30, 340], 'The silver-haired operator in teaser card 9. The official name has not been announced.']
];

export const upcomingOperatorPreviews = entries.map(([slug, name, card, crop, summary], index) => ({
  id: `preview:${slug}`, slug, name, star: null,
  operator_class: 'unannounced', element_type: 'unannounced', weapon_type: null,
  icon_path: `assets/operators/avatars/previews/${slug}.png`,
  created_at: TEASER_ANNOUNCED_AT, sort_order: 10000 + index,
  raw_data: { dataStatus: 'teaser_preview', card, crop, summary, source: TEASER_VIDEO,
    teaserPath: `assets/operators/previews/signal_prelink_${String(card).padStart(2, '0')}.webp`,
    artworkSource: `https://endsync.vercel.app/versions/2-0/operators/op-${card}.webp` }
}));

export const isUpcomingPreview = row => row?.raw_data?.dataStatus === 'teaser_preview';

export function selectUpcomingPreviews(existing) {
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const identities = new Set(existing.flatMap(row => [normalize(row.slug), normalize(row.name), normalize(row.raw_data?.previewSlug)]).filter(Boolean));
  return upcomingOperatorPreviews.filter(row => !identities.has(normalize(row.slug)) && !identities.has(normalize(row.name)));
}

const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const imagePath = row => `/endfield/${row.icon_path}`;
const pagePath = row => `/endfield/operators/${row.slug}/`;

export function previewPortraitStyle(row) {
  const originX = { 'signal-prelink-03-background': 80, 'signal-prelink-06': 70 }[row.slug] ?? 50;
  const closerCrop = /^signal-prelink-0[4-8]$/.test(row.slug);
  const silverPortrait = row.slug === 'signal-prelink-09';
  const scale = closerCrop ? 1.95 : silverPortrait ? 1.85 : 1.7;
  const originY = silverPortrait ? 70 : 64;
  const offsetY = closerCrop ? 7 : silverPortrait ? 5 : 0;
  return `--preview-scale:${scale};--preview-origin-x:${originX}%;--preview-origin-y:${originY}%;--preview-offset-y:${offsetY}%`;
}

export function upcomingIndexCard(row) {
  return `<a class="operator-tile upcoming-tile" href="${pagePath(row)}" data-added="${Date.parse(row.created_at)}" data-name="${escape(row.name.toLowerCase())}" data-class="unannounced" data-element="unannounced" data-rarity="0" data-order="${row.sort_order}">
    <span class="tile-avatar-frame upcoming-portrait" style="${previewPortraitStyle(row)}"><img class="preview-avatar" src="${imagePath(row)}" alt="${escape(row.name)} — portrait from the official teaser" loading="lazy" width="1254" height="1254"></span>
    <div class="tile-body"><span class="tile-stars preview-badge">Upcoming · Preview</span><h2>${escape(row.name)}</h2>
    <div class="tile-chips"><span class="tile-chip">Details not announced</span></div><p class="preview-tile-note">Version 2.0 and beyond · Release date TBA</p>${profileEngagementSummaryMarkup("operator", row.id)}</div>
  </a>`;
}

export function createUpcomingOperatorPage(row, { styles, header }) {
  const name = escape(row.name), url = `https://rotationforge.gg${pagePath(row)}`;
  const title = `${row.name} — Upcoming Operator Preview | RotationForge`;
  const description = `${row.name}: official Arknights: Endfield operator teaser. Release date, rarity, class, element, weapon and skills have not been announced.`;
  const schema = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url, datePublished: TEASER_ANNOUNCED_AT, about: { '@type': 'VideoGame', name: 'Arknights: Endfield' }, primaryImageOfPage: { '@type': 'ImageObject', url: `https://rotationforge.gg${imagePath(row)}`, caption: 'Portrait adapted from official SIGNAL PRELINK teaser artwork' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rotationforge.gg/' }, { '@type': 'ListItem', position: 2, name: 'Operators', item: 'https://rotationforge.gg/endfield/operators/' }, { '@type': 'ListItem', position: 3, name: row.name, item: url }] }
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${url}"><link rel="icon" href="/favicon-flat.png"><meta name="theme-color" content="#313739">
  <meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://rotationforge.gg${imagePath(row)}"><meta name="twitter:card" content="summary_large_image">
  ${schema.map(value => `<script type="application/ld+json">${JSON.stringify(value).replaceAll('<', '\\u003c')}</script>`).join('\n')}
  ${styles}<link rel="stylesheet" href="/endfield/css/databaseControls.css?v=6"><link rel="stylesheet" href="/endfield/css/upcomingOperators.css?v=5"></head>
  <body class="operator-page upcoming-page">${header}<main class="page">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/endfield/operators/">Operators</a><span>›</span><strong>${name}</strong></nav>
  <nav class="section-nav" aria-label="On this page"><a href="#overview">Overview</a><a href="#details">Details</a><a href="#skills">Skills</a><a href="#source">Source</a></nav>
  <section class="hero" id="overview"><div class="portrait-card"><div class="portrait-media upcoming-portrait" style="${previewPortraitStyle(row)}"><img class="preview-avatar" src="${imagePath(row)}" alt="${name} — portrait from the official teaser" width="1254" height="1254" fetchpriority="high"></div><span class="barcode">ROTATIONFORGE DATABASE</span></div>
  <div class="hero-copy"><div class="eyebrow">Arknights: Endfield Operator</div><span class="preview-badge">Upcoming · Preview</span><h1>${name}</h1><p class="subtitle">${escape(row.raw_data.summary)}</p><p class="highlight"><strong>Official teaser</strong> — Shown for Version 2.0 and beyond. No individual release date or banner has been announced.</p>${profileEngagementMarkup("operator", row.id)}</div>
  <div class="info-panel" id="details"><dl class="preview-facts">${['Rarity', 'Class', 'Element', 'Weapon', 'Release date'].map(label => `<div><dt>${label}</dt><dd>Not announced</dd></div>`).join('')}</dl></div></section>
  <section class="panel skills-section" id="skills"><h2>${name} Skills &amp; Stats</h2><p>Skills, Combo conditions, base attributes and combat values have not been announced. Rotation planning will become available when supported gameplay information is published.</p></section>
  <section class="panel profile-section" id="source"><h2>Official announcement</h2><p>Revealed on November 21, 2026 in <em>Ensemble: SIGNAL PRELINK</em>. This profile records the teaser only; it does not confirm a playable kit or an individual banner.</p>
  <p><a href="${TEASER_VIDEO}" target="_blank" rel="noopener noreferrer">Watch the official operator teaser ↗</a> · <a href="https://www.youtube.com/watch?v=7YZ4VIUwn5c" target="_blank" rel="noopener noreferrer">Official special program ↗</a></p>
  <details class="preview-artwork"><summary>View the full official teaser card</summary><img src="/endfield/${row.raw_data.teaserPath}" alt="Official SIGNAL PRELINK teaser card ${row.raw_data.card}" loading="lazy" width="1400" height="596"></details></section>
  <p class="preview-back"><a href="/endfield/operators/">← Browse all operators</a></p><footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield. Artwork © GRYPHLINE.</footer>
  </main><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="/endfield/supabaseClient.js?v=14"></script><script src="/endfield/js/ui/profileEngagement.js?v=2"></script><script src="/endfield/js/ui/enemySectionNav.js?v=2" defer></script></body></html>`;
}
