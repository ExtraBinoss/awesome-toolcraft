"use client";

import * as React from "react";

import { clampToolcraftCanvasZoom } from "../../state/canvas-zoom";
import type {
  ToolcraftPoint,
} from "../../state/types";
import type { ToolcraftDispatch } from "../../state/store";
import { setToolcraftCanvasNavigationActive } from "./canvas-navigation-performance";

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
const wheelInteractionSettleMs = 320;
const wheelPanTransition = "transform 48ms linear";
const wheelZoomTransition = "transform 72ms cubic-bezier(0.2, 0, 0, 1)";

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
  const pendingWheelViewportRef = React.useRef<{ offset: ToolcraftPoint; zoom: number } | null>(null);

  const scheduleCanvasTransform = React.useCallback(
    (
      element: HTMLElement,
      x: number,
      y: number,
      scale: number,
    ): void => {
      pendingTransformRef.current = { element, scale, x, y };

      if (transformFrameRef.current !== null) {
        return;
      }

      transformFrameRef.current = window.requestAnimationFrame(() => {
        const target = pendingTransformRef.current;
        if (target) {
          target.element.style.transform = `translate(-50%, -50%) translate3d(${target.x}px, ${target.y}px, 0) scale(${target.scale})`;
        }
        pendingTransformRef.current = null;
        transformFrameRef.current = null;
      });
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
    pendingTransformRef.current = null;
  }, []);

  React.useEffect(() => {
    offsetRef.current = offset;
    zoomRef.current = zoom;
    if (!dragRef.current && !wheelDebounceTimerRef.current) {
      accumulatedOffsetRef.current = offset;
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
      workspaceElement.dataset.canvasNavigating = "true";
      setToolcraftCanvasNavigationActive(true);
      const currentZoom = zoomRef.current;
      const worldEl = viewportElement.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');

      if (worldEl) {
        worldEl.style.willChange = "transform";
        worldEl.style.transition = event.ctrlKey ? wheelZoomTransition : wheelPanTransition;
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
          scheduleCanvasTransform(worldEl, nextX, nextY, scale);
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
          if (worldEl) worldEl.style.removeProperty("transition");
          delete workspaceElement.dataset.canvasNavigating;
          setToolcraftCanvasNavigationActive(false);
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
        if (worldEl) worldEl.style.removeProperty("transition");
        delete workspaceElement.dataset.canvasNavigating;
        setToolcraftCanvasNavigationActive(false);
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
        scheduleCanvasTransform(worldEl, nextOffset.x, nextOffset.y, nextZoom / 100);
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
        if (worldEl) worldEl.style.removeProperty("transition");
        delete workspaceElement.dataset.canvasNavigating;
        setToolcraftCanvasNavigationActive(false);
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
      delete workspaceElement.dataset.canvasNavigating;
      setToolcraftCanvasNavigationActive(false);
      const worldEl = viewportElement.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');
      if (worldEl) worldEl.style.removeProperty("will-change");
      if (worldEl) worldEl.style.removeProperty("transition");
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
      const workspaceElement = event.currentTarget.closest<HTMLElement>('[data-slot="toolcraft-runtime-app"]');
      if (workspaceElement) workspaceElement.dataset.canvasNavigating = "true";
      setToolcraftCanvasNavigationActive(true);
      const worldEl = event.currentTarget.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');
      if (worldEl) {
        worldEl.style.removeProperty("transition");
        worldEl.style.willChange = "transform";
      }
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
      const workspaceElement = event.currentTarget.closest<HTMLElement>('[data-slot="toolcraft-runtime-app"]');
      if (workspaceElement) delete workspaceElement.dataset.canvasNavigating;
      setToolcraftCanvasNavigationActive(false);
      const worldEl = event.currentTarget.querySelector<HTMLElement>('[data-toolcraft-canvas-world]');
      if (worldEl) worldEl.style.removeProperty("will-change");
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
