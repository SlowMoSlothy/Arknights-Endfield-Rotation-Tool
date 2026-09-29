import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLevels,planOperator,buildSql,normalizeRows} from '../tools/sync-endfield-operators.js';
import {operatorProgression} from '../tools/operator-progression.js';
const detail=()=>({charId:'chr_test',attributes:Array.from({length:100},(_,index)=>({breakStage:0,Attribute:{attrs:[{attrType:0,attrValue:index+1},...[1,2,39,40,41,42].map(attrType=>({attrType,attrValue:String(index+attrType+0.25)}))]}}))});
test('Management numeric strings normalize without changing raw data, names or missing values',()=>{
 assert.deepEqual(normalizeRows([{name:'123',base_strength:'121',base_agility_level_1:'9.6',base_hp:null,raw_data:{id:'123'},_import_version:'abc'}]),[{name:'123',base_strength:121,base_agility_level_1:9.6,base_hp:null,raw_data:{id:'123'},_import_version:'abc'}]);
});
test('imports complete 1–90 levels and rejects missing, invalid or conflicting breakthrough data',()=>{
 const source=detail();source.attributes.push(structuredClone(source.attributes[19]));
 assert.equal(mapLevels(source).length,90);source.attributes.at(-1).Attribute.attrs[1].attrValue=999;
 assert.throws(()=>mapLevels(source),/Conflicting/);
 const missing=detail();missing.attributes.shift();assert.throws(()=>mapLevels(missing),/Incomplete/);
 const invalid=detail();invalid.attributes[0].Attribute.attrs[1].attrValue=null;assert.throws(()=>mapLevels(invalid),/invalid hp/);
});
test('stat updates preserve mechanics, are idempotent, and respect later manual stat edits',()=>{
 const source=detail(),row={id:1,name:'Test',raw_data:{basicAttack:{timingVerified:true},altSkills:['keep'],attributeVariants:['keep'],baseStatsMissing:true}};
 const change=planOperator(row,source),saved={...row,...change.after};
 assert.deepEqual(saved.raw_data.basicAttack,row.raw_data.basicAttack);assert.deepEqual(saved.raw_data.altSkills,row.raw_data.altSkills);
 assert.equal(saved.raw_data.baseStatsMissing,false);assert.equal(saved.base_stats_level,90);
 assert.deepEqual(planOperator(saved,source).after,change.after);
 saved.base_atk=777;saved.raw_data.baseAtk=778;
 assert.equal(planOperator(saved,source).after.base_atk,777);assert.equal(planOperator(saved,source).after.raw_data.baseAtk,778);
 const sql=buildSql([change]);assert.match(sql,/lock table public.operators/);assert.match(sql,/to_jsonb\(o\) @>/);assert.doesNotMatch(sql,/operator_skills|delete |insert /i);
 assert.equal(change.rawPatch.basicAttack,undefined);assert.equal(change.rawPatch.altSkills,undefined);
 const versioned=buildSql([{...change,version:'a'.repeat(32)}]);assert.match(versioned,/md5\(to_jsonb\(o\)::text\)/);assert.match(versioned,/raw_data=coalesce\(o.raw_data/);
 assert.throws(()=>buildSql([{...change,id:'1;drop'}]),/Invalid/);
});
test('operator slider retains crawlable levels, excludes 91–100, and safely falls back without imported data',()=>{
 const row={raw_data:{operatorCatalogImport:{levels:mapLevels(detail())}}};const html=operatorProgression(row,'existing stats');
 assert.match(html,/max="90"/);assert.match(html,/<th scope="row">90<\/th>/);assert.doesNotMatch(html,/<th scope="row">100<\/th>/);
 assert.ok(html.indexOf('existing stats')<html.indexOf('All level values'));
 assert.equal(operatorProgression({},'fallback'),'<div class="stats-grid attribute-stats">fallback</div>');
});
