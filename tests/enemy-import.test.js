import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { refresh } from '../tools/refresh-enemy-source-snapshot.js';
import { parseSource, mapSource, planImport, stableId, buildSql, loadSource } from '../tools/sync-endfield-enemies.js';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/enemy-import/ram.json',import.meta.url),'utf8'));
test('runner access denial uses an explicitly dated, checksum-verified capture, not silent fallback for invalid data',async()=>{
  const loaded=await loadSource(async()=>{const error=new Error('denied');error.status=403;throw error;});
  assert.equal(loaded.mode,'snapshot-fallback-http-403');assert.ok(Date.parse(loaded.capturedAt));assert.equal(mapSource(loaded.data).length,87);
  await assert.rejects(loadSource(async()=>{throw new Error('invalid schema');}),/invalid schema/);
});
function sourceData() {
  const data={EnemyTemplateDisplayInfoTable:{},EnemyTable:{},EnemyAttributeTemplateTable:{[fixture.enemy.attrTemplateId]:fixture.attrs},EnemyAbilityDescTable:fixture.abilities,DistributionInfoTable:fixture.distributions,AttributeMetaTable:structuredClone(fixture.meta),text:{...fixture.text},images:[]};
  for(let i=0;i<80;i++) {
    const id=`eny_test_${i}`;
    data.EnemyTemplateDisplayInfoTable[id]={...fixture.display,templateId:id,name:{id:0,text:`Enemy ${i}`}};
    data.EnemyTable[id]={...fixture.enemy,templateId:id};
    data.images.push(`assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/${id}.png`);
  }
  return data;
}
test('snapshot refresh validates all downloads before saving a usable source bundle',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'enemy-snapshot-')),outputUrl=pathToFileURL(root+path.sep);
  try {
    await assert.rejects(refresh({data:sourceData(),outputUrl,fetcher:async()=>new Response('denied',{status:403})}),/capture failed/);
    assert.deepEqual(fs.readdirSync(root),[]);
    await refresh({data:sourceData(),outputUrl,fetcher:async()=>new Response(Buffer.from('RIFF\x04\x00\x00\x00WEBP'))});
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'enemy-source-snapshot.json'),'utf8'));
    assert.equal(Object.keys(manifest.images).length,80);
    assert.equal(mapSource(JSON.parse(gunzipSync(fs.readFileSync(path.join(root,'enemy-source-snapshot.json.gz'))))).length,80);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('signed localization hashes survive parsing without rounding',()=>{
  assert.equal(parseSource('{"name":{"id":-2427813328797068423,"text":""}}').name.id,'-2427813328797068423');
  assert.equal(parseSource('{"id":12}').id,12);
});
test('real game fixture maps complete levels, localization, source category and scalar resistances',()=>{
  const data=sourceData(),rows=mapSource(data);
  assert.equal(rows.length,80);
  assert.equal(rows[0].row.combat_details.levels.length,100);
  assert.equal(rows[0].row.hp,fixture.attrs.levelDependentAttributes[89].attrs.find(a=>a.attrType===1).attrValue);
  assert.equal(rows[0].row.combat_details.base_stats_level,90);
  assert.equal(rows[0].row.skills[0].description,'This enemy has no special abilities.');
  assert.equal(rows[0].row.skills[0].id,undefined);
  const raw=Object.fromEntries(fixture.attrs.levelIndependentAttributes.attrs.map(x=>[x.attrType,x.attrValue]));
  assert.equal(rows[0].row.resistances.nature,raw[81]);
  assert.equal(rows[0].row.resistances.heat,raw[84]);
  delete data.text[fixture.display.description.id];assert.throws(()=>mapSource(data),/localization/);
  assert.throws(()=>mapSource({...sourceData(),EnemyTemplateDisplayInfoTable:{}}),/unexpectedly small/);
  const changed=sourceData();changed.AttributeMetaTable[81].iconName='wrong';assert.throws(()=>mapSource(changed),/attribute mapping/);
  const partial=sourceData();partial.EnemyAttributeTemplateTable=structuredClone(partial.EnemyAttributeTemplateTable);partial.EnemyAttributeTemplateTable[fixture.enemy.attrTemplateId].levelDependentAttributes.pop();assert.throws(()=>mapSource(partial),/Incomplete level/);
});
test('manual profiles and simulation skills are untouched; imports are idempotent and preserve editor changes',()=>{
  const source=mapSource(sourceData());
  const manual={id:'10000000-0000-4000-8000-000000000001',name:'Enemy 0',category:'boss',skills:[{id:123,name:'Manual combat action',description:'Keep me'}],combat_details:{levels:[{level:90,hp:123}]}};
  const initial=planImport(source,[manual]);assert.equal(initial.changes.length,79);assert.equal(initial.protectedRows.length,1);
  assert.ok(!initial.changes.some(c=>c.after.id===manual.id));
  const saved=initial.changes.map(c=>({...c.after,updated_at:'2026-09-27T00:00:00+00:00'}));
  assert.equal(planImport(source,[manual,...saved]).changes.length,0);
  const row=saved[0],edited={...row,description:'My description',is_visible:false,skills:[{id:456,name:'Simulation',description:'Preserve'}],combat_details:{...row.combat_details,custom_flag:true}};
  const updated=structuredClone(source);const target=updated.find(s=>s.sourceId===row.combat_details.catalog_import.source_id);target.row.description='Upstream description';target.row.location='New location';
  const next=planImport(updated,[manual,edited,...saved.slice(1)]).changes.find(c=>c.after.id===edited.id).after;
  assert.equal(next.description,'My description');assert.equal(next.is_visible,false);assert.equal(next.skills[0].id,456);assert.equal(next.combat_details.custom_flag,true);assert.equal(next.location,'New location');
});
test('duplicate display names have unique stable URLs and source renames retain identity and route',()=>{
  const source=mapSource(sourceData());source[1].row.name=source[0].row.name;
  const first=planImport(source,[]);const rows=first.changes.map(c=>c.after);
  assert.equal(new Set(rows.map(r=>r.combat_details.catalog_import.slug)).size,80);
  const id=stableId(source[0].sourceId),before=rows.find(r=>r.id===id);source[0].row.name='Renamed';
  const after=planImport(source,rows).changes.find(c=>c.after.id===id).after;
  assert.equal(after.name,'Renamed');assert.equal(after.combat_details.catalog_import.slug,before.combat_details.catalog_import.slug);
  assert.throws(()=>planImport(source.slice(0,50),rows),/shrank/);
});
test('SQL uses snapshots, escaping and one transaction without deleting profiles',()=>{
  const source=mapSource(sourceData());source[0].row.description="O'Brien $guard$; drop table enemies; --";
  const plan=planImport(source,[]),query=buildSql(plan);
  assert.ok(query.startsWith('begin;'));assert.ok(query.endsWith('commit;'));
  assert.match(query,/lock table public.enemies/);assert.match(query,/unchanged_enemy_guard/);assert.match(query,/O''Brien \$guard\$/);
  assert.doesNotMatch(query,/delete from|do \$guard\$/i);
  const saved=plan.changes.map(c=>c.after);source[1].row.location='new';
  assert.match(buildSql(planImport(source,saved)),/to_jsonb\(e\) @>/);
});
