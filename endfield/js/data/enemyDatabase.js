/* Shared catalog validation. Unknown combat values remain null. */
const EnemyDatabase = (() => {
    const elements = ['physical', 'heat', 'cryo', 'electric', 'nature'];
    function number(value, label) {
        if (value === '' || value == null) return null;
        const result = Number(value);
        if (!Number.isFinite(result) || result < 0) throw new Error(`${label} must be a non-negative number.`);
        return result;
    }
    function url(value) {
        if (!value) return '';
        const parsed = new URL(value);
        if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Use an HTTPS or HTTP source URL.');
        return parsed.href;
    }
    function normalize(input) {
        const name = String(input.name || '').trim();
        if (!name || name.length > 120) throw new Error('Enter an enemy name (up to 120 characters).');
        const category = input.category || 'normal';
        if (!['normal', 'elite', 'boss', 'test'].includes(category)) throw new Error('Invalid category.');
        if ((input.skills || []).some(skill => !skill.name?.trim() && skill.description?.trim())) throw new Error('Enter a name for each ability with a description.');
        return {
            name, category, description: String(input.description || '').trim(),
            location: String(input.location || '').trim(),
            hp: number(input.hp, 'HP'), defense: number(input.defense, 'Defense'),
            resistances: Object.fromEntries(elements.map(key => [key, number(input.resistances?.[key], key)])),
            skills: (input.skills || []).filter(skill => skill.name?.trim()).map(skill => ({
                name: skill.name.trim(), description: String(skill.description || '').trim()
            })),
            source_url: url(input.source_url), is_visible: input.is_visible === true
        };
    }
    function node(tag, text, className) {
        const element = document.createElement(tag);
        if (text != null) element.textContent = text;
        if (className) element.className = className;
        return element;
    }
    function card(enemy) {
        const article = node('article', null, 'enemy-db-card');
        article.append(node('span', enemy.category === 'test' ? 'Training / test enemy' : enemy.category, 'enemy-db-category'), node('h2', enemy.name), node('p', enemy.description));
        if (enemy.location) article.append(node('p', `Location: ${enemy.location}`));
        const values = node('dl');
        for (const [label, value] of [['HP', enemy.hp], ['Defense', enemy.defense], ...elements.map(key => [`${key} damage multiplier`, enemy.resistances?.[key]])]) {
            values.append(node('dt', label), node('dd', value == null ? 'Unknown' : String(value)));
        }
        article.append(values);
        if (enemy.skills?.length) {
            const details = node('details');
            details.append(node('summary', `Abilities (${enemy.skills.length})`));
            for (const skill of enemy.skills) details.append(node('h3', skill.name), node('p', skill.description || 'Description not recorded.'));
            article.append(details);
        }
        if (enemy.source_url) {
            try {
                const link = node('a', 'View source ↗');
                link.href = url(enemy.source_url); link.target = '_blank'; link.rel = 'noopener noreferrer';
                article.append(link);
            } catch { /* Invalid legacy URLs are never rendered. */ }
        }
        return article;
    }
    return { elements, normalize, card, node };
})();
if (typeof module !== 'undefined') module.exports = EnemyDatabase;
