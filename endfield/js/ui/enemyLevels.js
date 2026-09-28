(() => {
    for (const section of document.querySelectorAll('.enemy-levels')) {
        const picker = section.querySelector('.enemy-level-picker');
        const slider = picker?.querySelector('input');
        const rows = [...section.querySelectorAll('tbody tr')].map(row =>
            [...row.children].map(cell => cell.textContent.trim()));
        if (!slider || !rows.length) continue;
        const output = picker.querySelector('output');
        const values = [...picker.querySelectorAll('.attribute-card strong')];
        const levels = rows.map(row => Number(row[0].replace(/^LV\s*/, '')));
        if (levels.some(level => !Number.isFinite(level))) continue;
        slider.max = String(rows.length - 1);
        slider.value = String(levels.reduce((best, level, index) =>
            Math.abs(level - 90) < Math.abs(levels[best] - 90) ? index : best, 0));
        slider.disabled = rows.length === 1;
        const render = () => {
            const index = Number(slider.value);
            output.textContent = String(levels[index]);
            slider.setAttribute('aria-valuetext', `Level ${levels[index]}`);
            values.forEach((value, column) => { value.textContent = rows[index][column + 1]; });
        };
        slider.addEventListener('input', render);
        render();
        section.querySelector('.enemy-all-levels').open = false;
        picker.hidden = false;
    }
})();
