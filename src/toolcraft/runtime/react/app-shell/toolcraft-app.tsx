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

function TimelinePanelSlot(): React.JSX.Element {
  const { hidden, variant } = useToolcraftSelector(
    React.useCallback((state) => ({
      hidden: state.panels.timeline.hidden === true,
      variant: state.panels.timeline.extended === true
        ? ("extended" as const)
        : ("compact" as const),
    }), []),
    React.useCallback(
      (left, right) => left.hidden === right.hidden && left.variant === right.variant,
      [],
    ),
  );

  return (
    <div
      data-toolcraft-timeline-panel-hidden={hidden ? "true" : undefined}
      data-toolcraft-timeline-panel-variant={variant}
      hidden={hidden}
    >
      <React.Suspense
        fallback={<PanelLoading panelType="timeline" timelineVariant={variant} />}
      >
        <TimelinePanel panelPlacement="floating" variant={variant} />
      </React.Suspense>
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
  const [rendererReady, setRendererReady] = React.useState(false);
  const surfaces = useToolcraftSelector(
    React.useCallback((state) => state.schema.assembly.surfaces, []),
  );
  React.useEffect(() => {
    let active = true;
    let firstFrame = 0;
    let secondFrame = 0;

    if (document.visibilityState === "hidden") {
      // Background tabs do not reliably receive animation frames. Mounting
      // immediately lets module evaluation and media preparation continue.
      setRendererReady(true);
    } else {
      // Give the shell a paint opportunity before mounting a potentially
      // expensive renderer, without coupling it to panel download readiness.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (active) {
            setRendererReady(true);
          }
        });
      });
    }

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
        <TimelinePanelSlot />
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
