import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createWeaponIndex, createWeaponPage, createWeaponSitemap, fetchWeapons, writeWeaponOutput, weaponImage } from '../tools/build-weapon-pages.js';

const weapon = { weapon_key: 'test_sword', name: 'Test Sword', weapon_type: 'sword', rarity: 6, main_attribute: 'Strength', base_atk: 500, base_stats_level: 90, passive_name: 'Test skill', icon_path: 'assets/weapons/test_sword.png', updated_at: '2026-09-25T10:00:00Z', raw_data: { catalogImport: { atkStats: [{ level: 1, atk: 50 }, { level: 90, atk: 500 }] } }, profile: { primary_label: 'Strength', primary_values: [0, 10, 20, 30, 40, 50, 60, 70, 80], secondary_label: 'ATK Boost', secondary_values: [1,2,3,4,5,6,7,8,9], secondary_is_percent: true, skill_descriptions: Array.from({length:9}, (_, i) => `Skill effect number ${i+1}.`), source_url: 'https://example.com/weapon', updated_at: '2026-09-26T10:00:00Z' } };

test('weapon content, links, metadata and all nine ranks are present without JavaScript', () => {
  const index = createWeaponIndex([weapon]);
  assert.match(index, /href="\/endfield\/weapons\/test_sword\/"/);
  assert.match(index, /data-type="sword" data-rarity="6" data-attribute="Strength"/);
  const page = createWeaponPage(weapon, [weapon]);
  assert.match(page, /rel="canonical" href="https:\/\/rotationforge.gg\/endfield\/weapons\/test_sword\/"/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /<td>0<\/td>/);
  assert.match(page, /<td>9%<\/td>/);
  assert.match(page, /Level 1<\/span><strong>50/);
  for (let rank = 1; rank <= 9; rank++) assert.ok(page.includes(`Skill effect number ${rank}.`));
  assert.match(page, /Operator Database/);
  assert.match(page, /Enemy Database/);
  assert.match(createWeaponSitemap([weapon]), /<lastmod>2026-09-26T10:00:00.000Z<\/lastmod>/);
  assert.equal(weaponImage(weapon), '/endfield/assets/weapons/test_sword.png');
  assert.match(createWeaponPage({...weapon, profile:null, base_atk:null}, [weapon]), /<dd>Unknown<\/dd>/);
});

test('stored text and unsafe image/source URLs cannot inject markup', () => {
  const row = {...weapon, name:'</script><img src=x onerror=alert(1)>', icon_path:'javascript:alert(1)', profile:{...weapon.profile, source_url:'javascript:alert(1)', skill_descriptions:['<script>alert(1)</script>']}};
  for (const html of [createWeaponIndex([row]), createWeaponPage(row, [row])]) {
    assert.doesNotMatch(html, /<img src=x|href="javascript:|src="javascript:|<script>alert/);
    for (const schema of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) assert.doesNotThrow(() => JSON.parse(schema[1]));
  }
  assert.equal(weaponImage(row), '/favicon-flat.png');
  assert.equal(weaponImage({...weapon, icon_path:'assets/weapons/../../private.png'}), '/favicon-flat.png');
});

function clientFor(tables, calls = []) {
  return {from(table) {
    const query = {select:()=>query, eq:(key,value)=>{assert.equal(key,'game');assert.equal(value,'arknights_endfield');return query;}, order:()=>query, range:async(start,end)=>{calls.push([table,start,end]);return tables[table] instanceof Error ? {error:{message:tables[table].message}} : {data:tables[table].slice(start,end+1)};}};
    return query;
  }};
}

