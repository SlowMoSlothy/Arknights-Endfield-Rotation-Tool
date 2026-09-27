// Public catalog sources -> validated, non-destructive Supabase upserts.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REEND = 'https://api.vallov.com/api/weapons';
const TOOLS = 'https://endfieldtools.dev';
const TABLE_KEYS = { weapons: 'weapon_key', weapon_essence_profiles: 'weapon_key', gear_sets: 'set_key', gear_items: 'gear_key' };
const TYPE_KEYS = { Sword: 'sword', Greatsword: 'great_sword', Handcannon: 'handcannon', Polearm: 'polearm', 'Arts Unit': 'arts_unit' };
const ATTRIBUTES = { 39: 'Strength', 40: 'Agility', 41: 'Intellect', 42: 'Will' };
const STAT_NAMES = { 9: 'Crit Rate %', 17: 'Basic Attack DMG Bonus %', 28: 'Ultimate DMG Bonus %', 29: 'Treatment Effect %', 32: 'Battle Skill DMG Bonus %', 33: 'Combo Skill DMG Bonus %', 44: 'Ultimate Gain Efficiency %', 50: 'Physical DMG Bonus %', 61: 'DMG Bonus vs. Staggered %', 87: 'Arts Intensity' };
const COMPOSITES = { AllSkillDamageIncrease: 'Skill DMG Bonus %', CrystAndPulseDamageIncrease: 'Cryo and Electric DMG Bonus %', FireAndNaturalDamageIncrease: 'Heat and Nature DMG Bonus %', SpellDamageIncrease: 'Arts DMG Bonus %' };

function requireValue(condition, message) { if (!condition) throw new Error(message); }
function number(value, label) {
  requireValue(value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)), `Invalid number: ${label}`);
  return Number(value);
}
export function normalizeName(value) { return String(value).replaceAll('Æ', 'Ae').replaceAll('æ', 'ae').normalize('NFKD').replace(/[^a-z0-9]/gi, '').toLowerCase(); }
function slug(value) { return String(value).replaceAll('Æ', 'Ae').replaceAll('æ', 'ae').normalize('NFKD').replace(/['’]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function clean(value) { return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function round(value, digits = 1) { return Number(value.toFixed(digits)); }
function unique(rows, field) {
  const keys = new Set();
  for (const row of rows) { requireValue(row[field] && !keys.has(row[field]), `Missing or duplicate ${field}: ${row[field]}`); keys.add(row[field]); }
}

export async function requestJson(url, options = {}, fetcher = fetch) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(20000) }); }
    catch {
      if (attempt < 2 && (!options.method || options.method === 'GET')) continue;
      throw new Error(`Network timeout or connection failure: ${new URL(url).origin}${new URL(url).pathname}`);
    }
    if (response.ok) return response.json();
    if (attempt < 2 && !options.method && (response.status === 429 || response.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      continue;
    }
    // Only expose a bounded diagnostic message, never the raw response or headers.
    let diagnostic = '';
    if (new URL(url).hostname === 'api.supabase.com') {
      try {
        const body = await response.json();
        if (typeof body.message === 'string') {
          diagnostic = body.message;
          for (const value of Object.values(options.headers || {})) {
            if (String(value).startsWith('Bearer ')) diagnostic = diagnostic.replaceAll(String(value).slice(7), '[redacted]');
          }
          diagnostic = ': ' + diagnostic.replace(/\s+/g, ' ').slice(0, 1000);
        }
      } catch { /* Non-JSON errors have no safe structured diagnostic. */ }
    }
    throw new Error(`Request failed (${response.status}): ${new URL(url).origin}${new URL(url).pathname}${diagnostic}`);
  }
}

