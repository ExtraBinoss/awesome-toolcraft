import { lazy, Suspense } from "react";

import { HubPage } from "./HubPage";

const GradientGeneratorPage = lazy(() =>
  import("./tools/gradient-generator/GradientGeneratorPage").then((module) => ({
    default: module.GradientGeneratorPage,
  })),
);
const BlobTrackingPage = lazy(() =>
  import("./tools/blob-tracking/BlobTrackingPage").then((module) => ({ default: module.BlobTrackingPage })),
);

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/tools/gradient-generator") {
    return (
      <Suspense fallback={<div className="route-loading">Loading Gradient Generator…</div>}>
        <GradientGeneratorPage />
      </Suspense>
    );
  }
  if (path === "/tools/blob-tracking") {
    return (
      <Suspense fallback={<div className="route-loading">Loading Blob Tracking…</div>}>
        <BlobTrackingPage />
      </Suspense>
    );
  }

  return <HubPage />;
}
