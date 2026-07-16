"use client";

import * as React from "react";

import type {
  ToolcraftCommand,
  ToolcraftMediaAsset,
  ToolcraftState,
} from "../../state/types";
import { getCanvasMediaTransformStyle } from "./canvas-media-transform";
import { isToolcraftLayerVisibleInTree } from "../layers/layer-tree";

type ToolcraftCanvasImageAsset = ToolcraftMediaAsset & {
  size: NonNullable<ToolcraftMediaAsset["size"]>;
};

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function isDefaultCanvasImageAsset(
  state: ToolcraftState,
  mediaAsset: ToolcraftMediaAsset,
): mediaAsset is ToolcraftCanvasImageAsset {
  return (
    (mediaAsset.assetKind ?? "image") === "image" &&
    mediaAsset.size !== undefined &&
    isToolcraftLayerVisibleInTree(state.layers, mediaAsset.layerId)
  );
}

export function getVisibleCanvasImageAssets(
  state: ToolcraftState,
): ToolcraftCanvasImageAsset[] {
  return state.mediaAssets.filter((mediaAsset) =>
    isDefaultCanvasImageAsset(state, mediaAsset),
  );
}

export function CanvasDefaultMediaLayer({
  canvasSize,
  dispatch,
  mediaAsset,
  selected,
}: {
  canvasSize: ToolcraftState["canvas"]["size"];
  dispatch: React.Dispatch<ToolcraftCommand>;
  mediaAsset: ToolcraftCanvasImageAsset;
  selected: boolean;
}): React.JSX.Element {
  return (
    <button
      aria-label={`Select ${mediaAsset.fileName}`}
      className={cn(
        "absolute inset-0 block cursor-pointer overflow-hidden rounded-none border bg-[color:color-mix(in_oklab,var(--background)_84%,transparent)] p-0 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out",
        selected
          ? "border-[color:var(--link)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--link)_48%,transparent)]"
          : "border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_24%,transparent)]",
      )}
      data-canvas-media-layer={mediaAsset.layerId}
      onClick={(event) => {
        event.stopPropagation();
        dispatch({
          layerId: mediaAsset.layerId,
          type: "layers.select",
        });
      }}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      <img
        alt={mediaAsset.fileName}
        className="block size-full select-none object-cover"
        data-toolcraft-generated-output=""
        draggable={false}
        src={mediaAsset.dataUrl}
        style={getCanvasMediaTransformStyle(mediaAsset.transform, canvasSize)}
      />
    </button>
  );
}
