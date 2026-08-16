"use client";

import * as React from "react";

import { clampToolcraftCanvasZoom } from "../../state/canvas-zoom";
import type {
  ToolcraftPoint,
} from "../../state/types";
import type { ToolcraftDispatch } from "../../state/store";

type CanvasDragState = {
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
};

type PendingCanvasTransform = {
  element: HTMLElement;
  scale: number;
  x: number;
  y: number;
};

const wheelPinchZoomSensitivity = 0.0025;
const wheelTransformSmoothingMs = 52;
const wheelInteractionSettleMs = 320;

function isEventTargetInsideElement(
  target: EventTarget | null,
  element: HTMLElement,
): boolean {
  return target instanceof Node && element.contains(target);
}

function getNextWheelZoom(
  currentZoom: number,
  event: Pick<WheelEvent, "ctrlKey" | "deltaY">,
): number {
  const nextZoom = currentZoom * Math.exp(-event.deltaY * wheelPinchZoomSensitivity);

  return clampToolcraftCanvasZoom(Math.round(nextZoom * 100) / 100);
}

function getZoomedCanvasOffset({
  clientX,
  clientY,
  currentZoom,
  nextZoom,
  offset,
  viewportElement,
}: {
  clientX: number;
  clientY: number;
  currentZoom: number;
  nextZoom: number;
  offset: ToolcraftPoint;
  viewportElement: HTMLElement;
}): ToolcraftPoint {
  const rect = viewportElement.getBoundingClientRect();
  const currentScale = currentZoom / 100;
  const nextScale = nextZoom / 100;
  const pointerX = clientX - rect.left - rect.width / 2;
  const pointerY = clientY - rect.top - rect.height / 2;
  const worldX = (pointerX - offset.x) / currentScale;
  const worldY = (pointerY - offset.y) / currentScale;

  return {
    x: pointerX - worldX * nextScale,
    y: pointerY - worldY * nextScale,
  };
}

