"use client";

import * as React from "react";

type ToolcraftLoadingPanelType = "controls" | "layers" | "timeline";

export type PanelLoadingProps = {
  panelType: ToolcraftLoadingPanelType;
  timelineVariant?: "compact" | "extended";
};

const panelLabels: Record<ToolcraftLoadingPanelType, string> = {
  controls: "controls",
  layers: "layers",
  timeline: "timeline",
};

export function PanelLoading({
  panelType,
  timelineVariant = "extended",
}: PanelLoadingProps): React.JSX.Element {
  const label = panelLabels[panelType];

  return (
    <div
      aria-label={`Loading ${label}`}
      aria-live="polite"
      className="toolcraft-panel-skeleton"
      data-panel-loading={panelType}
      data-timeline-variant={panelType === "timeline" ? timelineVariant : undefined}
      data-slot="toolcraft-panel-skeleton"
      role="status"
    >
      <div className="toolcraft-panel-skeleton-surface">
        <div className="toolcraft-panel-skeleton-aurora" aria-hidden="true" />
      </div>
    </div>
  );
}
