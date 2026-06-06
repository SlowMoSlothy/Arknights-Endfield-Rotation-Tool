import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const SITE_URL = "https://rotationforge.gg";
const BASE_PATH = "/endfield";
const OUTPUT_DIR = path.join(process.cwd(), "endfield", "operators");

function escapeHtml(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatValue(input, fallback = "Unknown") {
  if (input === null || input === undefined || input === "") return fallback;
  return String(input);
}

function formatLabel(input) {
  return formatValue(input)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function numberValue(input) {
  return input === null || input === undefined || input === "" ? "—" : String(input);
}

function normalizeAssetPath(assetPath) {
  const cleaned = String(assetPath || "").replace(/^\/+/, "");
  return `${BASE_PATH}/${cleaned}`;
}

function elementClass(elementType) {
  const element = String(elementType || "").toLowerCase();
  return ["heat", "cryo", "electric", "nature", "physical"].includes(element)
    ? `element-${element}`
    : "element-default";
}

function stars(count) {
  return "★".repeat(Number(count) || 0);
}

function stat(labelText, valueText, icon = "◆") {
  return `<div class="stat"><span class="stat-icon">${escapeHtml(icon)}</span><span class="stat-label">${escapeHtml(labelText)}</span><strong>${escapeHtml(numberValue(valueText))}</strong></div>`;
}

function info(labelText, valueText, icon = "◆", extraClass = "") {
  return `<div class="info-card ${extraClass}"><span class="info-icon">${escapeHtml(icon)}</span><span class="info-label">${escapeHtml(labelText)}</span><strong>${escapeHtml(valueText)}</strong></div>`;
}

function createPage(operator) {
  const pageUrl = `${SITE_URL}${BASE_PATH}/operators/${operator.slug}/`;
  const toolUrl = `${SITE_URL}${BASE_PATH}/#operator-${operator.slug}`;
  const avatarPath = normalizeAssetPath(operator.icon_path);
  const avatarUrl = `${SITE_URL}${avatarPath}`;

  const name = formatValue(operator.name);
  const operatorClass = formatLabel(operator.operator_class);
  const elementType = formatLabel(operator.element_type);
  const weaponType = formatLabel(operator.weapon_type);
  const mainAttribute = formatLabel(operator.main_attribute);
  const secondaryAttribute = formatLabel(operator.secondary_attribute);
  const databaseId = `OPERATOR_${String(operator.slug || "unknown").toUpperCase().replaceAll("-", "_")}`;

  const title = `${name} - Arknights Endfield Operator | RotationForge`;
  const description = `${name} is a ${operator.star}-star ${operatorClass} operator with ${elementType} element in Arknights: Endfield. View stats, attributes and open the RotationForge rotation tool.`;

  const baseStatsHtml = [
    stat("HP", operator.base_hp, "♥"),
    stat("ATK", operator.base_atk, "⚔"),
    stat("Level", operator.base_stats_level, "▣"),
    stat("Ultimate", operator.can_enter_ultimate_state ? "Yes" : "No", "✦")
  ].join("\n");

  const attributeStatsHtml = [
    stat("Strength", operator.base_strength, "●"),
    stat("Agility", operator.base_agility, "✦"),
    stat("Intellect", operator.base_intellect, "◆"),
    stat("Will", operator.base_will, "◉")
  ].join("\n");

  const levelOneHtml = [
    stat("HP Lv. 1", operator.base_hp_level_1, "♥"),
    stat("ATK Lv. 1", operator.base_atk_level_1, "⚔"),
    stat("STR Lv. 1", operator.base_strength_level_1, "●"),
    stat("AGI Lv. 1", operator.base_agility_level_1, "✦"),
    stat("INT Lv. 1", operator.base_intellect_level_1, "◆"),
    stat("WILL Lv. 1", operator.base_will_level_1, "◉")
  ].join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: pageUrl,
    image: avatarUrl,
    isPartOf: { "@type": "WebSite", name: "RotationForge", url: SITE_URL },
    about: { "@type": "Thing", name: `${name} - Arknights: Endfield Operator` }
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#313739">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${avatarUrl}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    :root {
      color-scheme: dark;
      --stone:#7E807C;
      --olive:#657136;
      --yellow:#F8F546;
      --silver:#A0AAA9;
      --charcoal:#313739;
      --charcoal-2:#252c2e;
      --charcoal-3:#1d2325;
      --text:#f6f7f0;
      --muted:#A0AAA9;
      --border:rgba(160,170,169,.28);
      --panel:rgba(49,55,57,.86);
      --panel-soft:rgba(126,128,124,.14);
      --shadow:0 28px 90px rgba(0,0,0,.42);
    }
    *{box-sizing:border-box} body{margin:0;min-height:100vh;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 18% 0%,rgba(160,170,169,.22),transparent 32rem),radial-gradient(circle at 82% 8%,rgba(248,245,70,.14),transparent 34rem),linear-gradient(135deg,#313739,#252c2e 52%,#181d1f)}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.15;background-image:linear-gradient(rgba(160,170,169,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(160,170,169,.18) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,#000,transparent 75%)}
    a{color:inherit;text-decoration:none}.top{position:sticky;top:0;z-index:5;border-bottom:1px solid rgba(160,170,169,.20);background:rgba(37,44,46,.82);backdrop-filter:blur(14px)}.nav{width:min(1280px,calc(100% - 32px));height:66px;margin:0 auto;display:flex;align-items:center;gap:24px}.brand{display:flex;align-items:center;gap:12px;font-weight:950;font-size:1.08rem}.mark{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:#313739;background:var(--yellow);box-shadow:0 0 24px rgba(248,245,70,.22)}.tool-name{color:var(--text);padding-left:20px;border-left:1px solid rgba(160,170,169,.25)}.nav-links{margin-left:auto;display:flex;align-items:center;gap:28px;color:var(--text);font-weight:800;font-size:.92rem}.nav-cta{color:#313739;background:var(--yellow);border-radius:10px;padding:12px 18px;box-shadow:0 14px 30px rgba(248,245,70,.16)}
    .page{width:min(1280px,calc(100% - 32px));margin:0 auto;padding:28px 0 64px}.breadcrumbs{display:flex;gap:10px;align-items:center;color:var(--muted);font-weight:700;font-size:.92rem;margin:0 0 28px}.breadcrumbs strong{color:var(--text)}.hero{display:grid;grid-template-columns:400px minmax(0,1fr) 410px;gap:34px;align-items:center}.portrait-card{position:relative;min-height:395px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:linear-gradient(135deg,rgba(126,128,124,.32),rgba(49,55,57,.92));box-shadow:var(--shadow)}.portrait-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:18px;background:var(--yellow)}.portrait-card:after{content:"ENDFIELD";position:absolute;left:34px;top:24px;color:#fff;font-size:.8rem;font-weight:950;letter-spacing:.18em}.portrait{position:absolute;left:50%;top:50%;width:min(260px,74%);max-height:260px;object-fit:contain;transform:translate(-50%,-45%);filter:drop-shadow(0 28px 26px rgba(0,0,0,.42))}.barcode{position:absolute;left:30px;bottom:22px;color:#313739;background:var(--yellow);writing-mode:vertical-rl;font-size:.58rem;font-weight:900;letter-spacing:.1em;padding:8px 4px;border-radius:3px}.hero-copy{padding:8px 0}.eyebrow{color:var(--yellow);font-size:.8rem;font-weight:950;letter-spacing:.44em;text-transform:uppercase;margin-bottom:24px}h1{margin:0;font-size:clamp(4rem,7vw,6.2rem);line-height:.9;letter-spacing:-.08em;text-shadow:0 18px 45px rgba(0,0,0,.32)}.stars{margin-top:18px;color:var(--yellow);font-size:2rem;letter-spacing:.08em}.subtitle{max-width:560px;margin:22px 0 0;color:#d7ddd9;line-height:1.8;font-size:1.05rem}.actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 20px;border-radius:10px;font-weight:950}.primary{color:#313739;background:var(--yellow);box-shadow:0 16px 34px rgba(248,245,70,.18)}.secondary{background:rgba(126,128,124,.18);border:1px solid rgba(160,170,169,.25)}
    .info-panel{border:1px solid var(--border);border-radius:14px;background:rgba(49,55,57,.82);box-shadow:var(--shadow);padding:22px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.info-card{position:relative;min-height:104px;padding:22px 18px 18px 52px;border-radius:9px;background:linear-gradient(135deg,rgba(160,170,169,.14),rgba(126,128,124,.12));border:1px solid rgba(160,170,169,.14)}.info-icon{position:absolute;left:20px;top:31px;color:var(--silver);font-size:1.3rem}.info-label{display:block;color:var(--silver);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.info-card strong{display:block;margin-top:9px;font-size:1.12rem}.element-heat,.element-cryo,.element-electric,.element-nature,.element-physical{background:linear-gradient(135deg,rgba(101,113,54,.32),rgba(248,245,70,.10));border-color:rgba(248,245,70,.28)}.rarity{grid-column:1/-1;background:linear-gradient(135deg,rgba(101,113,54,.48),rgba(248,245,70,.12));border-color:rgba(248,245,70,.25)}.rarity .star-line{color:var(--yellow);font-size:1.65rem;letter-spacing:.08em;margin-top:10px}.meta-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:30px;border:1px solid var(--border);border-radius:10px;background:linear-gradient(135deg,rgba(126,128,124,.30),rgba(49,55,57,.82));overflow:hidden}.meta-item{padding:28px 34px;display:grid;grid-template-columns:42px 1fr;gap:14px;align-items:center}.meta-item+.meta-item{border-left:1px solid rgba(160,170,169,.24)}.meta-icon{font-size:1.65rem;color:var(--silver)}.meta-label{display:block;color:var(--yellow);font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.meta-value{display:block;margin-top:6px;font-weight:900}.lower{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-top:24px}.panel{border:1px solid var(--border);border-radius:12px;background:rgba(49,55,57,.84);box-shadow:var(--shadow);padding:24px}.panel h2{margin:0 0 18px;font-size:1.35rem}.panel h2 span{color:var(--silver)}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat{position:relative;min-height:78px;border:1px solid rgba(160,170,169,.20);border-radius:7px;background:rgba(126,128,124,.10);padding:16px 14px 12px 54px}.stat-icon{position:absolute;left:18px;top:27px;color:#e5e9e4;font-size:1.3rem}.stat-label{display:block;color:var(--silver);font-size:.76rem;font-weight:850;text-transform:uppercase}.stat strong{display:block;margin-top:4px;font-size:1.35rem}.attribute-title{margin:24px 0 14px;font-size:1.25rem;font-weight:950}.highlight{margin-top:16px;border:1px solid rgba(248,245,70,.22);border-radius:8px;background:linear-gradient(135deg,rgba(101,113,54,.48),rgba(248,245,70,.10));padding:18px;color:#eef1e8}.about{position:relative;overflow:hidden}.about:after{content:"A";position:absolute;right:26px;bottom:-38px;color:rgba(160,170,169,.06);font-size:12rem;font-weight:950}.about p{position:relative;margin:0;color:#d7ddd9;line-height:1.75}footer{margin-top:30px;text-align:center;color:rgba(160,170,169,.82);font-size:.9rem}
    @media(max-width:1120px){.hero{grid-template-columns:1fr 1fr}.portrait-card{grid-row:1}.hero-copy{grid-column:1/-1;grid-row:2}.info-panel{grid-column:2;grid-row:1}.lower{grid-template-columns:1fr}.meta-strip{grid-template-columns:1fr}.meta-item+.meta-item{border-left:0;border-top:1px solid rgba(160,170,169,.24)}}@media(max-width:760px){.nav{height:auto;align-items:flex-start;flex-direction:column;padding:16px 0}.tool-name{border-left:0;padding-left:0}.nav-links{margin-left:0;gap:14px;flex-wrap:wrap}.hero{grid-template-columns:1fr}.info-panel,.portrait-card,.hero-copy{grid-column:auto;grid-row:auto}.stats-grid,.info-grid{grid-template-columns:1fr 1fr}h1{font-size:3.5rem}}@media(max-width:520px){.page,.nav{width:min(100% - 20px,1280px)}.stats-grid,.info-grid{grid-template-columns:1fr}.portrait-card{min-height:320px}.button{width:100%}.meta-item{padding:22px}.panel{padding:18px}}
  </style>
</head>
<body>
  <header class="top">
    <nav class="nav">
      <a class="brand" href="${SITE_URL}/"><span class="mark">RF</span><span>RotationForge</span></a>
      <span class="tool-name">▱ Arknights: Endfield Rotation Tool</span>
      <div class="nav-links">
        <a href="${SITE_URL}${BASE_PATH}/">Operators</a>
        <a href="${SITE_URL}${BASE_PATH}/">Guides</a>
        <a href="${SITE_URL}${BASE_PATH}/">Database</a>
        <a class="nav-cta" href="${toolUrl}">Open Rotation Tool ↗</a>
      </div>
    </nav>
  </header>

  <div class="page">
    <div class="breadcrumbs"><a href="${SITE_URL}/">Home</a><span>›</span><a href="${SITE_URL}${BASE_PATH}/">Operators</a><span>›</span><strong>${escapeHtml(name)}</strong></div>

    <main class="hero">
      <section class="portrait-card">
        <img class="portrait" src="${avatarPath}" alt="${escapeHtml(name)} icon" width="260" height="260">
        <span class="barcode">ROTATIONFORGE DATABASE</span>
      </section>

      <section class="hero-copy">
        <div class="eyebrow">Arknights: Endfield Operator</div>
        <h1>${escapeHtml(name)}</h1>
        <div class="stars" aria-label="${operator.star} star operator">${stars(operator.star)}</div>
        <p class="subtitle">${escapeHtml(name)} is listed in the RotationForge operator database for Arknights: Endfield. Open the rotation tool to plan skills, compare operators, and build your rotation setup.</p>
        <div class="actions">
          <a class="button primary" href="${toolUrl}">Open in Rotation Tool ↗</a>
          <a class="button secondary" href="${SITE_URL}${BASE_PATH}/">Back to Endfield Tool</a>
        </div>
      </section>

      <aside class="info-panel">
        <div class="info-grid">
          ${info("Class", operatorClass, "➤")}
          ${info("Element", elementType, "◆", elementClass(operator.element_type))}
          ${info("Weapon", weaponType, "⚔")}
          ${info("Role Attribute", mainAttribute, "✣")}
          <div class="info-card rarity"><span class="info-label">Rarity</span><div class="star-line">${stars(operator.star)}</div></div>
        </div>
      </aside>
    </main>

    <section class="meta-strip">
      <div class="meta-item"><span class="meta-icon">▥</span><div><span class="meta-label">Game</span><span class="meta-value">Arknights: Endfield</span></div></div>
      <div class="meta-item"><span class="meta-icon">✦</span><div><span class="meta-label">Secondary Attribute</span><span class="meta-value">${escapeHtml(secondaryAttribute)}</span></div></div>
      <div class="meta-item"><span class="meta-icon">#</span><div><span class="meta-label">Database ID</span><span class="meta-value">${escapeHtml(databaseId)}</span></div></div>
    </section>

    <section class="lower">
      <article class="panel">
        <h2>Base Stats <span>(Lv. ${escapeHtml(numberValue(operator.base_stats_level))})</span></h2>
        <div class="stats-grid">${baseStatsHtml}</div>
        <div class="attribute-title">Attributes</div>
        <div class="stats-grid">${attributeStatsHtml}</div>
        <div class="highlight"><strong>Level 1 Values</strong><br>${levelOneHtml}</div>
      </article>

      <article class="panel about">
        <h2>About ${escapeHtml(name)}</h2>
        <p>${escapeHtml(name)} is a ${operator.star}-star ${escapeHtml(operatorClass)} operator using ${escapeHtml(weaponType)}. The current database entry lists ${escapeHtml(mainAttribute)} as main attribute and ${escapeHtml(secondaryAttribute)} as secondary attribute.</p>
      </article>
    </section>

    <footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield.</footer>
  </div>
</body>
</html>`;
}

async function build() {
  const { data, error } = await supabase
    .from("operators")
    .select(`
      id,
      game,
      slug,
      name,
      star,
      operator_class,
      element_type,
      icon_path,
      can_enter_ultimate_state,
      weapon_type,
      main_attribute,
      secondary_attribute,
      base_hp,
      base_atk,
      base_stats_level,
      base_hp_level_1,
      base_atk_level_1,
      base_strength,
      base_agility,
      base_intellect,
      base_will,
      base_strength_level_1,
      base_agility_level_1,
      base_intellect_level_1,
      base_will_level_1,
      sort_order
    `)
    .eq("game", "arknights_endfield")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Supabase Fehler:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("Keine Operatoren gefunden.");
    process.exit(1);
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const operator of data) {
    const folder = path.join(OUTPUT_DIR, operator.slug);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "index.html"), createPage(operator), "utf8");
    console.log(`Erstellt: ${BASE_PATH}/operators/${operator.slug}/`);
  }

  console.log(`Fertig: ${data.length} Operator-Seiten erstellt.`);
}

build();
