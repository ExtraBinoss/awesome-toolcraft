"use client";

import * as React from "react";

type ControlsPanelVirtualContentProps = {
  children: React.ReactNode;
  viewportElement: HTMLDivElement | null;
};

const overscanViewportMultiplier = 1;

export function ControlsPanelVirtualContent({
  children,
  viewportElement,
}: ControlsPanelVirtualContentProps): React.JSX.Element {
  const nodes = React.useMemo(() => React.Children.toArray(children), [children]);
  const itemKey = nodes
    .map((node, index) => (React.isValidElement(node) && node.key !== null ? String(node.key) : String(index)))
    .join("|");
  const [heights, setHeights] = React.useState<number[]>(() => nodes.map(() => 0));
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const nodeElementsRef = React.useRef(new Map<number, HTMLDivElement>());
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);
  const scrollFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setHeights((current) => current.length === nodes.length ? current : nodes.map(() => 0));
    setScrollTop(0);
    if (viewportElement) viewportElement.scrollTop = 0;
  }, [itemKey, nodes.length, viewportElement]);

  const attachItem = React.useCallback((index: number, node: HTMLDivElement | null) => {
    if (node) {
      nodeElementsRef.current.set(index, node);
      resizeObserverRef.current?.observe(node);
    } else {
      const previous = nodeElementsRef.current.get(index);
      if (previous) resizeObserverRef.current?.unobserve(previous);
      nodeElementsRef.current.delete(index);
    }
  }, []);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      setHeights((current) => {
        let changed = false;
        const next = [...current];
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.toolcraftVirtualIndex);
          const height = Math.round(entry.contentRect.height);
          if (Number.isInteger(index) && height > 0 && next[index] !== height) {
            next[index] = height;
            changed = true;
          }
        });
        return changed ? next : current;
      });
    });
    resizeObserverRef.current = observer;
    nodeElementsRef.current.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  React.useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  React.useEffect(() => {
    if (!viewportElement) return undefined;
    const syncViewport = () => {
      setViewportHeight(viewportElement.clientHeight);
      setScrollTop(viewportElement.scrollTop);
    };
    const handleScroll = () => {
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        setScrollTop(viewportElement.scrollTop);
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncViewport);
    observer?.observe(viewportElement);
    syncViewport();
    viewportElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      viewportElement.removeEventListener("scroll", handleScroll);
      observer?.disconnect();
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [viewportElement]);

  const measured = nodes.length > 0 && heights.length === nodes.length && heights.every((height) => height > 0);
  const offsets = React.useMemo(() => {
    let offset = 0;
    return nodes.map((node, index) => {
      const item = { node, index, height: heights[index] ?? 0, offset };
      offset += item.height;
      return item;
    });
  }, [heights, nodes]);

  if (!measured || !viewportElement || viewportHeight <= 0) {
    return (
      <div className="w-full">
        {nodes.map((node, index) => (
          <div data-toolcraft-virtual-index={index} key={`virtual-measure-${itemKey}-${index}`} ref={(element) => attachItem(index, element)}>
            {node}
          </div>
        ))}
      </div>
    );
  }

  const totalHeight = offsets.reduce((total, item) => total + item.height, 0);
  const overscan = viewportHeight * overscanViewportMultiplier;
  const first = Math.max(0, offsets.findIndex((item) => item.offset + item.height >= Math.max(0, scrollTop - overscan)));
  let last = first;
  while (last < offsets.length && offsets[last]!.offset <= scrollTop + viewportHeight + overscan) last += 1;

  return (
    <div className="relative w-full" style={{ height: totalHeight }}>
      {offsets.slice(first, last).map((item) => (
        <div
          className="absolute inset-x-0"
          data-toolcraft-virtual-index={item.index}
          key={`virtual-render-${itemKey}-${item.index}`}
          ref={(element) => attachItem(item.index, element)}
          style={{ top: item.offset }}
        >
          {item.node}
        </div>
      ))}
    </div>
  );
}
