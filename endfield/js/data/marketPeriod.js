import {detailMarkup,escapeHtml} from './marketData.js?v=6';
export function berlinDay(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function periodHistory(history,period,today=berlinDay()){
 if(!['all','7','30'].includes(period))throw Error('Invalid period');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error('Invalid reference day');
 const end=Date.parse(today+'T00:00:00Z'),start=period==='all'?-Infinity:end-(Number(period)-1)*86400000;
 return history.filter(r=>{const day=Date.parse(r.observation_day+'T00:00:00Z');return day>=start&&day<=end;}).sort((a,b)=>a.observation_day.localeCompare(b.observation_day));
}
export function periodDetail(row,history,period,today=berlinDay()){
 const data=periodHistory(history,period,today),label=period==='all'?'All recorded days':'Last '+period+' calendar days';
 const note=`<p class="market-period-note">${escapeHtml(label)} · ${data.length} observed days · Europe/Berlin. Cards use all-time statistics.</p>`;
 if(!data.length)return detailMarkup(row,[]).replace('<div class="market-detail-stats">',note+'<p>No observations in this period. The last known price is outside this period; see the overview card.</p><div class="market-detail-stats" hidden>').replace('<div class="market-detail-comparison">','<div class="market-detail-comparison" hidden>');
 const prices=data.map(d=>d.price),last=data.at(-1),previous=data.at(-2);
 const stats={...row,latest_price:last.price,latest_observed_at:last.observed_at,min_price:Math.min(...prices),max_price:Math.max(...prices),average_price:prices.reduce((a,b)=>a+b,0)/prices.length,observed_days:data.length,previous_observed_day_price:previous?.price??null};
 return detailMarkup(stats,data).replace('<div class="market-detail-stats">',note+'<div class="market-detail-stats">');
}
