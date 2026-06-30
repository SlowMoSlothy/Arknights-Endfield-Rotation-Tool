import fs from "node:fs";

const API_URL = "https://endfield.wiki.gg/api.php";
const SOURCE_URL_BASE = "https://endfield.wiki.gg/wiki/";
const OUTPUT_PATH = "supabase/skill_damage_multipliers_wiki_gg.sql";
const REQUEST_DELAY_MS = 900;
const RETRY_DELAYS_MS = [1500, 3500, 7000];

const OPERATOR_TITLE_OVERRIDES = new Map([
  ["zhuang", "Zhuang Fangyi"]
]);

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSeedOperators() {
  const sql = fs.readFileSync("supabase/seed_operators_basic.sql", "utf8");
  const entries = [];
  const rowPattern = /\(\s*(\d+)\s*,\s*'arknights_endfield'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g;
  let match;
  while ((match = rowPattern.exec(sql))) {
    entries.push({
      id: Number(match[1]),
      slug: match[2],
      name: match[3],
      wikiTitle: OPERATOR_TITLE_OVERRIDES.get(match[2]) || match[3]
    });
  }
  if (!entries.some(entry => entry.slug === "mi_fu")) {
    entries.push({ id: 27, slug: "mi_fu", name: "Mi Fu", wikiTitle: "Mi Fu" });
  }
  return entries;
}

async function fetchWikiText(title) {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: title,
    rvprop: "content",
    rvslots: "main",
    format: "json"
  });
  let response;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    response = await fetch(`${API_URL}?${params}`, {
      headers: {
        "user-agent": "RotationForge skill damage profile generator"
      }
    });
    if (response.ok) break;
    if (response.status !== 429 || attempt === RETRY_DELAYS_MS.length) {
      throw new Error(`wiki.gg request failed for ${title}: ${response.status}`);
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
  const json = await response.json();
  const pages = json?.query?.pages || {};
  const page = Object.values(pages)[0];
  return page?.revisions?.[0]?.slots?.main?.["*"] || "";
}

function extractTemplates(source, templateName) {
  const templates = [];
  const needle = `{{${templateName}`;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    let depth = 0;
    let cursor = index;
    while (cursor < source.length) {
      if (source.startsWith("{{", cursor)) {
        depth += 1;
        cursor += 2;
        continue;
      }
      if (source.startsWith("}}", cursor)) {
        depth -= 1;
        cursor += 2;
        if (depth === 0) break;
        continue;
      }
      cursor += 1;
    }
    templates.push(source.slice(index, cursor));
    index = cursor;
  }
  return templates;
}

function parseTemplateFields(template) {
  const fields = {};
  let currentKey = null;
  let currentValue = [];

  for (const line of template.split(/\r?\n/)) {
    const match = line.match(/^\|([^=]+)=(.*)$/);
    if (match) {
      if (currentKey) fields[currentKey] = currentValue.join("\n").trim();
      currentKey = match[1].trim();
      currentValue = [match[2].trim()];
    } else if (currentKey) {
      currentValue.push(line);
    }
  }
  if (currentKey) fields[currentKey] = currentValue.join("\n").trim();
  return fields;
}

function parseFirstPercent(value) {
  const match = String(value || "").match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  return Number(match[1]) / 100;
}

function cleanStatName(label) {
  return String(label || "")
    .replace(/\b(DMG|Damage|BATK|ATK)\b/gi, "")
    .replace(/\bMultiplier\b/gi, "")
    .replace(/\bSEQ\b/gi, "Sequence")
    .replace(/\s+/g, " ")
    .replace(/^[\s:-]+|[\s:-]+$/g, "");
}

function getSkillTypeFromTemplateType(typeValue) {
  const value = String(typeValue || "");
  if (value.includes("{{SB|1")) return "Final Strike";
  if (value.includes("{{SB|2")) return "Battle Skill";
  if (value.includes("{{SB|3")) return "Combo Skill";
  if (value.includes("{{SB|4")) return "Ultimate";
  return "";
}

function getSkillShortType(skillType) {
  if (skillType === "Final Strike") return "FS";
  if (skillType === "Battle Skill") return "BS";
  if (skillType === "Combo Skill") return "CS";
  if (skillType === "Ultimate") return "Ult";
  return "";
}

