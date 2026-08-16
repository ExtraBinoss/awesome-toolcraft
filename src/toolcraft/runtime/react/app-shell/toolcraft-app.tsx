"use client";

import * as React from "react";

import type { ResolvedToolcraftAppSchema } from "../../schema/types";
import { CanvasShell } from "../canvas/canvas-shell";
import type { ToolcraftPanelActionHandler } from "../controls-panel/controls-panel";
import type { ToolcraftControlRendererMap } from "../controls-panel/control-renderers";
import { TimelinePanel } from "../timeline/timeline-panel";
import { ToolbarPanel } from "./toolbar-panel";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraftSelector } from "./use-toolcraft";

const controlsPanelModule = import("../controls-panel/controls-panel");
const ControlsPanel = React.lazy(() =>
  controlsPanelModule.then((module) => ({ default: module.ControlsPanel })),
);
const LayersPanel = React.lazy(() =>
  import("../layers/layers-panel").then((module) => ({ default: module.LayersPanel })),
);

export type ToolcraftAppComposition = {
  canvasContent?: React.ReactNode;
  controlRenderers?: ToolcraftControlRendererMap;
  onPanelAction?: ToolcraftPanelActionHandler;
  renderDefaultCanvasMedia?: boolean;
  schema: ResolvedToolcraftAppSchema;
};

export type ToolcraftAppProps = ToolcraftAppComposition & {
  className?: string;
  style?: React.CSSProperties;
};

const toolcraftMinAppWidthPx = 1024;

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function PanelLoading({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      aria-label={`Loading ${label}`}
      className="pointer-events-none absolute right-3 bottom-3 z-30 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1 text-[10px] text-[color:var(--muted-foreground)]"
      role="status"
    >
      Loading {label}…
    </div>
  );
}

function ToolcraftAppContent({
  canvasContent,
  className,
  controlRenderers,
  onPanelAction,
  renderDefaultCanvasMedia = true,
  style,
}: Omit<ToolcraftAppProps, "schema">): React.JSX.Element {
  const { surfaces, timelinePanelHidden, timelinePanelVariant } = useToolcraftSelector(
    React.useCallback((state) => ({
      surfaces: state.schema.assembly.surfaces,
      timelinePanelHidden: state.panels.timeline.hidden === true,
      timelinePanelVariant:
        state.panels.timeline.extended === true ? ("extended" as const) : ("compact" as const),
    }), []),
    React.useCallback(
      (left, right) =>
        left.surfaces === right.surfaces &&
        left.timelinePanelHidden === right.timelinePanelHidden &&
        left.timelinePanelVariant === right.timelinePanelVariant,
      [],
    ),
  );
  return (
    <div
      className={cn(
        "relative min-h-[640px] w-full overflow-hidden bg-[color:var(--background)]",
        className,
      )}
      data-slot="toolcraft-runtime-app"
      style={{
        ...style,
        minWidth: toolcraftMinAppWidthPx,
      }}
    >
      {surfaces.canvas.enabled ? (
        <CanvasShell renderDefaultMedia={renderDefaultCanvasMedia}>
          {canvasContent}
        </CanvasShell>
      ) : null}
      {surfaces.panels.layers?.enabled ? (
        <React.Suspense fallback={<PanelLoading label="layers" />}>
          <LayersPanel panelPlacement="floating" />
        </React.Suspense>
      ) : null}
      {surfaces.panels.controls?.enabled ? (
        <React.Suspense fallback={<PanelLoading label="controls" />}>
          <ControlsPanel
            controlRenderers={controlRenderers}
            onPanelAction={onPanelAction}
            panelPlacement="floating"
          />
        </React.Suspense>
      ) : null}
      {surfaces.panels.timeline?.enabled ? (
        <div
          data-toolcraft-timeline-panel-hidden={timelinePanelHidden ? "true" : undefined}
          data-toolcraft-timeline-panel-variant={timelinePanelVariant}
          hidden={timelinePanelHidden}
        >
          <TimelinePanel panelPlacement="floating" variant={timelinePanelVariant} />
        </div>
      ) : null}
      {surfaces.panels.toolbar.enabled ? (
        <ToolbarPanel panelPlacement="floating" />
      ) : null}
    </div>
  );
}

export function ToolcraftApp({
  schema,
  ...props
}: ToolcraftAppProps): React.JSX.Element {
  return (
    <ToolcraftRoot schema={schema}>
      <ToolcraftAppContent {...props} />
    </ToolcraftRoot>
  );
}
