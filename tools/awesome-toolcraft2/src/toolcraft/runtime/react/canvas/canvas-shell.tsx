"use client";

import * as React from "react";

import {
  CanvasDefaultMediaLayer,
  getVisibleCanvasImageAssets,
} from "./canvas-default-media-layer";
import { useCanvasDropImport } from "./use-canvas-drop-import";
import { useCanvasViewportInteractions } from "./use-canvas-viewport-interactions";
import { useToolcraft } from "../app-shell/use-toolcraft";

export type CanvasShellProps = {
  children?: React.ReactNode;
  renderDefaultMedia?: boolean;
};

function isDragLeavingCurrentTarget(
  event: React.DragEvent<HTMLElement>,
): boolean {
  const nextTarget = event.relatedTarget;

  return !(
    nextTarget instanceof Node && event.currentTarget.contains(nextTarget)
  );
}

export function CanvasShell({
  children,
  renderDefaultMedia = true,
}: CanvasShellProps): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const [dragOver, setDragOver] = React.useState(false);
  const uploadEnabled = state.schema.canvas.upload;
  const { offset, size, zoom } = state.canvas;
  const scale = zoom / 100;
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    viewportRef,
  } = useCanvasViewportInteractions({
    dispatch,
    draggable: state.schema.canvas.draggable,
    offset,
    zoom,
  });
  const handleDrop = useCanvasDropImport({
    dispatch,
    offset,
    setDragOver,
    size,
    state,
    uploadEnabled,
    zoom,
  });
  const visibleMediaAssets = React.useMemo(
    () => getVisibleCanvasImageAssets(state),
    [state.layers, state.mediaAssets],
  );
  const hasCanvasContent = visibleMediaAssets.length > 0;
  const hasCanvasSlot = React.Children.count(children) > 0;
  const renderEditableCanvas =
    state.schema.canvas.sizing.mode !== "intrinsic-media" ||
    state.schema.canvas.sizeSource === "app" ||
    hasCanvasContent ||
    hasCanvasSlot;

  const beginDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    if (!uploadEnabled) {
      return;
    }

    event.preventDefault();
    setDragOver(true);
  };

  return (
    <div
      aria-label="Canvas viewport"
      className="group/canvas absolute inset-0 cursor-grab touch-none overflow-hidden bg-[color:var(--background)] active:cursor-grabbing"
      data-drag-over={dragOver}
      data-slot="toolcraft-runtime-canvas"
      onDragEnter={beginDragOver}
      onDragLeave={(event) => {
        if (isDragLeavingCurrentTarget(event)) {
          setDragOver(false);
        }
      }}
      onDragOver={beginDragOver}
      onDrop={handleDrop}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={viewportRef}
      role="application"
    >
      <div
        className="absolute top-1/2 left-1/2"
        data-toolcraft-canvas-world=""
        style={{
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {renderEditableCanvas ? (
          <div
            className="relative z-10 overflow-hidden"
            data-toolcraft-canvas-content=""
            data-toolcraft-editable-canvas=""
            style={{
              height: size.height,
              width: size.width,
            }}
          >
            {renderDefaultMedia
              ? visibleMediaAssets.map((mediaAsset) => (
                  <CanvasDefaultMediaLayer
                    canvasSize={size}
                    dispatch={dispatch}
                    key={mediaAsset.id}
                    mediaAsset={mediaAsset}
                    selected={state.selectedLayerId === mediaAsset.layerId}
                  />
                ))
              : null}
            {children ? (
              <div
                className="absolute inset-0 z-20"
                data-toolcraft-canvas-slot=""
              >
                {children}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[color:color-mix(in_oklab,var(--link)_8%,transparent)] opacity-0 transition-opacity duration-150 ease-out group-data-[drag-over=true]/canvas:opacity-100"
        data-canvas-drag-highlight=""
      />
    </div>
  );
}
