import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonSeries,comparisonMarkup,comparisonColors,comparisonValues} from '../endfield/js/data/marketComparison.js';
const row={name:'Test <good>',goods_id:'unknown',region:'Wuling'};
const history=[['2026-09-30',500],['2026-10-24',1000],['2026-10-30',2000]].map(([day,price])=>({observation_day:day,observed_at:day+'T12:00:00Z',price}));
test('comparison windows and summary use only dated observations',()=>{
 const entries=[{row,history},{row:{...row,name:'Second'},history:history.slice(1)}];
 const series=comparisonSeries(entries,'7','2026-10-30');
 assert.equal(series[0].points.length,2);assert.equal(series[0].average,1500);assert.equal(series[0].min,1000);assert.equal(series[0].max,2000);
 assert.equal(comparisonSeries(entries,'all','2026-10-30')[0].points.length,3);
 assert.equal(comparisonSeries(entries,'30','2026-10-30')[0].points.length,2);
 assert.notEqual(series[0].color,series[1].color);
 const html=comparisonMarkup(series);assert.equal((html.match(/<circle /g)||[]).length,4);assert.equal((html.match(/<polyline /g)||[]).length,2);assert(html.includes('1,500'));assert(html.includes('Test &lt;good&gt;'));assert(!html.includes('Test <good>'));assert(html.includes('stroke-dasharray="8 4"'));
});
test('four goods maximum with distinct series colors',()=>{
 const entries=Array.from({length:4},()=>({row,history}));assert.equal(new Set(comparisonColors).size,4);assert.equal(comparisonSeries(entries,'all','2026-10-30').length,4);assert.throws(()=>comparisonSeries([...entries,entries[0]],'all'),/four/);
});
test('empty, partial, single-day and constant series remain meaningful',()=>{
 assert.match(comparisonMarkup([]),/Select two to four/);
 const empty=comparisonSeries([{row,history}],'7','2027-01-01');assert.match(comparisonMarkup(empty),/No observations/);
 const single=comparisonSeries([{row,history:history.slice(-1)},{row,history:[]}],'all','2026-10-30');const html=comparisonMarkup(single);assert(!/NaN|Infinity/.test(html));assert(html.includes('cx="450"'));assert.equal(single[1].average,null);assert(html.includes('—'));
});
test('shared time axis spaces missing days by calendar distance',()=>{
 const spaced=[['2026-10-24',1000],['2026-10-25',1000],['2026-10-30',1000]].map(([day,price])=>({observation_day:day,observed_at:day+'T12:00:00Z',price}));
 const html=comparisonMarkup(comparisonSeries([{row,history:spaced}],'all','2026-10-30'));
 const xs=[...html.matchAll(/<circle cx="([\d.]+)"/g)].map(m=>Number(m[1]));assert.equal(xs.length,3);assert(Math.abs((xs[2]-xs[1])/(xs[1]-xs[0])-5)<1e-10);assert(!/NaN|Infinity/.test(html));
});
test('percentage mode normalizes different starting prices without changing raw prices',()=>{
 const entries=[{row,history},{row:{...row,name:'Second'},history:history.map(p=>({...p,price:p.price*2}))}];
 const source=comparisonSeries(entries,'7','2026-10-30'),before=JSON.stringify(source),values=comparisonValues(source,'change');
 assert.deepEqual(values.map(s=>s.points.map(p=>p.value)),[[0,100],[0,100]]);
 assert.equal(values[0].average,50);assert.equal(values[1].baseline.price,2000);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(comparisonValues(source,'price').map(s=>s.points.map(p=>p.value)),[[1000,2000],[2000,4000]]);
 const html=comparisonMarkup(source,'change');assert(html.includes('+100%'));assert(html.includes('0% on 2026-10-24'));assert(html.includes('First price'));assert(html.includes('Last change %'));assert(html.includes('Price 4,000'));assert(!html.includes('Absolute prices per package'));
 assert.throws(()=>comparisonValues(source,'bad'),/Invalid comparison mode/);
});
test('each selected period rebases on its first actual observation and shows baseline dates',()=>{
 const all=comparisonValues(comparisonSeries([{row,history}],'all','2026-10-30'),'change');
 const week=comparisonValues(comparisonSeries([{row,history}],'7','2026-10-30'),'change');
 assert.equal(all[0].points.at(-1).value,300);assert.equal(week[0].points.at(-1).value,100);
 const html=comparisonMarkup(comparisonSeries([{row,history},{row,history:history.slice(-1)}],'all','2026-10-30'),'change');
 assert(html.includes('0% on 2026-09-30'));assert(html.includes('0% on 2026-10-30'));assert(html.includes('first observation dates may differ'));
});
test('percentage mode handles declines, constant prices, one observation and empty series',()=>{
 const falling=history.slice(1).map((p,i)=>({...p,price:i?500:1000}));
 const entries=[{row,history:falling},{row,history:history.slice(-1)},{row,history:[]},{row,history:falling.map(p=>({...p,price:1000}))}];
 const source=comparisonSeries(entries,'all','2026-10-30'),values=comparisonValues(source,'change'),html=comparisonMarkup(source,'change');
 assert.deepEqual(values[0].points.map(p=>p.value),[0,-50]);assert.equal(values[0].average,-25);assert.equal(values[1].points[0].value,0);assert.equal(values[2].average,null);assert.equal(values[3].max,0);assert(html.includes('-50%'));assert(html.includes('0%'));assert(!/NaN|Infinity/.test(html));
 assert(!/NaN|Infinity/.test(comparisonMarkup(comparisonSeries([entries[1]],'all','2026-10-30'),'change')));
 assert.match(comparisonMarkup(comparisonSeries([entries[2]],'all','2026-10-30'),'change'),/No observations/);
});