export function useCanvasViewportInteractions({
  dispatch,
  draggable,
  offset,
  zoom,
}: {
  dispatch: ToolcraftDispatch;
  draggable: boolean;
  offset: ToolcraftPoint;
  zoom: number;
}): {
  handlePointerDown: React.PointerEventHandler<HTMLDivElement>;
  handlePointerMove: React.PointerEventHandler<HTMLDivElement>;
  handlePointerUp: React.PointerEventHandler<HTMLDivElement>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
} {
  const dragRef = React.useRef<CanvasDragState | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  const offsetRef = React.useRef(offset);
  const zoomRef = React.useRef(zoom);
  const accumulatedOffsetRef = React.useRef(offset);
  const wheelDebounceTimerRef = React.useRef<number | undefined>(undefined);
  const transformFrameRef = React.useRef<number | null>(null);
  const pendingTransformRef = React.useRef<PendingCanvasTransform | null>(null);
  const renderedTransformRef = React.useRef<PendingCanvasTransform | null>(null);
  const smoothTransformRef = React.useRef(false);
  const lastTransformTimestampRef = React.useRef(0);
  const pendingWheelViewportRef = React.useRef<{ offset: ToolcraftPoint; zoom: number } | null>(null);

  const scheduleCanvasTransform = React.useCallback(
    (
      element: HTMLElement,
      x: number,
      y: number,
      scale: number,
      smooth = false,
    ): void => {
      pendingTransformRef.current = { element, scale, x, y };
      smoothTransformRef.current = smooth;

      if (transformFrameRef.current !== null) {
        return;
      }

      lastTransformTimestampRef.current = window.performance.now();
      const animateTransform = (timestamp: number): void => {
        const target = pendingTransformRef.current;

        if (!target) {
          transformFrameRef.current = null;
          return;
        }

        const previous = renderedTransformRef.current ?? target;
        const elapsed = Math.max(1, timestamp - lastTransformTimestampRef.current);
        const blend = smoothTransformRef.current
          ? 1 - Math.exp(-elapsed / wheelTransformSmoothingMs)
          : 1;
        const next = {
          element: target.element,
          scale: previous.scale + (target.scale - previous.scale) * blend,
          x: previous.x + (target.x - previous.x) * blend,
          y: previous.y + (target.y - previous.y) * blend,
        };
        const settled =
          Math.abs(target.x - next.x) < 0.05 &&
          Math.abs(target.y - next.y) < 0.05 &&
          Math.abs(target.scale - next.scale) < 0.0001;
        const rendered = settled ? target : next;

        rendered.element.style.transform = `translate(-50%, -50%) translate3d(${rendered.x}px, ${rendered.y}px, 0) scale(${rendered.scale})`;
        renderedTransformRef.current = rendered;
        lastTransformTimestampRef.current = timestamp;

        if (settled) {
          pendingTransformRef.current = null;
          transformFrameRef.current = null;
          return;
        }

        transformFrameRef.current = window.requestAnimationFrame(animateTransform);
      };

      transformFrameRef.current = window.requestAnimationFrame(animateTransform);
    },
    [],
  );

  const flushCanvasTransform = React.useCallback((): void => {
    const target = pendingTransformRef.current;

    if (transformFrameRef.current !== null) {
      window.cancelAnimationFrame(transformFrameRef.current);
      transformFrameRef.current = null;
    }

    if (!target) {
      return;
    }

    target.element.style.transform = `translate(-50%, -50%) translate3d(${target.x}px, ${target.y}px, 0) scale(${target.scale})`;
    renderedTransformRef.current = target;
    pendingTransformRef.current = null;
  }, []);

  React.useEffect(() => {
    offsetRef.current = offset;
    zoomRef.current = zoom;
    if (!dragRef.current && !wheelDebounceTimerRef.current) {
      accumulatedOffsetRef.current = offset;
      renderedTransformRef.current = null;
    }
  }, [offset, zoom]);

  React.useEffect(() => {
    const viewportElement = viewportRef.current;

    if (!viewportElement) {
      return undefined;
    }

    const workspaceElement =
      viewportElement.closest<HTMLElement>(
        '[data-slot="toolcraft-runtime-app"]',
      ) ?? viewportElement;
    const listenerOptions: AddEventListenerOptions = { capture: true, passive: false };
    const handleWheel = (event: WheelEvent): void => {
      const targetIsInsideCanvas = isEventTargetInsideElement(
        event.target,
        viewportElement,
      );
      if (!targetIsInsideCanvas) {
        if (event.ctrlKey) {
          event.preventDefault();
          event.stopPropagation();
        }

        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const currentZoom = zoomRef.current;
      const worldEl = viewportElement.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');

      if (worldEl) {
        worldEl.style.willChange = "transform";
        renderedTransformRef.current ??= {
          element: worldEl,
          scale: currentZoom / 100,
          x: accumulatedOffsetRef.current.x,
          y: accumulatedOffsetRef.current.y,
        };
      }

      if (!event.ctrlKey) {
        if (wheelDebounceTimerRef.current) {
          window.clearTimeout(wheelDebounceTimerRef.current);
        }

        accumulatedOffsetRef.current = {
          x: accumulatedOffsetRef.current.x - event.deltaX,
          y: accumulatedOffsetRef.current.y - event.deltaY,
        };

        const nextX = accumulatedOffsetRef.current.x;
        const nextY = accumulatedOffsetRef.current.y;
        offsetRef.current = { x: nextX, y: nextY };

        if (worldEl) {
          const scale = currentZoom / 100;
          scheduleCanvasTransform(worldEl, nextX, nextY, scale, true);
        }

        pendingWheelViewportRef.current = {
          offset: { x: nextX, y: nextY },
          zoom: currentZoom,
        };
        wheelDebounceTimerRef.current = window.setTimeout(() => {
          wheelDebounceTimerRef.current = undefined;
          flushCanvasTransform();
          const pendingViewport = pendingWheelViewportRef.current;
          pendingWheelViewportRef.current = null;
          if (pendingViewport) {
            dispatch({
              offset: pendingViewport.offset,
              type: "canvas.setViewport",
              zoom: pendingViewport.zoom,
            });
          }
          if (worldEl) worldEl.style.removeProperty("will-change");
        }, wheelInteractionSettleMs);
        return;
      }

      if (wheelDebounceTimerRef.current) {
        window.clearTimeout(wheelDebounceTimerRef.current);
      }

      const nextZoom = getNextWheelZoom(currentZoom, event);

      if (nextZoom === currentZoom) {
        flushCanvasTransform();
        const pendingViewport = pendingWheelViewportRef.current;
        pendingWheelViewportRef.current = null;
        if (pendingViewport) {
          dispatch({
            offset: pendingViewport.offset,
            type: "canvas.setViewport",
            zoom: pendingViewport.zoom,
          });
        }
        if (worldEl) worldEl.style.removeProperty("will-change");
        return;
      }

      const nextOffset = getZoomedCanvasOffset({
        clientX: event.clientX,
        clientY: event.clientY,
        currentZoom,
        nextZoom,
        offset: accumulatedOffsetRef.current,
        viewportElement,
      });

      accumulatedOffsetRef.current = nextOffset;
      offsetRef.current = nextOffset;
      zoomRef.current = nextZoom;
      pendingWheelViewportRef.current = {
        offset: nextOffset,
        zoom: nextZoom,
      };
      if (worldEl) {
        scheduleCanvasTransform(worldEl, nextOffset.x, nextOffset.y, nextZoom / 100, true);
      }
      wheelDebounceTimerRef.current = window.setTimeout(() => {
        wheelDebounceTimerRef.current = undefined;
        flushCanvasTransform();
        const pendingViewport = pendingWheelViewportRef.current;
        pendingWheelViewportRef.current = null;
        if (pendingViewport) {
          dispatch({
            offset: pendingViewport.offset,
            type: "canvas.setViewport",
            zoom: pendingViewport.zoom,
          });
        }
        if (worldEl) worldEl.style.removeProperty("will-change");
      }, wheelInteractionSettleMs);
    };

    workspaceElement.addEventListener("wheel", handleWheel, listenerOptions);

    return () => {
      workspaceElement.removeEventListener(
        "wheel",
        handleWheel,
        listenerOptions,
      );
      if (wheelDebounceTimerRef.current) {
        window.clearTimeout(wheelDebounceTimerRef.current);
        wheelDebounceTimerRef.current = undefined;
      }
      if (transformFrameRef.current !== null) {
        window.cancelAnimationFrame(transformFrameRef.current);
        transformFrameRef.current = null;
        pendingTransformRef.current = null;
      }
      pendingWheelViewportRef.current = null;
      const worldEl = viewportElement.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');
      if (worldEl) worldEl.style.removeProperty("will-change");
    };
  }, [dispatch, flushCanvasTransform, scheduleCanvasTransform]);

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      if (!draggable || event.button !== 0) {
        return;
      }

      event.preventDefault();
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      dragRef.current = {
        originX: offsetRef.current.x,
        originY: offsetRef.current.y,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [draggable],
  );

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const nextX = drag.originX + event.clientX - drag.startX;
      const nextY = drag.originY + event.clientY - drag.startY;

      const worldEl = event.currentTarget.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');
      if (worldEl) {
        const scale = zoomRef.current / 100;
        scheduleCanvasTransform(worldEl, nextX, nextY, scale);
      }
    },
    [scheduleCanvasTransform],
  );

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (
        typeof event.currentTarget.hasPointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      dragRef.current = null;
      const finalX = drag.originX + event.clientX - drag.startX;
      const finalY = drag.originY + event.clientY - drag.startY;

      if (finalX !== drag.originX || finalY !== drag.originY) {
        const worldEl = event.currentTarget.querySelector<HTMLElement>(
          '[data-toolcraft-canvas-world]',
        );
        if (worldEl) {
          scheduleCanvasTransform(worldEl, finalX, finalY, zoomRef.current / 100);
        }
        dispatch({
          offset: { x: finalX, y: finalY },
          type: "canvas.setOffset",
        });
      }
    },
    [dispatch, scheduleCanvasTransform],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    viewportRef,
  };
}
