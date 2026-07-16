import { createToolcraftAssemblyContract } from "./assembly-contract";
import { normalizeToolcraftPanels } from "./panels-schema-normalization";
import { resolveToolcraftSettingsTransfer } from "./runtime-setup-section";
import {
  defaultToolcraftCanvasSize,
  resolveToolcraftCanvasRenderScale,
  resolveToolcraftCanvasSizing,
  resolveToolcraftExport,
  resolveToolcraftMedia,
  resolveToolcraftPersistence,
  resolveToolcraftToolbar,
} from "./schema-resolvers";
import type {
  ToolcraftAppSchema,
  ToolcraftToolbarSchema,
  ResolvedToolcraftPanelsSchema,
  ResolvedToolcraftAppSchema,
} from "./types";

type ResolvedToolbar = Required<ToolcraftToolbarSchema>;

function hasVisibleRuntimePanel({
  panels,
  toolbar,
}: {
  panels: ResolvedToolcraftPanelsSchema;
  toolbar: ResolvedToolbar;
}): boolean {
  return Boolean(
    panels.controls ||
      panels.layers ||
      panels.timeline ||
      toolbar.history ||
      toolbar.radar ||
      toolbar.theme ||
      toolbar.zoom,
  );
}

function assertPanelPersistenceContract({
  panels,
  persistence,
  toolbar,
}: {
  panels: ResolvedToolcraftPanelsSchema;
  persistence: ResolvedToolcraftAppSchema["persistence"];
  toolbar: ResolvedToolbar;
}): void {
  if (persistence.storage !== "localStorage" || !hasVisibleRuntimePanel({ panels, toolbar })) {
    return;
  }

  if (persistence.include.includes("panels")) {
    return;
  }

  throw new Error(
    'Toolcraft apps with visible runtime panels and localStorage persistence must include "panels" so dragged panel positions survive reload.',
  );
}

export function defineToolcraft(schema: ToolcraftAppSchema): ResolvedToolcraftAppSchema {
  const canvasEnabled = schema.canvas.enabled;
  const canvasSize = schema.canvas.size;
  const canvasRenderScale = resolveToolcraftCanvasRenderScale(schema.canvas.renderScale);
  const canvasSizing = resolveToolcraftCanvasSizing(schema.canvas);
  const persistence = resolveToolcraftPersistence(schema.persistence);
  const settingsTransfer = resolveToolcraftSettingsTransfer({
    controls: schema.panels.controls,
    persistence,
    settingsTransfer: schema.settingsTransfer,
  });
  const canvas = {
    ...schema.canvas,
    draggable: canvasEnabled ? (schema.canvas.draggable ?? true) : false,
    renderScale: canvasRenderScale,
    size: canvasSize ?? defaultToolcraftCanvasSize,
    sizeSource: canvasSize ? ("app" as const) : ("runtime-default" as const),
    sizing: canvasSizing,
    upload: schema.canvas.upload ?? false,
  };
  const panels = normalizeToolcraftPanels({
    canvas,
    panels: schema.panels,
    settingsTransfer,
  });
  const toolbar = resolveToolcraftToolbar({
    canvasEnabled,
    toolbar: schema.toolbar,
  });
  const exportSchema = resolveToolcraftExport(schema.export);
  const media = resolveToolcraftMedia(schema.media);

  assertPanelPersistenceContract({ panels, persistence, toolbar });

  return {
    assembly: createToolcraftAssemblyContract({
      canvas,
      panels,
      toolbar,
    }),
    canvas,
    export: exportSchema,
    media,
    panels,
    persistence,
    settingsTransfer,
    toolbar,
  };
}
