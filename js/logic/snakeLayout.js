function ensureExtraSlots() {
    const hasEmptySlot = rotation.some(slot => slot === null);

    if (!hasEmptySlot) {
        rotation.push(null, null, null, null, null);
    }
}

function getSnakeSlotMap() {
    const map = [];
    const rows = Math.ceil(rotation.length / 5);

    for (let row = 0; row < rows; row++) {
        const isReverse = row % 2 === 1;

        for (let col = 0; col < 5; col++) {
            const slotIndex = row * 5 + col;
            if (slotIndex >= rotation.length) break;

            const visualCol = isReverse ? 4 - col : col;
            const gridColumn = visualCol * 2 + 1;
            const gridRow = row * 2 + 1;

            let arrow = null;

            const isLastInRow = col === 4;
            const hasNextSlot = slotIndex + 1 < rotation.length;

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