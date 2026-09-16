const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const icons = {HP:'MaxHP',ATK:'ATK',DEF:'DEF',Defense:'DEF','Stagger HP':'Stagger','Stagger recovery':'Stagger','Finisher ATK multiplier':'Stagger','Finisher SP gain':'Stagger','Attack range':'Attack_Range',Weight:'Weight',physical:'Physical',heat:'Heat',cryo:'Cryo',electric:'Electric',nature:'Nature',aether:'Ether'};
const icon = label => icons[label] ? `<span class="stat-symbol" style="--stat-icon:url('/endfield/assets/ui/enemy-stats/${icons[label]}.png')" aria-hidden="true"></span>` : '';
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
 const table=parsed.levels.length ? `<section class="panel enemy-levels"><div class="eyebrow">Level scaling</div><h2>Attributes by level</h2><div class="level-table-wrap"><table class="level-table"><caption>Recorded HP, ATK and DEF at each level</caption><thead><tr>${['Level','HP','ATK','DEF'].map(k=>`<th scope="col">${icon(k)}${k}</th>`).join('')}</tr></thead><tbody>${parsed.levels.map(values=>`<tr>${values.map((v,i)=>i===0?`<th scope="row"><span class="level-badge">LV ${escape(v)}</span></th>`:`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '';
 const primary=[...(parsed.levels.length?[]:[['HP',row.hp??'Unknown']]),['Defense',row.defense??'Unknown'],...parsed.attributes];
 const resistances=['physical','heat','cryo','electric','nature','aether'].map(k=>card(k,row.resistances?.[k]==null?'Unknown':`${row.resistances[k]}×`,k)).join('');
 const groups=new Map();
 for(const skill of row.skills || []) {
  const match=/^([^—]+)\s+—\s+(.+)$/.exec(skill.name);
  const group=match?match[1].trim():'Abilities';
  if(!groups.has(group)) groups.set(group,[]);
  groups.get(group).push({...skill,name:match?match[2]:skill.name});
 }
 const abilities=[...groups].map(([name,skills],i)=>`<section class="phase-section phase-${i%3}"><header><span class="phase-number">${String(i+1).padStart(2,'0')}</span><div><div class="eyebrow">${name==='Abilities'?'Enemy abilities':'Combat form'}</div><h3>${escape(name)}</h3></div><span class="phase-count">${skills.length} abilities</span></header><div class="phase-abilities">${skills.map(skill=>`<article class="enemy-ability"><h4>${escape(skill.name)}</h4><p>${escape(skill.description || 'No description has been recorded yet.')}</p></article>`).join('')}</div></section>`).join('');
 return `<nav class="enemy-section-nav" aria-label="Enemy profile sections"><a href="#enemy-attributes">Attributes</a><a href="#enemy-resistances">Resistances</a><a href="#enemy-abilities">Abilities</a><a href="#enemy-source">Sources</a></nav>
 <section class="panel enemy-overview"><div class="eyebrow">Field notes</div><h2>Overview</h2><p>${escape(parsed.prose || 'No description has been recorded yet.')}</p></section>
 <div id="enemy-attributes" class="dossier-attributes">${table}<section class="panel"><div class="eyebrow">Combat profile</div><h2>Combat values</h2><div class="attribute-grid">${primary.map(([k,v])=>card(k,v)).join('')}</div></section></div>
 <section id="enemy-resistances" class="panel resistance-panel"><div class="eyebrow">Incoming damage</div><h2>Resistances</h2><div class="resistance-grid">${resistances}</div><p class="enemy-help">Multipliers: 1× = normal damage · 0.8× = 20% less damage · Unknown = not recorded.</p></section>
 <section id="enemy-abilities" class="enemy-abilities"><div class="eyebrow">Encounter guide</div><h2>Abilities &amp; combat forms</h2>${abilities || '<p>No abilities have been recorded yet.</p>'}</section>
 ${parsed.notes.length?`<details class="panel enemy-record-notes"><summary>Record history &amp; attribution</summary>${parsed.notes.map(n=>`<p>${escape(n)}</p>`).join('')}</details>`:''}`;
}
