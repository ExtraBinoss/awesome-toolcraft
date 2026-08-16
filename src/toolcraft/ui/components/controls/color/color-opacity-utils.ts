export function parseOpacityValue(opacity: number | undefined): number {
  return Math.min(100, Math.max(0, Math.round(opacity ?? 100)));
}
