(() => {
    const form = document.querySelector('.weapon-toolbar');
    const grid = document.querySelector('.weapon-grid');
    if (!form || !grid) return;
    const cards = [...grid.children];
    const controls = form.elements;
    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    function update() {
        const query = controls.search.value.trim().toLowerCase();
        const sort = controls.sort.value;
        cards.sort((a, b) => {
            if (sort === 'atk' || sort === 'rarity') {
                const difference = Number(b.dataset[sort]) - Number(a.dataset[sort]);
                if (difference) return difference;
            }
            return collator.compare(a.dataset.name, b.dataset.name) * (sort === 'name-desc' ? -1 : 1);
        });
        let count = 0;
        for (const card of cards) {
            card.hidden = !card.dataset.search.includes(query) || ['type', 'rarity', 'attribute'].some(key => controls[key].value && controls[key].value !== card.dataset[key]);
            if (!card.hidden) count++;
            grid.append(card);
        }
        document.querySelector('#weapon-count').textContent = `${count} ${count === 1 ? 'Weapon' : 'Weapons'}`;
        document.querySelector('.empty-state').hidden = count !== 0;
    }
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('reset', () => requestAnimationFrame(update));
    update();
})();
