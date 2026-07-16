import {
  createToolcraftRuntimeSetupSection,
} from "./runtime-setup-section";
import { normalizeControlsPanelLayout } from "./controls-panel-normalization";
import { resolveToolcraftTimelinePanel } from "./schema-resolvers";
import type {
  ResolvedToolcraftAppSchema,
  ResolvedToolcraftPanelsSchema,
  ResolvedToolcraftSettingsTransferSchema,
  ToolcraftAppSchema,
} from "./types";
export function normalizeToolcraftPanels({
  canvas,
  panels,
  settingsTransfer,
}: {
  canvas: ResolvedToolcraftAppSchema["canvas"];
  panels: ToolcraftAppSchema["panels"];
  settingsTransfer: ResolvedToolcraftSettingsTransferSchema;
}): ResolvedToolcraftPanelsSchema {
  const normalizedTimeline = resolveToolcraftTimelinePanel(panels.timeline);
  const normalizedPanels: ResolvedToolcraftPanelsSchema = {
    ...(panels.controls ? { controls: panels.controls } : {}),
    ...(panels.layers ? { layers: panels.layers } : {}),
    ...(normalizedTimeline ? { timeline: normalizedTimeline } : {}),
  };

  if (!panels.controls) {
    return normalizedPanels;
  }

  const controls = { ...panels.controls };
  const runtimeSetupSection = createToolcraftRuntimeSetupSection({
    canvas,
    settingsTransfer,
    timeline: normalizedTimeline,
  });

  return {
    ...normalizedPanels,
    controls: normalizeControlsPanelLayout({
      ...controls,
      sections: [
        runtimeSetupSection,
        ...controls.sections,
      ],
    }),
  };
}
