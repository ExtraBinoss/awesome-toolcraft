import { lazy, Suspense, useEffect } from "react";

import { HubPage } from "./HubPage";
import { toolPageLoaders } from "./tool-loading";
import { logToolLoad } from "./tool-load-debug";

const GradientGeneratorPage = lazy(() =>
  toolPageLoaders["/tools/gradient-generator"]().then((module) => ({
    default: module.GradientGeneratorPage!,
  })),
);
const AsciiLabPage = lazy(() =>
  toolPageLoaders["/tools/ascii-lab"]().then((module) => ({
    default: module.AsciiLabPage!,
  })),
);
const Artistic3DPage = lazy(() =>
  toolPageLoaders["/tools/artistic-3d"]().then((module) => ({
    default: module.Artistic3DPage!,
  })),
);
const DitherHeatmapPage = lazy(() =>
  toolPageLoaders["/tools/dither-heatmap"]().then((module) => ({
    default: module.DitherHeatmapPage!,
  })),
);
const BlobTrackingPage = lazy(() =>
  toolPageLoaders["/tools/blob-tracking"]().then((module) => ({
    default: module.BlobTrackingPage!,
  })),
);
const SuminagashiPage = lazy(() =>
  toolPageLoaders["/tools/suminagashi"]().then((module) => ({
    default: module.SuminagashiPage!,
  })),
);

function RouteLoading({ toolName }: { toolName: string }) {
  useEffect(() => {
    logToolLoad(`fallback:visible ${toolName}`);
    return () => logToolLoad(`fallback:hidden ${toolName}`);
  }, [toolName]);

  return (
    <main className="route-loading" aria-busy="true" aria-live="polite">
      <div className="route-loading-card">
        <div className="route-loading-kicker">Toolcraft Workspace</div>
        <h1>{toolName}</h1>
        <div
          className="route-loading-progress"
          role="progressbar"
          aria-label={`Loading ${toolName}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext="Preparing tool"
        >
          <span />
        </div>
        <p className="sr-only">Loading workspace</p>
      </div>
    </main>
  );
}

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  logToolLoad(`route:render ${path}`);

  if (path === "/tools/gradient-generator") {
    return (
      <Suspense fallback={<RouteLoading toolName="Gradient Generator" />}>
        <GradientGeneratorPage />
      </Suspense>
    );
  }
  if (path === "/tools/ascii-lab") {
    return (
      <Suspense fallback={<RouteLoading toolName="ASCII Lab" />}>
        <AsciiLabPage />
      </Suspense>
    );
  }
  if (path === "/tools/artistic-3d") {
    return (
      <Suspense fallback={<RouteLoading toolName="Artistic 3D" />}>
        <Artistic3DPage />
      </Suspense>
    );
  }
  if (path === "/tools/dither-heatmap") {
    return (
      <Suspense fallback={<RouteLoading toolName="Dither / Heatmap" />}>
        <DitherHeatmapPage />
      </Suspense>
    );
  }
  if (path === "/tools/blob-tracking") {
    return (
      <Suspense fallback={<RouteLoading toolName="Blob Tracking" />}>
        <BlobTrackingPage />
      </Suspense>
    );
  }
  if (path === "/tools/suminagashi") {
    return (
      <Suspense fallback={<RouteLoading toolName="Suminagashi" />}>
        <SuminagashiPage />
      </Suspense>
    );
  }

  return <HubPage />;
}