test('both weapon tables paginate and join by identity, retaining weapons without profiles', async () => {
  const rows = Array.from({length:501}, (_,i)=>({...weapon,weapon_key:`weapon_${i}`,name:`Weapon ${i}`}));
  const profiles = rows.slice(0,500).map(row=>({...weapon.profile,weapon_key:row.weapon_key}));
  const calls = [];
  const result = await fetchWeapons(clientFor({weapons:rows,weapon_essence_profiles:profiles},calls));
  assert.equal(result.length,501);
  assert.equal(result.find(row=>row.weapon_key==='weapon_0').profile.primary_values[0],0);
  assert.equal(result.find(row=>row.weapon_key==='weapon_500').profile,null);
  for (const table of ['weapons','weapon_essence_profiles']) assert.deepEqual(calls.filter(call=>call[0]===table).map(call=>call.slice(1)),[[0,499],[500,999]]);
  await assert.rejects(fetchWeapons(clientFor({weapons:[],weapon_essence_profiles:[]})),/empty/);
  await assert.rejects(fetchWeapons(clientFor({weapons:rows,weapon_essence_profiles:new Error('offline')})),/offline/);
});

test('regeneration replaces stale weapon pages and preserves other catalogs and good output on invalid input', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'weapons-build-'));
  const options = {outputDir:path.join(root,'weapons'),sitemapPath:path.join(root,'sitemap-weapons.xml')};
  try {
    fs.writeFileSync(path.join(root,'sitemap-enemies.xml'),'unchanged');
    writeWeaponOutput([weapon],options);
    const next = {...weapon,weapon_key:'next_weapon'};
    writeWeaponOutput([next],options);
    assert.equal(fs.existsSync(path.join(options.outputDir,'test_sword')),false);
    assert.ok(fs.existsSync(path.join(options.outputDir,'next_weapon','index.html')));
    for (const bad of [[],[{...weapon,weapon_key:'../outside'}],[next,next]]) assert.throws(()=>writeWeaponOutput(bad,options));
    assert.ok(fs.existsSync(path.join(options.outputDir,'next_weapon','index.html')));
    assert.equal(fs.readFileSync(path.join(root,'sitemap-enemies.xml'),'utf8'),'unchanged');
    assert.doesNotMatch(fs.readFileSync(options.sitemapPath,'utf8'),/test_sword\//);
    // A failed sitemap replacement restores the previously published directory.
    const blockedMap = path.join(root,'directory'); fs.mkdirSync(blockedMap);
    assert.throws(()=>writeWeaponOutput([weapon],{...options,sitemapPath:blockedMap}));
    assert.ok(fs.existsSync(path.join(options.outputDir,'next_weapon','index.html')));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('catalog combines search and filters, sorts numeric ATK and resets its empty state', () => {
  const handlers = {};
  const elements = Object.fromEntries(['search','sort','type','rarity','attribute'].map(key=>[key,{value:key==='sort'?'name':''}]));
  const cards = [{name:'alpha',search:'alpha fire',type:'sword',rarity:'6',attribute:'Strength',atk:'90'}, {name:'beta',search:'beta frost',type:'polearm',rarity:'5',attribute:'Agility',atk:'500'}].map(dataset=>({dataset}));
  const grid = {children:cards.slice(),append(card){this.children=this.children.filter(other=>other!==card).concat(card);}};
  const count = {}, empty = {};
  const form = {elements,addEventListener:(event,fn)=>handlers[event]=fn};
  const nodes = {'.weapon-toolbar':form,'.weapon-grid':grid,'#weapon-count':count,'.empty-state':empty};
  vm.runInNewContext(fs.readFileSync('endfield/js/ui/weaponCatalog.js','utf8'),{document:{querySelector:selector=>nodes[selector]},requestAnimationFrame:fn=>fn()});
  elements.sort.value='atk'; handlers.change(); assert.equal(grid.children[0],cards[1]);
  elements.search.value='fire'; elements.type.value='polearm'; handlers.input(); assert.equal(count.textContent,'0 Weapons'); assert.equal(empty.hidden,false);
  elements.type.value='sword'; handlers.change(); assert.equal(count.textContent,'1 Weapon'); assert.equal(cards[0].hidden,false);
  elements.search.value=''; elements.type.value=''; handlers.reset(); assert.equal(count.textContent,'2 Weapons'); assert.equal(empty.hidden,true);
});
