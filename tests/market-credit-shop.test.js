import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarketApi, validateCreditShop } from '../endfield/js/data/marketData.js';
import { creditShopMarkup, mountCreditShop } from '../endfield/js/ui/creditShop.js';

const offer = { offer_id:'a$1', name:'<Protoset>', quantity:1, price:131, base_price:175, discount_percent:25 };
const first = {
  shop_id:'shop_spaceship_1', source_id:'a'.repeat(64), observed_at:'2026-11-17T10:52:05.332Z',
  offers:[offer, { ...offer, offer_id:'a$2' }],
};
const second = {
  ...first, source_id:'b'.repeat(64), observed_at:'2026-11-17T10:57:19.877Z',
  offers:[{ ...offer, offer_id:'b$1', name:'Oroberyl', price:200, base_price:400, discount_percent:50, quantity:25 }],
};

test('Credit Shop uses the existing browser reader and represents duplicate goods individually', async () => {
  const api = createMarketApi({url:'https://fixture.supabase.co', key:'sb_publishable_fixture'}, async (url, options) => {
    assert.match(url, /\/rest\/v1\/ef_credit_shop_latest\?/);
    assert.equal(new URL(url).searchParams.get('shop_id'), 'eq.shop_spaceship_1');
    assert.equal(options.headers.apikey, 'sb_publishable_fixture');
    assert.equal(options.method, undefined);
    return Response.json([first]);
  });
  const snapshot = await api.creditShop();
  const html = creditShopMarkup(snapshot);
  assert.equal((html.match(/&lt;Protoset&gt;/g) ?? []).length, 2);
  assert.match(html, /131<\/strong> Credits/);
  assert.match(html, /−25%/);
  assert.equal(validateCreditShop([]), null);
  assert.throws(() => validateCreditShop([{...first, offers:[offer, offer]}]));
});

test('a refresh replaces the list and a failed read retains the previous snapshot', async () => {
  const nodes = new Map();
  const doc = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { addEventListener() {} });
      return nodes.get(id);
    },
    addEventListener() {},
  };
  let snapshot = first;
  const update = mountCreditShop(doc, { async creditShop() {
    if (!snapshot) throw Error('offline');
    return snapshot;
  } });
  await Promise.resolve();
  assert.match(nodes.get('credit-shop-offers').innerHTML, /Protoset/);
  snapshot = second;
  await update();
  assert.doesNotMatch(nodes.get('credit-shop-offers').innerHTML, /Protoset/);
  assert.match(nodes.get('credit-shop-offers').innerHTML, /Oroberyl/);
  assert.equal(nodes.get('credit-shop-observed').dateTime, second.observed_at);
  snapshot = first;
  await update();
  assert.match(nodes.get('credit-shop-offers').innerHTML, /Oroberyl/);
  snapshot = null;
  await update();
  assert.match(nodes.get('credit-shop-offers').innerHTML, /Oroberyl/);
  assert.match(nodes.get('credit-shop-status').textContent, /Connection unavailable/);
});
