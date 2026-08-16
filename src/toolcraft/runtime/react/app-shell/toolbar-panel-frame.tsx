"use client";

import * as React from "react";

import type { ToolcraftPanelState } from "../../state/types";
import type { PanelPlacement, PanelStateChange } from "../panel-host/panel-host-types";
import { useToolcraftDispatch, useToolcraftSelector } from "./use-toolcraft";

type ToolbarPanelFrameProps = {
  children: React.ReactNode;
  onPanelStateChange?: PanelStateChange;
  panelState?: ToolcraftPanelState;
  placement: PanelPlacement;
};

type DragState = {
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
};

const snapDistancePx = 40;
const viewportMarginPx = 10;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("a,button,input,select,textarea"));
}

function getTransform(x: number, y: number): string {
  return `translateX(-50%) translate3d(${x}px, ${y}px, 0)`;
}

export function ToolbarPanelFrame({
  children,
  onPanelStateChange,
  panelState,
  placement,
}: ToolbarPanelFrameProps): React.JSX.Element {
  const dispatch = useToolcraftDispatch();
  const committedPanelState = useToolcraftSelector(
    React.useCallback((state) => state.panels.toolbar, []),
  );
  const position = panelState?.offset ?? committedPanelState.offset;
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const positionRef = React.useRef(position);
  const dragRef = React.useRef<DragState | null>(null);
  const pendingPositionRef = React.useRef(position);
  const animationFrameRef = React.useRef(0);

  const flushPendingPosition = React.useCallback((): void => {
    animationFrameRef.current = 0;
    const nextPosition = pendingPositionRef.current;
    positionRef.current = nextPosition;
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = getTransform(nextPosition.x, nextPosition.y);
    }
  }, []);

  React.useEffect(() => {
    positionRef.current = position;
    pendingPositionRef.current = position;
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = getTransform(position.x, position.y);
    }
  }, [position]);

  React.useEffect(() => () => cancelAnimationFrame(animationFrameRef.current), []);

  if (placement === "surface") {
    return <>{children}</>;
  }

  const schedulePosition = (x: number, y: number): void => {
    pendingPositionRef.current = { x, y };
    if (animationFrameRef.current === 0) {
      animationFrameRef.current = requestAnimationFrame(flushPendingPosition);
    }
  };
  const commitPosition = (nextPosition: { x: number; y: number }): void => {
    positionRef.current = nextPosition;
    pendingPositionRef.current = nextPosition;
    onPanelStateChange?.({ offset: nextPosition });
    dispatch({ offset: nextPosition, panelId: "toolbar", type: "panels.setOffset" });
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    schedulePosition(
      drag.originX + event.clientX - drag.originClientX,
      drag.originY + event.clientY - drag.originClientY,
    );
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    cancelAnimationFrame(animationFrameRef.current);
    flushPendingPosition();

    const rect = wrapperRef.current?.getBoundingClientRect();
    const nextPosition = { ...positionRef.current };
    if (rect && rect.top < snapDistancePx) {
      nextPosition.y += viewportMarginPx - rect.top;
    } else if (rect && window.innerHeight - rect.bottom < snapDistancePx) {
      nextPosition.y += window.innerHeight - viewportMarginPx - rect.bottom;
    }
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = getTransform(nextPosition.x, nextPosition.y);
    }
    commitPosition(nextPosition);
  };
  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (isInteractiveTarget(event.target)) {
      return;
    }
    const resetPosition = { x: 0, y: 0 };
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = getTransform(0, 0);
    }
    commitPosition(resetPosition);
  };
  const floatingPanel = (
    <div
      className="pointer-events-auto absolute bottom-2.5 left-1/2 z-[70] touch-none"
      data-panel-id="toolbar"
      data-panel-type="toolbar"
      data-slot="toolcraft-runtime-panel-host"
      onDoubleClick={handleDoubleClick}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={wrapperRef}
      style={{ transform: getTransform(position.x, position.y) }}
    >
      {children}
    </div>
  );

  return placement === "floating" ? floatingPanel : (
    <div className="relative min-h-[180px] w-full overflow-hidden rounded-lg">
      {floatingPanel}
    </div>
  );
}
