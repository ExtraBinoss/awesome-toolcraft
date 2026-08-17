"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export function HoverMarqueeText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const viewportRef = React.useRef<HTMLSpanElement>(null);
  const contentRef = React.useRef<HTMLSpanElement>(null);

  const prepareMarquee = React.useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;

    if (!viewport || !content) return;

    const overflow = Math.ceil(content.scrollWidth - viewport.clientWidth);
    const enabled = overflow > 1;
    viewport.dataset.overflow = enabled ? "true" : "false";

    if (enabled) {
      viewport.style.setProperty("--toolcraft-marquee-distance", `${overflow}px`);
      viewport.style.setProperty(
        "--toolcraft-marquee-duration",
        `${Math.max(1800, Math.min(5000, 1400 + overflow * 22))}ms`,
      );
    }
  }, []);

  return (
    <span
      className={cn("toolcraft-hover-marquee min-w-0 overflow-hidden", className)}
      onFocus={prepareMarquee}
      onPointerEnter={prepareMarquee}
      ref={viewportRef}
    >
      <span className="toolcraft-hover-marquee-content block w-max" ref={contentRef}>
        {children}
      </span>
    </span>
  );
}
