const FIELDS=['hp','atk','strength','agility','intellect','will'];
const LABELS=['HP','ATK','Strength','Agility','Intellect','Will'];
export function operatorProgression(operator, statsHtml = '') {
  const stats=`<div class="stats-grid attribute-stats">${statsHtml}</div>`;
  const levels=operator.raw_data?.operatorCatalogImport?.levels;
  if(!Array.isArray(levels)||levels.length!==90||!levels.every((row,index)=>row.level===index+1&&FIELDS.every(key=>typeof row[key]==='number'&&Number.isFinite(row[key])&&row[key]>=0))) return stats;
  const format=value=>Math.floor(value).toLocaleString('en-US');
  return `<div class="operator-level-picker" hidden><label for="operator-level">Level <output for="operator-level">90</output></label><input id="operator-level" type="range" min="1" max="90" step="1" value="90" aria-describedby="operator-level-help"><p id="operator-level-help">Base attributes at the selected level, rounded down. Equipment, talents, potential and combat buffs are not included.</p></div>${stats}<details class="operator-all-levels" open><summary>All level values</summary><div class="operator-level-table-wrap" tabindex="0" role="region" aria-label="Operator attributes by level"><table class="operator-level-table"><caption>Base attributes, levels 1–90</caption><thead><tr><th scope="col">Level</th>${LABELS.map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${levels.map(row=>`<tr><th scope="row">${row.level}</th>${FIELDS.map(key=>`<td>${format(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details><p class="operator-level-source">Level values: <a href="https://endfieldtools.dev/characters/" target="_blank" rel="noopener noreferrer">EndfieldTools community data ↗</a></p>`;
}
