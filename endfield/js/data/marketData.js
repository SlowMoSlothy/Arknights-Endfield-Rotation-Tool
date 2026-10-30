export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const number = value => value == null ? '—' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value));
export const identity = row => row.shop_id + ':' + row.goods_id;
export function validateStats(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid market response');
  const seen = new Set();
  for (const r of rows) {
    if (!/^domainshop_page_rand_map0[12]$/.test(r.shop_id) || !/^domainshop_goods_rand_map0[12]_\d+$/.test(r.goods_id) || seen.has(identity(r)) || !['Wuling','Tal II'].includes(r.region) || !r.name || !Number.isFinite(Date.parse(r.latest_observed_at)) || !Number.isInteger(r.latest_price) || r.latest_price <= 0 || !Number.isInteger(r.base_price) || r.base_price <= 0 || !Number.isInteger(r.observed_days) || r.observed_days < 1 || ![r.min_price,r.max_price,Number(r.average_price)].every(v => Number.isFinite(v) && v > 0)) throw new Error('Invalid market values');
    seen.add(identity(r));
  }
  return rows;
}
export function filterStats(rows, { search = '', region = '', sort = 'name' } = {}) {
  const q = search.trim().toLocaleLowerCase();
  return rows.filter(r => (!region || r.region === region) && (!q || r.name.toLocaleLowerCase().includes(q) || r.goods_id.includes(q))).sort((a,b) => sort === 'price-low' ? a.latest_price-b.latest_price : sort === 'price-high' ? b.latest_price-a.latest_price : sort === 'deviation' ? (a.latest_price/a.base_price)-(b.latest_price/b.base_price) : a.name.localeCompare(b.name,'en'));
}
export function cardMarkup(r, selected = false) {
  const pct = (r.latest_price / r.base_price - 1) * 100;
  return `<button type="button" class="market-item${selected?' selected':''}" data-market-id="${escapeHtml(identity(r))}" aria-pressed="${selected}"><span class="market-item-top"><span>${escapeHtml(r.region)}</span><span class="${pct<0?'below':'above'}">${pct>0?'+':''}${number(pct)}%</span></span><strong class="market-name">${escapeHtml(r.name.replace(' [Paket]',''))}</strong><span class="market-price">${number(r.latest_price)} <small>per package</small></span><span class="market-mini">Min ${number(r.min_price)} <span>Avg ${number(r.average_price)}</span> Max ${number(r.max_price)}</span><span class="market-item-bottom">${r.observed_days} recorded days <span>View history ↗</span></span></button>`;
}
export function validateHistory(rows) {
  if (!Array.isArray(rows) || rows.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.observation_day) || !Number.isFinite(Date.parse(r.observation_day)) || !Number.isInteger(r.price) || r.price <= 0 || !Number.isFinite(Date.parse(r.observed_at)))) throw new Error('Invalid market history');
  return rows;
}
export function chartMarkup(rows) {
  validateHistory(rows);
  if (!rows.length) return '<p>No recorded prices in this period.</p>';
  const data = [...rows].sort((a,b)=>a.observation_day.localeCompare(b.observation_day));
  const values=data.map(r=>r.price), low=Math.min(...values), high=Math.max(...values), pad=Math.max(50,(high-low)*.18), min=Math.max(0,low-pad), max=high+pad, start=Date.parse(data[0].observation_day), end=Date.parse(data.at(-1).observation_day);
  const x=r=>end===start?360:75+(Date.parse(r.observation_day)-start)/(end-start)*590, y=p=>205-(p-min)/(max-min)*165;
  const points=data.map(r=>`${x(r)},${y(r.price)}`).join(' ');
  const grid=[0,.5,1].map(t=>{const v=min+(max-min)*t;return `<line x1="75" y1="${y(v)}" x2="665" y2="${y(v)}" stroke="currentColor" opacity=".12"/><text x="63" y="${y(v)+4}" text-anchor="end">${number(v)}</text>`;}).join('');
  return `<svg class="market-chart" viewBox="0 0 720 255" role="img" aria-label="${escapeHtml('Recorded daily prices from '+data[0].observation_day+' to '+data.at(-1).observation_day)}"><g class="chart-labels">${grid}<text x="75" y="242">${data[0].observation_day}</text><text x="665" y="242" text-anchor="end">${data.at(-1).observation_day}</text></g><polyline points="${points}" fill="none" stroke="#fc6f02" stroke-width="3" stroke-linejoin="round"/>${data.map(r=>`<circle cx="${x(r)}" cy="${y(r.price)}" r="4" fill="#ff9d3f"><title>${r.observation_day}: ${r.price}</title></circle>`).join('')}</svg>`;
}
export function detailMarkup(r, history) {
  return `<div class="market-detail-heading"><span class="eyebrow">${escapeHtml(r.region)} / Price history</span><h2>${escapeHtml(r.name.replace(' [Paket]',''))}</h2><p>Last observed ${escapeHtml(new Date(r.latest_observed_at).toLocaleString('en-GB',{timeZone:'Europe/Berlin'}))} · Europe/Berlin</p></div><div class="market-detail-stats"><div><span>Last price</span><strong>${number(r.latest_price)}</strong></div><div><span>Recorded minimum</span><strong>${number(r.min_price)}</strong></div><div><span>Daily average</span><strong>${number(r.average_price)}</strong></div><div><span>Recorded maximum</span><strong>${number(r.max_price)}</strong></div></div><div id="market-chart">${chartMarkup(history)}</div><details class="market-history-table"><summary>Recorded daily prices (${history.length})</summary><div class="market-table-scroll"><table><thead><tr><th>Date (Berlin)</th><th>Price</th></tr></thead><tbody>${[...history].sort((a,b)=>b.observation_day.localeCompare(a.observation_day)).map(d=>`<tr><td>${d.observation_day}</td><td>${number(d.price)}</td></tr>`).join('')}</tbody></table></div></details><p class="market-explainer">Statistics use the last observed price per day. Missing days are left empty. Chart points are recorded observations; connecting lines do not imply prices for unobserved days.</p>`;
}
export function createMarketApi({ url, key }, fetchImpl = globalThis.fetch) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('Public market configuration required');
  async function read(view, query, signal) {
    const rows=[];
    for(let offset=0;offset<100000;offset+=500){const params=new URLSearchParams({...query,limit:'500',offset:String(offset)});const response=await fetchImpl(`${url}/rest/v1/${view}?${params}`,{headers:{apikey:key},signal,cache:'no-store',redirect:'error'});if(!response.ok)throw new Error('Market data unavailable (HTTP '+response.status+')');const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid market response');rows.push(...data);if(data.length<500)return rows;}
    throw new Error('Market response exceeds supported range');
  }
  return { statistics:async signal=>validateStats(await read('ef_market_statistics',{select:'*',order:'shop_id.asc,goods_id.asc'},signal)), history:async(row,signal)=>{validateStats([row]);return validateHistory(await read('ef_market_daily_prices',{select:'observation_day,observed_at,price',shop_id:'eq.'+row.shop_id,goods_id:'eq.'+row.goods_id,order:'observation_day.asc'},signal));} };
}
