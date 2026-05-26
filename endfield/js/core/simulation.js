let time = 0;
let totalDamage = 0;

function canUseSkill(skill, operator) {
    return (time - skill.lastUsed >= skill.cooldown) &&
        (operator.energy >= skill.energyCost);
}

function useSkill(operator, skill) {
    skill.lastUsed = time;
    operator.energy -= skill.energyCost;
    totalDamage += skill.damage;

    log(`${time.toFixed(1)}s: ${operator.name} benutzt ${skill.name}`);
}

function autoRotation() {
    operators.forEach(op => {
        const availableSkills = op.skills
            .map(id => skills.find(s => s.id === id))
            .filter(s => canUseSkill(s, op));

        if (availableSkills.length > 0) {
            const best = availableSkills.sort((a, b) => b.damage - a.damage)[0];
            useSkill(op, best);
        }
    });
}

function regenEnergy() {
    operators.forEach(op => {
        op.energy = Math.min(op.maxEnergy, op.energy + 5 * 0.1);
    });
}