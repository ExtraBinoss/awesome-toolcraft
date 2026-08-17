"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export const PanelSurface = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function PanelSurface({ children, className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "floating-popup-surface toolcraft-panel-surface isolate border text-[color:var(--popover-foreground)]",
        className,
      )}
    >
      {children}
    </div>
  );
});
