import fs from 'node:fs';
const skillIcons=JSON.parse(fs.readFileSync(new URL('./data/operator-skill-icons.json',import.meta.url),'utf8'));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:3});
const materials=items=>`<ul class="catalog-materials">${items.map(item=>`<li><span>${escape(item.name)}</span><strong>× ${fmt(item.count)}</strong></li>`).join('')}</ul>`;
export function catalogSkillHeader(skill,operator,existingSkills=[]) {
 const key=value=>String(value||'').toLowerCase().replace(/[ _-]/g,'');
 const existing=existingSkills.find(s=>key(s.skill_type)===key(skill.type));
 const raw=existing?.icon_small_path||existing?.iconSmall||existing?.icon_path||existing?.icon||(skill.type==='Dive Attack'?'assets/operators/skills/shared/dive_attack.png':'');
 const relative=String(raw||'').replace(/^\/?endfield\//,'').replace(/^\//,'');
 const local=/^assets\/[a-zA-Z0-9_./-]+$/.test(relative)&&!relative.includes('..')&&fs.existsSync(new URL('../endfield/'+relative,import.meta.url));
 const source=skillIcons[skill.id];
 const icon=local?'/endfield/'+relative:source?'/endfield/assets/operators/catalog-skills/'+source+'.png':'';
 const element=existing?.element_type||operator.element_type;
 const tone=['physical','heat','cryo','electric','nature'].includes(element)?element:'neutral';
 return `<div class="skill-head"><div class="skill-icon-wrap"><div class="ef-skill-icon ef-element-${tone} ef-fill-${skill.type==='Ultimate'?'full':'half'}"><span class="ef-skill-fill"></span><span class="ef-skill-ring"></span><span class="ef-skill-glyph-wrap">${icon?`<img class="ef-skill-glyph" src="${escape(icon)}" alt="${escape(skill.name)} icon" loading="lazy" width="52" height="52">`:'<span class="skill-placeholder">?</span>'}</span></div></div><div><span class="skill-type">${escape(skill.type)}</span><h3>${escape(skill.name)}</h3></div></div>`;
}
export function catalogDisplaySkills(skills) {
 return skills.flatMap(skill=>{
   if(skill.type!=='Basic Attack')return [skill];
   const dives=skill.variants.filter(variant=>variant.id.includes('plunging'));
   if(!dives.length)return [skill];
   const pattern=/(?:^|\n)\s*DIVE ATTACK:\s*([\s\S]*?)(?=\n\s*(?:FINISHER|BASIC ATTACK):|$)/i;
   return [{...skill,variants:skill.variants.filter(variant=>!dives.includes(variant)),descriptions:skill.descriptions.map(text=>text.replace(pattern,'').trim())},
     {id:skill.id+'_dive',name:'Dive Attack',type:'Dive Attack',variants:dives,descriptions:skill.descriptions.map(text=>text.match(pattern)?.[1].trim()||'Description unavailable from the source.')}];
 });
}
export function catalogSkills(operator, existingSkills=[]) {
 const catalog=operator.raw_data?.operatorCatalogDetails;if(!catalog)return '';
 return `<div class="catalog-skills" data-catalog-skills><p class="operator-level-source">Skill values at the selected rank, before potential and combat modifiers.</p><div class="operator-level-picker" data-catalog-rank-picker hidden><label for="catalog-skill-rank">Skill rank <output for="catalog-skill-rank">12</output></label><input id="catalog-skill-rank" type="range" min="1" max="12" step="1" value="12"></div><div class="skills-grid">${catalogDisplaySkills(catalog.skills).map(skill=>`<article class="skill-card">${catalogSkillHeader(skill,operator,existingSkills)}${Array.from({length:12},(_,i)=>{
 const rank=i+1;
 return `<details class="catalog-rank" data-catalog-rank="${rank}"${rank===12?' open':''}><summary>Rank ${rank}</summary><p class="catalog-description">${escape(skill.descriptions[i])}</p>${skill.variants.filter(variant=>!(skill.type==='Basic Attack'&&/_attack\d+$/.test(variant.id))).map(variant=>{const r=variant.ranks[i];return `<section class="catalog-variant">${skill.type==='Dive Attack'?'':`<h4>${escape(variant.label)}</h4>`}<dl class="catalog-values">${r.cooldown!==null?`<div><dt>Cooldown</dt><dd>${fmt(r.cooldown)} s</dd></div>`:''}${r.cost>0?`<div><dt>${skill.type==='Ultimate'?'Ultimate Energy':'SP'} cost</dt><dd>${fmt(r.cost)}</dd></div>`:''}${r.stats.map(stat=>`<div><dt>${escape(stat.label)}</dt><dd>${escape(stat.value)}</dd></div>`).join('')}</dl>${!r.stats.length?'<p class="operator-level-source">Additional rank values are not provided for this variant.</p>':''}</section>`;}).join('')}</details>`;
 }).join('')}</article>`).join('')}</div></div>`;
}
export function catalogSections(operator) {
 const catalog=operator.raw_data?.operatorCatalogDetails;if(!catalog)return '';
 const skillNames=[...new Set(catalog.upgrades.map(u=>u.skill))];
 return `<section class="panel profile-section catalog-section" id="potentials"><span class="section-kicker">Potential upgrades</span><h2>Potentials</h2><div class="skills-grid">${catalog.potentials.map(p=>`<article class="skill-card"><span class="skill-type">Potential ${p.level}</span><h3>${escape(p.name)}</h3><p class="catalog-description">${escape(p.description)}</p></article>`).join('')}</div></section><section class="panel profile-section catalog-section" id="materials"><span class="section-kicker">Operator progression</span><h2>Upgrade materials</h2><p class="operator-level-source">Costs for each individual promotion or skill rank upgrade; amounts are not cumulative.</p><h3>Promotions &amp; outfitting</h3><div class="skills-grid">${catalog.promotions.map(p=>`<article class="skill-card"><h4>${escape(p.name)}</h4>${materials(p.materials)}</article>`).join('')}</div><h3>Skill upgrades</h3>${skillNames.map(name=>`<details class="catalog-upgrades"><summary>${escape(name)}</summary><div class="skills-grid">${catalog.upgrades.filter(u=>u.skill===name).sort((a,b)=>a.level-b.level).map(u=>`<article class="skill-card"><h4>Rank ${u.level-1} → ${u.level}</h4>${materials(u.materials)}</article>`).join('')}</div></details>`).join('')}<p class="operator-level-source">Source: <a href="https://endfieldtools.dev/characters/" rel="noopener noreferrer" target="_blank">EndfieldTools community data ↗</a></p></section>`;
}
