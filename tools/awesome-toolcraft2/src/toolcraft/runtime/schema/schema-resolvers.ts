import {
  clampToolcraftTimelineDurationSeconds,
  toolcraftTimelineDefaultDurationSeconds,
} from "../state/timeline-values";
import type {
  ResolvedToolcraftAppSchema,
  ResolvedToolcraftTimelinePanelSchema,
  ToolcraftAppSchema,
  ToolcraftCanvasSize,
  ToolcraftCanvasSizingSchema,
  ToolcraftTimelinePanelSchema,
  ToolcraftToolbarSchema,
} from "./types";

export const defaultToolcraftCanvasSize = {
  height: 1080,
  unit: "px",
  width: 1920,
} satisfies ToolcraftCanvasSize;

const defaultCanvasRenderScale = {
  defaultValue: 2,
  enabled: false,
  max: 2,
  min: 1,
  step: 0.25,
} satisfies ResolvedToolcraftAppSchema["canvas"]["renderScale"];

function assertNever(value: never): never {
  throw new Error(`Unsupported Toolcraft template persistence storage: ${String(value)}`);
}

export function resolveToolcraftPersistence(
  persistence: ToolcraftAppSchema["persistence"],
): ResolvedToolcraftAppSchema["persistence"] {
  switch (persistence?.storage) {
    case undefined:
    case "none":
      return { storage: "none" };
    case "localStorage":
      return persistence;
    default:
      return assertNever(persistence);
  }
}

export function resolveToolcraftCanvasSizing(
  canvas: ToolcraftAppSchema["canvas"],
): ToolcraftCanvasSizingSchema {
  if (canvas.sizing) {
    return canvas.sizing;
  }

  if (canvas.size) {
    return { mode: "editable-output" };
  }

  if (canvas.upload) {
    return { mode: "editable-output" };
  }

  return { mode: "intrinsic-media" };
}

function clampCanvasRenderScale(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(2, value));
}

export function resolveToolcraftCanvasRenderScale(
  renderScale: ToolcraftAppSchema["canvas"]["renderScale"],
): ResolvedToolcraftAppSchema["canvas"]["renderScale"] {
  if (renderScale === true) {
    return {
      ...defaultCanvasRenderScale,
      enabled: true,
    };
  }

  if (!renderScale) {
    return defaultCanvasRenderScale;
  }

  const min = clampCanvasRenderScale(renderScale.min, defaultCanvasRenderScale.min);
  const max = Math.max(
    min,
    clampCanvasRenderScale(renderScale.max, defaultCanvasRenderScale.max),
  );
  const step =
    typeof renderScale.step === "number" && Number.isFinite(renderScale.step)
      ? Math.max(0.01, Math.min(1, renderScale.step))
      : defaultCanvasRenderScale.step;
  const defaultValue = Math.max(
    min,
    Math.min(
      max,
      clampCanvasRenderScale(renderScale.defaultValue, defaultCanvasRenderScale.defaultValue),
    ),
  );

  return {
    defaultValue,
    enabled: renderScale.enabled ?? true,
    max,
    min,
    step,
  };
}

export function resolveToolcraftExport(
  exportSchema: ToolcraftAppSchema["export"],
): ResolvedToolcraftAppSchema["export"] {
  return {
    png: {
      background: exportSchema?.png?.background ?? "include",
    },
  };
}

export function resolveToolcraftMedia(
  mediaSchema: ToolcraftAppSchema["media"],
): ResolvedToolcraftAppSchema["media"] {
  return {
    defaultAssets: mediaSchema?.defaultAssets ?? [],
  };
}

export function resolveToolcraftTimelinePanel(
  timeline: ToolcraftTimelinePanelSchema | undefined,
): ResolvedToolcraftTimelinePanelSchema | undefined {
  if (timeline === true) {
    return {
      defaultDurationSeconds: toolcraftTimelineDefaultDurationSeconds,
      enabled: true,
      mode: "keyframes",
    };
  }

  if (!timeline || timeline.enabled === false) {
    return undefined;
  }

  return {
    defaultDurationSeconds: clampToolcraftTimelineDurationSeconds(
      timeline.defaultDurationSeconds,
    ),
    enabled: true,
    mode: timeline.mode ?? "keyframes",
  };
}

export function resolveToolcraftToolbar({
  canvasEnabled,
  toolbar,
}: {
  canvasEnabled: boolean;
  toolbar: ToolcraftAppSchema["toolbar"];
}): Required<ToolcraftToolbarSchema> {
  return {
    history: toolbar?.history ?? canvasEnabled,
    radar: toolbar?.radar ?? canvasEnabled,
    theme: toolbar?.theme ?? true,
    zoom: toolbar?.zoom ?? canvasEnabled,
  };
}
