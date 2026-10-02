import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mapOperatorCatalog,formatDescription} from '../tools/operator-catalog-data.js';
import {catalogSkills,catalogSections} from '../tools/operator-catalog-markup.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/operator-catalog-purrchena.json',import.meta.url)));
test('source ranks, final strike, potential multipliers and named upgrade costs resolve correctly',()=>{
 const c=mapOperatorCatalog(fixture.detail,fixture);
 assert.equal(c.skills.length,4);assert.equal(c.potentials.length,5);
 assert.match(c.skills[0].descriptions[0],/21 Stagger/);
 const combo=c.skills.find(s=>s.type==='Combo Skill');
 assert.equal(combo.variants[0].ranks[0].stats.find(s=>s.value==='133%')?.value,'133%');
 assert.notDeepEqual(combo.variants[0].ranks[0].stats,combo.variants[0].ranks[11].stats);
 assert.match(c.potentials[0].description,/1.5 times/);assert.match(c.potentials[3].description,/-15%/);
 assert.ok(c.upgrades.every(u=>u.materials.every(m=>m.name&&!m.name.startsWith('item_'))));
 assert.equal(c.upgrades.find(u=>u.level===2).materials.find(m=>m.id==='item_gold').count,1000);
 assert.doesNotMatch(JSON.stringify(c),/value unavailable|<@|\{poise/);
});
test('missing ranks or materials abort the catalog update instead of dropping content',()=>{
 const d=structuredClone(fixture.detail);Object.values(d.skills)[0].SkillPatchDataBundle.pop();
 assert.throws(()=>mapOperatorCatalog(d,fixture),/Incomplete ranks/);
 assert.throws(()=>mapOperatorCatalog(fixture.detail,{...fixture,items:{}}),/Unknown material/);
 assert.equal(formatDescription('{missing:0%}'), 'value unavailable');
 assert.equal(formatDescription('{1-costvalue:0%}',{costvalue:0.85}), '15%');
 assert.equal(formatDescription('{zero:0%}',{zero:0}), '0%');
});
test('catalog markup keeps all ranks crawlable, escapes source text and includes potentials/materials',()=>{
 const c=mapOperatorCatalog(fixture.detail,fixture);c.skills[0].name='<img onerror=alert(1)>';
 const op={raw_data:{operatorCatalogDetails:c}},h=catalogSkills(op),s=catalogSections(op);
 assert.equal((h.match(/data-catalog-rank="/g)||[]).length,48);
 assert.match(h,/&lt;img onerror/);assert.doesNotMatch(h,/<img onerror/);
 assert.match(h,/min="1" max="12"/);assert.match(s,/id="potentials"/);assert.match(s,/id="materials"/);assert.match(s,/Rank 11 → 12/);
 assert.equal(catalogSkills({}),'');assert.equal(catalogSections({}),'');
});
test('slider selects matching ranks in every card and exposes its accessible value',()=>{
 let input;const slider={value:'12',setAttribute(k,v){this[k]=v;},addEventListener(_,fn){input=fn;}};
 const output={},picker={hidden:true,querySelector:s=>s==='input'?slider:output};
 const panels=Array.from({length:24},(_,i)=>({dataset:{catalogRank:String(i%12+1)}}));
 const root={querySelector:()=>picker,querySelectorAll:()=>panels,classList:{add(){}}};
 vm.runInNewContext(fs.readFileSync('endfield/js/ui/operatorCatalog.js','utf8'),{document:{querySelector:()=>root}});
 assert.equal(picker.hidden,false);assert.equal(panels.filter(p=>!p.hidden).length,2);
 slider.value='1';input();assert.equal(output.textContent,'1');assert.equal(slider['aria-valuetext'],'Skill rank 1');
 assert.ok(panels.filter(p=>!p.hidden).every(p=>p.dataset.catalogRank==='1'&&p.open));
});
