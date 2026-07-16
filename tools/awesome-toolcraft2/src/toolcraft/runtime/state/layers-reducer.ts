import { commitToolcraftStatePatch } from "./history-patches";
import { getNextToolcraftLayerId } from "./layer-state";
import type {
  ToolcraftCommand,
  ToolcraftLayer,
  ToolcraftLayerDraft,
  ToolcraftState,
} from "./types";

type ToolcraftLayersCommand = Extract<
  ToolcraftCommand,
  {
    type:
      | "layers.add"
      | "layers.delete"
      | "layers.moveToGroup"
      | "layers.rename"
      | "layers.reorder"
      | "layers.select"
      | "layers.toggleCollapsed"
      | "layers.toggleVisibility";
  }
>;

function getNextLayerName(
  layers: readonly ToolcraftLayer[],
  prefix: "Group" | "Layer",
): string {
  const nextIndex =
    layers.reduce((highestIndex, layer) => {
      const label = layer.displayName ?? layer.name;
      const match = new RegExp(`^${prefix} (\\d+)$`).exec(label);
      const currentIndex = Number(match?.[1] ?? 0);

      return Math.max(highestIndex, currentIndex);
    }, 0) + 1;

  return `${prefix} ${nextIndex}`;
}

function createToolcraftLayer(
  state: ToolcraftState,
  draft: ToolcraftLayerDraft | undefined,
): ToolcraftLayer {
  const kind = draft?.kind ?? "layer";
  const name =
    draft?.name ??
    draft?.displayName ??
    getNextLayerName(state.layers, kind === "group" ? "Group" : "Layer");

  return {
    collapsed: kind === "group" ? (draft?.collapsed ?? false) : draft?.collapsed,
    displayName: draft?.displayName ?? name,
    id: draft?.id ?? getNextToolcraftLayerId(state),
    kind,
    name,
    parentGroupId: draft?.parentGroupId,
    visible: draft?.visible ?? true,
  };
}

function clampInsertIndex(length: number, insertIndex: number | undefined): number {
  return Math.max(0, Math.min(length, insertIndex ?? length));
}

function getToolcraftLayerBlockIds(
  layers: readonly ToolcraftLayer[],
  layerId: string,
): Set<string> {
  const blockIds = new Set<string>([layerId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const layer of layers) {
      if (layer.parentGroupId && blockIds.has(layer.parentGroupId) && !blockIds.has(layer.id)) {
        blockIds.add(layer.id);
        changed = true;
      }
    }
  }

  return blockIds;
}

function canMoveLayerToParent(
  layers: readonly ToolcraftLayer[],
  layerId: string,
  parentGroupId: string | null,
): boolean {
  if (!parentGroupId) {
    return true;
  }

  if (layerId === parentGroupId) {
    return false;
  }

  const parent = layers.find((layer) => layer.id === parentGroupId);

  if (!parent || parent.kind !== "group") {
    return false;
  }

  return !getToolcraftLayerBlockIds(layers, layerId).has(parentGroupId);
}

