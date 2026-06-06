import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const SITE_URL = "https://rotationforge.gg";
const BASE_PATH = "/endfield";
const OUTPUT_DIR = path.join(process.cwd(), "endfield", "operators");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function value(value, fallback = "Unknown") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function label(value) {
  return value(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function numberValue(value) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
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

function stat(labelText, valueText) {
  return `<div class="stat"><span>${escapeHtml(labelText)}</span><strong>${escapeHtml(numberValue(valueText))}</strong></div>`;
}

function createPage(operator) {
  const pageUrl = `${SITE_URL}${BASE_PATH}/operators/${operator.slug}/`;
  const toolUrl = `${SITE_URL}${BASE_PATH}/#operator-${operator.slug}`;
  const avatarPath = normalizeAssetPath(operator.icon_path);
  const avatarUrl = `${SITE_URL}${avatarPath}`;

  const name = value(operator.name);
  const operatorClass = label(operator.operator_class);
  const elementType = label(operator.element_type);
  const weaponType = label(operator.weapon_type);
  const mainAttribute = label(operator.main_attribute);
  const secondaryAttribute = label(operator.secondary_attribute);
  const title = `${name} - Arknights Endfield Operator | RotationForge`;
  const description = `${name} is a ${operator.star}-star ${operatorClass} operator with ${elementType} element in Arknights: Endfield. View stats, attributes and open the RotationForge rotation tool.`;

  const statsHtml = [
    stat("HP", operator.base_hp),
    stat("ATK", operator.base_atk),
    stat("Level", operator.base_stats_level),
    stat("Strength", operator.base_strength),
    stat("Agility", operator.base_agility),
    stat("Intellect", operator.base_intellect),
    stat("Will", operator.base_will),
    stat("Ultimate State", operator.can_enter_ultimate_state ? "Yes" : "No")
  ].join("\n");

  const levelOneHtml = [
    stat("HP Lv. 1", operator.base_hp_level_1),
    stat("ATK Lv. 1", operator.base_atk_level_1),
    stat("STR Lv. 1", operator.base_strength_level_1),
    stat("AGI Lv. 1", operator.base_agility_level_1),
    stat("INT Lv. 1", operator.base_intellect_level_1),
    stat("WILL Lv. 1", operator.base_will_level_1)
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
  <meta name="theme-color" content="#070a12">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${avatarUrl}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    :root { color-scheme: dark; --bg:#070a12; --panel:#11182d; --panel2:#19223f; --border:rgba(148,163,184,.24); --text:#f8fafc; --muted:#a8b3cf; --gold:#ffd166; --gold2:#f5b942; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--text); background: radial-gradient(circle at 15% 0%,rgba(125,211,252,.14),transparent 32rem), radial-gradient(circle at 85% 10%,rgba(255,209,102,.11),transparent 34rem), linear-gradient(135deg,#070a12,#0b1020 52%,#05070d); }
    a { color:inherit; text-decoration:none; }
    .page { width:min(1120px,calc(100% - 32px)); margin:0 auto; padding:28px 0 56px; }
    .topbar { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:28px; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:900; letter-spacing:.02em; }
    .mark { display:grid; place-items:center; width:38px; height:38px; border:1px solid rgba(255,209,102,.48); border-radius:12px; background:linear-gradient(135deg,rgba(255,209,102,.24),rgba(125,211,252,.12)); }
    .pill-link { color:var(--muted); border:1px solid var(--border); border-radius:999px; padding:10px 14px; background:rgba(255,255,255,.04); }
    .hero { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); gap:24px; }
    .panel { border:1px solid var(--border); border-radius:28px; background:rgba(17,24,45,.88); box-shadow:0 24px 70px rgba(0,0,0,.42); overflow:hidden; }
    .hero-main { padding:clamp(28px,5vw,54px); }
    .eyebrow { display:flex; align-items:center; gap:9px; color:var(--gold); font-size:.82rem; font-weight:900; letter-spacing:.14em; text-transform:uppercase; margin-bottom:18px; }
    .eyebrow:before { content:""; width:9px; height:9px; border-radius:50%; background:var(--gold); box-shadow:0 0 18px rgba(255,209,102,.85); }
    h1 { margin:0; font-size:clamp(2.8rem,7vw,5.4rem); line-height:.95; letter-spacing:-.07em; }
    .subtitle { max-width:640px; margin:22px 0 0; color:var(--muted); font-size:1.08rem; line-height:1.75; }
    .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:32px; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height:48px; padding:0 18px; border-radius:14px; font-weight:900; }
    .primary { color:#15100a; background:linear-gradient(135deg,#ffe08a,#f3b33d); box-shadow:0 16px 36px rgba(245,199,107,.22); }
    .secondary { border:1px solid var(--border); background:rgba(255,255,255,.045); }
    .operator-card { padding:26px; background:radial-gradient(circle at 50% 0%,rgba(255,209,102,.17),transparent 18rem),rgba(25,34,63,.94); }
    .portrait-wrap { display:grid; place-items:center; min-height:240px; border:1px solid rgba(255,255,255,.09); border-radius:24px; background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02)); }
    .portrait { width:min(190px,72%); max-height:190px; object-fit:contain; filter:drop-shadow(0 22px 28px rgba(0,0,0,.45)); }
    .stars { margin:20px 0 0; color:var(--gold); font-size:1.45rem; text-align:center; letter-spacing:.05em; }
    .badge-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:24px; }
    .badge,.stat { min-width:0; padding:14px; border:1px solid var(--border); border-radius:16px; background:rgba(255,255,255,.04); }
    .badge span,.stat span { display:block; color:var(--muted); font-size:.74rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    .badge strong,.stat strong { display:block; margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:1rem; }
    .element-heat { border-color:rgba(248,113,113,.55); background:rgba(248,113,113,.12); }
    .element-cryo { border-color:rgba(125,211,252,.55); background:rgba(125,211,252,.12); }
    .element-electric { border-color:rgba(192,132,252,.55); background:rgba(192,132,252,.12); }
    .element-nature { border-color:rgba(74,222,128,.55); background:rgba(74,222,128,.12); }
    .element-physical { border-color:rgba(226,232,240,.38); background:rgba(226,232,240,.08); }
    .section { margin-top:24px; padding:24px; }
    .section-title { margin:0 0 16px; color:var(--gold); font-size:1rem; letter-spacing:.12em; text-transform:uppercase; }
    .stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
    .note-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:24px; }
    .note { border:1px solid var(--border); border-radius:22px; padding:20px; background:rgba(255,255,255,.035); }
    .note h2 { margin:0 0 10px; color:var(--gold); font-size:.95rem; letter-spacing:.08em; text-transform:uppercase; }
    .note p { margin:0; color:var(--muted); line-height:1.65; }
    footer { margin-top:28px; color:rgba(168,179,207,.78); text-align:center; font-size:.9rem; }
    @media (max-width:850px) { .hero,.note-grid { grid-template-columns:1fr; } .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .topbar { align-items:flex-start; flex-direction:column; } }
    @media (max-width:520px) { .page { width:min(100% - 20px,1120px); padding-top:16px; } .hero-main,.operator-card,.section { padding:22px; border-radius:22px; } .badge-grid,.stats-grid { grid-template-columns:1fr; } .button { width:100%; } }
  </style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <a class="brand" href="${SITE_URL}/"><span class="mark">RF</span><span>RotationForge</span></a>
      <a class="pill-link" href="${SITE_URL}${BASE_PATH}/">Arknights Endfield Rotation Tool</a>
    </header>

    <main class="hero">
      <section class="panel hero-main">
        <div class="eyebrow">Arknights: Endfield Operator</div>
        <h1>${escapeHtml(name)}</h1>
        <p class="subtitle">${escapeHtml(name)} is listed in the RotationForge operator database for Arknights: Endfield. Open the rotation tool to plan skills, compare operators, and build your rotation setup.</p>
        <div class="actions">
          <a class="button primary" href="${toolUrl}">Open in Rotation Tool →</a>
          <a class="button secondary" href="${SITE_URL}${BASE_PATH}/">Back to Endfield Tool</a>
        </div>
      </section>

      <aside class="panel operator-card">
        <div class="portrait-wrap">
          <img class="portrait" src="${avatarPath}" alt="${escapeHtml(name)} icon" width="190" height="190">
        </div>
        <div class="stars" aria-label="${operator.star} star operator">${stars(operator.star)}</div>
        <div class="badge-grid">
          <div class="badge"><span>Class</span><strong>${escapeHtml(operatorClass)}</strong></div>
          <div class="badge ${elementClass(operator.element_type)}"><span>Element</span><strong>${escapeHtml(elementType)}</strong></div>
          <div class="badge"><span>Weapon</span><strong>${escapeHtml(weaponType)}</strong></div>
          <div class="badge"><span>Main Attribute</span><strong>${escapeHtml(mainAttribute)}</strong></div>
        </div>
      </aside>
    </main>

    <section class="panel section">
      <h2 class="section-title">Operator Database</h2>
      <div class="stats-grid">${statsHtml}</div>
    </section>

    <section class="panel section">
      <h2 class="section-title">Level 1 Values</h2>
      <div class="stats-grid">${levelOneHtml}</div>
    </section>

    <section class="note-grid">
      <article class="note"><h2>Main Attribute</h2><p>${escapeHtml(mainAttribute)} is the main attribute currently stored for ${escapeHtml(name)} in the RotationForge database.</p></article>
      <article class="note"><h2>Secondary Attribute</h2><p>${escapeHtml(secondaryAttribute)} is listed as the secondary attribute for this operator.</p></article>
      <article class="note"><h2>Rotation Planner</h2><p>Use the RotationForge tool to open ${escapeHtml(name)} directly and work with the interactive Endfield rotation interface.</p></article>
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
