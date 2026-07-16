"use client";

import * as React from "react";

import { clampToolcraftCanvasZoom } from "../../state/canvas-zoom";
import type {
  ToolcraftCommand,
  ToolcraftPoint,
} from "../../state/types";

type CanvasDragState = {
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
};

const wheelZoomSensitivity = 0.12;
const wheelPinchZoomSensitivity = 0.5;

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
  const sensitivity = event.ctrlKey
    ? wheelPinchZoomSensitivity
    : wheelZoomSensitivity;
  const rawDelta = -event.deltaY * sensitivity;
  const zoomDelta = Math.trunc(rawDelta) || Math.sign(rawDelta);

  return clampToolcraftCanvasZoom(currentZoom + zoomDelta);
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
  dispatch: React.Dispatch<ToolcraftCommand>;
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

      if (!event.ctrlKey) {
        dispatch({
          offset: {
            x: offset.x - event.deltaX,
            y: offset.y - event.deltaY,
          },
          type: "canvas.setOffset",
        });
        return;
      }

      const nextZoom = getNextWheelZoom(zoom, event);

      if (nextZoom === zoom) {
        return;
      }

      dispatch({
        offset: getZoomedCanvasOffset({
          clientX: event.clientX,
          clientY: event.clientY,
          currentZoom: zoom,
          nextZoom,
          offset,
          viewportElement,
        }),
        type: "canvas.setViewport",
        zoom: nextZoom,
      });
    };

    workspaceElement.addEventListener("wheel", handleWheel, listenerOptions);

    return () => {
      workspaceElement.removeEventListener(
        "wheel",
        handleWheel,
        listenerOptions,
      );
    };
  }, [dispatch, offset, zoom]);

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
        originX: offset.x,
        originY: offset.y,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [draggable, offset],
  );

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      dispatch({
        offset: {
          x: drag.originX + event.clientX - drag.startX,
          y: drag.originY + event.clientY - drag.startY,
        },
        type: "canvas.setOffset",
      });
    },
    [dispatch],
  );

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      if (dragRef.current?.pointerId !== event.pointerId) {
        return;
      }

      if (
        typeof event.currentTarget.hasPointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      dragRef.current = null;
    },
    [],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    viewportRef,
  };
}
