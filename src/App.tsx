import { lazy, Suspense, useEffect } from "react";

import { HubPage } from "./HubPage";
import { toolPageLoaders } from "./tool-loading";
import { logToolLoad } from "./tool-load-debug";

const GradientGeneratorPage = lazy(() =>
  toolPageLoaders["/tools/gradient-generator"]().then((module) => ({
    default: module.GradientGeneratorPage!,
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
        <div className="route-loading-kicker">Toolcraft Hub</div>
        <h1>Opening {toolName}</h1>
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
        <p>Preparing the renderer and controls…</p>
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
