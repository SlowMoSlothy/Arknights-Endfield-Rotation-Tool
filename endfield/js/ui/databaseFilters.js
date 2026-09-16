(() => {
    const filters = document.querySelector('.database-filters');
    if (!filters) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    let mobileOpen = false;
    function sync() { filters.open = !mobile.matches || mobileOpen; }
    filters.querySelector('summary').addEventListener('click', event => {
        if (!mobile.matches) return;
        event.preventDefault();
        mobileOpen = !filters.open;
        sync();
    });
    mobile.addEventListener('change', sync);
    sync();
})();
