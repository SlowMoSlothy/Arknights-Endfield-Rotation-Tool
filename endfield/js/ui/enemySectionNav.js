(() => {
    const nav = document.querySelector('.enemy-section-nav');
    if (!nav) return;
    const header = document.querySelector('.top');
    const entries = [...nav.querySelectorAll('a[href^="#"]')]
        .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
        .filter(entry => entry.section);
    let pending = false;
    function update() {
        pending = false;
        const headerHeight = header?.getBoundingClientRect().height || 0;
        const offset = headerHeight + nav.getBoundingClientRect().height + 16;
        document.documentElement.style.setProperty('--enemy-header-height', `${headerHeight}px`);
        document.documentElement.style.setProperty('--enemy-section-offset', `${offset}px`);
        let active;
        for (const entry of entries) {
            if (entry.section.getBoundingClientRect().top <= offset + 24) active = entry;
        }
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            active = entries.filter(entry => entry.section.getBoundingClientRect().top < window.innerHeight).at(-1) || active;
        }
        for (const entry of entries) {
            if (entry === active) entry.link.setAttribute('aria-current', 'location');
            else entry.link.removeAttribute('aria-current');
        }
    }
    function schedule() {
        if (!pending) { pending = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(schedule);
        observer.observe(nav);
        if (header) observer.observe(header);
    }
    update();
    // Re-align a direct section link after fonts and header sizing have settled.
    window.addEventListener('load', () => {
        update();
        const target = entries.find(entry => entry.link.hash === location.hash);
        if (target) target.section.scrollIntoView();
    }, { once: true });
})();