function shouldIncludeDamageStatInBaseTotal(label) {
  return !/(?:bonus|additional|enhanced|during ultimate|per (?:status|infliction)|early|solidification applied)/i.test(String(label || ""));
}

function shouldIncludeSkillDamageStat(skillType, label) {
  if (skillType === "Final Strike") return /finisher/i.test(String(label || ""));
  return shouldIncludeDamageStatInBaseTotal(label);
}

function extractDamageEntries(operator, wikiText) {
  const entries = [];
  for (const template of extractTemplates(wikiText, "Combat skill")) {
    const fields = parseTemplateFields(template);
    const skillName = fields.name;
    const skillType = getSkillTypeFromTemplateType(fields.type);
    const shortType = getSkillShortType(skillType);
    if (!skillName) continue;

    const damageStats = Object.entries(fields)
      .filter(([key]) => /^stat\d+$/i.test(key))
      .map(([, value]) => {
        const [label, ...rest] = value.split(",").map(part => part.trim());
        return { label, values: rest, multiplier: parseFirstPercent(rest.join(", ")) };
      })
      .filter(stat => stat.multiplier !== null && /(?:dmg|damage|batk|atk).*multiplier/i.test(stat.label));

    if (damageStats.length === 1) {
      entries.push({
        operator,
        baseSkillName: skillName,
        skillName,
        skillNamePattern: skillName,
        skillType,
        shortType,
        atkMultiplier: damageStats[0].multiplier,
        hitCount: 1,
        includeInTotal: true,
        sourceLabel: damageStats[0].label
      });
      continue;
    }

    for (const stat of damageStats) {
      const derivedName = cleanStatName(stat.label);
      const displayName = derivedName && derivedName !== skillName
        ? `${skillName}: ${derivedName}`
        : skillName;
      entries.push({
        operator,
        baseSkillName: skillName,
        skillName: displayName,
        skillNamePattern: derivedName || skillName,
        skillType,
        shortType,
        atkMultiplier: stat.multiplier,
        hitCount: 1,
        includeInTotal: shouldIncludeSkillDamageStat(skillType, stat.label),
        sourceLabel: stat.label
      });
    }
  }
  return entries;
}

