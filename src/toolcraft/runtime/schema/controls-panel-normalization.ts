import { splitControlsPanelActionSections } from "./controls-panel-actions";
import { normalizeMixedSectionLayout } from "./controls-panel-section-layout";
import type { ToolcraftControlsPanelSchema } from "./types";

export function normalizeControlsPanelLayout(
  controls: ToolcraftControlsPanelSchema,
): ToolcraftControlsPanelSchema {
  const { bodySections, stickyFooterSections } = splitControlsPanelActionSections(
    controls.sections,
  );

  return {
    ...controls,
    sections: [
      ...bodySections.flatMap(normalizeMixedSectionLayout),
      ...stickyFooterSections.flatMap(normalizeMixedSectionLayout),
    ],
  };
}
