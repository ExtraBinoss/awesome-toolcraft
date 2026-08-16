export type LoaderSize = number | string;

export const DEFAULT_ANIMATED_LOADER_WIDTH = 40;
export const DEFAULT_ANIMATED_LOADER_HEIGHT = 6;
export const MAX_ANIMATED_LOADER_WIDTH = 64;

export function toCssSize(value: LoaderSize): string {
  return typeof value === "number" ? `${value}px` : value;
}

export function resolveAnimatedLoaderWidthStyle(width: LoaderSize, insetX?: number): string {
  const resolvedWidth = toCssSize(width);
  const constrainedByMaxWidth = `min(${resolvedWidth}, ${MAX_ANIMATED_LOADER_WIDTH}px)`;

  return typeof insetX === "number" && insetX > 0
    ? `min(${constrainedByMaxWidth}, max(0px, calc(100% - ${insetX * 2}px)))`
    : constrainedByMaxWidth;
}
