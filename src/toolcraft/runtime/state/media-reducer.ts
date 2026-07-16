import { commitToolcraftStatePatch } from "./history-patches";
import { getNextToolcraftLayerId } from "./layer-state";
import { getMediaReadyTimelineState } from "./timeline-readiness";
import type {
  ToolcraftCommand,
  ToolcraftMediaAsset,
  ToolcraftMediaTransform,
  ToolcraftState,
} from "./types";

type ToolcraftMediaCommand = Extract<
  ToolcraftCommand,
  {
    type: "media.delete" | "media.import" | "media.reorder" | "media.transform";
  }
>;

function getNextMediaId(state: ToolcraftState): string {
  const existingIds = new Set(state.mediaAssets.map((asset) => asset.id));
  let index = state.mediaAssets.length + 1;

  while (existingIds.has(`media-${index}`)) {
    index += 1;
  }

  return `media-${index}`;
}

function getSingleLayerImportId(state: ToolcraftState): string | undefined {
  return state.schema.panels.layers
    ? undefined
    : state.layers.find((layer) => layer.kind !== "group")?.id;
}

function getSingleMediaImportId(state: ToolcraftState): string | undefined {
  return state.schema.panels.layers ? undefined : state.mediaAssets[0]?.id;
}

function getImportedLayerName(fileName: string): string {
  const name = fileName.replace(/\.[^.]+$/, "").trim();

  return name || "Material";
}