function buildSql(entries) {
  const lines = [
    "-- Skill damage multipliers generated from wiki.gg Combat skill tables.",
    "-- Generated by tools/build-skill-damage-profiles.js.",
    "-- atk_multiplier uses decimal notation: 2.5 means 250% ATK total scaling.",
    "-- Values currently use the first listed skill level to match the existing RotationForge skill data.",
    "",
    "begin;",
    "",
    "alter table public.operator_skills",
    "    add column if not exists atk_multiplier numeric,",
    "    add column if not exists flat_damage numeric not null default 0,",
    "    add column if not exists hit_count smallint not null default 1,",
    "    add column if not exists damage_element text,",
    "    add column if not exists damage_verified boolean not null default false,",
    "    add column if not exists damage_source_url text,",
    "    add column if not exists raw_data jsonb not null default '{}'::jsonb,",
    "    add column if not exists updated_at timestamptz not null default now();",
    "",
    "with damage_profiles(operator_id, operator_slug, base_skill_name, skill_name, skill_name_pattern, short_type, atk_multiplier, hit_count, include_in_total, source_url, source_label) as (",
    "    values"
  ];

  entries.forEach((entry, index) => {
    const suffix = index === entries.length - 1 ? "" : ",";
    const sourceUrl = `${SOURCE_URL_BASE}${encodeURIComponent(entry.operator.wikiTitle.replace(/ /g, "_"))}`;
    lines.push(`        (${entry.operator.id}, ${sqlString(entry.operator.slug)}, ${sqlString(entry.baseSkillName)}, ${sqlString(entry.skillName)}, ${sqlString(entry.skillNamePattern)}, ${sqlString(entry.shortType)}, ${entry.atkMultiplier.toFixed(4)}, ${entry.hitCount}, ${entry.includeInTotal}, ${sqlString(sourceUrl)}, ${sqlString(entry.sourceLabel)})${suffix}`);
  });

  lines.push(
    ")",
    ", matched_components as (",
    "    select",
    "        skill.id as skill_id,",
    "        damage_profiles.*",
    "    from public.operator_skills as skill",
    "    join damage_profiles",
    "      on skill.operator_id = damage_profiles.operator_id",
    "     and (damage_profiles.short_type = '' or skill.short_type = damage_profiles.short_type or skill.skill_type ilike '%' || damage_profiles.short_type || '%')",
    "     and (",
    "         lower(skill.name) = lower(damage_profiles.base_skill_name)",
    "         or lower(skill.name) = lower(damage_profiles.skill_name)",
    "         or lower(skill.name) = lower(damage_profiles.skill_name_pattern)",
    "         or lower(skill.name) like '%' || lower(damage_profiles.skill_name_pattern) || '%'",
    "         or lower(damage_profiles.skill_name_pattern) like '%' || lower(skill.name) || '%'",
    "     )",
    ")",
    ", matched_profiles as (",
    "    select",
    "        skill_id,",
    "        sum(atk_multiplier) filter (where include_in_total) as atk_multiplier,",
    "        1::smallint as hit_count,",
    "        max(source_url) as source_url,",
    "        string_agg(source_label, ' + ' order by skill_name) filter (where include_in_total) as source_label",
    "    from matched_components",
    "    group by skill_id",
    "    having count(*) filter (where include_in_total) > 0",
    ")",
    "update public.operator_skills as skill",
    "set",
    "    atk_multiplier = matched_profiles.atk_multiplier,",
    "    flat_damage = 0,",
    "    hit_count = matched_profiles.hit_count,",
    "    damage_element = coalesce(skill.element_type, skill.raw_data->>'elementType'),",
    "    damage_verified = true,",
    "    damage_source_url = matched_profiles.source_url,",
    "    raw_data = jsonb_set(",
    "        jsonb_set(",
    "            skill.raw_data,",
    "            '{damageProfile}',",
    "            jsonb_build_object(",
    "                'atkMultiplier', matched_profiles.atk_multiplier,",
    "                'flatDamage', 0,",
    "                'hitCount', matched_profiles.hit_count,",
    "                'source', 'wiki.gg',",
    "                'sourceLabel', matched_profiles.source_label,",
    "                'skillLevel', 1",
    "            ),",
    "            true",
    "        ),",
    "        '{damageMultiplier}',",
    "        to_jsonb(matched_profiles.atk_multiplier * 100),",
    "        true",
    "    ),",
    "    updated_at = now()",
    "from matched_profiles",
    "where skill.id = matched_profiles.skill_id",
    ";",
    "",
    "-- Preserve legacy profiles that already store a percentage in raw_data.",
    "update public.operator_skills",
    "set",
    "    atk_multiplier = (raw_data->>'damageMultiplier')::numeric / 100,",
    "    flat_damage = 0,",
    "    hit_count = 1,",
    "    damage_element = coalesce(element_type, raw_data->>'elementType'),",
    "    damage_verified = false,",
    "    raw_data = jsonb_set(",
    "        raw_data,",
    "        '{damageProfile}',",
    "        jsonb_build_object(",
    "            'atkMultiplier', (raw_data->>'damageMultiplier')::numeric / 100,",
    "            'flatDamage', 0,",
    "            'hitCount', 1,",
    "            'source', 'legacy RotationForge data'",
    "        ),",
    "        true",
    "    ),",
    "    updated_at = now()",
    "where atk_multiplier is null",
    "  and jsonb_typeof(raw_data->'damageMultiplier') = 'number';",
    "",
    "commit;",
    "",
    "-- Verification:",
    "-- select operator_id, name, short_type, atk_multiplier, hit_count, damage_source_url",
    "-- from public.operator_skills",
    "-- where damage_source_url like 'https://endfield.wiki.gg/%'",
    "-- order by operator_id, slot_index;"
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const operators = parseSeedOperators();
  const entries = [];
  const missing = [];

  for (const operator of operators) {
    if (entries.length > 0) await sleep(REQUEST_DELAY_MS);
    const wikiText = await fetchWikiText(operator.wikiTitle);
    const operatorEntries = extractDamageEntries(operator, wikiText);
    if (operatorEntries.length === 0) missing.push(operator.name);
    entries.push(...operatorEntries);
  }

  fs.writeFileSync(OUTPUT_PATH, buildSql(entries));
  console.log(`Wrote ${entries.length} damage profile rows to ${OUTPUT_PATH}.`);
  if (missing.length) console.log(`No damage stats found for: ${missing.join(", ")}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
