import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildSql, diffCatalog, fetchWeaponList, formatSetDescription, mapGear, mapGearStat, mapWeapon, readExisting, requestJson } from '../tools/sync-endfield-equipment.js';

const weapon = JSON.parse(fs.readFileSync(new URL('./fixtures/equipment-import/weapon.json', import.meta.url)));
const empty = () => ({ weapons: [], weapon_essence_profiles: [], gear_sets: [], gear_items: [] });

test('database errors expose useful diagnostics but redact the access token', async () => {
  await assert.rejects(requestJson('https://api.supabase.com/v1/projects/example/database/query', {
    method: 'POST', headers: { Authorization: 'Bearer secret-example-token' }
  }, async () => ({ ok: false, status: 400, json: async () => ({ message: 'invalid SQL secret-example-token', extra: 'not included' }) })), error => {
    assert.match(error.message, /invalid SQL \[redacted\]/);
    assert.doesNotMatch(error.message, /secret-example-token|not included/);
    return true;
  });
});

test('weapon pagination imports all pages and rejects repeated or missing pages', async () => {
  const urls = [];
  const rows = await fetchWeaponList(async url => {
    urls.push(url);
    return { page: urls.length, total: 2, data: [{ slug: `weapon-${urls.length}` }] };
  });
  assert.equal(rows.length, 2);
  assert.match(urls[1], /page=2$/);
  await assert.rejects(fetchWeaponList(async () => ({ page: 1, total: 2, data: [{ slug: 'same' }] })), /pagination/);
});

test('weapon import preserves saved loadout keys and imports all nine skill ranks', () => {
  const existing = empty();
  existing.weapons.push({ weapon_key: 'legacy_sword', name: weapon.name, icon_path: 'assets/weapons/legacy.png', sort_order: 5 });
  const keys = {};
  const result = mapWeapon(weapon, existing, keys);
  assert.equal(result.weapon.weapon_key, 'legacy_sword');
  assert.equal(result.weapon.icon_path, 'assets/weapons/legacy.png');
  assert.equal(result.weapon.base_atk, 510);
  assert.deepEqual(result.profile.primary_values, [20, 36, 52, 68, 84, 100, 116, 132, 156]);
  assert.equal(result.profile.skill_descriptions.length, 9);
  assert.match(result.profile.skill_descriptions[0], /75%/);
  assert.equal(result.profile.verified, false);
  assert.equal(Object.hasOwn(result.profile, 'primary_base_ranks'), false);
  const renamed = mapWeapon({ ...weapon, name: 'New localized name' }, existing, keys);
  assert.equal(renamed.weapon.weapon_key, 'legacy_sword');
});

test('missing weapon ranks fail before generating an incomplete profile', () => {
  assert.throws(() => mapWeapon({ ...weapon, skill: { ...weapon.skill, ranks: weapon.skill.ranks.slice(1) } }, empty(), {}), /Missing skill ranks/);
});

test('gear values preserve flat attributes and convert percentages and damage reduction', () => {
  assert.deepEqual(mapGearStat({ attrType: 39, attrValue: 87, modifierType: 5 }), { label: 'Strength', value: 87, attribute: true });
  assert.deepEqual(mapGearStat({ attrType: 0, attrValue: 0.9610764055742431, modifierType: 8, compositeAttr: 'AllDamageTakenScalar' }), { label: 'Final DMG Reduction %', value: 3.9 });
  assert.deepEqual(mapGearStat({ attrType: 0, attrValue: 0.23, modifierType: 5, compositeAttr: 'CrystAndPulseDamageIncrease' }), { label: 'Cryo and Electric DMG Bonus %', value: 23 });
  assert.throws(() => mapGearStat({ attrType: 999, attrValue: 1, modifierType: 5 }), /Unsupported/);
});

test('set descriptions resolve percentages, complements and decimal multipliers without eval', () => {
  assert.equal(formatSetDescription('<@ba.vup>+{1-cooldown:0%}</> / {multiplier:0.0} / {duration}s', { cooldown: 0.85, multiplier: 1.5, duration: 15 }), '+15% / 1.5 / 15s');
  assert.throws(() => formatSetDescription('{missing}', {}), /Invalid number/);
  assert.throws(() => formatSetDescription('{process.exit()}', {}), /Invalid number/);
});

