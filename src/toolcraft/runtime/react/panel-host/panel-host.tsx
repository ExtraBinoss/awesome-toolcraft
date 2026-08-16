"use client";

import * as React from "react";

import {
  panelDragHandleSelector,
  panelDragIgnoredTargetSelector,
  panelHostConfig,
} from "./panel-host-config";
import { resolvePanelSnapPosition } from "./panel-host-geometry";
import type {
  ToolcraftPanelHostProps,
  PanelContainerProps,
  PanelHostProps,
  PanelPoint,
  PanelStageProps,
  PanelViewport,
} from "./panel-host-types";
import { useToolcraftDispatch, useToolcraftSelector } from "../app-shell/use-toolcraft";

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function isPanelDragHandleTarget(target: EventTarget | null, currentTarget: HTMLElement): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const handleTarget = target.closest(panelDragHandleSelector);

  return handleTarget !== null && currentTarget.contains(handleTarget);
}

function shouldIgnorePanelTarget(target: EventTarget | null, currentTarget: HTMLElement): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const ignoredTarget = target.closest(panelDragIgnoredTargetSelector);

  return ignoredTarget !== null && currentTarget.contains(ignoredTarget);
}

function shouldIgnorePanelDrag(event: React.PointerEvent<HTMLElement>): boolean {
  return shouldIgnorePanelTarget(event.target, event.currentTarget);
}

function getPanelVisualViewport(): PanelViewport {
  const visualViewport = window.visualViewport;

  if (visualViewport) {
    return {
      height: visualViewport.height,
      offsetLeft: visualViewport.offsetLeft,
      offsetTop: visualViewport.offsetTop,
      width: visualViewport.width,
    };
  }

  return {
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
    width: window.innerWidth,
  };
}

type PanelDragState = {
  lastClientX: number;
  lastClientY: number;
  lastTimestamp: number;
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
  velocity: PanelPoint;
};

function panelTransform(position: PanelPoint): string {
  return `translate3d(${position.x}px, ${position.y}px, 0)`;
}

