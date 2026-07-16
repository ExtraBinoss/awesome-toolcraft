import type {
  ResolvedToolcraftAppSchema,
  ToolcraftPersistableStateSlice,
} from "../schema/types";
import { readCanvas } from "./persistence-reader-canvas";
import { readLayerState } from "./persistence-reader-layers";
import { readMediaAssets } from "./persistence-reader-media";
import { readPanels } from "./persistence-reader-panels";
import { readTimeline } from "./persistence-reader-timeline";
import { readValues } from "./persistence-reader-values";
import type { ToolcraftInitialState } from "./types";

export function readToolcraftPersistedInitialState(
  schema: ResolvedToolcraftAppSchema,
  persistedState: Record<string, unknown>,
  included: ReadonlySet<ToolcraftPersistableStateSlice>,
): ToolcraftInitialState | undefined {
  const initialState: ToolcraftInitialState = {};

  if (included.has("values")) {
    const values = readValues(schema, persistedState.values);

    if (values) {
      initialState.values = values;
    }
  }

  if (included.has("canvas")) {
    const canvas = readCanvas(persistedState.canvas);

    if (canvas) {
      initialState.canvas = canvas;
    }
  }

  if (included.has("panels")) {
    const panels = readPanels(persistedState.panels);

    if (panels) {
      initialState.panels = panels;
    }
  }

  if (included.has("timeline")) {
    const timeline = readTimeline(persistedState.timeline);

    if (timeline) {
      initialState.timeline = timeline;
    }
  }

  if (included.has("layers")) {
    const layerState = readLayerState(persistedState);

    if (layerState) {
      initialState.layers = layerState.layers;
      if ("selectedLayerId" in layerState) {
        initialState.selectedLayerId = layerState.selectedLayerId;
      }
    }
  }

  if (included.has("media")) {
    const mediaAssets = readMediaAssets(persistedState.mediaAssets);

    if (mediaAssets) {
      initialState.mediaAssets = mediaAssets;
    }
  }

  return Object.keys(initialState).length > 0 ? initialState : undefined;
}