export async function fetchWeaponList(get = requestJson) {
  const rows = [];
  let total;
  for (let page = 1; page <= 100; page++) {
    const result = await get(`${REEND}?page=${page}`);
    requireValue(Array.isArray(result.data) && Number.isInteger(result.total) && result.total > 0, 'Invalid weapon list');
    total ??= result.total;
    requireValue(total === result.total && result.page === page && result.data.length > 0, 'Weapon pagination changed or stopped early');
    rows.push(...result.data);
    unique(rows, 'slug');
    if (rows.length >= total) { requireValue(rows.length === total, 'Weapon count does not match total'); return rows; }
  }
  throw new Error('Weapon pagination limit exceeded');
}

function identity(existing, field, mapping, sourceId, name) {
  const mapped = mapping[sourceId];
  if (mapped) return mapped;
  const matches = existing.filter(row => normalizeName(row.name) === normalizeName(name));
  requireValue(matches.length <= 1, `Ambiguous existing name: ${name}`);
  const key = matches[0]?.[field] || (name === 'Industry 0.1' ? 'industry_01' : slug(name));
  requireValue(!existing.some(row => row[field] === key && normalizeName(row.name) !== normalizeName(name)), `Key collision: ${key}`);
  mapping[sourceId] = key;
  return key;
}

function weaponStat(attribute) {
  requireValue(attribute?.label && attribute?.value, 'Missing weapon stat');
  const label = clean(attribute.label).replace(/\s*(?:Boost\s*)?\[[A-Z]+\]$/, '');
  const aliases = { ATK: 'Attack', HP: 'Max HP', 'Critical Rate': 'Crit Rate', 'Ultimate Gain': 'Ultimate Gain Efficiency', 'ULT Efficiency': 'Ultimate Gain Efficiency', Treatment: 'Treatment Efficiency', Arts: 'Arts DMG' };
  const match = clean(attribute.value).match(/\+\s*(\d+(?:\.\d+)?)\s*(%)?\.?\s*$/);
  requireValue(match, `Unrecognized weapon stat: ${attribute.value}`);
  return { label: aliases[label] || label, value: Number(match[1]), percent: Boolean(match[2]) };
}

export function mapWeapon(data, existing, keys) {
  requireValue(data?.slug && data.name && TYPE_KEYS[data.type], 'Incomplete weapon detail');
  const weaponKey = identity(existing.weapons, 'weapon_key', keys, data.slug, data.name);
  const old = existing.weapons.find(row => row.weapon_key === weaponKey);
  const ranks = [...(data.skill?.ranks || [])].sort((a, b) => a.rank - b.rank);
  requireValue(ranks.length === 9 && ranks.every((rank, i) => rank.rank === i + 1), `Missing skill ranks: ${data.name}`);
  const count = ranks[0].attributes?.length;
  requireValue((count === 2 || count === 3) && ranks.every(r => r.attributes?.length === count), `Invalid skill attributes: ${data.name}`);
  const primary = ranks.map(r => weaponStat(r.attributes[0]));
  const secondary = count === 3 ? ranks.map(r => weaponStat(r.attributes[1])) : [];
  for (const stats of [primary, secondary]) requireValue(stats.every(s => s.label === stats[0].label && s.percent === stats[0].percent), `Inconsistent rank labels: ${data.name}`);
  const descriptions = ranks.map(r => clean(r.attributes.at(-1).value));
  requireValue(descriptions.every(Boolean) && data.skill.name, `Missing skill description: ${data.name}`);
  const atk = data.atk_stats?.find(s => s.level === 90);
  requireValue(atk && Number.isInteger(atk.atk) && atk.atk > 0, `Missing level 90 ATK: ${data.name}`);
  requireValue(Number.isInteger(data.rarity) && data.rarity >= 3 && data.rarity <= 6, `Invalid rarity: ${data.name}`);
  const sourceUrl = `https://reend.vallov.com/weapons/${data.slug}`;
  const weapon = {
    weapon_key: weaponKey, game: 'arknights_endfield', name: data.name, weapon_type: TYPE_KEYS[data.type], rarity: data.rarity,
    main_attribute: primary[0].label, secondary_attribute: secondary[0]?.label || null,
    secondary_value: secondary.at(-1)?.value ?? null, secondary_is_percent: secondary[0]?.percent || false,
    passive_name: clean(data.skill.name), icon_path: old?.icon_path || data.images?.icon_url || (/^[a-z0-9_]+$/.test(data.internal_name || '') ? `${TOOLS}/assets/images/endfield/itemicon/${data.internal_name}.png` : null),
    base_atk: atk.atk, base_stats_level: 90, sort_order: old?.sort_order ?? existing.weapons.length + 1,
    raw_data: { catalogImport: { source: sourceUrl, sourceId: data.slug, internalName: data.internal_name, updatedAt: data.updated_at, atkStats: data.atk_stats } }
  };
  requireValue(weapon.icon_path, `Missing icon: ${data.name}`);
  // Preserve manually configured rank/Essence limits on existing profiles.
  // New profiles stay unverified until these tuning limits have been checked.
  const profile = {
    weapon_key: weaponKey, primary_label: primary[0].label, primary_values: primary.map(s => s.value), primary_is_percent: primary[0].percent,
    secondary_label: secondary[0]?.label || null, secondary_values: secondary.length ? secondary.map(s => s.value) : null,
    secondary_is_percent: secondary[0]?.percent || false, skill_name: clean(data.skill.name), skill_descriptions: descriptions,
    source_url: sourceUrl, source_note: 'Imported from ReEnd. Existing Essence tuning limits are retained; new profiles require tuning verification.', verified: false
  };
  return { weapon, profile };
}

