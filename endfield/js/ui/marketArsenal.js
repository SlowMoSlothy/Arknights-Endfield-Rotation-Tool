import { createMarketApi, escapeHtml, number } from '../data/marketData.js?v=7';

const berlin = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const date = value => berlin.format(new Date(value));
const time = value => `<time datetime="${escapeHtml(value)}">${date(value)}</time>`;
const nameKey = name => name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const weaponRarity = ({ rarity } = {}) => Number.isInteger(rarity) && rarity >= 1 && rarity <= 6 ? rarity : 0;

export function dailyOfferEnd(observedAt) {
  const reset = new Date(observedAt);
  // The Americas / Europe rotation resets at 04:00 on the UTC−5 game server.
  reset.setUTCHours(9, 0, 0, 0);
  if (reset <= new Date(observedAt)) reset.setUTCDate(reset.getUTCDate() + 1);
  return reset.toISOString();
}

export function formatCountdown(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  const pad = value => String(value).padStart(2, '0');
  return `${days ? days + 'd ' : ''}${days || hours ? pad(hours) + 'h ' : ''}${pad(minutes)}m ${pad(seconds % 60)}s`;
}

function offerList(offers, portraits, { starts = false, dailyEnd } = {}) {
  if (!offers.length) return '<p class="arsenal-note">No offers in the recorded schedule.</p>';
  return `<ul class="weapon-grid arsenal-offers">${offers.map(offer => {
    const portrait = portraits.get(nameKey(offer.name));
    const rarity = weaponRarity(portrait);
    const deadline = starts ? offer.opens_at : (dailyEnd ?? offer.closes_at);
    const name = escapeHtml(offer.name);
    const cardTag = portrait?.href ? 'a' : 'div';
    const linkAttributes = portrait?.href
      ? ` href="${escapeHtml(portrait.href)}" target="_blank" rel="noopener" aria-label="${name} (opens in a new tab)"`
      : '';
    return `<li><${cardTag} class="weapon-tile arsenal-offer" data-rarity="${rarity || ''}"${linkAttributes}>
      <div class="portrait-card weapon-art" aria-hidden="true">
        <div class="weapon-portrait-media">${portrait?.image
          ? `<img src="${escapeHtml(portrait.image)}" alt="" width="256" height="256" loading="lazy" decoding="async">`
          : ''}</div>
        <span class="barcode">ROTATIONFORGE DATABASE</span>
      </div>
      <div class="weapon-tile-copy">
        ${portrait?.type ? `<span class="weapon-type">${escapeHtml(portrait.type)}</span>` : ''}
        ${rarity ? `<span class="weapon-stars" aria-label="${rarity} stars">${'★'.repeat(rarity)}</span>` : ''}
        <h3 class="arsenal-weapon-name">${name}</h3>
        <div class="arsenal-offer-details">
          <span class="arsenal-price"><strong>${number(offer.price)}</strong> Tickets</span>
          <span class="arsenal-countdown" role="timer">
            <span>${starts ? 'Starts in' : 'Available for'}</span>
            <strong data-countdown-until="${escapeHtml(deadline)}"></strong>
          </span>
          ${starts ? '' : `<span class="arsenal-offer-end">Until ${time(deadline)}</span>`}
        </div>
      </div>
    </${cardTag}></li>`;
  }).join('')}</ul>`;
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

export function arsenalSectionMarkup(rows, now = Date.now(), weapons = []) {
  const daily = rows.find(row=>row.period==='daily');
  const weekly = rows.find(row=>row.period==='weekly');
  const portraits = new Map(weapons.map(weapon => [nameKey(weapon.name), weapon]));
  const {active, upcoming} = weeklyRotations(weekly?.offers??[],now);
  const dailyEnd = daily ? dailyOfferEnd(daily.observed_at) : null;
  const schedule = upcoming.map(group=>`<article class="arsenal-panel arsenal-upcoming">
      <p class="arsenal-window">${time(group.opens_at)} – ${time(group.closes_at)}</p>
      ${offerList(group.offers, portraits, { starts: true })}
    </article>`).join('');
  let dailyOffers = '<p class="arsenal-note">Waiting for the first daily rotation.</p>';
  if (daily) {
    const rarity = offer => weaponRarity(portraits.get(nameKey(offer.name)));
    dailyOffers = now < Date.parse(dailyEnd)
      ? offerList(daily.offers.toSorted((a, b) => rarity(b) - rarity(a)), portraits, { dailyEnd })
      : '<p class="arsenal-note">Daily rotation ended. Waiting for new offers.</p>';
  }
  return {
    'arsenal-weekly-offers': active.length ? offerList(active, portraits)
      : '<p class="arsenal-note">No active weekly offers in the recorded schedule.</p>',
    'arsenal-daily-recorded': daily ? `Recorded ${time(daily.observed_at)}` : '',
    'arsenal-daily-offers': dailyOffers,
    'arsenal-upcoming-offers': schedule ? `<div class="arsenal-windows">${schedule}</div>`
      : '<p class="arsenal-note">No upcoming weekly rotation has been recorded yet.</p>',
  };
}

export function mountArsenal(doc = document, api = createMarketApi(JSON.parse(doc.getElementById('arsenal-config').textContent))) {
  const status = doc.getElementById('arsenal-status');
  const content = doc.getElementById('arsenal-content');
  const refresh = doc.getElementById('arsenal-refresh');
  const exportButton = doc.getElementById('arsenal-export');
  const exportStatus = doc.getElementById('arsenal-export-status');
  const weapons = JSON.parse(doc.getElementById('arsenal-portraits')?.textContent || '[]');
  const latest = new Map();
  let pending = false;
  let exporting = false;
  const rendered = new Map();
  let countdowns = [];
  let nextTransition = Infinity;

  function render(now) {
    const firstHash = rendered.size ? '' : doc.defaultView?.location?.hash;
    const sections = arsenalSectionMarkup([...latest.values()], now, weapons);
    for (const [id, markup] of Object.entries(sections)) {
      if (rendered.get(id) === markup) continue;
      doc.getElementById(id).innerHTML = markup;
      rendered.set(id, markup);
    }
    countdowns = Array.from(content.querySelectorAll('[data-countdown-until]'), element => ({
      element, deadline: Date.parse(element.dataset.countdownUntil),
    }));
    nextTransition = Math.min(...countdowns.map(({ deadline }) => deadline));
    exportButton.disabled = exporting || !countdowns.length;
    if (firstHash) {
      const heading = doc.getElementById(firstHash.slice(1));
      if (heading?.matches('.arsenal-sections h2[id]')) heading.scrollIntoView({ behavior: 'instant' });
    }
  }

  function tick(now = Date.now()) {
    if (now >= nextTransition) render(now);
    for (const { element, deadline } of countdowns) {
      element.textContent = formatCountdown(deadline - now);
    }
  }

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
      if (latest.size) {
        const now = Date.now();
        render(now);
        tick(now);
      }
      refresh.disabled = false;
      pending = false;
    }
  }

  content.addEventListener('error', event => {
    if (event.target.tagName === 'IMG') event.target.hidden = true;
  }, true);
  exportButton.addEventListener('click', async () => {
    exporting = true;
    exportButton.disabled = true;
    exportButton.textContent = 'Preparing PNG…';
    exportStatus.textContent = '';
    try {
      const { downloadArsenalImage } = await import('./arsenalExport.js?v=4');
      await downloadArsenalImage(content.closest('main'));
    } catch {
      exportStatus.textContent = 'Could not download the Arsenal image. Try again.';
    } finally {
      exporting = false;
      exportButton.disabled = !countdowns.length;
      exportButton.textContent = 'Download PNG';
    }
  });
  refresh.addEventListener('click',update);
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) return;
    tick();
    update();
  });
  doc.defaultView?.setInterval(() => { if (!doc.hidden) tick(); }, 1000);
  update();
  return update;
}

