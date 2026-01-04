export const normalizeRampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.floor(value);
};

export const chooseCanary = (rampPercent: number, randomValue = Math.random()) => {
  const normalized = normalizeRampPercent(rampPercent);
  return randomValue * 100 < normalized;
};