function normalizeMediaRotation(rotationDeg: number): 0 | 90 | 180 | 270 {
  const normalized = ((Math.round(rotationDeg / 90) * 90) % 360 + 360) % 360;

  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

function compactMediaTransform(
  transform: ToolcraftMediaTransform,
): ToolcraftMediaTransform | undefined {
  const normalizedRotation = normalizeMediaRotation(transform.rotationDeg ?? 0);
  const nextTransform: ToolcraftMediaTransform = {};

  if (normalizedRotation !== 0) {
    nextTransform.rotationDeg = normalizedRotation;
  }

  if (transform.flipHorizontal) {
    nextTransform.flipHorizontal = true;
  }

  if (transform.flipVertical) {
    nextTransform.flipVertical = true;
  }

  return Object.keys(nextTransform).length > 0 ? nextTransform : undefined;
}

function getTransformedMediaAsset(
  mediaAsset: ToolcraftMediaAsset,
  operation: Extract<ToolcraftCommand, { type: "media.transform" }>["operation"],
): ToolcraftMediaAsset {
  const currentTransform = mediaAsset.transform ?? {};
  const rotationDeg = normalizeMediaRotation(currentTransform.rotationDeg ?? 0);
  const transform: ToolcraftMediaTransform = {
    flipHorizontal: currentTransform.flipHorizontal,
    flipVertical: currentTransform.flipVertical,
    rotationDeg,
  };

  switch (operation) {
    case "flip-horizontal":
      transform.flipHorizontal = !transform.flipHorizontal;
      break;
    case "flip-vertical":
      transform.flipVertical = !transform.flipVertical;
      break;
    case "rotate-left":
      transform.rotationDeg = normalizeMediaRotation(rotationDeg - 90);
      break;
    case "rotate-right":
      transform.rotationDeg = normalizeMediaRotation(rotationDeg + 90);
      break;
  }

  const compactTransform = compactMediaTransform(transform);

  if (!compactTransform) {
    const { transform: _transform, ...rest } = mediaAsset;

    return rest;
  }

  return {
    ...mediaAsset,
    transform: compactTransform,
  };
}

export function reduceToolcraftMediaCommand(
  state: ToolcraftState,
  command: ToolcraftMediaCommand,
): ToolcraftState {
  switch (command.type) {
    case "media.import": {
      const shouldReplaceSingleLayerMedia =
        !state.schema.panels.layers && command.replaceExisting !== false;
      const assetKind = command.asset.assetKind ?? "image";
      const sourceTarget = command.asset.sourceTarget;
      const existingSourceMediaAsset =
        shouldReplaceSingleLayerMedia && sourceTarget
          ? state.mediaAssets.find((asset) => asset.sourceTarget === sourceTarget)
          : undefined;
      const shouldResizeCanvas =
        state.schema.canvas.sizing.mode === "intrinsic-media" &&
        assetKind === "image" &&
        command.asset.size !== undefined;
      const layerId =
        command.asset.layerId ??
        existingSourceMediaAsset?.layerId ??
        (shouldReplaceSingleLayerMedia && !sourceTarget
          ? getSingleLayerImportId(state)
          : undefined) ??
        getNextToolcraftLayerId(state);
      const mediaId =
        command.asset.id ??
        existingSourceMediaAsset?.id ??
        (shouldReplaceSingleLayerMedia && !sourceTarget
          ? getSingleMediaImportId(state)
          : undefined) ??
        getNextMediaId(state);
      const layer = {
        displayName: command.asset.layerName ?? getImportedLayerName(command.asset.fileName),
        id: layerId,
        kind: "layer" as const,
        name: command.asset.layerName ?? getImportedLayerName(command.asset.fileName),
        visible: true,
      };
      const mediaAsset: ToolcraftMediaAsset = {
        ...(command.asset.assetKind ? { assetKind: command.asset.assetKind } : {}),
        dataUrl: command.asset.dataUrl,
        fileName: command.asset.fileName,
        id: mediaId,
        layerId,
        mimeType: command.asset.mimeType,
        position: shouldResizeCanvas ? { x: 0, y: 0 } : command.asset.position,
        ...(command.asset.size ? { size: command.asset.size } : {}),
        ...(sourceTarget ? { sourceTarget } : {}),
      };
      const layers = shouldReplaceSingleLayerMedia
        ? sourceTarget
          ? state.layers.some((entry) => entry.id === layerId)
            ? state.layers.map((entry) => (entry.id === layerId ? layer : entry))
            : [...state.layers, layer]
          : [layer]
        : [...state.layers, layer];
      const mediaAssets = shouldReplaceSingleLayerMedia
        ? sourceTarget
          ? existingSourceMediaAsset
            ? state.mediaAssets.map((asset) =>
                asset.id === existingSourceMediaAsset.id ? mediaAsset : asset,
              )
            : [...state.mediaAssets, mediaAsset]
          : [mediaAsset]
        : [...state.mediaAssets, mediaAsset];
      const after = {
        ...(shouldResizeCanvas ? { "canvas.size": command.asset.size } : {}),
        layers,
        mediaAssets,
        selectedLayerId: layerId,
      };
      const before = {
        ...(shouldResizeCanvas ? { "canvas.size": state.canvas.size } : {}),
        layers: state.layers,
        mediaAssets: state.mediaAssets,
        selectedLayerId: state.selectedLayerId,
      };

      return commitToolcraftStatePatch(state, {
        after,
        before,
        label: "Import media",
      });
    }

    case "media.delete": {
      if (!state.mediaAssets.some((asset) => asset.id === command.mediaId)) {
        return state;
      }

      const mediaAssets = state.mediaAssets.filter((asset) => asset.id !== command.mediaId);
      const timeline = getMediaReadyTimelineState(state.schema, state.timeline, mediaAssets);
      const shouldCommitTimeline = timeline !== state.timeline;

      return commitToolcraftStatePatch(state, {
        after: {
          mediaAssets,
          ...(shouldCommitTimeline ? { timeline } : {}),
        },
        before: {
          mediaAssets: state.mediaAssets,
          ...(shouldCommitTimeline ? { timeline: state.timeline } : {}),
        },
        label: "Delete media",
      });
    }

    case "media.reorder": {
      if (state.mediaAssets.length < 2 || command.mediaIds.length === 0) {
        return state;
      }

      const mediaById = new Map(state.mediaAssets.map((asset) => [asset.id, asset]));
      const seenIds = new Set<string>();
      const reorderedMediaAssets = command.mediaIds.flatMap((mediaId) => {
        const mediaAsset = mediaById.get(mediaId);

        if (!mediaAsset || seenIds.has(mediaId)) {
          return [];
        }

        seenIds.add(mediaId);
        return [mediaAsset];
      });

      if (reorderedMediaAssets.length === 0) {
        return state;
      }

      for (const mediaAsset of state.mediaAssets) {
        if (!seenIds.has(mediaAsset.id)) {
          reorderedMediaAssets.push(mediaAsset);
        }
      }

      if (
        reorderedMediaAssets.length === state.mediaAssets.length &&
        reorderedMediaAssets.every((asset, index) => asset.id === state.mediaAssets[index]?.id)
      ) {
        return state;
      }

      return commitToolcraftStatePatch(state, {
        after: { mediaAssets: reorderedMediaAssets },
        before: { mediaAssets: state.mediaAssets },
        label: "Reorder media",
      });
    }

    case "media.transform": {
      const targetMediaAsset = state.mediaAssets.find((asset) => asset.id === command.mediaId);

      if (!targetMediaAsset || (targetMediaAsset.assetKind ?? "image") !== "image") {
        return state;
      }

      const mediaAssets = state.mediaAssets.map((asset) =>
        asset.id === targetMediaAsset.id
          ? getTransformedMediaAsset(asset, command.operation)
          : asset,
      );

      return commitToolcraftStatePatch(state, {
        after: { mediaAssets },
        before: { mediaAssets: state.mediaAssets },
        label: "Transform media",
      });
    }
  }
}
