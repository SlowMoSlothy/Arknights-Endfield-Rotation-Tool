const SLOTS_PER_ROW = 10;
function ensureExtraSlots() {
    const minSlots = 10;
    const rowSize = 5;

    if (!Array.isArray(rotation)) return;

    // immer mindestens 10 Slots
    while (rotation.length < minSlots) {
        rotation.push(null);
    }

    const hasEmptySlot = rotation.some(slot => slot === null);
    if (hasEmptySlot) return;

    // Nur erweitern, wenn wirklich der letzte sichtbare Slot belegt ist
    const lastSlotFilled = rotation.length > 0 && rotation[rotation.length - 1] !== null;
    if (!lastSlotFilled) return;

    rotation.push(...Array(rowSize).fill(null));
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
function getSnakeSlotMap() {
    const map = [];
    const rows = Math.ceil(rotation.length / SLOTS_PER_ROW);

    for (let row = 0; row < rows; row++) {
        const isReverse = row % 2 === 1;

        for (let col = 0; col < SLOTS_PER_ROW; col++) {
            const slotIndex = row * SLOTS_PER_ROW + col;
            if (slotIndex >= rotation.length) break;

            const visualCol = isReverse ? (SLOTS_PER_ROW - 1 - col) : col;
            const gridColumn = visualCol * 2 + 1;
            const gridRow = row * 2 + 1;

            let arrow = null;
            const hasNextSlot = slotIndex + 1 < rotation.length;
            const isLastInRow = col === SLOTS_PER_ROW - 1;

            if (hasNextSlot) {
                if (!isLastInRow) {
                    arrow = {
                        text: isReverse ? "←" : "→",
                        gridColumn: isReverse ? gridColumn - 1 : gridColumn + 1,
                        gridRow
                    };
                } else {
                    arrow = {
                        text: "↓",
                        gridColumn,
                        gridRow: gridRow + 1
                    };
                }
            }

            map.push({
                gridColumn,
                gridRow,
                arrow
            });
        }
    }

    return map;
}