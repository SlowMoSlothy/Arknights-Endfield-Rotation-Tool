import { renderFormattedText } from './formatted-text.js';
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const icons = {HP:'MaxHP',ATK:'ATK',DEF:'DEF',Defense:'DEF','Stagger HP':'Stagger','Stagger recovery':'Recovery','Finisher ATK multiplier':'Finisher','Finisher SP gain':'SP','Attack range':'Attack_Range',Weight:'Weight',physical:'Resistance_Physical',heat:'Resistance_Heat',cryo:'Resistance_Cryo',electric:'Resistance_Electric',nature:'Resistance_Nature',aether:'Resistance_Ether'};
const icon = label => icons[label] ? `<span class="stat-symbol" style="--stat-icon:url('/endfield/assets/ui/enemy-stats/${icons[label]}.svg?v=3')" aria-hidden="true"></span>` : '';
const card = (label,value,tone='orange') => `<div class="attribute-card tone-${tone}">${icon(label)}<span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
// Recognize the editor's existing plain-text format; preserve every unrecognized line.
export function parseEnemyDescription(description) {
 const lines=String(description || '').split(/\r?\n/), levels=[],attributes=[],prose=[],notes=[];
 for(let i=0;i<lines.length;i++) {
  const line=lines[i];
  if(/^Level\s*\|\s*HP\s*\|\s*ATK\s*\|\s*DEF\s*$/i.test(line) && /^\d+\s*\|/.test(lines[i+1]||'')) {
   while(i+1<lines.length && /^\d+\s*\|\s*[\d,]+\s*\|\s*[\d,]+\s*\|\s*[\d,]+\s*$/.test(lines[i+1])) levels.push(lines[++i].split('|').map(s=>s.trim()));
   continue;
  }
  const split=line.indexOf(':'); const key=line.slice(0,split);
  if(split>0 && ['Stagger HP','Stagger recovery','Finisher ATK multiplier','Finisher SP gain','Attack range','Weight'].includes(key)) attributes.push([key,line.slice(split+1).trim()]);
  else if(/^(Adapted from |January 29 update:)/.test(line)) notes.push(line);
  else prose.push(line);
 }
 return {levels,attributes,prose:prose.join('\n').trim(),notes};
}
export function renderEnemyDossier(row) {
 const parsed=parseEnemyDescription(row.description);
 const details=row.combat_details;
 if(details && typeof details==='object' && !Array.isArray(details) && Object.keys(details).length) {
  const numeric=value=>typeof value==='number' && Number.isFinite(value) && value>=0;
  const format=value=>numeric(value)?value.toLocaleString('en-US'):'Unknown';
  parsed.levels=Array.isArray(details.levels)?details.levels.filter(entry=>entry && Number.isInteger(entry.level) && entry.level>0).map(entry=>[String(entry.level),...['hp','atk','defense'].map(key=>format(entry[key]))]):[];
  parsed.attributes=[];
  for(const [key,label,unit] of [['stagger_hp','Stagger HP',''],['stagger_recovery','Stagger recovery',' seconds'],['finisher_atk_multiplier','Finisher ATK multiplier','×'],['finisher_sp_gain','Finisher SP gain',''],['attack_range','Attack range',' meters'],['weight','Weight','']]) {
   if(numeric(details[key])) parsed.attributes.push([label,format(details[key])+unit]);
  }
 }
 const table=parsed.levels.length ? `<section class="panel enemy-levels"><div class="eyebrow">Level scaling</div><h2>Attributes by level</h2><div class="level-table-wrap"><table class="level-table"><caption>Recorded HP, ATK and DEF at each level</caption><thead><tr>${['Level','HP','ATK','DEF'].map(k=>`<th scope="col">${icon(k)}${k}</th>`).join('')}</tr></thead><tbody>${parsed.levels.map(values=>`<tr>${values.map((v,i)=>i===0?`<th scope="row"><span class="level-badge">LV ${escape(v)}</span></th>`:`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '';
 const primary=[...(parsed.levels.length?[]:[['HP',row.hp??'Unknown']]),['Defense',row.defense??'Unknown'],...parsed.attributes];
 const resistances=['physical','heat','cryo','electric','nature','aether'].map(k=>card(k,formatResistance(row.resistances?.[k], row.combat_details?.resistance_grades?.[k]),k)).join('');
 const groups=new Map();
 for(const skill of row.skills || []) {
  const match=skill.phase == null ? /^([^—]+)\s+—\s+(.+)$/.exec(skill.name) : null;
  const group=skill.phase != null ? (String(skill.phase).trim() || 'Abilities') : (match?match[1].trim():'Abilities');
  if(!groups.has(group)) groups.set(group,[]);
  groups.get(group).push({...skill,name:match?match[2]:skill.name});
 }
 const abilities=[...groups].map(([name,skills],i)=>`<section class="phase-section phase-${i%3}"><header><span class="phase-number">${String(i+1).padStart(2,'0')}</span><div><div class="eyebrow">${name==='Abilities'?'Enemy abilities':'Combat form'}</div><h3>${escape(name)}</h3></div><span class="phase-count">${skills.length} abilities</span></header><div class="phase-abilities">${skills.map(skill=>`<article class="enemy-ability"><h4>${escape(skill.name)}</h4><div class="enemy-formatted-text">${renderFormattedText(skill.description || 'No description has been recorded yet.')}</div></article>`).join('')}</div></section>`).join('');
 return `
 <section id="enemy-overview" class="panel enemy-overview"><div class="eyebrow">Field notes</div><h2>Overview</h2><div class="enemy-formatted-text">${renderFormattedText(parsed.prose || 'No description has been recorded yet.')}</div></section>
 <div id="enemy-attributes" class="dossier-attributes">${table}<section class="panel"><div class="eyebrow">Combat profile</div><h2>Combat values</h2><div class="attribute-grid">${primary.map(([k,v])=>card(k,v)).join('')}</div></section></div>
 <section id="enemy-resistances" class="panel resistance-panel"><div class="eyebrow">Incoming damage</div><h2>Resistances</h2><div class="resistance-grid">${resistances}</div><p class="enemy-help">Resistance: 0% = normal damage · 20% = 20% less damage · Negative = increased damage taken. Letter ranks are recorded separately; Unknown = not recorded.</p></section>
 <section id="enemy-abilities" class="enemy-abilities"><div class="eyebrow">Encounter guide</div><h2>Abilities &amp; combat forms</h2>${abilities || '<p>No abilities have been recorded yet.</p>'}</section>
 ${parsed.notes.length?`<details class="panel enemy-record-notes"><summary>Record history &amp; attribution</summary>${parsed.notes.map(n=>`<p>${escape(n)}</p>`).join('')}</details>`:''}`;
}


export function formatResistance(multiplier, grade) {
 const rank = ['A','B','C','D'].includes(grade) ? grade : '';
 const value = typeof multiplier === 'number' && Number.isFinite(multiplier) && multiplier >= 0 ? `${Number(((1-multiplier)*100).toFixed(6))}%` : 'Unknown';
 return rank ? `${rank} · ${value}` : value;
}
