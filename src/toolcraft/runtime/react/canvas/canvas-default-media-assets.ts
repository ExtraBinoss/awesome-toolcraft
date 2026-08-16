import type { ToolcraftMediaAsset, ToolcraftState } from "../../state/types";
import { isToolcraftLayerVisibleInTree } from "../layers/layer-tree";

export type ToolcraftCanvasImageAsset = ToolcraftMediaAsset & {
  size: NonNullable<ToolcraftMediaAsset["size"]>;
};

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
  const visibleAssets: ToolcraftCanvasImageAsset[] = [];

  for (const mediaAsset of state.mediaAssets) {
    if (isDefaultCanvasImageAsset(state, mediaAsset)) {
      visibleAssets.push(mediaAsset);
    }
  }

  return visibleAssets;
}
