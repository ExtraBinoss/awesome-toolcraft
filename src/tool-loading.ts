import type { ComponentType } from "react";

import { logToolLoad, logToolLoadDuration } from "./tool-load-debug";

type ToolPageModule = {
  AsciiLabPage?: ComponentType;
  Artistic3DPage?: ComponentType;
  BlobTrackingPage?: ComponentType;
  DitherHeatmapPage?: ComponentType;
  GradientGeneratorPage?: ComponentType;
  SuminagashiPage?: ComponentType;
};
type ToolPageLoader = () => Promise<ToolPageModule>;

function trackedLoader(path: string, importer: ToolPageLoader): ToolPageLoader {
  let pending: Promise<ToolPageModule> | undefined;

  return () => {
    if (pending) return pending;

    const startedAt = performance.now();
    logToolLoad(`import:start ${path}`);
    pending = importer().then((module) => {
      logToolLoadDuration(`import:end ${path}`, startedAt);
      return module;
    });
    return pending;
  };
}

export const toolPageLoaders: Record<string, ToolPageLoader> = {
  "/tools/ascii-lab": trackedLoader("ascii-lab", () =>
    Promise.all([
      import("./tools/ascii-lab/AsciiLabPage"),
      import("./tools/ascii-lab/ascii-lab-loaders").then((module) => {
        module.preloadAsciiLabRenderer();
      }),
    ]).then(([page]) => page),
  ),
  "/tools/dither-heatmap": trackedLoader("dither-heatmap", () =>
    import("./tools/dither-heatmap/DitherHeatmapPage"),
  ),
  "/tools/artistic-3d": trackedLoader("artistic-3d", () =>
    import("./tools/artistic-3d/Artistic3DPage"),
  ),
  "/tools/gradient-generator": trackedLoader("gradient-generator", () =>
    import("./tools/gradient-generator/GradientGeneratorPage"),
  ),
  "/tools/blob-tracking": trackedLoader("blob-tracking", () =>
    import("./tools/blob-tracking/BlobTrackingPage"),
  ),
  "/tools/suminagashi": trackedLoader("suminagashi", () =>
    import("./tools/suminagashi/SuminagashiPage"),
  ),
};

export function preloadToolPage(path: string): void {
  toolPageLoaders[path]?.();
}