export function formatSetDescription(template, values) {
  requireValue(typeof template === 'string' && template.length > 0, 'Missing set localization');
  const text = template.replace(/\{([^{}]+)\}/g, (_, token) => {
    const [expression, format = ''] = token.split(':');
    const complement = expression.startsWith('1-');
    const name = complement ? expression.slice(2) : expression;
    let value = number(values[name], `set placeholder ${token}`);
    if (complement) value = 1 - value;
    if (format.includes('%')) value *= 100;
    const precision = format.includes('.') ? format.split('.')[1].replace('%', '').length : 0;
    return `${round(value, precision)}${format.includes('%') ? '%' : ''}`;
  });
  requireValue(!/[{}]/.test(text), 'Unresolved set placeholder');
  return clean(text);
}

export function mapGearStat(stat) {
  const value = number(stat.attrValue, 'gear attribute');
  const type = Number(stat.attrType), modifier = Number(stat.modifierType), composite = stat.compositeAttr;
  if (ATTRIBUTES[type] && modifier === 5) return { label: ATTRIBUTES[type], value: round(value), attribute: true };
  if (type === 0 && ['Main', 'Sub'].includes(composite) && [5, 6].includes(modifier)) {
    const label = composite === 'Main' ? 'Main Attribute' : 'Secondary Attribute';
    return { label: label + (modifier === 6 ? ' %' : ''), value: round(value * (modifier === 6 ? 100 : 1)), attribute: modifier === 5 };
  }
  if ([1, 2].includes(type) && [6, 7].includes(modifier)) return { label: (modifier === 7 ? 'Flat ' : '') + (type === 1 ? 'HP' : 'ATK') + (modifier === 6 ? ' Bonus %' : ''), value: round(value * (modifier === 6 ? 100 : 1)) };
  if (type === 0 && composite === 'AllDamageTakenScalar' && modifier === 8) return { label: 'Final DMG Reduction %', value: round((1 - value) * 100) };
  const label = type === 0 ? COMPOSITES[composite] : STAT_NAMES[type];
  requireValue(label && modifier === 5, `Unsupported gear stat: ${type}/${modifier}/${composite}`);
  return { label, value: round(value * (label.endsWith('%') ? 100 : 1)) };
}

