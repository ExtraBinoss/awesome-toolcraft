import {
  getToolcraftCanvasAspectRatioPreset,
  getToolcraftCanvasAspectRatioPresetBySize,
} from "./canvas-aspect-ratio-presets";
import { toolcraftRuntimeSetupSectionTitle } from "./runtime-section-titles";
import { toolcraftTimelinePanelExtendedTarget } from "./runtime-targets";
import type {
  ResolvedToolcraftAppSchema,
  ResolvedToolcraftSettingsTransferSchema,
  ResolvedToolcraftTimelinePanelSchema,
  ToolcraftAppSchema,
  ToolcraftCanvasSize,
  ToolcraftControlLayoutGroupSchema,
  ToolcraftControlSchema,
  ToolcraftControlSectionSchema,
  ToolcraftControlsPanelSchema,
  ToolcraftSettingsTransferSchema,
} from "./types";

const canvasSizeControlTargets = {
  height: "canvas.size.height",
  width: "canvas.size.width",
} as const;
const canvasAspectRatioTarget = "canvas.aspectRatio";
const canvasRenderScaleTarget = "canvas.renderScale";
const settingsTransferTarget = "runtime.settingsTransfer";

function slugifySettingsTransferAppId(value: string | undefined): string {
  const slug = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "toolcraft-app";
}

function getSettingsTransferMode(
  settingsTransfer: ToolcraftSettingsTransferSchema | undefined,
): "auto" | boolean {
  if (typeof settingsTransfer === "object" && settingsTransfer !== null) {
    return settingsTransfer.enabled ?? "auto";
  }

  return settingsTransfer ?? "auto";
}

function getSettingsTransferObject(
  settingsTransfer: ToolcraftSettingsTransferSchema | undefined,
): Extract<ToolcraftSettingsTransferSchema, object> | undefined {
  return typeof settingsTransfer === "object" && settingsTransfer !== null
    ? settingsTransfer
    : undefined;
}

function getSettingsTransferAppId({
  controls,
  persistence,
  settingsTransfer,
}: {
  controls: ToolcraftControlsPanelSchema | undefined;
  persistence: ResolvedToolcraftAppSchema["persistence"];
  settingsTransfer: ToolcraftSettingsTransferSchema | undefined;
}): string {
  const objectSchema = getSettingsTransferObject(settingsTransfer);

  if (objectSchema?.appId) {
    return slugifySettingsTransferAppId(objectSchema.appId);
  }

  if (persistence.storage === "localStorage") {
    const match = /^toolcraft:(.+):state:v\d+$/u.exec(persistence.key);

    if (match?.[1]) {
      return slugifySettingsTransferAppId(match[1]);
    }
  }

  return slugifySettingsTransferAppId(controls?.title);
}

function getSettingsTransferFileName({
  appId,
  settingsTransfer,
}: {
  appId: string;
  settingsTransfer: ToolcraftSettingsTransferSchema | undefined;
}): string {
  const explicitFileName = getSettingsTransferObject(settingsTransfer)?.fileName?.trim();

  if (explicitFileName) {
    return explicitFileName.endsWith(".json")
      ? explicitFileName
      : `${explicitFileName}.json`;
  }

  return `${appId}-settings.json`;
}

export function resolveToolcraftSettingsTransfer({
  controls,
  persistence,
  settingsTransfer,
}: {
  controls: ToolcraftControlsPanelSchema | undefined;
  persistence: ResolvedToolcraftAppSchema["persistence"];
  settingsTransfer: ToolcraftSettingsTransferSchema | undefined;
}): ResolvedToolcraftSettingsTransferSchema {
  const mode = getSettingsTransferMode(settingsTransfer);
  const appId = getSettingsTransferAppId({
    controls,
    persistence,
    settingsTransfer,
  });

  return {
    appId,
    enabled: Boolean(controls),
    fileName: getSettingsTransferFileName({ appId, settingsTransfer }),
    mode,
  };
}

function getGreatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));

  while (b !== 0) {
    const next = b;
    b = a % b;
    a = next;
  }

  return a || 1;
}

