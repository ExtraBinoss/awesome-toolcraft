import { toolcraftPersistedPanelIds } from "./persistence-shared";
import type { ToolcraftInitialState } from "./types";

export function mergeToolcraftInitialState(
  persistedState?: ToolcraftInitialState,
  explicitState?: ToolcraftInitialState,
): ToolcraftInitialState {
  const merged: ToolcraftInitialState = {};

  for (const state of [persistedState, explicitState]) {
    if (!state) {
      continue;
    }

    if (state.canvas) {
      merged.canvas = { ...merged.canvas, ...state.canvas };
    }

    if (state.panels) {
      merged.panels = { ...merged.panels };

      for (const panelId of toolcraftPersistedPanelIds) {
        const panel = state.panels[panelId];

        if (panel) {
          merged.panels[panelId] = { ...merged.panels[panelId], ...panel };
        }
      }
    }

    if (state.timeline) {
      merged.timeline = { ...merged.timeline, ...state.timeline };
    }

    if (state.values) {
      merged.values = { ...merged.values, ...state.values };
    }

    if (state.layers) {
      merged.layers = state.layers;
    }

    if (Object.hasOwn(state, "mediaAssets")) {
      merged.mediaAssets = state.mediaAssets;
    }

    if (Object.hasOwn(state, "selectedLayerId")) {
      merged.selectedLayerId = state.selectedLayerId;
    }
  }

  return merged;
}
