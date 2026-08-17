"use client";

import * as React from "react";

type ControlsPanelVirtualContentProps = {
  children: React.ReactNode;
  viewportElement: HTMLDivElement | null;
};

type VisibleRange = { end: number; start: number };

const estimatedSectionHeight = 220;
const sectionOverscan = 1;
const popupSelector = [
  "[aria-expanded='true']",
  "[data-open]",
  "[data-popup-open]",
  "[data-state='open']",
].join(",");

function rangesMatch(left: VisibleRange, right: VisibleRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function getVisibleRange({
  heights,
  scrollEnd,
  scrollStart,
  sectionCount,
}: {
  heights: ReadonlyMap<number, number>;
  scrollEnd: number;
  scrollStart: number;
  sectionCount: number;
}): VisibleRange {
  let offset = 0;
  let first = 0;
  let last = Math.min(sectionCount - 1, 1);

  for (let index = 0; index < sectionCount; index += 1) {
    const height = heights.get(index) ?? estimatedSectionHeight;
    const sectionEnd = offset + height;
    if (sectionEnd >= scrollStart) {
      first = index;
      break;
    }
    offset = sectionEnd;
  }

  for (let index = first; index < sectionCount; index += 1) {
    offset += heights.get(index) ?? estimatedSectionHeight;
    last = index;
    if (offset >= scrollEnd) break;
  }

  return {
    end: Math.min(sectionCount - 1, last + sectionOverscan),
    start: Math.max(0, first - sectionOverscan),
  };
}

export function ControlsPanelVirtualContent({
  children,
  viewportElement,
}: ControlsPanelVirtualContentProps): React.JSX.Element {
  const sections = React.Children.toArray(children);
  const sectionCount = sections.length;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const measuredHeightsRef = React.useRef(new Map<number, number>());
  const frameRef = React.useRef<number | null>(null);
  const [pinnedSections, setPinnedSections] = React.useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [visibleRange, setVisibleRange] = React.useState<VisibleRange>(() => ({
    end: Math.min(sectionCount - 1, 1),
    start: 0,
  }));

  const updatePinnedSections = React.useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const next = new Set<number>();
    root.querySelectorAll<HTMLElement>("[data-toolcraft-virtual-section]").forEach((node) => {
      const index = Number(node.dataset.toolcraftVirtualSection);
      if (
        (document.activeElement instanceof Node && node.contains(document.activeElement)) ||
        node.querySelector(popupSelector)
      ) {
        next.add(index);
      }
    });
    setPinnedSections((current) => {
      if (current.size === next.size && [...current].every((index) => next.has(index))) {
        return current;
      }
      return next;
    });
  }, []);

  const updateVisibleRange = React.useCallback(() => {
    const root = rootRef.current;
    if (!root || !viewportElement || sectionCount === 0) return;
    const viewportHeight = viewportElement.clientHeight || estimatedSectionHeight * 2;
    const scrollStart = Math.max(0, viewportElement.scrollTop - root.offsetTop);
    const next = getVisibleRange({
      heights: measuredHeightsRef.current,
      scrollEnd: scrollStart + viewportHeight,
      scrollStart,
      sectionCount,
    });
    setVisibleRange((current) => rangesMatch(current, next) ? current : next);
    updatePinnedSections();
  }, [sectionCount, updatePinnedSections, viewportElement]);

  const scheduleRangeUpdate = React.useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      updateVisibleRange();
    });
  }, [updateVisibleRange]);

  React.useLayoutEffect(() => {
    updateVisibleRange();
    if (!viewportElement) return undefined;
    viewportElement.addEventListener("scroll", scheduleRangeUpdate, { passive: true });
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) => {
          let changed = false;
          for (const entry of entries) {
            const node = entry.target as HTMLElement;
            const index = Number(node.dataset.toolcraftVirtualSection);
            const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
            if (Number.isFinite(index) && height > 0 && measuredHeightsRef.current.get(index) !== height) {
              measuredHeightsRef.current.set(index, height);
              changed = true;
            }
          }
          if (changed) scheduleRangeUpdate();
        });
    rootRef.current?.querySelectorAll("[data-toolcraft-virtual-section][data-rendered]").forEach((node) => {
      observer?.observe(node);
    });
    if (observer) observer.observe(viewportElement);

    return () => {
      viewportElement.removeEventListener("scroll", scheduleRangeUpdate);
      observer?.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [scheduleRangeUpdate, updateVisibleRange, visibleRange, viewportElement]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const handleFocusChange = () => queueMicrotask(updatePinnedSections);
    root.addEventListener("focusin", handleFocusChange);
    root.addEventListener("focusout", handleFocusChange);
    const observer = typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(updatePinnedSections);
    observer?.observe(root, {
      attributeFilter: ["aria-expanded", "data-open", "data-popup-open", "data-state"],
      attributes: true,
      subtree: true,
    });
    return () => {
      root.removeEventListener("focusin", handleFocusChange);
      root.removeEventListener("focusout", handleFocusChange);
      observer?.disconnect();
    };
  }, [updatePinnedSections]);

  return (
    <div className="toolcraft-controls-virtual-content w-full" ref={rootRef}>
      {sections.map((section, index) => {
        const rendered =
          (index >= visibleRange.start && index <= visibleRange.end) ||
          pinnedSections.has(index);
        return (
          <div
            aria-hidden={rendered ? undefined : true}
            data-rendered={rendered ? "" : undefined}
            data-toolcraft-virtual-section={index}
            key={React.isValidElement(section) ? section.key ?? index : index}
            style={rendered ? undefined : { height: measuredHeightsRef.current.get(index) ?? estimatedSectionHeight }}
          >
            {rendered ? section : null}
          </div>
        );
      })}
    </div>
  );
}
