"use client";

import * as React from "react";

import type { ResolvedToolcraftAppSchema } from "../../schema/types";
import { CanvasShell } from "../canvas/canvas-shell";
import type { ToolcraftPanelActionHandler } from "../controls-panel/controls-panel";
import type { ToolcraftControlRendererMap } from "../controls-panel/control-renderers";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraft } from "./use-toolcraft";
import { logToolLoad, logToolLoadDuration } from "@/tool-load-debug";

const ControlsPanel = React.lazy(() =>
  (() => {
    const startedAt = performance.now();
    logToolLoad("panel import:start controls");
    return import("../controls-panel/controls-panel").then((module) => {
      logToolLoadDuration("panel import:end controls", startedAt);
      return { default: module.ControlsPanel };
    });
  })(),
);
const LayersPanel = React.lazy(() =>
  (() => {
    const startedAt = performance.now();
    logToolLoad("panel import:start layers");
    return import("../layers/layers-panel").then((module) => {
      logToolLoadDuration("panel import:end layers", startedAt);
      return { default: module.LayersPanel };
    });
  })(),
);
const TimelinePanel = React.lazy(() =>
  (() => {
    const startedAt = performance.now();
    logToolLoad("panel import:start timeline");
    return import("../timeline/timeline-panel").then((module) => {
      logToolLoadDuration("panel import:end timeline", startedAt);
      return { default: module.TimelinePanel };
    });
  })(),
);
const ToolbarPanel = React.lazy(() =>
  (() => {
    const startedAt = performance.now();
    logToolLoad("panel import:start toolbar");
    return import("./toolbar-panel").then((module) => {
      logToolLoadDuration("panel import:end toolbar", startedAt);
      return { default: module.ToolbarPanel };
    });
  })(),
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

function RuntimePanelFallback({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      aria-label={`Loading ${label}`}
      className="pointer-events-auto absolute right-3 bottom-3 z-30 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--muted-foreground)] shadow-lg"
      role="status"
    >
      Loading {label}…
    </div>
  );
}

function useAfterFirstPaint(): boolean {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const idleWindow = window as Window & {
      cancelIdleCallback?: (id: number) => void;
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };
    const activate = () => setReady(true);

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(activate, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(activate, 500);
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, []);

  return ready;
}

function DeferredRuntimePanel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}): React.JSX.Element {
  const ready = useAfterFirstPaint();

  return ready ? (
    <React.Suspense fallback={<RuntimePanelFallback label={label} />}>
      {children}
    </React.Suspense>
  ) : (
    <RuntimePanelFallback label={label} />
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
  const { state } = useToolcraft();
  const surfaces = state.schema.assembly.surfaces;
  const timelinePanelHidden = state.panels.timeline.hidden === true;
  const timelinePanelVariant =
    state.panels.timeline.extended === true ? "extended" : "compact";

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
        <DeferredRuntimePanel label="layers">
          <LayersPanel panelPlacement="floating" />
        </DeferredRuntimePanel>
      ) : null}
      {surfaces.panels.controls?.enabled ? (
        <DeferredRuntimePanel label="controls">
          <ControlsPanel
            controlRenderers={controlRenderers}
            onPanelAction={onPanelAction}
            panelPlacement="floating"
          />
        </DeferredRuntimePanel>
      ) : null}
      {surfaces.panels.timeline?.enabled ? (
        <div
          data-toolcraft-timeline-panel-hidden={timelinePanelHidden ? "true" : undefined}
          data-toolcraft-timeline-panel-variant={timelinePanelVariant}
          hidden={timelinePanelHidden}
        >
          <DeferredRuntimePanel label="timeline">
            <TimelinePanel panelPlacement="floating" variant={timelinePanelVariant} />
          </DeferredRuntimePanel>
        </div>
      ) : null}
      {surfaces.panels.toolbar.enabled ? (
        <DeferredRuntimePanel label="toolbar">
          <ToolbarPanel panelPlacement="floating" />
        </DeferredRuntimePanel>
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
