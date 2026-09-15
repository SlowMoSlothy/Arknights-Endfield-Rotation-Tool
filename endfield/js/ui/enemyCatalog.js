(() => {
    const form = document.querySelector('.operator-toolbar');
    const grid = document.querySelector('.operator-grid');
    if (!form || !grid) return;
    const cards = [...grid.children];
    function render() {
        const query = form.elements.search.value.trim().toLowerCase();
        const category = form.elements.category.value;
        let count = 0;
        cards.sort((a,b) => a.dataset.name.localeCompare(b.dataset.name, 'en') * (form.elements.sort.value === 'name-desc' ? -1 : 1));
        for (const card of cards) {
            card.hidden = !card.dataset.search.includes(query) || !!category && card.dataset.category !== category;
            if (!card.hidden) count++;
            grid.append(card);
        }
        document.getElementById('enemy-count').textContent = `${count} ${count === 1 ? 'Enemy' : 'Enemies'}`;
        const empty = document.querySelector('.empty-state');
        empty.hidden = count > 0;
        empty.textContent = cards.length ? 'No enemies match the selected filters.' : 'No enemies have been published yet.';
    }
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    form.addEventListener('reset', () => setTimeout(render, 0));
    render();
})();
