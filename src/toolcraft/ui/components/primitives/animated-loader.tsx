import type { CSSProperties } from "react";

import { cn } from "../../lib/utils";
import {
  DEFAULT_ANIMATED_LOADER_HEIGHT,
  DEFAULT_ANIMATED_LOADER_WIDTH,
  resolveAnimatedLoaderWidthStyle,
  toCssSize,
  type LoaderSize,
} from "./animated-loader-utils";

export type AnimatedLoaderProps = {
  className?: string;
  height?: LoaderSize;
  indicatorClassName?: string;
  insetX?: number;
  width?: LoaderSize;
};

export function AnimatedLoader({
  className,
  height = DEFAULT_ANIMATED_LOADER_HEIGHT,
  indicatorClassName,
  insetX,
  width = DEFAULT_ANIMATED_LOADER_WIDTH,
}: AnimatedLoaderProps): React.JSX.Element {
  const style: CSSProperties = {
    height: toCssSize(height),
    width: resolveAnimatedLoaderWidthStyle(width, insetX),
  };

  return (
    <span
      aria-hidden="true"
      className={cn("relative shrink-0", className)}
      data-inset-x={typeof insetX === "number" ? String(insetX) : undefined}
      data-slot="animated-loader"
      style={style}
    >
      <span
        className={cn(
          "button-loader-indicator absolute inset-y-0 left-0 right-[65%] rounded-full bg-[color:var(--foreground)] opacity-90",
          indicatorClassName,
        )}
        data-slot="animated-loader-indicator"
      />
    </span>
  );
}