function mountArsenalJumpLinks(doc, content) {
  const view = doc.defaultView;
  const viewport = doc.documentElement;
  const header = doc.querySelector('.top');
  const jumpLinks = doc.querySelector('.arsenal-jump-links');
  const page = jumpLinks.closest('main');
  const destinations = Array.from(jumpLinks.querySelectorAll('a'), link => ({
    link, section: doc.getElementById(link.hash.slice(1)).closest('section'),
  }));
  let activeLink;
  let framePending = false;

  function updateActiveLink() {
    framePending = false;
    const readingLine = jumpLinks.getBoundingClientRect().bottom + 18;
    const atBottom = view.scrollY > 0 && viewport.scrollHeight - viewport.clientHeight - view.scrollY <= 2;
    let current = destinations[0];
    for (const destination of destinations) {
      const { top, bottom } = destination.section.getBoundingClientRect();
      if (top >= viewport.clientHeight) break;
      current = destination;
      if (!atBottom && bottom > readingLine) break;
    }
    if (activeLink === current.link) return;
    activeLink?.removeAttribute('aria-current');
    activeLink = current.link;
    activeLink.setAttribute('aria-current', 'location');
  }

  function scheduleActiveLink() {
    if (framePending) return;
    framePending = true;
    view.requestAnimationFrame(updateActiveLink);
  }

  const applyOffsets = () => {
    page.style.setProperty('--arsenal-header-height', `${header.offsetHeight}px`);
    page.style.setProperty('--arsenal-jump-height', `${jumpLinks.offsetHeight}px`);
    scheduleActiveLink();
  };
  applyOffsets();
  const observer = new ResizeObserver(applyOffsets);
  observer.observe(header);
  observer.observe(jumpLinks);
  observer.observe(content);
  view.addEventListener('scroll', scheduleActiveLink, { passive: true });
  view.addEventListener('resize', scheduleActiveLink);
}

if (typeof document !== 'undefined' && document.getElementById('arsenal-content')) {
  mountArsenalJumpLinks(document, document.getElementById('arsenal-content'));
  const update = mountArsenal();
  setInterval(()=>{if(!document.hidden)update();},15000);
}
