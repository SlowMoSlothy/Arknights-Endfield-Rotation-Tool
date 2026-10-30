import {displayName,escapeHtml,number,validateHistory} from './marketData.js?v=6';
import {periodHistory} from './marketPeriod.js';
export const comparisonColors=['#fc8b32','#68d4be','#81b5ff','#d49af5'];
export function comparisonSeries(entries,period,today){if(entries.length>4)throw Error('Compare up to four goods.');return entries.map((entry,i)=>{validateHistory(entry.history);const points=periodHistory(entry.history,period,today);const prices=points.map(p=>p.price);return{...entry,points,color:comparisonColors[i],min:points.length?Math.min(...prices):null,max:points.length?Math.max(...prices):null,average:points.length?prices.reduce((a,b)=>a+b,0)/prices.length:null};});}
// Transform after period filtering: every good uses its own first observed price.
export function comparisonValues(series,mode='price'){
 if(!['price','change'].includes(mode))throw Error('Invalid comparison mode');
 return series.map(s=>{
  const baseline=s.points[0];
  const points=s.points.map(p=>({...p,value:mode==='change'?(p.price-baseline.price)/baseline.price*100:p.price}));
  const values=points.map(p=>p.value);
  return {...s,baseline,points,min:points.length?Math.min(...values):null,max:points.length?Math.max(...values):null,average:points.length?values.reduce((a,b)=>a+b,0)/values.length:null};
 });
}
export function comparisonMarkup(series,mode='price'){
 series=comparisonValues(series,mode);
 const relative=mode==='change',format=value=>value==null?'—':relative?((value>0?'+':'')+number(value)+'%'):number(value);
 const points=series.flatMap(s=>s.points);if(!series.length)return '<p>Select two to four goods to compare their recorded price histories.</p>';if(!points.length)return '<p>No observations in this period for the selected goods.</p>';
 const days=points.map(p=>Date.parse(p.observation_day+'T00:00:00Z')),start=Math.min(...days),end=Math.max(...days),min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value)),pad=Math.max(relative?1:50,(max-min)*.1),low=relative?min-pad:Math.max(0,min-pad),high=max+pad;
 const x=p=>start===end?450:75+(Date.parse(p.observation_day+'T00:00:00Z')-start)/(end-start)*745,y=value=>235-(value-low)/(high-low)*205;
 const ticks=relative?[...new Set([low,0,high])]:[low,(low+high)/2,high];
 const grid=ticks.map(value=>`<line x1="75" y1="${y(value)}" x2="820" y2="${y(value)}" stroke="#a0aaa9" opacity="${relative&&value===0?'.6':'.17'}"/><text x="63" y="${y(value)+4}" text-anchor="end">${format(value)}</text>`).join('');
 const lines=series.map((s,i)=>`<g><polyline points="${s.points.map(p=>`${x(p)},${y(p.value)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-dasharray="${['none','8 4','3 4','10 3 2 3'][i]}"/>${s.points.map(p=>`<circle cx="${x(p)}" cy="${y(p.value)}" r="4" fill="${s.color}"><title>${escapeHtml(displayName(s.row))}: ${p.observation_day} · ${format(p.value)}${relative?' · Price '+number(p.price):''}</title></circle>`).join('')}</g>`).join('');
 const legend=series.map(s=>`<span><i style="background:${s.color}"></i>${escapeHtml(displayName(s.row))} · ${s.points.length} days${relative&&s.baseline?' · 0% on '+s.baseline.observation_day:''}</span>`).join('');
 const table=series.map(s=>`<tr><th scope="row">${escapeHtml(displayName(s.row))}</th><td>${s.points.length}</td>${relative?'<td>'+number(s.baseline?.price)+'</td>':''}<td>${format(s.points.at(-1)?.value)}</td><td>${format(s.min)}</td><td>${format(s.average)}</td><td>${format(s.max)}</td></tr>`).join('');
 return `<div class="comparison-legend">${legend}</div><svg class="comparison-chart" viewBox="0 0 880 280" role="img" aria-label="Recorded ${relative?'percentage changes':'price histories'} for ${series.length} goods; daily values are available in the tables below"><g class="comparison-chart-labels">${grid}<text x="75" y="267">${new Date(start).toISOString().slice(0,10)}</text><text x="820" y="267" text-anchor="end">${new Date(end).toISOString().slice(0,10)}</text></g>${lines}</svg><div class="comparison-table"><table><thead><tr><th>Good</th><th>Days</th>${relative?'<th>First price</th>':''}<th>${relative?'Last change %':'Last in period'}</th><th>Min${relative?' %':''}</th><th>Average${relative?' %':''}</th><th>Max${relative?' %':''}</th></tr></thead><tbody>${table}</tbody></table></div><details><summary>Recorded daily values</summary><div class="comparison-table"><table><thead><tr><th>Good</th><th>Date (Berlin)</th><th>Price</th>${relative?'<th>Change %</th>':''}</tr></thead><tbody>${series.flatMap(s=>s.points.map(p=>`<tr><td>${escapeHtml(displayName(s.row))}</td><td>${p.observation_day}</td><td>${number(p.price)}</td>${relative?'<td>'+format(p.value)+'</td>':''}</tr>`)).join('')}</tbody></table></div></details><p class="comparison-note">${relative?"Change % = (price / first recorded price in the selected period − 1) × 100. Each good starts at 0%; first observation dates may differ (see legend). Percentage statistics use this same baseline.":'Absolute prices per package.'} Each dot is an observed day in Europe/Berlin. Lines connect observations and do not fill missing days. Statistics apply only to this comparison period.</p>`;
}
