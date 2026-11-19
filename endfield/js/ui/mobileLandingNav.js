// Shared right-side mobile drawer for pages linked from the landing page.
(() => {
  const nav = document.querySelector('header.top nav.nav');
  const links = nav?.querySelector(':scope > .nav-links');
  if (!nav || !links || document.getElementById('rf-mobile-menu')) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'rf-mobile-menu-toggle';
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'rf-mobile-menu');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const backdrop = document.createElement('div');
  backdrop.className = 'rf-mobile-menu-backdrop';
  backdrop.hidden = true;
  const menu = document.createElement('aside');
  menu.id = 'rf-mobile-menu';
  menu.className = 'rf-mobile-menu';
  menu.setAttribute('aria-label', 'Navigation menu');
  menu.setAttribute('role', 'navigation');
  menu.hidden = true;
  const heading = document.createElement('div');
  heading.className = 'rf-mobile-menu-heading';
  const title = document.createElement('span');
  title.className = 'rf-mobile-menu-title';
  const logo = document.createElement('img');
  logo.src = '/favicon-flat.png';
  logo.alt = '';
  title.append(logo, document.createTextNode('RotationForge'));
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'rf-mobile-menu-close';
  closeButton.setAttribute('aria-label', 'Close navigation menu');
  closeButton.textContent = '×';
  heading.append(title, closeButton);
  menu.append(heading);
  for (const link of links.querySelectorAll('a')) {
    const clone = link.cloneNode(true);
    // Do not inherit absolute positioning from page-specific desktop nav classes.
    const isCta = link.classList.contains('nav-cta');
    clone.className = isCta ? 'rf-drawer-link rf-drawer-cta' : 'rf-drawer-link';
    if (new URL(clone.href, location.href).pathname === location.pathname) clone.setAttribute('aria-current', 'page');
    clone.addEventListener('click', close);
    menu.append(clone);
  }
  if (menu.children.length < 2) return;
  let returnFocus = false;
  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove('rf-mobile-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    if (returnFocus) toggle.focus();
    returnFocus = false;
  }
  function open() {
    menu.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add('rf-mobile-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    closeButton.focus();
  }
  toggle.addEventListener('click', () => menu.hidden ? open() : close());
  closeButton.addEventListener('click', () => { returnFocus = true; close(); });
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { returnFocus = true; close(); }
    if (event.key === 'Tab') {
      const focusable = [...menu.querySelectorAll('button,a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) close(); });
  nav.append(toggle);
  document.body.append(backdrop, menu);
})();
