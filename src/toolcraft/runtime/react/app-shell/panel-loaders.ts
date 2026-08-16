import { logToolLoad, logToolLoadDuration } from "@/tool-load-debug";

type ControlsPanelModule = typeof import("../controls-panel/controls-panel");
type TimelinePanelModule = typeof import("../timeline/timeline-panel");

let controlsPanelPromise: Promise<ControlsPanelModule> | undefined;
let timelinePanelPromise: Promise<TimelinePanelModule> | undefined;

export function loadControlsPanel(): Promise<ControlsPanelModule> {
  if (!controlsPanelPromise) {
    const startedAt = performance.now();
    logToolLoad("panel import:start controls");
    controlsPanelPromise = import("../controls-panel/controls-panel").then((module) => {
      logToolLoadDuration("panel import:end controls", startedAt);
      return module;
    });
  }

  return controlsPanelPromise;
}

export function loadTimelinePanel(): Promise<TimelinePanelModule> {
  if (!timelinePanelPromise) {
    const startedAt = performance.now();
    logToolLoad("panel import:start timeline");
    timelinePanelPromise = import("../timeline/timeline-panel").then((module) => {
      logToolLoadDuration("panel import:end timeline", startedAt);
      return module;
    });
  }

  return timelinePanelPromise;
}
