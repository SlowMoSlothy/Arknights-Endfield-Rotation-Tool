// Compact, accessible mobile menu. The desktop links remain in their original location.
(() => {
  const nav = document.querySelector('header.top nav.nav');
  const links = nav?.querySelector(':scope > .nav-links');
  if (!nav || !links) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'rf-mobile-menu-toggle';
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'rf-mobile-menu');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const menu = document.createElement('div');
  menu.id = 'rf-mobile-menu';
  menu.className = 'rf-mobile-menu';
  menu.hidden = true;
  for (const link of links.querySelectorAll('a')) {
    const clone = link.cloneNode(true);
    if (new URL(clone.href, location.href).pathname === location.pathname) clone.setAttribute('aria-current', 'page');
    clone.addEventListener('click', () => close());
    menu.appendChild(clone);
  }
  if (!menu.children.length) return;
  function close() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }
  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
    toggle.setAttribute('aria-label', menu.hidden ? 'Open navigation menu' : 'Close navigation menu');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('pointerdown', event => { if (!nav.contains(event.target)) close(); });
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) close(); });
  nav.append(toggle, menu);
})();
