import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SITE_URL = "https://rotationforge.gg";
const OUTPUT_DIR = path.join(process.cwd(), "endfield", "operators");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createPage(operator) {
  const url = `${SITE_URL}/endfield/operators/${operator.slug}/`;
  const toolUrl = `${SITE_URL}/endfield/#operator-${operator.slug}`;

  const title = `${operator.name} - Arknights Endfield Operator | RotationForge`;
  const description = `${operator.name} ist ein ${operator.star}-★ ${operator.operator_class} Operator mit ${operator.element_type}-Element in Arknights: Endfield.`;

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="${url}">
</head>
<body>
  <main>
    <h1>${escapeHtml(operator.name)}</h1>

    <img src="/${escapeHtml(operator.icon_path)}" alt="${escapeHtml(operator.name)} Icon" width="128" height="128">

    <ul>
      <li>Sterne: ${operator.star}★</li>
      <li>Klasse: ${escapeHtml(operator.operator_class)}</li>
      <li>Element: ${escapeHtml(operator.element_type)}</li>
      <li>Waffe: ${escapeHtml(operator.weapon_type)}</li>
      <li>Hauptattribut: ${escapeHtml(operator.main_attribute)}</li>
      <li>Nebenattribut: ${escapeHtml(operator.secondary_attribute || "Unbekannt")}</li>
    </ul>

    <p>
      <a href="${toolUrl}">Im Rotation Tool öffnen</a>
    </p>

    <p>
      <a href="/endfield/">Zurück zum Rotation Tool</a>
    </p>
  </main>
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
      weapon_type,
      main_attribute,
      secondary_attribute,
      sort_order
    `)
    .eq("game", "arknights_endfield")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Supabase Fehler:", error.message);
    process.exit(1);
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const operator of data) {
    const folder = path.join(OUTPUT_DIR, operator.slug);
    fs.mkdirSync(folder, { recursive: true });

    fs.writeFileSync(
      path.join(folder, "index.html"),
      createPage(operator),
      "utf8"
    );

    console.log(`Erstellt: /endfield/operators/${operator.slug}/`);
  }

  console.log(`Fertig: ${data.length} Operator-Seiten erstellt.`);
}

build();