export function mapGear(source, sourceSets, i18n, existing, keys) {
  const setIds = new Map();
  const sets = Object.values(sourceSets).map(s => {
    const name = i18n[s.suitNameI18nId] || s.engName;
    requireValue(name && s.suitId && s.setEffects?.length, 'Incomplete gear set');
    const key = identity(existing.gear_sets, 'set_key', keys.gear_sets, s.suitId, name);
    setIds.set(s.suitId, key);
    return { set_key: key, name, description: s.setEffects.map(e => formatSetDescription(i18n[e.descriptionI18nId], e.blackboardValues)).join('\n') };
  });
  const items = Object.entries(source).map(([sourceId, item]) => {
    const name = i18n[item.nameI18nId];
    requireValue(name && sourceId === item.itemId, `Missing equipment name or identity: ${sourceId}`);
    const key = identity(existing.gear_items, 'gear_key', keys.gear_items, sourceId, name);
    const old = existing.gear_items.find(g => g.gear_key === key);
    const stats = item.displayAttrModifiers.map(mapGearStat);
    let attributes = stats.filter(s => s.attribute), bonuses = stats.filter(s => !s.attribute);
    // Tutorial accessories can have a single combat stat instead of an attribute.
    if (attributes.length === 0 && bonuses.length === 1) { attributes = bonuses; bonuses = []; }
    requireValue(attributes.length >= 1 && attributes.length <= 2 && bonuses.length <= 1, `Unsupported stat layout: ${name}`);
    const base = item.displayBaseAttrModifier;
    requireValue(Number(base.attrType) === 3 && Number(base.modifierType) === 5, `Unsupported defense: ${name}`);
    const defense = round(number(base.attrValue, 'defense'));
    const category = ['armor', 'gloves', 'kits'][item.partType];
    const tier = Number(sourceId.match(/^item_equip_t(\d+)_/)?.[1]);
    requireValue(category && Number.isInteger(tier) && tier >= 0 && tier <= 4, `Unsupported equipment tier/slot: ${name}`);
    requireValue(!item.suitID || setIds.has(item.suitID), `Missing set: ${name}`);
    return {
      gear_key: key, category, name, set_key: item.suitID ? setIds.get(item.suitID) : null, rarity: tier + 1,
      main_stat: attributes[0].label, main_value: attributes[0].value, sec_stat: attributes[1]?.label || null, sec_value: attributes[1]?.value ?? null,
      sub_stat: bonuses[0]?.label || 'Defense', sub_value: bonuses[0]?.value ?? defense, def_value: defense,
      icon: old?.icon || `${TOOLS}/assets/images/endfield/itemicon/${encodeURIComponent(item.iconId || item.itemId)}.png`
    };
  });
  return { sets, items };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export function diffCatalog(catalog, existing) {
  return Object.fromEntries(Object.entries(TABLE_KEYS).map(([table, key]) => {
    unique(catalog[table], key);
    const byKey = new Map(existing[table].map(row => [row[key], row]));
    const added = [], changed = [], unchanged = [];
    for (const row of catalog[table]) {
      const old = byKey.get(row[key]);
      if (!old) { added.push(row[key]); continue; }
      const fields = Object.keys(row).filter(field => !equal(field === 'raw_data' ? { ...old.raw_data, ...row.raw_data } : row[field], old[field]));
      if (fields.length) changed.push({ key: row[key], fields }); else unchanged.push(row[key]);
    }
    const imported = new Set(catalog[table].map(row => row[key]));
    return [table, { count: catalog[table].length, added, changed, unchanged: unchanged.length, retained: existing[table].filter(r => !imported.has(r[key])).map(r => r[key]) }];
  }));
}

function sql(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? `array[${value.map(sql).join(', ')}]` : "'{}'";
  if (typeof value === 'object') return `${sql(JSON.stringify(value))}::jsonb`;
  return "'" + value.replaceAll("'", "''") + "'";
}

export function buildSql(catalog, report) {
  const statements = ['-- Generated equipment import. Existing rows absent from the sources are retained.', '-- Sources: https://reend.vallov.com/ and https://endfieldtools.dev/equipment/', 'begin;', 'set local standard_conforming_strings = on;'];
  for (const [table, key] of Object.entries(TABLE_KEYS)) {
    const changes = new Set([...report[table].added, ...report[table].changed.map(r => r.key)]);
    const rows = catalog[table].filter(r => changes.has(r[key]));
    if (!rows.length) continue;
    const fields = Object.keys(rows[0]);
    const assignments = fields.filter(f => f !== key).map(f => `${f} = ${f === 'raw_data' ? `coalesce(public.${table}.raw_data, '{}'::jsonb) || excluded.raw_data` : `excluded.${f}`}`);
    // Let PostgreSQL convert JSON into the target table's actual column types.
    // Existing deployments store skill_descriptions as either jsonb or text[].
    // Selecting only imported columns also preserves defaults for omitted fields.
    statements.push(`insert into public.${table} (${fields.join(', ')})\nselect ${fields.join(', ')}\nfrom jsonb_populate_recordset(null::public.${table}, ${sql(JSON.stringify(rows))}::jsonb)\non conflict (${key}) do update set\n${assignments.join(',\n')},\nupdated_at = now();`);
  }
  statements.push('commit;', '');
  return statements.join('\n\n');
}

export async function readExisting(url, key, get = requestJson) {
  const result = {};
  for (const [table, primary] of Object.entries(TABLE_KEYS)) {
    result[table] = [];
    for (let offset = 0; ; offset += 500) {
      const filter = table === 'weapons' ? '&game=eq.arknights_endfield' : '';
      const rows = await get(`${url}/rest/v1/${table}?select=*&order=${primary}&limit=500&offset=${offset}${filter}`, { headers: { apikey: key } });
      requireValue(Array.isArray(rows), `Invalid Supabase response: ${table}`);
      result[table].push(...rows);
      if (rows.length < 500) break;
    }
  }
  return result;
}

async function publicConfiguration(env) {
  if (env.SUPABASE_URL || env.SUPABASE_ANON_KEY) {
    requireValue(env.SUPABASE_URL && env.SUPABASE_ANON_KEY, 'Set both SUPABASE_URL and SUPABASE_ANON_KEY');
    return { url: env.SUPABASE_URL.replace(/\/$/, ''), key: env.SUPABASE_ANON_KEY };
  }
  const source = await fs.readFile(path.join(ROOT, 'endfield/supabaseClient.js'), 'utf8');
  const url = source.match(/const SUPABASE_URL = "([^"]+)"/)?.[1];
  const key = source.match(/const SUPABASE_KEY = "([^"]+)"/)?.[1];
  requireValue(url && key, 'Configure SUPABASE_URL and SUPABASE_ANON_KEY');
  return { url, key };
}