function getCanvasAspectRatioDefaultValue(size: ToolcraftCanvasSize): {
  height: number;
  mode: "custom" | "preset";
  value: string;
  width: number;
} {
  const divisor = getGreatestCommonDivisor(size.width, size.height);
  const width = Math.max(1, Math.round(size.width / divisor));
  const height = Math.max(1, Math.round(size.height / divisor));
  const value = `${width}:${height}`;
  const preset =
    getToolcraftCanvasAspectRatioPreset(value) ??
    getToolcraftCanvasAspectRatioPresetBySize(size);

  return {
    height: preset?.ratioHeight ?? height,
    mode: preset ? "preset" : "custom",
    value: preset?.value ?? value,
    width: preset?.ratioWidth ?? width,
  };
}

function createRenderScaleControl(
  canvas: ResolvedToolcraftAppSchema["canvas"],
): ToolcraftControlSchema | undefined {
  if (!canvas.renderScale.enabled) {
    return undefined;
  }

  return {
    defaultValue: canvas.renderScale.defaultValue,
    description:
      "Increases raster canvas backing resolution without changing the visible output size.",
    label: "Resolution scale",
    markerCount:
      Math.floor(
        (canvas.renderScale.max - canvas.renderScale.min) / canvas.renderScale.step,
      ) + 1,
    max: canvas.renderScale.max,
    min: canvas.renderScale.min,
    performanceReason:
      "Resolution scale changes raster, Canvas, WebGL, or WebGPU backing pixels.",
    performanceRole: "workload",
    step: canvas.renderScale.step,
    target: canvasRenderScaleTarget,
    type: "slider",
    variant: "discrete",
  };
}

function createTimelineExtendedControl(
  timeline: ResolvedToolcraftTimelinePanelSchema | undefined,
): ToolcraftControlSchema | undefined {
  if (!timeline?.enabled) {
    return undefined;
  }

  return {
    defaultValue: false,
    description:
      "Shows the extended runtime timeline with scrubber, duration, loop, and keyframe controls; compact mode keeps only Play visible.",
    label: "Timeline",
    target: toolcraftTimelinePanelExtendedTarget,
    type: "switch",
  };
}

function createEditableCanvasControls(
  canvas: ResolvedToolcraftAppSchema["canvas"],
): {
  controls: ToolcraftControlSectionSchema["controls"];
  layoutGroups?: readonly ToolcraftControlLayoutGroupSchema[];
} {
  if (!canvas.enabled || canvas.sizing.mode !== "editable-output") {
    return { controls: {} };
  }

  return {
    controls: {
      canvasAspectRatio: {
        defaultValue: getCanvasAspectRatioDefaultValue(canvas.size),
        label: "Aspect ratio",
        orderRole: "input",
        performanceReason: "Aspect ratio changes output dimensions and renderer workload.",
        performanceRole: "workload",
        target: canvasAspectRatioTarget,
        type: "aspectRatio",
      },
      canvasWidth: {
        defaultValue: canvas.size.width,
        label: "Canvas width",
        orderRole: "input",
        performanceReason: "Canvas width changes output dimensions and renderer workload.",
        performanceRole: "workload",
        target: canvasSizeControlTargets.width,
        type: "text",
      },
      canvasHeight: {
        defaultValue: canvas.size.height,
        label: "Canvas height",
        orderRole: "input",
        performanceReason: "Canvas height changes output dimensions and renderer workload.",
        performanceRole: "workload",
        target: canvasSizeControlTargets.height,
        type: "text",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["canvasWidth", "canvasHeight"],
        layout: "inline",
      },
    ],
  };
}

export function createToolcraftRuntimeSetupSection({
  canvas,
  settingsTransfer,
  timeline,
}: {
  canvas: ResolvedToolcraftAppSchema["canvas"];
  settingsTransfer: ResolvedToolcraftSettingsTransferSchema;
  timeline: ResolvedToolcraftTimelinePanelSchema | undefined;
}): ToolcraftControlSectionSchema {
  const editableCanvas = createEditableCanvasControls(canvas);
  const renderScaleControl = createRenderScaleControl(canvas);
  const timelineExtendedControl = createTimelineExtendedControl(timeline);

  return {
    controls: {
      settingsTransfer: {
        label: false,
        target: settingsTransferTarget,
        type: "settingsTransfer",
      },
      ...editableCanvas.controls,
      ...(renderScaleControl ? { canvasRenderScale: renderScaleControl } : {}),
      ...(timelineExtendedControl ? { timelineExtended: timelineExtendedControl } : {}),
    },
    layout: "standalone",
    layoutGroups: editableCanvas.layoutGroups,
    title: toolcraftRuntimeSetupSectionTitle,
  };
}
