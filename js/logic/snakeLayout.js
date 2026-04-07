function ensureExtraSlots() {
    const hasEmptySlot = rotation.some(slot => slot === null);

    if (!hasEmptySlot) {
        rotation.push(null, null, null, null, null);
    }
}

function trimTrailingEmptyRows() {
    const minimumSlots = 10;

    while (rotation.length > minimumSlots) {
        const lastFive = rotation.slice(-5);
        const allEmpty = lastFive.every(slot => slot === null);

        if (!allEmpty) {
            break;
        }

        rotation.splice(-5, 5);
    }
}

function compactRotation() {
    rotation = rotation.filter(slot => slot !== null);

    while (rotation.length < 10) {
        rotation.push(null);
    }
}

function trimTrailingEmptyRows() {
    const minimumSlots = 10;

    while (rotation.length > minimumSlots) {
        const lastFive = rotation.slice(-5);
        const allEmpty = lastFive.every(slot => slot === null);

        if (!allEmpty) {
            break;
        }

        rotation.splice(-5, 5);
    }
}