export async function checkDatabaseWriteAccess(ref, token, get = requestJson) {
  const result = await get(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: "select current_setting('transaction_read_only') as transaction_read_only, current_setting('default_transaction_read_only') as default_transaction_read_only, pg_is_in_recovery() as in_recovery, pg_database_size(current_database()) as database_size_bytes",
      read_only: false
    })
  });
  const mode = result?.[0];
  requireValue(mode && ['on', 'off'].includes(mode.transaction_read_only), 'Could not verify database write mode');
  console.log(`Database mode: transaction_read_only=${mode.transaction_read_only}, default_transaction_read_only=${mode.default_transaction_read_only}, recovery=${mode.in_recovery}, database_size_bytes=${mode.database_size_bytes}`);
  requireValue(mode.transaction_read_only === 'off' && mode.default_transaction_read_only === 'off' && !mode.in_recovery,
    'Database session is read-only. Check the token Database Read-write permission and the project read-only/storage status; no import was attempted.');
}

export async function sync({ output = path.join(ROOT, '.cache/equipment-import'), apply = false, env = process.env, get = requestJson } = {}) {
  const config = await publicConfiguration(env);
  const ref = new URL(config.url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  if (apply) requireValue(ref && env.SUPABASE_ACCESS_TOKEN, '--apply requires SUPABASE_ACCESS_TOKEN (Supabase Management API personal access token) and a supabase.co project URL');
  if (apply) await checkDatabaseWriteAccess(ref, env.SUPABASE_ACCESS_TOKEN, get);
  const keysPath = path.join(ROOT, 'tools/data/equipment-source-keys.json');
  let keys;
  try { keys = JSON.parse(await fs.readFile(keysPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; keys = { weapons: {}, gear_items: {}, gear_sets: {} }; }
  console.log('Reading current Supabase catalog and public equipment sources...');
  const [existing, list, gear, sets, i18n] = await Promise.all([
    readExisting(config.url, config.key, get), fetchWeaponList(get),
    get(`${TOOLS}/localdb/optimized/equipment/equipment-details.json`),
    get(`${TOOLS}/localdb/optimized/equipment/suits/suits-list.json`),
    get(`${TOOLS}/localdb/optimized/i18n/I18nTextTable_EN.json`)
  ]);
  requireValue(list.length >= existing.weapons.length * 0.9 && Object.keys(gear).length >= Math.max(1, existing.gear_items.length * 0.9), 'Source catalog shrank unexpectedly; import stopped');
  const catalog = { weapons: [], weapon_essence_profiles: [], gear_sets: [], gear_items: [] };
  // Sequential detail requests keep the community API load low.
  for (const [index, summary] of list.entries()) {
    const detail = await get(`${REEND}/${encodeURIComponent(summary.slug)}`);
    requireValue(detail.data?.slug === summary.slug, `Weapon detail mismatch: ${summary.slug}`);
    const { weapon, profile } = mapWeapon(detail.data, existing, keys.weapons);
    catalog.weapons.push(weapon); catalog.weapon_essence_profiles.push(profile);
    if ((index + 1) % 20 === 0) console.log(`Read ${index + 1}/${list.length} weapon details`);
  }
  const mapped = mapGear(gear, sets, i18n, existing, keys);
  catalog.gear_sets = mapped.sets; catalog.gear_items = mapped.items;
  const report = diffCatalog(catalog, existing);
  const query = buildSql(catalog, report);
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'catalog.sql'), query);
  await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), project: new URL(config.url).hostname, sha256: createHash('sha256').update(query).digest('hex'), tables: report, notes: ['New weapon profiles require verification of Essence tuning limits.', 'Imported descriptions do not implement new passive simulation mechanics.', 'Existing local icons are preserved; new entries use source-hosted icons.'] }, null, 2) + '\n');
  await fs.mkdir(path.dirname(keysPath), { recursive: true });
  await fs.writeFile(keysPath, JSON.stringify(keys, null, 2) + '\n');
  for (const [table, row] of Object.entries(report)) console.log(`${table}: ${row.count} source rows, ${row.added.length} new, ${row.changed.length} changed, ${row.retained.length} retained`);
  console.log(`Prepared SQL and report: ${output}`);
  if (apply) {
    await get(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, read_only: false }) });
    const after = diffCatalog(catalog, await readExisting(config.url, config.key, get));
    requireValue(Object.values(after).every(table => table.added.length === 0 && table.changed.length === 0), 'Database write returned successfully but read-back differs; inspect the report before retrying');
    console.log('Applied equipment catalog in one database transaction and verified the saved rows.');
  }
  return { catalog, report, query };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, output: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('npm run sync:equipment -- [--output DIRECTORY] [--apply]\nDefault: read sources and prepare SQL/report only. --apply requires SUPABASE_ACCESS_TOKEN.');
    else await sync(values);
  } catch (error) { console.error(`Equipment import failed: ${error.message}`); process.exitCode = 1; }
}
