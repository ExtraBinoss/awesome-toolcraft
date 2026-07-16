import type {
  ToolcraftHistoryMode,
  ToolcraftHistoryPatch,
  ToolcraftState,
} from "./types";

type ToolcraftHistoryOptions = {
  group?: string;
  mode?: ToolcraftHistoryMode;
};

function getNextToolcraftHistoryState(
  state: ToolcraftState,
  patch: ToolcraftHistoryPatch,
  options?: ToolcraftHistoryOptions,
): ToolcraftState["history"] {
  const mode = options?.mode ?? "record";

  if (mode === "skip") {
    return state.history;
  }

  const group = mode === "merge" ? options?.group : undefined;

  if (group) {
    const previousPatch = state.history.undo.at(-1);

    if (previousPatch?.group === group) {
      return {
        redo: [],
        undo: [
          ...state.history.undo.slice(0, -1),
          {
            ...previousPatch,
            after: patch.after,
            label: patch.label,
          },
        ],
      };
    }
  }

  return {
    redo: [],
    undo: [...state.history.undo, group ? { ...patch, group } : patch],
  };
}

function applyValuePatch(
  values: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const nextValues = { ...values };

  for (const [target, value] of Object.entries(patch)) {
    if (target in nextValues) {
      nextValues[target] = value;
    }
  }

  return nextValues;
}

function applyToolcraftHistoryPatch(
  state: ToolcraftState,
  patch: Record<string, unknown>,
): Pick<
  ToolcraftState,
  "canvas" | "layers" | "mediaAssets" | "selectedLayerId" | "timeline" | "values"
> {
  const nextCanvas =
    "canvas.size" in patch
      ? {
          ...state.canvas,
          size: patch["canvas.size"] as ToolcraftState["canvas"]["size"],
        }
      : state.canvas;

  return {
    canvas: nextCanvas,
    layers: "layers" in patch ? (patch.layers as ToolcraftState["layers"]) : state.layers,
    mediaAssets:
      "mediaAssets" in patch
        ? (patch.mediaAssets as ToolcraftState["mediaAssets"])
        : state.mediaAssets,
    selectedLayerId:
      "selectedLayerId" in patch
        ? (patch.selectedLayerId as ToolcraftState["selectedLayerId"])
        : state.selectedLayerId,
    timeline:
      "timeline" in patch ? (patch.timeline as ToolcraftState["timeline"]) : state.timeline,
    values: applyValuePatch(state.values, patch),
  };
}

export function commitToolcraftValuePatch(
  state: ToolcraftState,
  patch: ToolcraftHistoryPatch,
  values: Record<string, unknown>,
  historyOptions?: ToolcraftHistoryOptions,
): ToolcraftState {
  return {
    ...state,
    history: getNextToolcraftHistoryState(state, patch, historyOptions),
    values,
  };
}

export function commitToolcraftStatePatch(
  state: ToolcraftState,
  patch: ToolcraftHistoryPatch,
  historyOptions?: ToolcraftHistoryOptions,
): ToolcraftState {
  const next = applyToolcraftHistoryPatch(state, patch.after);

  return {
    ...state,
    canvas: next.canvas,
    history: getNextToolcraftHistoryState(state, patch, historyOptions),
    layers: next.layers,
    mediaAssets: next.mediaAssets,
    selectedLayerId: next.selectedLayerId,
    timeline: next.timeline,
    values: next.values,
  };
}

export function undoToolcraftHistory(state: ToolcraftState): ToolcraftState {
  const patch = state.history.undo.at(-1);

  if (!patch) {
    return state;
  }

  const next = applyToolcraftHistoryPatch(state, patch.before);

  return {
    ...state,
    canvas: next.canvas,
    history: {
      redo: [...state.history.redo, patch],
      undo: state.history.undo.slice(0, -1),
    },
    layers: next.layers,
    mediaAssets: next.mediaAssets,
    selectedLayerId: next.selectedLayerId,
    timeline: next.timeline,
    values: next.values,
  };
}

export function redoToolcraftHistory(state: ToolcraftState): ToolcraftState {
  const patch = state.history.redo.at(-1);

  if (!patch) {
    return state;
  }

  const next = applyToolcraftHistoryPatch(state, patch.after);

  return {
    ...state,
    canvas: next.canvas,
    history: {
      redo: state.history.redo.slice(0, -1),
      undo: [...state.history.undo, patch],
    },
    layers: next.layers,
    mediaAssets: next.mediaAssets,
    selectedLayerId: next.selectedLayerId,
    timeline: next.timeline,
    values: next.values,
  };
}
