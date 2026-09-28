(() => {
    function picker(section, source, label, steps, labels, rows, note) {
        if (!source || !rows.length) return;
        const create = (tag, text, className) => {
            const el = document.createElement(tag);
            if (text != null) el.textContent = text;
            if (className) el.className = className;
            return el;
        };
        const box = create('div', null, 'weapon-picker');
        const heading = create('label', label);
        const output = create('output');
        const slider = create('input');
        slider.type = 'range'; slider.min = '0'; slider.max = String(rows.length - 1);
        slider.step = '1'; slider.value = slider.max; slider.disabled = rows.length === 1;
        slider.id = `${section.id}-slider`;
        heading.htmlFor = slider.id; output.htmlFor = slider.id;
        heading.append(output);
        const hint = create('p', note); hint.id = `${slider.id}-help`;
        slider.setAttribute('aria-describedby', hint.id);
        const cards = create('div', null, 'weapon-picker-values');
        cards.setAttribute('aria-live', 'polite'); cards.setAttribute('aria-atomic', 'true');
        const values = labels.map(name => {
            const card = create('div'); const value = create('strong');
            card.append(create('span', name), value); cards.append(card); return value;
        });
        const render = () => {
            const index = Number(slider.value);
            output.textContent = steps[index];
            slider.setAttribute('aria-valuetext', `${label} ${steps[index]}`);
            values.forEach((value, column) => { value.textContent = rows[index][column] || 'Unknown'; });
        };
        slider.addEventListener('input', render); render();
        box.append(heading, slider, hint, cards);
        const details = create('details', null, 'weapon-all-values');
        details.append(create('summary', label === 'Level' ? 'All recorded level values' : 'All rank values'));
        source.before(box, details); details.append(source);
    }
    const atk = document.getElementById('weapon-atk');
    const points = [...(atk?.querySelectorAll('.weapon-atk-levels>div') || [])];
    if (atk) picker(atk, atk.querySelector('.weapon-atk-levels'), 'Level',
        points.map(el => el.querySelector('span').textContent.replace(/^Level\s*/, '')),
        ['Base ATK'], points.map(el => [el.querySelector('strong').textContent]),
        'Choose a recorded level. Values between these levels are not available.');
    const attributes = document.getElementById('weapon-attributes');
    const rows = [...(attributes?.querySelectorAll('tbody tr') || [])];
    if (attributes) picker(attributes, attributes.querySelector('.weapon-table-scroll'), 'Rank',
        rows.map(el => el.querySelector('th').textContent),
        [...attributes.querySelectorAll('thead th')].slice(1).map(el => el.textContent),
        rows.map(el => [...el.querySelectorAll('td')].map(cell => cell.textContent)),
        'Choose an attribute rank. Ranks are independent of weapon level.');
})();
