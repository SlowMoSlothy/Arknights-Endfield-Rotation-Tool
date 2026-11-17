import { createMarketApi, escapeHtml, number } from '../data/marketData.js?v=7';

const berlin = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const date = value => berlin.format(new Date(value));
const time = value => `<time datetime="${escapeHtml(value)}">${date(value)}</time>`;

function offerList(offers) {
  if (!offers.length) return '<p class="arsenal-note">No offers in the recorded schedule.</p>';
  return `<ul class="arsenal-offers">${offers.map(offer=>`<li>
      <span>${escapeHtml(offer.name)}</span>
      <span class="arsenal-price"><strong>${number(offer.price)}</strong> Tickets</span>
    </li>`).join('')}</ul>`;
}

export function weeklyRotations(offers, now = Date.now()) {
  const active = [];
  const upcoming = new Map();
  for (const offer of offers) {
    if (Date.parse(offer.closes_at) <= now) continue;
    if (Date.parse(offer.opens_at) <= now) active.push(offer);
    else {
      const key = offer.opens_at + '|' + offer.closes_at;
      const group = upcoming.get(key) ?? { opens_at:offer.opens_at, closes_at:offer.closes_at, offers:[] };
      group.offers.push(offer);
      upcoming.set(key, group);
    }
  }
  return { active, upcoming:[...upcoming.values()].sort((a,b)=>Date.parse(a.opens_at)-Date.parse(b.opens_at)) };
}

export function arsenalMarkup(rows, now = Date.now()) {
  const daily = rows.find(row=>row.period==='daily');
  const weekly = rows.find(row=>row.period==='weekly');
  const {active, upcoming} = weeklyRotations(weekly?.offers??[],now);
  const schedule = upcoming.map(group=>`<article class="arsenal-panel arsenal-upcoming">
      <p class="arsenal-window">${time(group.opens_at)} – ${time(group.closes_at)}</p>
      ${offerList(group.offers)}
    </article>`).join('');
  const current = active.map(offer=>`<div class="arsenal-current">${offerList([offer])}
    <p class="arsenal-note">Until ${time(offer.closes_at)}</p></div>`).join('');
  return `<div class="arsenal-grid">
    <section class="arsenal-panel"><h2>Daily offers</h2>
      ${daily ? `<p class="arsenal-note">Recorded ${time(daily.observed_at)}</p>${offerList(daily.offers)}`
              : '<p class="arsenal-note">Waiting for the first daily rotation.</p>'}
    </section>
    <section class="arsenal-panel"><h2>Current weekly offers</h2>
      ${current || '<p class="arsenal-note">No active weekly offers in the recorded schedule.</p>'}
    </section>
    <section class="arsenal-schedule"><h2>Upcoming weekly rotations</h2>
      ${schedule ? `<div class="arsenal-grid">${schedule}</div>`
                 : '<p class="arsenal-note">No upcoming weekly rotation has been recorded yet.</p>'}
    </section>
  </div>`;
}

export function mountArsenal(doc = document, api = createMarketApi(JSON.parse(doc.getElementById('arsenal-config').textContent))) {
  const status = doc.getElementById('arsenal-status');
  const content = doc.getElementById('arsenal-content');
  const refresh = doc.getElementById('arsenal-refresh');
  const latest = new Map();
  let pending = false;

  async function update() {
    if (pending) return;
    pending = true;
    refresh.disabled = true;
    try {
      for (const snapshot of await api.arsenal(AbortSignal.timeout(12000))) {
        const previous = latest.get(snapshot.period);
        if (!previous || Date.parse(snapshot.observed_at) >= Date.parse(previous.observed_at)) latest.set(snapshot.period, snapshot);
      }
      status.textContent = latest.size ? 'Offer prices in Arsenal Tickets. All dates use Berlin time.' : 'No Arsenal Exchange data has been uploaded yet.';
    } catch {
      status.textContent = latest.size
        ? 'Connection unavailable. Showing recorded offers in Arsenal Tickets and Berlin time.'
        : 'Arsenal Exchange data is temporarily unavailable.';
    } finally {
      if (latest.size) content.innerHTML = arsenalMarkup([...latest.values()]);
      refresh.disabled = false;
      pending = false;
    }
  }

  refresh.addEventListener('click',update);
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)update();});
  update();
  return update;
}

if (typeof document !== 'undefined' && document.getElementById('arsenal-content')) {
  const update = mountArsenal();
  setInterval(()=>{if(!document.hidden)update();},15000);
}