test('equipment localization retains int64 string IDs and legacy set/item keys', () => {
  const existing = empty();
  existing.gear_sets.push({ set_key: 'legacy_set', name: 'Example' });
  existing.gear_items.push({ gear_key: 'legacy_armor', name: 'Example Armor', icon: 'assets/gear/example.png' });
  const sets = { example: { suitId: 'suit_x', suitNameI18nId: '9223372036854775801', setEffects: [{ descriptionI18nId: '9223372036854775802', blackboardValues: { hp: 500 } }] } };
  const source = { item_equip_t4_test_body_01: { itemId: 'item_equip_t4_test_body_01', nameI18nId: '9223372036854775803', suitID: 'suit_x', partType: 0, displayBaseAttrModifier: { attrType: 3, modifierType: 5, attrValue: 56 }, displayAttrModifiers: [{ attrType: 39, modifierType: 5, attrValue: 87 }, { attrType: 40, modifierType: 5, attrValue: 58 }, { attrType: 9, modifierType: 5, attrValue: 0.104 }] } };
  const result = mapGear(source, sets, { '9223372036854775801': 'Example', '9223372036854775802': 'HP +{hp}', '9223372036854775803': 'Example Armor' }, existing, { gear_sets: {}, gear_items: {} });
  assert.equal(result.items[0].gear_key, 'legacy_armor');
  assert.equal(result.items[0].set_key, 'legacy_set');
  assert.equal(result.items[0].rarity, 5);
  assert.equal(result.items[0].sub_value, 10.4);
  assert.equal(result.sets[0].description, 'HP +500');
});

test('SQL only updates changed rows, escapes text, retains missing rows and merges weapon metadata', () => {
  const existing = empty(), catalog = empty();
  existing.gear_sets = [{ set_key: 'old', name: 'Retain me', description: 'Old set' }];
  existing.weapons = [{ weapon_key: 'sword', name: 'Sword', raw_data: { passive: 'manual', catalogImport: { version: 1 } } }];
  catalog.weapons = [{ weapon_key: 'sword', name: 'Sword', raw_data: { catalogImport: { version: 2 } } }];
  catalog.gear_sets = [{ set_key: 'new', name: "Wielder's set", description: 'ATK +10%' }];
  const report = diffCatalog(catalog, existing);
  assert.deepEqual(report.gear_sets.retained, ['old']);
  const query = buildSql(catalog, report);
  assert.match(query, /Wielder''s set/);
  assert.match(query, /coalesce\(public.weapons.raw_data/);
  assert.doesNotMatch(query, /delete from|drop table|weapon_essence_profiles/i);
  assert.match(query, /begin;/);
  assert.match(query, /commit;/);
  const after = { ...existing, weapons: [{ ...existing.weapons[0], raw_data: { ...existing.weapons[0].raw_data, ...catalog.weapons[0].raw_data } }], gear_sets: [...existing.gear_sets, ...catalog.gear_sets] };
  assert.doesNotMatch(buildSql(catalog, diffCatalog(catalog, after)), /insert into/);
});

test('duplicate keys abort the import', () => {
  const catalog = empty();
  catalog.gear_sets = [{ set_key: 'same' }, { set_key: 'same' }];
  assert.throws(() => diffCatalog(catalog, empty()), /duplicate/);
});

test('database reads paginate instead of silently accepting a capped response', async () => {
  const requests = [];
  const result = await readExisting('https://example.supabase.co', 'public-key', async url => {
    requests.push(url);
    return url.includes('/weapons?') ? url.includes('offset=0') ? Array.from({ length: 500 }, (_, n) => ({ weapon_key: String(n) })) : [{ weapon_key: '500' }] : [];
  });
  assert.equal(result.weapons.length, 501);
  assert.ok(requests.some(url => url.includes('offset=500')));
});
