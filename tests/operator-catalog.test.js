import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mapOperatorCatalog,formatDescription} from '../tools/operator-catalog-data.js';
import {catalogSkills,catalogSections,catalogSkillHeader,catalogDisplaySkills} from '../tools/operator-catalog-markup.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/operator-catalog-purrchena.json',import.meta.url)));
test('catalog cards preserve existing skill icons and provide local source icons for new skills',()=>{
 const skill={id:'chr_0038_purrche_NormalSkill',name:'Battle skill',type:'Battle Skill'};
 const original=catalogSkillHeader(skill,{element_type:'nature'},[{skill_type:'Battle Skill',icon_small_path:'assets/operators/skills/arcane/jadecrushing-grid.png',element_type:'nature'}]);
 assert.match(original,/src="\/endfield\/assets\/operators\/skills\/arcane\/jadecrushing-grid.png"/);
 assert.match(original,/ef-element-nature ef-fill-half/);
 const fallback=catalogSkillHeader(skill,{element_type:'physical'});
 assert.match(fallback,/catalog-skills\/icon_skill_purrche_01.png/);
 const manifest=JSON.parse(fs.readFileSync('tools/data/operator-skill-icons.json','utf8'));
 assert.equal(Object.keys(manifest).length,128);
 for(const icon of Object.values(manifest))assert.ok(fs.existsSync(`endfield/assets/operators/catalog-skills/${icon}.png`));
});
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
 assert.equal((h.match(/data-catalog-rank="/g)||[]).length,60);
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

test('Dive Attack is a standalone rank-aware skill without duplicating the basic attack description',()=>{
 const c=mapOperatorCatalog(fixture.detail,fixture),before=structuredClone(c.skills),cards=catalogDisplaySkills(c.skills);
 const basic=cards.find(s=>s.type==='Basic Attack'),dive=cards.find(s=>s.type==='Dive Attack');
 assert.equal(cards.length,5);assert.ok(dive);assert.equal(dive.variants[0].ranks.length,12);
 assert.ok(basic.variants.every(v=>!v.id.includes('plunging')));assert.doesNotMatch(basic.descriptions[0],/DIVE ATTACK/);
 assert.match(dive.descriptions[0],/mid-air/);assert.doesNotMatch(dive.descriptions[0],/FINISHER/);
 assert.deepEqual(c.skills,before);
 const html=catalogSkills({raw_data:{operatorCatalogDetails:c}});
 assert.match(html,/<h3>Dive Attack<\/h3>/);assert.equal((html.match(/shared\/dive_attack.png/g)||[]).length,1);
});
test('unified cards use rotation profiles without assigning finisher values to Final Strike',()=>{
 const c=mapOperatorCatalog(fixture.detail,fixture),op={element_type:'physical',raw_data:{operatorCatalogDetails:c}};
 const profiles=[{skill_type:'Final Strike',name:'Profile strike',description:'Controlled operator final strike.'},{skill_type:'Battle Skill',name:'Profile battle',description:'Profile mechanics.'}];
 const html=catalogSkills(op,profiles),first=html.split('</article>')[0];
 assert.match(first,/Profile strike/);assert.match(first,/Controlled operator final strike/);
 assert.doesNotMatch(first,/BASIC ATTACK:|FINISHER:|Finisher ATK Multiplier/);
 assert.match(html,/Profile mechanics/);assert.doesNotMatch(html,/Rotation tool skill profiles/);
 const variants=catalogSkills(op,profiles,[{key:'intellect',skills:profiles},{key:'will',skills:[{...profiles[1],name:'Will skill',description:'Will mechanics.'}]}]);
 assert.match(variants,/data-attribute-variant-panel="intellect"/);assert.match(variants,/data-attribute-variant-panel="will" hidden/);assert.match(variants,/Will mechanics/);
 assert.equal((variants.match(/id="catalog-skill-rank"/g)||[]).length,1);
});
