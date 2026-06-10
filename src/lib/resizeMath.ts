export const BLOTTER_SPLIT_MIN = 20;
export const BLOTTER_SPLIT_MAX = 80;

export function computeNewSplit(
  initialSplit: number,
  initialClientY: number,
  currentClientY: number,
  containerHeight: number,
): number {
  if (containerHeight <= 0) return initialSplit;
  const delta = currentClientY - initialClientY;
  const next = initialSplit + (delta / containerHeight) * 100;
  return Math.max(BLOTTER_SPLIT_MIN, Math.min(BLOTTER_SPLIT_MAX, next));
}
