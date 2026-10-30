import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonSeries,comparisonMarkup,comparisonColors} from '../endfield/js/data/marketComparison.js';
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
