"use client";

import * as React from "react";

export type ToolcraftVirtualGridResult<Item> = {
  bottomSpacerHeight: number;
  firstVisibleRowIndex: number;
  rowRef: (node: HTMLDivElement | null) => void;
  rows: readonly Item[][];
  topSpacerHeight: number;
  viewportRef: (node: HTMLDivElement | null) => void;
  visibleRows: readonly Item[][];
};

const gridColumns = 3;
const overscanRows = 2;

export function useAssetLibraryVirtualGrid<Item>(
  items: readonly Item[],
): ToolcraftVirtualGridResult<Item> {
  const [viewportElement, setViewportElement] = React.useState<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [rowHeight, setRowHeight] = React.useState(0);
  const [rowElement, setRowElement] = React.useState<HTMLDivElement | null>(null);
  const scrollFrameRef = React.useRef<number | null>(null);
  const rowObserverRef = React.useRef<ResizeObserver | null>(null);
  const previousItemsRef = React.useRef(items);
  const itemsChanged = previousItemsRef.current !== items;

  const rows = React.useMemo(() => {
    const nextRows: Item[][] = [];
    for (let index = 0; index < items.length; index += gridColumns) {
      nextRows.push(items.slice(index, index + gridColumns) as Item[]);
    }
    return nextRows;
  }, [items]);

  const viewportRef = React.useCallback((node: HTMLDivElement | null) => {
    setViewportElement(node);
  }, []);

  const rowRef = React.useCallback((node: HTMLDivElement | null) => {
    setRowElement(node);
  }, []);

  React.useEffect(() => {
    if (!rowElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const measure = () => {
      const measuredHeight = Math.round(rowElement.getBoundingClientRect().height);
      if (measuredHeight > 0) setRowHeight(measuredHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rowElement);
    rowObserverRef.current = observer;
    return () => {
      observer.disconnect();
      if (rowObserverRef.current === observer) {
        rowObserverRef.current = null;
      }
    };
  }, [rowElement]);

  React.useEffect(() => {
    if (previousItemsRef.current !== items) {
      previousItemsRef.current = items;
      if (viewportElement) viewportElement.scrollTop = 0;
    }
  }, [items, viewportElement]);

  React.useEffect(() => {
    if (!viewportElement) return undefined;
    const updateMetrics = () => {
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
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updateMetrics);
    observer?.observe(viewportElement);
    updateMetrics();
    viewportElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      viewportElement.removeEventListener("scroll", handleScroll);
      observer?.disconnect();
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [viewportElement]);

  const rowStep = rowHeight > 0 ? rowHeight + 6 : 0;
  const visibleRowCount = rowStep > 0 && viewportHeight > 0 ? Math.ceil(viewportHeight / rowStep) : rows.length;
  const effectiveScrollTop = itemsChanged ? 0 : scrollTop;
  const firstVisibleRowIndex = rowStep > 0 ? Math.max(0, Math.floor(effectiveScrollTop / rowStep) - overscanRows) : 0;
  const virtualEndIndex = rowStep > 0 ? Math.min(rows.length, firstVisibleRowIndex + visibleRowCount + overscanRows * 2) : rows.length;
  const visibleRows = React.useMemo(() => rows.slice(firstVisibleRowIndex, virtualEndIndex), [firstVisibleRowIndex, rows, virtualEndIndex]);

  return {
    bottomSpacerHeight: rowStep * Math.max(0, rows.length - virtualEndIndex),
    firstVisibleRowIndex,
    rowRef,
    rows,
    topSpacerHeight: rowStep * firstVisibleRowIndex,
    viewportRef,
    visibleRows,
  };
}
