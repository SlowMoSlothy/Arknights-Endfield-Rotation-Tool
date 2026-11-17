import { createMarketApi, escapeHtml, number } from '../data/marketData.js?v=7';

const berlinTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'medium',
});

export function creditShopMarkup(snapshot) {
  return [...snapshot.offers].sort((a, b) => b.discount_percent - a.discount_percent)
    .map(offer => `<li class="credit-shop-offer">
      <span class="credit-shop-name">${escapeHtml(offer.name)}</span>
      <span class="credit-shop-quantity">×${number(offer.quantity)}</span>
      <span class="credit-shop-price"><strong>${number(offer.price)}</strong> Credits
      ${offer.discount_percent ? `<del>${number(offer.base_price)}</del><span class="credit-shop-discount">−${number(offer.discount_percent)}%</span>` : ''}</span>
    </li>`).join('');
}

export function mountCreditShop(doc = document, api = createMarketApi(JSON.parse(doc.getElementById('market-config').textContent))) {
  const list = doc.getElementById('credit-shop-offers');
  const status = doc.getElementById('credit-shop-status');
  const observed = doc.getElementById('credit-shop-observed');
  let latest = null;
  let pending = false;

  async function update() {
    if (pending) return;
    pending = true;
    try {
      const snapshot = await api.creditShop(AbortSignal.timeout(12000));
      if (!snapshot) {
        status.textContent = latest ? 'Showing the last recorded offers.' : 'No offers recorded yet.';
        return;
      }
      if (latest && Date.parse(snapshot.observed_at) < Date.parse(latest.observed_at)) return;
      if (snapshot.source_id !== latest?.source_id) {
        list.innerHTML = creditShopMarkup(snapshot);
        observed.dateTime = snapshot.observed_at;
        observed.textContent = berlinTime.format(new Date(snapshot.observed_at)) + ' · Berlin';
        observed.hidden = false;
        latest = snapshot;
      }
      status.textContent = `${latest.offers.length} offers from the last recorded login or shop refresh.`;
    } catch {
      status.textContent = latest
        ? 'Connection unavailable. Showing the last recorded offers.'
        : 'Credit Shop offers are temporarily unavailable.';
    } finally {
      pending = false;
    }
  }

  doc.getElementById('market-refresh').addEventListener('click', update);
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) update(); });
  update();
  return update;
}

if (typeof document !== 'undefined' && document.getElementById('credit-shop-offers')) {
  const update = mountCreditShop();
  setInterval(() => { if (!document.hidden) update(); }, 15000);
}
