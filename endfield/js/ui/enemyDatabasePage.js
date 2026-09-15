(() => {
    let rows = [];
    const status = document.getElementById('enemyStatus');
    const results = document.getElementById('enemyResults');
    const search = document.getElementById('enemySearch');
    const category = document.getElementById('enemyCategory');
    const retry = document.getElementById('enemyRetry');
    function render() {
        const query = search.value.trim().toLowerCase();
        const filtered = rows.filter(row => (!category.value || row.category === category.value) &&
            [row.name, row.description, row.location, ...(row.skills || []).map(skill => skill.name)].join(' ').toLowerCase().includes(query));
        results.replaceChildren(...filtered.map(EnemyDatabase.card));
        status.textContent = filtered.length ? `${filtered.length} ${filtered.length === 1 ? 'enemy' : 'enemies'}` : rows.length ? 'No enemies match your search.' : 'No enemies have been published yet.';
    }
    async function load() {
        retry.hidden = true; status.textContent = 'Loading enemy database…';
        search.disabled = category.disabled = true;
        try {
            if (!supabaseClient) throw new Error('Connection unavailable');
            const { data, error } = await supabaseClient.from('enemies').select('*').eq('is_visible', true).order('name');
            if (error) throw error;
            rows = data || []; render();
            search.disabled = category.disabled = false;
        } catch {
            results.replaceChildren();
            status.textContent = 'The enemy database is currently unavailable. Please try again later.';
            retry.hidden = false;
        }
    }
    search.addEventListener('input', render); category.addEventListener('change', render);
    retry.addEventListener('click', load); load();
})();