export function reduceToolcraftLayersCommand(
  state: ToolcraftState,
  command: ToolcraftLayersCommand,
): ToolcraftState {
  switch (command.type) {
    case "layers.add": {
      const layer = createToolcraftLayer(state, command.layer);
      const insertIndex = clampInsertIndex(state.layers.length, command.insertIndex);
      const layers = [
        ...state.layers.slice(0, insertIndex),
        layer,
        ...state.layers.slice(insertIndex),
      ];

      return commitToolcraftStatePatch(state, {
        after: {
          layers,
          selectedLayerId: layer.id,
        },
        before: {
          layers: state.layers,
          selectedLayerId: state.selectedLayerId,
        },
        label: layer.kind === "group" ? "Add group" : "Add layer",
      });
    }

    case "layers.delete": {
      if (!state.layers.some((layer) => layer.id === command.layerId)) {
        return state;
      }

      const deletedLayerIds = getToolcraftLayerBlockIds(state.layers, command.layerId);
      const layers = state.layers.filter((layer) => !deletedLayerIds.has(layer.id));
      const mediaAssets = state.mediaAssets.filter((asset) => !deletedLayerIds.has(asset.layerId));
      const selectedLayerId = deletedLayerIds.has(state.selectedLayerId ?? "")
        ? (layers[0]?.id ?? null)
        : state.selectedLayerId;

      return commitToolcraftStatePatch(state, {
        after: {
          layers,
          mediaAssets,
          selectedLayerId,
        },
        before: {
          layers: state.layers,
          mediaAssets: state.mediaAssets,
          selectedLayerId: state.selectedLayerId,
        },
        label: "Delete layer",
      });
    }

    case "layers.moveToGroup": {
      const movedRootLayerIds = new Set(
        command.layerIds.filter((layerId) =>
          canMoveLayerToParent(state.layers, layerId, command.parentGroupId),
        ),
      );

      if (movedRootLayerIds.size === 0) {
        return state;
      }

      const nextParentGroupId = command.parentGroupId ?? undefined;
      const movedBlockIds = new Set<string>();

      for (const layerId of movedRootLayerIds) {
        getToolcraftLayerBlockIds(state.layers, layerId).forEach((blockLayerId) => {
          movedBlockIds.add(blockLayerId);
        });
      }

      const movingBlock = state.layers.filter((layer) => movedBlockIds.has(layer.id));
      const updatedMovingBlock = movingBlock.map((layer) =>
        movedRootLayerIds.has(layer.id) ? { ...layer, parentGroupId: nextParentGroupId } : layer,
      );
      const remainingLayers = state.layers.filter((layer) => !movedBlockIds.has(layer.id));
      const targetGroupIndex = command.parentGroupId
        ? remainingLayers.findIndex((layer) => layer.id === command.parentGroupId)
        : -1;
      const movedLayers = command.parentGroupId
        ? targetGroupIndex >= 0
          ? [
              ...remainingLayers.slice(0, targetGroupIndex + 1),
              ...updatedMovingBlock,
              ...remainingLayers.slice(targetGroupIndex + 1),
            ]
          : state.layers
        : state.layers.map((layer) =>
            movedRootLayerIds.has(layer.id) ? { ...layer, parentGroupId: nextParentGroupId } : layer,
          );
      const layers = command.parentGroupId
        ? movedLayers.map((layer) =>
            layer.id === command.parentGroupId && layer.kind === "group" && layer.collapsed
              ? { ...layer, collapsed: false }
              : layer,
          )
        : movedLayers;

      if (layers === state.layers) {
        return state;
      }

      if (
        layers.every(
          (layer, index) =>
            layer.id === state.layers[index]?.id &&
            layer.parentGroupId === state.layers[index]?.parentGroupId &&
            layer.collapsed === state.layers[index]?.collapsed,
        )
      ) {
        return state;
      }

      return commitToolcraftStatePatch(state, {
        after: { layers },
        before: { layers: state.layers },
        label: command.parentGroupId ? "Move layers to group" : "Move layers to root",
      });
    }

    case "layers.select":
      if (!state.layers.some((layer) => layer.id === command.layerId)) {
        return state;
      }

      return {
        ...state,
        selectedLayerId: command.layerId,
      };

    case "layers.rename": {
      const name = command.name.trim();

      if (!name || !state.layers.some((layer) => layer.id === command.layerId)) {
        return state;
      }

      const layers = state.layers.map((layer) =>
        layer.id === command.layerId ? { ...layer, displayName: name } : layer,
      );

      return commitToolcraftStatePatch(state, {
        after: { layers },
        before: { layers: state.layers },
        label: "Rename layer",
      });
    }

    case "layers.toggleCollapsed": {
      const targetLayer = state.layers.find((layer) => layer.id === command.layerId);

      if (!targetLayer || targetLayer.kind !== "group") {
        return state;
      }

      const layers = state.layers.map((layer) =>
        layer.id === command.layerId ? { ...layer, collapsed: !layer.collapsed } : layer,
      );

      return commitToolcraftStatePatch(state, {
        after: { layers },
        before: { layers: state.layers },
        label: "Toggle group",
      });
    }

    case "layers.toggleVisibility": {
      if (!state.layers.some((layer) => layer.id === command.layerId)) {
        return state;
      }

      const layers = state.layers.map((layer) =>
        layer.id === command.layerId ? { ...layer, visible: !layer.visible } : layer,
      );

      return commitToolcraftStatePatch(state, {
        after: { layers },
        before: { layers: state.layers },
        label: "Toggle layer visibility",
      });
    }

    case "layers.reorder": {
      const nextLayerIds = new Set(command.layers.map((layer) => layer.id));

      if (nextLayerIds.size !== command.layers.length || nextLayerIds.size !== state.layers.length) {
        return state;
      }

      if (!state.layers.every((layer) => nextLayerIds.has(layer.id))) {
        return state;
      }

      return commitToolcraftStatePatch(state, {
        after: {
          layers: command.layers,
          selectedLayerId: command.selectedLayerId ?? state.selectedLayerId,
        },
        before: {
          layers: state.layers,
          selectedLayerId: state.selectedLayerId,
        },
        label: "Reorder layers",
      });
    }
  }
}
