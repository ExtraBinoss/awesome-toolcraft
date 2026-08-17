"use client";

import * as React from "react";

import {
  CanvasDefaultMediaLayer,
} from "./canvas-default-media-layer";
import { getVisibleCanvasImageAssets } from "./canvas-default-media-assets";
import { useCanvasDropImport } from "./use-canvas-drop-import";
import { useCanvasViewportInteractions } from "./use-canvas-viewport-interactions";
import {
  useToolcraftDispatch,
  useToolcraftSelector,
  useToolcraftStore,
} from "../app-shell/use-toolcraft";

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
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();
  const canvasSchema = useToolcraftSelector(React.useCallback((state) => state.schema.canvas, []));
  const canvas = useToolcraftSelector(React.useCallback((state) => state.canvas, []));
  const layers = useToolcraftSelector(React.useCallback((state) => state.layers, []));
  const mediaAssets = useToolcraftSelector(React.useCallback((state) => state.mediaAssets, []));
  const selectedLayerId = useToolcraftSelector(
    React.useCallback((state) => state.selectedLayerId, []),
  );
  const [dragOver, setDragOver] = React.useState(false);
  const uploadEnabled = canvasSchema.upload;
  const { offset, size, zoom } = canvas;
  const scale = zoom / 100;
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    viewportRef,
  } = useCanvasViewportInteractions({
    dispatch,
    draggable: canvasSchema.draggable,
    offset,
    zoom,
  });
  const handleDrop = useCanvasDropImport({
    dispatch,
    getState: store.getState,
    offset,
    setDragOver,
    size,
    uploadEnabled,
    zoom,
  });
  const visibleMediaAssets = React.useMemo(
    () => getVisibleCanvasImageAssets({ ...store.getState(), layers, mediaAssets }),
    [layers, mediaAssets, store],
  );
  const hasCanvasContent = visibleMediaAssets.length > 0;
  const hasCanvasSlot = React.Children.count(children) > 0;
  const renderEditableCanvas =
    canvasSchema.sizing.mode !== "intrinsic-media" ||
    canvasSchema.sizeSource === "app" ||
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
      onPointerCancel={(event) => {
        handlePointerUp(event);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={viewportRef}
      role="application"
    >
      <div
        className="absolute top-1/2 left-1/2 isolate [backface-visibility:hidden] [contain:layout_paint_style]"
        data-toolcraft-canvas-world=""
        style={{
          transform: `translate(-50%, -50%) translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
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
                    selected={selectedLayerId === mediaAsset.layerId}
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
