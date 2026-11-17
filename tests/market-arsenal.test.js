import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarketApi, validateArsenalRotations } from '../endfield/js/data/marketData.js';
import { arsenalMarkup, dailyOfferEnd, formatCountdown, weeklyRotations, mountArsenal } from '../endfield/js/ui/marketArsenal.js';

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
  assert.match(html,/Starts in<\/span>\s*<strong data-countdown-until="2026-11-19T17:00:00Z"/);
  assert.match(html,/&lt;Sundered Prince&gt;/);
  assert.doesNotMatch(html,/Old Weapon/);
});

test('original weapon portraits appear across rotations and unlisted weapons keep their text', () => {
  const portraits = [
    { name:'Long Road', image:'/endfield/assets/weapons/long_road.png', rarity:4 },
    { name:'Clannibal', image:'/endfield/assets/weapons/clannibal.png', rarity:6 },
    { name:'Sundered Prince', image:'/endfield/assets/weapons/sundered_prince.png', rarity:6 },
  ];
  const html = arsenalMarkup([daily, weekly], Date.parse(at), portraits);
  assert.deepEqual([...html.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]),
    portraits.map(portrait => portrait.image));
  assert.match(html, /data-rarity="4"/);
  assert.match(html, /class="portrait-card weapon-art"/);
  assert.match(html, /aria-label="4 stars">★★★★/);
  assert.match(html, /<h3 class="arsenal-weapon-name">Later Weapon<\/h3>/);
});

test('daily offers end at the server reset, including on a Berlin daylight saving change', () => {
  assert.equal(dailyOfferEnd('2026-03-29T08:59:59.999Z'), '2026-03-29T09:00:00.000Z');
  assert.equal(dailyOfferEnd('2026-03-29T09:00:00.000Z'), '2026-03-30T09:00:00.000Z');
  const cutoff = Date.parse(dailyOfferEnd(at));
  assert.match(arsenalMarkup([daily], cutoff - 1), /Long Road/);
  const expired = arsenalMarkup([daily], cutoff);
  assert.match(expired, /Daily rotation ended/);
  assert.doesNotMatch(expired, /Long Road/);
  assert.equal(formatCountdown(1), '00m 01s');
  assert.equal(formatCountdown(-1000), '00m 00s');
  assert.equal(formatCountdown(90061000), '1d 01h 01m 01s');
});

test('the live countdown advances and past daily offers expire while offline', async (t) => {
  const nodes=new Map();
  let clock = Date.parse(at);
  t.mock.method(Date, 'now', () => clock);
  let secondTick;
  const doc = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        addEventListener() {},
        set innerHTML(html) {
          this.html = html;
          this.timers = Array.from(html.matchAll(/data-countdown-until="([^"]+)"/g), ([, countdownUntil]) => ({
            dataset: { countdownUntil },
          }));
        },
        get innerHTML() { return this.html; },
        querySelectorAll() { return this.timers; },
      });
      return nodes.get(id);
    },
    addEventListener() {},
    defaultView: { setInterval(callback) { secondTick = callback; } },
  };
  const newDaily={...daily,observed_at:'2026-11-18T09:00:00Z',source_id:'c'.repeat(64),offers:[{offer_id:'two',name:'New Weapon',price:400}]};
  let result=[daily,weekly];
  const refresh=mountArsenal(doc,{async arsenal(){if(!result)throw Error('offline');return result;}});
  await Promise.resolve();
  const content = nodes.get('arsenal-content');
  assert.match(content.innerHTML,/Long Road/);
  assert.equal(content.timers[0].textContent, '22h 07m 55s');
  clock += 1000;
  secondTick();
  assert.equal(content.timers[0].textContent, '22h 07m 54s');
  clock = Date.parse(dailyOfferEnd(at));
  secondTick();
  assert.doesNotMatch(content.innerHTML, /Long Road/);

  result=[newDaily];
  await refresh();
  assert.match(content.innerHTML,/New Weapon/);
  assert.doesNotMatch(content.innerHTML,/Long Road/);
  result=null;
  await refresh();
  assert.match(content.innerHTML,/New Weapon/);
  assert.match(nodes.get('arsenal-status').textContent,/Connection unavailable/);
  clock = Date.parse(next.opens_at);
  secondTick();
  assert.doesNotMatch(content.innerHTML, /Clannibal|New Weapon/);
  assert.match(content.innerHTML, /&lt;Sundered Prince&gt;<\/h3>[\s\S]*?Available for<\/span>\s*<strong data-countdown-until="2026-11-24T22:00:00Z"/);
});