function PanelHost({
  children,
  className,
  dragMode,
  innerClassName,
  onPositionChange,
  onResetPosition,
  panelId,
  panelType,
  position,
  snap,
  style,
}: PanelHostProps): React.JSX.Element {
  const config = panelHostConfig[panelType];
  const resolvedDragMode = dragMode ?? config.dragMode;
  const resolvedSnap = snap ?? { edges: config.snapEdges };
  const resolvedPanelId = panelId ?? config.panelId;
  const resolvedPosition = React.useMemo(
    () => position ?? { x: 0, y: 0 },
    [position],
  );
  const panelRef = React.useRef<HTMLDivElement>(null);
  const positionRef = React.useRef(resolvedPosition);
  const pendingPositionRef = React.useRef(resolvedPosition);
  const dragRef = React.useRef<PanelDragState | null>(null);
  const animationFrameRef = React.useRef(0);

  const flushPosition = React.useCallback((): void => {
    animationFrameRef.current = 0;
    positionRef.current = pendingPositionRef.current;
    if (panelRef.current) {
      panelRef.current.style.transform = panelTransform(positionRef.current);
    }
  }, []);

  React.useEffect(() => {
    positionRef.current = resolvedPosition;
    pendingPositionRef.current = resolvedPosition;
    if (panelRef.current) {
      panelRef.current.style.transform = panelTransform(resolvedPosition);
    }
  }, [resolvedPosition]);

  React.useEffect(
    () => () => window.cancelAnimationFrame(animationFrameRef.current),
    [],
  );

  const schedulePosition = (nextPosition: PanelPoint): void => {
    pendingPositionRef.current = nextPosition;
    if (animationFrameRef.current === 0) {
      animationFrameRef.current = window.requestAnimationFrame(flushPosition);
    }
  };

  const publishPosition = (nextPosition: PanelPoint): void => {
    positionRef.current = nextPosition;
    pendingPositionRef.current = nextPosition;
    onPositionChange?.(nextPosition);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLElement> = (event) => {
    if (event.button !== 0) {
      return;
    }

    if (
      resolvedDragMode === "handle" &&
      !isPanelDragHandleTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    if (event.defaultPrevented || shouldIgnorePanelDrag(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    dragRef.current = {
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      lastTimestamp: event.timeStamp,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
      velocity: { x: 0, y: 0 },
    };
  };

  const handlePointerMove: React.PointerEventHandler<HTMLElement> = (event) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const elapsed = Math.max(1, event.timeStamp - drag.lastTimestamp);
    drag.velocity = {
      x: (event.clientX - drag.lastClientX) / elapsed,
      y: (event.clientY - drag.lastClientY) / elapsed,
    };
    drag.lastClientX = event.clientX;
    drag.lastClientY = event.clientY;
    drag.lastTimestamp = event.timeStamp;
    schedulePosition({
      x: drag.originX + event.clientX - drag.originClientX,
      y: drag.originY + event.clientY - drag.originClientY,
    });
  };

  const handlePointerUp: React.PointerEventHandler<HTMLElement> = (event) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    dragRef.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.cancelAnimationFrame(animationFrameRef.current);
    flushPosition();

    const panel = panelRef.current;
    const offset = positionRef.current;
    const rect = panel?.getBoundingClientRect();
    const target = rect && resolvedSnap.edges.length > 0
      ? resolvePanelSnapPosition({
          dimensions: { height: rect.height, width: rect.width },
          edges: resolvedSnap.edges,
          margin: resolvedSnap.margin,
          position: { x: rect.left, y: rect.top },
          velocity: drag.velocity,
          viewport: getPanelVisualViewport(),
          zone: resolvedSnap.zone,
        })
      : null;
    const nextPosition = target && rect
      ? {
          x: target.x - (rect.left - offset.x),
          y: target.y - (rect.top - offset.y),
        }
      : offset;

    if (panel) {
      panel.style.transition = "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
      panel.style.transform = panelTransform(nextPosition);
      window.setTimeout(() => panel.style.removeProperty("transition"), 300);
    }
    publishPosition(nextPosition);
  };

  const handleDoubleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    if (
      !resolvedSnap ||
      event.defaultPrevented ||
      (resolvedDragMode === "handle" &&
        !isPanelDragHandleTarget(event.target, event.currentTarget)) ||
      shouldIgnorePanelTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    const resetPosition = { x: 0, y: 0 };
    if (panelRef.current) {
      panelRef.current.style.transition = "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
      panelRef.current.style.transform = panelTransform(resetPosition);
    }
    publishPosition(resetPosition);
    onResetPosition?.();
  };

  return (
    <div className={cn("pointer-events-none", config.wrapperClassName, className)} style={style}>
        <div
          className={cn("pointer-events-auto touch-none data-[dragging=true]:cursor-grabbing", innerClassName)}
          data-dragging="false"
          data-drag-mode={resolvedDragMode}
          data-panel-id={resolvedPanelId}
          data-panel-type={panelType}
          data-slot="toolcraft-runtime-panel-host"
          data-snap-edges={resolvedSnap?.edges.join(" ")}
          onDoubleClick={handleDoubleClick}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={panelRef}
          style={{ transform: panelTransform(resolvedPosition) }}
        >
          {children}
        </div>
    </div>
  );
}

function ToolcraftPanelHost({
  onPositionChange,
  onResetPosition,
  panelType,
  position,
  ...props
}: ToolcraftPanelHostProps): React.JSX.Element {
  const dispatch = useToolcraftDispatch();
  const panelState = useToolcraftSelector(
    React.useCallback((state) => state.panels[panelType], [panelType]),
  );

  return (
    <PanelHost
      {...props}
      onPositionChange={(offset) => {
        onPositionChange?.(offset);
        dispatch({ offset, panelId: panelType, type: "panels.setOffset" });
      }}
      onResetPosition={() => {
        onResetPosition?.();
        dispatch({ panelId: panelType, type: "panels.resetOffset" });
      }}
      panelType={panelType}
      position={position ?? panelState.offset}
    />
  );
}

function PanelStage({
  children,
  className,
  ...props
}: PanelStageProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={cn(
        "relative w-full min-w-0 overflow-hidden rounded-lg bg-[color:var(--background)]",
        className,
      )}
      data-toolcraft-panel-stage=""
    >
      {children}
    </div>
  );
}

export function PanelContainer({
  children,
  className,
  dragMode,
  onPanelStateChange,
  panelClassName,
  panelState,
  panelType,
  placement,
  ...props
}: PanelContainerProps): React.JSX.Element {
  const config = panelHostConfig[panelType];

  if (placement === "surface") {
    return <>{children}</>;
  }

  if (placement === "floating") {
    return (
      <ToolcraftPanelHost
        className={panelClassName}
        dragMode={dragMode}
        onPositionChange={(offset) => onPanelStateChange?.({ offset })}
        panelType={panelType}
        position={panelState?.offset}
        snap={{ edges: config.snapEdges }}
      >
        {children}
      </ToolcraftPanelHost>
    );
  }

  return (
    <PanelStage
      {...props}
      className={cn(config.stageClassName, className)}
      data-panel-type={panelType}
    >
      <ToolcraftPanelHost
        className={panelClassName}
        dragMode={dragMode}
        onPositionChange={(offset) => onPanelStateChange?.({ offset })}
        panelType={panelType}
        position={panelState?.offset}
        snap={{ edges: config.snapEdges }}
      >
        {children}
      </ToolcraftPanelHost>
    </PanelStage>
  );
}
