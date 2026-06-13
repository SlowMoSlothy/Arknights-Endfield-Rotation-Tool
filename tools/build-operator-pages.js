import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const SITE_URL = "https://rotationforge.gg";
const BASE_PATH = "/endfield";
const OUTPUT_DIR = path.join(process.cwd(), "endfield", "operators");
const SITEMAP_PATH = path.join(process.cwd(), "sitemap.xml");
const SKILL_PAGE_SIZE = 1000;
const OPERATOR_ID_CHUNK_SIZE = 100;
const OPERATOR_SLUG_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export function createSupabaseClient(env = process.env) {
  const url = String(env.SUPABASE_URL || "").trim();
  const anonKey = String(env.SUPABASE_ANON_KEY || "").trim();
  const missing = [
    !url && "SUPABASE_URL",
    !anonKey && "SUPABASE_ANON_KEY"
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
  }

  return createClient(url, anonKey);
}

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

function normalizeKey(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function numberValue(input) {
  return input === null || input === undefined || input === "" ? "—" : String(input);
}

export function normalizeAssetPath(assetPath) {
  const value = String(assetPath || "").trim();
  if (!value) return "";

  const cleaned = value.replace(/^\/+/, "");
  return cleaned ? `${BASE_PATH}/${cleaned}` : "";
}

export function validateOperators(operators) {
  if (!Array.isArray(operators) || operators.length === 0) {
    throw new Error("Keine Operatoren gefunden.");
  }

  const slugs = new Set();
  const ids = new Set();

  for (const operator of operators) {
    const slug = String(operator?.slug || "");
    const name = String(operator?.name || "").trim();
    const id = operator?.id;

    if (!OPERATOR_SLUG_PATTERN.test(slug)) {
      throw new Error(`Ungültiger Operator-Slug: "${slug || "(leer)"}"`);
    }
    if (slugs.has(slug)) {
      throw new Error(`Doppelter Operator-Slug: "${slug}"`);
    }
    if (id === null || id === undefined || id === "") {
      throw new Error(`Operator "${slug}" hat keine ID.`);
    }
    if (ids.has(id)) {
      throw new Error(`Doppelte Operator-ID: "${id}"`);
    }
    if (!name) {
      throw new Error(`Operator "${slug}" hat keinen Namen.`);
    }

    slugs.add(slug);
    ids.add(id);
  }

  return operators;
}

function classIconPath(operatorClass) {
  const key = normalizeKey(operatorClass);
  const fileMap = {
    caster: "caster.webp",
    defender: "defender.webp",
    guard: "guard.webp",
    striker: "striker.webp",
    supporter: "supporter.webp",
    vanguard: "vanguard.webp"
  };
  return fileMap[key] ? `${BASE_PATH}/assets/ui/classes/${fileMap[key]}` : "";
}

function elementIconPath(elementType) {
  const key = normalizeKey(elementType);
  const fileMap = {
    cryo: "cryo.webp",
    electric: "electric.webp",
    heat: "heat.webp",
    nature: "nature.webp",
    physical: "physical.webp"
  };
  return fileMap[key] ? `${BASE_PATH}/assets/ui/elements/${fileMap[key]}` : "";
}

function iconMarkup(src, alt, fallback = "◆") {
  if (!src) return `<span class="info-icon text-icon">${escapeHtml(fallback)}</span>`;
  return `<img class="info-icon asset-icon" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="34" height="34">`;
}

function escapeXml(input) {
  return escapeHtml(input);
}

function skillElementKey(elementType) {
  const key = normalizeKey(elementType);
  const aliases = {
    fire: "heat",
    burn: "heat",
    ice: "cryo",
    frost: "cryo",
    electro: "electric",
    thunder: "electric",
    lightning: "electric",
    plant: "nature",
    poison: "nature",
    neutral: "physical"
  };
  const element = aliases[key] || key;
  return ["heat", "cryo", "electric", "nature", "physical"].includes(element)
    ? element
    : "neutral";
}

function skillFillMode(skill) {
  const type = normalizeKey(skill.skill_type);
  const shortType = normalizeKey(skill.short_type);
  return type === "ultimate" || shortType === "ult" ? "full" : "half";
}

function stars(count) {
  return "★".repeat(Number(count) || 0);
}

function stat(labelText, valueText, icon = "◆") {
  return `<div class="stat"><span class="stat-icon">${escapeHtml(icon)}</span><span class="stat-label">${escapeHtml(labelText)}</span><strong>${escapeHtml(numberValue(valueText))}</strong></div>`;
}

function info(labelText, valueText, iconHtml, extraClass = "") {
  return `<div class="info-card ${extraClass}">${iconHtml}<span class="info-label">${escapeHtml(labelText)}</span><strong>${escapeHtml(valueText)}</strong></div>`;
}

function pageUrlFor(operator) {
  return `${SITE_URL}${BASE_PATH}/operators/${operator.slug}/`;
}

function localPageUrlFor(operator) {
  return `${BASE_PATH}/operators/${operator.slug}/`;
}

function getRelatedOperators(current, allOperators) {
  return allOperators
    .filter((operator) => operator.id !== current.id)
    .map((operator) => {
      let score = 0;
      if (operator.operator_class === current.operator_class) score += 3;
      if (operator.element_type === current.element_type) score += 2;
      if (operator.weapon_type === current.weapon_type) score += 1;
      if (operator.main_attribute === current.main_attribute) score += 1;
      return { operator, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.operator.sort_order ?? 999) - (b.operator.sort_order ?? 999))
    .slice(0, 4)
    .map((entry) => entry.operator);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function englishList(values, conjunction = "and") {
  const items = uniqueValues(values);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items.at(-1)}`;
}

function effectLabel(value) {
  const rawValue = isPlainObject(value)
    ? value.name || value.effect || value.appliesEffect || value.id
    : value;
  if (!rawValue) return "";
  const key = normalizeKey(rawValue);
  const aliases = {
    arts_infliction: "Arts Infliction",
    arts_reaction: "Arts Reaction",
    auxiliary_crystal_used_up: "Auxiliary Crystal used up",
    combo_skill: "another Combo Skill",
    enemy_skill_charging: "an enemy charging a skill",
    final_strike: "Final Strike",
    operator_attacked: "the operator being attacked",
    operator_attacked_low_hp: "the operator being attacked at low HP",
    vulnerable: "Vulnerability"
  };
  return aliases[key] || formatLabel(rawValue);
}

function effectRequirement(trigger) {
  if (!isPlainObject(trigger)) return effectLabel(trigger);
  const label = effectLabel(trigger);
  const minStacks = Number(trigger.minStacks);
  if (!Number.isFinite(minStacks) || minStacks <= 1) return label;
  return `${minStacks} ${label} stacks`;
}

function describeTrigger(trigger, mode = "all") {
  if (Array.isArray(trigger)) {
    const conjunction = normalizeKey(mode) === "any" ? "or" : "and";
    return englishList(trigger.map((entry) => describeTrigger(entry, mode)), conjunction);
  }
  if (!isPlainObject(trigger)) return effectLabel(trigger);
  if (trigger.anyOf) {
    return `any of ${englishList(asArray(trigger.anyOf).map((entry) => describeTrigger(entry, "any")), "or")}`;
  }
  if (trigger.noneOf) {
    return `none of ${englishList(asArray(trigger.noneOf).map(effectLabel), "or")}`;
  }
  return effectRequirement(trigger);
}

function visibleEffectNames(skills, fields) {
  return uniqueValues(
    skills.flatMap((skill) => {
      const rawData = isPlainObject(skill.raw_data) ? skill.raw_data : {};
      return fields.flatMap((field) =>
        asArray(rawData[field])
          .filter((effect) => !isPlainObject(effect) || effect.visible !== false)
          .map(effectLabel)
      );
    })
  );
}

function numericValues(values) {
  return uniqueValues(
    values
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
      .map(String)
  );
}

function canonicalSkillType(skill) {
  const aliases = {
    bs: "battle_skill",
    battle: "battle_skill",
    cs: "combo_skill",
    combo: "combo_skill",
    fs: "final_strike",
    ult: "ultimate"
  };
  const values = [skill.skill_type, skill.short_type]
    .map(normalizeKey)
    .filter(Boolean);

  for (const value of values) {
    if (aliases[value]) return aliases[value];
    if (["battle_skill", "combo_skill", "final_strike", "ultimate"].includes(value)) {
      return value;
    }
  }

  return values[0] || "skill";
}

function featuredSkillNames(skills, limit = 3) {
  const selected = [];
  const selectedSkills = new Set();
  const priorities = ["battle_skill", "combo_skill", "ultimate"];

  for (const skillType of priorities) {
    const skill = skills.find(
      (entry) => canonicalSkillType(entry) === skillType && !selectedSkills.has(entry)
    );
    if (!skill?.name) continue;

    selected.push(formatValue(skill.name));
    selectedSkills.add(skill);
  }

  for (const skill of skills) {
    if (selected.length >= limit) break;
    if (!skill?.name || selectedSkills.has(skill)) continue;

    selected.push(formatValue(skill.name));
    selectedSkills.add(skill);
  }

  return uniqueValues(selected).slice(0, limit);
}

function buildRotationProfile(operator, skills) {
  const name = formatValue(operator.name);
  const skillNames = uniqueValues(skills.map((skill) => formatValue(skill.name, "")).filter(Boolean));
  const cooldowns = numericValues(
    skills.map((skill) => skill.cooldown).filter((value) => Number(value) > 0)
  );
  const spCosts = numericValues(
    skills.map((skill) => (isPlainObject(skill.raw_data) ? skill.raw_data.sp_cost : null))
  );
  const ultimateCosts = numericValues(
    skills
      .filter((skill) => canonicalSkillType(skill) === "ultimate")
      .map((skill) => skill.energy)
  );
  const appliedEffects = visibleEffectNames(skills, ["debuffs", "conditionalDebuffs"]);
  const buffs = visibleEffectNames(skills, ["buffs"]);
  const consumedEffects = uniqueValues(
    skills.flatMap((skill) => {
      const rawData = isPlainObject(skill.raw_data) ? skill.raw_data : {};
      return asArray(rawData.consumeDebuffs).map(effectLabel);
    })
  );
  const comboSkills = skills.filter(
    (skill) => canonicalSkillType(skill) === "combo_skill"
  );

  const timingParts = [];
  if (cooldowns.length === 1) {
    timingParts.push(`The stored cooldown is ${cooldowns[0]} seconds.`);
  } else if (cooldowns.length > 1) {
    timingParts.push(`Stored cooldowns range from ${cooldowns[0]} to ${cooldowns.at(-1)} seconds.`);
  }
  if (spCosts.length > 0) {
    timingParts.push(`Listed Battle Skill SP costs are ${englishList(spCosts)}.`);
  }
  if (ultimateCosts.length > 0) {
    timingParts.push(
      ultimateCosts.length === 1
        ? `The listed Ultimate Energy cost is ${ultimateCosts[0]}.`
        : `The listed Ultimate Energy costs are ${englishList(ultimateCosts)}.`
    );
  }
  const timingText = timingParts.length > 0
    ? timingParts.join(" ")
    : `The current database does not assign fixed cooldown or resource values to ${name}'s listed skills.`;

  const interactionParts = comboSkills.map((skill) => {
    const rawData = isPlainObject(skill.raw_data) ? skill.raw_data : {};
    const trigger = rawData.comboTriggers || rawData.comboTrigger || skill.combo_trigger;
    if (!trigger) return `${skill.name} has no structured trigger stored yet.`;
    const mode = rawData.comboTriggerMode || skill.combo_trigger_mode || "all";
    return `${skill.name} requires ${describeTrigger(trigger, mode)}.`;
  });
  if (appliedEffects.length > 0) {
    interactionParts.push(`Visible effects in the kit include ${englishList(appliedEffects)}.`);
  }
  if (buffs.length > 0) {
    interactionParts.push(`Listed buffs include ${englishList(buffs)}.`);
  }
  if (consumedEffects.length > 0) {
    interactionParts.push(`The skill data also consumes ${englishList(consumedEffects)}.`);
  }
  const interactionText = interactionParts.length > 0
    ? interactionParts.join(" ")
    : `No structured Combo Skill trigger or visible persistent effect is stored for ${name} yet.`;

  const signatureSkills = featuredSkillNames(skills);
  const aboutParts = [
    `${name} is a ${operator.star}-star ${formatLabel(operator.element_type)} ${formatLabel(operator.operator_class)} operator using ${formatLabel(operator.weapon_type)}.`
  ];
  if (operator.main_attribute && operator.secondary_attribute) {
    aboutParts.push(
      `The database lists ${formatLabel(operator.main_attribute)} as the main attribute and ${formatLabel(operator.secondary_attribute)} as the secondary attribute.`
    );
  } else if (operator.main_attribute) {
    aboutParts.push(`The database lists ${formatLabel(operator.main_attribute)} as the main attribute.`);
  }
  if (signatureSkills.length > 0) {
    aboutParts.push(`Key listed skills include ${englishList(signatureSkills)}.`);
  }

  return {
    aboutText: aboutParts.join(" "),
    timingText,
    interactionText,
    skillNames
  };
}

function profileCard(label, title, body) {
  return `<article class="profile-card">
    <span class="profile-label">${escapeHtml(label)}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(body)}</p>
  </article>`;
}

function metaDescriptionFor(operator) {
  const name = formatValue(operator.name);
  const text = `Arknights: Endfield ${name} rotation guide with skill order, combo triggers, cooldowns, SP costs, effects, stats and a direct link to the rotation planner.`;
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, "")}...`;
}

function skillCard(skill) {
  const iconPath = skill.icon_small_path || skill.icon_path;
  const icon = iconPath ? normalizeAssetPath(iconPath) : "";
  const elementIcon = elementIconPath(skill.element_type);
  const skillElement = skillElementKey(skill.element_type);
  const fillMode = skillFillMode(skill);
  const skillType = formatLabel(skill.skill_type || skill.short_type || "Skill");
  const description = formatValue(skill.description, "No description available yet.");

  return `<article class="skill-card skill-element-${skillElement}">
    <div class="skill-head">
      <div class="skill-icon-wrap">
        <div class="ef-skill-icon ef-element-${skillElement} ef-fill-${fillMode}">
          <span class="ef-skill-fill"></span>
          <span class="ef-skill-ring"></span>
          <span class="ef-skill-glyph-wrap">${icon ? `<img class="ef-skill-glyph" src="${escapeHtml(icon)}" alt="${escapeHtml(skill.name)} icon" loading="lazy">` : `<span class="skill-placeholder">${escapeHtml(String(skill.slot_index ?? "?"))}</span>`}</span>
        </div>
      </div>
      <div>
        <span class="skill-type">${escapeHtml(skillType)}</span>
        <h3>${escapeHtml(skill.name)}</h3>
      </div>
    </div>
    <div class="skill-meta">
      ${skill.cooldown !== null && skill.cooldown !== undefined ? `<span>Cooldown: <strong>${escapeHtml(skill.cooldown)}s</strong></span>` : ""}
      ${skill.energy !== null && skill.energy !== undefined ? `<span>Energy: <strong>${escapeHtml(skill.energy)}</strong></span>` : ""}
      ${skill.element_type ? `<span>${elementIcon ? `<img src="${escapeHtml(elementIcon)}" alt="" loading="lazy">` : ""}${escapeHtml(formatLabel(skill.element_type))}</span>` : ""}
    </div>
    <p>${escapeHtml(description)}</p>
  </article>`;
}

function relatedCard(operator) {
  const avatar = normalizeAssetPath(operator.icon_path);
  const classIcon = classIconPath(operator.operator_class);
  const elementIcon = elementIconPath(operator.element_type);
  const avatarMarkup = avatar
    ? `<img class="related-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(operator.name)}" loading="lazy">`
    : `<span class="related-avatar avatar-placeholder" role="img" aria-label="No image available for ${escapeHtml(operator.name)}">RF</span>`;

  return `<a class="related-card" href="${localPageUrlFor(operator)}">
    ${avatarMarkup}
    <div>
      <strong>${escapeHtml(operator.name)}</strong>
      <span>${escapeHtml(formatLabel(operator.operator_class))} · ${escapeHtml(formatLabel(operator.element_type))}</span>
      <span class="related-icons">${classIcon ? `<img src="${escapeHtml(classIcon)}" alt="" loading="lazy">` : ""}${elementIcon ? `<img src="${escapeHtml(elementIcon)}" alt="" loading="lazy">` : ""}</span>
    </div>
  </a>`;
}

function indexCard(operator) {
  const avatar = normalizeAssetPath(operator.icon_path);
  const classIcon = classIconPath(operator.operator_class);
  const elementIcon = elementIconPath(operator.element_type);
  const avatarMarkup = avatar
    ? `<img class="tile-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(operator.name)}" loading="lazy">`
    : `<span class="tile-avatar avatar-placeholder" role="img" aria-label="No image available for ${escapeHtml(operator.name)}">RF</span>`;

  return `<a class="operator-tile" href="${localPageUrlFor(operator)}">
    ${avatarMarkup}
    <div class="tile-body">
      <span class="tile-stars">${stars(operator.star)}</span>
      <h2>${escapeHtml(operator.name)}</h2>
      <p>${escapeHtml(formatLabel(operator.operator_class))} · ${escapeHtml(formatLabel(operator.element_type))}</p>
      <div class="tile-icons">${classIcon ? `<img src="${escapeHtml(classIcon)}" alt="" loading="lazy">` : ""}${elementIcon ? `<img src="${escapeHtml(elementIcon)}" alt="" loading="lazy">` : ""}</div>
    </div>
  </a>`;
}

function baseStyles() {
  return `<style>
    :root{color-scheme:dark;--stone:#7E807C;--olive:#657136;--yellow:#F8F546;--silver:#A0AAA9;--charcoal:#313739;--charcoal-2:#252c2e;--charcoal-3:#1d2325;--text:#f6f7f0;--muted:#A0AAA9;--border:rgba(160,170,169,.28);--panel:rgba(49,55,57,.86);--panel-soft:rgba(126,128,124,.14);--shadow:0 28px 90px rgba(0,0,0,.42)}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 18% 0%,rgba(160,170,169,.22),transparent 32rem),radial-gradient(circle at 82% 8%,rgba(248,245,70,.14),transparent 34rem),linear-gradient(135deg,#313739,#252c2e 52%,#181d1f)}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.15;background-image:linear-gradient(rgba(160,170,169,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(160,170,169,.18) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,#000,transparent 75%)}a{color:inherit;text-decoration:none}.top{position:sticky;top:0;z-index:5;border-bottom:1px solid rgba(160,170,169,.20);background:rgba(37,44,46,.82);backdrop-filter:blur(14px)}.nav{width:min(1280px,calc(100% - 32px));height:66px;margin:0 auto;display:flex;align-items:center;gap:24px}.brand{display:flex;align-items:center;gap:12px;font-weight:950;font-size:1.08rem}.mark{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:#313739;background:var(--yellow);box-shadow:0 0 24px rgba(248,245,70,.22)}.tool-name{color:var(--text);padding-left:20px;border-left:1px solid rgba(160,170,169,.25)}.nav-links{margin-left:auto;display:flex;align-items:center;gap:28px;color:var(--text);font-weight:800;font-size:.92rem}.nav-cta{color:#313739;background:var(--yellow);border-radius:10px;padding:12px 18px;box-shadow:0 14px 30px rgba(248,245,70,.16)}.page{width:min(1280px,calc(100% - 32px));margin:0 auto;padding:28px 0 64px}.breadcrumbs{display:flex;gap:10px;align-items:center;color:var(--muted);font-weight:700;font-size:.92rem;margin:0 0 28px}.breadcrumbs strong{color:var(--text)}.button{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 20px;border-radius:10px;font-weight:950}.primary{color:#313739;background:var(--yellow);box-shadow:0 16px 34px rgba(248,245,70,.18)}.secondary{background:rgba(126,128,124,.18);border:1px solid rgba(160,170,169,.25)}.panel{border:1px solid var(--border);border-radius:12px;background:rgba(49,55,57,.84);box-shadow:var(--shadow);padding:24px}.panel h2{margin:0 0 18px;font-size:1.35rem}.panel h2 span{color:var(--silver)}footer{margin-top:30px;text-align:center;color:rgba(160,170,169,.82);font-size:.9rem}
    .hero{display:grid;grid-template-columns:420px minmax(0,1fr) 410px;gap:34px;align-items:center}.portrait-card{position:relative;min-height:430px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:linear-gradient(135deg,rgba(126,128,124,.32),rgba(49,55,57,.92));box-shadow:var(--shadow)}.portrait-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:18px;background:var(--yellow)}.portrait-card:after{content:"ENDFIELD";position:absolute;left:34px;top:24px;color:#fff;font-size:.8rem;font-weight:950;letter-spacing:.18em}.portrait{position:absolute;left:50%;top:50%;width:min(330px,82%);max-height:330px;object-fit:contain;transform:translate(-50%,-45%);filter:drop-shadow(0 28px 26px rgba(0,0,0,.42))}.barcode{position:absolute;left:30px;bottom:22px;color:#313739;background:var(--yellow);writing-mode:vertical-rl;font-size:.58rem;font-weight:900;letter-spacing:.1em;padding:8px 4px;border-radius:3px}.hero-copy{min-width:0;padding:8px 0}.eyebrow{color:var(--yellow);font-size:.8rem;font-weight:950;letter-spacing:.44em;text-transform:uppercase;margin-bottom:24px}h1{margin:0;font-size:clamp(4rem,7vw,6.2rem);line-height:.9;letter-spacing:-.08em;text-shadow:0 18px 45px rgba(0,0,0,.32)}.operator-name{display:block;max-width:100%;white-space:nowrap}.stars{margin-top:18px;color:var(--yellow);font-size:2rem;letter-spacing:.08em}.subtitle{max-width:560px;margin:22px 0 0;color:#d7ddd9;line-height:1.8;font-size:1.05rem}.actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}.info-panel{border:1px solid var(--border);border-radius:14px;background:rgba(49,55,57,.82);box-shadow:var(--shadow);padding:22px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.info-card{position:relative;min-height:104px;padding:22px 18px 18px 64px;border-radius:9px;background:linear-gradient(135deg,rgba(160,170,169,.14),rgba(126,128,124,.12));border:1px solid rgba(160,170,169,.14)}.info-icon{position:absolute;left:18px;top:28px;width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.35))}.text-icon{display:grid;place-items:center;color:var(--silver);font-size:1.35rem}.info-label{display:block;color:var(--silver);font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.info-card strong{display:block;margin-top:9px;font-size:1.12rem}.rarity{grid-column:1/-1;background:linear-gradient(135deg,rgba(101,113,54,.48),rgba(248,245,70,.12));border-color:rgba(248,245,70,.25);padding-left:22px}.rarity .star-line{color:var(--yellow);font-size:1.65rem;letter-spacing:.08em;margin-top:10px}.meta-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:30px;border:1px solid var(--border);border-radius:10px;background:linear-gradient(135deg,rgba(126,128,124,.30),rgba(49,55,57,.82));overflow:hidden}.meta-item{padding:28px 34px;display:grid;grid-template-columns:42px 1fr;gap:14px;align-items:center}.meta-item+.meta-item{border-left:1px solid rgba(160,170,169,.24)}.meta-icon{font-size:1.65rem;color:var(--silver)}.meta-label{display:block;color:var(--yellow);font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.meta-value{display:block;margin-top:6px;font-weight:900}.lower{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-top:24px}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat{position:relative;min-height:78px;border:1px solid rgba(160,170,169,.20);border-radius:7px;background:rgba(126,128,124,.10);padding:16px 14px 12px 54px}.stat-icon{position:absolute;left:18px;top:27px;color:#e5e9e4;font-size:1.3rem}.stat-label{display:block;color:var(--silver);font-size:.76rem;font-weight:850;text-transform:uppercase}.stat strong{display:block;margin-top:4px;font-size:1.35rem}.attribute-title{margin:24px 0 14px;font-size:1.25rem;font-weight:950}.highlight{margin-top:16px;border:1px solid rgba(248,245,70,.22);border-radius:8px;background:linear-gradient(135deg,rgba(101,113,54,.48),rgba(248,245,70,.10));padding:18px;color:#eef1e8}.about{position:relative;overflow:hidden}.about:after{content:"A";position:absolute;right:26px;bottom:-38px;color:rgba(160,170,169,.06);font-size:12rem;font-weight:950}.about p{position:relative;margin:0;color:#d7ddd9;line-height:1.75}
    .profile-section,.skills-section,.related-section{margin-top:24px}.profile-heading{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:18px}.profile-heading h2{margin-bottom:0}.profile-heading p{max-width:440px;margin:0;color:var(--muted);line-height:1.55;text-align:right}.profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.profile-card{position:relative;min-height:190px;border:1px solid rgba(160,170,169,.20);border-radius:10px;background:linear-gradient(145deg,rgba(126,128,124,.16),rgba(37,44,46,.72));padding:20px;overflow:hidden}.profile-card:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--yellow),transparent)}.profile-label{display:block;color:var(--yellow);font-size:.68rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.profile-card h3{margin:8px 0 10px;font-size:1.02rem}.profile-card p{margin:0;color:#d7ddd9;line-height:1.65;font-size:.92rem}.skills-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.skill-card{border:1px solid rgba(160,170,169,.20);border-radius:12px;background:linear-gradient(135deg,rgba(126,128,124,.13),rgba(49,55,57,.70));padding:18px}.skill-head{display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center}.skill-icon-wrap{width:58px;height:58px;border-radius:10px;border:1px solid rgba(160,170,169,.22);background:rgba(0,0,0,.18);display:grid;place-items:center}.skill-icon{width:52px;height:52px;object-fit:contain}.skill-placeholder{color:var(--yellow);font-weight:950}.skill-type{color:var(--yellow);font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.skill-card h3{margin:4px 0 0}.skill-meta{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.skill-meta span{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(160,170,169,.18);border-radius:999px;padding:6px 9px;color:#dfe4df;background:rgba(126,128,124,.10);font-size:.82rem}.skill-meta img{width:18px;height:18px}.skill-card p{margin:0;color:#d7ddd9;line-height:1.65}.related-grid,.operator-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.related-card,.operator-tile{border:1px solid rgba(160,170,169,.20);border-radius:12px;background:linear-gradient(135deg,rgba(126,128,124,.14),rgba(49,55,57,.78));padding:14px;transition:transform .16s ease,border-color .16s ease}.related-card:hover,.operator-tile:hover{transform:translateY(-2px);border-color:rgba(248,245,70,.42)}.related-card{display:grid;grid-template-columns:58px 1fr;gap:13px;align-items:center}.related-avatar{width:58px;height:58px;object-fit:contain}.avatar-placeholder{display:grid;place-items:center;border:1px solid rgba(160,170,169,.25);border-radius:10px;color:var(--yellow);background:linear-gradient(135deg,rgba(101,113,54,.36),rgba(37,44,46,.94));font-weight:950;letter-spacing:.08em}.portrait-placeholder{position:absolute;left:50%;top:50%;width:min(260px,72%);aspect-ratio:1;transform:translate(-50%,-45%);font-size:3rem}.related-card strong,.operator-tile h2{display:block}.related-card span,.operator-tile p{display:block;color:var(--muted);font-size:.9rem;margin-top:4px}.related-card .avatar-placeholder{color:var(--yellow);font-size:.8rem;margin-top:0}.related-icons,.tile-icons{display:flex;gap:8px;margin-top:8px}.related-icons img,.tile-icons img{width:22px;height:22px;object-fit:contain}.index-hero{padding:54px;border:1px solid var(--border);border-radius:16px;background:linear-gradient(135deg,rgba(101,113,54,.40),rgba(49,55,57,.90));box-shadow:var(--shadow);margin-bottom:24px}.index-hero h1{font-size:clamp(3rem,6vw,5rem)}.index-hero p{max-width:760px;color:#d7ddd9;line-height:1.75}.operator-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.operator-tile{min-height:260px}.tile-avatar{width:100%;height:132px;object-fit:contain;filter:drop-shadow(0 16px 18px rgba(0,0,0,.35))}.tile-stars{display:block;color:var(--yellow);margin-top:8px}.tile-body h2{margin:6px 0 0;font-size:1.05rem}.tile-body p{margin:5px 0 0;color:var(--muted)}
    .skill-card{--skill-element:140,140,140;background:radial-gradient(circle at 5% 0%,rgba(var(--skill-element),.18),transparent 34%),linear-gradient(135deg,rgba(126,128,124,.13),rgba(49,55,57,.70));border-color:rgba(var(--skill-element),.28)}.skill-element-heat{--skill-element:239,75,67}.skill-element-cryo{--skill-element:90,184,255}.skill-element-electric{--skill-element:240,211,74}.skill-element-nature{--skill-element:88,209,122}.skill-element-physical{--skill-element:185,185,185}.skill-icon-wrap{width:64px;height:64px;border:0;background:transparent;display:grid;place-items:center}.ef-skill-icon{--ef-size:60px;--ef-bg-color:#8c8c8c;position:relative;width:var(--ef-size);height:var(--ef-size);border-radius:50%;overflow:hidden;flex:0 0 auto;filter:drop-shadow(0 7px 9px rgba(0,0,0,.32))}.ef-skill-fill,.ef-skill-ring,.ef-skill-glyph-wrap{position:absolute}.ef-skill-ring,.ef-skill-glyph-wrap{inset:0}.ef-skill-ring{border:2px solid rgba(255,255,255,.9);border-radius:50%;z-index:3}.ef-skill-glyph-wrap{display:flex;align-items:center;justify-content:center;z-index:2}.ef-skill-glyph{display:block;width:72%;height:72%;object-fit:contain}.ef-fill-half .ef-skill-fill{left:50%;top:52%;width:122%;height:122%;transform:translateX(-50%);border-radius:50%;background:var(--ef-bg-color);z-index:1}.ef-fill-full .ef-skill-fill{inset:0;border-radius:50%;background:var(--ef-bg-color);z-index:1}.ef-element-heat{--ef-bg-color:#ef4b43}.ef-element-cryo{--ef-bg-color:#5ab8ff}.ef-element-electric{--ef-bg-color:#f0d34a}.ef-element-nature{--ef-bg-color:#58d17a}.ef-element-physical{--ef-bg-color:#b9b9b9}.ef-element-neutral{--ef-bg-color:#8c8c8c}
    @media(min-width:761px){.operator-index .nav{height:56px;gap:18px}.operator-index .brand{gap:10px;font-size:.98rem}.operator-index .mark{width:32px;height:32px;border-radius:7px}.operator-index .tool-name{padding-left:16px;font-size:.9rem}.operator-index .nav-links{gap:22px;font-size:.84rem}.operator-index .nav-cta{padding:10px 15px;border-radius:9px}.operator-index .page{padding:18px 0 56px}.operator-index .breadcrumbs{gap:9px;margin-bottom:16px;font-size:.84rem}.operator-index .index-hero{padding:28px 36px;margin-bottom:18px;border-radius:14px}.operator-index .index-hero .eyebrow{margin-bottom:12px;font-size:.7rem}.operator-index .index-hero h1{font-size:clamp(2.5rem,4.5vw,4rem);line-height:.96}.operator-index .index-hero p{max-width:900px;margin:14px 0 0;line-height:1.55;font-size:.96rem}.operator-index .index-hero .actions{margin-top:18px}.operator-index .index-hero .button{min-height:44px;padding:0 18px;font-size:.9rem}.operator-page .nav{width:min(1120px,calc(100% - 32px));height:56px;gap:18px}.operator-page .brand{gap:10px;font-size:.96rem}.operator-page .mark{width:32px;height:32px;border-radius:7px}.operator-page .tool-name{padding-left:16px;font-size:.9rem}.operator-page .nav-links{gap:22px;font-size:.84rem}.operator-page .nav-cta{padding:10px 15px;border-radius:9px}.operator-page .page{width:min(1120px,calc(100% - 32px));padding:20px 0 48px}.operator-page .breadcrumbs{gap:9px;margin-bottom:20px;font-size:.82rem}.operator-page .button{min-height:42px;padding:0 17px;border-radius:9px;font-size:.88rem}.operator-page .panel{padding:20px;border-radius:11px}.operator-page .panel h2{margin-bottom:14px;font-size:1.15rem}.operator-page footer{margin-top:24px;font-size:.78rem}
    .operator-page .hero{grid-template-columns:320px minmax(0,1fr);grid-template-areas:"portrait copy" "portrait info";column-gap:28px;row-gap:18px;align-items:start}.operator-page .portrait-card{grid-area:portrait;min-height:420px;border-radius:14px}.operator-page .portrait-card:before{width:14px}.operator-page .portrait-card:after{left:30px;top:22px;font-size:.72rem}.operator-page .portrait{width:min(300px,88%);max-height:330px}.operator-page .barcode{left:22px;bottom:24px;font-size:.56rem;padding:7px 5px}.operator-page .hero-copy{grid-area:copy;padding:10px 0 0}.operator-page .eyebrow{margin-bottom:14px;font-size:.68rem;letter-spacing:.38em}.operator-page h1{font-size:clamp(3.5rem,5vw,5rem);line-height:.92}.operator-page .stars{margin-top:12px;font-size:1.55rem}.operator-page .subtitle{max-width:680px;margin-top:16px;line-height:1.65;font-size:.94rem}.operator-page .actions{gap:10px;margin-top:20px}.operator-page .info-panel{grid-area:info;padding:12px;border-radius:12px}.operator-page .info-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.operator-page .info-card{min-height:78px;padding:14px 8px 11px 42px;border-radius:8px}.operator-page .info-icon{left:11px;top:23px;width:23px;height:23px}.operator-page .text-icon{font-size:1rem}.operator-page .info-label{font-size:.58rem}.operator-page .info-card strong{margin-top:6px;font-size:.84rem}.operator-page .meta-strip{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:20px;border-radius:10px}.operator-page .meta-item{padding:18px 22px;grid-template-columns:30px 1fr;gap:10px}.operator-page .meta-item+.meta-item{border-left:1px solid rgba(160,170,169,.24);border-top:0}.operator-page .meta-icon{font-size:1.2rem}.operator-page .meta-label{font-size:.58rem}.operator-page .meta-value{margin-top:4px;font-size:.84rem}.operator-page .lower{gap:18px;margin-top:18px}.operator-page .stats-grid{gap:10px}.operator-page .stat{min-height:66px;padding:13px 10px 10px 43px}.operator-page .stat-icon{left:14px;top:23px;font-size:1rem}.operator-page .stat-label{font-size:.58rem}.operator-page .stat strong{font-size:1rem}.operator-page .attribute-title{margin:18px 0 11px;font-size:1rem}.operator-page .about{font-size:.9rem}.operator-page .profile-section,.operator-page .skills-section,.operator-page .related-section{margin-top:18px}.operator-page .profile-card{min-height:175px;padding:17px}.operator-page .skills-grid{gap:12px}.operator-page .skill-card{padding:15px}}
    @media(min-width:981px){.operator-index .page{padding-top:14px}.operator-index .breadcrumbs{margin-bottom:12px}.operator-index .index-hero{display:grid;grid-template-columns:1fr;grid-template-areas:"eyebrow" "title" "copy";row-gap:7px;padding:20px 28px;margin-bottom:14px;border-radius:12px}.operator-index .index-hero .eyebrow{grid-area:eyebrow;margin:0;font-size:.64rem;letter-spacing:.34em}.operator-index .index-hero h1{grid-area:title;font-size:clamp(2rem,3.2vw,3rem);line-height:1}.operator-index .index-hero p{grid-area:copy;max-width:1050px;margin:2px 0 0;line-height:1.45;font-size:.9rem}}
    @media(min-width:761px) and (max-width:980px){.operator-index .page{padding-top:14px}.operator-index .breadcrumbs{margin-bottom:12px}.operator-index .index-hero{padding:20px 28px;margin-bottom:14px}.operator-index .index-hero .eyebrow{margin-bottom:8px;font-size:.64rem}.operator-index .index-hero h1{font-size:clamp(2rem,5vw,2.8rem);line-height:1}.operator-index .index-hero p{margin-top:10px;line-height:1.45;font-size:.9rem}}
    @media(max-width:1120px){.hero{grid-template-columns:1fr 1fr}.portrait-card{grid-row:1}.hero-copy{grid-column:1/-1;grid-row:2}.info-panel{grid-column:2;grid-row:1}.lower{grid-template-columns:1fr}.meta-strip{grid-template-columns:1fr}.meta-item+.meta-item{border-left:0;border-top:1px solid rgba(160,170,169,.24)}.operator-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.nav{height:auto;align-items:flex-start;flex-direction:column;padding:16px 0}.tool-name{border-left:0;padding-left:0}.nav-links{margin-left:0;gap:14px;flex-wrap:wrap}.hero{grid-template-columns:1fr}.info-panel,.portrait-card,.hero-copy{grid-column:auto;grid-row:auto}.profile-heading{display:block}.profile-heading p{max-width:none;margin-top:8px;text-align:left}.profile-grid{grid-template-columns:1fr}.stats-grid,.info-grid,.skills-grid,.related-grid{grid-template-columns:1fr 1fr}.operator-page .weapon-card{grid-column:1/-1}h1{font-size:3.5rem}.operator-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.page,.nav{width:min(100% - 20px,1280px)}.stats-grid,.info-grid,.skills-grid,.related-grid,.operator-grid{grid-template-columns:1fr}.portrait-card{min-height:340px}.button{width:100%}.meta-item{padding:22px}.panel,.index-hero{padding:18px}.nav-links{width:100%}.nav-cta{width:100%;text-align:center}}
    @media(min-width:761px) and (max-width:1000px){.operator-page .nav,.operator-page .page{width:min(860px,calc(100% - 32px))}.operator-page .hero{grid-template-columns:280px minmax(0,1fr);grid-template-areas:"portrait copy" "info info"}.operator-page .portrait-card{min-height:360px}.operator-page .portrait{max-height:285px}.operator-page h1{font-size:clamp(3rem,7vw,4rem)}}
    @media(min-width:1001px){.operator-page .page{padding-top:16px}.operator-page .breadcrumbs{margin-bottom:14px}.operator-page .hero{grid-template-columns:250px minmax(0,1fr);grid-template-areas:"portrait copy" "portrait info";column-gap:22px;row-gap:12px}.operator-page .portrait-card{min-height:330px;border-radius:12px}.operator-page .portrait-card:before{width:11px}.operator-page .portrait-card:after{left:25px;top:18px;font-size:.64rem}.operator-page .portrait{width:min(245px,88%);max-height:275px}.operator-page .barcode{left:17px;bottom:18px;font-size:.5rem;padding:6px 4px}.operator-page .hero-copy{padding:4px 0 0}.operator-page .eyebrow{margin-bottom:9px;font-size:.62rem}.operator-page h1{font-size:clamp(3rem,4vw,4.25rem);line-height:.94}.operator-page .stars{margin-top:8px;font-size:1.35rem}.operator-page .subtitle{max-width:780px;margin-top:12px;line-height:1.5;font-size:.9rem}.operator-page .actions{gap:9px;margin-top:14px}.operator-page .button{min-height:40px;padding:0 15px;font-size:.84rem}.operator-page .info-panel{padding:8px;border-radius:10px}.operator-page .info-grid{gap:5px}.operator-page .info-card{min-height:64px;padding:10px 7px 8px 38px;border-radius:7px}.operator-page .info-icon{left:9px;top:20px;width:21px;height:21px}.operator-page .text-icon{font-size:.92rem}.operator-page .info-label{font-size:.52rem;letter-spacing:.1em}.operator-page .info-card strong{margin-top:4px;font-size:.78rem}.operator-page .meta-strip{margin-top:14px}.operator-page .meta-item{padding:12px 18px}.operator-page .lower{margin-top:14px}}
    @media(min-width:761px) and (max-width:1000px){.operator-page .hero{grid-template-columns:240px minmax(0,1fr);column-gap:20px;row-gap:12px}.operator-page .portrait-card{min-height:320px}.operator-page .portrait{width:min(230px,88%);max-height:260px}.operator-page .hero-copy{padding-top:3px}.operator-page .eyebrow{margin-bottom:9px}.operator-page h1{font-size:clamp(2.8rem,6vw,3.7rem)}.operator-page .stars{margin-top:8px}.operator-page .subtitle{margin-top:12px;line-height:1.5}.operator-page .actions{margin-top:14px}.operator-page .info-panel{padding:8px}.operator-page .info-card{min-height:66px;padding-top:11px;padding-bottom:9px}.operator-page .meta-strip{margin-top:14px}.operator-page .meta-item{padding:13px 18px}.operator-page .lower{margin-top:14px}}
    html{scroll-behavior:smooth}.tool-name-short{display:none}a:focus-visible{outline:3px solid var(--yellow);outline-offset:3px;border-radius:5px}.operator-page .section-nav{display:flex;align-items:center;gap:6px;margin:-4px 0 12px;overflow-x:auto;scrollbar-width:none}.operator-page .section-nav::-webkit-scrollbar{display:none}.operator-page .section-nav a{flex:0 0 auto;border:1px solid rgba(160,170,169,.24);border-radius:999px;padding:6px 11px;color:#d2d9d5;background:rgba(37,44,46,.55);font-size:.7rem;font-weight:850;letter-spacing:.04em}.operator-page .section-nav a:hover{border-color:rgba(248,245,70,.52);color:var(--yellow)}.operator-page #rotation-profile,.operator-page #stats,.operator-page #skills,.operator-page #related{scroll-margin-top:72px}.operator-page .subtitle,.operator-page .profile-heading p,.operator-page .profile-card p,.operator-page .skill-card p,.operator-page .related-card span{color:#c8d0cc}.operator-page .rotation-guide-label{display:block;margin-top:.35rem;color:var(--yellow);font-size:.25em;font-weight:950;letter-spacing:.12em;line-height:1;text-transform:uppercase;text-shadow:none}.operator-page .hero-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;max-width:520px;margin-top:12px}.operator-page .hero-stats .stat{min-height:52px;padding:9px 8px 7px 36px;border-radius:7px;background:linear-gradient(135deg,rgba(101,113,54,.30),rgba(49,55,57,.72))}.operator-page .hero-stats .stat-icon{left:12px;top:18px;font-size:.85rem}.operator-page .hero-stats .stat-label{font-size:.5rem}.operator-page .hero-stats .stat strong{margin-top:2px;font-size:.82rem}.operator-page .overview-section{margin-top:14px;padding:16px}.operator-page .overview-section .profile-heading{margin-bottom:10px;align-items:center}.operator-page .overview-section .profile-heading p{max-width:520px;font-size:.78rem;line-height:1.4}.operator-page .overview-section .profile-grid{gap:8px}.operator-page .overview-section .profile-card{min-height:126px;padding:14px}.operator-page .overview-section .profile-card h3{margin:6px 0 7px;font-size:.9rem}.operator-page .overview-section .profile-card p{font-size:.78rem;line-height:1.45}.operator-page .lower{margin-top:14px}.operator-page footer{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}.operator-page .database-ref{color:rgba(190,200,196,.72)}
    @media(min-width:1001px){.operator-page .hero{grid-template-columns:220px minmax(0,1fr);column-gap:20px;row-gap:10px}.operator-page .portrait-card{min-height:318px}.operator-page .portrait{width:min(215px,90%);max-height:270px}.operator-page .hero-copy{padding-top:2px}.operator-page h1{font-size:clamp(2.75rem,3.5vw,3.7rem)}.operator-page .subtitle{max-width:820px;margin-top:9px;line-height:1.42;font-size:.84rem}.operator-page .actions{margin-top:10px}.operator-page .button{min-height:38px}.operator-page .info-panel{padding:7px}.operator-page .info-card{min-height:58px;padding-top:8px;padding-bottom:7px}.operator-page .info-icon{top:17px}.operator-page .lower .panel{padding:16px}.operator-page .lower .stat{min-height:58px;padding-top:11px;padding-bottom:8px}}
    @media(min-width:761px) and (max-width:1000px){.operator-page .hero{grid-template-columns:210px minmax(0,1fr);grid-template-areas:"portrait copy" "info info"}.operator-page .portrait-card{min-height:290px}.operator-page .portrait{width:min(205px,88%);max-height:245px}.operator-page .hero-stats{max-width:none}.operator-page .overview-section{margin-top:12px}}
    @media(max-width:760px){.operator-page .nav{height:58px;padding:0;flex-direction:row;align-items:center;gap:9px}.operator-page .brand{flex:0 0 auto;gap:8px;font-size:.88rem}.operator-page .mark{width:32px;height:32px;border-radius:7px}.operator-page .tool-name{min-width:0;margin-left:auto;padding-left:9px;border-left:1px solid rgba(160,170,169,.25);font-size:.7rem;white-space:nowrap}.operator-page .tool-name-full{display:none}.operator-page .tool-name-short{display:inline}.operator-page .breadcrumbs{margin-bottom:10px}.operator-page .section-nav{margin-bottom:14px}.operator-page .rotation-guide-label{font-size:.3em}.operator-page .hero-stats{max-width:none}.operator-page .overview-section{padding:16px}.operator-page .overview-section .profile-heading p{text-align:left}.operator-page footer{display:block}.operator-page .database-ref{display:block;margin-top:5px}}
    @media(max-width:520px){.operator-page .brand{font-size:.82rem}.operator-page .tool-name{font-size:.66rem}.operator-page .hero-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.operator-page .hero-stats .stat{padding-left:30px}.operator-page .hero-stats .stat-icon{left:9px}.operator-page .overview-section .profile-card{min-height:auto}}
    .operator-page .portrait-media{position:absolute;left:20px;right:10px;top:50%;z-index:1;aspect-ratio:1;overflow:hidden;border:1px solid rgba(216,224,220,.3);border-radius:13px;background:radial-gradient(circle at 50% 22%,rgba(248,245,70,.1),transparent 48%),linear-gradient(155deg,rgba(25,31,32,.08),rgba(15,19,20,.62));box-shadow:inset 0 0 0 1px rgba(255,255,255,.035),0 14px 30px rgba(0,0,0,.2);transform:translateY(-43%)}.operator-page .portrait-media:after{content:"";position:absolute;inset:auto 0 0;height:24%;z-index:2;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(16,20,21,.28))}.operator-page .portrait-media .portrait{left:50%;top:auto;bottom:0;width:100%;height:100%;max-width:none;max-height:none;object-fit:contain;object-position:center bottom;transform:translateX(-50%);filter:drop-shadow(0 16px 18px rgba(0,0,0,.42))}.operator-page .portrait-media .portrait-placeholder{position:absolute;inset:12%;width:auto;aspect-ratio:auto;transform:none}.operator-page .portrait-card:before,.operator-page .portrait-card:after{z-index:3}.operator-page .portrait-card .barcode{z-index:4}
    @media(min-width:1001px){.operator-page .portrait-media{left:16px;right:8px;border-radius:10px}}
    @media(min-width:761px) and (max-width:1000px){.operator-page .portrait-media{left:16px;right:8px;border-radius:10px}}
    @media(max-width:760px){.operator-page .portrait-media{left:50%;right:auto;width:min(calc(100% - 32px),270px);transform:translate(-50%,-43%)}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.related-card,.operator-tile{transition:none}}
  </style>`;
}

function operatorHeadingScript() {
  return `<script>
    (() => {
      const heading = document.querySelector(".operator-name");
      if (!heading) return;

      const fitHeading = () => {
        heading.style.removeProperty("font-size");
        const availableWidth = heading.clientWidth;
        const requiredWidth = heading.scrollWidth;
        if (!availableWidth || requiredWidth <= availableWidth) return;

        const currentSize = Number.parseFloat(getComputedStyle(heading).fontSize);
        const fittedSize = Math.max(28, Math.floor(currentSize * availableWidth / requiredWidth) - 1);
        heading.style.fontSize = \`\${fittedSize}px\`;
      };

      const scheduleFit = () => requestAnimationFrame(fitHeading);
      window.addEventListener("resize", scheduleFit, { passive: true });
      document.fonts?.ready.then(scheduleFit);
      scheduleFit();
    })();
  </script>`;
}

function siteHeader({ showOperatorLink = true, showToolCta = true } = {}) {
  return `<header class="top">
    <nav class="nav">
      <a class="brand" href="${SITE_URL}/"><span class="mark">RF</span><span>RotationForge</span></a>
      <span class="tool-name"><span class="tool-name-full">▱ Arknights: Endfield Rotation Tool</span><span class="tool-name-short">▱ Endfield Tool</span></span>
      ${showOperatorLink || showToolCta ? `<div class="nav-links">
        ${showOperatorLink ? `<a href="${SITE_URL}${BASE_PATH}/operators/">Operators</a>` : ""}
        ${showToolCta ? `<a class="nav-cta" href="${SITE_URL}${BASE_PATH}/">Open Rotation Tool ↗</a>` : ""}
      </div>` : ""}
    </nav>
  </header>`;
}

export function createOperatorPage(operator, allOperators, skillsByOperator) {
  const pageUrl = pageUrlFor(operator);
  const toolUrl = `${SITE_URL}${BASE_PATH}/?leader=${encodeURIComponent(operator.slug)}`;
  const avatarPath = normalizeAssetPath(operator.icon_path);
  const avatarUrl = avatarPath ? `${SITE_URL}${avatarPath}` : "";

  const name = formatValue(operator.name);
  const operatorClass = formatLabel(operator.operator_class);
  const elementType = formatLabel(operator.element_type);
  const weaponType = formatLabel(operator.weapon_type);
  const mainAttribute = formatLabel(operator.main_attribute);
  const secondaryAttribute = formatLabel(operator.secondary_attribute);
  const databaseId = `OPERATOR_${String(operator.slug || "unknown").toUpperCase().replaceAll("-", "_")}`;

  const classIcon = classIconPath(operator.operator_class);
  const elementIcon = elementIconPath(operator.element_type);
  const skills = skillsByOperator.get(operator.id) || [];
  const relatedOperators = getRelatedOperators(operator, allOperators);
  const profile = buildRotationProfile(operator, skills);

  const title = `${name} Rotation Guide, Skills & Stats | Arknights Endfield`;
  const description = metaDescriptionFor(operator);
  const skillOrderText = profile.skillNames.length > 0
    ? `${profile.skillNames.slice(0, 4).join(" → ")}${profile.skillNames.length > 4 ? ` → +${profile.skillNames.length - 4} more` : ""}`
    : `No skill order is stored for ${name} yet.`;

  const baseStatsHtml = [
    stat("HP", operator.base_hp, "♥"),
    stat("ATK", operator.base_atk, "⚔"),
    stat("Level", operator.base_stats_level, "▣")
  ].join("\n");

  const attributeStatsHtml = [
    stat("Strength", operator.base_strength, "●"),
    stat("Agility", operator.base_agility, "✦"),
    stat("Intellect", operator.base_intellect, "◆"),
    stat("Will", operator.base_will, "◉")
  ].join("\n");

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Endfield Operators", item: `${SITE_URL}${BASE_PATH}/operators/` },
      { "@type": "ListItem", position: 3, name, item: pageUrl }
    ]
  };

  const characterSchema = {
    "@context": "https://schema.org",
    "@type": "Character",
    name,
    description,
    ...(avatarUrl ? { image: avatarUrl } : {}),
    url: pageUrl,
    isPartOf: { "@type": "VideoGame", name: "Arknights: Endfield" }
  };
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "RotationForge",
      url: SITE_URL
    },
    mainEntity: {
      "@type": "Character",
      name,
      url: pageUrl
    },
    ...(avatarUrl
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            url: avatarUrl,
            caption: `${name} from Arknights: Endfield`
          }
        }
      : {})
  };
  const portraitMarkup = avatarPath
    ? `<img class="portrait" src="${escapeHtml(avatarPath)}" alt="${escapeHtml(name)} icon" width="330" height="330" fetchpriority="high" decoding="async">`
    : `<span class="portrait-placeholder avatar-placeholder" role="img" aria-label="No image available for ${escapeHtml(name)}">RF</span>`;

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
  <meta property="og:site_name" content="RotationForge">
  ${avatarUrl ? `<meta property="og:image" content="${escapeHtml(avatarUrl)}">` : ""}
  ${avatarUrl ? `<meta property="og:image:alt" content="${escapeHtml(`${name} from Arknights: Endfield`)}">` : ""}
  <meta name="twitter:card" content="${avatarUrl ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${avatarUrl ? `<meta name="twitter:image" content="${escapeHtml(avatarUrl)}">` : ""}
  ${avatarUrl ? `<meta name="twitter:image:alt" content="${escapeHtml(`${name} from Arknights: Endfield`)}">` : ""}
  <script type="application/ld+json">${JSON.stringify(characterSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>
  ${baseStyles()}
</head>
<body class="operator-page">
  ${siteHeader({ showOperatorLink: false, showToolCta: false })}
  <div class="page">
    <div class="breadcrumbs"><a href="${SITE_URL}/">Home</a><span>›</span><a href="${SITE_URL}${BASE_PATH}/operators/">Operators</a><span>›</span><strong>${escapeHtml(name)}</strong></div>
    <nav class="section-nav" aria-label="On this page">
      <a href="#rotation-profile">Overview</a>
      <a href="#stats">Attributes</a>
      <a href="#skills">Skills</a>
      <a href="#related">Related</a>
    </nav>

    <main class="hero">
      <section class="portrait-card">
        <div class="portrait-media">
          ${portraitMarkup}
        </div>
        <span class="barcode">ROTATIONFORGE DATABASE</span>
      </section>

      <section class="hero-copy">
        <div class="eyebrow">Arknights: Endfield Operator</div>
        <h1><span class="operator-name">${escapeHtml(name)}</span><span class="rotation-guide-label">Rotation Guide</span></h1>
        <div class="stars" aria-label="${operator.star} star operator">${stars(operator.star)}</div>
        <div class="actions">
          <a class="button primary" href="${toolUrl}">Plan with ${escapeHtml(name)} ↗</a>
        </div>
        <div class="hero-stats">${baseStatsHtml}</div>
      </section>

      <aside class="info-panel">
        <div class="info-grid">
          ${info("Class", operatorClass, iconMarkup(classIcon, `${operatorClass} class icon`, "➤"))}
          ${info("Element", elementType, iconMarkup(elementIcon, `${elementType} element icon`, "◆"))}
          ${info("Weapon", weaponType, `<span class="info-icon text-icon">⚔</span>`, "weapon-card")}
          ${info("Main Attribute", mainAttribute, `<span class="info-icon text-icon">✣</span>`, "attribute-card")}
          ${info("Secondary Attribute", secondaryAttribute, `<span class="info-icon text-icon">✦</span>`, "attribute-card")}
        </div>
      </aside>
    </main>

    <section class="panel profile-section overview-section" id="rotation-profile">
      <div class="profile-heading">
        <h2>${escapeHtml(name)} Rotation Overview</h2>
        <p>Skill order, resource timing and combo requirements from the current database entry.</p>
      </div>
      <div class="profile-grid">
        ${profileCard("Database order", "Skill order", skillOrderText)}
        ${profileCard("Resource planning", "Timing & Costs", profile.timingText)}
        ${profileCard("Setup requirements", "Combos & Effects", profile.interactionText)}
      </div>
    </section>

    <section class="lower" id="stats">
      <article class="panel">
        <h2>${escapeHtml(name)} Attributes</h2>
        <div class="stats-grid">${attributeStatsHtml}</div>
      </article>

      <article class="panel about">
        <h2>About ${escapeHtml(name)}</h2>
        <p>${escapeHtml(profile.aboutText)}</p>
      </article>
    </section>

    <section class="panel skills-section" id="skills">
      <h2>${escapeHtml(name)} Skills</h2>
      <div class="skills-grid">${skills.length > 0 ? skills.map(skillCard).join("\n") : "<p>No skills are available in the database yet.</p>"}</div>
    </section>

    <section class="panel related-section" id="related">
      <h2>Related Operators</h2>
      <div class="related-grid">${relatedOperators.length > 0 ? relatedOperators.map(relatedCard).join("\n") : "<p>No related operators found yet.</p>"}</div>
    </section>

    <footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield.<span class="database-ref">Database ID: ${escapeHtml(databaseId)}</span></footer>
  </div>
  ${operatorHeadingScript()}
</body>
</html>`;
}

export function createIndexPage(operators) {
  const pageUrl = `${SITE_URL}${BASE_PATH}/operators/`;
  const title = "Arknights Endfield Operator Database | RotationForge";
  const description = "Browse all Arknights: Endfield operators available in the RotationForge database with classes, elements, attributes and direct rotation tool links.";
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Arknights: Endfield Operators",
    itemListElement: operators.map((operator, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: pageUrlFor(operator),
      name: operator.name
    }))
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
  <script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
  ${baseStyles()}
</head>
<body class="operator-index">
  ${siteHeader()}
  <div class="page">
    <div class="breadcrumbs"><a href="${SITE_URL}/">Home</a><span>›</span><strong>Operators</strong></div>
    <section class="index-hero">
      <div class="eyebrow">RotationForge Database</div>
      <h1>Arknights: Endfield Operators</h1>
      <p>Browse all operators stored in the RotationForge database. Each page includes operator stats, class and element icons, skills, related operators and a direct link into the rotation planner.</p>
    </section>
    <section class="operator-grid">${operators.map(indexCard).join("\n")}</section>
    <footer>RotationForge is an unofficial fan-made tool for Arknights: Endfield.</footer>
  </div>
</body>
</html>`;
}

export function createSitemap(operators) {
  const staticUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}${BASE_PATH}/`,
    `${SITE_URL}${BASE_PATH}/operators/`
  ];
  const staticEntries = staticUrls
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n");
  const operatorEntries = operators
    .map((operator) => {
      const pageUrl = pageUrlFor(operator);
      const imageEntry = operator.icon_path
        ? `\n    <image:image><image:loc>${escapeXml(`${SITE_URL}${normalizeAssetPath(operator.icon_path)}`)}</image:loc></image:image>`
        : "";
      return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>${imageEntry}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticEntries}
${operatorEntries}
</urlset>
`;
}

