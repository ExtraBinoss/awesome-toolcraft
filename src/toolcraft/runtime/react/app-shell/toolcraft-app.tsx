"use client";

import * as React from "react";

import type { ResolvedToolcraftAppSchema } from "../../schema/types";
import { CanvasShell } from "../canvas/canvas-shell";
import { ToolbarPanel } from "./toolbar-panel";
import { PanelLoading } from "./panel-loading";
import { loadControlsPanel, loadTimelinePanel } from "./panel-loaders";
import type { ToolcraftPanelActionHandler } from "../controls-panel/controls-panel";
import type { ToolcraftControlRendererMap } from "../controls-panel/control-renderers";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraftSelector } from "./use-toolcraft";

const controlsPanelModule = loadControlsPanel();
const timelinePanelModule = loadTimelinePanel();
const panelModules = Promise.all([controlsPanelModule, timelinePanelModule]);
const ControlsPanel = React.lazy(() =>
  controlsPanelModule.then((module) => ({ default: module.ControlsPanel })),
);
const LayersPanel = React.lazy(() =>
  import("../layers/layers-panel").then((module) => ({ default: module.LayersPanel })),
);
const TimelinePanel = React.lazy(() =>
  timelinePanelModule.then((module) => ({ default: module.TimelinePanel })),
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

function ToolcraftAppContent({
  canvasContent,
  className,
  controlRenderers,
  onPanelAction,
  renderDefaultCanvasMedia = true,
  style,
}: Omit<ToolcraftAppProps, "schema">): React.JSX.Element {
  const [rendererReady, setRendererReady] = React.useState(false);
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
  React.useEffect(() => {
    let active = true;
    let firstFrame = 0;
    let secondFrame = 0;

    const revealRenderer = (): void => {
      if (!active) {
        return;
      }

      // Give React and the browser a paint opportunity for the shared panels
      // before mounting a tool's potentially expensive canvas renderer.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (active) {
            setRendererReady(true);
          }
        });
      });
    };

    void panelModules.then(revealRenderer).catch((error: unknown) => {
      revealRenderer();
      console.error("[Toolcraft load] panel prerequisite import failed", error);
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

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
        <CanvasShell renderDefaultMedia={rendererReady && renderDefaultCanvasMedia}>
          {rendererReady ? canvasContent : null}
        </CanvasShell>
      ) : null}
      {surfaces.panels.layers?.enabled ? (
        <React.Suspense fallback={<PanelLoading panelType="layers" />}>
          <LayersPanel panelPlacement="floating" />
        </React.Suspense>
      ) : null}
      {surfaces.panels.controls?.enabled ? (
        <React.Suspense fallback={<PanelLoading panelType="controls" />}>
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
          <React.Suspense
            fallback={(
              <PanelLoading
                panelType="timeline"
                timelineVariant={timelinePanelVariant}
              />
            )}
          >
            <TimelinePanel panelPlacement="floating" variant={timelinePanelVariant} />
          </React.Suspense>
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
