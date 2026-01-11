const normalizeHashes = (input) => {
    if (!Array.isArray(input))
        return [];
    return input
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim());
};
export const hashListing = (input) => {
    const normalizedTitle = input.title.trim().toLowerCase();
    return `${input.id}::${input.price}::${normalizedTitle}`;
};
export const computeDeltaSignal = (input) => {
    const current = normalizeHashes(input.currentListingHashes);
    const lastSeen = new Set(normalizeHashes(input.lastSeenListingHashes));
    if (!current.length) {
        return {
            changed: false,
            deltaCount: 0,
            currentCount: 0,
            lastSeenCount: lastSeen.size,
        };
    }
    const newHashes = new Set();
    for (const hash of current) {
        if (!lastSeen.has(hash)) {
            newHashes.add(hash);
        }
    }
    const deltaCount = newHashes.size;
    return {
        changed: deltaCount > 0,
        deltaCount,
        currentCount: current.length,
        lastSeenCount: lastSeen.size,
    };
};