function chunkValues(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function fetchSkillsForOperators(supabase, operatorIds) {
  const skills = [];

  for (const idChunk of chunkValues(operatorIds, OPERATOR_ID_CHUNK_SIZE)) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("operator_skills")
        .select(`
          id,
          operator_id,
          slot_index,
          name,
          skill_type,
          short_type,
          cooldown,
          energy,
          element_type,
          icon_path,
          icon_small_path,
          description,
          combo_trigger,
          combo_trigger_mode,
          raw_data
        `)
        .in("operator_id", idChunk)
        .order("operator_id", { ascending: true })
        .order("slot_index", { ascending: true })
        .range(offset, offset + SKILL_PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Supabase Fehler bei operator_skills: ${error.message}`);
      }

      const page = data || [];
      skills.push(...page);

      if (page.length < SKILL_PAGE_SIZE) break;
      offset += SKILL_PAGE_SIZE;
    }
  }

  return skills;
}

function removeIfExists(targetPath, options = {}) {
  try {
    fs.rmSync(targetPath, { force: true, ...options });
  } catch (error) {
    console.warn(`Temporäre Datei konnte nicht entfernt werden: ${targetPath}`, error.message);
  }
}

export function writeGeneratedOutput({
  operators,
  skillsByOperator,
  outputDir = OUTPUT_DIR,
  sitemapPath = SITEMAP_PATH
}) {
  validateOperators(operators);

  const suffix = `${process.pid}-${Date.now()}`;
  const tempOutputDir = `${outputDir}.tmp-${suffix}`;
  const backupOutputDir = `${outputDir}.backup-${suffix}`;
  const tempSitemapPath = `${sitemapPath}.tmp-${suffix}`;
  const backupSitemapPath = `${sitemapPath}.backup-${suffix}`;

  let outputBackedUp = false;
  let sitemapBackedUp = false;
  let outputCommitted = false;
  let sitemapCommitted = false;

  try {
    fs.mkdirSync(tempOutputDir, { recursive: true });
    fs.writeFileSync(path.join(tempOutputDir, "index.html"), createIndexPage(operators), "utf8");

    for (const operator of operators) {
      const folder = path.join(tempOutputDir, operator.slug);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(
        path.join(folder, "index.html"),
        createOperatorPage(operator, operators, skillsByOperator),
        "utf8"
      );
    }

    fs.writeFileSync(tempSitemapPath, createSitemap(operators), "utf8");

    if (fs.existsSync(outputDir)) {
      fs.renameSync(outputDir, backupOutputDir);
      outputBackedUp = true;
    }
    if (fs.existsSync(sitemapPath)) {
      fs.renameSync(sitemapPath, backupSitemapPath);
      sitemapBackedUp = true;
    }

    fs.renameSync(tempOutputDir, outputDir);
    outputCommitted = true;
    fs.renameSync(tempSitemapPath, sitemapPath);
    sitemapCommitted = true;
  } catch (error) {
    if (outputCommitted) removeIfExists(outputDir, { recursive: true });
    if (sitemapCommitted) removeIfExists(sitemapPath);

    if (outputBackedUp && fs.existsSync(backupOutputDir)) {
      fs.renameSync(backupOutputDir, outputDir);
      outputBackedUp = false;
    }
    if (sitemapBackedUp && fs.existsSync(backupSitemapPath)) {
      fs.renameSync(backupSitemapPath, sitemapPath);
      sitemapBackedUp = false;
    }

    throw error;
  } finally {
    removeIfExists(tempOutputDir, { recursive: true });
    removeIfExists(tempSitemapPath);
    if (outputCommitted) removeIfExists(backupOutputDir, { recursive: true });
    if (sitemapCommitted) removeIfExists(backupSitemapPath);
  }
}

export async function build({ supabase = createSupabaseClient() } = {}) {
  const { data: operators, error: operatorError } = await supabase
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
      base_hp,
      base_atk,
      base_stats_level,
      base_strength,
      base_agility,
      base_intellect,
      base_will,
      sort_order
    `)
    .eq("game", "arknights_endfield")
    .order("sort_order", { ascending: true });

  if (operatorError) {
    throw new Error(`Supabase Fehler bei operators: ${operatorError.message}`);
  }

  validateOperators(operators);
  const skills = await fetchSkillsForOperators(supabase, operators.map((operator) => operator.id));

  const skillsByOperator = new Map();
  for (const skill of skills || []) {
    if (!skillsByOperator.has(skill.operator_id)) skillsByOperator.set(skill.operator_id, []);
    skillsByOperator.get(skill.operator_id).push(skill);
  }

  writeGeneratedOutput({ operators, skillsByOperator });

  console.log(`Fertig: ${operators.length} Operator-Seiten erstellt.`);
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  build().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
