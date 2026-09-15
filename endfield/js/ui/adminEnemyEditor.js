const adminEnemyState = { rows: [], selected: '', saving: false };

async function fetchAdminEnemies() {
    const client = getAdminSupabaseClient();
    if (!client || !adminPanelState.isAdmin) return;
    adminPanelState.loading = true;
    adminPanelState.reviewError = '';
    renderAdminReviewList();
    try {
        const { data, error } = await client.from('enemies').select('*').order('name');
        if (error) throw error;
        adminEnemyState.rows = data || [];
        adminPanelState.loaded = true;
    } catch {
        adminEnemyState.rows = [];
        adminPanelState.reviewError = 'Enemy data could not be loaded. Apply supabase/enemy_database.sql and check your connection.';
    } finally {
        adminPanelState.loading = false;
        renderAdminReviewList();
    }
}

function renderAdminEnemyEditor(container) {
    const { node, elements } = EnemyDatabase;
    const root = node('section', null, 'enemy-db');
    root.append(node('h2', 'Enemy Database'), node('p', 'Create and edit enemy profiles. Publish a profile when it is ready to appear in the public database.'));
    const toolbar = node('div', null, 'enemy-db-toolbar');
    const selectLabel = node('label', 'Enemy');
    const select = node('select');
    const newOption = node('option', 'Create new enemy'); newOption.value = ''; select.append(newOption);
    for (const row of adminEnemyState.rows) {
        const option = node('option', `${row.name}${row.is_visible ? '' : ' (draft)'}`);
        option.value = row.id; select.append(option);
    }
    select.value = adminEnemyState.selected;
    select.disabled = adminEnemyState.saving;
    selectLabel.append(select); toolbar.append(selectLabel);
    const link = node('a', 'Open public database ↗'); link.href = 'enemies/'; link.target = '_blank'; link.rel = 'noopener'; toolbar.append(link);
    root.append(toolbar);
    const row = adminEnemyState.rows.find(item => item.id === adminEnemyState.selected) || {};
    const form = node('form', null, 'enemy-db-form');
    const fields = {};
    function field(parent, key, label, value = '', type = 'text') {
        const wrapper = node('label', label);
        const input = node(type === 'textarea' ? 'textarea' : 'input');
        if (type !== 'textarea') input.type = type;
        input.value = value ?? ''; input.disabled = adminEnemyState.saving;
        if (type === 'number') { input.min = '0'; input.step = 'any'; }
        wrapper.append(input); parent.append(wrapper); fields[key] = input;
        return input;
    }
    const name = field(form, 'name', 'Name', row.name); name.required = true; name.maxLength = 120;
    const categoryLabel = node('label', 'Category'); const category = node('select');
    for (const value of ['normal', 'elite', 'boss', 'test']) {
        const option = node('option', value === 'test' ? 'Training / test' : value); option.value = value; category.append(option);
    }
    category.value = row.category || 'normal'; category.disabled = adminEnemyState.saving;
    categoryLabel.append(category); form.append(categoryLabel);
    field(form, 'description', 'Description', row.description, 'textarea');
    field(form, 'location', 'Location', row.location);
    const stats = node('fieldset'); stats.append(node('legend', 'Combat values — leave unknown values blank'));
    field(stats, 'hp', 'HP', row.hp, 'number'); field(stats, 'defense', 'Defense', row.defense, 'number');
    stats.append(node('p', 'Incoming damage multipliers: 1 = normal, 0.5 = half, 1.5 = increased damage.'));
    for (const element of elements) field(stats, element, `${element} multiplier`, row.resistances?.[element], 'number');
    form.append(stats);
    const skills = node('fieldset'); skills.append(node('legend', 'Abilities'));
    const skillInputs = [];
    function addSkill(skill = {}) {
        const wrapper = node('fieldset');
        const skillName = field(wrapper, 'skillName', 'Ability name', skill.name);
        const description = field(wrapper, 'skillDescription', 'Ability description', skill.description, 'textarea');
        const remove = node('button', 'Remove ability'); remove.type = 'button'; remove.disabled = adminEnemyState.saving;
        const entry = { wrapper, skillName, description };
        remove.addEventListener('click', () => { wrapper.remove(); skillInputs.splice(skillInputs.indexOf(entry), 1); });
        wrapper.append(remove); skills.append(wrapper); skillInputs.push(entry);
    }
    (row.skills || []).forEach(addSkill);
    const add = node('button', 'Add ability'); add.type = 'button'; add.disabled = adminEnemyState.saving;
    add.addEventListener('click', () => addSkill()); form.append(skills, add);
    field(form, 'source_url', 'Source URL', row.source_url, 'url');
    const visibilityLabel = node('label', null, 'enemy-db-check');
    const visible = node('input'); visible.type = 'checkbox'; visible.checked = row.is_visible === true; visible.disabled = adminEnemyState.saving;
    visibilityLabel.append(visible, node('span', 'Publish in the Enemy Database')); form.append(visibilityLabel);
    const feedback = node('p'); feedback.setAttribute('role', 'status');
    const save = node('button', 'Save enemy'); save.type = 'submit'; save.disabled = adminEnemyState.saving;
    form.append(feedback, save);
    let dirty = false;
    form.addEventListener('input', () => { dirty = true; });
    add.addEventListener('click', () => { dirty = true; });
    skills.addEventListener('click', event => { if (event.target.tagName === 'BUTTON') dirty = true; });
    select.addEventListener('change', () => {
        if (dirty && !window.confirm('Discard unsaved changes to this enemy?')) { select.value = adminEnemyState.selected; return; }
        adminEnemyState.selected = select.value; renderAdminReviewList();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (adminEnemyState.saving || !adminPanelState.isAdmin) return;
        try {
            const payload = EnemyDatabase.normalize({
                ...Object.fromEntries(['name', 'description', 'location', 'hp', 'defense', 'source_url'].map(key => [key, fields[key].value])),
                category: category.value, is_visible: visible.checked,
                resistances: Object.fromEntries(elements.map(key => [key, fields[key].value])),
                skills: skillInputs.map(item => ({ name: item.skillName.value, description: item.description.value }))
            });
            adminEnemyState.saving = true;
            for (const control of root.querySelectorAll('input, textarea, select, button')) control.disabled = true;
            feedback.textContent = 'Saving enemy…';
            const client = getAdminSupabaseClient();
            const query = row.id ? client.from('enemies').update(payload).eq('id', row.id) : client.from('enemies').insert(payload);
            const { data, error } = await query.select('*').single();
            if (error) throw error;
            adminEnemyState.rows = adminEnemyState.rows.filter(item => item.id !== data.id).concat(data).sort((a, b) => a.name.localeCompare(b.name));
            adminEnemyState.selected = data.id; dirty = false;
            feedback.textContent = data.is_visible ? 'Saved and published. Reload the public database to view this profile.' : 'Saved as draft.';
            // Rebind the saved identity for repeated saves, including newly created profiles.
            Object.assign(row, data);
            if (!Array.from(select.options).some(option => option.value === data.id)) {
                const option = node('option'); option.value = data.id; select.append(option);
            }
            select.querySelectorAll('option').forEach(option => { if (option.value === data.id) option.textContent = `${data.name}${data.is_visible ? '' : ' (draft)'}`; });
            select.value = data.id;
        } catch (error) {
            feedback.textContent = `Could not save: ${error.message || 'Please try again.'}`;
        } finally {
            adminEnemyState.saving = false;
            for (const control of root.querySelectorAll('input, textarea, select, button')) control.disabled = false;
        }
    });
    root.append(form); container.append(root);
}
