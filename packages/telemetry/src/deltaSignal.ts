export type DeltaSignal = {
  changed: boolean;
  deltaCount: number;
  currentCount: number;
  lastSeenCount: number;
};

const normalizeHashes = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim());
};

export const hashListing = (input: { id: string; price: number; title: string }) => {
  const normalizedTitle = input.title.trim().toLowerCase();
  return `${input.id}::${input.price}::${normalizedTitle}`;
};

export const computeDeltaSignal = (input: {
  currentListingHashes?: unknown;
  lastSeenListingHashes?: unknown;
}): DeltaSignal => {
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

  const newHashes = new Set<string>();
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
