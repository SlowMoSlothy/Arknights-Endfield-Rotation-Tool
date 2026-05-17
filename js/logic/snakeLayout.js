const SLOTS_PER_ROW = 10;

function ensureSlotCount(minCount) {
    while (rotation.length < minCount) {
        rotation.push(null);
    }
}

function compactRotation() {
    rotation = rotation.filter(slot => slot !== null);

    if (rotation.length === 0) {
        rotation.push(null);
    }
}

function trimTrailingEmptyRows() {
    while (rotation.length > 1 && rotation[rotation.length - 1] === null) {
        rotation.pop();
    }

    if (rotation.length === 0) {
        rotation.push(null);
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
                        direction: isReverse ? "left" : "right",
                        gridColumn: isReverse ? gridColumn - 1 : gridColumn + 1,
                        gridRow
                    };
                } else {
                    arrow = {
                        direction: "down",
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
