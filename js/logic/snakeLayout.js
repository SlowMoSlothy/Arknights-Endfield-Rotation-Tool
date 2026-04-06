function ensureExtraSlots() {
    const hasEmptySlot = rotation.some(slot => slot === null);

    if (!hasEmptySlot) {
        rotation.push(null, null, null, null, null);
    }
}