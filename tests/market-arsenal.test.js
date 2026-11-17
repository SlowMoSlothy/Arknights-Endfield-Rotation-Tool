import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarketApi, validateArsenalRotations } from '../endfield/js/data/marketData.js';
import { arsenalMarkup, weeklyRotations, mountArsenal } from '../endfield/js/ui/marketArsenal.js';

const prior = {
  offer_id:'offer-old', name:'Old Weapon', price:400,
  opens_at:'2026-11-05T17:00:00Z', closes_at:'2026-11-12T17:00:00Z',
};
const active = {
  offer_id:'offer-now', name:'Clannibal', price:2480,
  opens_at:'2026-11-12T17:00:00Z', closes_at:'2026-11-19T17:00:00Z',
};
const next = {
  offer_id:'offer-next', name:'<Sundered Prince>', price:2480,
  opens_at:'2026-11-19T17:00:00Z', closes_at:'2026-11-24T22:00:00Z',
};
const later = {
  offer_id:'offer-later', name:'Later Weapon', price:400,
  opens_at:'2026-11-24T22:00:00Z', closes_at:'2026-12-02T17:00:00Z',
};
const at = '2026-11-17T10:52:05.332Z';
const weekly = { period:'weekly', observed_at:at, source_id:'a'.repeat(64), offers:[prior, later, active, next] };
const daily = { period:'daily', observed_at:at, source_id:'b'.repeat(64), offers:[{ offer_id:'one', name:'Long Road', price:20 }] };

test('reads Arsenal Exchange through the public market API', async ()=>{
  const api = createMarketApi({ url:'https://fixture.supabase.co', key:'sb_publishable_fixture' },async(url,options)=>{
    assert.equal(new URL(url).pathname, '/rest/v1/ef_arsenal_rotations');
    assert.equal(options.method, undefined);
    assert.equal(options.headers.apikey, 'sb_publishable_fixture');
    return Response.json([daily, weekly]);
  });
  assert.deepEqual(await api.arsenal(), [daily, weekly]);
  assert.throws(()=>validateArsenalRotations([weekly,weekly]));
  assert.throws(()=>validateArsenalRotations([{...weekly,offers:[{...next,closes_at:next.opens_at}]}]));
});

test('weekly schedule moves at the exact server boundary and lists future dates in order', ()=>{
  const {active:current,upcoming} = weeklyRotations(weekly.offers, Date.parse(at));
  assert.deepEqual(current,[active]);
  assert.deepEqual(upcoming.map(group=>group.opens_at),[next.opens_at,later.opens_at]);
  const change = weeklyRotations(weekly.offers,Date.parse(next.opens_at));
  assert.deepEqual(change.active,[next]);
  assert.deepEqual(change.upcoming.flatMap(group=>group.offers),[later]);
  const html=arsenalMarkup([daily,weekly],Date.parse(at));
  assert.match(html,/19 Nov 2026(?:,| at)? 18:00/);
  assert.match(html,/24 Nov 2026(?:,| at)? 23:00/);
  assert.match(html,/&lt;Sundered Prince&gt;/);
  assert.doesNotMatch(html,/Old Weapon/);
});

test('a new daily list replaces the old one and survives a failed refresh', async ()=>{
  const nodes=new Map();
  const doc={ getElementById(id){ if(!nodes.has(id))nodes.set(id,{addEventListener(){}});return nodes.get(id); },addEventListener(){} };
  const newDaily={...daily,observed_at:'2026-11-18T09:00:00Z',source_id:'c'.repeat(64),offers:[{offer_id:'two',name:'New Weapon',price:400}]};
  let result=[daily,weekly];
  const refresh=mountArsenal(doc,{async arsenal(){if(!result)throw Error('offline');return result;}});
  await Promise.resolve();
  assert.match(nodes.get('arsenal-content').innerHTML,/Long Road/);
  result=[newDaily];
  await refresh();
  assert.match(nodes.get('arsenal-content').innerHTML,/New Weapon/);
  assert.doesNotMatch(nodes.get('arsenal-content').innerHTML,/Long Road/);
  result=null;
  await refresh();
  assert.match(nodes.get('arsenal-content').innerHTML,/New Weapon/);
  assert.match(nodes.get('arsenal-status').textContent,/Connection unavailable/);
});
