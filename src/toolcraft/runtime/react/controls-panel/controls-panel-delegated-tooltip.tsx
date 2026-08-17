"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const tooltipId = "toolcraft-controls-tooltip";

export function ControlsPanelDelegatedTooltip({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const label = trigger?.dataset.toolcraftTooltip;
  const rect = trigger?.getBoundingClientRect();

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const findTrigger = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element
        ? target.closest<HTMLElement>("[data-toolcraft-tooltip]")
        : null;
    const show = (event: Event) => setTrigger(findTrigger(event.target));
    const hide = (event: Event) => {
      const next = "relatedTarget" in event ? event.relatedTarget : null;
      setTrigger(findTrigger(next instanceof Node ? next : null));
    };
    root.addEventListener("pointerover", show);
    root.addEventListener("pointerout", hide);
    root.addEventListener("focusin", show);
    root.addEventListener("focusout", hide);
    return () => {
      root.removeEventListener("pointerover", show);
      root.removeEventListener("pointerout", hide);
      root.removeEventListener("focusin", show);
      root.removeEventListener("focusout", hide);
    };
  }, []);

  React.useEffect(() => {
    if (!trigger) return undefined;
    const previous = trigger.getAttribute("aria-describedby");
    trigger.setAttribute("aria-describedby", tooltipId);
    return () => {
      if (previous === null) trigger.removeAttribute("aria-describedby");
      else trigger.setAttribute("aria-describedby", previous);
    };
  }, [trigger]);

  return (
    <div className="contents" ref={rootRef}>
      {children}
      {label && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:var(--muted)] px-1.5 py-1 popup-text-xs-plus shadow-md"
              id={tooltipId}
              role="tooltip"
              style={{ left: rect.left + rect.width / 2, top: rect.top - 4 }}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
